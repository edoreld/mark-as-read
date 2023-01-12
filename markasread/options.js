import { tcDefaults } from "./defaults.js"

function download() {
    chrome.storage.local.get("visited", function(obj) {
        var result = JSON.stringify(obj["visited"], null, 4); 
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
    reader.onload = function(e) {
        var result = JSON.parse(e.target.result);
        chrome.runtime.sendMessage({ action: 'import', data: result });
    }
    reader.readAsText(file);
    upload.value = '';
}

function openDialog() {
    document.getElementById('upload').click();
}

function clearData() {
    chrome.storage.local.clear();
}


async function saveOptions() {
	var changeLinkColor = document.getElementById("changeLinkColor").checked;
	var linkColor = document.getElementById("linkColor").value;
	var sites = document.getElementById("sites").value;

	await chrome.storage.local.remove([
		"changeLinkColor",
		"linkColor",
		"sites"
	]);
	await chrome.storage.local.set(
		{
			changeLinkColor: changeLinkColor || tcDefaults.changeLinkColor,
			linkColor: linkColor || tcDefaults.linkColor,
			sites: sites || tcDefaults.sites
		}
    )
    // Update status to let user know options were saved.
    var status = document.getElementById("status");
    status.textContent = "Options saved";
    setTimeout(function() {
        status.textContent = "";
    }, 1000);
}

async function restoreDefaults() {
	await chrome.storage.local.set(tcDefaults)
    await restoreOptions();
    // Update status to let user know options were saved.
    var status = document.getElementById("status");
    status.textContent = "Default options restored";
    setTimeout(function() {
        status.textContent = "";
    }, 1000);
}

function restoreOptions() {
	return chrome.storage.local.get(tcDefaults).then(storage => {
		document.getElementById("changeLinkColor").checked = storage.changeLinkColor != tcDefaults.changeLinkColor ? storage.changeLinkColor : false;
		document.getElementById("linkColor").value = storage.linkColor != tcDefaults.linkColor ? storage.linkColor : "";
		document.getElementById("sites").value = storage.sites != tcDefaults.sites ? storage.sites : "";
	});
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("download").addEventListener("click", download);
    document.getElementById('upload').addEventListener("change", upload, false);
    document.getElementById("import").addEventListener('click', openDialog);
    document.getElementById("clear").addEventListener('click', clearData)
    document.getElementById("save").addEventListener("click", saveOptions);
	document.getElementById("restore").addEventListener("click", restoreDefaults);
	restoreOptions();
}, false);