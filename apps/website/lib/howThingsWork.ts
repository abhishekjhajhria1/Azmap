/**
 * "How Things Work" — the curious layer, open to every user.
 *
 * Short, book-style explainers (in the spirit of *The Way Things Work*) that
 * anyone can browse, read, and drop onto their own map. The blurbs are curated
 * stand-ins for the AI explanations we can't yet afford to generate; the
 * `sparks` are follow-up questions that let curiosity branch. This is exactly
 * the "feed later" content — the shape is final.
 */

export interface Explainer {
  id: string;
  /** The question, as a curious person would ask it. */
  q: string;
  /** The map-node title once added. */
  title: string;
  domain: string;
  /** A short "how it works" answer. */
  blurb: string;
  /** Follow-up questions to keep exploring. */
  sparks: string[];
}

export const HOW_THINGS_WORK: Explainer[] = [
  {
    id: "planes",
    q: "How do planes fly?",
    title: "How planes fly",
    domain: "physics",
    blurb:
      "A wing is shaped so air moving over the top travels faster and presses down less than the air below. That pressure difference — plus the wing tilting air downward — pushes the whole plane up. Engines just keep enough air flowing over the wings for lift to beat gravity.",
    sparks: ["Why do heavier planes need longer runways?", "What is drag?", "How do birds fly?"],
  },
  {
    id: "sky-blue",
    q: "Why is the sky blue?",
    title: "Why the sky is blue",
    domain: "space",
    blurb:
      "Sunlight is a mix of all colours. Air molecules scatter short, blue wavelengths far more than long, red ones, so blue light bounces around the sky and reaches your eyes from every direction. At sunset the light travels through more air, the blue scatters away, and you're left with red.",
    sparks: ["Why are sunsets red?", "What is a wavelength?", "Why is space black?"],
  },
  {
    id: "internet",
    q: "How does the internet work?",
    title: "How the internet works",
    domain: "tech",
    blurb:
      "Your message is chopped into small packets, each stamped with a destination address. Routers pass packets hop by hop toward that address, choosing the best available path. At the far end the packets are reassembled in order — even though each may have taken a different route.",
    sparks: ["What is an IP address?", "How does DNS work?", "What is a router?"],
  },
  {
    id: "vaccines",
    q: "How do vaccines work?",
    title: "How vaccines work",
    domain: "bio",
    blurb:
      "A vaccine shows your immune system a harmless preview of a germ — a piece of it, or a weakened version. Your body practises making antibodies against it, then remembers. If the real germ arrives, the response is already built and fast enough to stop you getting sick.",
    sparks: ["What are antibodies?", "How does mRNA work?", "Why do some need boosters?"],
  },
  {
    id: "engine",
    q: "How does a car engine work?",
    title: "How car engines work",
    domain: "tech",
    blurb:
      "Fuel and air are squeezed in a cylinder and lit by a spark. The explosion shoves a piston down; several pistons firing in turn spin a crankshaft. That rotation, geared down, turns the wheels. It's controlled fire, thousands of tiny explosions a minute, turned into motion.",
    sparks: ["What is horsepower?", "How do electric motors differ?", "What does a gearbox do?"],
  },
  {
    id: "money",
    q: "How does money work?",
    title: "How money works",
    domain: "econ",
    blurb:
      "Money is a shared agreement: we all accept these tokens as worth something, so we don't have to barter. Its value rests on trust and scarcity — if far more is printed than there are goods to buy, each unit buys less. That's inflation.",
    sparks: ["What is inflation?", "How do banks create money?", "What backs a currency?"],
  },
  {
    id: "gravity",
    q: "What is gravity?",
    title: "How gravity works",
    domain: "physics",
    blurb:
      "Every mass bends the space around it, and things move along that curved space — what we feel as a pull toward big masses like Earth. The more mass, the deeper the bend, the stronger the pull. It's why planets orbit and apples fall.",
    sparks: ["Why don't astronauts float away from Earth?", "What is mass?", "How do orbits work?"],
  },
  {
    id: "wifi",
    q: "How does Wi-Fi work?",
    title: "How Wi-Fi works",
    domain: "tech",
    blurb:
      "Your router turns data into radio waves and broadcasts them; your device's antenna picks them up and turns them back into data, and vice-versa. It's the same idea as radio, just at high frequencies and switching direction fast enough to feel two-way.",
    sparks: ["What is a radio wave?", "Why does Wi-Fi get weaker through walls?", "How is 5G different?"],
  },
  {
    id: "photosynthesis",
    q: "How do plants make food?",
    title: "How photosynthesis works",
    domain: "bio",
    blurb:
      "Leaves catch sunlight and use its energy to split water and pull carbon dioxide from the air, snapping them together into sugar. Oxygen is the leftover, breathed out for the rest of us. Plants literally build themselves out of air, water, and light.",
    sparks: ["Why are leaves green?", "What is cellular respiration?", "How do trees move water up?"],
  },
  {
    id: "earthquake",
    q: "What causes earthquakes?",
    title: "How earthquakes happen",
    domain: "earth",
    blurb:
      "Earth's crust is broken into slabs that grind against each other. They snag, strain builds for years, then they slip all at once — releasing the stored energy as waves that shake the ground. The bigger the sudden slip, the stronger the quake.",
    sparks: ["What is a tectonic plate?", "How is magnitude measured?", "Can earthquakes be predicted?"],
  },
  {
    id: "fridge",
    q: "How does a fridge stay cold?",
    title: "How fridges work",
    domain: "everyday",
    blurb:
      "A fridge doesn't add cold — it moves heat out. A special fluid evaporates inside, soaking up heat from the food, then is squeezed back to liquid outside, dumping that heat into the room. Repeat endlessly and the inside stays cold.",
    sparks: ["Why is the back of a fridge warm?", "How does an air conditioner work?", "What is evaporation?"],
  },
  {
    id: "battery",
    q: "How do batteries store energy?",
    title: "How batteries work",
    domain: "tech",
    blurb:
      "A battery holds two materials that 'want' to swap electrons. Connect a circuit and electrons flow from one to the other — that flow is your current. Charging pushes them back, ready to go again. It's chemistry turned into electricity on demand.",
    sparks: ["What is electric current?", "Why do batteries die?", "How do solar panels make electricity?"],
  },
];

export function searchExplainers(query: string): Explainer[] {
  const q = query.trim().toLowerCase();
  if (!q) return HOW_THINGS_WORK;
  return HOW_THINGS_WORK.filter(
    (e) =>
      e.q.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      e.domain.includes(q) ||
      e.sparks.some((s) => s.toLowerCase().includes(q)),
  );
}
