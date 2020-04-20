if(typeof visited !== 'undefined') {
	var links = document.getElementsByTagName('a');
	for(var link in links) {
		var element = links[link];
		if (isVisited(element.href)) {
			element.style.color = linkColor;
		}
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

function getKey(url) {
	return new URL(url).origin;
}