chrome.runtime.onInstalled.addListener(async function(details) {
    if (details.reason == "update") {
        const result = await fetchAndNormalizeVisitedData()
        if (result["visited"] !== undefined) {
            const visited = result["visited"];
            await saveVisited(visited);
        }
    }
    fetchAndNormalizeVisitedData();
})

function saveVisited(visited) {
    return chrome.storage.local.set({ "visited": visited })
}

chrome.runtime.onStartup.addListener(function() {
    fetchAndNormalizeVisitedData();
});

chrome.action.onClicked.addListener(function() {
    updateVisitedStatusOfCurrentTab()
})

chrome.tabs.onActivated.addListener(function callback() {
    setTabIconForCurrentTab()
});

chrome.tabs.onUpdated.addListener(function callback() {
    setTabIconForCurrentTab()
});

async function setTabIconForCurrentTab() {
    const tab = await getCurrentTab()
    const wasVisited = await hasBeenVisited(tab.url)
    if (!wasVisited) {
        await setNotVisitedIcon(tab.id);
    } else {
        await setVisitedIcon(tab.id);
    }
}

function getCurrentTab() {
    return chrome.tabs.query({active: true, currentWindow: true}).then(tabs => tabs[0])
}

chrome.commands.onCommand.addListener(function() {
    updateVisitedStatusOfCurrentTab()
})

async function updateVisitedStatusOfCurrentTab() {
    const tab = await getCurrentTab()
    let previouslyVisited = await hasBeenVisited(tab.url)
    if (!previouslyVisited) {
        await addUrl(tab.url)
        await setVisitedIcon(tab.id)
    } else {
        await removeUrl(tab.url)
        await setNotVisitedIcon(tab.id)
    }
}

async function fetchAndNormalizeVisitedData() {
    const obj = await chrome.storage.local.get("visited")
    if (obj["visited"] == undefined) {
        await saveVisited({visited: { version: 2 }})
    } else {
        var visited = obj["visited"];
        if (visited.version != 2) {
            Object.keys(visited).forEach(async url => { await addUrl(url) });
            let obj = await chrome.storage.local.get("visited")
            visited = obj["visited"]
            visited.version = 2
            await saveVisited(visited)
        }
    }
    return chrome.storage.local.get("visited")
}

function setNotVisitedIcon(tabId) {
    return chrome.action.setIcon({ path: "images/notvisited.png", tabId: tabId });
}

function setVisitedIcon(tabId) {
    return chrome.action.setIcon({ path: "images/visited.png", tabId: tabId });
}

chrome.runtime.onMessage.addListener(async function(msg) {
    if (msg.action === 'import') {
        var data = msg.data;
        Object.keys(data)
            .filter(key => key != 'version')
            .forEach(
                key => {
                    data[key]
                        .filter(async value =>  !await hasBeenVisited(key + value))
                        .forEach(async value => await addUrl(key + value));
                }
            );
    }
});

async function removeUrl(url) {
    // console.log("Remove URL")
    var key = getKey(url);
    // console.log(`Key ${key}`)
    var path = url.replace(key, '');
    const obj = await fetchAndNormalizeVisitedData()
    // console.log(`Index ${index}`)
    // console.log(`Path ${path}`)
    const visited = obj["visited"]
    const index = visited[key].indexOf(path);
    if (index > -1) {
        visited[key].splice(index, 1);
    }
    if (!visited[key].length) {
        delete visited[key];
    }
    await saveVisited(visited)
}

async function hasBeenVisited(url) {
    if (url) {
        var key = getKey(url);
        const obj = await fetchAndNormalizeVisitedData()
        const visited = obj["visited"]
        if (visited?.[key]) {
            var path = url.replace(key, '');
            return visited[key].includes(path);
        }
    }
    return false
}

async function addUrl(url) {
    // console.log("Add URL")
    var key = getKey(url);
    // console.log(`Key ${key}`)
    var path = url.replace(key, '');
    // console.log(`Path ${path}`)
    const obj = await fetchAndNormalizeVisitedData()
    const visited = obj["visited"]
    if (visited[key]) {
        visited[key].push(path);
    } else {
        visited[key] = [path];
    }
    await saveVisited(visited)
}

function getKey(url) {
    return new URL(url).origin;
}