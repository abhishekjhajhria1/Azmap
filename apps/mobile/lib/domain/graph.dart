/// The unlock engine, in Dart.
///
/// A second implementation of `packages/core/src/graph.ts`. That is a real risk
/// and it is handled the only way that works: `test/conformance_test.dart` runs
/// this against a corpus generated from the TypeScript reference, so "the two
/// agree" is a test result rather than an intention. If you change anything in
/// here, run `pnpm --filter @abh/core vectors` and make the corpus pass.
///
/// Pure functions over `(topics, edges)`. No storage, no I/O, no Flutter — this
/// is the part that has to be provably correct, so it stays side-effect free and
/// importable from a plain Dart VM test.
///
/// The rule, in one line: **a topic is available when every _hard_ prerequisite
/// edge into it comes from a topic the user already knows.** Soft edges inform
/// ordering and never gate.
library;

import 'models.dart';

class Graph {
  const Graph({required this.topics, required this.edges});
  final List<Topic> topics;
  final List<Edge> edges;
}

/// Lookup structures derived once and reused, so a screen that asks several
/// questions about the same graph pays for the indexing once.
class GraphIndex {
  GraphIndex._(this.byId, this.incoming, this.outgoing);

  final Map<String, Topic> byId;

  /// topicId → prerequisite edges pointing *into* it.
  final Map<String, List<Edge>> incoming;

  /// topicId → edges pointing *out* of it (the things it unlocks).
  final Map<String, List<Edge>> outgoing;

  factory GraphIndex(Graph g) {
    final byId = <String, Topic>{};
    final incoming = <String, List<Edge>>{};
    final outgoing = <String, List<Edge>>{};

    for (final t in g.topics) {
      byId[t.id] = t;
      incoming[t.id] = [];
      outgoing[t.id] = [];
    }
    for (final e in g.edges) {
      // Dangling edges are dropped, not treated as prerequisites. Sync can
      // deliver an edge in the same batch as — or before — the topic it points
      // at, and gating on a topic we've never seen would lock the map behind a
      // node that doesn't exist.
      if (!byId.containsKey(e.from) || !byId.containsKey(e.to)) continue;
      incoming[e.to]!.add(e);
      outgoing[e.from]!.add(e);
    }
    return GraphIndex._(byId, incoming, outgoing);
  }
}

bool _isKnown(Topic? t) => t?.progress == Progress.known;

/// Is this topic open to start right now?
///
/// False for anything already known — a finished topic is not offered again.
bool isAvailable(String topicId, GraphIndex index) {
  final topic = index.byId[topicId];
  if (topic == null || topic.progress == Progress.known) return false;
  for (final e in index.incoming[topicId] ?? const <Edge>[]) {
    if (e.strength == EdgeStrength.soft) continue;
    if (!_isKnown(index.byId[e.from])) return false;
  }
  return true;
}

MapStatus statusOf(String topicId, GraphIndex index) {
  final topic = index.byId[topicId];
  if (topic == null) return MapStatus.locked;
  if (topic.progress == Progress.known) return MapStatus.known;
  if (topic.progress == Progress.inProgress) return MapStatus.inProgress;
  return isAvailable(topicId, index) ? MapStatus.available : MapStatus.locked;
}

Map<String, MapStatus> computeStatuses(Graph g) {
  final index = GraphIndex(g);
  return {for (final t in g.topics) t.id: statusOf(t.id, index)};
}

/// Everything open to the learner right now, in graph order.
List<Topic> availableNow(Graph g) {
  final index = GraphIndex(g);
  return g.topics.where((t) => isAvailable(t.id, index)).toList();
}

/// What completing [topicId] would make newly available.
///
/// "Newly" is doing the work: a node whose *other* prerequisite is still unknown
/// does not appear, which is why the diamond case is in the conformance corpus.
/// Getting this wrong makes the completion celebration lie.
List<Topic> wouldUnlock(String topicId, Graph g) {
  final before = GraphIndex(g);
  final current = before.byId[topicId];
  if (current == null || current.progress == Progress.known) return const [];

  final after = GraphIndex(Graph(
    topics: [
      for (final t in g.topics)
        if (t.id == topicId) t.copyWith(progress: Progress.known) else t,
    ],
    edges: g.edges,
  ));

  return [
    for (final t in g.topics)
      if (t.id != topicId && !isAvailable(t.id, before) && isAvailable(t.id, after)) t,
  ];
}

/// Would adding `from -> to` close a cycle?
///
/// Prerequisite graphs must stay acyclic; a cycle means a set of topics that can
/// never become available, and `topoOrder` gives up entirely. Callers must
/// reject the edge when this is true.
bool wouldCreateCycle(String from, String to, Graph g) {
  if (from == to) return true;
  final index = GraphIndex(g);
  // A cycle appears exactly when `to` can already reach `from`.
  final stack = <String>[to];
  final seen = <String>{};
  while (stack.isNotEmpty) {
    final cur = stack.removeLast();
    if (cur == from) return true;
    if (!seen.add(cur)) continue;
    for (final e in index.outgoing[cur] ?? const <Edge>[]) {
      stack.add(e.to);
    }
  }
  return false;
}

/// A stable teaching order (Kahn's algorithm), or null if the graph has a cycle.
///
/// Stability matters more than it looks: an unstable order would reshuffle a
/// roadmap between two reads of the same unchanged map. Ties are broken by the
/// original topic order, which both implementations preserve.
List<Topic>? topoOrder(Graph g) {
  final index = GraphIndex(g);
  final indegree = <String, int>{
    for (final t in g.topics) t.id: (index.incoming[t.id] ?? const <Edge>[]).length,
  };

  final queue = <Topic>[for (final t in g.topics) if (indegree[t.id] == 0) t];
  final out = <Topic>[];

  while (queue.isNotEmpty) {
    final t = queue.removeAt(0);
    out.add(t);
    for (final e in index.outgoing[t.id] ?? const <Edge>[]) {
      final next = (indegree[e.to] ?? 0) - 1;
      indegree[e.to] = next;
      if (next == 0) {
        final topic = index.byId[e.to];
        if (topic != null) queue.add(topic);
      }
    }
  }

  return out.length == g.topics.length ? out : null;
}

/// Share of the map already known, 0–100.
int progressPercent(List<Topic> topics) {
  if (topics.isEmpty) return 0;
  final known = topics.where((t) => t.progress == Progress.known).length;
  return ((known / topics.length) * 100).round();
}
