/// Reads and writes for the map. The Dart counterpart of `MapStore`.
///
/// Every mutation does three things without exception: bump `rev`, stamp
/// `updatedAt`, stamp `deviceId`. That is not bookkeeping — it *is* the merge.
/// `compareVersions` orders records by exactly those three fields, so a write
/// that skips one is a record that can never be resolved correctly against a
/// peer's copy. Which is why the stamping lives here, in one place, rather than
/// at each call site where it can be forgotten once.
///
/// Deletes write a tombstone in the same transaction as the row removal. Not
/// afterwards, and not "when we get round to sync" — a delete that isn't
/// recorded is a delete that comes back the moment another device syncs.
library;

import 'dart:convert';

import 'package:sqlite3/sqlite3.dart';
import 'package:uuid/uuid.dart';

import '../domain/graph.dart';
import '../domain/models.dart';
import '../domain/merge.dart';
import '../sync/entry.dart';
import 'database.dart';

class MapRepository {
  MapRepository(this._db, {required this.deviceId});

  final AbhDatabase _db;

  /// This installation's identity, and the final tiebreak in the merge order.
  /// Stable across launches — see `device_id.dart`.
  final String deviceId;

  Database get _c => _db.db;

  int get _now => DateTime.now().millisecondsSinceEpoch;

  // ---- reads ---------------------------------------------------------------

  List<Topic> topics() =>
      _c.select('SELECT * FROM topics').map(_topic).toList(growable: false);

  List<Edge> edges() =>
      _c.select('SELECT * FROM edges').map(_edge).toList(growable: false);

  List<Capture> captures() => _c
      .select('SELECT * FROM captures ORDER BY created_at DESC')
      .map(_capture)
      .toList(growable: false);

  Graph graph() => Graph(topics: topics(), edges: edges());

  // ---- topics --------------------------------------------------------------

  Topic addTopic({
    required String title,
    String summary = '',
    String whyItMatters = '',
    Origin origin = Origin.user,
    List<String> tags = const [],
  }) {
    final t = Topic(
      id: newId('t'),
      title: title,
      summary: summary,
      whyItMatters: whyItMatters,
      origin: origin,
      tags: tags,
      createdAt: _now,
      updatedAt: _now,
      deviceId: deviceId,
    );
    _putTopic(t);
    return t;
  }

  /// Marks progress and returns the topics that just became available.
  ///
  /// The unlocked set is computed *before* the write, against the pre-change
  /// graph — that is what "newly available" means, and computing it after would
  /// return everything already open, which turns the celebration into a lie.
  ({Topic topic, List<Topic> unlocked}) setProgress(String id, Progress p) {
    final before = graph();
    final unlocked =
        p == Progress.known ? wouldUnlock(id, before) : const <Topic>[];

    final existing = before.topics.firstWhere((t) => t.id == id);
    final next = existing.copyWith(
      progress: p,
      completedAt: p == Progress.known ? _now : null,
      updatedAt: _now,
      rev: existing.rev + 1,
      deviceId: deviceId,
    );
    _putTopic(next);
    return (topic: next, unlocked: unlocked);
  }

  /// Adds a prerequisite edge, refusing one that would close a cycle.
  ///
  /// Returns null rather than throwing: this is called from proposal-accept
  /// buttons where a rejected edge is an ordinary outcome, not an error.
  Edge? addEdge(
    String from,
    String to, {
    EdgeStrength strength = EdgeStrength.hard,
    Origin origin = Origin.user,
  }) {
    final g = graph();
    final ids = {for (final t in g.topics) t.id};
    if (!ids.contains(from) || !ids.contains(to)) return null;
    if (wouldCreateCycle(from, to, g)) return null;

    final e = Edge(
      id: newId('e'),
      from: from,
      to: to,
      strength: strength,
      origin: origin,
      createdAt: _now,
      updatedAt: _now,
      deviceId: deviceId,
    );
    _putEdge(e);
    return e;
  }

  // ---- captures ------------------------------------------------------------

  Capture addCapture({
    required String kind,
    String title = '',
    String? url,
    String text = '',
  }) {
    final c = Capture(
      id: newId('c'),
      kind: kind,
      title: title,
      url: url,
      text: text,
      createdAt: _now,
      updatedAt: _now,
      deviceId: deviceId,
    );
    _putCapture(c);
    return c;
  }

  /// Files a capture against a topic that already exists.
  ///
  /// The alternative — always minting a new topic from the capture's title — is
  /// how a second brain fills with four nodes for the same idea, each with its
  /// own prerequisites, and nothing ever merges them again.
  ///
  /// Idempotent, and null on a missing record: proposals are computed before
  /// they are tapped, and either end may be gone by the time the tap lands.
  Capture? linkCapture(String captureId, String topicId) {
    final rows = _c.select('SELECT * FROM captures WHERE id = ?', [captureId]);
    if (rows.isEmpty) return null;
    final existing = _capture(rows.first);
    if (existing.linkedTopicIds.contains(topicId)) return existing;
    if (_c.select('SELECT 1 FROM topics WHERE id = ?', [topicId]).isEmpty) {
      return null;
    }

    final next = Capture(
      id: existing.id,
      kind: existing.kind,
      title: existing.title,
      url: existing.url,
      text: existing.text,
      linkedTopicIds: [...existing.linkedTopicIds, topicId],
      createdAt: existing.createdAt,
      updatedAt: _now,
      rev: existing.rev + 1,
      deviceId: deviceId,
    );
    _putCapture(next);
    return next;
  }

  // ---- deletes -------------------------------------------------------------

  /// Removes a record and records the removal, atomically.
  ///
  /// The transaction is the point. A crash between the two statements would
  /// leave either a row that should be gone or a tombstone for a row that
  /// isn't — and the second is the one that silently deletes live data on the
  /// next sync.
  void delete(String collection, String id) {
    final rev = switch (collection) {
      'topics' => _revOf('topics', id),
      'edges' => _revOf('edges', id),
      'captures' => _revOf('captures', id),
      _ => 0,
    };

    _c.execute('BEGIN');
    try {
      _c.execute('DELETE FROM $collection WHERE id = ?', [id]);
      _c.execute(
        'INSERT OR REPLACE INTO tombstones (collection, id, rev, deleted_at, device_id) '
        'VALUES (?,?,?,?,?)',
        [collection, id, rev + 1, _now, deviceId],
      );
      // The tombstone is what travels; without this the delete is local
      // forever and the record returns the next time a peer syncs.
      _c.execute(
        'INSERT OR REPLACE INTO outbox (collection, id, queued_at) VALUES (?,?,?)',
        ['tombstones', id, _now],
      );
      _c.execute('DELETE FROM outbox WHERE collection = ? AND id = ?',
          [collection, id]);
      _c.execute('COMMIT');
    } catch (_) {
      _c.execute('ROLLBACK');
      rethrow;
    }
  }

  int _revOf(String table, String id) {
    final rows = _c.select('SELECT rev FROM $table WHERE id = ?', [id]);
    return rows.isEmpty ? 0 : rows.first['rev'] as int;
  }

  // ---- writes --------------------------------------------------------------

  void _putTopic(Topic t, {bool enqueue = true}) {
    _c.execute(
        'INSERT OR REPLACE INTO topics '
        '(id, title, summary, why_matters, unlocks, progress, origin, tags, '
        ' completed_at, created_at, updated_at, rev, device_id) '
        'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [
          t.id, t.title, t.summary, t.whyItMatters, t.unlocks,
          progressToWire(t.progress), originToWire(t.origin), jsonEncode(t.tags),
          t.completedAt, t.createdAt, t.updatedAt, t.rev, t.deviceId,
      ],
    );
    if (enqueue) _enqueue('topics', t.id);
  }

  void _putCapture(Capture c, {bool enqueue = true}) {
    _c.execute(
        'INSERT OR REPLACE INTO captures '
        '(id, kind, title, url, text, linked_ids, created_at, updated_at, rev, device_id) '
        'VALUES (?,?,?,?,?,?,?,?,?,?)',
        [
          c.id, c.kind, c.title, c.url, c.text, jsonEncode(c.linkedTopicIds),
          c.createdAt, c.updatedAt, c.rev, c.deviceId,
      ],
    );
    if (enqueue) _enqueue('captures', c.id);
  }

  void _putEdge(Edge e, {bool enqueue = true}) {
    _c.execute(
      'INSERT OR REPLACE INTO edges '
      '(id, from_id, to_id, strength, origin, created_at, updated_at, rev, device_id) '
      'VALUES (?,?,?,?,?,?,?,?,?)',
      [e.id, e.from, e.to, e.strength.name, originToWire(e.origin), e.createdAt,
        e.updatedAt, e.rev, e.deviceId],
    );
    if (enqueue) _enqueue('edges', e.id);
  }

  // ---- sync surface --------------------------------------------------------

  /// Queue a record for the relay.
  ///
  /// Called from every write, without exception. A mutation that forgets this
  /// is a change that exists on one device forever, and the failure is silent —
  /// the app works perfectly right up until you pick up your other phone.
  ///
  /// `INSERT OR REPLACE` on (collection, id) is what collapses eleven edits to
  /// one topic into a single queued entry.
  void _enqueue(String collection, String id) => _c.execute(
        'INSERT OR REPLACE INTO outbox (collection, id, queued_at) VALUES (?,?,?)',
        [collection, id, _now],
      );

  /// What's waiting to go out, oldest first, resolved to current records.
  ///
  /// Resolving at send time rather than at queue time is the point of storing
  /// references: a topic edited five times since it was queued ships once, with
  /// its latest content.
  List<SyncEntry> outbox({int limit = 200}) {
    final rows = _c.select(
      'SELECT collection, id FROM outbox ORDER BY queued_at LIMIT ?',
      [limit],
    );

    final out = <SyncEntry>[];
    for (final r in rows) {
      final collection = r['collection'] as String;
      final id = r['id'] as String;
      final record = switch (collection) {
        'topics' => topicById(id)?.toJson(),
        'edges' => edgeById(id)?.toJson(),
        'captures' => captureById(id)?.toJson(),
        'tombstones' => _tombstoneById(id),
        _ => null,
      };
      // A queued record that no longer exists was deleted after being queued.
      // The tombstone is queued separately, so dropping this entry is correct.
      if (record != null) {
        out.add(SyncEntry(collection: collection, record: record));
      }
    }
    return out;
  }

  int pendingCount() =>
      _c.select('SELECT COUNT(*) AS n FROM outbox').first['n'] as int;

  /// Clears the entries that were just sent — by age, matching what `outbox`
  /// returned. Anything queued *during* the request stays, which is why this
  /// takes a count rather than truncating the table.
  void clearOutbox(int count) => _c.execute(
        'DELETE FROM outbox WHERE rowid IN '
        '(SELECT rowid FROM outbox ORDER BY queued_at LIMIT ?)',
        [count],
      );

  String cursor() {
    final rows =
        _c.select("SELECT value FROM sync_state WHERE key = 'cursor'");
    return rows.isEmpty ? '0' : rows.first['value'] as String;
  }

  void setCursor(String value) => _c.execute(
        "INSERT OR REPLACE INTO sync_state (key, value) VALUES ('cursor', ?)",
        [value],
      );

  Topic? topicById(String id) {
    final rows = _c.select('SELECT * FROM topics WHERE id = ?', [id]);
    return rows.isEmpty ? null : _topic(rows.first);
  }

  Edge? edgeById(String id) {
    final rows = _c.select('SELECT * FROM edges WHERE id = ?', [id]);
    return rows.isEmpty ? null : _edge(rows.first);
  }

  Capture? captureById(String id) {
    final rows = _c.select('SELECT * FROM captures WHERE id = ?', [id]);
    return rows.isEmpty ? null : _capture(rows.first);
  }

  Map<String, dynamic>? _tombstoneById(String id) {
    final rows = _c.select('SELECT * FROM tombstones WHERE id = ?', [id]);
    if (rows.isEmpty) return null;
    final r = rows.first;
    return {
      'id': r['id'],
      'collection': r['collection'],
      'rev': r['rev'],
      'deletedAt': r['deleted_at'],
      'deviceId': r['device_id'],
    };
  }

  /// Writes from a peer. Deliberately do **not** enqueue: echoing an incoming
  /// record straight back into the outbox is an infinite sync loop between two
  /// devices, each politely returning what the other just sent.
  void putTopic(Topic t) => _putTopic(t, enqueue: false);
  void putEdge(Edge e) => _putEdge(e, enqueue: false);
  void putCapture(Capture c) => _putCapture(c, enqueue: false);

  /// Apply an incoming delete, if it beats what we hold.
  void applyTombstone(Tombstone tomb) {
    final existing = switch (tomb.collection) {
      'topics' => topicById(tomb.id) as Versioned?,
      'edges' => edgeById(tomb.id) as Versioned?,
      'captures' => captureById(tomb.id) as Versioned?,
      _ => null,
    };
    if (!tombstoneWins(existing, tomb)) return;

    _c.execute('BEGIN');
    try {
      _c.execute('DELETE FROM ${tomb.collection} WHERE id = ?', [tomb.id]);
      _c.execute(
        'INSERT OR REPLACE INTO tombstones (collection, id, rev, deleted_at, device_id) '
        'VALUES (?,?,?,?,?)',
        [tomb.collection, tomb.id, tomb.rev, tomb.deletedAt, tomb.deviceId],
      );
      _c.execute('COMMIT');
    } catch (_) {
      _c.execute('ROLLBACK');
      rethrow;
    }
  }

  // ---- row mapping ---------------------------------------------------------

  Topic _topic(Row r) => Topic(
        id: r['id'] as String,
        title: r['title'] as String,
        summary: r['summary'] as String,
        whyItMatters: r['why_matters'] as String,
        unlocks: r['unlocks'] as String,
        progress: progressFromWire(r['progress'] as String?),
        origin: originFromWire(r['origin'] as String?),
        tags: (jsonDecode(r['tags'] as String) as List).cast<String>(),
        completedAt: r['completed_at'] as int?,
        createdAt: r['created_at'] as int,
        updatedAt: r['updated_at'] as int,
        rev: r['rev'] as int,
        deviceId: r['device_id'] as String,
      );

  Edge _edge(Row r) => Edge(
        id: r['id'] as String,
        from: r['from_id'] as String,
        to: r['to_id'] as String,
        strength:
            r['strength'] == 'soft' ? EdgeStrength.soft : EdgeStrength.hard,
        origin: originFromWire(r['origin'] as String?),
        createdAt: r['created_at'] as int,
        updatedAt: r['updated_at'] as int,
        rev: r['rev'] as int,
        deviceId: r['device_id'] as String,
      );

  Capture _capture(Row r) => Capture(
        id: r['id'] as String,
        kind: r['kind'] as String,
        title: r['title'] as String,
        url: r['url'] as String?,
        text: r['text'] as String,
        linkedTopicIds:
            (jsonDecode(r['linked_ids'] as String) as List).cast<String>(),
        createdAt: r['created_at'] as int,
        updatedAt: r['updated_at'] as int,
        rev: r['rev'] as int,
        deviceId: r['device_id'] as String,
      );
}

/// Prefixed ids, so a bare id says what it points at — matching `@abh/core`.
///
/// A real v4 UUID rather than a timestamp with a random-looking tail. Ids are
/// minted independently on every device and then merged; anything derived from
/// the clock collides the moment two devices create a record in the same
/// millisecond, and an id collision across replicas silently overwrites one
/// person's topic with another's.
String newId(String prefix) => '${prefix}_${_uuid.v4().replaceAll('-', '')}';

const _uuid = Uuid();
