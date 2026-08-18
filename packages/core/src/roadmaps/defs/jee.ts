/**
 * JEE Main & Advanced — the engineering entrance syllabus as a prerequisite
 * graph.
 *
 * ## Why one roadmap for both papers
 *
 * The syllabus is essentially shared; what differs is depth and question style.
 * Main rewards speed and coverage, Advanced rewards multi-step problems that
 * combine two or three chapters at once. Splitting them into two roadmaps would
 * duplicate ~95% of the nodes and imply you study them separately, which nobody
 * does. Where the difference matters it's in the `why`.
 *
 * ## The dependency that defines this exam
 *
 * Physics here is applied mathematics. Rotational dynamics without calculus is
 * memorisation; electrostatics without vectors is guesswork; AC circuits are
 * SHM wearing different symbols. The Maths chapters are therefore prerequisites
 * of Physics chapters in this graph, across subject lines — which is exactly
 * the structure a per-subject chapter list cannot express, and the main reason
 * students hit a wall in Physics that is really a wall in Maths.
 *
 * ## Weights and verification
 *
 * Weights are 1–5 and coarse; per-chapter question counts vary year to year.
 * **Check the official NTA/JAB syllabus for your exam year** — it has been
 * revised, with topics added and removed. See `guides/jee.ts`.
 */

import type { RoadmapDef } from "../types.js";

export const jee: RoadmapDef = {
  id: "jee",
  title: "JEE Main & Advanced",
  goal: "Build the Maths that makes the Physics possible",
  blurb: "Three subjects, one dependency graph — including the cross-subject links that decide who struggles.",
  kind: "exam",
  guideId: "jee",
  units: [
    { id: "m11", title: "Mathematics — Class 11", note: "Algebra and trigonometry. The toolkit." },
    { id: "m12", title: "Mathematics — Class 12", note: "Calculus. Roughly half of Maths, and the half Physics needs." },
    { id: "p11", title: "Physics — Class 11", note: "Mechanics, and it is where the exam is won or lost." },
    { id: "p12", title: "Physics — Class 12", note: "Electromagnetism and modern physics." },
    { id: "c11", title: "Chemistry — Class 11", note: "Physical and organic foundations." },
    { id: "c12", title: "Chemistry — Class 12", note: "Where the marks are most predictable." },
  ],
  path: [
    // ---- Mathematics, Class 11 -------------------------------------------
    { id: "m_sets", unit: "m11", weight: 2, title: "Sets, Relations & Functions", why: "Domain and range discipline. Half of all calculus errors are really function-domain errors.", domain: "math" },
    { id: "m_trig", unit: "m11", weight: 4, title: "Trigonometric Functions", why: "Identities and equations. Physics uses these constantly and without warning.", domain: "math", needs: ["m_sets"] },
    { id: "m_quad", unit: "m11", weight: 4, title: "Quadratics & Complex Numbers", why: "Roots, Argand plane, rotation. Complex numbers reappear in AC circuits.", domain: "math", needs: ["m_sets"] },
    { id: "m_pnc", unit: "m11", weight: 3, title: "Permutations & Combinations", why: "Counting properly. Short chapter, and a hard one to bluff.", domain: "math", needs: ["m_sets"] },
    { id: "m_binom", unit: "m11", weight: 3, title: "Binomial Theorem", why: "General term and expansions. Feeds series and approximations.", domain: "math", needs: ["m_pnc"] },
    { id: "m_seq", unit: "m11", weight: 3, title: "Sequences & Series", why: "AP, GP, and summation technique. Turns up inside other chapters more than alone.", domain: "math", needs: ["m_binom"] },
    { id: "m_lines", unit: "m11", weight: 3, title: "Straight Lines", why: "Coordinate geometry's grammar. Everything conic sits on it.", domain: "math", needs: ["m_quad"] },
    { id: "m_conics", unit: "m11", weight: 4, title: "Conic Sections", why: "Circle, parabola, ellipse, hyperbola. Heavily weighted and very pattern-based.", domain: "math", needs: ["m_lines"] },
    { id: "m_vectors", unit: "m11", weight: 4, title: "Vectors", why: "Dot and cross products. Physics is written in this language from mechanics onward.", domain: "math", needs: ["m_trig"] },
    { id: "m_limits", unit: "m11", weight: 4, title: "Limits & Derivatives", why: "The gateway to calculus. Rushing this makes all of Class 12 harder than it needs to be.", domain: "math", needs: ["m_trig", "m_sets"] },
    { id: "m_prob11", unit: "m11", weight: 3, title: "Probability", why: "Conditional probability and Bayes. Small, self-contained, reliably examined.", domain: "math", needs: ["m_pnc"] },
    { id: "m_matrices", unit: "m11", weight: 3, title: "Matrices & Determinants", why: "Operations, inverses, systems of equations. Mechanical marks once drilled.", domain: "math", needs: ["m_quad"] },

    // ---- Mathematics, Class 12 -------------------------------------------
    { id: "m_invtrig", unit: "m12", weight: 2, title: "Inverse Trigonometry", why: "Principal values and the domain traps that make answers wrong by a sign.", domain: "math", needs: ["m_trig"] },
    { id: "m_cont", unit: "m12", weight: 4, title: "Continuity & Differentiability", why: "Where derivatives exist and why. Advanced loves the edge cases.", domain: "math", needs: ["m_limits"] },
    { id: "m_appder", unit: "m12", weight: 4, title: "Applications of Derivatives", why: "Maxima, minima, tangents, rates. The most directly applicable chapter in Maths.", domain: "math", needs: ["m_cont"] },
    { id: "m_integ", unit: "m12", weight: 5, title: "Integrals", why: "Techniques and definite integrals. The largest single block of marks in Maths.", domain: "math", needs: ["m_cont"] },
    { id: "m_appint", unit: "m12", weight: 3, title: "Applications of Integrals", why: "Area under curves. Straightforward once integration is fluent.", domain: "math", needs: ["m_integ"] },
    { id: "m_diffeq", unit: "m12", weight: 3, title: "Differential Equations", why: "Separable and linear forms. Physics uses these for decay and circuits.", domain: "math", needs: ["m_integ"] },
    { id: "m_3d", unit: "m12", weight: 4, title: "3D Geometry", why: "Lines and planes in space. Almost purely formulaic — high return per hour.", domain: "math", needs: ["m_vectors"] },

    // ---- Physics, Class 11 -----------------------------------------------
    { id: "p_units", unit: "p11", weight: 2, title: "Units, Dimensions & Errors", why: "Dimensional checking catches wrong answers for free, all exam long.", domain: "physics" },
    { id: "p_kine", unit: "p11", weight: 4, title: "Kinematics", why: "Relative motion and projectiles — done properly with vectors, not memorised formulae.", domain: "physics", needs: ["p_units", "m_vectors"] },
    { id: "p_laws", unit: "p11", weight: 5, title: "Laws of Motion", why: "Free-body diagrams, constraints, pseudo-forces. The foundation of the whole paper.", domain: "physics", needs: ["p_kine"] },
    { id: "p_work", unit: "p11", weight: 4, title: "Work, Energy & Power", why: "Conservation, and variable forces — which is where the calculus enters.", domain: "physics", needs: ["p_laws", "m_integ"] },
    { id: "p_com", unit: "p11", weight: 4, title: "Centre of Mass & Collisions", why: "Momentum conservation. Advanced combines it with rotation constantly.", domain: "physics", needs: ["p_work"] },
    { id: "p_rot", unit: "p11", weight: 5, title: "Rotational Dynamics", why: "The hardest chapter in Class 11 Physics and among the most heavily weighted. Needs integration.", domain: "physics", needs: ["p_com", "m_integ"] },
    { id: "p_grav", unit: "p11", weight: 3, title: "Gravitation", why: "Fields, potential, orbits. Good practice for electrostatics' identical mathematics.", domain: "physics", needs: ["p_rot"] },
    { id: "p_shm", unit: "p11", weight: 4, title: "Simple Harmonic Motion", why: "Learn it as a differential equation, not a set of formulae — it returns in AC and waves.", domain: "physics", needs: ["p_work", "m_diffeq"] },
    { id: "p_elastic", unit: "p11", weight: 2, title: "Elasticity", why: "Stress, strain, moduli. Short and mechanical.", domain: "physics", needs: ["p_laws"] },
    { id: "p_fluids", unit: "p11", weight: 3, title: "Fluid Mechanics", why: "Bernoulli, viscosity, surface tension. Conceptual questions outnumber numerical ones.", domain: "physics", needs: ["p_elastic"] },
    { id: "p_thermal", unit: "p11", weight: 3, title: "Heat & Thermodynamics", why: "Processes, engines, entropy. Compare with the Chemistry version — conventions differ.", domain: "physics", needs: ["p_work"] },
    { id: "p_kinetic", unit: "p11", weight: 2, title: "Kinetic Theory", why: "Degrees of freedom and mean free path. Small and dependable.", domain: "physics", needs: ["p_thermal"] },
    { id: "p_waves", unit: "p11", weight: 4, title: "Waves & Sound", why: "Standing waves, beats, Doppler. Organ pipes and strings recur every year.", domain: "physics", needs: ["p_shm"] },

    // ---- Physics, Class 12 -----------------------------------------------
    { id: "p_estat", unit: "p12", weight: 4, title: "Electrostatics", why: "Gauss's law with symmetry. Mathematically identical to gravitation — reuse that.", domain: "physics", needs: ["p_grav", "m_integ"] },
    { id: "p_cap", unit: "p12", weight: 4, title: "Capacitance", why: "Combinations, dielectrics, energy. Circuit-reduction skill more than physics.", domain: "physics", needs: ["p_estat"] },
    { id: "p_current", unit: "p12", weight: 5, title: "Current Electricity", why: "Kirchhoff and instruments. High weight in Main and endlessly combinable in Advanced.", domain: "physics", needs: ["p_cap"] },
    { id: "p_magnet", unit: "p12", weight: 4, title: "Magnetic Effects of Current", why: "Biot-Savart and Ampère. Cross products from Maths, used in anger.", domain: "physics", needs: ["p_current", "m_vectors"] },
    { id: "p_induction", unit: "p12", weight: 4, title: "Electromagnetic Induction", why: "Faraday, Lenz, self and mutual inductance. Sign discipline is everything.", domain: "physics", needs: ["p_magnet"] },
    { id: "p_ac", unit: "p12", weight: 3, title: "Alternating Current", why: "Phasors and resonance — SHM and complex numbers in new clothes.", domain: "physics", needs: ["p_induction", "p_shm", "m_quad"] },
    { id: "p_emwave", unit: "p12", weight: 2, title: "Electromagnetic Waves", why: "Spectrum and displacement current. Short, factual, quick marks.", domain: "physics", needs: ["p_ac"] },
    { id: "p_rayopt", unit: "p12", weight: 4, title: "Ray Optics", why: "Lenses, mirrors, prisms, instruments. Formula-heavy and very scoring.", domain: "physics", needs: ["p_units"] },
    { id: "p_waveopt", unit: "p12", weight: 3, title: "Wave Optics", why: "YDSE, thin films, diffraction. Rests on Waves being solid.", domain: "physics", needs: ["p_rayopt", "p_waves"] },
    { id: "p_modern", unit: "p12", weight: 3, title: "Modern Physics", why: "Photoelectric effect, Bohr, nuclei. Highest marks-per-hour in the paper.", domain: "physics", needs: ["p_waveopt"] },
    { id: "p_semi", unit: "p12", weight: 3, title: "Semiconductors", why: "Diodes, transistors, gates. Self-contained; secure it early and revisit rarely.", domain: "physics", needs: ["p_modern"] },

    // ---- Chemistry, Class 11 ---------------------------------------------
    { id: "c_basic", unit: "c11", weight: 4, title: "Mole Concept & Stoichiometry", why: "Every numerical in Physical Chemistry depends on it. No exceptions.", domain: "tech" },
    { id: "c_atom", unit: "c11", weight: 3, title: "Atomic Structure", why: "Quantum numbers and orbitals. Explains periodicity rather than listing it.", domain: "tech", needs: ["c_basic"] },
    { id: "c_period", unit: "c11", weight: 2, title: "Periodic Properties", why: "Trends you can derive. Saves memorising Inorganic later.", domain: "tech", needs: ["c_atom"] },
    { id: "c_bond", unit: "c11", weight: 5, title: "Chemical Bonding", why: "Hybridisation, VSEPR, MOT. Feeds Organic and Inorganic in equal measure.", domain: "tech", needs: ["c_period"] },
    { id: "c_gas", unit: "c11", weight: 2, title: "Gaseous State", why: "Ideal and real gases, van der Waals. Short and formulaic.", domain: "tech", needs: ["c_basic"] },
    { id: "c_thermo", unit: "c11", weight: 4, title: "Thermodynamics & Thermochemistry", why: "Enthalpy, entropy, Gibbs. Sign conventions differ from Physics — note it once.", domain: "tech", needs: ["c_gas"] },
    { id: "c_equil", unit: "c11", weight: 5, title: "Equilibrium & Ionic Equilibrium", why: "Kc/Kp, pH, buffers, solubility. Two chapters of marks; consistently examined.", domain: "tech", needs: ["c_thermo"] },
    { id: "c_redox", unit: "c11", weight: 3, title: "Redox Reactions", why: "Oxidation states and balancing. Prerequisite for Electrochemistry.", domain: "tech", needs: ["c_basic"] },
    { id: "c_goc", unit: "c11", weight: 5, title: "Organic: General Principles", why: "Electronic effects, intermediates, stability. Organic is memorisation without it and logic with it.", domain: "tech", needs: ["c_bond"] },
    { id: "c_isomer", unit: "c11", weight: 4, title: "Isomerism & Stereochemistry", why: "R/S, E/Z, chirality. Advanced asks this directly and often.", domain: "tech", needs: ["c_goc"] },
    { id: "c_hydro", unit: "c11", weight: 4, title: "Hydrocarbons", why: "The first real mechanisms — addition, substitution, aromatic behaviour.", domain: "tech", needs: ["c_isomer"] },
    { id: "c_sblock", unit: "c11", weight: 2, title: "s-Block & Hydrogen", why: "Reason from periodicity rather than memorising reaction lists.", domain: "tech", needs: ["c_period"] },
    { id: "c_pblock11", unit: "c11", weight: 3, title: "p-Block (13–14)", why: "Boron and carbon families, and their anomalies.", domain: "tech", needs: ["c_bond"] },

    // ---- Chemistry, Class 12 ---------------------------------------------
    { id: "c_solid", unit: "c12", weight: 3, title: "Solid State", why: "Unit cells and packing efficiency. Almost purely numerical — very scoring.", domain: "tech", needs: ["c_bond"] },
    { id: "c_sol", unit: "c12", weight: 3, title: "Solutions", why: "Colligative properties and Raoult's law. Formula-driven marks.", domain: "tech", needs: ["c_equil"] },
    { id: "c_electro", unit: "c12", weight: 3, title: "Electrochemistry", why: "Nernst, conductance, electrolysis. Redox and thermodynamics together.", domain: "tech", needs: ["c_redox", "c_thermo"] },
    { id: "c_kinetics", unit: "c12", weight: 3, title: "Chemical Kinetics", why: "Order, rate laws, Arrhenius. Graph interpretation is the examined skill.", domain: "tech", needs: ["c_equil"] },
    { id: "c_surface", unit: "c12", weight: 2, title: "Surface Chemistry", why: "Adsorption, colloids, catalysis. Mostly recall, quick to secure.", domain: "tech", needs: ["c_kinetics"] },
    { id: "c_pblock12", unit: "c12", weight: 3, title: "p-Block (15–18)", why: "Nitrogen to noble gases. Preparations and structures dominate.", domain: "tech", needs: ["c_pblock11"] },
    { id: "c_dblock", unit: "c12", weight: 3, title: "d- & f-Block", why: "Transition metals, colour, magnetic behaviour, lanthanide contraction.", domain: "tech", needs: ["c_period", "c_bond"] },
    { id: "c_coord", unit: "c12", weight: 4, title: "Coordination Compounds", why: "Isomerism, CFT, magnetic moments. One of the best-value chapters in the paper.", domain: "tech", needs: ["c_dblock"] },
    { id: "c_halo", unit: "c12", weight: 3, title: "Haloalkanes & Haloarenes", why: "SN1 versus SN2 with stereochemistry. Reasoning, not recall.", domain: "tech", needs: ["c_hydro"] },
    { id: "c_alcohol", unit: "c12", weight: 4, title: "Alcohols, Phenols & Ethers", why: "Central to the conversion questions that appear every year.", domain: "tech", needs: ["c_halo"] },
    { id: "c_carbonyl", unit: "c12", weight: 5, title: "Carbonyl Compounds", why: "Aldehydes, ketones, acids and a dozen named reactions. The busiest organic chapter.", domain: "tech", needs: ["c_alcohol"] },
    { id: "c_amine", unit: "c12", weight: 3, title: "Amines", why: "Basicity order and diazonium salts — the route to most aromatic conversions.", domain: "tech", needs: ["c_carbonyl"] },
    { id: "c_biomol", unit: "c12", weight: 2, title: "Biomolecules & Polymers", why: "Largely factual. Low weight, but cheap marks near the exam.", domain: "tech", needs: ["c_carbonyl"] },
    { id: "c_practical", unit: "c12", weight: 3, title: "Qualitative Analysis", why: "Salt analysis and functional group tests. Asked directly, and easy to neglect.", domain: "tech", needs: ["c_amine", "c_pblock12"] },
  ],
  branches: [
    { id: "x_pyq", title: "Previous years' papers", why: "The highest-return activity available. Papers teach the examiner's habits, which no textbook does.", domain: "practice", needs: ["p_rot", "m_integ", "c_carbonyl"] },
    { id: "x_advanced", title: "Multi-chapter problems", why: "What separates Advanced from Main: one problem needing rotation and energy and calculus at once.", domain: "practice", needs: ["x_pyq"] },
    { id: "x_speed", title: "Timed sectional tests", why: "Main is as much a speed exam as a knowledge one. Accuracy under a clock is a separate skill.", domain: "practice", needs: ["x_pyq"] },
    { id: "x_errors", title: "An error notebook", why: "The one habit that most reliably raises a plateaued score. Revisit mistakes, not comfort topics.", domain: "practice", needs: ["x_speed"] },
    { id: "x_formula", title: "A formula sheet you wrote", why: "Writing it is the revision. A downloaded one is somebody else's memory.", domain: "practice", needs: ["p_ac", "m_3d"] },
  ],
};
