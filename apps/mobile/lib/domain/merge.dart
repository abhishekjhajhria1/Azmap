/// The sync merge order, in Dart.
///
/// The single most dangerous function in this codebase to get wrong, in either
/// language. Everything else fails loudly; this fails by quietly converging two
/// devices on *different* states and reporting success.
///
/// The rule is last-writer-wins under a **deterministic total order**, and every
/// word of that matters:
///
///   1. higher `rev` wins
///   2. same rev → later `updatedAt` wins
///   3. same both → lexicographically greater `deviceId` wins
///
/// Step 3 is the one people delete because it looks arbitrary. It is arbitrary,
/// and that is fine — what it buys is that *both peers pick the same side*
/// without talking to each other. Without it, two devices that edited the same
/// topic in the same millisecond each keep their own version, both believe they
/// are in sync, and the disagreement is permanent and silent.
///
/// Verified against the TypeScript reference by `test/conformance_test.dart`,
/// including antisymmetry — a comparator that is right on the recorded pairs but
/// not antisymmetric still loses data.
library;

import 'models.dart';

/// Negative when [a] is older, positive when [a] is newer, zero when equal.
///
/// Only the *sign* is meaningful; the magnitude is an implementation accident,
/// which is why the conformance corpus records sign only.
int compareVersions(Versioned a, Versioned b) {
  if (a.rev != b.rev) return a.rev - b.rev;
  if (a.updatedAt != b.updatedAt) return a.updatedAt - b.updatedAt;
  return a.deviceId.compareTo(b.deviceId);
}

/// Should [incoming] replace [existing]?
///
/// Strictly greater, never greater-or-equal. On equality the incoming copy is
/// byte-identical anyway, and preferring it would mean two peers each rewriting
/// the record on every sync, bumping nothing and syncing forever.
bool incomingWins(Versioned? existing, Versioned incoming) =>
    existing == null || compareVersions(incoming, existing) > 0;

/// Merge a batch into a map by the total order above.
///
/// Commutative by construction: applying A then B leaves the same result as B
/// then A, which is what lets a device apply pages of a delta in any order and
/// still land where its peers land.
void mergeRecords<T extends Versioned>(Map<String, T> target, Iterable<T> incoming) {
  for (final rec in incoming) {
    if (incomingWins(target[rec.id], rec)) target[rec.id] = rec;
  }
}

/// Does this delete beat the record we hold?
///
/// The comparison runs through the same comparator, with the tombstone standing
/// in as a version — that is why `Tombstone.updatedAt` returns `deletedAt`. A
/// separate rule for deletes is how you get a delete that wins on one device and
/// loses on another.
bool tombstoneWins(Versioned? record, Tombstone tomb) =>
    record == null || compareVersions(tomb, record) > 0;

/// Merge tombstones against each other — a peer may know about deletes we don't.
void mergeTombstones(Map<String, Tombstone> target, Iterable<Tombstone> incoming) {
  for (final t in incoming) {
    final key = tombstoneKey(t);
    if (incomingWins(target[key], t)) target[key] = t;
  }
}

/// Tombstones are keyed by collection *and* id: the id spaces are independent,
/// and a topic and a capture could in principle collide.
String tombstoneKey(Tombstone t) => '${t.collection}:${t.id}';
