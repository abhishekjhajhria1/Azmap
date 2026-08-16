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

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber">
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
    <div className="group relative rounded-2xl border border-forest-700/60 bg-forest-900/40 p-6 transition hover:border-forest-500 hover:bg-forest-900/70">
      <span className="text-sm font-mono text-amber">{index}</span>
      <h3 className="mt-2 text-xl font-semibold text-parchment">{title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-forest-300">{children}</p>
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-forest-700/50 bg-forest-900/40 px-5 py-4">
      <div className="text-2xl font-bold text-parchment sm:text-3xl">{value}</div>
      <div className="mt-1 text-sm text-forest-300">{label}</div>
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
    <div className="rounded-2xl border border-forest-700/50 bg-gradient-to-b from-forest-900/60 to-forest-950 p-6">
      <h3 className="text-lg font-semibold text-parchment">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-forest-300">{children}</p>
    </div>
  );
}
