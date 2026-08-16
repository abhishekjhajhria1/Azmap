/**
 * @abh/core — the ABH map, shared by every app.
 *
 * Public surface:
 *   - Domain types + Zod schemas          ("./types")
 *   - Pure unlock/graph engine            ("./graph")
 *   - The MapStore facade                 ("./store")
 *   - Storage contract + in-memory adapter
 *
 * The IndexedDB adapter is a separate entry point (`@abh/core/storage/indexeddb`)
 * so non-browser environments never import `idb`.
 */

export * from "./types.js";
export * from "./ids.js";
export * as graph from "./graph.js";
export type { Graph, GraphIndex } from "./graph.js";
export { MapStore } from "./store.js";
export type { NewTopicInput } from "./store.js";
export type { StorageAdapter, Collection } from "./storage/adapter.js";
export { MemoryStorage } from "./storage/memory.js";
