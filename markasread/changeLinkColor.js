console.log('running');
if(typeof visited !== 'undefined') {
	console.log(visited);
	var links = document.getElementsByTagName('a');
	for(var link in links) {
		var element = links[link];
		if (visited[element.href] === true) {
			element.style.color = linkColor;
		}
	}	
}
