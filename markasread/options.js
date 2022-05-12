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

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("download").addEventListener("click", download);
    document.getElementById('upload').addEventListener("change", upload, false);
    document.getElementById("import").addEventListener('click', openDialog);
    document.getElementById("clear").addEventListener('click', clearData)
}, false);