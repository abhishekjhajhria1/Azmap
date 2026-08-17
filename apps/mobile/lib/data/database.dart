/// The local store. Everything ABH knows lives here, on the device.
///
/// SQLite because the map is a graph and edges want indexes; five tables, one
/// per collection, mirroring `StorageAdapter` in `@abh/core`. Hand-written SQL
/// rather than Drift — see the note in `pubspec.yaml`.
///
/// Two decisions worth stating, because both look like details and neither is:
///
/// **Every row carries `rev`, `updated_at` and `device_id`.** They are not
/// metadata, they *are* the merge — `merge.dart` orders records by exactly
/// those three fields. A schema that stored only the payload would make sync
/// impossible to implement correctly later, no matter how good the sync code.
///
/// **Tombstones are a table, not a flag.** A deleted row has to leave something
/// behind or it comes back: a peer that still holds it sees a record we don't
/// have and helpfully sends it again. That bug shipped once on the web side
/// already, which is why it gets a table here from day one.
library;

import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqlite3/sqlite3.dart';

/// Bump on any schema change and add a step to [_migrate].
const schemaVersion = 1;

class AbhDatabase {
  AbhDatabase._(this.db);

  final Database db;

  /// Opens (and creates on first run) the map database in app documents.
  ///
  /// Documents rather than cache or temp: this is the user's own data, not a
  /// derived artefact, and the OS is entitled to delete the other two whenever
  /// it's short of space.
  static Future<AbhDatabase> open() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'abh.sqlite'));
    return AbhDatabase._(sqlite3.open(file.path)).._init();
  }

  /// In-memory, for tests. Same schema, no disk.
  static AbhDatabase memory() => AbhDatabase._(sqlite3.openInMemory()).._init();

  void _init() {
    // WAL: a write no longer blocks a read, so saving a capture can't stall a
    // list that's mid-scroll. `foreign_keys` stays off on purpose — sync
    // delivers edges and topics in arbitrary order, and an edge arriving before
    // its topic must be storable, not rejected. Dangling edges are dropped when
    // the graph is indexed instead (see graph.dart).
    db.execute('PRAGMA journal_mode = WAL;');
    db.execute('PRAGMA foreign_keys = OFF;');
    _migrate();
  }

  void _migrate() {
    final current = db.select('PRAGMA user_version;').first.values.first as int;
    if (current >= schemaVersion) return;

    if (current < 1) {
      db.execute('''
        CREATE TABLE IF NOT EXISTS topics (
          id           TEXT PRIMARY KEY,
          title        TEXT NOT NULL,
          summary      TEXT NOT NULL DEFAULT '',
          why_matters  TEXT NOT NULL DEFAULT '',
          unlocks      TEXT NOT NULL DEFAULT '',
          progress     TEXT NOT NULL DEFAULT 'not_started',
          origin       TEXT NOT NULL DEFAULT 'user',
          tags         TEXT NOT NULL DEFAULT '[]',
          completed_at INTEGER,
          created_at   INTEGER NOT NULL,
          updated_at   INTEGER NOT NULL,
          rev          INTEGER NOT NULL DEFAULT 0,
          device_id    TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS edges (
          id         TEXT PRIMARY KEY,
          from_id    TEXT NOT NULL,
          to_id      TEXT NOT NULL,
          strength   TEXT NOT NULL DEFAULT 'hard',
          origin     TEXT NOT NULL DEFAULT 'user',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          rev        INTEGER NOT NULL DEFAULT 0,
          device_id  TEXT NOT NULL DEFAULT ''
        );

        -- The unlock engine asks "what points into this topic?" for every node
        -- on every status recompute; without these it is a table scan per node.
        CREATE INDEX IF NOT EXISTS edges_to   ON edges (to_id);
        CREATE INDEX IF NOT EXISTS edges_from ON edges (from_id);

        CREATE TABLE IF NOT EXISTS captures (
          id         TEXT PRIMARY KEY,
          kind       TEXT NOT NULL,
          title      TEXT NOT NULL DEFAULT '',
          url        TEXT,
          text       TEXT NOT NULL DEFAULT '',
          linked_ids TEXT NOT NULL DEFAULT '[]',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          rev        INTEGER NOT NULL DEFAULT 0,
          device_id  TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS captures_created ON captures (created_at DESC);

        -- Single row, id = 'profile'. A table rather than shared_preferences
        -- because the profile syncs like everything else and needs the envelope.
        CREATE TABLE IF NOT EXISTS profile (
          id                TEXT PRIMARY KEY,
          name              TEXT NOT NULL DEFAULT '',
          active_roadmap_id TEXT,
          streak_days       INTEGER NOT NULL DEFAULT 0,
          last_active_day   TEXT,
          onboarded_at      INTEGER,
          created_at        INTEGER NOT NULL,
          updated_at        INTEGER NOT NULL,
          rev               INTEGER NOT NULL DEFAULT 0,
          device_id         TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS tombstones (
          collection TEXT NOT NULL,
          id         TEXT NOT NULL,
          rev        INTEGER NOT NULL DEFAULT 0,
          deleted_at INTEGER NOT NULL,
          device_id  TEXT NOT NULL DEFAULT '',
          PRIMARY KEY (collection, id)
        );

        -- Sync bookkeeping: the cursor, and the changes waiting to go out.
        CREATE TABLE IF NOT EXISTS sync_state (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        -- The outbox. A table, not a memory queue, because the whole point is
        -- surviving the app being killed — which on a phone happens constantly
        -- and without warning. A capture saved on the underground has to still
        -- be queued tomorrow morning.
        --
        -- Rows hold a *reference* (collection + id), not a copy of the record.
        -- Eleven edits to one topic therefore collapse to one queued entry, and
        -- a retry ships whatever the record says *now* rather than what it said
        -- when the write happened.
        CREATE TABLE IF NOT EXISTS outbox (
          collection TEXT NOT NULL,
          id         TEXT NOT NULL,
          queued_at  INTEGER NOT NULL,
          PRIMARY KEY (collection, id)
        );

        CREATE INDEX IF NOT EXISTS outbox_order ON outbox (queued_at);
      ''');
    }

    db.execute('PRAGMA user_version = $schemaVersion;');
  }

  void close() => db.dispose();
}
