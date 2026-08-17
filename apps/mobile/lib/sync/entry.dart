/// One record on the wire.
///
/// Its own file so the repository and the client can both use it without
/// importing each other — a cycle Dart tolerates but nobody should have to
/// reason about at 2am.
library;

class SyncEntry {
  const SyncEntry({required this.collection, required this.record});

  /// One of topics, edges, captures, tombstones.
  final String collection;

  /// The record's `toJson()`, exactly as the TypeScript side writes it.
  final Map<String, dynamic> record;

  Map<String, dynamic> toJson() => {'collection': collection, 'record': record};

  factory SyncEntry.fromJson(Map<String, dynamic> j) => SyncEntry(
        collection: j['collection'] as String,
        record: (j['record'] as Map).cast<String, dynamic>(),
      );
}
