// Minimal in-memory stand-in for the chrome.* APIs the extension uses.

export function event() {
    const listeners = [];
    return {
        listeners,
        addListener: fn => listeners.push(fn),
        fire: (...args) => Promise.all(listeners.map(fn => fn(...args)))
    };
}

// A storage area. `delay` adds random latency so tests can catch races.
export function storageArea(initial = {}, { delay = false, onChanged, areaName } = {}) {
    const data = structuredClone(initial);
    const wait = () => delay ? new Promise(r => setTimeout(r, Math.random() * 3)) : Promise.resolve();
    return {
        data,
        async get(keys) {
            await wait();
            const out = {};
            for (const key of [].concat(keys)) {
                if (key in data) {
                    out[key] = structuredClone(data[key]);
                }
            }
            return out;
        },
        async set(obj) {
            await wait();
            const changes = {};
            for (const [key, value] of Object.entries(obj)) {
                changes[key] = { oldValue: data[key], newValue: value };
                data[key] = structuredClone(value);
            }
            onChanged?.fire(changes, areaName);
        }
    };
}

// Installs a fake `chrome` global and returns it, plus the icons set per tab.
export function installChrome({ local = {}, sync = {}, tabs = [], delay = false } = {}) {
    const icons = {};
    const onChanged = event();
    const chrome = {
        runtime: { onInstalled: event(), onStartup: event(), onMessage: event() },
        action: {
            onClicked: event(),
            async setIcon({ path, tabId }) {
                if (!tabs.some(tab => tab.id === tabId)) {
                    throw new Error(`No tab with id: ${tabId}.`);
                }
                icons[tabId] = path;
            }
        },
        commands: { onCommand: event() },
        tabs: {
            onActivated: event(),
            onUpdated: event(),
            async query(query) {
                return query.active ? tabs.filter(tab => tab.active && tab.focused) : tabs;
            },
            async get(id) {
                const tab = tabs.find(tab => tab.id === id);
                if (!tab) {
                    throw new Error(`No tab with id: ${id}.`);
                }
                return tab;
            }
        },
        storage: {
            onChanged,
            local: storageArea(local, { delay, onChanged, areaName: "local" }),
            sync: storageArea(sync, { delay })
        }
    };
    globalThis.chrome = chrome;
    return { chrome, icons };
}

// Lets queued storage work and listeners triggered by it settle.
export const settle = () => new Promise(r => setTimeout(r, 20));
