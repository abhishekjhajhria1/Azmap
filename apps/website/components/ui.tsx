import type { ReactNode } from "react";

export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>
      {children}
    </section>
  );
}

/**
 * Deliberately not accent-coloured: the blue marks the one thing you should
 * click on a screen, and spending it on every section label spends it on
 * nothing.
 */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-subtle">
      {children}
    </p>
  );
}

export function Pillar({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="group/pillar relative rounded-[20px] bg-surface p-7 shadow-[var(--e2)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--e3)]">
      <span className="font-mono text-[13px] font-semibold text-subtle transition-colors group-hover/pillar:text-accent">{index}</span>
      <h3 className="mt-3 text-[19px] font-semibold leading-snug tracking-[-0.014em] text-fg">{title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[18px] bg-surface px-5 py-5 shadow-[var(--e2)]">
      <div className="text-[28px] font-bold leading-none tracking-[-0.03em] text-fg sm:text-[34px]">{value}</div>
      <div className="mt-2.5 text-[13px] leading-snug text-muted">{label}</div>
    </div>
  );
}

export function Audience({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[20px] bg-surface p-7 shadow-[var(--e2)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--e3)]">
      <h3 className="text-[18px] font-semibold tracking-[-0.014em] text-fg">{title}</h3>
      <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}
