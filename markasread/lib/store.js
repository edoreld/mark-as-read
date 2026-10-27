// Storage layer for the "visited" dictionary.
//
// Stored shape (version 2): { version: 2, "<origin>": ["<path>", ...] }
// Legacy shape (v0.0.0.x):  { "<full url>": true | false }
//
// All writes go through a single queue so that concurrent events (double
// clicks, keyboard shortcut, imports) can't interleave their read-modify-write
// cycles and overwrite each other.

export const KEY = "visited";
const SYNC_MIGRATED = "syncMigrated";
export const VERSION = 2;

let queue = Promise.resolve();

function enqueue(task) {
    const run = queue.then(task);
    // Keep the queue alive even if a task fails.
    queue = run.catch(err => console.error(err));
    return run;
}

export function splitUrl(url) {
    const origin = new URL(url).origin;
    // Opaque origins (file:, data:, about:) are the string "null" and are not
    // a prefix of the URL, so the whole URL becomes the path.
    const path = url.startsWith(origin) ? url.slice(origin.length) : url;
    return { origin, path };
}

// Converts any supported format (v2, legacy v0, or a mix) into a clean v2
// dictionary without duplicates. Throws if the input isn't an object.
export function normalizeData(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("Expected a JSON object.");
    }
    const result = { version: VERSION };
    for (const [key, value] of Object.entries(raw)) {
        if (key === "version") {
            continue;
        }
        if (Array.isArray(value)) {
            // v2: origin -> paths
            if (!isOriginKey(key)) {
                continue;
            }
            for (const path of value) {
                if (typeof path === "string") {
                    addPath(result, key, path);
                }
            }
        } else if (value === true) {
            // v0: full url -> marked. Entries set to false were unmarked.
            let parts;
            try {
                parts = splitUrl(key);
            } catch {
                continue;
            }
            addPath(result, parts.origin, parts.path);
        }
    }
    return result;
}

export function countUrls(visited) {
    return Object.keys(visited)
        .filter(key => key !== "version")
        .reduce((total, key) => total + visited[key].length, 0);
}

// Adds every URL from `data` (v2 shape) to `visited`. Returns how many were new.
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

function addPath(visited, origin, path) {
    const paths = visited[origin] ?? (visited[origin] = []);
    if (!paths.includes(path)) {
        paths.push(path);
    }
}

export function isMarked(visited, url) {
    if (!url) {
        return false;
    }
    const { origin, path } = splitUrl(url);
    return Array.isArray(visited[origin]) && visited[origin].includes(path);
}

export async function load() {
    const obj = await chrome.storage.local.get(KEY);
    const visited = obj[KEY];
    if (visited === undefined) {
        return { version: VERSION };
    }
    return visited.version === VERSION ? visited : normalizeData(visited);
}

function save(visited) {
    return chrome.storage.local.set({ [KEY]: visited });
}

// Runs `fn(visited)` atomically and saves the (mutated) dictionary.
function mutate(fn) {
    return enqueue(async () => {
        const visited = await load();
        const result = fn(visited);
        await save(visited);
        return result;
    });
}

export async function isUrlMarked(url) {
    return isMarked(await load(), url);
}

// Marks the URL if it isn't marked, unmarks it otherwise. Returns the new state.
export function toggleUrl(url) {
    return mutate(visited => {
        const { origin, path } = splitUrl(url);
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
    const data = normalizeData(raw);
    return mutate(visited => ({
        added: mergeInto(visited, data),
        total: countUrls(data)
    }));
}

export function clearData() {
    return enqueue(() => save({ version: VERSION }));
}

// Brings stored data up to the current format. Also pulls in data left in
// chrome.storage.sync by versions that predate local storage (once only, so
// clearing data later doesn't resurrect it).
export function migrate() {
    return enqueue(async () => {
        const stored = await chrome.storage.local.get([KEY, SYNC_MIGRATED]);
        const visited = stored[KEY] === undefined ? { version: VERSION } : normalizeData(stored[KEY]);
        if (!stored[SYNC_MIGRATED]) {
            try {
                const synced = (await chrome.storage.sync.get(KEY))[KEY];
                if (synced) {
                    mergeInto(visited, normalizeData(synced));
                }
            } catch (err) {
                console.error("Could not read legacy sync data", err);
            }
        }
        await chrome.storage.local.set({ [KEY]: visited, [SYNC_MIGRATED]: true });
    });
}
