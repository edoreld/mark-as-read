chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action == "get_links") {
        let links = document.querySelectorAll('a');
        links = Array.from(links).map(link => link.href)
        sendResponse(links)
    } else if (message.action == "change_link_color") {
        let links = document.querySelectorAll('a');
        const linksSet = new Set(message.links)
        links.forEach(link => {
            if (linksSet.has(link.href)) {
                 link.querySelectorAll("*").forEach(a => a.style.color = message.linkColor)
            }
        })
        sendResponse()
    }
});