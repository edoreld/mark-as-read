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
		if (!isVisited(tab[0].url)) {
			addUrl(tab[0].url);
			markAsVisited(tab[0].id);
		} else {
			removeUrl(tab[0].url);
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
		if (!isVisited(tab[0].url)) {
			markAsNotVisited(tab[0].id);
		} else { 
			markAsVisited(tab[0].id);
		}
	});
});

chrome.tabs.onUpdated.addListener(function(changeInfo, tab) {
	// console.log("onUpdated");
	chrome.tabs.getSelected(null, function(tab){
		if (!isVisited(tab.url)) {
			markAsNotVisited();
		} 
		else { 
			markAsVisited();
		}
		if (changeInfo.status === 'complete') {
			changeLinkColor(tab);
		}
	});
});

function fetchRemoteDictionary() {	
	chrome.storage.sync.get("visited", function (obj) {
		if (obj["visited"] == undefined) {
			visited = {version: 2};
		} else {
			var objVisited = obj["visited"];
			if(objVisited.version == 2) {
				visited = objVisited;
			} else {
				visited = {version: 2};
				Object.keys(objVisited).forEach(url => addUrl(url));
			}
		}
	});
}

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
		var data = msg.data;
		Object.keys(data)
			.filter(key => key != 'version')
			.forEach(
				key => {
					data[key]
						.filter(value => !isVisited(key + value))
						.forEach(value => addUrl(key + value));
					
				}
			);		
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

function removeUrl(url) {
	var key = getKey(url);
	var path = url.replace(key, '');
	const index = visited[key].indexOf(path);
	if (index > -1) {
		visited[key].splice(index, 1);
	}
	if(!visited[key].length) {
		delete visited[key];
	}
}

function isVisited(url) {
	if(url) {
		var key = getKey(url);
		if(visited[key]) {
			var path = url.replace(key, '');
			return visited[key].includes(path);
		}		
	}
	return false;
}

function addUrl(url){
	var key = getKey(url);
	var path = url.replace(key, '');
	if(visited[key]) {
		visited[key].push(path);
	} else {
		visited[key] = [path];
	}
}

function getKey(url) {
	return new URL(url).origin;
}