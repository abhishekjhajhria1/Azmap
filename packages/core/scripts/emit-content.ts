/**
 * Ship the roadmaps and guides to the Flutter app as data.
 *
 * ## Why an export and not a Dart port
 *
 * The engine had to be ported — it is logic, and logic in a JSON file is just
 * an interpreter waiting to be written. Content is the opposite: 305 topic
 * seeds and two exam guides are *data*, and data has one correct home. Hand-
 * translating it into Dart would guarantee the phone and the web app disagree
 * about a syllabus within a month, and nobody would notice until a student
 * revised the wrong chapter.
 *
 * So `defs/` stays the single source of truth and this writes it out. The same
 * arrangement as the conformance vectors, for the same reason: generate what
 * must match rather than maintaining it twice.
 *
 * Run with `pnpm --filter @abh/core content`. The output is committed so the
 * Flutter app builds with no Node toolchain in the room.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROADMAPS } from "../src/roadmaps/library.js";
import { GUIDES } from "../src/guides/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../../apps/mobile/assets/content.json");

// Version so a stale asset fails loudly on the Dart side rather than silently
// serving last month's syllabus.
const payload = {
  version: 1,
  generatedAt: new Date().toISOString().slice(0, 10),
  roadmaps: ROADMAPS,
  guides: GUIDES,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(payload)}\n`);

const nodes = payload.roadmaps.reduce(
  (n, r) => n + r.path.length + r.branches.length,
  0,
);
console.log(
  `wrote ${payload.roadmaps.length} roadmaps (${nodes} nodes) and ` +
    `${payload.guides.length} guides to ${out}`,
);
