(function() {
    console.log("Maps Lead Pro: Content script loaded.");

    let scrollInterval;
    let lastHeight = 0;
    let sameHeightCount = 0;

    // Listen for commands
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'startScrolling') {
            startScraping();
        }
    });

    // Automatically check if we should start (based on storage)
    chrome.storage.local.get(['isExtracting'], (res) => {
        if (res.isExtracting) {
            // Wait for map to load
            setTimeout(startScraping, 3000);
        }
    });

    function startScraping() {
        const scrollContainer = document.querySelector('div[role="feed"]');
        if (!scrollContainer) {
            console.log("Feed container not found, retrying...");
            setTimeout(startScraping, 2000);
            return;
        }

        console.log("Starting scroll...");
        lastHeight = scrollContainer.scrollHeight;
        
        scrollInterval = setInterval(() => {
            scrollContainer.scrollTo(0, scrollContainer.scrollHeight);
            
            setTimeout(() => {
                const currentHeight = scrollContainer.scrollHeight;
                const endOfList = document.body.innerText.includes("You've reached the end of the list");

                if (currentHeight === lastHeight || endOfList) {
                    sameHeightCount++;
                    if (sameHeightCount > 3 || endOfList) { // Check a few times to be sure
                        clearInterval(scrollInterval);
                        console.log("Finished scrolling, extracting data...");
                        extractData();
                    }
                } else {
                    lastHeight = currentHeight;
                    sameHeightCount = 0;
                }
            }, 1000);
        }, 2000);
    }

    function extractData() {
        const results = [];
        const items = document.querySelectorAll('div[role="article"]'); 

        items.forEach(item => {
            try {
                const nameElement = item.querySelector('.fontHeadlineSmall');
                const name = nameElement?.innerText || "";
                
                // Link and coordinates
                const linkElement = item.querySelector('a.hfpxzc');
                const href = linkElement?.getAttribute('href') || "";
                let lat = "", lng = "";
                if (href) {
                    const coordsMatch = href.match(/!3d([-\d.]+)!4d([-\d.]+)/);
                    if (coordsMatch) {
                        lat = coordsMatch[1];
                        lng = coordsMatch[2];
                    }
                }

                const ratingInfo = item.querySelector('.MW4etd')?.innerText || ""; 
                const reviews = item.querySelector('.UY7F9')?.innerText.replace(/[()]/g, "") || "";
                const details = Array.from(item.querySelectorAll('.fontBodyMedium div')).map(d => d.innerText);
                
                // Detect Price Level (e.g. $$, $$$)
                let price = "";
                const priceMatch = item.innerText.match(/[₹€$]{1,4}/);
                if (priceMatch) price = priceMatch[0];

                // Detect Hours/Status
                let hours = "";
                const hoursMatch = item.innerText.match(/(Open|Closed|Opens|Closes|Check-in|Check-out)\s\d*[:.\s]?[0-9a-zA-Z\s]*/i);
                if (hoursMatch) hours = hoursMatch[0];

                // Detect Plus Code (e.g. 5G2P+6X London)
                let plusCode = "";
                const plusCodeMatch = item.innerText.match(/[A-Z0-9]{4}\+[A-Z0-9]{2,}/);
                if (plusCodeMatch) plusCode = plusCodeMatch[0];

                const category = details[0] || "";
                const address = details[1] || "";
                
                // Improved Phone Extraction
                let phone = "";
                const phoneElement = item.querySelector('.UsdlK, .Us7Ur, [aria-label*="Phone"]');
                if (phoneElement) {
                    phone = phoneElement.innerText.replace("Phone: ", "");
                } else {
                    // Fallback 1: search for phone pattern in the item text
                    const phoneMatch = item.innerText.match(/(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);
                    if (phoneMatch) {
                        phone = phoneMatch[0];
                    } else {
                        // Fallback 2: check aria-label of the main container
                        const ariaLabel = item.getAttribute('aria-label') || "";
                        const ariaMatch = ariaLabel.match(/(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);
                        if (ariaMatch) phone = ariaMatch[0];
                    }
                }

                const websiteLink = item.querySelector('a[aria-label*="website" i]')?.href || "";

                if (name) {
                    results.push({
                        name,
                        stars: ratingInfo,
                        reviews,
                        category,
                        address,
                        phone,
                        website: websiteLink,
                        lat,
                        lng,
                        price,
                        hours,
                        plusCode
                    });
                }
            } catch (e) {
                console.error("Error extracting item:", e);
            }
        });

        console.log(`Extracted ${results.length} items. Sending to background...`);
        chrome.runtime.sendMessage({ action: 'dataExtracted', data: results }, (response) => {
            chrome.runtime.sendMessage({ action: 'searchComplete' });
        });
    }
})();
