import type { Guide } from "../types.js";

/**
 * The JEE guide.
 *
 * The central claim — that JEE Physics failures are usually Maths failures — is
 * the thing the roadmap's cross-subject prerequisites encode, and it's worth
 * saying in prose too, because a student staring at a Physics chapter they
 * can't do rarely suspects the calculus.
 */
export const jeeGuide: Guide = {
  id: "jee",
  title: "How to actually prepare for JEE",
  subtitle: "Two exams, one syllabus, and the dependency almost everyone discovers too late.",
  caveat:
    "The JEE syllabus has been revised, with topics both added and removed, and Main and Advanced can differ in scope. Check the official NTA syllabus for Main and the JAB syllabus for Advanced for your exam year before deciding what to skip.",
  sections: [
    {
      id: "two-exams",
      title: "Main and Advanced want different things",
      body: `The syllabus is essentially shared. The papers are not.

**Main** rewards speed, coverage and accuracy on single-concept questions. You are rarely asked something deep; you are asked ninety things quickly. Marks come from not making mistakes.

**Advanced** rewards depth. A single question may need rotational dynamics, energy conservation and integration together, and the answer format punishes partial understanding. Marks come from being able to hold three ideas at once.

The practical consequence: prepare the syllabus for Advanced, then train speed separately for Main. Doing it the other way round — coverage first, depth later — leaves you fast at problems Advanced doesn't ask.`,
    },
    {
      id: "the-dependency",
      title: "Physics failures are usually Maths failures",
      body: `This is the most useful thing in this guide.

Students hit a wall in Rotational Dynamics, or in Electrostatics, or in AC circuits, and conclude they're bad at Physics. Nearly always the actual gap is upstream:

- **Rotational dynamics** needs integration. Moment of inertia *is* an integral
- **Electrostatics** needs vectors and integration, and its mathematics is identical to gravitation — if one worked and the other didn't, the difference is confidence, not content
- **AC circuits** are SHM in different symbols, and phasors are complex numbers
- **Variable-force problems** in Work-Energy are calculus questions wearing a physics costume

The roadmap makes those prerequisites explicit across subject lines, which a per-subject chapter list structurally cannot. If a Physics chapter feels impossible, check what it needs before grinding at it.

The corollary: **do not defer Calculus.** Limits, Continuity and Integrals early makes half the Physics syllabus easier. Leaving them for Class 12 makes Class 11 Physics harder than it ever needed to be.`,
    },
    {
      id: "maths",
      title: "Maths: half of it is Calculus",
      body: `Integrals alone are the largest single block of marks in the subject, and Applications of Derivatives is the most directly transferable chapter you'll study.

What matters:
- **Fluency, not familiarity.** Integration is a skill built by volume. There is no way to read your way to it
- **3D Geometry and Vectors are nearly free marks** — formulaic, self-contained, and consistently examined. Front-load them
- **Conic Sections is pattern-heavy.** Once you've seen the standard question types, they repeat
- **Domain discipline.** A large share of "wrong answer, right method" comes from ignoring where a function is defined`,
    },
    {
      id: "chemistry",
      title: "Chemistry: the most predictable marks in the paper",
      body: `Chemistry is where a well-prepared student loses the fewest marks, and it splits three ways.

**Physical** — numerical and reliable. Mole concept must be automatic; Equilibrium and Thermodynamics are the load-bearing chapters. Solid State is almost pure arithmetic and among the best value in the syllabus.

**Organic** — learn General Organic Chemistry and stereochemistry *before* reactions. With electronic effects and intermediate stability in place, Organic is deduction; without them it's memorising hundreds of arrows. This single ordering decision determines whether students find Organic tractable or hopeless.

**Inorganic** — recall-heavy and the fastest to decay. Derive from periodic trends where possible. Schedule it late, revisit it often, and don't neglect qualitative analysis: salt analysis and functional group tests are asked directly and are easy marks for anyone who bothered.`,
    },
    {
      id: "practice",
      title: "How to practise",
      body: `Reading solutions is the most common way to waste study time. It produces recognition, which feels like understanding right up until the exam.

- **Sit with a problem longer than is comfortable.** The struggle is the learning; the solution is just confirmation
- **Previous years' papers, early.** They teach the examiner's habits, which no textbook contains. Every month you delay is a month of studying without knowing what's valued
- **Timed sectional tests** for Main, **untimed multi-chapter problems** for Advanced. Different skills, trained differently
- **An error notebook.** Every mistake with its cause: concept gap, misread question, algebra slip. Reviewing this is the single habit that most reliably lifts a stuck score
- **Write your own formula sheet.** The writing is the revision. A downloaded one is somebody else's memory`,
    },
    {
      id: "myths",
      title: "Advice you'll hear that is wrong",
      body: `**"Do Physics first, it's the toughest."** Physics is hardest *because of the Maths under it*. Doing it first without calculus is why it feels impossible.

**"Coaching material is enough, skip NCERT."** True for Physics and Maths, false for Inorganic Chemistry, where NCERT wording shows up directly.

**"More questions is always better."** Two hundred problems you fought through and reviewed beat two thousand you skimmed. Volume without review is a hobby.

**"Advanced is just harder Main."** It's a different exam. Multi-concept problems and answer formats that punish partial credit are the difference, and they need practising as their own thing.

**"Drop a subject and focus."** There are no optional subjects. A weak subject caps your rank no matter how strong the other two are.`,
    },
  ],
};
