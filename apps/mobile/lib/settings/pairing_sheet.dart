/// Pairing — joining this phone to a map that already exists.
///
/// ## Why a pasted link and not a QR scanner
///
/// A scanner needs a camera package, a permission prompt, and a privacy policy
/// line about camera access — for a flow most people run once. The pairing link
/// already contains everything, and every phone can receive a link.
///
/// The link's shape is what makes this safe:
///
///     https://relay.example/pair#code=ABC123&key=<account key>
///
/// Everything after `#` is a **fragment**, and browsers never transmit
/// fragments to a server. So the relay hands out a device token while remaining
/// physically unable to read a single record — the key travels device to device
/// and never touches the wire.
///
/// That also means the honest warning at the bottom of this screen is true:
/// there is no password reset, and there cannot be one. Nobody has the key.
library;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../design/controls.dart';
import '../design/layout.dart';
import '../design/tokens.dart';
import '../sync/sync_client.dart';
import '../sync/sync_controller.dart';

class PairingSheet extends StatefulWidget {
  const PairingSheet({super.key, required this.onClose});

  final VoidCallback onClose;

  @override
  State<PairingSheet> createState() => _PairingSheetState();
}

class _PairingSheetState extends State<PairingSheet> {
  final _field = TextEditingController();
  final _focus = FocusNode();
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _field.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _field.dispose();
    _focus.dispose();
    super.dispose();
  }

  /// Pulls endpoint, code and key out of a pairing link.
  ///
  /// Tolerant on purpose: people paste links with trailing spaces, with the
  /// scheme missing, or wrapped in quotes by a chat app. Refusing those is
  /// technically correct and practically hostile.
  ({String endpoint, String code, String key})? _parse(String raw) {
    final text = raw.trim().replaceAll(RegExp(r'^["“”\s]+|["“”\s]+$'), '');
    final uri = Uri.tryParse(text.contains('://') ? text : 'https://$text');
    if (uri == null || uri.host.isEmpty) return null;

    // The fragment is the whole point — parse it, never the query.
    final parts = Uri.splitQueryString(uri.fragment);
    final code = parts['code'];
    final key = parts['key'];
    if (code == null || key == null || code.isEmpty || key.isEmpty) return null;

    return (
      endpoint: '${uri.scheme}://${uri.authority}',
      code: code,
      key: key,
    );
  }

  Future<void> _pair() async {
    final parsed = _parse(_field.text);
    if (parsed == null) {
      setState(() => _error =
          "That doesn't look like a pairing link. Copy the whole thing, "
          'including the part after the #.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await SyncScope.of(context).pair(
        endpoint: parsed.endpoint,
        code: parsed.code,
        accountKey: parsed.key,
        deviceName: 'Phone',
      );
      if (mounted) {
        await HapticFeedback.mediumImpact();
        widget.onClose();
      }
    } on SyncHttpException catch (e) {
      // Named for what the person can do about it, not for the status code.
      // "410" tells them nothing; "codes expire after a few minutes" tells
      // them to go and generate another one.
      setState(() => _error = switch (e.status) {
            404 || 410 => 'That code has expired. Generate a fresh one on your '
                'other device — they only last a few minutes.',
            429 => 'Too many attempts. Wait a minute and try again.',
            _ => "Couldn't reach that relay (${e.status}).",
          });
    } catch (_) {
      setState(() => _error =
          'No connection. Pairing needs the internet once; everything after '
          'that works offline.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final m = AbhTheme.metricsOf(context);
    final safe = MediaQuery.paddingOf(context);
    final sync = SyncScope.of(context);

    return ColoredBox(
      color: c.bg,
      child: ListView(
        padding: EdgeInsets.fromLTRB(
            m.pagePadH, safe.top + 20, m.pagePadH, safe.bottom + 40),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(sync.connected ? 'Your devices' : 'Add this device',
                    style: AbhText.title1.copyWith(color: c.fg)),
              ),
              GestureDetector(
                onTap: widget.onClose,
                child: SizedBox(
                  width: Metrics.tapTarget,
                  height: Metrics.tapTarget,
                  child: Center(
                    child: Text('Done',
                        style: AbhText.foot.copyWith(color: c.accent)),
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: m.gap),

          if (sync.connected) ...[
            Text(
              'This phone is paired. Your map is end-to-end encrypted — the '
              'server stores it but cannot read it.',
              style: AbhText.body.copyWith(color: c.fgMuted),
            ),
            SizedBox(height: m.sectionGap),
            GestureDetector(
              onTap: () async {
                await sync.unpair();
                if (context.mounted) widget.onClose();
              },
              child: Container(
                height: Metrics.tapTarget,
                alignment: Alignment.centerLeft,
                child: Text('Stop syncing on this device',
                    style: AbhText.body.copyWith(color: c.danger)),
              ),
            ),
            SizedBox(height: m.gap),
            Text(
              'Your map stays on this phone. Unpairing means stop sending, not '
              'delete.',
              style: AbhText.foot.copyWith(color: c.fgSubtle),
            ),
          ] else ...[
            Text(
              'On a device that already has your map, open Settings and choose '
              '“Pair a device”. Paste the link it gives you here.',
              style: AbhText.body.copyWith(color: c.fgMuted),
            ),
            SizedBox(height: m.sectionGap),

            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: c.surface,
                borderRadius: BorderRadius.circular(Radii.md),
                border: Border.all(
                    color: _error == null ? c.seam : c.danger),
              ),
              child: Stack(
                alignment: Alignment.centerLeft,
                children: [
                  if (_field.text.isEmpty)
                    IgnorePointer(
                      child: Text('Paste your pairing link',
                          style: AbhText.body.copyWith(color: c.fgSubtle)),
                    ),
                  EditableText(
                    controller: _field,
                    focusNode: _focus,
                    style: AbhText.body.copyWith(color: c.fg),
                    cursorColor: c.accent,
                    backgroundCursorColor: c.fgSubtle,
                    maxLines: 3,
                    minLines: 1,
                    onSubmitted: (_) => _pair(),
                  ),
                ],
              ),
            ),

            SizedBox(height: m.gap),
            GestureDetector(
              onTap: () async {
                final data = await Clipboard.getData('text/plain');
                if (data?.text != null) _field.text = data!.text!;
              },
              child: Container(
                height: Metrics.tapTarget,
                alignment: Alignment.centerLeft,
                child: Text('Paste from clipboard',
                    style: AbhText.foot.copyWith(color: c.accent)),
              ),
            ),

            if (_error != null) ...[
              SizedBox(height: m.gap),
              Text(_error!, style: AbhText.foot.copyWith(color: c.danger)),
            ],

            SizedBox(height: m.gap + 6),
            PrimaryButton(
              label: _busy ? 'Pairing…' : 'Pair this device',
              onTap: _busy || _field.text.trim().isEmpty ? () {} : _pair,
            ),

            SizedBox(height: m.sectionGap),
            Text(
              'Your key never reaches the server — it travels in the part of '
              'the link a browser never sends. Which also means nobody can '
              'reset it for you: to add a device you need one that is already '
              'paired.',
              style: AbhText.foot.copyWith(color: c.fgSubtle),
            ),
          ],
        ],
      ),
    );
  }
}
