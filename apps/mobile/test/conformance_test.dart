/// The Dart engine, checked against the TypeScript one.
///
/// `test/fixtures/conformance.json` is generated from `@abh/core` by
/// `pnpm --filter @abh/core vectors`, and its expectations are derived by
/// *running* the reference implementation rather than being written by hand.
/// This suite makes the Dart port reproduce every one of them.
///
/// That is the whole reason it is safe to have the unlock engine and the merge
/// order exist twice. Both are silent when wrong — a phone that merges
/// differently from a laptop converges on a different state and reports
/// success; a phone that gates on soft edges shows a topic locked that is open
/// everywhere else. Neither produces a stack trace. A shared corpus is what
/// turns "we think they match" into a test result.
///
/// Run: `flutter test` from `apps/mobile`.
///
/// If a case here fails, the fix is almost never to edit the JSON — that file
/// describes what the rest of the product actually does.
library;

import 'dart:convert';
import 'dart:io';

import 'package:abh/domain/graph.dart';
import 'package:abh/domain/merge.dart';
import 'package:abh/domain/models.dart';
// flutter_test re-exports the whole package:test API, so this runs under
// `flutter test` without adding a bare `test` dependency to a Flutter package.
import 'package:flutter_test/flutter_test.dart';

/// The version the Dart side was written against. A bump in core without a
/// regenerated fixture — or a regenerated fixture without a port update — has
/// to fail here rather than silently skip the new cases.
const expectedVectorVersion = 1;

/// A bare [Versioned] for the merge cases, which care about nothing else.
class _V implements Versioned {
  const _V(this.rev, this.updatedAt, this.deviceId);
  @override
  String get id => 'x';
  @override
  final int rev;
  @override
  final int updatedAt;
  @override
  final String deviceId;
}

_V _versioned(Map<String, dynamic> j) => _V(
      j['rev'] as int? ?? 0,
      j['updatedAt'] as int? ?? 0,
      j['deviceId'] as String? ?? '',
    );

int _sign(int n) => n < 0 ? -1 : (n > 0 ? 1 : 0);

MapStatus _statusFromWire(String s) => switch (s) {
      'known' => MapStatus.known,
      'in_progress' => MapStatus.inProgress,
      'available' => MapStatus.available,
      _ => MapStatus.locked,
    };

void main() {
  final file = File('test/fixtures/conformance.json');
  if (!file.existsSync()) {
    // Better than a null-pointer thirty lines down: say exactly how to fix it.
    throw StateError(
      'Missing test/fixtures/conformance.json. '
      'Generate it with: pnpm --filter @abh/core vectors',
    );
  }
  final vectors = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;

  test('fixture matches the version this port was written against', () {
    expect(vectors['version'], expectedVectorVersion);
  });

  group('unlock engine', () {
    for (final raw in vectors['graph'] as List) {
      final c = raw as Map<String, dynamic>;
      final name = c['name'] as String;
      final rule = c['rule'] as String;
      final expected = c['expect'] as Map<String, dynamic>;

      final graph = Graph(
        topics: [
          for (final t in c['topics'] as List)
            Topic(
              id: (t as Map<String, dynamic>)['id'] as String,
              title: t['id'] as String,
              progress: progressFromWire(t['progress'] as String?),
            ),
        ],
        edges: [
          for (final e in c['edges'] as List)
            Edge(
              id: '${(e as Map<String, dynamic>)['from']}->${e['to']}',
              from: e['from'] as String,
              to: e['to'] as String,
              strength:
                  e['strength'] == 'soft' ? EdgeStrength.soft : EdgeStrength.hard,
            ),
        ],
      );

      group('$name — $rule', () {
        test('statuses', () {
          final want = (expected['statuses'] as Map<String, dynamic>)
              .map((k, v) => MapEntry(k, _statusFromWire(v as String)));
          expect(computeStatuses(graph), want);
        });

        test('topological order', () {
          final want = expected['topo'] as List?;
          final got = topoOrder(graph)?.map((t) => t.id).toList();
          expect(got, want?.cast<String>());
        });

        final probe = expected['unlockProbe'] as String?;
        if (probe != null) {
          test('completing $probe unlocks the recorded set', () {
            final got = wouldUnlock(probe, graph).map((t) => t.id).toList()..sort();
            expect(got, (expected['unlocks'] as List).cast<String>());
          });
        }

        for (final raw in (expected['cycles'] as List? ?? const [])) {
          final probe = raw as Map<String, dynamic>;
          final from = probe['from'] as String;
          final to = probe['to'] as String;
          test('adding $from -> $to cyclic == ${probe['cyclic']}', () {
            expect(wouldCreateCycle(from, to, graph), probe['cyclic']);
          });
        }
      });
    }
  });

  group('merge order', () {
    for (final raw in vectors['order'] as List) {
      final c = raw as Map<String, dynamic>;
      final a = _versioned(c['a'] as Map<String, dynamic>);
      final b = _versioned(c['b'] as Map<String, dynamic>);
      final want = c['expect'] as int;

      group('${c['name']} — ${c['rule']}', () {
        test('compares as recorded', () {
          expect(_sign(compareVersions(a, b)), want);
        });

        test('is antisymmetric — both peers must pick the same side', () {
          // The property that actually makes replicas converge. Right on the
          // recorded pair but not antisymmetric still loses data.
          expect(_sign(compareVersions(b, a)), want == 0 ? 0 : -want);
        });
      });
    }
  });

  group('tombstones', () {
    for (final raw in vectors['tombstone'] as List) {
      final c = raw as Map<String, dynamic>;
      final recordJson = c['record'] as Map<String, dynamic>?;
      final tomb = Tombstone.fromJson(c['tomb'] as Map<String, dynamic>);

      test('${c['name']} — ${c['rule']}', () {
        expect(
          tombstoneWins(recordJson == null ? null : _versioned(recordJson), tomb),
          c['expect'],
        );
      });
    }
  });
}
