/// Sync, from the app's point of view.
///
/// Holds the enrolment, owns the client, and decides *when* to sync — which is
/// the part that actually determines whether cross-device feels instant or
/// broken.
///
/// **On the moments that matter, not on a timer.** A phone app is alive in
/// bursts: launch, foreground, and just after you changed something. A polling
/// interval spends battery in the gaps between those and still misses the one
/// case people notice — picking up the phone and seeing yesterday's map.
///
/// **Never throws into the UI.** A failed sync is a status, not an error. The
/// write already succeeded locally, which is the part that matters; the rest is
/// bookkeeping the user did not ask to supervise.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/map_repository.dart';
import 'crypto.dart';
import 'sync_client.dart';

class SyncController extends ChangeNotifier with WidgetsBindingObserver {
  SyncController({required this.repository, required this.deviceId});

  static const _enrolmentKey = 'abh.enrolment';
  static const _keyKey = 'abh.accountKey';

  final MapRepository repository;
  final String deviceId;

  SyncClient? _client;
  SyncStatus _status = const SyncStatus();

  SyncStatus get status => _status;
  bool get connected => _client != null;

  /// Restores a previous enrolment, if there is one. Safe to call on every
  /// launch; a device with no account simply stays local, which is a supported
  /// way to run the whole product.
  Future<void> restore() async {
    WidgetsBinding.instance.addObserver(this);
    _refreshPending();

    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_enrolmentKey);
    final key = prefs.getString(_keyKey);
    if (raw == null || key == null) return;

    try {
      _client = SyncClient(
        repository: repository,
        enrolment: Enrolment.fromJson(jsonDecode(raw) as Map<String, dynamic>),
        crypto: await AccountCrypto.fromRaw(key),
        deviceId: deviceId,
      );
      unawaited(syncNow());
    } catch (_) {
      // A stored enrolment we can no longer make sense of must not stop the
      // app launching. Local-only is always a valid state.
    }
  }

  /// Pairs this device using a code from another one.
  ///
  /// The account key arrives out-of-band — from the fragment of the pairing
  /// URL, which a browser never sends to a server. That is what lets the relay
  /// hand out a token and still be unable to read a single record.
  Future<void> pair({
    required String endpoint,
    required String code,
    required String accountKey,
    required String deviceName,
  }) async {
    final enrolment = await enrolDevice(
      endpoint: endpoint,
      code: code,
      deviceName: deviceName,
    );
    final crypto = await AccountCrypto.fromRaw(accountKey);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_enrolmentKey, jsonEncode(enrolment.toJson()));
    await prefs.setString(_keyKey, accountKey);

    _client = SyncClient(
      repository: repository,
      enrolment: enrolment,
      crypto: crypto,
      deviceId: deviceId,
    );
    await syncNow();
  }

  /// Forgets the account on this device.
  ///
  /// Leaves the map alone, deliberately. Unpairing means "stop sending", not
  /// "delete my work" — and a person who wanted the second would be very
  /// unhappy to discover the first did it.
  Future<void> unpair() async {
    _client?.close();
    _client = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_enrolmentKey);
    await prefs.remove(_keyKey);
    _set(const SyncStatus());
  }

  /// Sync, swallowing failure.
  Future<void> syncNow() async {
    final client = _client;
    if (client == null) return;

    _set(SyncStatus(phase: SyncPhase.syncing, pending: repository.pendingCount()));
    try {
      await client.sync();
      _set(SyncStatus(
        phase: SyncPhase.idle,
        pending: repository.pendingCount(),
        lastSyncedAt: DateTime.now(),
      ));
    } on SyncHttpException catch (e) {
      _set(SyncStatus(
        phase: SyncPhase.error,
        pending: repository.pendingCount(),
        message: e.status == 401
            ? 'This device is no longer paired.'
            : 'Sync failed (${e.status}).',
      ));
    } catch (_) {
      // Almost always no network. Said as a state rather than an error,
      // because being offline is normal and the queue is doing its job.
      _set(SyncStatus(
        phase: SyncPhase.offline,
        pending: repository.pendingCount(),
        message: 'Offline — changes are queued.',
      ));
    }
  }

  /// Coming back to the foreground is the moment a stale map is most visible,
  /// so it is the moment worth spending a request on.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(syncNow());
  }

  void _refreshPending() =>
      _set(SyncStatus(phase: _status.phase, pending: repository.pendingCount()));

  void _set(SyncStatus next) {
    _status = next;
    notifyListeners();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _client?.close();
    super.dispose();
  }
}


/// Puts the sync controller in the tree.
///
/// Separate from [MapScope] on purpose: a screen that shows sync status must
/// rebuild when sync status changes, and one that shows the map must not.
/// Merging them would repaint every list row on every heartbeat.
class SyncScope extends InheritedNotifier<SyncController> {
  const SyncScope({
    super.key,
    required SyncController controller,
    required super.child,
  }) : super(notifier: controller);

  static SyncController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<SyncScope>();
    assert(scope != null, 'No SyncScope in the tree.');
    return scope!.notifier!;
  }
}
