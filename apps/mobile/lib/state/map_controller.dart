/// The reactive binding between Flutter and the repository.
///
/// The rule this file exists to enforce, copied from the web app because it was
/// learned the hard way there: **the UI never waits on I/O.**
///
/// Memory is authoritative for reads. It loads once, then stays current by
/// patching in the record each write returns — never by re-querying the
/// database. The web version originally re-exported everything after every
/// mutation, which read six tables and recomputed the whole graph just to learn
/// that one topic's progress had changed. That was the fluidity ceiling, and
/// it is a very easy ceiling to rebuild by accident.
///
/// A plain [ChangeNotifier] rather than a state-management package. There is
/// one store, it is not deeply nested, and adding Riverpod or Bloc here would
/// mean a reader has to learn a framework before they can learn the app.
library;

import 'package:flutter/widgets.dart';

import '../data/map_repository.dart';
import '../domain/graph.dart';
import '../domain/models.dart';

class MapController extends ChangeNotifier {
  MapController(this._repo) {
    _reload();
  }

  final MapRepository _repo;

  List<Topic> _topics = const [];
  List<Edge> _edges = const [];
  List<Capture> _captures = const [];
  Map<String, MapStatus> _statuses = const {};

  List<Topic> get topics => _topics;
  List<Edge> get edges => _edges;
  List<Capture> get captures => _captures;
  Map<String, MapStatus> get statuses => _statuses;

  Graph get graph => Graph(topics: _topics, edges: _edges);

  /// Everything open right now, hardest-earned first: a topic that unlocks more
  /// is worth surfacing above one that unlocks nothing.
  List<Topic> get availableNow {
    final index = GraphIndex(graph);
    final open = _topics.where((t) => isAvailable(t.id, index)).toList();
    open.sort((a, b) =>
        (index.outgoing[b.id]?.length ?? 0) - (index.outgoing[a.id]?.length ?? 0));
    return open;
  }

  int get percentKnown => progressPercent(_topics);

  /// The one full read, on startup. Everything after this is a patch.
  void _reload() {
    _topics = _repo.topics();
    _edges = _repo.edges();
    _captures = _repo.captures();
    _recomputeStatuses();
    notifyListeners();
  }

  /// Statuses are pure and O(V+E), so they recompute eagerly and only when the
  /// graph actually changed. Doing it in a widget's build would recompute once
  /// per subscriber, which is the same work several times per frame.
  void _recomputeStatuses() => _statuses = computeStatuses(graph);

  // ---- mutations -----------------------------------------------------------

  Topic addTopic(String title) {
    final t = _repo.addTopic(title: title);
    _topics = [..._topics, t];
    _recomputeStatuses();
    notifyListeners();
    return t;
  }

  /// Marks a topic known and reports what it opened up, so the caller can
  /// celebrate. Repaints from memory; the write is already done synchronously
  /// by sqlite, so there is nothing to be optimistic about.
  List<Topic> complete(String id) {
    final result = _repo.setProgress(id, Progress.known);
    _replaceTopic(result.topic);
    return result.unlocked;
  }

  void setProgress(String id, Progress p) =>
      _replaceTopic(_repo.setProgress(id, p).topic);

  void _replaceTopic(Topic t) {
    _topics = [
      for (final existing in _topics) if (existing.id == t.id) t else existing,
    ];
    _recomputeStatuses();
    notifyListeners();
  }

  Capture addCapture({required String kind, String title = '', String? url, String text = ''}) {
    final c = _repo.addCapture(kind: kind, title: title, url: url, text: text);
    // Newest first, matching the query's ORDER BY — so the in-memory list and a
    // reload agree. A list that reorders itself on restart looks like data loss.
    _captures = [c, ..._captures];
    notifyListeners();
    return c;
  }

  void linkCapture(String captureId, String topicId) {
    final updated = _repo.linkCapture(captureId, topicId);
    if (updated == null) return;
    _captures = [
      for (final c in _captures) if (c.id == updated.id) updated else c,
    ];
    notifyListeners();
  }

  Edge? addEdge(String from, String to, {EdgeStrength strength = EdgeStrength.hard}) {
    final e = _repo.addEdge(from, to, strength: strength);
    if (e == null) return null;
    _edges = [..._edges, e];
    _recomputeStatuses();
    notifyListeners();
    return e;
  }
}

/// Puts the controller in the tree without a package.
///
/// [InheritedNotifier] is exactly the widget for this: it subscribes dependents
/// to the notifier and rebuilds them when it fires, which is the whole feature
/// most state-management packages are bought for.
class MapScope extends InheritedNotifier<MapController> {
  const MapScope({super.key, required MapController controller, required super.child})
      : super(notifier: controller);

  static MapController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<MapScope>();
    assert(scope != null, 'No MapScope in the tree.');
    return scope!.notifier!;
  }
}
