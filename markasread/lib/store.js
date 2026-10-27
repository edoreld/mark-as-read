// Storage layer for the "visited" dictionary.
//
// Stored shape (version 3): { version: 3, "<origin>": ["<path>", ...] }
// Version 3 is version 2 with every URL normalized (see url.js).
// Legacy shape (v0.0.0.x):  { "<full url>": true | false }
//
// All writes go through a single queue so that concurrent events (double
// clicks, keyboard shortcut, imports) can't interleave their read-modify-write
// cycles and overwrite each other.

import { DEFAULT_IGNORED_PARAMS, normalizeUrl, parseRules } from "./url.js";

export const KEY = "visited";
export const PARAMS_KEY = "ignoredParams";
const SYNC_MIGRATED = "syncMigrated";
export const VERSION = 3;

let queue = Promise.resolve();

function enqueue(task) {
    const run = queue.then(task);
    // Keep the queue alive even if a task fails.
    queue = run.catch(err => console.error(err));
    return run;
}

// Normalizes the URL and splits it into the origin and the stored path.
export function splitUrl(url, rules = []) {
    url = normalizeUrl(url, rules);
    const origin = new URL(url).origin;
    // Opaque origins (file:, data:, about:) are the string "null" and are not
    // a prefix of the URL, so the whole URL becomes the path.
    const path = url.startsWith(origin) ? url.slice(origin.length) : url;
    return { origin, path };
}

// Converts any supported format (v3, v2, legacy v0, or a mix) into a clean,
// normalized v3 dictionary without duplicates. Throws if the input isn't an
// object.
export function normalizeData(raw, rules = []) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("Expected a JSON object.");
    }
    const origins = new Map();
    const add = url => {
        let parts;
        try {
            parts = splitUrl(url, rules);
        } catch {
            return;
        }
        if (!origins.has(parts.origin)) {
            origins.set(parts.origin, new Set());
        }
        origins.get(parts.origin).add(parts.path);
    };
    for (const [key, value] of Object.entries(raw)) {
        if (key === "version") {
            continue;
        }
        if (Array.isArray(value)) {
            // v2/v3: origin -> paths
            if (!isOriginKey(key)) {
                continue;
            }
            for (const path of value) {
                if (typeof path === "string") {
                    add(key === "null" ? path : key + path);
                }
            }
        } else if (value === true) {
            // v0: full url -> marked. Entries set to false were unmarked.
            add(key);
        }
    }
    const result = { version: VERSION };
    for (const [origin, paths] of origins) {
        result[origin] = [...paths];
    }
    return result;
}

export function countUrls(visited) {
    return Object.keys(visited)
        .filter(key => key !== "version")
        .reduce((total, key) => total + visited[key].length, 0);
}

// Adds every URL from `data` (v3 shape) to `visited`. Returns how many were new.
function mergeInto(visited, data) {
    let added = 0;
    for (const origin of Object.keys(data)) {
        if (origin === "version") {
            continue;
        }
        const existing = new Set(visited[origin] ?? []);
        for (const path of data[origin]) {
            if (!existing.has(path)) {
                existing.add(path);
                added++;
            }
        }
        if (existing.size) {
            visited[origin] = [...existing];
        }
    }
    return added;
}

function isOriginKey(key) {
    if (key === "null") {
        return true;
    }
    try {
        return new URL(key).origin === key;
    } catch {
        return false;
    }
}

function isMarked(visited, rules, url) {
    if (!url) {
        return false;
    }
    const { origin, path } = splitUrl(url, rules);
    return Array.isArray(visited[origin]) && visited[origin].includes(path);
}

function rulesFrom(text) {
    return parseRules(text ?? DEFAULT_IGNORED_PARAMS).rules;
}

async function load() {
    const obj = await chrome.storage.local.get([KEY, PARAMS_KEY]);
    const rules = rulesFrom(obj[PARAMS_KEY]);
    const visited = obj[KEY];
    if (visited === undefined) {
        return { visited: { version: VERSION }, rules };
    }
    return {
        visited: visited.version === VERSION ? visited : normalizeData(visited, rules),
        rules
    };
}

function save(visited) {
    return chrome.storage.local.set({ [KEY]: visited });
}

// Runs `fn(visited, rules)` atomically and saves the (mutated) dictionary.
function mutate(fn) {
    return enqueue(async () => {
        const { visited, rules } = await load();
        const result = fn(visited, rules);
        await save(visited);
        return result;
    });
}

// Returns a function that tells whether a URL is marked, reading storage once.
export async function getMatcher() {
    const { visited, rules } = await load();
    return url => isMarked(visited, rules, url);
}

export async function isUrlMarked(url) {
    return (await getMatcher())(url);
}

// Marks the URL if it isn't marked, unmarks it otherwise. Returns the new state.
export function toggleUrl(url) {
    return mutate((visited, rules) => {
        const { origin, path } = splitUrl(url, rules);
        const paths = visited[origin] ?? [];
        if (paths.includes(path)) {
            // Remove every copy; older versions could store duplicates.
            const remaining = paths.filter(p => p !== path);
            if (remaining.length) {
                visited[origin] = remaining;
            } else {
                delete visited[origin];
            }
            return false;
        }
        visited[origin] = [...paths, path];
        return true;
    });
}

// Merges imported data (any supported format). Returns { added, total }.
export async function importData(raw) {
    return mutate((visited, rules) => {
        const data = normalizeData(raw, rules);
        return {
            added: mergeInto(visited, data),
            total: countUrls(data)
        };
    });
}

export function clearData() {
    return enqueue(() => save({ version: VERSION }));
}

export async function getIgnoredParams() {
    const obj = await chrome.storage.local.get(PARAMS_KEY);
    return obj[PARAMS_KEY] ?? DEFAULT_IGNORED_PARAMS;
}

// Saves new ignore rules and re-normalizes stored URLs with them. Pages that
// become identical are merged. Returns how many stored URLs were merged away.
export function saveIgnoredParams(text) {
    const { rules, errors } = parseRules(text);
    if (errors.length) {
        return Promise.reject(new Error(errors.join(" ")));
    }
    return enqueue(async () => {
        const { visited } = await load();
        const renormalized = normalizeData(visited, rules);
        await chrome.storage.local.set({ [KEY]: renormalized, [PARAMS_KEY]: text });
        return { merged: countUrls(visited) - countUrls(renormalized) };
    });
}

// Brings stored data up to the current format. Also pulls in data left in
// chrome.storage.sync by versions that predate local storage (once only, so
// clearing data later doesn't resurrect it).
export function migrate() {
    return enqueue(async () => {
        const stored = await chrome.storage.local.get([KEY, SYNC_MIGRATED, PARAMS_KEY]);
        const rules = rulesFrom(stored[PARAMS_KEY]);
        const visited = stored[KEY] === undefined ? { version: VERSION } : normalizeData(stored[KEY], rules);
        if (!stored[SYNC_MIGRATED]) {
            try {
                const synced = (await chrome.storage.sync.get(KEY))[KEY];
                if (synced) {
                    mergeInto(visited, normalizeData(synced, rules));
                }
            } catch (err) {
                console.error("Could not read legacy sync data", err);
            }
        }
        await chrome.storage.local.set({ [KEY]: visited, [SYNC_MIGRATED]: true });
    });
}
