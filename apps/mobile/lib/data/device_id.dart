/// This installation's identity.
///
/// Small file, load-bearing job: `deviceId` is the final tiebreak in the sync
/// merge order. When two devices edit the same topic at the same revision in
/// the same millisecond, lexicographic device id decides — and both peers must
/// reach the same verdict without talking to each other.
///
/// Two properties follow, and neither is optional:
///
///   1. **Stable across launches.** An id regenerated on every start makes the
///      tiebreak random, so two replicas can pick opposite winners for the
///      same pair of edits and never converge.
///   2. **Unique across devices.** A hardware identifier would be neither
///      (Android returns the same value after a factory reset, iOS changes it
///      when the last app from a vendor is uninstalled) and would also be a
///      tracking identifier we have no reason to hold. A random v4 UUID is
///      better on every axis.
library;

import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

const _key = 'abh.deviceId';

/// Reads the stored id, minting one on first launch.
Future<String> loadDeviceId() async {
  final prefs = await SharedPreferences.getInstance();
  final existing = prefs.getString(_key);
  if (existing != null && existing.isNotEmpty) return existing;

  final id = const Uuid().v4();
  await prefs.setString(_key, id);
  return id;
}
