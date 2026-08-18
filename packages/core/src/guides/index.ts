/**
 * The guide registry.
 *
 * Guides are the prose beside a roadmap: strategy, weighting, what to do in the
 * last month. Looked up by the roadmap's `guideId`, so a roadmap can exist
 * without one and a guide never has to be duplicated per surface.
 */

export * from "./types.js";

import type { Guide } from "./types.js";
import { jeeGuide } from "./defs/jee.js";
import { neetGuide } from "./defs/neet.js";

export const GUIDES: Guide[] = [neetGuide, jeeGuide];

export function getGuide(id: string | null | undefined): Guide | undefined {
  return id ? GUIDES.find((g) => g.id === id) : undefined;
}
