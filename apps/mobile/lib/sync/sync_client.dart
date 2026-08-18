/// The bridge: this phone talking to the relay.
///
/// ## What the relay is, and what it deliberately isn't
///
/// It is a dumb append-only log of sealed blobs, keyed by account. It cannot
/// read them, cannot merge them, and has no idea what a topic is. Every piece
/// of intelligence — what wins a conflict, what a delete means — lives on the
/// devices, which is what makes "your learning never leaves your device" true
/// in a form stronger than a privacy policy.
///
/// That shape has a consequence worth stating: **the server can never resolve a
/// conflict for you.** Two devices that disagree stay disagreeing until one of
/// them applies `compareVersions` and wins. That's why the merge order is
/// conformance-tested against TypeScript rather than trusted.
///
/// ## The three failure modes this handles
///
/// **Offline.** Writes queue in an outbox that survives being killed. Nothing
/// blocks on the network — ever. A capture saved on the underground is saved.
///
/// **Half-sent.** The cursor advances only *after* changes are applied
/// locally. Advancing on receipt loses a page permanently if the app dies
/// between the two, and nothing ever notices.
///
/// **Two syncs at once.** Single-flight. Opening the app while a background
/// sync runs would otherwise push the same rows twice and race the cursor.
library;

import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart' show VoidCallback;
import 'package:http/http.dart' as http;

import '../data/map_repository.dart';
import '../domain/merge.dart';
import '../domain/models.dart';
import 'crypto.dart';
import 'entry.dart';

enum SyncPhase { idle, syncing, offline, error }

class SyncStatus {
  const SyncStatus({
    this.phase = SyncPhase.idle,
    this.pending = 0,
    this.lastSyncedAt,
    this.message,
  });

  final SyncPhase phase;

  /// How many local changes are waiting. Shown, because "saved on this device"
  /// and "saved everywhere" are different promises and the user is entitled to
  /// know which one they currently have.
  final int pending;
  final DateTime? lastSyncedAt;
  final String? message;
}

/// Raised for HTTP failures, with the one bit of information that matters.
class SyncHttpException implements Exception {
  const SyncHttpException(this.status, this.body);
  final int status;
  final String body;

  /// 401/403 mean the credentials are wrong and will stay wrong; 413 means the
  /// payload is too big and will stay too big. Retrying those is a battery
  /// drain that also hammers the server. Everything else is worth another go.
  bool get retryable => status != 401 && status != 403 && status != 413;

  @override
  String toString() => 'SyncHttpException($status): $body';
}

/// Where this device is enrolled, and with what.
class Enrolment {
  const Enrolment({
    required this.endpoint,
    required this.token,
    required this.accountId,
  });

  final String endpoint;
  final String token;
  final String accountId;

  Map<String, dynamic> toJson() =>
      {'endpoint': endpoint, 'token': token, 'accountId': accountId};

  factory Enrolment.fromJson(Map<String, dynamic> j) => Enrolment(
        endpoint: j['endpoint'] as String,
        token: j['token'] as String,
        accountId: j['accountId'] as String? ?? '',
      );
}

class SyncClient {
  SyncClient({
    required this.repository,
    required this.enrolment,
    required this.crypto,
    required this.deviceId,
    this.onChanged,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  /// Fired once per sync that actually wrote something.
  ///
  /// Once, not per record: a pull of two hundred rows firing two hundred
  /// rebuilds would drop every frame of the animation it lands during.
  final VoidCallback? onChanged;

  final MapRepository repository;
  final Enrolment enrolment;
  final AccountCrypto crypto;
  final String deviceId;
  final http.Client _http;

  Future<void>? _inFlight;

  /// Single-flight. A second caller joins the run already going rather than
  /// starting its own — the popup opening during a background sync is the
  /// common case, and two concurrent runs would double-push and race the cursor.
  Future<void> sync() {
    final running = _inFlight;
    if (running != null) return running;
    final run = _run().whenComplete(() => _inFlight = null);
    _inFlight = run;
    return run;
  }

  Future<void> _run() async {
    await _push();
    final applied = await _pull();
    if (applied) onChanged?.call();
  }

  // ---- push ----------------------------------------------------------------

  Future<void> _push() async {
    final queued = repository.outbox();
    if (queued.isEmpty) return;

    final sealed = <Map<String, dynamic>>[];
    for (final entry in queued) {
      sealed.add((await crypto.seal(entry.toJson())).toJson());
    }

    await _post('/v1/sync/push', {'entries': sealed});
    // Cleared only after the server has acknowledged. Clearing optimistically
    // means a failed request silently drops every change it was carrying.
    repository.clearOutbox(queued.length);
  }

  // ---- pull ----------------------------------------------------------------

  Future<bool> _pull() async {
    var cursor = repository.cursor();
    var more = true;
    var applied = false;

    while (more) {
      final page = await _get('/v1/sync/pull?since=$cursor&limit=200');
      final items = (page['items'] as List? ?? const []);
      if (items.isEmpty) break;

      for (final raw in items) {
        final item = (raw as Map).cast<String, dynamic>();
        // Our own writes come back through the log. Skipping them is not just
        // an optimisation — re-applying a record we already hold would leave it
        // unchanged but bump nothing, and the wasted work grows with the log.
        if (item['deviceId'] == deviceId) continue;

        try {
          final decoded = await crypto.open<Map<String, dynamic>>(
              Sealed.fromJson((item['sealed'] as Map).cast<String, dynamic>()));
          _apply(SyncEntry.fromJson(decoded));
          applied = true;
        } catch (_) {
          // One unreadable entry must not stop the page. It means a key
          // mismatch or a corrupted row, and neither is fixed by refusing to
          // sync everything else forever.
          continue;
        }
      }

      // Cursor last. If the process dies mid-page the page is replayed, and
      // replay is safe because the merge is idempotent — whereas a cursor
      // advanced too early loses those records with nothing to notice it.
      cursor = page['cursor'] as String? ?? cursor;
      repository.setCursor(cursor);
      more = page['hasMore'] as bool? ?? false;
    }
    return applied;
  }

  /// Apply one incoming record under the total order.
  ///
  /// Last-writer-wins by `rev → updatedAt → deviceId`, identical to the
  /// TypeScript implementation and pinned there by the conformance corpus.
  void _apply(SyncEntry entry) {
    switch (entry.collection) {
      case 'topics':
        final incoming = Topic.fromJson(entry.record);
        final existing = repository.topicById(incoming.id);
        if (incomingWins(existing, incoming)) repository.putTopic(incoming);
      case 'edges':
        final incoming = Edge.fromJson(entry.record);
        final existing = repository.edgeById(incoming.id);
        if (incomingWins(existing, incoming)) repository.putEdge(incoming);
      case 'captures':
        final incoming = Capture.fromJson(entry.record);
        final existing = repository.captureById(incoming.id);
        if (incomingWins(existing, incoming)) repository.putCapture(incoming);
      case 'tombstones':
        final tomb = Tombstone.fromJson(entry.record);
        repository.applyTombstone(tomb);
    }
  }

  // ---- transport -----------------------------------------------------------

  Future<Map<String, dynamic>> _get(String path) async =>
      _request(() => _http.get(Uri.parse('${enrolment.endpoint}$path'),
          headers: _headers));

  Future<Map<String, dynamic>> _post(String path, Object body) async =>
      _request(() => _http.post(
            Uri.parse('${enrolment.endpoint}$path'),
            headers: _headers,
            body: jsonEncode(body),
          ));

  Map<String, String> get _headers => {
        'authorization': 'Bearer ${enrolment.token}',
        'content-type': 'application/json',
      };

  /// Retries with exponential backoff **and jitter**.
  ///
  /// The jitter is the part people skip. Without it, every device that lost
  /// connectivity during an outage retries at exactly 1s, 2s, 4s from the
  /// moment service returns — a thundering herd that knocks the server over
  /// again, which resets the clock, which does it again.
  Future<Map<String, dynamic>> _request(
      Future<http.Response> Function() send) async {
    const attempts = 4;
    final rnd = Random();

    for (var i = 0; i < attempts; i++) {
      try {
        final response = await send().timeout(const Duration(seconds: 20));
        if (response.statusCode >= 200 && response.statusCode < 300) {
          if (response.body.isEmpty) return const {};
          return jsonDecode(response.body) as Map<String, dynamic>;
        }
        final failure = SyncHttpException(response.statusCode, response.body);
        if (!failure.retryable || i == attempts - 1) throw failure;
      } on SyncHttpException {
        rethrow;
      } catch (_) {
        if (i == attempts - 1) rethrow;
      }

      final backoff = 400 * (1 << i);
      await Future<void>.delayed(
          Duration(milliseconds: backoff + rnd.nextInt(backoff ~/ 2)));
    }
    throw StateError('unreachable');
  }

  void close() => _http.close();
}

/// Enrols this device against a pairing code, and returns everything needed to
/// sync from then on.
///
/// The account key is **not** part of this exchange. It rides in the fragment
/// of the pairing URL — the part a browser never sends to a server — so the
/// relay hands over a token and still cannot read a single record.
Future<Enrolment> enrolDevice({
  required String endpoint,
  required String code,
  required String deviceName,
  http.Client? client,
}) async {
  final http.Client c = client ?? http.Client();
  try {
    final response = await c.post(
      Uri.parse('${endpoint.replaceAll(RegExp(r'/+$'), '')}/v1/pairings/claim'),
      headers: const {'content-type': 'application/json'},
      body: jsonEncode({'code': code, 'name': deviceName}),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw SyncHttpException(response.statusCode, response.body);
    }
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return Enrolment(
      endpoint: endpoint.replaceAll(RegExp(r'/+$'), ''),
      token: body['token'] as String,
      accountId: body['accountId'] as String? ?? '',
    );
  } finally {
    if (client == null) c.close();
  }
}
