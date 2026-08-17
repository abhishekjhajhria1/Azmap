/// People — the guardian.
///
/// Someone who shapes your plan, signs off your work, and is told when you
/// slip. It is one of the three pillars, and it is the one that needs
/// cross-*account* sharing rather than cross-device sync: a guardian is a
/// different person, not another phone.
///
/// The relay doesn't do that yet, so this screen says so plainly instead of
/// showing a fake avatar and an invented streak. A preview that pretends to
/// work is worse than an honest gap — the first person to tap "invite" and
/// have nothing happen stops trusting the rest of the app too.
library;

import 'package:flutter/widgets.dart';

import '../design/survey.dart';
import '../design/tokens.dart';
import '../domain/models.dart';
import '../state/map_controller.dart';

class PeopleSpace extends StatelessWidget {
  const PeopleSpace({super.key});

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final map = MapScope.of(context);

    final known = map.topics.where((t) => t.progress == Progress.known).toList()
      ..sort((a, b) => (b.completedAt ?? 0).compareTo(a.completedAt ?? 0));

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 22),
      children: [
        Text('PEOPLE', style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
        const SizedBox(height: 10),
        Text('Nobody is watching yet.',
            style: AbhText.title1.copyWith(color: c.fg)),
        const SizedBox(height: 10),
        Text(
          'A guardian shapes your plan, signs off what you finish, and hears '
          'about it when you slip. Inviting one needs account-to-account '
          "sharing, which isn't built yet — this is what they'd see.",
          style: AbhText.body.copyWith(color: c.fgMuted),
        ),

        const SizedBox(height: 28),
        Row(
          children: [
            Text('WHAT THEY WOULD SEE',
                style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
            const Spacer(),
            Text('${map.percentKnown}% known',
                style: AbhText.foot.copyWith(color: c.fgSubtle)),
          ],
        ),
        const SizedBox(height: 10),

        if (known.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 22),
            child: Text('Nothing finished yet.',
                style: AbhText.body.copyWith(color: c.fgMuted)),
          )
        else
          Stacked(
            children: [
              for (final t in known.take(12))
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(t.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AbhText.body.copyWith(color: c.fg)),
                      ),
                      Text('done',
                          style: AbhText.foot.copyWith(color: c.known)),
                    ],
                  ),
                ),
            ],
          ),
      ],
    );
  }
}
