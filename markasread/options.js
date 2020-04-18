var tcDefaults = {
	changeLinkColor: false, // default: false
	linkColor: 'blue', // default: blue
	sites: `github.com
https://bitbucket.org`	
};

function saveOptions() {
	var changeLinkColor = document.getElementById("changeLinkColor").checked;
	var linkColor = document.getElementById("linkColor").value;
	var sites = document.getElementById("sites").value;

	chrome.storage.sync.remove([
		"changeLinkColor",
		"linkColor"
	]);
	chrome.storage.sync.set(
		{
			changeLinkColor: changeLinkColor,
			linkColor: linkColor,
			sites: sites
		},
		function() {
			// Update status to let user know options were saved.
			var status = document.getElementById("status");
			status.textContent = "Options saved";
			setTimeout(function() {
				status.textContent = "";
			}, 1000);
    }
  );
}

function restoreDefaults() {
	chrome.storage.sync.set(tcDefaults, function() {
		restoreOptions();
		// Update status to let user know options were saved.
		var status = document.getElementById("status");
		status.textContent = "Default options restored";
		setTimeout(function() {
			status.textContent = "";
		}, 1000);
	});
}

function restoreOptions() {
	chrome.storage.sync.get(tcDefaults, function(storage) {
		document.getElementById("changeLinkColor").checked = storage.changeLinkColor;
		document.getElementById("linkColor").value = storage.linkColor;
		document.getElementById("sites").value = storage.sites;
	});
}

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
	document.getElementById('upload').addEventListener("change", upload,false);
	document.getElementById("import").addEventListener('click', openDialog);
	document.getElementById("save").addEventListener("click", saveOptions);
	document.getElementById("restore").addEventListener("click", restoreDefaults);
	restoreOptions();
}, false);