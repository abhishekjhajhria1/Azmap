/// Tests for the preference model.
///
/// The interesting cases are all about *upgrade*. A serialisation bug here
/// doesn't crash — it silently resets somebody's setup to defaults on the first
/// launch after an update, which is the kind of thing people report as "the app
/// forgot me" and nobody can reproduce.
library;

import 'dart:convert';

import 'package:abh/design/tokens.dart';
import 'package:abh/prefs/preferences.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('serialisation', () {
    test('round-trips every field', () {
      const original = Preferences(
        density: Density.compact,
        guidance: Guidance.quiet,
        progressStyle: ProgressStyle.none,
        homeSpace: HomeSpace.brain,
        theme: ThemeChoice.dark,
        dock: DockPosition.top,
        accent: AccentChoice.rose,
        reduceMotion: true,
        showGround: false,
        onboarded: true,
        name: 'Ada',
      );

      final restored =
          Preferences.fromJson(jsonDecode(jsonEncode(original.toJson())));

      expect(restored.density, Density.compact);
      expect(restored.guidance, Guidance.quiet);
      expect(restored.progressStyle, ProgressStyle.none);
      expect(restored.homeSpace, HomeSpace.brain);
      expect(restored.theme, ThemeChoice.dark);
      expect(restored.dock, DockPosition.top);
      expect(restored.accent, AccentChoice.rose);
      expect(restored.reduceMotion, isTrue);
      expect(restored.showGround, isFalse);
      expect(restored.onboarded, isTrue);
      expect(restored.name, 'Ada');
    });

    test('a blob from an older build keeps what it had', () {
      // The upgrade path. Fields written before this version survive; fields
      // added since arrive at their defaults. A version that threw — or reset
      // everything — would wipe a person's setup on update.
      final old = <String, dynamic>{
        'density': 'compact',
        'onboarded': true,
        // no guidance, progressStyle, accent, dock, theme…
      };
      final p = Preferences.fromJson(old);

      expect(p.density, Density.compact, reason: 'stored value survives');
      expect(p.onboarded, isTrue, reason: 'stored value survives');
      expect(p.guidance, Guidance.full, reason: 'missing field defaults');
      expect(p.accent, AccentChoice.blue, reason: 'missing field defaults');
    });

    test('an unknown enum value falls back instead of throwing', () {
      // A downgrade, or a hand-edited file. `Density.values.byName` would throw
      // here and take the launch with it.
      final p = Preferences.fromJson(<String, dynamic>{
        'density': 'gigantic',
        'accent': 'chartreuse',
        'theme': 42,
      });
      expect(p.density, Density.comfortable);
      expect(p.accent, AccentChoice.blue);
      expect(p.theme, ThemeChoice.system);
    });

    test('onboarded defaults to false, so a fresh install gets setup', () {
      expect(const Preferences().onboarded, isFalse);
      expect(Preferences.fromJson(const {}).onboarded, isFalse);
    });
  });

  group('copyWith', () {
    test('changes one field and leaves the rest', () {
      const base = Preferences(density: Density.compact, onboarded: true);
      final next = base.copyWith(accent: AccentChoice.green);
      expect(next.accent, AccentChoice.green);
      expect(next.density, Density.compact);
      expect(next.onboarded, isTrue);
    });

    test('can turn a bool off', () {
      // The classic `??` bug: a null-coalescing copyWith can set true but never
      // back to false, so "Reduce motion" would be a one-way switch.
      const base = Preferences(showGround: true);
      expect(base.copyWith(showGround: false).showGround, isFalse);
    });
  });

  group('accents', () {
    test('every choice resolves to a different colour per theme', () {
      // The same hex that reads as confident on white is muddy on near-black,
      // which is why each accent is a pair rather than one colour used twice.
      for (final choice in AccentChoice.values) {
        expect(choice.resolve(true), isNot(choice.resolve(false)),
            reason: '${choice.name} should differ between themes');
      }
    });

    test('withAccent moves `available` too but never `known` or `ai`', () {
      // `available` is the same semantic as the accent — "open to you now".
      // Leaving it blue while the accent went green puts two unrelated blues on
      // the map. `known` and `ai` are meanings, not decoration.
      const base = AbhColors.dark;
      final green = base.withAccent(AccentChoice.green.resolve(true));
      expect(green.accent, AccentChoice.green.resolve(true));
      expect(green.available, green.accent);
      expect(green.known, base.known);
      expect(green.ai, base.ai);
    });
  });

  group('metrics', () {
    test('compact is tighter than comfortable everywhere it should be', () {
      expect(Metrics.compact.rowPadV, lessThan(Metrics.comfortable.rowPadV));
      expect(Metrics.compact.gap, lessThan(Metrics.comfortable.gap));
      expect(Metrics.compact.sectionGap,
          lessThan(Metrics.comfortable.sectionGap));
      expect(Metrics.compact.textScale, lessThan(1.0));
    });

    test('the tap-target floor is not a function of density', () {
      // The load-bearing rule: a compact mode that shrinks hit areas is a
      // compact mode that misses. 44 is the Apple HIG minimum and Android's
      // 48dp is close enough that one number serves both.
      expect(Metrics.tapTarget, greaterThanOrEqualTo(44));
    });
  });
}
