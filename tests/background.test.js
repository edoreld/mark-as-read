import { describe, expect, it, vi } from "vitest";
import { installChrome, settle } from "./helpers/chrome.js";

const marked = { version: 3, "https://a.com": ["/read"] };

// Loads a fresh copy of background.js against a fake chrome.
async function setup(options) {
    const env = installChrome(options);
    vi.resetModules();
    await import("../markasread/background.js");
    return env;
}

function sendMessage(chrome, msg) {
    return new Promise(resolve => {
        const keepOpen = chrome.runtime.onMessage.listeners[0](msg, {}, resolve);
        expect(keepOpen).toBe(true);
    });
}

describe("background", () => {
    it("sets every tab's icon on install, including other windows", async () => {
        const tabs = [
            { id: 1, url: "https://a.com/read", active: true, focused: true },
            { id: 2, url: "https://a.com/other" },
            { id: 3, url: "https://a.com/read#section", active: true, focused: false }
        ];
        const { chrome, icons } = await setup({ tabs, local: { visited: marked } });
        await chrome.runtime.onInstalled.fire({ reason: "update" });
        await settle();
        expect(icons).toEqual({ 1: "visited.png", 2: "notvisited.png", 3: "visited.png" });
    });

    it("updates the tab that changed, and only on URL or load-state changes", async () => {
        const tabs = [
            { id: 1, url: "https://a.com/x", active: true, focused: true },
            { id: 2, url: "https://a.com/read" }
        ];
        const { chrome, icons } = await setup({ tabs, local: { visited: marked } });
        await chrome.tabs.onUpdated.fire(2, { title: "hi" }, tabs[1]);
        expect(icons).toEqual({});
        await chrome.tabs.onUpdated.fire(2, { status: "loading", url: "https://a.com/read" }, tabs[1]);
        expect(icons).toEqual({ 2: "visited.png" });
    });

    it("handles activation with no focused window and closed tabs", async () => {
        const tabs = [{ id: 5, url: "https://a.com/read", active: true, focused: false }];
        const { chrome, icons } = await setup({ tabs, local: { visited: marked } });
        await chrome.tabs.onActivated.fire({ tabId: 5, windowId: 1 });
        await chrome.tabs.onActivated.fire({ tabId: 99, windowId: 1 });
        expect(icons).toEqual({ 5: "visited.png" });
    });

    it("toggles the clicked tab and keeps tabs with the same URL in sync", async () => {
        const tabs = [
            { id: 1, url: "https://a.com/p", active: true, focused: true },
            { id: 2, url: "https://a.com/p?utm_source=x" },
            { id: 3, url: "https://b.com/" }
        ];
        const { chrome, icons } = await setup({ tabs });
        await chrome.action.onClicked.fire(tabs[0]);
        await settle();
        expect(icons).toEqual({ 1: "visited.png", 2: "visited.png", 3: "notvisited.png" });
        await chrome.action.onClicked.fire(tabs[1]);
        await settle();
        expect(icons).toEqual({ 1: "notvisited.png", 2: "notvisited.png", 3: "notvisited.png" });
    });

    it("handles the keyboard command, with or without a tab", async () => {
        const tabs = [{ id: 1, url: "https://a.com/p", active: true, focused: true }];
        const { chrome, icons } = await setup({ tabs });
        const local = chrome.storage.local.data;
        await chrome.commands.onCommand.fire("other", tabs[0]);
        expect(local.visited).toBeUndefined();
        await chrome.commands.onCommand.fire("mark_page", tabs[0]);
        expect(local.visited["https://a.com"]).toEqual(["/p"]);
        await chrome.commands.onCommand.fire("mark_page", undefined);
        expect(local.visited["https://a.com"]).toBeUndefined();
        await settle();
        expect(icons[1]).toBe("notvisited.png");
    });

    it("answers import, clear and saveIgnoredParams messages and refreshes icons", async () => {
        const tabs = [{ id: 1, url: "https://a.com/p?ref=x", active: true, focused: true }];
        const { chrome, icons } = await setup({ tabs });

        expect(await sendMessage(chrome, { action: "import", data: { "https://a.com/p": true } }))
            .toEqual({ ok: true, result: { added: 1, total: 1 } });
        await settle();
        expect(icons[1]).toBe("notvisited.png");

        expect(await sendMessage(chrome, { action: "saveIgnoredParams", text: "a.com: ref" }))
            .toEqual({ ok: true, result: { merged: 0 } });
        await settle();
        expect(icons[1]).toBe("visited.png");

        expect((await sendMessage(chrome, { action: "clear" })).ok).toBe(true);
        await settle();
        expect(icons[1]).toBe("notvisited.png");

        expect(await sendMessage(chrome, { action: "import", data: [] }))
            .toEqual({ ok: false, error: "Expected a JSON object." });
    });
});
