import { DevicePairing, useAbh } from "@abh/ui";
import { Cloud, CloudOff, Loader2, TriangleAlert, X } from "lucide-react";
import { useEffect, type ReactElement } from "react";
import { account, announcePairing, enrolWithRelay, PAIRING_URL, useAccountSync } from "./sync";

/**
 * The account sheet — devices, pairing, and what sync is currently doing.
 *
 * Reached from the brand chip rather than the dock: pairing is something you do
 * once or twice, and the dock is for the four things you do every day.
 */
export function DeviceSheet({ onClose }: { onClose: () => void }): ReactElement {
  const status = useAbh((s) => s.sync);

  // Escape closes it — this is a dialog, and a dialog you can't dismiss with
  // the keyboard is a trap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your devices"
      className="fixed inset-0 z-50 grid place-items-center p-5"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="glass relative max-h-[86dvh] w-full max-w-md overflow-y-auto rounded-[26px] p-6">
        <button
          onClick={onClose}
          aria-label="Close"
          className="pressable absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-subtle hover:text-fg"
        >
          <X size={16} />
        </button>

        <DevicePairing
          account={account}
          pairingUrl={PAIRING_URL}
          onOffer={async (code, expiresAt) => {
            // Creating an account here is the first time this device needs the
            // relay, so enrol before publishing the code.
            await enrolWithRelay();
            await announcePairing(code, expiresAt);
          }}
          onEnrol={async (code) => {
            await enrolWithRelay(code);
          }}
          onPaired={() => void useAccountSync()}
        />

        {status && (
          <div className="mt-6 flex items-center gap-2 border-t border-hairline pt-4 text-xs text-subtle">
            <SyncIcon status={status.status} />
            <span>{describe(status.status, status.pending)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SyncIcon({ status }: { status: string }) {
  if (status === "syncing") return <Loader2 size={14} className="animate-spin text-accent" />;
  if (status === "error") return <TriangleAlert size={14} className="text-[color:#e5484d]" />;
  if (status === "offline") return <CloudOff size={14} />;
  return <Cloud size={14} className="text-known" />;
}

/** Offline is a normal state here, not a failure — say so plainly. */
function describe(status: string, pending: number): string {
  const queued = pending === 1 ? "1 change waiting" : `${pending} changes waiting`;
  switch (status) {
    case "syncing":
      return "Syncing…";
    case "error":
      return `Couldn't sync — ${queued}. It'll retry.`;
    case "offline":
      return pending > 0
        ? `Saved on this device · ${queued} to sync`
        : "Saved on this device";
    default:
      return pending > 0 ? queued : "Everything is up to date";
  }
}
