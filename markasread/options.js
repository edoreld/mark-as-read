import { countUrls, normalizeData } from "./lib/store.js";

async function download() {
    const obj = await chrome.storage.local.get("visited");
    const result = JSON.stringify(obj["visited"] ?? {}, null, 4);
    const url = URL.createObjectURL(new Blob([result], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "data.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function upload(event) {
    const input = event.target;
    const file = input.files[0];
    // Reset so selecting the same file again still fires "change".
    input.value = '';
    if (!file) {
        return;
    }

    let data;
    try {
        data = normalizeData(JSON.parse(await file.text()));
    } catch (err) {
        showStatus(`Import failed: ${err.message}`, true);
        return;
    }
    if (!countUrls(data)) {
        showStatus("Import failed: no URLs found in that file.", true);
        return;
    }

    showStatus("Importing…");
    const response = await chrome.runtime.sendMessage({ action: 'import', data: data });
    if (!response?.ok) {
        showStatus(`Import failed: ${response?.error ?? "unknown error"}`, true);
        return;
    }
    const { added, total } = response.result;
    showStatus(`Imported ${added} new URLs (${total - added} were already marked).`);
}

function openDialog() {
    document.getElementById('upload').click();
}

async function clearData() {
    if (!confirm("Delete all pages marked as read? This cannot be undone. Consider exporting a backup first.")) {
        return;
    }
    const response = await chrome.runtime.sendMessage({ action: 'clear' });
    if (response?.ok) {
        showStatus("All marked pages were deleted.");
    } else {
        showStatus(`Clear failed: ${response?.error ?? "unknown error"}`, true);
    }
}

function showStatus(text, isError = false) {
    const status = document.getElementById("status");
    status.textContent = text;
    status.classList.toggle("error", isError);
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("download").addEventListener("click", download);
    document.getElementById('upload').addEventListener("change", upload, false);
    document.getElementById("import").addEventListener('click', openDialog);
    document.getElementById("clear").addEventListener('click', clearData)
}, false);
