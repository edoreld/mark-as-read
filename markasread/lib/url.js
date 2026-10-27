// URL normalization, so that variants of the same page count as one page.
//
// - The #fragment is dropped (issue #8), except for fragments used for
//   client-side routing ("#/inbox", "#!/post/1"), which name different pages.
// - Query parameters matching the ignore rules are dropped (issue #10).
//
// Ignore rules are text, one rule per line:
//   utm_*, fbclid              -> ignored on every site
//   youtube.com: t, index      -> ignored on youtube.com and its subdomains
// A trailing * matches any parameter starting with that prefix. Lines starting
// with # are comments.

export const DEFAULT_IGNORED_PARAMS = [
    "utm_*, fbclid, gclid, dclid, gbraid, wbraid, msclkid, yclid, twclid, igshid",
    "mc_cid, mc_eid, _hsenc, _hsmi, mkt_tok"
].join("\n");

const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/i;
const PARAM = /^[^\s=&#*]+\*?$/;

// Returns { rules, errors }. Each error names the offending line.
export function parseRules(text) {
    const rules = [];
    const errors = [];
    text.split(/\r?\n/).forEach((line, index) => {
        line = line.trim();
        if (!line || line.startsWith("#")) {
            return;
        }
        let domain = null;
        let params = line;
        const colon = line.indexOf(":");
        if (colon > -1) {
            domain = line.slice(0, colon).trim().toLowerCase();
            params = line.slice(colon + 1);
            if (!DOMAIN.test(domain)) {
                errors.push(`Line ${index + 1}: "${domain}" is not a domain.`);
                return;
            }
        }
        const patterns = params.split(",").map(p => p.trim()).filter(Boolean);
        const invalid = patterns.filter(p => !PARAM.test(p));
        if (invalid.length) {
            errors.push(`Line ${index + 1}: invalid parameter name "${invalid[0]}".`);
            return;
        }
        if (patterns.length) {
            rules.push({ domain, patterns });
        }
    });
    return { rules, errors };
}

function isIgnored(rules, hostname, name) {
    return rules.some(rule =>
        (!rule.domain || hostname === rule.domain || hostname.endsWith("." + rule.domain)) &&
        rule.patterns.some(pattern => pattern.endsWith("*")
            ? name.startsWith(pattern.slice(0, -1))
            : name === pattern));
}

function paramName(pair) {
    const name = pair.split("=")[0];
    try {
        return decodeURIComponent(name.replace(/\+/g, " "));
    } catch {
        return name;
    }
}

function isRouteFragment(hash) {
    return hash.startsWith("#/") || hash.startsWith("#!");
}

// Works on the URL string rather than re-serializing a URL object, so the
// parts that are kept stay byte-for-byte identical.
export function normalizeUrl(url, rules = []) {
    const hashIndex = url.indexOf("#");
    let rest = hashIndex > -1 ? url.slice(0, hashIndex) : url;
    const hash = hashIndex > -1 ? url.slice(hashIndex) : "";

    const queryIndex = rest.indexOf("?");
    if (queryIndex > -1) {
        let hostname = "";
        try {
            hostname = new URL(url).hostname.toLowerCase();
        } catch {
            // Keep hostname empty; only global rules apply.
        }
        const kept = rest.slice(queryIndex + 1)
            .split("&")
            .filter(pair => pair && !isIgnored(rules, hostname, paramName(pair)));
        rest = rest.slice(0, queryIndex) + (kept.length ? "?" + kept.join("&") : "");
    }

    return isRouteFragment(hash) ? rest + hash : rest;
}
