import { nanoid } from "nanoid";

/** Prefixed, URL-safe ids so a bare id tells you what it points at. */
export const newTopicId = () => `t_${nanoid(16)}`;
export const newEdgeId = () => `e_${nanoid(16)}`;
export const newRoadmapId = () => `r_${nanoid(16)}`;
export const newSuggestionId = () => `s_${nanoid(16)}`;
export const newGuardianId = () => `g_${nanoid(16)}`;
export const newCaptureId = () => `c_${nanoid(16)}`;
export const newSourceId = () => `src_${nanoid(12)}`;
export const newProfileId = () => `p_${nanoid(16)}`;

/** Single clock so ordering is consistent across records within a session. */
export const now = () => Date.now();
