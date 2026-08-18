/// Tests for the on-device matching.
///
/// Unlike `conformance_test.dart` these expectations are written by hand,
/// because `LocalMind` is a heuristic rather than a rule. There is no
/// "reference answer" to generate — what matters is that it fires on real
/// relationships and stays quiet on coincidences, and that is a judgement the
/// tests have to state.
library;

import 'package:abh/domain/graph.dart';
import 'package:abh/domain/models.dart';
import 'package:abh/mind/local_mind.dart';
import 'package:flutter_test/flutter_test.dart';

var _seq = 0;

Topic _topic(String title, {Progress progress = Progress.notStarted, int? createdAt}) {
  _seq++;
  return Topic(
    id: 't$_seq',
    title: title,
    progress: progress,
    createdAt: createdAt ?? 1000 + _seq,
    updatedAt: createdAt ?? 1000 + _seq,
  );
}

Capture _capture(String title, {List<String> linked = const []}) {
  _seq++;
  return Capture(
    id: 'c$_seq',
    kind: 'page',
    title: title,
    linkedTopicIds: linked,
    createdAt: 1000 + _seq,
    updatedAt: 1000 + _seq,
  );
}

Edge _edge(String from, String to) {
  _seq++;
  return Edge(id: 'e$_seq', from: from, to: to);
}

void main() {
  group('cleanTitle', () {
    test('strips site furniture', () {
      // Left in, the site name becomes a high-value term that links every page
      // saved from the same place — a false connection with a confident
      // explanation attached, which is the worst kind.
      expect(cleanTitle('Gradient descent explained | Medium'),
          'Gradient descent explained');
      expect(cleanTitle('Rotational motion - YouTube'), 'Rotational motion');
    });

    test('leaves an ordinary title alone and is idempotent', () {
      expect(cleanTitle('Plain note'), 'Plain note');
      expect(cleanTitle(cleanTitle('Thing | Medium')), 'Thing');
    });
  });

  group('terms', () {
    test('keeps Indic scripts intact', () {
      // Devanagari vowel signs are Unicode Marks. Excluded from the keep-set
      // they act as separators and shred the word — which would make the second
      // brain useless for exactly the students ABH is built for.
      expect(terms('गति और त्वरण'), contains('गति'));
    });

    test('keeps two-letter technical terms', () {
      // A three-character floor throws away the most meaningful terms on a
      // developer roadmap.
      expect(terms('ai and ml with js'), containsAll(<String>['ai', 'ml', 'js']));
    });

    test('folds plurals and gerunds onto one term', () {
      expect(terms('derivatives'), terms('derivative'));
      expect(terms('integrating'), terms('integrate'));
    });
  });

  group('connect', () {
    test('files a saved page against the topic it is about', () {
      final grad = _topic('Gradient descent');
      final photo = _topic('Photosynthesis');
      final capture = _capture('An intuitive guide to gradient descent | Medium');

      final links = LocalMind().connect(
        graph: Graph(topics: [grad, photo], edges: const []),
        captures: [capture],
      );

      final link = links.firstWhere((l) => l.kind == LinkKind.captureTopic);
      expect(link.fromId, capture.id);
      expect(link.toId, grad.id);
      // The reason names the actual words. "AI suggests this" is not a reason.
      expect(link.why, contains('gradient'));
    });

    test('stays quiet when nothing is related', () {
      // Being ignored is unrecoverable: a panel that proposes junk trains people
      // to dismiss it unread, and then it can never tell them anything again.
      final links = LocalMind().connect(
        graph: Graph(
          topics: [_topic('Photosynthesis'), _topic("Ohm's law")],
          edges: const [],
        ),
        captures: [_capture('Sourdough starter troubleshooting')],
      );
      expect(links, isEmpty);
    });

    test('leaves an already-filed capture alone', () {
      final grad = _topic('Gradient descent');
      final links = LocalMind().connect(
        graph: Graph(topics: [grad], edges: const []),
        captures: [_capture('Gradient descent explained', linked: [grad.id])],
      );
      expect(links.where((l) => l.kind == LinkKind.captureTopic), isEmpty);
    });

    test('attaches an orphan topic, oldest as the prerequisite', () {
      // An orphan is invisible to the unlock engine: nothing gates it and it
      // gates nothing, so it never surfaces as "available next".
      final algebra = _topic('Linear algebra', createdAt: 10);
      final eigen = _topic('Linear algebra eigenvectors', createdAt: 99);

      final links = LocalMind().connect(
        graph: Graph(topics: [algebra, eigen], edges: const []),
        captures: const [],
      );

      final link = links.firstWhere((l) => l.kind == LinkKind.topicTopic);
      expect(link.fromId, algebra.id);
      expect(link.toId, eigen.id);
    });

    test('proposes one direction per pair, never both', () {
      // Two orphans that are each other's best match reach the loop twice.
      // Offering A→B and B→A means offering an edge that is definitely wrong.
      final a = _topic('Linear algebra', createdAt: 10);
      final b = _topic('Linear algebra eigenvectors', createdAt: 99);
      final links = LocalMind()
          .connect(graph: Graph(topics: [a, b], edges: const []), captures: const [])
          .where((l) => l.kind == LinkKind.topicTopic);
      expect(links.length, 1);
    });

    test('what you already know becomes the prerequisite', () {
      final known = _topic('Calculus limits',
          progress: Progress.known, createdAt: 99);
      final later = _topic('Calculus limits and continuity', createdAt: 10);
      final links = LocalMind().connect(
        graph: Graph(topics: [known, later], edges: const []),
        captures: const [],
      );
      expect(links.firstWhere((l) => l.kind == LinkKind.topicTopic).fromId,
          known.id);
    });

    test('ignores topics that already have edges', () {
      final a = _topic('Linear algebra');
      final b = _topic('Linear algebra eigenvectors');
      final links = LocalMind().connect(
        graph: Graph(topics: [a, b], edges: [_edge(a.id, b.id)]),
        captures: const [],
      );
      expect(links.where((l) => l.kind == LinkKind.topicTopic), isEmpty);
    });
  });

  group('distil', () {
    test('matches an existing topic rather than inventing a duplicate', () {
      final grad = _topic('Gradient descent');
      final links = LocalMind().distil(
        capture: _capture('Gradient descent, step by step'),
        graph: Graph(topics: [grad], edges: const []),
      );
      expect(links.every((l) => l.kind == LinkKind.captureTopic), isTrue);
      expect(links.first.toId, grad.id);
    });

    test('never proposes a new topic AND a link to an existing one', () {
      // That combination is how a map ends up with "Backpropagation" and
      // "Backprop" as separate nodes that nothing ever merges.
      final links = LocalMind().distil(
        capture: _capture('Backpropagation explained'),
        graph: Graph(topics: [_topic('Backpropagation')], edges: const []),
      );
      expect(links.any((l) => l.kind == LinkKind.captureNewTopic), isFalse);
    });

    test('proposes a clean new topic when the map has nothing close', () {
      final links = LocalMind().distil(
        capture: _capture('Kubernetes operators in practice | Medium'),
        graph: Graph(topics: [_topic('Photosynthesis')], edges: const []),
      );
      expect(links.single.kind, LinkKind.captureNewTopic);
      // Site furniture must not survive into a node title.
      expect(links.single.draftTitle, 'Kubernetes operators in practice');
    });
  });
}
