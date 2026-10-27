import { countUrls, getIgnoredParams, normalizeData } from "./lib/store.js";
import { DEFAULT_IGNORED_PARAMS, parseRules } from "./lib/url.js";

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

async function saveParams() {
    const text = document.getElementById("ignored-params").value;
    const { errors } = parseRules(text);
    if (errors.length) {
        showStatus(errors.join(" "), true, "params-status");
        return;
    }
    const response = await chrome.runtime.sendMessage({ action: 'saveIgnoredParams', text: text });
    if (!response?.ok) {
        showStatus(`Save failed: ${response?.error ?? "unknown error"}`, true, "params-status");
        return;
    }
    const { merged } = response.result;
    showStatus(merged
        ? `Saved. ${merged} marked URLs were duplicates under the new rules and were merged.`
        : "Saved.", false, "params-status");
}

function resetParams() {
    document.getElementById("ignored-params").value = DEFAULT_IGNORED_PARAMS;
    return saveParams();
}

function showStatus(text, isError = false, id = "status") {
    const status = document.getElementById(id);
    status.textContent = text;
    status.classList.toggle("error", isError);
}

document.addEventListener('DOMContentLoaded', async function() {
    document.getElementById("download").addEventListener("click", download);
    document.getElementById('upload').addEventListener("change", upload, false);
    document.getElementById("import").addEventListener('click', openDialog);
    document.getElementById("clear").addEventListener('click', clearData)
    document.getElementById("save-params").addEventListener('click', saveParams);
    document.getElementById("reset-params").addEventListener('click', resetParams);
    document.getElementById("ignored-params").value = await getIgnoredParams();
}, false);
