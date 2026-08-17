"use client";

/**
 * Adding a device to your account.
 *
 * Two halves of one screen: **Show a code** on the device that's already signed
 * in, and **Enter a code** on the new one. No password field, no email, no
 * "check your inbox" — the pairing payload carries the account key itself, so
 * scanning it *is* signing in.
 *
 * The one thing this UI must get right is making the trade-off legible: the
 * code on screen is a bearer credential for five minutes, and the account key
 * lives only on the user's devices, so losing all of them loses the data. Both
 * are stated here rather than buried in a settings page, because a person can
 * only make that trade if they know they're making it.
 */

import {
  AccountManager,
  decodePairingOffer,
  encodePairingOffer,
  formatCode,
  normaliseCode,
  secondsRemaining,
  type PairingOffer,
  type StoredAccount,
} from "@abh/core";
import { Check, Copy, Loader2, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { QrCode } from "./QrCode.js";

export interface DevicePairingProps {
  account: AccountManager;
  /**
   * Where the QR should point. Scanning with a plain camera app opens this and
   * the app picks the payload out of the fragment. Omit for a bare payload that
   * only an in-app scanner reads.
   */
  pairingUrl?: string;
  /** Called after this device joins an account, so the app can start syncing. */
  onPaired?: (account: StoredAccount) => void;
  className?: string;
}

type Mode = "idle" | "showing" | "entering";

export function DevicePairing({
  account,
  pairingUrl,
  onPaired,
  className,
}: DevicePairingProps): ReactElement {
  const [signedIn, setSignedIn] = useState<StoredAccount | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [offer, setOffer] = useState<PairingOffer | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void account.current().then(setSignedIn);
  }, [account]);

  // A live countdown, so an expired code is never left sitting on screen
  // looking valid.
  useEffect(() => {
    if (!offer) return;
    const tick = () => setRemaining(secondsRemaining(offer));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [offer]);

  const showCode = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (!(await account.isSignedIn())) await account.create();
      setSignedIn(await account.current());
      setOffer(await account.offerPairing());
      setMode("showing");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }, [account]);

  const submitCode = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const joined = await account.join(decodePairingOffer(typed.trim()));
      setSignedIn(joined);
      setMode("idle");
      setTyped("");
      onPaired?.(joined);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }, [account, typed, onPaired]);

  const payload = offer ? encodePairingOffer(offer, pairingUrl) : "";
  const expired = offer !== null && remaining === 0;

  return (
    <div className={className}>
      <header className="mb-6">
        <h2 className="t-title2">Your devices</h2>
        <p className="mt-1 text-sm text-muted">
          One account, every device you own. Pair a new one by showing this code to it.
        </p>
      </header>

      {/* The honest disclosure, not a footnote. */}
      <div className="group mb-6">
        <div className="row-btn items-start gap-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-known" />
          <p className="text-sm text-muted">
            Your map is encrypted with a key that only your devices hold — we never see it.
            That also means if you lose every paired device, no one can recover your data.
            Keeping a second device paired <em>is</em> the backup.
          </p>
        </div>
      </div>

      {mode !== "entering" && (
        <section className="mb-4">
          {!offer ? (
            <button className="row-btn pressable w-full justify-between" onClick={showCode} disabled={busy}>
              <span className="flex items-center gap-3">
                <Smartphone size={18} className="text-accent" />
                <span className="font-medium">Show a pairing code</span>
              </span>
              {busy ? <Loader2 size={16} className="animate-spin text-subtle" /> : null}
            </button>
          ) : (
            <div className="card flex flex-col items-center gap-4 p-6">
              <QrCode value={payload} size={220} className="rounded-xl" />
              <div className="text-center">
                <p className="font-mono text-xl tracking-[0.2em]">{formatCode(offer.code)}</p>
                <p className="mt-1 text-xs text-subtle">
                  {expired ? "This code has expired." : `Expires in ${formatClock(remaining)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="row-btn pressable gap-2 whitespace-nowrap px-4"
                  onClick={() => {
                    void navigator.clipboard?.writeText(payload).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    });
                  }}
                >
                  {copied ? <Check size={15} className="text-known" /> : <Copy size={15} />}
                  <span className="text-sm">{copied ? "Copied" : "Copy code"}</span>
                </button>
                <button className="row-btn pressable gap-2 whitespace-nowrap px-4" onClick={showCode} disabled={busy}>
                  <RefreshCw size={15} />
                  <span className="text-sm">New code</span>
                </button>
              </div>
              <p className="max-w-xs text-center text-xs text-subtle">
                Anyone who can see this code can join your account until it expires. Don't share
                a screenshot of it.
              </p>
            </div>
          )}
        </section>
      )}

      {mode !== "showing" && (
        <section>
          {mode !== "entering" ? (
            <button className="row-btn pressable w-full" onClick={() => setMode("entering")}>
              <span className="font-medium">I have a code from another device</span>
            </button>
          ) : (
            <div className="card p-5">
              <label className="t-eyebrow block" htmlFor="pairing-code">
                Paste or scan the code
              </label>
              <input
                id="pairing-code"
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && typed.trim() && void submitCode()}
                placeholder="abh1:…"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                className="mt-2 w-full rounded-xl border border-hairline bg-surface px-4 py-3 font-mono text-sm outline-none placeholder:text-subtle focus:border-accent"
              />
              <div className="mt-3 flex gap-2">
                <button
                  className="row-btn pressable flex-1 justify-center bg-accent font-semibold text-accent-ink"
                  onClick={() => void submitCode()}
                  disabled={busy || !typed.trim()}
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : "Pair this device"}
                </button>
                <button
                  className="row-btn pressable px-4"
                  onClick={() => {
                    setMode("idle");
                    setError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-[color:var(--danger,#e5484d)]">
          {error}
        </p>
      )}

      {signedIn && (
        <p className="mt-6 text-xs text-subtle">
          Signed in since {new Date(signedIn.joinedAt).toLocaleDateString()} · account{" "}
          <span className="font-mono">{signedIn.accountId.slice(0, 12)}…</span>
        </p>
      )}
    </div>
  );
}

/** The typed code may be a bare payload or a full pairing URL — both work. */
export function readPairingFromLocation(href: string): PairingOffer | null {
  try {
    return href.includes("#") ? decodePairingOffer(href) : null;
  } catch {
    return null;
  }
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}

/** Re-exported so an app can normalise a manually typed short code. */
export { normaliseCode };
