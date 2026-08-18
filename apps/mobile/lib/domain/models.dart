/// The domain, in Dart.
///
/// A deliberate near-transliteration of `packages/core/src/types.ts` — same
/// field names, same defaults, same wire shape. It reads a little un-Dartish in
/// places (`whyItMatters`, `linkedTopicIds`) and that is the point: these
/// records cross the sync relay to and from the TypeScript surfaces, so a
/// prettier local name would mean a mapping layer, and a mapping layer is one
/// more place for the two sides to disagree about what a record is.
///
/// Every record carries the sync envelope — `rev`, `updatedAt`, `deviceId` —
/// because the merge order in `merge.dart` is defined over exactly those three
/// fields and nothing else.
library;

enum Progress { notStarted, inProgress, known }

/// Wire names differ from Dart names (`not_started` vs `notStarted`), so the
/// mapping is explicit rather than relying on `.name`. A silent rename here
/// would make every synced topic look "not started" on the phone.
const _progressWire = {
  Progress.notStarted: 'not_started',
  Progress.inProgress: 'in_progress',
  Progress.known: 'known',
};

Progress progressFromWire(String? s) => switch (s) {
      'known' => Progress.known,
      'in_progress' => Progress.inProgress,
      _ => Progress.notStarted,
    };

String progressToWire(Progress p) => _progressWire[p]!;

/// Where a record came from. Drives colour and trust in the UI: an `ai` node is
/// something the app proposed and the user accepted, which is worth showing.
enum Origin { user, ai, roadmap, capture, guardian, import_ }

Origin originFromWire(String? s) => switch (s) {
      'ai' => Origin.ai,
      'roadmap' => Origin.roadmap,
      'capture' => Origin.capture,
      'guardian' => Origin.guardian,
      'import' => Origin.import_,
      _ => Origin.user,
    };

String originToWire(Origin o) => o == Origin.import_ ? 'import' : o.name;

/// Computed state, never stored. See `graph.dart` for the rule.
enum MapStatus { known, inProgress, available, locked }

/// The sync envelope. Anything mergeable implements this.
abstract interface class Versioned {
  String get id;
  int get rev;
  int get updatedAt;
  String get deviceId;
}

class Topic implements Versioned {
  const Topic({
    required this.id,
    required this.title,
    this.summary = '',
    this.whyItMatters = '',
    this.unlocks = '',
    this.progress = Progress.notStarted,
    this.origin = Origin.user,
    this.tags = const [],
    this.completedAt,
    this.createdAt = 0,
    this.updatedAt = 0,
    this.rev = 0,
    this.deviceId = '',
  });

  @override
  final String id;
  final String title;
  final String summary;

  /// Shown on every step, per the product spec — not an optional flourish.
  final String whyItMatters;
  final String unlocks;
  final Progress progress;
  final Origin origin;
  final List<String> tags;
  final int? completedAt;
  final int createdAt;
  @override
  final int updatedAt;
  @override
  final int rev;
  @override
  final String deviceId;

  Topic copyWith({
    String? title,
    String? summary,
    String? whyItMatters,
    String? unlocks,
    Progress? progress,
    Origin? origin,
    List<String>? tags,
    int? completedAt,
    int? updatedAt,
    int? rev,
    String? deviceId,
  }) =>
      Topic(
        id: id,
        title: title ?? this.title,
        summary: summary ?? this.summary,
        whyItMatters: whyItMatters ?? this.whyItMatters,
        unlocks: unlocks ?? this.unlocks,
        progress: progress ?? this.progress,
        origin: origin ?? this.origin,
        tags: tags ?? this.tags,
        completedAt: completedAt ?? this.completedAt,
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        rev: rev ?? this.rev,
        deviceId: deviceId ?? this.deviceId,
      );

  factory Topic.fromJson(Map<String, dynamic> j) => Topic(
        id: j['id'] as String,
        title: j['title'] as String? ?? '',
        summary: j['summary'] as String? ?? '',
        whyItMatters: j['whyItMatters'] as String? ?? '',
        unlocks: j['unlocks'] as String? ?? '',
        progress: progressFromWire(j['progress'] as String?),
        origin: originFromWire(j['origin'] as String?),
        tags: (j['tags'] as List?)?.cast<String>() ?? const [],
        completedAt: j['completedAt'] as int?,
        createdAt: j['createdAt'] as int? ?? 0,
        updatedAt: j['updatedAt'] as int? ?? 0,
        rev: j['rev'] as int? ?? 0,
        deviceId: j['deviceId'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'summary': summary,
        'whyItMatters': whyItMatters,
        'unlocks': unlocks,
        'progress': progressToWire(progress),
        'origin': originToWire(origin),
        'tags': tags,
        if (completedAt != null) 'completedAt': completedAt,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
        'rev': rev,
        'deviceId': deviceId,
      };
}

/// How strongly `from` blocks `to`.
///
/// The distinction is the heart of the unlock engine: `hard` gates, `soft`
/// informs ordering and must never lock anything. A port that collapses the two
/// shows a topic locked on the phone and open on the laptop.
enum EdgeStrength { hard, soft }

class Edge implements Versioned {
  const Edge({
    required this.id,
    required this.from,
    required this.to,
    this.strength = EdgeStrength.hard,
    this.origin = Origin.user,
    this.createdAt = 0,
    this.updatedAt = 0,
    this.rev = 0,
    this.deviceId = '',
  });

  @override
  final String id;

  /// The prerequisite.
  final String from;

  /// The topic that depends on it.
  final String to;
  final EdgeStrength strength;
  final Origin origin;
  final int createdAt;
  @override
  final int updatedAt;
  @override
  final int rev;
  @override
  final String deviceId;

  factory Edge.fromJson(Map<String, dynamic> j) => Edge(
        id: j['id'] as String,
        from: j['from'] as String,
        to: j['to'] as String,
        strength: j['strength'] == 'soft' ? EdgeStrength.soft : EdgeStrength.hard,
        origin: originFromWire(j['origin'] as String?),
        createdAt: j['createdAt'] as int? ?? 0,
        updatedAt: j['updatedAt'] as int? ?? 0,
        rev: j['rev'] as int? ?? 0,
        deviceId: j['deviceId'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'from': from,
        'to': to,
        'strength': strength.name,
        'origin': originToWire(origin),
        'createdAt': createdAt,
        'updatedAt': updatedAt,
        'rev': rev,
        'deviceId': deviceId,
      };
}

class Capture implements Versioned {
  const Capture({
    required this.id,
    required this.kind,
    this.title = '',
    this.url,
    this.text = '',
    this.linkedTopicIds = const [],
    this.createdAt = 0,
    this.updatedAt = 0,
    this.rev = 0,
    this.deviceId = '',
  });

  @override
  final String id;

  /// One of page, selection, clipboard, screenshot, note.
  final String kind;
  final String title;
  final String? url;
  final String text;
  final List<String> linkedTopicIds;
  final int createdAt;
  @override
  final int updatedAt;
  @override
  final int rev;
  @override
  final String deviceId;

  factory Capture.fromJson(Map<String, dynamic> j) => Capture(
        id: j['id'] as String,
        kind: j['kind'] as String? ?? 'note',
        title: j['title'] as String? ?? '',
        url: j['url'] as String?,
        text: j['text'] as String? ?? '',
        linkedTopicIds: (j['linkedTopicIds'] as List?)?.cast<String>() ?? const [],
        createdAt: j['createdAt'] as int? ?? 0,
        updatedAt: j['updatedAt'] as int? ?? 0,
        rev: j['rev'] as int? ?? 0,
        deviceId: j['deviceId'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'kind': kind,
        'title': title,
        if (url != null) 'url': url,
        'text': text,
        'linkedTopicIds': linkedTopicIds,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
        'rev': rev,
        'deviceId': deviceId,
      };
}

/// A delete, recorded so it can outlive the record it removed.
///
/// Without these a deleted topic reappears the moment a device that still has
/// it syncs — the peer sees a record it has and we don't, and helpfully sends
/// it back. That bug shipped once already on the TypeScript side.
class Tombstone implements Versioned {
  const Tombstone({
    required this.id,
    required this.collection,
    required this.rev,
    required this.deletedAt,
    this.deviceId = '',
  });

  @override
  final String id;
  final String collection;
  @override
  final int rev;
  final int deletedAt;
  @override
  final String deviceId;

  /// A tombstone's `updatedAt` *is* its `deletedAt` — that's what lets the one
  /// comparator in `merge.dart` order deletes against edits.
  @override
  int get updatedAt => deletedAt;

  factory Tombstone.fromJson(Map<String, dynamic> j) => Tombstone(
        id: j['id'] as String,
        collection: j['collection'] as String,
        rev: j['rev'] as int? ?? 0,
        deletedAt: j['deletedAt'] as int? ?? 0,
        deviceId: j['deviceId'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'collection': collection,
        'rev': rev,
        'deletedAt': deletedAt,
        'deviceId': deviceId,
      };
}
