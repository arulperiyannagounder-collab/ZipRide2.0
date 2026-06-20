import { fareAnalyzer } from '../services/fareAnalyzer';

function bypassPolicies() {
  const commonAcceptTexts = ['accept', 'agree', 'got it', 'i understand', 'allow all', 'accept cookies'];
  const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
  
  for (const btn of buttons) {
    const text = (btn.textContent || '').trim().toLowerCase();
    if (commonAcceptTexts.some(acceptText => text === acceptText || text.includes(` ${acceptText} `) || text.startsWith(`${acceptText} `) || text.endsWith(` ${acceptText}`))) {
      // Check if it's visible
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        try {
          (btn as HTMLElement).click();
          console.log('[Ride Fairness] Auto-clicked policy button:', text);
        } catch (e) {}
      }
    }
  }
}

function scanPage() {
  bypassPolicies();
  
  const rideDetails = fareAnalyzer.analyzeCurrentPage(window.location.href, document);
  
  if (rideDetails) {
    chrome.runtime.sendMessage({
      type: 'RIDE_DETECTED',
      payload: rideDetails
    }).catch(err => console.log('Background worker not ready or popup closed', err));
  }
}

// Initial scan
setTimeout(scanPage, 2000);

// Observe DOM for changes (SPAs like Uber/Ola)
const observer = new MutationObserver((mutations) => {
  // Simple debounce
  if ((window as any)._scanTimeout) clearTimeout((window as any)._scanTimeout);
  (window as any)._scanTimeout = setTimeout(scanPage, 1000);
});

observer.observe(document.body, { childList: true, subtree: true });
