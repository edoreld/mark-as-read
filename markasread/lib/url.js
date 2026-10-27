// URL normalization, so that variants of the same page count as one page.
//
// - The #fragment is dropped (issue #8), except for fragments used for
//   client-side routing ("#/inbox", "#!/post/1"), which name different pages.
// - Query parameters matching the ignore rules are dropped (issue #10).
//
// Ignore rules are text, one rule per line:
//   utm_*, fbclid              -> ignored on every site
//   youtube.com: t, index      -> ignored on youtube.com and its subdomains
//   x.com, twitter.com: s, t   -> ignored on both sites
// A trailing * matches any parameter starting with that prefix. Lines starting
// with # are comments.
//
// Site defaults only list parameters that never change which page is shown
// (timestamps, share/referral ids, search-result bookkeeping). Anything that
// can pick different content is left out, e.g. YouTube's "list", which is the
// whole page on /playlist.

export const DEFAULT_IGNORED_PARAMS = `# Tracking parameters, ignored on every site
utm_*, fbclid, gclid, dclid, gbraid, wbraid, msclkid, yclid, twclid, igshid
mc_cid, mc_eid, _hsenc, _hsmi, mkt_tok

# Popular sites
youtube.com: t, si, pp, feature, ab_channel, index
amazon.com, amazon.co.uk, amazon.de, amazon.fr, amazon.it, amazon.es, amazon.ca, amazon.co.jp, amazon.in, amazon.com.au: ref, ref_, pf_rd_*, pd_rd_*, crid, sprefix, qid, sr, dib, dib_tag, tag, linkCode, linkId, content-id, _encoding
ebay.com, ebay.co.uk, ebay.de: _trkparms, _trksid, hash, amdata, mkcid, mkevt, mkrid, campid, toolid, customid
aliexpress.com: spm, scm, pvid, algo_pvid, algo_exp_id, gatewayAdapt, aff_fcid, aff_fsk, aff_platform, aff_trace_key, terminal_id
google.com: ei, ved, sxsrf, oq, gs_lp, gs_lcrp, sca_esv, sca_upv, uact, sclient, sourceid, client, aqs, bih, biw, iflsig, rlz
reddit.com: share_id, rdt, ref, ref_source, ref_campaign
x.com, twitter.com: s, t, ref_src, ref_url
facebook.com: mibextid, rdid, ref, fref, hc_ref, sfnsn, __cft__*, __tn__
instagram.com: igsh, img_index
linkedin.com: trk, trkInfo, trackingId, refId, lipi, midToken, midSig, trkEmail, eid, originalSubdomain
tiktok.com: is_from_webapp, sender_device, _r, _t, share_app_id, share_item_id, share_link_id
spotify.com: si, nd
medium.com: source`;

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
        let domains = null;
        let params = line;
        const colon = line.indexOf(":");
        if (colon > -1) {
            domains = line.slice(0, colon).split(",").map(d => d.trim().toLowerCase());
            params = line.slice(colon + 1);
            const invalid = domains.find(d => !DOMAIN.test(d));
            if (invalid !== undefined) {
                errors.push(`Line ${index + 1}: "${invalid}" is not a domain.`);
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
            rules.push({ domains, patterns });
        }
    });
    return { rules, errors };
}

function matchesDomain(hostname, domains) {
    return !domains || domains.some(domain => hostname === domain || hostname.endsWith("." + domain));
}

function isIgnored(rules, hostname, name) {
    return rules.some(rule =>
        matchesDomain(hostname, rule.domains) &&
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
