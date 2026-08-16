import Link from "next/link";

/**
 * The plot switcher — ABH shows a different "plot" (view) per kind of user:
 * a Learner following a roadmap, an Explorer roaming the open map, and a
 * Guardian watching someone's progress. It sits in every plot's top bar.
 */
const PLOTS = [
  { href: "/roadmap", label: "Roadmap", hint: "learner" },
  { href: "/app", label: "Explore", hint: "learn anything" },
  { href: "/guardian", label: "Guardian", hint: "watch progress" },
] as const;

export default function PlotNav({ active }: { active: "roadmap" | "app" | "guardian" }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-forest-800 bg-forest-900/60 p-0.5">
      {PLOTS.map((p) => {
        const isActive = p.href === `/${active}`;
        return (
          <Link
            key={p.href}
            href={p.href}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              isActive
                ? "bg-forest-700 text-parchment"
                : "text-forest-300 hover:text-parchment"
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
