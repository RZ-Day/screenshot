chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action && message.action === "captureVisibleTab") {

        (async () => {
            try {
                const screenshotData = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
                sendResponse(screenshotData);
            } catch (error) {
                console.error('Screenshot error:', error);
                sendResponse(null);
            }
        })();

        return true;
    }
});

chrome.action.onClicked.addListener((tab) => {
    console.log("Clicked");
    

    if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {action: "Trigger"}, (response) => {
            if (response && response.status === "success") {
                console.log("Finished without error");
            } else {
                console.error("something went horribly wrong");
            }
        })
    }
});