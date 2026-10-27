import { clearData, getMatcher, importData, KEY, migrate, saveIgnoredParams, toggleUrl } from "./lib/store.js";

chrome.runtime.onInstalled.addListener(async function() {
    await migrate();
    await refreshAllTabs();
})

// Tab-specific icons don't survive a browser restart.
chrome.runtime.onStartup.addListener(refreshAllTabs);

chrome.action.onClicked.addListener(toggleTab)

chrome.commands.onCommand.addListener(async function(command, tab) {
    if (command !== "mark_page") {
        return;
    }
    if (!tab) {
        [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    }
    await toggleTab(tab);
})

chrome.tabs.onActivated.addListener(async function({ tabId }) {
    try {
        await updateIcon(await chrome.tabs.get(tabId));
    } catch {
        // The tab closed before we got to it.
    }
});

chrome.tabs.onUpdated.addListener(async function(tabId, changeInfo, tab) {
    // Chrome resets tab-specific icons when a tab navigates, so re-apply the
    // icon whenever the URL or load state changes.
    if (changeInfo.url || changeInfo.status) {
        await updateIcon(tab);
    }
});

// Keeps every tab in sync after toggles, imports and clears, including other
// tabs showing the same URL.
chrome.storage.onChanged.addListener(function(changes, areaName) {
    if (areaName === "local" && changes[KEY]) {
        refreshAllTabs();
    }
});

async function toggleTab(tab) {
    if (!tab?.url) {
        return;
    }
    await setIcon(tab.id, await toggleUrl(tab.url));
}

async function updateIcon(tab) {
    if (!tab) {
        return;
    }
    const isMarked = await getMatcher();
    await setIcon(tab.id, isMarked(tab.url));
}

async function refreshAllTabs() {
    const [isMarked, tabs] = await Promise.all([getMatcher(), chrome.tabs.query({})]);
    await Promise.all(tabs.map(tab => setIcon(tab.id, isMarked(tab.url))));
}

async function setIcon(tabId, marked) {
    try {
        await chrome.action.setIcon({ path: marked ? "visited.png" : "notvisited.png", tabId: tabId });
    } catch {
        // The tab closed before we got to it.
    }
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    let task;
    if (msg.action === 'import') {
        task = importData(msg.data);
    } else if (msg.action === 'clear') {
        task = clearData();
    } else if (msg.action === 'saveIgnoredParams') {
        task = saveIgnoredParams(msg.text);
    } else {
        return false;
    }
    task.then(
        result => sendResponse({ ok: true, result }),
        err => sendResponse({ ok: false, error: err.message })
    );
    // Keep the message channel open for the async response.
    return true;
});
