import { clearData, importData, isUrlMarked, migrate, toggleUrl } from "./lib/store.js";

chrome.runtime.onInstalled.addListener(function() {
    migrate();
})

chrome.action.onClicked.addListener(toggleActiveTab)

chrome.commands.onCommand.addListener(toggleActiveTab)

chrome.tabs.onActivated.addListener(async function callback() {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true})
    await updateIcon(tabs[0]);
});

chrome.tabs.onUpdated.addListener(async function callback() {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true})
    await updateIcon(tabs[0]);
});

async function toggleActiveTab() {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true})
    if (!tabs[0]?.url) {
        return;
    }
    if (await toggleUrl(tabs[0].url)) {
        await markAsVisited(tabs[0].id);
    } else {
        await markAsNotVisited(tabs[0].id);
    }
}

async function updateIcon(tab) {
    if (!tab) {
        return;
    }
    if (await isUrlMarked(tab.url)) {
        await markAsVisited(tab.id);
    } else {
        await markAsNotVisited(tab.id);
    }
}

function markAsNotVisited(atabId) {
    return chrome.action.setIcon({ path: "notvisited.png", tabId: atabId });
}

function markAsVisited(atabId) {
    return chrome.action.setIcon({ path: "visited.png", tabId: atabId });
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    let task;
    if (msg.action === 'import') {
        task = importData(msg.data);
    } else if (msg.action === 'clear') {
        task = clearData();
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
