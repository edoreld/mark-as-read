chrome.runtime.onInstalled.addListener(function () {
	console.log("onInstalled");
	fetchMarkData();
})

chrome.runtime.onStartup.addListener(function () {
	console.log("onStartup");
	visited = {};
	fetchMarkData();
});

chrome.browserAction.onClicked.addListener(function(tabs) { 
	chrome.tabs.query({'active': true, 'currentWindow': true}, function (tab) {
		if (!markedAsRead(tab[0].url)) {
			addUrl(tab[0].url);
			markAsVisited(tab[0].id);
		} else {
			removeUrl(tab[0].url);
			markAsNotVisited(tab[0].id);
		}
	});
})

chrome.tabs.onActivated.addListener(function callback(activeInfo) {
	console.log("onActivated");
	chrome.tabs.query({'active': true, 'currentWindow': true}, function (tab) {
		console.log(tab[0].url);
		if (!markedAsRead(tab[0].url)) {
			markAsNotVisited(tab[0].id);
		} else { 
			markAsVisited(tab[0].id);
		}
	});
});

chrome.tabs.onUpdated.addListener(function callback(activeInfo, info) {
	console.log("onUpdated");
	chrome.tabs.getSelected(null, function(tab){
		if (!markedAsRead(tab.url)) {
			markAsNotVisited();
		} else { 
			markAsVisited();
		}
	});
});

chrome.commands.onCommand.addListener(function(command) {
	console.log("onCommand");
	chrome.tabs.query({'active': true, 'currentWindow': true}, function (tab) {
		if (!markedAsRead(tab[0].url)) {
			addUrl(tab[0].url);
			markAsVisited(tab[0].id);
		} else {
			removeUrl(tab[0].url);
			markAsNotVisited(tab[0].id);
		}
	});
})

function fetchMarkData() {	
	chrome.storage.sync.get("visited", function (obj) {
		if (obj["visited"] == undefined) {
			visited = {version: 2};
		} else {
			var objVisited = obj["visited"];
			if(objVisited.version == 2) {
				visited = objVisited;
			} else {
				visited = {version: 2};
				Object.keys(objVisited).forEach(
					url => addUrl(url)
					);
			}
		}
	});
}

function updateMarkData() {	
	chrome.storage.sync.set({"visited": visited}, function() {
		if (chrome.runtime.error) {
			console.log("Runtime error.");
		}
	});
}

function markAsNotVisited(atabId) {
	console.log("markAsNotVisited");
	chrome.browserAction.setIcon({path: "notvisited.png", tabId: atabId});
	updateMarkData();
}

function markAsVisited(atabId) {
	console.log("markAsVisited");
	chrome.browserAction.setIcon({path: "visited.png", tabId: atabId });
	updateMarkData();
}

chrome.runtime.onMessage.addListener(function (msg) {
    if (msg.action === 'import') {
		var data = msg.data;
		Object.keys(data)
			.filter(key => key != 'version')
			.forEach(
				key => {
					data[key]
						.filter(value => !markedAsRead(key + value))
						.forEach(value => addUrl(key + value));
				}
			);		
		updateMarkData();
    }
});

function removeUrl(url) {
	console.log("Remove URL")
	var key = getKey(url);
	console.log(`Key ${key}`)
	var path = url.replace(key, '');
	console.log(`Path ${path}`)
	const index = visited[key].indexOf(path);
	console.log(`Index ${index}`)
	if (index > -1) {
		visited[key].splice(index, 1);
	}
	if(!visited[key].length) {
		delete visited[key];
	}
}

function markedAsRead(url) {
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
	console.log("Add URL")
	var key = getKey(url);
	console.log(`Key ${key}`)
	var path = url.replace(key, '');
	console.log(`Path ${path}`)
	if(visited[key]) {
		visited[key].push(path);
	} else {
		visited[key] = [path];
	}
}

function getKey(url) {
	return new URL(url).origin;
}