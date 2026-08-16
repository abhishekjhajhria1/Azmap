import LiveMap from "@/components/LiveMap";
import { Audience, Eyebrow, Pillar, Section, Stat } from "@/components/ui";

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      {/* ---- Nav ---- */}
      <header className="sticky top-0 z-50 border-b border-forest-800/60 bg-forest-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-forest-600 text-parchment">
              A
            </span>
            <span className="text-lg">ABH</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-forest-300 md:flex">
            <a href="#product" className="transition hover:text-parchment">The product</a>
            <a href="#map" className="transition hover:text-parchment">The map</a>
            <a href="#who" className="transition hover:text-parchment">Who it's for</a>
            <a href="#why" className="transition hover:text-parchment">Why it works</a>
          </nav>
          <a
            href="#waitlist"
            className="rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-forest-950 transition hover:bg-amber-soft"
          >
            Get early access
          </a>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <div className="relative">
        <div className="bg-grid absolute inset-0 -z-10" />
        <div className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-gradient-to-b from-forest-800/40 to-transparent" />
        <Section className="pt-16 pb-14 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-up">
              <Eyebrow>The learning map</Eyebrow>
              <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Everything you learn, on one map that grows with you.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-forest-300">
                Name anything you want to learn and get a real path through it —
                or let AI build one for a subject nobody has mapped yet. Every
                step you finish opens the next. And the people who matter can see
                how far you&apos;ve actually come.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#waitlist"
                  className="rounded-lg bg-amber px-6 py-3 font-semibold text-forest-950 transition hover:bg-amber-soft"
                >
                  Get early access
                </a>
                <a
                  href="#product"
                  className="rounded-lg border border-forest-600 px-6 py-3 font-semibold text-parchment transition hover:bg-forest-800"
                >
                  See how it works
                </a>
              </div>
              <p className="mt-6 text-sm text-forest-400">
                Works offline. No account required. Your learning never leaves
                your device.
              </p>
            </div>

            <div className="animate-fade-up [animation-delay:120ms]">
              <LiveMap />
            </div>
          </div>
        </Section>
      </div>

      {/* ---- Problem ---- */}
      <Section id="problem" className="py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="text-balance text-3xl font-bold sm:text-4xl">
            You learn constantly and keep almost none of it.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-forest-300">
            An engineer picks up a framework. A doctor reads a new protocol. A
            student grinds a syllabus. Someone curious falls down a Wikipedia
            hole at 1am. All of it is real learning. None of it is connected to
            anything, none of it is retained on purpose, and at the end there is
            no record that any of it happened.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            ["Course platforms", "hand you a linear playlist and no idea where it fits."],
            ["Note apps", "capture everything and organise nothing."],
            ["Roadmap sites", "show a beautiful path, then forget you the moment you close the tab."],
          ].map(([h, p]) => (
            <div key={h} className="rounded-xl border border-forest-800 bg-forest-900/30 p-5">
              <div className="font-semibold text-parchment">{h}</div>
              <div className="mt-2 text-sm leading-relaxed text-forest-300">{p}</div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-lg font-medium text-parchment">
          Nothing holds what you know as a living thing. That&apos;s the gap ABH
          fills.
        </p>
      </Section>

      {/* ---- Product: three pillars ---- */}
      <Section id="product" className="py-20">
        <div className="max-w-2xl">
          <Eyebrow>The product</Eyebrow>
          <h2 className="text-balance text-3xl font-bold sm:text-4xl">
            Three things that only work because they&apos;re the same thing.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Pillar index="01" title="The Roadmap">
            Name anything you want to learn. You get a real path through it — or
            AI builds one for a subject nobody has mapped yet. Every step says
            <em> why it matters</em> and <em>what it unlocks</em>.
          </Pillar>
          <Pillar index="02" title="The Map">
            The roadmap is a graph, not a list, so topics unlock as you clear
            what they need. It keeps growing — from what you finish, what you
            read, and what AI suggests at the edges of what you already know.
          </Pillar>
          <Pillar index="03" title="The People">
            Pick a guardian — a friend, a senior, a parent. They shape your plan,
            sign off real work, and are told when you slip. Friends see how far
            you have actually come.
          </Pillar>
        </div>
        <div className="mt-8 rounded-xl border border-amber/30 bg-amber/5 p-5 text-center text-sm text-amber-soft">
          Nothing AI proposes joins your map until you tap to accept it.
        </div>
      </Section>

      {/* ---- Why the map matters (the moat) ---- */}
      <Section id="map" className="py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>Why the map is the point</Eyebrow>
            <h2 className="text-balance text-3xl font-bold sm:text-4xl">
              Because the connections are real, the app can answer a question
              nothing else can.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-forest-300">
              &ldquo;What am I actually able to start right now?&rdquo; becomes a
              fact, not a guess. And finishing one topic visibly opens several
              others — the moment people come back for.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-forest-300">
              It also means the app is never finished with you. Read an
              explainer, import a roadmap, accept a suggestion, and the map
              absorbs it. After a year it isn&apos;t a course you took. It&apos;s
              a picture of what you know, built by you, that nothing else
              currently produces.
            </p>
          </div>
          <div className="rounded-2xl border border-forest-700/60 bg-forest-900/40 p-8">
            <blockquote className="text-xl font-medium leading-relaxed text-parchment">
              &ldquo;The prerequisite links are judgements about what genuinely
              blocks what. Scraping cannot produce them — and a wrong one is
              worse than none.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm text-forest-400">
              Why the graph is hard to copy.
            </p>
          </div>
        </div>
      </Section>

      {/* ---- Who it's for ---- */}
      <Section id="who" className="py-20">
        <div className="max-w-2xl">
          <Eyebrow>Who it&apos;s for</Eyebrow>
          <h2 className="text-balance text-3xl font-bold sm:text-4xl">
            Deliberately not one audience.
          </h2>
          <p className="mt-4 text-lg text-forest-300">
            Four groups normally need four different products, because each is
            treated as a different content problem. They&apos;re not. They&apos;re
            the same problem — a person accumulating understanding over years with
            nothing holding it — and one graph serves all four.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <Audience title="Engineers">
            Technical roadmaps, learned in the right order, with a record of what
            you actually covered.
          </Audience>
          <Audience title="Doctors & professionals">
            Fields where you never stop learning and nobody tracks it but you.
          </Audience>
          <Audience title="Students">
            Any exam with a published syllabus — from JEE and NEET to the SAT and
            GCSE.
          </Audience>
          <Audience title="The curious">
            Short pieces on how things work, tuned to what you&apos;re already
            interested in, that join your map as you read.
          </Audience>
        </div>
      </Section>

      {/* ---- Second brain / capture ---- */}
      <Section className="py-20">
        <div className="rounded-3xl border border-forest-700/60 bg-gradient-to-br from-forest-800/50 to-forest-950 p-8 sm:p-12">
          <div className="max-w-3xl">
            <Eyebrow>Where it&apos;s heading</Eyebrow>
            <h2 className="text-balance text-3xl font-bold sm:text-4xl">
              A second brain that gets denser every time you learn something.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-forest-300">
              Everything you read, save, screenshot or copy is something you were
              learning — and today all of it is lost the moment you close the
              tab. ABH is built to catch it and put it somewhere it connects to
              what you already know. Not another inbox of notes you never reopen:
              a map.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ["Browser extension", "Capture on the laptop, where most reading actually happens — straight into the map."],
                ["Home-screen widgets", "The next thing to learn, visible without opening anything."],
                ["Clipboard & screenshots", "The two things everyone already uses as a memory system, made to actually work as one."],
                ["Web", "So a map can be opened, and shown, anywhere."],
              ].map(([h, p]) => (
                <div key={h} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber" />
                  <div>
                    <div className="font-semibold text-parchment">{h}</div>
                    <div className="text-sm text-forest-300">{p}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ---- Why this can work ---- */}
      <Section id="why" className="py-20">
        <div className="max-w-2xl">
          <Eyebrow>Why this can work</Eyebrow>
          <h2 className="text-balance text-3xl font-bold sm:text-4xl">
            The advantages are structural, not features.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Pillar index="→" title="Sharing is built in, not bolted on">
            The product asks you to name a guardian before it does anything
            useful, so telling someone is the first step — not a growth feature
            added later.
          </Pillar>
          <Pillar index="→" title="Privacy is real here, not marketing">
            What you&apos;re learning never leaves your phone. That&apos;s a claim
            a funded competitor cannot copy without rebuilding from scratch.
          </Pillar>
          <Pillar index="→" title="It costs almost nothing to run">
            No sync server and no telemetry means the infrastructure bill barely
            moves with users — so it works on a bad connection, too.
          </Pillar>
          <Pillar index="→" title="The graph is hard to copy">
            Prerequisite links are judgements about what genuinely blocks what.
            Scraping can&apos;t produce them, and a wrong one is worse than none.
          </Pillar>
        </div>
      </Section>

      {/* ---- Built so far ---- */}
      <Section className="py-20">
        <div className="rounded-3xl border border-forest-700/60 bg-forest-900/40 p-8 sm:p-12">
          <Eyebrow>Built so far</Eyebrow>
          <h2 className="max-w-2xl text-balance text-2xl font-bold sm:text-3xl">
            Not a mockup. A working app, built solo — now coming to every screen.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat value="18,000" label="lines of Kotlin, shipped solo" />
            <Stat value="121" label="automated tests" />
            <Stat value="13" label="full roadmaps, 6 countries, 3 languages" />
            <Stat value="288" label="vetted sources, 86 prerequisite links" />
          </div>
          <p className="mt-8 max-w-2xl text-forest-300">
            AI is already in it — proposing new topics and answering questions in
            the context of what you&apos;re studying. Next: the browser extension
            and the web, so your map opens anywhere.
          </p>
        </div>
      </Section>

      {/* ---- CTA ---- */}
      <Section id="waitlist" className="py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-amber/30 bg-gradient-to-b from-forest-800/60 to-forest-950 p-10 text-center">
          <h2 className="text-balance text-3xl font-bold sm:text-4xl">
            Start the map you&apos;ll still be adding to in a year.
          </h2>
          <p className="mt-4 text-lg text-forest-300">
            Be first to the browser extension and the web app.
          </p>
          <form className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              placeholder="you@email.com"
              className="w-full rounded-lg border border-forest-600 bg-forest-950 px-4 py-3 text-parchment outline-none placeholder:text-forest-500 focus:border-amber"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-amber px-6 py-3 font-semibold text-forest-950 transition hover:bg-amber-soft"
            >
              Get early access
            </button>
          </form>
          <p className="mt-4 text-xs text-forest-400">
            No spam. One note when it&apos;s ready.
          </p>
        </div>
      </Section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-forest-800/60 py-10">
        <Section className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-forest-400">
            <span className="grid h-6 w-6 place-items-center rounded bg-forest-700 text-xs font-bold text-parchment">
              A
            </span>
            ABH — everything you learn, on one map.
          </div>
          <p className="text-xs text-forest-500">
            Built local-first. Your learning stays yours.
          </p>
        </Section>
      </footer>
    </main>
  );
}
