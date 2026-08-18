/// End-to-end encryption for sync.
///
/// The product promise is that your learning never leaves your device in a form
/// anyone else can read. Sync bends that — bytes cross a network — so the bytes
/// are sealed with a key the relay never sees and cannot derive.
///
/// Wire-identical to `packages/core/src/account/crypto.ts`, because a phone and
/// a laptop have to open each other's envelopes:
///
///   - AES-GCM, 256-bit key
///   - 12-byte IV, random per message, **never reused**
///   - `{ v: 1, iv: <base64url>, ct: <base64url> }`
///   - base64**url** (`-_`, no padding), not standard base64
///
/// Two details that look cosmetic and are not:
///
/// **base64url without padding.** Standard base64's `+` and `/` are not
/// URL-safe and its `=` padding is stripped by some proxies. The TypeScript
/// side already made this choice; a Dart client using `base64.encode` would
/// produce envelopes the web app silently fails to open.
///
/// **The IV is prepended to nothing.** Some libraries concatenate IV and
/// ciphertext into one blob; this format keeps them as separate fields. Mixing
/// the two conventions produces a decrypt that fails with "bad MAC", which is
/// the least helpful error in cryptography.
library;

import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';

/// A sealed payload, exactly as it travels.
class Sealed {
  const Sealed({required this.iv, required this.ct, this.v = 1});

  final int v;
  final String iv;
  final String ct;

  Map<String, dynamic> toJson() => {'v': v, 'iv': iv, 'ct': ct};

  factory Sealed.fromJson(Map<String, dynamic> j) => Sealed(
        v: j['v'] as int? ?? 1,
        iv: j['iv'] as String,
        ct: j['ct'] as String,
      );
}

class AccountCrypto {
  AccountCrypto(this._key);

  final SecretKey _key;

  static final _algorithm = AesGcm.with256bits();
  static const _ivBytes = 12;

  /// A fresh account key. Generated on the device that creates the account and
  /// carried to the others by pairing — it never touches the relay.
  static Future<AccountCrypto> generate() async =>
      AccountCrypto(await _algorithm.newSecretKey());

  /// Rebuilds a key from its base64url form, as carried in a pairing link.
  static Future<AccountCrypto> fromRaw(String raw) async {
    final bytes = base64UrlDecodeUnpadded(raw);
    if (bytes.length != 32) {
      // Checked here rather than left to fail at first decrypt, where the error
      // would be "bad MAC" and point at the wrong thing entirely.
      throw ArgumentError('Account key must be 32 bytes, got ${bytes.length}');
    }
    return AccountCrypto(SecretKey(bytes));
  }

  Future<String> export() async =>
      base64UrlEncodeUnpadded(await _key.extractBytes());

  Future<Sealed> seal(Object? value) async {
    final iv = _randomBytes(_ivBytes);
    final box = await _algorithm.encrypt(
      utf8.encode(jsonEncode(value)),
      secretKey: _key,
      nonce: iv,
    );
    // `cryptography` keeps the 16-byte MAC separate; WebCrypto appends it to the
    // ciphertext. Concatenating here is what makes the two interoperate — and
    // forgetting it is a decrypt failure on the *other* platform only, which is
    // the worst kind of bug to find.
    return Sealed(
      iv: base64UrlEncodeUnpadded(iv),
      ct: base64UrlEncodeUnpadded(
          Uint8List.fromList([...box.cipherText, ...box.mac.bytes])),
    );
  }

  Future<T> open<T>(Sealed sealed) async {
    if (sealed.v != 1) {
      throw StateError('Unknown envelope version ${sealed.v}');
    }
    final raw = base64UrlDecodeUnpadded(sealed.ct);
    if (raw.length < 16) throw StateError('Ciphertext too short to hold a MAC');

    final box = SecretBox(
      raw.sublist(0, raw.length - 16),
      nonce: base64UrlDecodeUnpadded(sealed.iv),
      mac: Mac(raw.sublist(raw.length - 16)),
    );
    final plain = await _algorithm.decrypt(box, secretKey: _key);
    return jsonDecode(utf8.decode(plain)) as T;
  }
}

/// `Random.secure()`, never `Random()`.
///
/// A predictable IV in AES-GCM is not a weakness, it is a total break: two
/// messages under the same key and IV leak the XOR of their plaintexts.
Uint8List _randomBytes(int length) {
  final rnd = Random.secure();
  return Uint8List.fromList(
      List<int>.generate(length, (_) => rnd.nextInt(256)));
}

/// base64url, no padding — matching the TypeScript side exactly.
String base64UrlEncodeUnpadded(List<int> bytes) =>
    base64Url.encode(bytes).replaceAll('=', '');

Uint8List base64UrlDecodeUnpadded(String text) {
  // Dart's decoder requires the padding the encoder above removes.
  final pad = (4 - text.length % 4) % 4;
  return base64Url.decode(text + '=' * pad);
}
