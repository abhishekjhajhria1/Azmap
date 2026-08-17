import type { Guide } from "@abh/core";
import { Info, X } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";

/**
 * The guide reader.
 *
 * A roadmap answers *what to study, in what order*. A guide answers everything
 * else — how the paper is marked, what to do in the last month, which popular
 * advice is wrong — and for an exam that matters, that's half the product.
 *
 * Rendered as a document with a section index, because a guide is read in parts
 * and returned to, not consumed once. The body format is deliberately
 * markdown-*lite* (paragraphs, `- ` bullets, `**bold**`) so no surface ever
 * needs a parser dependency to show one.
 */
export function GuideSheet({
  guide,
  onClose,
}: {
  guide: Guide;
  onClose: () => void;
}): ReactElement {
  const [active, setActive] = useState(guide.sections[0]?.id ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const section = guide.sections.find((s) => s.id === active) ?? guide.sections[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={guide.title}
      className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-6"
    >
      <button aria-label="Close" className="sheet-veil absolute inset-0" onClick={onClose} />

      <div className="sheet relative flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden">
        <header className="flex items-start gap-4 border-b px-6 py-5" style={{ borderColor: "var(--seam)" }}>
          <div className="min-w-0 flex-1">
            <h2 className="t-title2 text-balance">{guide.title}</h2>
            <p className="t-tight mt-1 text-muted">{guide.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-full text-subtle hover:text-fg"
          >
            <X size={16} />
          </button>
        </header>

        {/* The caveat is chrome, not a footnote. A guide to an exam whose
            syllabus changes yearly has to say so where it can't be missed. */}
        {guide.caveat && (
          <div
            className="flex items-start gap-3 px-6 py-3.5"
            style={{ background: "color-mix(in srgb, var(--ai) 9%, transparent)" }}
          >
            <Info size={15} className="mt-0.5 shrink-0 text-ai" />
            <p className="t-foot leading-relaxed text-muted">{guide.caveat}</p>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Section index. Horizontal chips on a phone, a rail on a laptop. */}
          <nav
            aria-label="Sections"
            className="flex shrink-0 gap-1 overflow-x-auto border-b px-4 py-3 md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r"
            style={{ borderColor: "var(--seam)" }}
          >
            {guide.sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                aria-current={s.id === active ? "true" : undefined}
                className="shrink-0 rounded-[10px] px-3 py-2 text-left text-[13px] transition-colors md:shrink"
                style={
                  s.id === active
                    ? {
                        background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                        color: "var(--accent)",
                        fontWeight: 600,
                      }
                    : { color: "var(--fg-muted)" }
                }
              >
                {s.title}
              </button>
            ))}
          </nav>

          <article className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {section && (
              <>
                <h3 className="t-title3">{section.title}</h3>
                <div className="mt-3.5 max-w-[68ch]">
                  <GuideBody body={section.body} />
                </div>
              </>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}

/**
 * Markdown-lite renderer: blank-line paragraphs, `- ` bullets, `**bold**`.
 *
 * Hand-rolled on purpose. A full Markdown parser is 40kB to render text we
 * author ourselves, and the constrained format is a feature — it keeps guide
 * bodies readable in the source file too.
 */
function GuideBody({ body }: { body: string }): ReactElement {
  const blocks = body.trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.trimStart().startsWith("- "))) {
          return (
            <ul key={i} className="mb-4 space-y-1.5 pl-1">
              {lines.map((l, j) => (
                <li key={j} className="t-body flex gap-2.5 text-muted">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[var(--fg-subtle)]" />
                  <span>{inline(l.trimStart().slice(2))}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="t-body mb-4 text-muted">
            {inline(block.replace(/\n/g, " "))}
          </p>
        );
      })}
    </>
  );
}

/** `**bold**` → emphasis in the foreground colour. Nothing else. */
function inline(text: string): ReactElement {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-fg">
            {p.slice(2, -2)}
          </strong>
        ) : (
          p
        ),
      )}
    </>
  );
}
