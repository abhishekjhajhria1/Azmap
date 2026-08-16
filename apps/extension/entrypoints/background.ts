import { defineBackground } from "wxt/sandbox";
import { browser } from "wxt/browser";
import { getStore, seedIfEmpty } from "../lib/store";

/**
 * Background service worker: the capture entry points.
 *
 * Two ways to save what you're reading into the map — a right-click menu and a
 * keyboard shortcut — both of which write a Capture to the on-device store and
 * flash a badge so you know it landed. No network, no account.
 */
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    browser.contextMenus.create({
      id: "abh-save",
      title: "Save to ABH map",
      contexts: ["page", "selection"],
    });
    await seedIfEmpty();
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== "abh-save") return;
    await capture({
      title: tab?.title ?? "",
      url: info.pageUrl ?? tab?.url,
      text: info.selectionText ?? "",
      hadSelection: Boolean(info.selectionText),
    });
  });

  browser.commands.onCommand.addListener(async (command) => {
    if (command !== "save-page") return;
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    await capture({ title: tab?.title ?? "", url: tab?.url, text: "", hadSelection: false });
  });
});

async function capture(input: {
  title: string;
  url?: string;
  text: string;
  hadSelection: boolean;
}) {
  const store = getStore();
  await store.addCapture({
    kind: input.hadSelection ? "selection" : "page",
    title: input.title,
    url: input.url,
    text: input.text,
  });
  await flashBadge();
}

async function flashBadge() {
  try {
    await browser.action.setBadgeBackgroundColor({ color: "#e9b949" });
    await browser.action.setBadgeText({ text: "✓" });
    setTimeout(() => browser.action.setBadgeText({ text: "" }), 1500);
  } catch {
    // Badge is best-effort; a failed cosmetic call must never lose a capture.
  }
}
