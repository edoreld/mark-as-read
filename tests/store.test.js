import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_IGNORED_PARAMS } from "../markasread/lib/url.js";
import { installChrome } from "./helpers/chrome.js";

// Each test gets a fresh store module (and so a fresh write queue).
async function setup(options) {
    const { chrome } = installChrome(options);
    vi.resetModules();
    const store = await import("../markasread/lib/store.js");
    return { store, local: chrome.storage.local.data };
}

beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("migrate", () => {
    it("converts legacy v0 data without hanging and drops unmarked entries", async () => {
        const { store, local } = await setup({
            local: { visited: { "https://a.com/x": true, "https://a.com/y": false, "https://b.com/": true, "garbage": true } }
        });
        await store.migrate();
        expect(local.visited).toEqual({ version: 3, "https://a.com": ["/x"], "https://b.com": ["/"] });
        expect(local.syncMigrated).toBe(true);
    });

    it("normalizes v2 data and merges variants of the same page", async () => {
        const { store, local } = await setup({
            local: { visited: { version: 2, "https://a.com": ["/p#one", "/p#two", "/p?utm_source=x", "/q?id=1", "/#/route"] }, syncMigrated: true }
        });
        await store.migrate();
        expect(local.visited).toEqual({ version: 3, "https://a.com": ["/p", "/q?id=1", "/#/route"] });
    });

    it("merges legacy sync data once, so clearing doesn't bring it back", async () => {
        const { store, local } = await setup({
            local: { visited: { version: 3, "https://a.com": ["/1"] } },
            sync: { visited: { "https://s.com/p": true } }
        });
        await store.migrate();
        expect(local.visited).toEqual({ version: 3, "https://a.com": ["/1"], "https://s.com": ["/p"] });
        await store.clearData();
        await store.migrate();
        expect(local.visited).toEqual({ version: 3 });
    });
});

describe("toggleUrl", () => {
    it("serializes rapid toggles without duplicating entries", async () => {
        const { store, local } = await setup({ delay: true });
        const results = await Promise.all([1, 2, 3, 4].map(() => store.toggleUrl("https://a.com/page")));
        expect(results).toEqual([true, false, true, false]);
        expect(await store.isUrlMarked("https://a.com/page")).toBe(false);
        expect(local.visited).toEqual({ version: 3 });
    });

    it("removes every duplicate copy when unmarking", async () => {
        const { store, local } = await setup({ local: { visited: { version: 3, "https://a.com": ["/p", "/p", "/q"] } } });
        expect(await store.toggleUrl("https://a.com/p")).toBe(false);
        expect(local.visited["https://a.com"]).toEqual(["/q"]);
    });

    it("marks every variant of a page at once", async () => {
        const { store } = await setup();
        const page = "https://learn.microsoft.com/en-us/contribute/content/how-to-write-links";
        expect(await store.toggleUrl(page + "?utm_source=chatgpt.com#bookmark-links")).toBe(true);
        expect(await store.isUrlMarked(page + "?utm_source=chatgpt.com")).toBe(true);
        expect(await store.isUrlMarked(page)).toBe(true);
        expect(await store.toggleUrl(page + "#other")).toBe(false);
        expect(await store.isUrlMarked(page + "?utm_source=chatgpt.com#bookmark-links")).toBe(false);
    });

    it("doesn't let file:// URLs containing 'null' collide", async () => {
        const { store } = await setup();
        expect(store.splitUrl("file:///home/nullptr.html")).toEqual({ origin: "null", path: "file:///home/nullptr.html" });
        await store.toggleUrl("file:///home/nullptr.html");
        expect(await store.isUrlMarked("file:///home/ptr.html")).toBe(false);
        expect(await store.isUrlMarked("file:///home/nullptr.html")).toBe(true);
    });

    it("keeps the queue working after a failed write", async () => {
        const { store } = await setup({ local: { visited: "corrupt" } });
        await expect(store.toggleUrl("https://a.com/")).rejects.toThrow();
        await store.clearData();
        expect(await store.toggleUrl("https://a.com/")).toBe(true);
    });

    it("reads v2 data correctly before migrate() has run", async () => {
        const { store } = await setup({ local: { visited: { version: 2, "https://a.com": ["/p#x"] } } });
        expect(await store.isUrlMarked("https://a.com/p")).toBe(true);
    });
});

describe("importData", () => {
    it("merges in one write without losing a concurrent toggle", async () => {
        const { store, local } = await setup({ delay: true, local: { visited: { version: 3, "https://a.com": ["/1"] } } });
        const file = JSON.parse(JSON.stringify({
            version: 2,
            "https://a.com": ["/1", "/2", "/2"],
            "https://c.com": ["/x"],
            "__proto__": ["/evil"],
            "not an origin": ["/z"]
        }));
        const [result] = await Promise.all([store.importData(file), store.toggleUrl("https://d.com/new")]);
        expect(result).toEqual({ added: 2, total: 3 });
        expect(local.visited).toEqual({
            version: 3,
            "https://a.com": ["/1", "/2"],
            "https://c.com": ["/x"],
            "https://d.com": ["/new"]
        });
    });

    it("accepts legacy files and normalizes with the current rules", async () => {
        const { store, local } = await setup();
        expect(await store.importData({ "https://a.com/x?y=1#z": true, "https://a.com/n": false })).toEqual({ added: 1, total: 1 });
        expect(await store.importData({ version: 2, "https://b.com": ["/p#a", "/p?fbclid=z"] })).toEqual({ added: 1, total: 1 });
        expect(local.visited["https://a.com"]).toEqual(["/x?y=1"]);
        expect(local.visited["https://b.com"]).toEqual(["/p"]);
    });

    it("rejects input that isn't an object", async () => {
        const { store } = await setup();
        await expect(store.importData([1, 2])).rejects.toThrow(/JSON object/);
        expect(() => store.normalizeData(null)).toThrow(/JSON object/);
    });
});

describe("ignored parameters", () => {
    it("re-normalizes stored URLs when rules change", async () => {
        const { store, local } = await setup({
            local: { visited: { version: 3, "https://www.youtube.com": ["/watch?v=1&t=5", "/watch?v=1&t=90", "/watch?v=2"] } }
        });
        expect(await store.getIgnoredParams()).toBe(DEFAULT_IGNORED_PARAMS);
        expect(await store.saveIgnoredParams("youtube.com: t")).toEqual({ merged: 1 });
        expect(local.visited["https://www.youtube.com"]).toEqual(["/watch?v=1", "/watch?v=2"]);
        expect(await store.getIgnoredParams()).toBe("youtube.com: t");
        expect(await store.isUrlMarked("https://www.youtube.com/watch?v=1&t=300")).toBe(true);
    });

    it("rejects invalid rules without changing anything", async () => {
        const { store } = await setup({ local: { ignoredParams: "youtube.com: t" } });
        await expect(store.saveIgnoredParams("bad domain!: x")).rejects.toThrow(/not a domain/);
        expect(await store.getIgnoredParams()).toBe("youtube.com: t");
    });
});
