/**
 * Freepik Icon Downloader - Content Script
 */

const DOWNLOAD_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

function injectDownloadButtons() {
    // Find containers: relative aspect-square w-20
    const containers = document.querySelectorAll('div.relative.aspect-square.w-20:not(.fp-downloader-processed)');

    containers.forEach(container => {
        const img = container.querySelector('img[src*="cdn-icons-png.freepik.com"]');
        if (!img) return;

        container.classList.add('fp-downloader-processed');
        
        // Create download button
        const btn = document.createElement('button');
        btn.className = 'fp-download-btn';
        btn.innerHTML = DOWNLOAD_ICON_SVG;
        btn.title = 'Download PNG';
        
        // Prevent clicking the underlying link/overlay
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const url = img.src;
            const altText = img.alt || 'freepik_icon';
            
            chrome.runtime.sendMessage({
                action: "download",
                url: url,
                filename: altText
            });
        };

        container.appendChild(btn);
    });
}

// Observe for new icons (infinite scroll)
const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            shouldUpdate = true;
            break;
        }
    }
    if (shouldUpdate) {
        injectDownloadButtons();
    }
});

// Initial injection
setTimeout(injectDownloadButtons, 2000); // Wait for page to settle

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true
});
