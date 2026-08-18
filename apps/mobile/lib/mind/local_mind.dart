/// The second brain, working before any AI exists.
///
/// A port of `packages/core/src/mind/` — the three capabilities that turn out
/// not to need a model. It runs offline, costs a millisecond, and explains
/// itself in the user's own words.
///
/// ## Why term overlap is weighted, not counted
///
/// Because raw overlap answers "everything is related to everything". A learner
/// studying for JEE has "physics" in forty titles; two notes sharing it tells
/// you nothing. Two notes sharing "rotational" tells you a lot. Counting ranks
/// the first pair above the second, which is exactly backwards.
///
/// So terms are weighted by how *unusual* they are in this user's own corpus,
/// which adapts on its own: for the JEE learner "physics" is worthless and
/// "hydrolysis" is gold; for someone mapping cooking it's the reverse, and
/// nobody has to maintain a per-domain dictionary.
///
/// Nothing here writes. Everything is a proposal — "AI proposes, you accept" is
/// the product's oldest rule, and it holds when the AI is arithmetic too.
library;

import 'dart:math' as math;

import '../domain/graph.dart';
import '../domain/models.dart';

enum LinkKind { captureTopic, topicTopic, captureNewTopic }

/// A link that ought to exist. One shape covers all three cases because they
/// are the same claim — "these two things belong together" — differing only in
/// what sits at each end.
class ProposedLink {
  const ProposedLink({
    required this.kind,
    required this.fromId,
    required this.toId,
    required this.why,
    required this.confidence,
    this.draftTitle = '',
  });

  final LinkKind kind;
  final String fromId;
  final String toId;

  /// Plain-language reason, shown verbatim. Not decoration: an unexplained
  /// suggestion is one the user has to audit themselves.
  final String why;

  /// 0–1, for ranking only. Never shown — it is not a probability.
  final double confidence;

  /// Set only for [LinkKind.captureNewTopic].
  final String draftTitle;

  /// Identity independent of the wording or score, so a dismissal survives a
  /// recompute that phrases the same suggestion differently.
  String get key => '$kind:$fromId:$toId:$draftTitle';

  String headline(List<Topic> topics, List<Capture> captures) {
    // Written out rather than `firstOrNull`, which lives in package:collection
    // and not dart:core — an easy import to be missing on someone else's setup.
    String titleOf(String id) {
      for (final t in topics) {
        if (t.id == id) return t.title;
      }
      return '';
    }

    String captureTitle(String id) {
      for (final c in captures) {
        if (c.id == id) return c.title;
      }
      return '';
    }

    return switch (kind) {
      LinkKind.captureNewTopic => 'Add “$draftTitle” to your map',
      LinkKind.captureTopic =>
        'File “${_truncate(captureTitle(fromId))}” under ${titleOf(toId)}',
      LinkKind.topicTopic => 'Link ${titleOf(fromId)} → ${titleOf(toId)}',
    };
  }
}

class LocalMind {
  /// Below this, shared words are coincidence.
  static const _floor = 0.14;

  /// Finds links that ought to exist and don't.
  ///
  /// Two passes, in order of how much they're worth:
  ///
  ///   1. Captures about a topic already on the map but not linked to it. The
  ///      pile that grows every day and never gets filed — and the user already
  ///      told us they cared by saving it.
  ///   2. Topics with no edges at all. An orphan is invisible to the unlock
  ///      engine: nothing gates it and it gates nothing, so it never appears as
  ///      "available next" and quietly falls out of the product.
  ///
  /// The threshold matters more than it looks. A panel that proposes forty weak
  /// links trains people to dismiss it unread, and after that it can never tell
  /// them anything again. Under-proposing is recoverable; being ignored is not.
  List<ProposedLink> connect({
    required Graph graph,
    required List<Capture> captures,
    int limit = 6,
  }) {
    final weights = _TermWeights([
      ...graph.topics.map(_topicText),
      ...captures.map(_captureText),
    ]);
    final out = <ProposedLink>[];

    for (final capture in captures) {
      final text = _captureText(capture);
      if (text.isEmpty) continue;
      final best = _bestTopic(text, graph.topics, weights,
          (t) => !capture.linkedTopicIds.contains(t.id));
      if (best == null || best.score < _floor) continue;
      out.add(ProposedLink(
        kind: LinkKind.captureTopic,
        fromId: capture.id,
        toId: best.topic.id,
        why: 'Your note shares ${_phrase(best.shared)} with ${best.topic.title}.',
        confidence: _clamp(best.score),
      ));
    }

    final index = GraphIndex(graph);
    // Keyed by unordered pair: when two orphans are each other's best match the
    // loop reaches the pair twice, and proposing both A→B and B→A means offering
    // two edges one of which is definitely wrong.
    final pairs = <String, _Match>{};

    for (final t in graph.topics) {
      final attached = (index.incoming[t.id]?.length ?? 0) +
          (index.outgoing[t.id]?.length ?? 0);
      if (attached > 0) continue;

      final best =
          _bestTopic(_topicText(t), graph.topics, weights, (o) => o.id != t.id);
      if (best == null || best.score < _floor) continue;

      final key = ([t.id, best.topic.id]..sort()).join('~');
      final existing = pairs[key];
      if (existing == null || best.score > existing.score) {
        pairs[key] = _Match(t, best.topic, best.score, best.shared);
      }
    }

    for (final m in pairs.values) {
      final (from, to) = _orderPrerequisite(m.a, m.b);
      if (wouldCreateCycle(from.id, to.id, graph)) continue;
      out.add(ProposedLink(
        kind: LinkKind.topicTopic,
        fromId: from.id,
        toId: to.id,
        why: '${to.title} is on your map but connected to nothing. '
            'It shares ${_phrase(m.shared)} with ${from.title}.',
        // A structural guess, so slightly hedged against a direct text match.
        confidence: _clamp(m.score * 0.9),
      ));
    }

    out.sort((a, b) => b.confidence.compareTo(a.confidence));
    return out.take(limit).toList();
  }

  /// One capture, filed properly: matching topics if there are any, otherwise a
  /// new one from the cleaned title.
  ///
  /// The either/or matters. Proposing a new node *and* a link to an existing one
  /// is how a map ends up with "Backpropagation" and "Backprop" as separate
  /// nodes with separate prerequisites, and nothing ever merges them again.
  List<ProposedLink> distil({required Capture capture, required Graph graph}) {
    final text = _captureText(capture);
    if (text.isEmpty) return const [];

    final weights = _TermWeights(
        [...graph.topics.map(_topicText), _captureText(capture)]);

    final matches = <_Scored>[];
    for (final t in graph.topics) {
      if (capture.linkedTopicIds.contains(t.id)) continue;
      final r = weights.similarity(text, _topicText(t));
      if (r.score >= _floor) matches.add(_Scored(t, r.score, r.shared));
    }
    matches.sort((a, b) => b.score.compareTo(a.score));

    if (matches.isNotEmpty) {
      return [
        for (final m in matches.take(3))
          ProposedLink(
            kind: LinkKind.captureTopic,
            fromId: capture.id,
            toId: m.topic.id,
            why: 'Shares ${_phrase(m.shared)} with ${m.topic.title}.',
            confidence: _clamp(m.score),
          ),
      ];
    }

    final title = cleanTitle(capture.title);
    if (title.isEmpty) return const [];
    return [
      ProposedLink(
        kind: LinkKind.captureNewTopic,
        fromId: capture.id,
        toId: '',
        draftTitle: title,
        why: 'Nothing on your map covers this yet.',
        confidence: 0.35,
      ),
    ];
  }
}

// ---------------------------------------------------------------------------
// scoring
// ---------------------------------------------------------------------------

class _Match {
  const _Match(this.a, this.b, this.score, this.shared);
  final Topic a;
  final Topic b;
  final double score;
  final List<String> shared;
}

class _Scored {
  const _Scored(this.topic, this.score, this.shared);
  final Topic topic;
  final double score;
  final List<String> shared;
}

/// Which of two topics is the prerequisite.
///
/// Symmetric by construction — swapping the arguments returns the same pair —
/// which is what stops the caller proposing both directions for one pair.
(Topic, Topic) _orderPrerequisite(Topic a, Topic b) {
  final aKnown = a.progress == Progress.known;
  final bKnown = b.progress == Progress.known;
  if (aKnown != bKnown) return aKnown ? (a, b) : (b, a);
  if (a.createdAt != b.createdAt) {
    return a.createdAt < b.createdAt ? (a, b) : (b, a);
  }
  // Last resort, so the output is deterministic rather than hash-ordered.
  return a.id.compareTo(b.id) < 0 ? (a, b) : (b, a);
}

_Scored? _bestTopic(String text, List<Topic> topics, _TermWeights weights,
    bool Function(Topic) keep) {
  _Scored? best;
  for (final t in topics) {
    if (!keep(t)) continue;
    final r = weights.similarity(text, _topicText(t));
    if (best == null || r.score > best.score) {
      best = _Scored(t, r.score, r.shared);
    }
  }
  return best;
}

String _topicText(Topic t) => '${t.title} ${t.summary} ${t.tags.join(' ')}'.trim();

/// Body text is truncated deliberately. Given enough words *something* always
/// matches, so the title and opening — what the piece is actually about — get
/// to dominate.
String _captureText(Capture c) {
  final body = c.text.length > 600 ? c.text.substring(0, 600) : c.text;
  return '${cleanTitle(c.title)} $body'.trim();
}

/// Structural words only. Everything domain-specific is left to the weighting,
/// which is better at it than a list could ever be.
const _structural = {
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this',
  'these', 'those', 'of', 'in', 'on', 'at', 'to', 'for', 'from', 'by', 'with',
  'into', 'onto', 'about', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
  'do', 'does', 'did', 'have', 'has', 'had', 'can', 'could', 'will', 'would',
  'should', 'may', 'might', 'must', 'it', 'its', 'you', 'your', 'we', 'our',
  'they', 'their', 'i', 'my', 'me', 'not', 'no', 'yes', 'how', 'what', 'why',
  'when', 'where', 'which', 'who', 'all', 'any', 'some', 'each', 'every',
  'more', 'most', 'other', 'such', 'own', 'same', 'so', 'too', 'very', 'just',
  'up', 'out', 'down', 'over', 'under', 'again', 'once', 'here', 'there',
  'one', 'two', 'part', 'intro', 'introduction', 'guide', 'tutorial', 'basics',
};

final _siteSuffix = RegExp(
  r'\s*[|–—\-·:]\s*(youtube|medium|wikipedia|github|stack overflow|substack|'
  r"dev\.to|hacker news|reddit|x|twitter|linkedin|arxiv|nature|bbc|"
  r"freecodecamp|geeksforgeeks|khan academy|byju'?s|vedantu|physics wallah|"
  r'unacademy)\s*$',
  caseSensitive: false,
);

/// Strips site furniture: a capture is usually "Real thing — Site Name", and
/// the site name would otherwise become a high-value term linking every page
/// saved from the same place. That's a false connection with a confident
/// explanation attached, which is the worst kind.
String cleanTitle(String raw) {
  var out = raw.trim();
  // Twice: "Thing - Blog | Medium" is common enough to be worth a second pass.
  for (var i = 0; i < 2; i++) {
    out = out.replaceAll(_siteSuffix, '').trim();
  }
  return out.replaceAll(RegExp(r'\s+'), ' ');
}

/// Splits text into comparable terms.
///
/// `\p{M}` is in the keep-set alongside letters and digits, and that is
/// load-bearing: Devanagari and Bengali vowel signs (ि, ा, ্) are Unicode
/// *Marks*, not Letters. Leaving them out doesn't lose an accent — it makes
/// them act as separators, so "गति" shreds into "गत". ABH is built for Indian
/// exam students first.
///
/// Known limit: scripts written without spaces (Chinese, Japanese, Thai) come
/// out as one token per run. Fixing that needs a real segmenter.
List<String> terms(String text) {
  final out = <String>[];
  for (final raw in text.toLowerCase().split(RegExp(r'[^\p{L}\p{N}\p{M}+#]+', unicode: true))) {
    // Two, not three: three discards "ai", "ml", "js", "go", "c#" — the most
    // meaningful terms on a developer roadmap. Short English function words are
    // handled by _structural, which is the right tool for them.
    if (raw.length < 2) continue;
    if (_structural.contains(raw)) continue;
    out.add(_stem(raw));
  }
  return out;
}

/// Crude suffix folding, not a real stemmer.
///
/// The trailing-`e` strip is what makes the pairs line up: "integrating" →
/// `integrat` and "integrate" → `integrat`. `-es` only collapses after a
/// sibilant, because the naive rule turns "derivatives" into "derivativ" and
/// "derivative" into "derivative" — the two words that most need to match, not
/// matching.
String _stem(String w) {
  var s = w;
  if (s.length > 5 && s.endsWith('ing')) {
    s = s.substring(0, s.length - 3);
  } else if (s.length > 4 && RegExp(r'(s|x|z|ch|sh)es$').hasMatch(s)) {
    s = s.substring(0, s.length - 2);
  } else if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) {
    s = s.substring(0, s.length - 1);
  }
  if (s.length > 4 && s.endsWith('e')) s = s.substring(0, s.length - 1);
  return s;
}

class _Similarity {
  const _Similarity(this.score, this.shared);
  final double score;
  final List<String> shared;
}

/// Term weights over a corpus: rarer in *these* documents means more meaningful.
class _TermWeights {
  _TermWeights(List<String> documents) : _n = math.max(1, documents.length) {
    for (final doc in documents) {
      for (final t in terms(doc).toSet()) {
        _df[t] = (_df[t] ?? 0) + 1;
      }
    }
  }

  final Map<String, int> _df = {};
  final int _n;

  /// Smoothed, so a term in every document scores near zero rather than exactly
  /// zero — which matters on a five-node map where every term is in most of them.
  double weight(String term) => math.log(1 + _n / (1 + (_df[term] ?? 0)));

  /// How strongly two texts are about the same thing, 0 to 1.
  ///
  /// [_Similarity.shared] comes back with the score because the explanation is
  /// built from it. Reconstructing it in a second pass would let the sentence
  /// disagree with the number it's explaining.
  _Similarity similarity(String a, String b) {
    final ta = terms(a).toSet();
    final tb = terms(b).toSet();
    if (ta.isEmpty || tb.isEmpty) return const _Similarity(0, []);

    var intersection = 0.0;
    var union = 0.0;
    final shared = <MapEntry<String, double>>[];

    for (final t in ta) {
      final w = weight(t);
      union += w;
      if (tb.contains(t)) {
        intersection += w;
        shared.add(MapEntry(t, w));
      }
    }
    for (final t in tb) {
      if (!ta.contains(t)) union += weight(t);
    }

    shared.sort((x, y) => y.value.compareTo(x.value));
    return _Similarity(
      union == 0 ? 0 : intersection / union,
      shared.map((e) => e.key).toList(),
    );
  }
}

/// "shares “gradient” and “descent”" — the sentence a proposal is judged on.
String _phrase(List<String> shared, [int max = 3]) {
  final picked = shared.take(max).toList();
  if (picked.isEmpty) return '';
  if (picked.length == 1) return '“${picked.first}”';
  final head = picked.sublist(0, picked.length - 1).map((t) => '“$t”').join(', ');
  return '$head and “${picked.last}”';
}

/// Capture titles are whole sentences; a row is one line. Truncate for the
/// headline only — the stored title stays intact.
String _truncate(String s, [int max = 42]) =>
    s.length > max ? '${s.substring(0, max - 1)}…' : s;

double _clamp(double n) {
  final scaled = n < 0.3 ? n * 2 : 0.6 + n * 0.4;
  return math.max(0, math.min(1, scaled));
}
