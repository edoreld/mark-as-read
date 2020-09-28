var tcDefaults = {
	changeLinkColor: false,
	linkColor: 'blue',
	sites: `https://github.com`	
};

chrome.runtime.onInstalled.addListener(function () {
	// console.log("onInstalled");
	chrome.storage.local.get("visited", function (obj) {
		if (obj["visited"] == undefined) {
			// console.log("obj undefined");
			visited = {};
		} else {
			// console.log("obj defined");
			visited = obj["visited"];
		}
	});
})

chrome.runtime.onStartup.addListener(function () {
	// console.log("onStartup");
	visited = {};
	chrome.storage.local.get("visited", function (obj) {
		if (obj["visited"] == undefined) {
			visited = {};
		} else { 			
			visited = obj["visited"];
		}
	});
});

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
		if (visited[tab[0].url] == undefined || visited[tab[0].url] == false) {
			visited[tab[0].url] = true;
			markAsVisited(tab[0].id);
		} else { 
			visited[tab[0].url] = false;
			markAsNotVisited(tab[0].id);
		}
		updateRemoteDictionary();
	});
})

/** 
* Upon switching to a new tab and on it being activated, we check if this is the tab's
* first time being loaded, and if so we mark it as not visited
*/
chrome.tabs.onActivated.addListener(function callback(activeInfo) {
	// console.log("onActivated");
	chrome.tabs.query({'active': true, 'currentWindow': true}, function (tab) {
		// console.log(tab[0].url);
		if (visited[tab[0].url] == undefined || visited[tab[0].url] == false) {
			markAsNotVisited(tab[0].id);
		} else { 
			markAsVisited(tab[0].id);
		}
	});
});

chrome.tabs.onUpdated.addListener(function callback(activeInfo, info) {
	// console.log("onUpdated");
	chrome.tabs.getSelected(null, function(tab){
		if (visited[tab.url] == undefined || visited[tab.url] == false) {
			markAsNotVisited();
		} else { 
			markAsVisited();
		}
		if (info.status === 'complete') {
			changeLinkColor(tab);
		}
	});
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
			if(storage.sites.split("\n").filter(site => tab.url.includes(site)).length) {
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