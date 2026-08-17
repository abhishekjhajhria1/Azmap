/**
 * NEET UG — the medical entrance syllabus as a prerequisite graph.
 *
 * ## Why this is a graph and not a list
 *
 * A syllabus is published as a list of chapters per subject, which is how it's
 * examined and the worst possible way to learn it. Thermodynamics in Chemistry
 * genuinely needs Chemical Equilibrium's vocabulary; Human Physiology is far
 * easier after Cell Structure; Genetics is guesswork until you've done Cell
 * Division. Those dependencies are real, and a list hides all of them. The
 * `needs` below are what turn "58 chapters" into "here are the four you can
 * actually start today".
 *
 * ## What the weights mean
 *
 * 1–5, coarse on purpose. Biology carries roughly half of NEET's marks and the
 * weights reflect that, but per-chapter question counts move year to year and
 * pretending to know them exactly would be false precision dressed up as help.
 * Treat them as "spend more time here", not as a mark scheme.
 *
 * ## Verify the syllabus
 *
 * NTA has revised the NEET syllabus more than once in recent years, dropping
 * whole chapters. This graph covers the stable core, but **check the official
 * syllabus for your exam year before deciding not to study something.** The
 * guide (`guides/neet.ts`) says the same thing where a student will see it.
 */

import type { RoadmapDef } from "../types.js";

export const neet: RoadmapDef = {
  id: "neet-ug",
  title: "NEET UG",
  goal: "Cover the syllabus in an order that actually builds",
  blurb: "Physics, Chemistry and Biology as one dependency graph — not three lists of chapters.",
  kind: "exam",
  guideId: "neet-ug",
  units: [
    { id: "b11", title: "Biology — Class 11", note: "Half the paper starts here. Structure before function." },
    { id: "b12", title: "Biology — Class 12", note: "Genetics, ecology and the highest-yield chapters in the exam." },
    { id: "c11", title: "Chemistry — Class 11", note: "Physical and organic foundations everything later leans on." },
    { id: "c12", title: "Chemistry — Class 12", note: "Where organic mechanisms and coordination chemistry pay off." },
    { id: "p11", title: "Physics — Class 11", note: "Mechanics. The subject most students underestimate." },
    { id: "p12", title: "Physics — Class 12", note: "Electricity, magnetism and optics — reliably heavy in the paper." },
  ],
  path: [
    // ---- Biology, Class 11 ------------------------------------------------
    { id: "b_living", unit: "b11", weight: 2, title: "The Living World", why: "Taxonomy and nomenclature. Short, scoring, and often skipped for being dull.", domain: "bio" },
    { id: "b_class", unit: "b11", weight: 3, title: "Biological Classification", why: "Five kingdoms, viruses, lichens. Dense with directly-askable facts.", domain: "bio", needs: ["b_living"] },
    { id: "b_plantk", unit: "b11", weight: 3, title: "Plant Kingdom", why: "Algae to angiosperms. Life cycles here recur throughout Botany.", domain: "bio", needs: ["b_class"] },
    { id: "b_animalk", unit: "b11", weight: 4, title: "Animal Kingdom", why: "Phylum characteristics and examples. Consistently one of the highest-yield chapters.", domain: "bio", needs: ["b_class"] },
    { id: "b_morph", unit: "b11", weight: 4, title: "Morphology of Flowering Plants", why: "The vocabulary the rest of Botany is written in. Learn the terms properly once.", domain: "bio", needs: ["b_plantk"] },
    { id: "b_anat", unit: "b11", weight: 3, title: "Anatomy of Flowering Plants", why: "Tissues and their arrangement. Diagram-heavy, and diagrams are what get asked.", domain: "bio", needs: ["b_morph"] },
    { id: "b_animalorg", unit: "b11", weight: 2, title: "Structural Organisation in Animals", why: "Tissue types, and the earthworm-cockroach-frog comparisons.", domain: "bio", needs: ["b_animalk"] },
    { id: "b_cell", unit: "b11", weight: 5, title: "Cell: The Unit of Life", why: "Every later chapter assumes it. Organelles, membranes, prokaryote versus eukaryote.", domain: "bio", needs: ["b_living"] },
    { id: "b_biomol", unit: "b11", weight: 4, title: "Biomolecules", why: "Proteins, enzymes, nucleic acids. Bridges directly into Chemistry and into Genetics.", domain: "bio", needs: ["b_cell"] },
    { id: "b_division", unit: "b11", weight: 4, title: "Cell Cycle & Cell Division", why: "Mitosis and meiosis. Genetics is unlearnable without meiosis being solid.", domain: "bio", needs: ["b_cell"] },
    { id: "b_photo", unit: "b11", weight: 4, title: "Photosynthesis", why: "The light and dark reactions, C3 versus C4. Reliably examined every year.", domain: "bio", needs: ["b_anat", "b_biomol"] },
    { id: "b_resp", unit: "b11", weight: 4, title: "Respiration in Plants", why: "Glycolysis, Krebs, ETC. Learn the ATP arithmetic; it gets asked numerically.", domain: "bio", needs: ["b_biomol"] },
    { id: "b_growth", unit: "b11", weight: 2, title: "Plant Growth & Development", why: "Hormones and their effects. Small chapter, easy marks.", domain: "bio", needs: ["b_photo"] },
    { id: "b_digest", unit: "b11", weight: 3, title: "Digestion & Absorption", why: "Human physiology begins. Enzymes, disorders, and the deficiency questions.", domain: "bio", needs: ["b_biomol", "b_animalorg"] },
    { id: "b_breath", unit: "b11", weight: 3, title: "Breathing & Exchange of Gases", why: "Transport of gases and the dissociation curve — a favourite for graph questions.", domain: "bio", needs: ["b_digest"] },
    { id: "b_circ", unit: "b11", weight: 4, title: "Body Fluids & Circulation", why: "The cardiac cycle and ECG. Dense, diagram-driven, and heavily weighted.", domain: "bio", needs: ["b_breath"] },
    { id: "b_excr", unit: "b11", weight: 3, title: "Excretory Products", why: "The nephron in detail. Counter-current mechanism is the part that gets asked.", domain: "bio", needs: ["b_circ"] },
    { id: "b_loco", unit: "b11", weight: 3, title: "Locomotion & Movement", why: "Muscle contraction at molecular level, plus joints and skeletal disorders.", domain: "bio", needs: ["b_animalorg"] },
    { id: "b_neural", unit: "b11", weight: 3, title: "Neural Control & Coordination", why: "Action potential and synapse. Overlaps usefully with Physics electricity.", domain: "bio", needs: ["b_cell", "b_loco"] },
    { id: "b_chem", unit: "b11", weight: 3, title: "Chemical Coordination", why: "Endocrine glands and hormones. Pure recall — build a table and drill it.", domain: "bio", needs: ["b_neural"] },

    // ---- Biology, Class 12 ------------------------------------------------
    { id: "b_flower", unit: "b12", weight: 4, title: "Sexual Reproduction in Flowering Plants", why: "Embryo sac, double fertilisation, apomixis. Very high yield, entirely learnable.", domain: "bio", needs: ["b_morph", "b_division"] },
    { id: "b_humanrep", unit: "b12", weight: 4, title: "Human Reproduction", why: "Gametogenesis and the menstrual cycle. Diagrams and sequences dominate.", domain: "bio", needs: ["b_division", "b_chem"] },
    { id: "b_rephealth", unit: "b12", weight: 2, title: "Reproductive Health", why: "Contraception and ART. Short, factual, frequently asked.", domain: "bio", needs: ["b_humanrep"] },
    { id: "b_inherit", unit: "b12", weight: 5, title: "Principles of Inheritance", why: "Mendel, linkage, pedigrees. Problem-solving, not recall — practise, don't read.", domain: "bio", needs: ["b_division"] },
    { id: "b_molbio", unit: "b12", weight: 5, title: "Molecular Basis of Inheritance", why: "Replication, transcription, translation, lac operon. Arguably the single heaviest chapter.", domain: "bio", needs: ["b_inherit", "b_biomol"] },
    { id: "b_evo", unit: "b12", weight: 3, title: "Evolution", why: "Hardy-Weinberg gets asked numerically. The rest is a timeline worth memorising.", domain: "bio", needs: ["b_inherit"] },
    { id: "b_health", unit: "b12", weight: 4, title: "Human Health & Disease", why: "Immunity, pathogens, and the disease-organism pairs. Straight recall, lots of it.", domain: "bio", needs: ["b_circ", "b_evo"] },
    { id: "b_microbes", unit: "b12", weight: 3, title: "Microbes in Human Welfare", why: "Named organisms and their products. Make the table; the questions come from it.", domain: "bio", needs: ["b_class"] },
    { id: "b_biotechp", unit: "b12", weight: 4, title: "Biotechnology: Principles", why: "Restriction enzymes, vectors, PCR. Follows straight from molecular biology.", domain: "bio", needs: ["b_molbio"] },
    { id: "b_biotecha", unit: "b12", weight: 3, title: "Biotechnology: Applications", why: "Bt crops, RNAi, insulin, gene therapy. Case-by-case; each one is a question.", domain: "bio", needs: ["b_biotechp"] },
    { id: "b_orgpop", unit: "b12", weight: 3, title: "Organisms & Populations", why: "Population interactions and growth curves. The equations do get asked.", domain: "bio", needs: ["b_evo"] },
    { id: "b_ecosys", unit: "b12", weight: 3, title: "Ecosystem", why: "Energy flow, pyramids, productivity. Numerical and very scoring.", domain: "bio", needs: ["b_orgpop", "b_photo"] },
    { id: "b_biodiv", unit: "b12", weight: 3, title: "Biodiversity & Conservation", why: "Patterns, hotspots, and named conservation efforts. Cheap marks late in prep.", domain: "bio", needs: ["b_ecosys"] },

    // ---- Chemistry, Class 11 ---------------------------------------------
    { id: "c_basic", unit: "c11", weight: 4, title: "Some Basic Concepts", why: "Mole concept and stoichiometry. Get this wrong and every calculation after it is wrong.", domain: "tech" },
    { id: "c_atom", unit: "c11", weight: 3, title: "Structure of Atom", why: "Quantum numbers and configurations — the basis of the whole periodic table.", domain: "tech", needs: ["c_basic"] },
    { id: "c_period", unit: "c11", weight: 3, title: "Classification & Periodicity", why: "Trends you can reason from instead of memorising. Pays back all year.", domain: "tech", needs: ["c_atom"] },
    { id: "c_bond", unit: "c11", weight: 5, title: "Chemical Bonding", why: "Hybridisation, VSEPR, MOT. Feeds Inorganic and Organic in equal measure.", domain: "tech", needs: ["c_period"] },
    { id: "c_thermo", unit: "c11", weight: 4, title: "Thermodynamics", why: "Enthalpy, entropy, spontaneity. Overlaps with Physics; sign conventions differ — watch that.", domain: "tech", needs: ["c_basic"] },
    { id: "c_equil", unit: "c11", weight: 5, title: "Equilibrium", why: "Kc/Kp, acids and bases, pH, buffers. Two chapters' worth of marks in one.", domain: "tech", needs: ["c_thermo"] },
    { id: "c_redox", unit: "c11", weight: 3, title: "Redox Reactions", why: "Oxidation numbers and balancing. Prerequisite for Electrochemistry.", domain: "tech", needs: ["c_basic"] },
    { id: "c_sblock", unit: "c11", weight: 2, title: "s-Block Elements", why: "Alkali and alkaline earth metals. Reasoning from periodicity beats rote here.", domain: "tech", needs: ["c_period"] },
    { id: "c_pblock11", unit: "c11", weight: 3, title: "p-Block (Groups 13–14)", why: "Boron and carbon families. Anomalous behaviour is the examinable part.", domain: "tech", needs: ["c_bond"] },
    { id: "c_goc", unit: "c11", weight: 5, title: "Organic Chemistry: Basic Principles", why: "Inductive and resonance effects, intermediates, nomenclature. Organic is unlearnable without it.", domain: "tech", needs: ["c_bond"] },
    { id: "c_hydro", unit: "c11", weight: 4, title: "Hydrocarbons", why: "Alkanes to aromatics, and the first real mechanisms. Where organic starts to click.", domain: "tech", needs: ["c_goc"] },

    // ---- Chemistry, Class 12 ---------------------------------------------
    { id: "c_sol", unit: "c12", weight: 3, title: "Solutions", why: "Colligative properties. Formula-driven and reliably scoring.", domain: "tech", needs: ["c_equil"] },
    { id: "c_electro", unit: "c12", weight: 3, title: "Electrochemistry", why: "Nernst, conductance, electrolysis. Sits on redox and thermodynamics together.", domain: "tech", needs: ["c_redox", "c_thermo"] },
    { id: "c_kinetics", unit: "c12", weight: 3, title: "Chemical Kinetics", why: "Rate laws, order, Arrhenius. Graph-reading questions are common.", domain: "tech", needs: ["c_equil"] },
    { id: "c_pblock12", unit: "c12", weight: 3, title: "p-Block (Groups 15–18)", why: "Nitrogen through the noble gases. Heavy on named compounds and preparations.", domain: "tech", needs: ["c_pblock11"] },
    { id: "c_dblock", unit: "c12", weight: 3, title: "d- and f-Block Elements", why: "Transition metals, colour, magnetism, and lanthanide contraction.", domain: "tech", needs: ["c_period", "c_bond"] },
    { id: "c_coord", unit: "c12", weight: 4, title: "Coordination Compounds", why: "Isomerism, CFT, nomenclature. Consistently one of the best-value chapters.", domain: "tech", needs: ["c_dblock"] },
    { id: "c_halo", unit: "c12", weight: 3, title: "Haloalkanes & Haloarenes", why: "SN1 versus SN2 — the first mechanism you must reason about, not recall.", domain: "tech", needs: ["c_hydro"] },
    { id: "c_alcohol", unit: "c12", weight: 4, title: "Alcohols, Phenols & Ethers", why: "Conversions and named reactions. Central to the organic conversion questions.", domain: "tech", needs: ["c_halo"] },
    { id: "c_carbonyl", unit: "c12", weight: 5, title: "Aldehydes, Ketones & Acids", why: "The busiest chapter in organic. Aldol, Cannizzaro, and a dozen named reactions.", domain: "tech", needs: ["c_alcohol"] },
    { id: "c_amine", unit: "c12", weight: 3, title: "Amines", why: "Basicity and diazonium chemistry — the route to most aromatic conversions.", domain: "tech", needs: ["c_carbonyl"] },
    { id: "c_biomolc", unit: "c12", weight: 3, title: "Biomolecules", why: "Carbohydrates, proteins, vitamins. Overlaps with Biology — study them together.", domain: "tech", needs: ["c_carbonyl", "b_biomol"] },

    // ---- Physics, Class 11 -----------------------------------------------
    { id: "p_units", unit: "p11", weight: 2, title: "Units & Measurement", why: "Dimensional analysis and error. Cheap marks, and it catches wrong answers later.", domain: "physics" },
    { id: "p_kine", unit: "p11", weight: 4, title: "Kinematics", why: "Motion in a line and a plane. Graphs and vectors — the language of everything ahead.", domain: "physics", needs: ["p_units"] },
    { id: "p_laws", unit: "p11", weight: 5, title: "Laws of Motion", why: "Free-body diagrams and friction. If mechanics is shaky, it starts here.", domain: "physics", needs: ["p_kine"] },
    { id: "p_work", unit: "p11", weight: 4, title: "Work, Energy & Power", why: "Conservation arguments that solve problems force analysis can't.", domain: "physics", needs: ["p_laws"] },
    { id: "p_rot", unit: "p11", weight: 4, title: "Rotational Motion", why: "Moment of inertia and torque. Hard, heavily weighted, and worth the time.", domain: "physics", needs: ["p_work"] },
    { id: "p_grav", unit: "p11", weight: 3, title: "Gravitation", why: "Orbits and potential energy. Follows directly from circular motion.", domain: "physics", needs: ["p_rot"] },
    { id: "p_solids", unit: "p11", weight: 2, title: "Mechanical Properties of Solids", why: "Stress, strain, moduli. Short and formula-driven.", domain: "physics", needs: ["p_laws"] },
    { id: "p_fluids", unit: "p11", weight: 3, title: "Mechanical Properties of Fluids", why: "Bernoulli, viscosity, surface tension. Applications get asked more than derivations.", domain: "physics", needs: ["p_solids"] },
    { id: "p_thermal", unit: "p11", weight: 3, title: "Thermal Properties of Matter", why: "Expansion, calorimetry, conduction. Straightforward marks.", domain: "physics", needs: ["p_units"] },
    { id: "p_thermo", unit: "p11", weight: 3, title: "Thermodynamics", why: "Laws, processes, engines. Compare carefully with the Chemistry treatment.", domain: "physics", needs: ["p_thermal", "p_work"] },
    { id: "p_kinetic", unit: "p11", weight: 2, title: "Kinetic Theory", why: "Gas equations and degrees of freedom. Small chapter, quick returns.", domain: "physics", needs: ["p_thermo"] },
    { id: "p_osc", unit: "p11", weight: 4, title: "Oscillations", why: "SHM. Its mathematics reappears in AC circuits and in waves.", domain: "physics", needs: ["p_work"] },
    { id: "p_waves", unit: "p11", weight: 3, title: "Waves", why: "Superposition, beats, Doppler. Sets up wave optics later.", domain: "physics", needs: ["p_osc"] },

    // ---- Physics, Class 12 -----------------------------------------------
    { id: "p_estat", unit: "p12", weight: 4, title: "Electric Charges & Fields", why: "Coulomb and Gauss. Symmetry arguments do most of the work.", domain: "physics", needs: ["p_kine"] },
    { id: "p_epot", unit: "p12", weight: 4, title: "Potential & Capacitance", why: "Potential, then capacitors in combination. Very reliably examined.", domain: "physics", needs: ["p_estat"] },
    { id: "p_current", unit: "p12", weight: 5, title: "Current Electricity", why: "Kirchhoff, meter bridge, potentiometer. Among the highest-yield chapters in the paper.", domain: "physics", needs: ["p_epot"] },
    { id: "p_magnet", unit: "p12", weight: 4, title: "Moving Charges & Magnetism", why: "Biot-Savart, Ampère, the cyclotron. Geometry-heavy — draw everything.", domain: "physics", needs: ["p_current"] },
    { id: "p_magmat", unit: "p12", weight: 2, title: "Magnetism & Matter", why: "Materials and Earth's field. Mostly recall.", domain: "physics", needs: ["p_magnet"] },
    { id: "p_induction", unit: "p12", weight: 4, title: "Electromagnetic Induction", why: "Faraday and Lenz. Sign conventions are where marks are lost.", domain: "physics", needs: ["p_magnet"] },
    { id: "p_ac", unit: "p12", weight: 3, title: "Alternating Current", why: "LCR, resonance, phasors. Reuses the SHM mathematics directly.", domain: "physics", needs: ["p_induction", "p_osc"] },
    { id: "p_emwaves", unit: "p12", weight: 2, title: "Electromagnetic Waves", why: "The spectrum and its uses. Short, factual, easy.", domain: "physics", needs: ["p_ac"] },
    { id: "p_rayopt", unit: "p12", weight: 4, title: "Ray Optics", why: "Mirrors, lenses, instruments. Sign convention errors cost more marks here than anywhere.", domain: "physics", needs: ["p_units"] },
    { id: "p_waveopt", unit: "p12", weight: 3, title: "Wave Optics", why: "Interference, diffraction, polarisation. Rests on Waves.", domain: "physics", needs: ["p_rayopt", "p_waves"] },
    { id: "p_dual", unit: "p12", weight: 3, title: "Dual Nature of Radiation", why: "Photoelectric effect and de Broglie. Small, formula-driven, dependable.", domain: "physics", needs: ["p_waveopt"] },
    { id: "p_atoms", unit: "p12", weight: 2, title: "Atoms", why: "Bohr model and spectra. Pairs directly with Chemistry's Structure of Atom.", domain: "physics", needs: ["p_dual", "c_atom"] },
    { id: "p_nuclei", unit: "p12", weight: 3, title: "Nuclei", why: "Binding energy, decay, mass defect. Numerical and consistently asked.", domain: "physics", needs: ["p_atoms"] },
    { id: "p_semi", unit: "p12", weight: 3, title: "Semiconductors", why: "Diodes, rectifiers, logic gates. Self-contained and quick to secure.", domain: "physics", needs: ["p_atoms"] },
  ],
  branches: [
    { id: "x_pyq", title: "Previous years' papers", why: "The single highest-return activity in the whole preparation. Start earlier than feels comfortable.", domain: "practice", needs: ["b_molbio", "c_carbonyl", "p_current"] },
    { id: "x_ncert", title: "NCERT line-by-line (Biology)", why: "NEET Biology is drawn from NCERT wording. Reading it as the source, not a summary, is the strategy.", domain: "practice", needs: ["b_biodiv"] },
    { id: "x_diagrams", title: "Diagram practice", why: "Labelled diagrams appear directly as questions. Drawing beats re-reading.", domain: "practice", needs: ["b_anat", "b_circ"] },
    { id: "x_mocks", title: "Full-length mocks", why: "180 questions in 180 minutes is a stamina skill, trained separately from knowing content.", domain: "practice", needs: ["x_pyq"] },
    { id: "x_errors", title: "An error notebook", why: "Re-reading what you know is comfortable; revisiting what you got wrong is what moves the score.", domain: "practice", needs: ["x_mocks"] },
  ],
};
