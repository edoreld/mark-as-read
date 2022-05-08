var tabId;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action == "get_links") {
        let links = document.querySelectorAll('a');
        links = Array.from(links).map(link => link.href)
        sendResponse(links)
    } else if (message.action == "change_link_color") {
        let linkElements = document.querySelectorAll('a');
        changeLinkColor(message.links, linkElements)
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
    }
});

function changeLinkColor(linksToMatch, linkElementsToSearch) {
    const linksSet = new Set(linksToMatch)
    linkElementsToSearch.forEach(linkElement => {
        if (linksSet.has(linkElement.href)) {
            linkElement.querySelectorAll("*").forEach(a => a.style.color = message.linkColor)
        }
    })
}

var observer = new MutationObserver(function(mutations, observer) {
    console.log(mutations)
    const linkElements = mutations.flatMap(mutation => mutation.addedNodes).filter(node => node.nodeName == "A")
    const links = linkElements.map(node => node.href)
    chrome.runtime.sendMessage({ links: links, action: "get_visited" }).then(visited => {
        changeLinkColor(visited, linkElements)
    })
    // let links = document.querySelectorAll('a');
    // const linksSet = new Set(message.links)
    // links.forEach(link => {
    //     if (linksSet.has(link.href)) {
    //             link.querySelectorAll("*").forEach(a => a.style.color = message.linkColor)
    //     }
    // })
});