document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const clearBtn = document.getElementById('clearBtn');
    const categoriesInput = document.getElementById('categories');
    const locationsInput = document.getElementById('locations');
    const statusBadge = document.getElementById('statusBadge');
    const progressSection = document.getElementById('progressSection');
    const progressFill = document.getElementById('progressFill');
    const currentSearch = document.getElementById('currentSearch');
    const leadsCountText = document.getElementById('leadsCount');
    const totalLeadsText = document.getElementById('totalLeads');
    const queriesCompletedText = document.getElementById('queriesCompleted');

    // Load initial state
    chrome.storage.local.get(['isExtracting', 'allLeads', 'currentQueryIndex', 'totalQueries', 'currentNiche', 'currentLocation'], (res) => {
        if (res.isExtracting) {
            updateUIActive(true);
            updateProgress(res);
        }
        if (res.allLeads) {
            totalLeadsText.textContent = res.allLeads.length;
            if (res.allLeads.length > 0) exportCsvBtn.disabled = false;
        }
    });

    startBtn.addEventListener('click', () => {
        const categories = categoriesInput.value.split(',').map(s => s.trim()).filter(s => s);
        const locations = locationsInput.value.split(',').map(s => s.trim()).filter(s => s);

        if (locations.length === 0) {
            alert('Please enter at least one location.');
            return;
        }

        chrome.runtime.sendMessage({
            action: 'start',
            categories: categories.length > 0 ? categories : [""], 
            locations
        });

        updateUIActive(true);
    });

    stopBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'stop' });
        updateUIActive(false);
    });

    exportCsvBtn.addEventListener('click', () => {
        chrome.storage.local.get(['allLeads'], (res) => {
            if (res.allLeads && res.allLeads.length > 0) {
                downloadCSV(res.allLeads);
            }
        });
    });

    clearBtn.addEventListener('click', () => {
        if (confirm('Clear all extracted data?')) {
            chrome.storage.local.set({ allLeads: [] }, () => {
                totalLeadsText.textContent = '0';
                exportCsvBtn.disabled = true;
            });
        }
    });

    // Listen for updates from background
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'updateProgress') {
            updateProgress(msg.data);
        } else if (msg.action === 'extractionFinished') {
            updateUIActive(false);
            statusBadge.textContent = 'Finished';
            statusBadge.classList.remove('active');
        }
    });

    function updateUIActive(active) {
        startBtn.disabled = active;
        stopBtn.disabled = !active;
        categoriesInput.disabled = active;
        locationsInput.disabled = active;
        
        if (active) {
            statusBadge.textContent = 'Extracting';
            statusBadge.classList.add('active');
            progressSection.style.display = 'block';
        } else {
            statusBadge.textContent = 'Idle';
            statusBadge.classList.remove('active');
        }
    }

    function updateProgress(data) {
        if (data.currentNiche && data.currentLocation) {
            currentSearch.textContent = `${data.currentNiche} in ${data.currentLocation}`;
        }
        if (data.allLeads) {
            totalLeadsText.textContent = data.allLeads.length;
            leadsCountText.textContent = `${data.allLeads.length} leads found`;
            if (data.allLeads.length > 0) exportCsvBtn.disabled = false;
        }
        if (data.totalQueries) {
            const percent = (data.currentQueryIndex / data.totalQueries) * 100;
            progressFill.style.width = `${percent}%`;
            queriesCompletedText.textContent = `${data.currentQueryIndex}/${data.totalQueries}`;
        }
    }

    function downloadCSV(data) {
        const headers = ['Name', 'Phone', 'Stars', 'Reviews', 'Category', 'Address', 'Website', 'Latitude', 'Longitude', 'Price', 'Hours', 'Plus Code'];
        const csvContent = [
            headers.join(','),
            ...data.map(lead => [
                `"${(lead.name || '').replace(/"/g, '""')}"`,
                `"${lead.phone || ''}"`,
                lead.stars || '',
                lead.reviews || '',
                `"${lead.category || ''}"`,
                `"${(lead.address || '').replace(/"/g, '""')}"`,
                `"${lead.website || ''}"`,
                lead.lat || '',
                lead.lng || '',
                `"${lead.price || ''}"`,
                `"${(lead.hours || '').replace(/"/g, '""')}"`,
                `"${lead.plusCode || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
