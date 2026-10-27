import { describe, expect, it } from "vitest";
import { DEFAULT_IGNORED_PARAMS, normalizeUrl, parseRules } from "../markasread/lib/url.js";

const defaults = parseRules(DEFAULT_IGNORED_PARAMS);
const normalize = url => normalizeUrl(url, defaults.rules);

describe("normalizeUrl", () => {
    const page = "https://learn.microsoft.com/en-us/contribute/content/how-to-write-links";

    it("treats #section and tracking parameters as the same page (issue #8)", () => {
        expect(normalize(page + "?utm_source=chatgpt.com#bookmark-links")).toBe(page);
        expect(normalize(page + "?utm_source=chatgpt.com")).toBe(page);
        expect(normalize(page + "#bookmark-links")).toBe(page);
    });

    it("keeps other parameters with their order and encoding", () => {
        expect(normalize("https://a.com/s?q=a%20b+c&utm_medium=x&page=2#top")).toBe("https://a.com/s?q=a%20b+c&page=2");
    });

    it("drops the ? when no parameters remain", () => {
        expect(normalize("https://a.com/s?fbclid=1&gclid=2")).toBe("https://a.com/s");
        expect(normalize("https://a.com/s?")).toBe("https://a.com/s");
    });

    it("keeps client-side route fragments", () => {
        expect(normalize("https://app.com/#/inbox/1")).toBe("https://app.com/#/inbox/1");
        expect(normalize("https://x.com/#!/post?utm_source=a")).toBe("https://x.com/#!/post?utm_source=a");
    });

    it("matches percent-encoded parameter names", () => {
        expect(normalize("https://a.com/?utm%5Fsource=x&a=1")).toBe("https://a.com/?a=1");
    });

    it("applies domain rules to subdomains only (issue #10)", () => {
        const { rules } = parseRules("utm_*\nyoutube.com: t, index, list");
        expect(normalizeUrl("https://www.youtube.com/watch?v=nESq9Za-hLY&list=PL1&index=3&t=0s", rules))
            .toBe("https://www.youtube.com/watch?v=nESq9Za-hLY");
        expect(normalizeUrl("https://notyoutube.com/watch?v=1&t=5", rules)).toBe("https://notyoutube.com/watch?v=1&t=5");
    });

    it("handles URLs with opaque origins", () => {
        expect(normalize("file:///C:/doc.html#part")).toBe("file:///C:/doc.html");
    });
});

describe("parseRules", () => {
    it("parses global rules, domain rules, wildcards and comments", () => {
        expect(parseRules("# comment\n\n  a, b* \nex.com: c\nA.com , b.org: d").rules).toEqual([
            { domains: null, patterns: ["a", "b*"] },
            { domains: ["ex.com"], patterns: ["c"] },
            { domains: ["a.com", "b.org"], patterns: ["d"] }
        ]);
    });

    it("reports invalid lines by number", () => {
        expect(parseRules("bad domain!: x").errors).toHaveLength(1);
        expect(parseRules("a.com, b d.com: x").errors[0]).toMatch(/"b d.com" is not a domain/);
        expect(parseRules("ok\na b").errors[0]).toMatch(/Line 2/);
        expect(parseRules("x=y").errors).toHaveLength(1);
    });

    it("accepts the built-in defaults", () => {
        expect(defaults.errors).toEqual([]);
    });
});

describe("site defaults", () => {
    it.each([
        ["https://www.youtube.com/watch?v=abc&t=90s&si=XyZ&pp=ygU&feature=shared&ab_channel=Chan", "https://www.youtube.com/watch?v=abc"],
        ["https://www.youtube.com/watch?v=abc&list=PL1&index=3", "https://www.youtube.com/watch?v=abc&list=PL1"],
        ["https://www.youtube.com/playlist?list=PL1", "https://www.youtube.com/playlist?list=PL1"],
        ["https://m.youtube.com/watch?v=abc&t=5", "https://m.youtube.com/watch?v=abc"],
        ["https://www.amazon.co.uk/dp/B0123?ref_=abc&pd_rd_w=1&pf_rd_p=2&th=1&psc=1", "https://www.amazon.co.uk/dp/B0123?th=1&psc=1"],
        ["https://www.amazon.com/s?k=headphones&crid=X&sprefix=head&ref=nb_sb&qid=123&page=2", "https://www.amazon.com/s?k=headphones&page=2"],
        ["https://x.com/user/status/1?s=20&t=abc", "https://x.com/user/status/1"],
        ["https://twitter.com/user/status/1?s=20", "https://twitter.com/user/status/1"],
        ["https://www.google.com/search?q=mark+as+read&sca_esv=1&ei=2&ved=3&oq=mark", "https://www.google.com/search?q=mark+as+read"],
        ["https://www.facebook.com/profile.php?id=42&__cft__[0]=x&__tn__=R", "https://www.facebook.com/profile.php?id=42"],
        ["https://open.spotify.com/track/1?si=abc", "https://open.spotify.com/track/1"],
        ["https://example.com/watch?v=1&t=5&s=2&ref=x", "https://example.com/watch?v=1&t=5&s=2&ref=x"]
    ])("%s", (url, expected) => {
        expect(normalize(url)).toBe(expected);
    });
});
