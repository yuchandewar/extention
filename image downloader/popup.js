// Popup script
document.getElementById('downloadAll').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: triggerAllDownloads
        });
    });
});

function triggerAllDownloads() {
    const images = document.querySelectorAll('img[src*="cdn-icons-png.freepik.com"]');
    if (images.length === 0) {
        alert("No icons found on this page!");
        return;
    }

    if (confirm(`Download all ${images.length} icons found on this page?`)) {
        images.forEach((img, index) => {
            // Add a small delay between downloads to prevent flooding
            setTimeout(() => {
                const url = img.src;
                const altText = img.alt || `icon_${index}`;
                
                chrome.runtime.sendMessage({
                    action: "download",
                    url: url,
                    filename: altText
                });
            }, index * 200);
        });
    }
}
