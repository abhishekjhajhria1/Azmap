import type { Guide } from "../types.js";

/**
 * The NEET guide.
 *
 * Written to be useful rather than encouraging. Every claim here is either
 * structural (how the paper is built) or strategic (what tends to work), and
 * where something varies by year it says so instead of guessing.
 */
export const neetGuide: Guide = {
  id: "neet-ug",
  title: "How to actually prepare for NEET",
  subtitle: "What the paper rewards, in what order to build it, and which advice to ignore.",
  caveat:
    "NTA has revised the NEET syllabus more than once in recent years, removing whole chapters. This roadmap covers the stable core — but check the official syllabus for your exam year before you decide to skip anything, and before you decide to study anything that isn't in it.",
  sections: [
    {
      id: "shape",
      title: "The shape of the paper",
      body: `Biology is half the exam. That single fact should drive your timetable, and for most students it doesn't.

- **Biology** — roughly half the marks, split Botany and Zoology
- **Chemistry** — roughly a quarter
- **Physics** — roughly a quarter

There is negative marking, so an unsure guess has a real cost. Attempting fewer questions with higher accuracy routinely beats attempting everything, and almost nobody believes this until they've seen their own mock analysis.

The consequence: Biology is where the marks are, Physics is where students lose them, and Chemistry is the most predictable of the three. Plan accordingly rather than dividing your day into three equal parts.`,
    },
    {
      id: "biology",
      title: "Biology: NCERT is the syllabus, not a summary of it",
      body: `NEET Biology questions are drawn from NCERT, frequently from its exact wording — including sentences in boxes, captions under diagrams, and lines most students skim.

Read NCERT as the primary source. A coaching module is a useful supplement and a poor substitute; if the two disagree, NCERT is what the paper follows.

Concretely:
- Read line by line, including diagram labels and example boxes
- Convert every list into a table you wrote yourself — plant families, hormones, diseases and their pathogens, microbes and their products
- Draw the diagrams. Labelled diagrams appear directly as questions, and drawing one is worth three readings of it

**Genetics and Molecular Basis of Inheritance** carry the most weight and are the least like the rest of Biology: they're problem-solving, not recall. Practise them the way you'd practise Physics.`,
    },
    {
      id: "physics",
      title: "Physics: the subject that decides your rank",
      body: `Most students who miss their target miss it in Physics, and the reason is almost always the same — they moved on from Mechanics before it was solid.

Class 11 Mechanics is not a chapter you clear and leave behind. Laws of Motion, Work-Energy and Rotational Motion underpin everything after them, and a shaky free-body diagram in September is a wrong answer in May.

What works:
- Solve without looking at solutions for longer than is comfortable. Reading a solution feels like learning and mostly isn't
- Keep the sign conventions for Ray Optics and for Induction written down somewhere you'll see them. More marks are lost to signs than to concepts
- Do the numerical work by hand. Calculator-free arithmetic is part of the exam`,
    },
    {
      id: "chemistry",
      title: "Chemistry: the most controllable of the three",
      body: `Chemistry splits cleanly, and each third wants a different approach.

**Physical** — treat it like Physics. Mole concept, Equilibrium and Thermodynamics are the load-bearing chapters, and every numerical rests on the mole concept being automatic.

**Organic** — the single highest-leverage decision in your preparation is to learn General Organic Chemistry properly before touching reactions. With electronic effects and intermediate stability in place, Organic becomes reasoning. Without them it's several hundred reactions to memorise, which is exactly why students find it impossible.

**Inorganic** — largely recall, and the place where NCERT wording matters almost as much as in Biology. Derive from periodic trends where you can; make tables where you can't. It's also the section that decays fastest without revision, so schedule it late and repeatedly.`,
    },
    {
      id: "order",
      title: "What order to actually study in",
      body: `The roadmap encodes this, but the principle is worth stating: **follow the dependencies, not the chapter numbers.**

Cell Structure before any Human Physiology. Cell Division before Genetics. Chemical Bonding before anything in Inorganic or Organic. General Organic Chemistry before reactions. Mechanics before everything in Physics.

Anything with no unfinished prerequisites is something you can start today — that's what the map shows you, and it's why a locked topic is locked rather than simply further down a list.

Two chapters worth starting earlier than most people do, because they're long and they compound: **Molecular Basis of Inheritance** and **Carbonyl Compounds**.`,
    },
    {
      id: "revision",
      title: "Revision, and why re-reading fails",
      body: `Re-reading is the most popular revision method and close to the least effective. It feels productive because the material is familiar, and familiarity is not recall.

What works better:
- **Test yourself first, read second.** Try to state what's in a chapter before opening it. The gaps you find are the revision
- **Space it.** A chapter revisited on day 1, day 7 and day 30 sticks far better than three passes in one week
- **Keep an error notebook.** Every mock mistake, with why you made it — a concept gap, a misread, an arithmetic slip. Rereading this beats rereading anything else, and reviewing it is the habit that most reliably moves a plateaued score
- **Full-length mocks, timed.** 180 questions in 180 minutes is a stamina and pacing skill, separate from knowing the content, and it has to be trained deliberately`,
    },
    {
      id: "myths",
      title: "Advice you'll hear that is wrong",
      body: `**"Skip Physics, Biology will carry you."** Biology is half the paper, and at the cutoffs that matter almost everyone has good Biology. Physics is what separates ranks.

**"Do every book you can find."** Depth in NCERT plus one good problem source beats breadth across five. Multiple books mostly buy you the illusion of coverage.

**"Study 16 hours a day."** Sustained focused hours beat heroic ones. Someone doing six real hours daily for two years will beat someone doing fourteen for two months and burning out.

**"Solve previous years' papers at the end."** Start them far earlier than feels right. They teach you what the examiner actually values, and every week you delay is a week spent studying without that information.`,
    },
  ],
};
