/**
 * Guides — the prose that a graph can't carry.
 *
 * A roadmap answers *what to study, in what order*. A guide answers the
 * questions that aren't about ordering at all: how long this takes, how the
 * paper is actually marked, what to do in the last month, which advice you'll
 * hear that is wrong. For an exam that matters, the strategy is as much of the
 * product as the syllabus, and it doesn't fit in a node's one-line `why`.
 *
 * Kept in core so every surface renders the same text, and structured as
 * sections rather than one blob so a phone can show it as a list and a laptop
 * can show it as a document.
 */

export interface GuideSection {
  id: string;
  title: string;
  /**
   * Markdown-lite: paragraphs separated by blank lines, `- ` for bullets,
   * `**bold**`. Deliberately not full Markdown — a rendering surface should
   * never need a parser dependency to show a guide.
   */
  body: string;
}

export interface Guide {
  /** Matches the roadmap's `guideId`. */
  id: string;
  title: string;
  subtitle: string;
  /**
   * Shown prominently, not as a footnote. Syllabi and exam patterns change;
   * a guide that doesn't say so is worse than no guide.
   */
  caveat?: string;
  sections: GuideSection[];
}
