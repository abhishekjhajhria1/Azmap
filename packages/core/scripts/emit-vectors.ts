/**
 * Write the conformance corpus to disk for the Dart suite to read.
 *
 * Run with `pnpm --filter @abh/core vectors`. The output is committed, because
 * the Flutter app must be buildable and testable without a Node toolchain in
 * the room — someone opening `apps/mobile` on a laptop with only Flutter
 * installed should be able to run `flutter test` and get a real answer.
 *
 * Regenerate whenever the engine or the merge order changes. `conformance.test.ts`
 * is what stops the committed file going stale silently: it re-derives every
 * expectation from the live implementation, so a behaviour change turns the
 * TypeScript suite red before anyone gets as far as Dart.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildVectors } from "../src/conformance/vectors.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../../apps/mobile/test/fixtures/conformance.json");

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(buildVectors(), null, 2)}\n`);

const { graph, order, tombstone } = buildVectors();
console.log(
  `wrote ${graph.length} graph, ${order.length} order and ${tombstone.length} tombstone cases to ${out}`,
);
