let extractionQueue = [];
let currentIndex = 0;
let isExtracting = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'start') {
        startExtraction(msg.categories, msg.locations);
    } else if (msg.action === 'stop') {
        stopExtraction();
    } else if (msg.action === 'dataExtracted') {
        saveData(msg.data);
    }
});

async function startExtraction(categories, locations) {
    extractionQueue = [];
    for (const category of categories) {
        for (const location of locations) {
            extractionQueue.push({ category, location });
        }
    }

    currentIndex = 0;
    isExtracting = true;
    
    chrome.storage.local.set({
        isExtracting: true,
        totalQueries: extractionQueue.length,
        currentQueryIndex: 0,
        allLeads: [] 
    });

    processNext();
}

function stopExtraction() {
    isExtracting = false;
    chrome.storage.local.set({ isExtracting: false });
}

async function processNext() {
    if (!isExtracting || currentIndex >= extractionQueue.length) {
        isExtracting = false;
        chrome.storage.local.set({ isExtracting: false });
        chrome.runtime.sendMessage({ action: 'extractionFinished' });
        return;
    }

    const item = extractionQueue[currentIndex];
    const query = item.category ? `${item.category} in ${item.location}` : item.location;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

    chrome.storage.local.set({
        currentQueryIndex: currentIndex,
        currentNiche: item.category || "All",
        currentLocation: item.location
    });

    // Notify popup
    chrome.runtime.sendMessage({
        action: 'updateProgress',
        data: {
            currentQueryIndex: currentIndex,
            totalQueries: extractionQueue.length,
            currentNiche: item.category || "All",
            currentLocation: item.location
        }
    });

    // Create or update tab
    chrome.tabs.query({ url: "https://www.google.com/maps/*" }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { url: url, active: true }, () => {
                // Content script will take over
            });
        } else {
            chrome.tabs.create({ url: url });
        }
    });

    currentIndex++;
}

function saveData(newData) {
    chrome.storage.local.get(['allLeads'], (res) => {
        const existingLeads = res.allLeads || [];
        // Filter out duplicates based on name and phone
        const uniqueNewData = newData.filter(newLead => 
            !existingLeads.some(oldLead => oldLead.name === newLead.name && oldLead.phone === newLead.phone)
        );
        
        const updatedLeads = [...existingLeads, ...uniqueNewData];
        chrome.storage.local.set({ allLeads: updatedLeads });

        // Update popup
        chrome.runtime.sendMessage({
            action: 'updateProgress',
            data: { allLeads: updatedLeads }
        });

        // After some delay or specific signal, proceed to next query
        // For now, we'll wait for content script to signal "I'm done with this search"
    });
}

// Listener for content script signaling completion
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'searchComplete') {
        setTimeout(() => {
            processNext();
        }, 3000); // Wait 3 seconds before next search to be safe
    }
});
