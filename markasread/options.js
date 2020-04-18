function download() {
	chrome.storage.sync.get("visited", function (obj) {
		var result = JSON.stringify(obj);
		var url = 'data:application/json;base64,' + btoa(result);
		chrome.downloads.download({
			url: url,
			filename: 'data.json'
		});
	});
}

function upload() {
	var file = this.files[0];
	var reader = new FileReader();
	reader.onload = function(e){
		var result = JSON.parse(e.target.result);
		console.log("result:" + result.visited);
		chrome.runtime.sendMessage({action: 'import', data: result});
	}
	reader.readAsText(file);
	upload.value = '';
}

function openDialog() {
	document.getElementById('upload').click();
}

document.addEventListener('DOMContentLoaded', function() {
	document.getElementById("download").addEventListener("click", download);
	document.getElementById('upload').addEventListener("change", upload, false);	
	document.getElementById("import").addEventListener('click', openDialog);
}, false);