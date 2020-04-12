document.addEventListener('DOMContentLoaded', function() {

	let download = document.getElementById('download');
	download.onclick = function(element) {
		chrome.storage.sync.get("visited", function (obj) {
		var result = JSON.stringify(obj);
		var url = 'data:application/json;base64,' + btoa(result);
		chrome.downloads.download({
			url: url,
			filename: 'data.json'
		});
		});
	};	

	let upload = document.getElementById('upload');
	upload.addEventListener("change", function () {
		var file = this.files[0];
		var reader = new FileReader();
		reader.onload = function(e){
			var result = JSON.parse(e.target.result);
			console.log("result:" + result.visited);
			chrome.runtime.sendMessage({action: 'import', data: result});
		}
		reader.readAsText(file);
		upload.value = '';
	}, false);	 
	
}, false);