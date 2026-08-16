/**
 * "How Things Work" — the curious layer's content, in the spirit of the book.
 * Curated stand-ins until the AI explainer ships; the shape is final.
 */
export interface Explainer {
  id: string;
  q: string;
  title: string;
  domain: string;
  blurb: string;
  sparks: string[];
}

export const HOW_THINGS_WORK: Explainer[] = [
  { id: "planes", q: "How do planes fly?", title: "How planes fly", domain: "physics", blurb: "A wing is shaped so air over the top moves faster and presses down less than the air below. That pressure difference — plus the wing tilting air downward — pushes the plane up.", sparks: ["Why do heavier planes need longer runways?", "What is drag?", "How do birds fly?"] },
  { id: "sky-blue", q: "Why is the sky blue?", title: "Why the sky is blue", domain: "space", blurb: "Sunlight is every colour mixed. Air scatters short blue wavelengths far more than red, so blue reaches your eyes from all over the sky. At sunset the light travels through more air, the blue scatters away, and red is left.", sparks: ["Why are sunsets red?", "What is a wavelength?", "Why is space black?"] },
  { id: "internet", q: "How does the internet work?", title: "How the internet works", domain: "tech", blurb: "Your message is split into packets, each stamped with a destination. Routers pass them hop by hop along the best path, and the far end reassembles them in order — even if each took a different route.", sparks: ["What is an IP address?", "How does DNS work?", "What is a router?"] },
  { id: "vaccines", q: "How do vaccines work?", title: "How vaccines work", domain: "bio", blurb: "A vaccine shows your immune system a harmless preview of a germ. Your body practises making antibodies and remembers, so if the real germ arrives the response is already built and fast.", sparks: ["What are antibodies?", "How does mRNA work?", "Why do some need boosters?"] },
  { id: "engine", q: "How does a car engine work?", title: "How car engines work", domain: "tech", blurb: "Fuel and air are squeezed in a cylinder and lit by a spark. The explosion drives a piston; pistons firing in turn spin a crankshaft, which — geared down — turns the wheels.", sparks: ["What is horsepower?", "How do electric motors differ?", "What does a gearbox do?"] },
  { id: "money", q: "How does money work?", title: "How money works", domain: "econ", blurb: "Money is a shared agreement so we don't have to barter. Its value rests on trust and scarcity — print far more than there are goods and each unit buys less. That's inflation.", sparks: ["What is inflation?", "How do banks create money?", "What backs a currency?"] },
  { id: "gravity", q: "What is gravity?", title: "How gravity works", domain: "physics", blurb: "Mass bends the space around it, and things move along that curve — what we feel as a pull toward big masses like Earth. More mass, deeper bend, stronger pull.", sparks: ["Why don't astronauts float away?", "What is mass?", "How do orbits work?"] },
  { id: "photosynthesis", q: "How do plants make food?", title: "How photosynthesis works", domain: "bio", blurb: "Leaves catch sunlight to split water and pull CO₂ from the air, snapping them into sugar. Oxygen is the leftover. Plants build themselves out of air, water, and light.", sparks: ["Why are leaves green?", "What is respiration?", "How do trees move water up?"] },
  { id: "battery", q: "How do batteries store energy?", title: "How batteries work", domain: "tech", blurb: "A battery holds two materials that 'want' to swap electrons. Close a circuit and electrons flow — that's the current. Charging pushes them back, ready to go again.", sparks: ["What is electric current?", "Why do batteries die?", "How do solar panels work?"] },
  { id: "earthquake", q: "What causes earthquakes?", title: "How earthquakes happen", domain: "earth", blurb: "The crust is broken into slabs that grind past each other. They snag, strain builds for years, then slip all at once — releasing energy as waves that shake the ground.", sparks: ["What is a tectonic plate?", "How is magnitude measured?", "Can quakes be predicted?"] },
];

export function searchExplainers(query: string): Explainer[] {
  const q = query.trim().toLowerCase();
  if (!q) return HOW_THINGS_WORK;
  return HOW_THINGS_WORK.filter(
    (e) => e.q.toLowerCase().includes(q) || e.title.toLowerCase().includes(q) || e.domain.includes(q) || e.sparks.some((s) => s.toLowerCase().includes(q)),
  );
}
