console.log("Successfully injected!");


//Listener creation and cleanup:
const messageListener = (message, sender, sendResponse) => {
    console.log("Message received");

    if (message.action && message.action === "Trigger") {
        captureFullPage();
        sendResponse({status: "success"});
    }
}

chrome.runtime.onMessage.addListener(messageListener);

const cleanup = () => {
    chrome.runtime.onMessage.removeListener(messageListener);
}

const getPageHeights = () => {
    const totalHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    
    return {
        totalHeight,
        viewportHeight
    }
}

const finishCapture = async (screenshots) => {
    const base64Images = processScreenshots(screenshots);
    mergeAndDownloadImages(base64Images)
    .then(() => console.log('Images merged and downloaded successfully'))
    .catch(error => console.error('Error:', error));
}

const captureFullPage = async () => {
    const { totalHeight, viewportHeight } = getPageHeights();
    let currentPosition = 0;
    const screenshots = [];
    
    // Helper function to capture screenshot
    const captureScreen = () => {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { action: "captureVisibleTab" },
                (imageData) => {
                    if (chrome.runtime.lastError) {
                        console.error('Capture error:', chrome.runtime.lastError);
                        resolve(null);
                        return;
                    }
                    resolve(imageData);
                }
            );
        });
    };

    // Helper function for controlled delay
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        while (currentPosition + viewportHeight < totalHeight) {
            console.log("in loop, ", currentPosition);
            
            // Scroll to position
            window.scrollTo(0, currentPosition);
            
            // Wait for scroll to settle and page to render
            await sleep(500);
            
            // Capture screenshot
            const imageData = await captureScreen();
            if (imageData) {
                screenshots.push(imageData);
            }
            
            currentPosition += viewportHeight;
        }

        // Get the final section if needed
        if (currentPosition < totalHeight) {
            window.scrollTo(0, totalHeight - viewportHeight);
            await sleep(500);
            const imageData = await captureScreen();
            if (imageData) {
                screenshots.push(imageData);
            }
        }
        
        // Reset scroll position
        window.scrollTo(0, 0);
        
        console.log(`Captured ${screenshots.length} screenshots`);
        finishCapture(screenshots);
        
    } catch (error) {
        console.error('Error during capture:', error);
    } finally {
        //cleanup();
    }
}

//=======================================================================================

async function mergeAndDownloadImages(base64Images) {
    // Create canvases for each image to get dimensions
    const imagePromises = base64Images.map(base64 => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = base64;
        });
    });

    try {
        // Wait for all images to load
        const images = await Promise.all(imagePromises);
        
        // Calculate total height and max width
        let totalHeight = 0;
        let maxWidth = 0;
        
        images.forEach(img => {
            totalHeight += img.height;
            maxWidth = Math.max(maxWidth, img.width);
        });

        // Create final canvas
        const canvas = document.createElement('canvas');
        canvas.width = maxWidth;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');

        // Draw each image
        let currentY = 0;
        images.forEach(img => {
            ctx.drawImage(img, 0, currentY);
            currentY += img.height;
        });

        // Convert to PNG and download
        const finalImage = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = finalImage;
        downloadLink.download = 'merged_screenshot.png';
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

    } catch (error) {
        console.error('Error merging images:', error);
        throw error;
    }
}

// Helper function to process the data structure you provided
function processScreenshots(screenshotData) {
    // Extract base64 strings from the numbered properties
    const base64Images = [];
    for (let i = 0; i < screenshotData.length; i++) {
        if (screenshotData[i]) {
            base64Images.push(screenshotData[i]);
        }
    }
    return base64Images;
}