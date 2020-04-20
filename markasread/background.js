var tcDefaults = {
	changeLinkColor: false,
	linkColor: 'blue',
	sites: `https://github.com`	
};

chrome.runtime.onInstalled.addListener(function () {
	// console.log("onInstalled");
	initialise();
});

chrome.runtime.onStartup.addListener(function () {
	// console.log("onStartup");
	initialise();
});

function initialise() {
	chrome.storage.local.get("visited", function (obj) {
		if (obj["visited"] !== undefined) {
			visited = obj["visited"];
		} else {
			// attempt to migrate old storage.sync install:
			chrome.storage.sync.get("visited", function (syncObj) {
				if (syncObj["visited"] !== undefined) {
					visited = syncObj["visited"];
				} else {
					visited = {};
				}
			});
		}
	});
}


// chrome.browserAction.onClicked.addListener(function(tab) { 
// 	console.log("onClicked");
// 	chrome.tabs.getSelected(null, function(tab){
// 		if (visited[tab.url] == false || visited[tab.url] == undefined) {
// 			markAsVisited();
// 			visited[tab.url] = true;
			
// 		} else {
// 			markAsNotVisited();
// 			visited[tab.url] = false;
// 		}
// 	});
// });

chrome.browserAction.onClicked.addListener(function(tabs) { 
	chrome.tabs.query({'active': true, 'currentWindow': true}, function (tab) {
		// console.log(tab[0].url);
		if (notChecked(tab[0].url)) {
			visited[tab[0].url] = true;
			markAsVisited(tab[0].id);
		} else { 
			visited[tab[0].url] = false;
			markAsNotVisited(tab[0].id);
		}
		updateRemoteDictionary();
	});
});

/** 
* Upon switching to a new tab and on it being activated, we set the icon as needed.
*
* TODO: decide if it's better to accept that onUpdated may be called 3-4x at once,
*       or to implement a tabId-specific sempahore on both onActivated and onUpdated
*       ex: https://stackoverflow.com/questions/56092122/how-to-listen-to-tabs-onupdated-only-and-block-tabs-onactivated
*/
chrome.tabs.onActivated.addListener(function(activeInfo) {
	// console.log("onActivated");
	chrome.tabs.query({'active': true, 'currentWindow': true}, function (tab) {
		console.log(tab[0].url);
		if (notChecked(tab[0].url)) {
			markAsNotVisited(tab[0].id);
		} else { 
			markAsVisited(tab[0].id);
		}
	});
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	// console.log("onUpdated");
	if (visited[tab.url] == undefined || visited[tab.url] == false) {
		markAsNotVisited();
	}
	else {
		markAsVisited();
	}
	if (changeInfo.status === 'complete') {
		changeLinkColor(tab);
	}
});


function updateRemoteDictionary() {	
	chrome.storage.local.set({"visited": visited}, function() {
		if (chrome.runtime.error) {
			console.log("Runtime error.");
		}
	});
}

function markAsNotVisited(atabId) {
	// console.log("markAsNotVisited");
	chrome.browserAction.setIcon({path: "notvisited.png", tabId: atabId});
}

function markAsVisited(atabId) {
	// console.log("markAsVisited");
	chrome.browserAction.setIcon({path: "visited.png", tabId: atabId });
}

// chrome.storage.onChanged.addListener(function(changes, namespace) {
// 	for (key in changes) {
// 		var storageChange = changes[key];
// 		console.log('Storage key "%s" in namespace "%s" changed. ' +
// 			'Old value was "%s", new value is "%s".',
// 			key,
// 			namespace,
// 			storageChange.oldValue,
// 			storageChange.newValue);
// 	}
// });

chrome.runtime.onMessage.addListener(function (msg) {
	if (msg.action === 'import') {
		visited = {...visited, ...msg.data.visited};
		updateRemoteDictionary();
	}
});

function changeLinkColor(tab) {
	chrome.storage.local.get(tcDefaults, function(storage) {
		if(storage.changeLinkColor) {
			if(containsSite(storage.sites, tab.url)) {
				var code = `var linkColor="${storage.linkColor}"; var visited = ${JSON.stringify(visited)}`;
				chrome.tabs.executeScript(tab.id, {
					code: code
				}, function() {
					chrome.tabs.executeScript(tab.id, {file: 'changeLinkColor.js'});
				});	
			}
		}
	});
}

function containsSite(sites, url) {
	return sites.split("\n").filter(site => url.includes(site)).length;
}

function notChecked(url) {
	return visited[url] == undefined || visited[url] == false;
}