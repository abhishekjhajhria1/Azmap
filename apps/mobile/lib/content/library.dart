/// The roadmaps and guides, loaded from a generated asset.
///
/// Content is *data*, so it has one home — `packages/core/src/roadmaps/defs/`
/// — and `pnpm --filter @abh/core content` writes it here. Hand-translating 305
/// topic seeds into Dart would guarantee the phone and the web app disagree
/// about a syllabus within a month, and nobody would notice until a student
/// revised the wrong chapter.
///
/// Loaded once, lazily, on first use. A 70KB parse is nothing, but doing it
/// during app startup delays the first frame for a screen most launches never
/// reach.
library;

import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

/// Bumped in the generator when the shape changes, so a stale asset fails
/// loudly here rather than quietly serving last month's syllabus.
const contentVersion = 1;

/// A section of a long roadmap. Purely presentational — prerequisites still
/// come from `needs`, so a unit never implies an ordering the graph lacks.
class RoadmapUnit {
  const RoadmapUnit({required this.id, required this.title, this.note});
  final String id;
  final String title;
  final String? note;

  factory RoadmapUnit.fromJson(Map<String, dynamic> j) => RoadmapUnit(
        id: j['id'] as String,
        title: j['title'] as String,
        note: j['note'] as String?,
      );
}

class TopicSeed {
  const TopicSeed({
    required this.id,
    required this.title,
    this.why = '',
    this.domain = '',
    this.needs = const [],
    this.unit,
    this.weight,
    this.progress,
  });

  /// Semantic id, unique within its roadmap. Namespaced when started.
  final String id;
  final String title;
  final String why;
  final String domain;

  /// Prerequisite seed ids inside the same roadmap.
  final List<String> needs;
  final String? unit;

  /// Rough share of the exam, 1–5. Coarse on purpose: per-topic mark counts
  /// vary by year and precision here would be a lie with decimal places.
  final int? weight;
  final String? progress;

  factory TopicSeed.fromJson(Map<String, dynamic> j) => TopicSeed(
        id: j['id'] as String,
        title: j['title'] as String,
        why: j['why'] as String? ?? '',
        domain: j['domain'] as String? ?? '',
        needs: (j['needs'] as List?)?.cast<String>() ?? const [],
        unit: j['unit'] as String?,
        weight: j['weight'] as int?,
        progress: j['progress'] as String?,
      );
}

/// A syllabus and a career path want different framing — "9 to go" is right for
/// one and faintly absurd for the other — so surfaces branch on this rather
/// than guessing from the topic count.
enum RoadmapKind { skill, exam }

class RoadmapDef {
  const RoadmapDef({
    required this.id,
    required this.title,
    required this.goal,
    required this.blurb,
    required this.kind,
    required this.path,
    this.units = const [],
    this.branches = const [],
    this.guideId,
  });

  final String id;
  final String title;
  final String goal;
  final String blurb;
  final RoadmapKind kind;
  final List<RoadmapUnit> units;

  /// The prerequisite path you follow.
  final List<TopicSeed> path;

  /// Side-quests offered once their prerequisites are cleared.
  final List<TopicSeed> branches;
  final String? guideId;

  factory RoadmapDef.fromJson(Map<String, dynamic> j) => RoadmapDef(
        id: j['id'] as String,
        title: j['title'] as String,
        goal: j['goal'] as String? ?? '',
        blurb: j['blurb'] as String? ?? '',
        kind: j['kind'] == 'exam' ? RoadmapKind.exam : RoadmapKind.skill,
        units: [
          for (final u in (j['units'] as List? ?? const []))
            RoadmapUnit.fromJson((u as Map).cast<String, dynamic>()),
        ],
        path: [
          for (final s in (j['path'] as List? ?? const []))
            TopicSeed.fromJson((s as Map).cast<String, dynamic>()),
        ],
        branches: [
          for (final s in (j['branches'] as List? ?? const []))
            TopicSeed.fromJson((s as Map).cast<String, dynamic>()),
        ],
        guideId: j['guideId'] as String?,
      );
}

class GuideSection {
  const GuideSection({required this.id, required this.title, required this.body});
  final String id;
  final String title;

  /// Markdown-lite: blank-line paragraphs, `- ` bullets, `**bold**`. Not full
  /// Markdown, so no surface ever needs a parser dependency to show a guide.
  final String body;

  factory GuideSection.fromJson(Map<String, dynamic> j) => GuideSection(
        id: j['id'] as String,
        title: j['title'] as String,
        body: j['body'] as String? ?? '',
      );
}

class Guide {
  const Guide({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.sections,
    this.caveat,
  });

  final String id;
  final String title;
  final String subtitle;

  /// Shown prominently, never as a footnote. Syllabi change yearly; a guide
  /// that doesn't say so is worse than no guide.
  final String? caveat;
  final List<GuideSection> sections;

  factory Guide.fromJson(Map<String, dynamic> j) => Guide(
        id: j['id'] as String,
        title: j['title'] as String,
        subtitle: j['subtitle'] as String? ?? '',
        caveat: j['caveat'] as String?,
        sections: [
          for (final s in (j['sections'] as List? ?? const []))
            GuideSection.fromJson((s as Map).cast<String, dynamic>()),
        ],
      );
}

class ContentLibrary {
  const ContentLibrary({required this.roadmaps, required this.guides});

  final List<RoadmapDef> roadmaps;
  final List<Guide> guides;

  List<RoadmapDef> get skills =>
      roadmaps.where((r) => r.kind == RoadmapKind.skill).toList();
  List<RoadmapDef> get exams =>
      roadmaps.where((r) => r.kind == RoadmapKind.exam).toList();

  RoadmapDef? roadmap(String id) {
    for (final r in roadmaps) {
      if (r.id == id) return r;
    }
    return null;
  }

  Guide? guide(String? id) {
    if (id == null) return null;
    for (final g in guides) {
      if (g.id == id) return g;
    }
    return null;
  }

  static ContentLibrary? _cached;

  /// Loaded once per process. Cached because a roadmap picker that re-parses
  /// 70KB every time it rebuilds is a jank source with no upside.
  static Future<ContentLibrary> load() async {
    final cached = _cached;
    if (cached != null) return cached;

    final raw = await rootBundle.loadString('assets/content.json');
    final json = jsonDecode(raw) as Map<String, dynamic>;

    if (json['version'] != contentVersion) {
      throw StateError(
        'content.json is version ${json['version']}, this build expects '
        '$contentVersion. Regenerate with: pnpm --filter @abh/core content',
      );
    }

    return _cached = ContentLibrary(
      roadmaps: [
        for (final r in (json['roadmaps'] as List))
          RoadmapDef.fromJson((r as Map).cast<String, dynamic>()),
      ],
      guides: [
        for (final g in (json['guides'] as List))
          Guide.fromJson((g as Map).cast<String, dynamic>()),
      ],
    );
  }
}

/// Global node id for a roadmap seed.
///
/// Namespaced so two roadmaps never collide in the one graph — a second brain
/// holding both JEE and web development must not merge "arrays" from each.
/// Identical to `roadmapNodeId` in `@abh/core`, and it has to stay identical:
/// these ids cross the sync relay to the web app.
String roadmapNodeId(String roadmapId, String seedId) =>
    '${roadmapId}__$seedId';
