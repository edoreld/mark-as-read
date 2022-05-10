chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action == "get_links") {
        let links = document.querySelectorAll('a');
        links = Array.from(links).map(link => link.href)
        sendResponse(links)
    } else if (message.action == "change_link_color") {
        let linkElements = document.querySelectorAll('a');
        changeLinkColor(message.links, linkElements, message.linkColor)
        sendResponse()
    } else if (message.action == "start_mutation_observer") {
        // define what element should be observed by the observer
        // and what types of mutations trigger the callback
        observer.observe(
            document, 
            {
                subtree: true, childList: true 
            }
        );
        sendResponse()
    }
});

function changeLinkColor(linksToMatch, linkElementsToSearch, linkColor) {
    const linksSet = new Set(linksToMatch)
    linkElementsToSearch.forEach(linkElement => {
        if (linksSet.has(linkElement.href)) {
            linkElement.querySelectorAll("*").forEach(a => a.style.color = linkColor)
        }
    })
}

var observer = new MutationObserver(function(mutations) {
    const linkElements = mutations.flatMap(mutation => Array.from(mutation.addedNodes))
                                    .filter(node => node.nodeType == Node.ELEMENT_NODE)
                                    .flatMap(node => Array.from(node.querySelectorAll('a')))
    const links = linkElements.map(node => node.href)
    chrome.runtime.sendMessage({ links: links, action: "process_post_load_elements" }) 
});