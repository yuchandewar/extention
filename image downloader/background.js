// Background script to handle icon downloads
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "download") {
    const { url, filename } = request;
    
    // Sanitize filename
    const safeFilename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".png";

    chrome.downloads.download({
      url: url,
      filename: `Freepik-Icons/${safeFilename}`,
      conflictAction: "uniquify",
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Download failed:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log("Download started:", downloadId);
        sendResponse({ success: true, id: downloadId });
      }
    });

    return true; // Keep message channel open for async response
  }
});
