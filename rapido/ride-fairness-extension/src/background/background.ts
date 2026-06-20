import { storageService } from '../services/storageService';
import { fairnessEngine } from '../services/fairnessEngine';
import { transparencyEngine } from '../services/transparencyEngine';
import { RideDetails, RideHistoryEntry } from '../types';

let activeSearchTabs: Record<number, string> = {}; // tabId -> provider
let activeSearchDistance = 5;

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_SEARCH') {
    handleStartSearch(message.payload);
    sendResponse({ status: 'started' });
  } else if (message.type === 'RIDE_DETECTED') {
    // Check if this came from an active search tab
    if (sender.tab && sender.tab.id && activeSearchTabs[sender.tab.id]) {
      const provider = activeSearchTabs[sender.tab.id];
      handleAggregateResult(provider, message.payload);
    } else {
      handleRideDetected(message.payload);
    }
    sendResponse({ status: 'success' });
  }
  return true;
});

async function geocode(address: string) {
  try {
    let query = address;
    const lower = address.toLowerCase();
    // Contextualize local landmarks for OpenStreetMap to improve coordinate resolution rates
    if (!lower.includes('bangalore') && !lower.includes('bengaluru') && !lower.includes('india')) {
      query = `${address}, Bangalore, India`;
    }
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
      headers: {
        'User-Agent': 'RideFairnessExtension/1.0',
        'Accept': 'application/json'
      }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.error("Geocoding failed for", address, e);
  }
  return null;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;  
  const dLon = (lon2 - lon1) * Math.PI / 180; 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return parseFloat((R * c).toFixed(1));
}

async function handleStartSearch({ source, destination }: { source: string, destination: string }) {
  activeSearchTabs = {}; // Reset
  activeSearchDistance = 5;

  const pickupCoords = await geocode(source) || { lat: 0, lng: 0 };
  const dropCoords = await geocode(destination) || { lat: 0, lng: 0 };
  
  if (pickupCoords.lat && dropCoords.lat) {
    const dist = getDistance(pickupCoords.lat, pickupCoords.lng, dropCoords.lat, dropCoords.lng);
    activeSearchDistance = dist > 0 ? parseFloat((dist * 1.3).toFixed(1)) : 5; // x1.3 for driving distance estimate
  } else {
    // Dynamic fallback based on landmark input lengths if OSM is offline or rate-limited
    activeSearchDistance = Math.min(15, Math.max(4, Math.round((source.length + destination.length) / 3)));
  }

  // Load baseline parameters to calculate instant expected fare
  const settings = await storageService.getSettings();
  const estimatedSpeed = settings.estimatedSpeed || 30;
  const estimatedDuration = Math.round((activeSearchDistance / estimatedSpeed) * 60) + 3; // speed-based duration + 3m buffer
  
  // Construct a temporary ride to run through the unified fairness engine
  const tempRide: RideDetails = {
    provider: 'Generic',
    options: [{ vehicleType: 'Standard', fare: 0, eta: estimatedDuration }],
    distance: activeSearchDistance,
    surgeDetected: false,
    timestamp: Date.now()
  };
  const analysis = fairnessEngine.calculateFairPrice(tempRide, settings);
  const expectedFareVal = analysis.expectedFare;

  const uberPickup = pickupCoords.lat ? { addressLine1: source, latitude: pickupCoords.lat, longitude: pickupCoords.lng, provider: "google_places" } : { addressLine1: source, provider: "google_places" };
  const uberDrop = dropCoords.lat ? { addressLine1: destination, latitude: dropCoords.lat, longitude: dropCoords.lng, provider: "google_places" } : { addressLine1: destination, provider: "google_places" };

  const olaUrl = pickupCoords.lat 
    ? `https://book.olacabs.com/?pickup_name=${encodeURIComponent(source)}&lat=${pickupCoords.lat}&lng=${pickupCoords.lng}&drop_lat=${dropCoords.lat}&drop_lng=${dropCoords.lng}&drop_name=${encodeURIComponent(destination)}`
    : `https://book.olacabs.com/?pickup_name=${encodeURIComponent(source)}&drop_name=${encodeURIComponent(destination)}`;

  const providers = [
    { 
      name: 'Uber', 
      domain: 'uber.com', 
      url: `https://m.uber.com/go/product-selection?drop%5B0%5D=${encodeURIComponent(JSON.stringify(uberDrop))}&pickup=${encodeURIComponent(JSON.stringify(uberPickup))}` 
    },
    { name: 'Ola', domain: 'olacabs.com', url: olaUrl },
    { name: 'Rapido', domain: 'rapido.bike', url: `https://m.rapido.bike/unup-home/seo/${encodeURIComponent(source)}/${encodeURIComponent(destination)}?version=v3` }
  ];

  providers.forEach(provider => {
    // Send initial loading state to popup with instantaneous calculated estimates
    chrome.runtime.sendMessage({
      type: 'AGGREGATE_UPDATE',
      payload: { 
        provider: provider.name, 
        result: { 
          provider: provider.name, 
          status: 'loading',
          expectedFare: expectedFareVal,
          estimatedDistance: activeSearchDistance,
          estimatedDuration: estimatedDuration
        } 
      }
    }).catch(() => {});

    // Save loading state to storage directly so compare tab maintains it
    storageService.getSearchState().then(({ searchParams, aggregatedResults }) => {
      storageService.saveSearchState(searchParams, {
        ...aggregatedResults,
        [provider.name]: {
          provider: provider.name,
          status: 'loading',
          expectedFare: expectedFareVal,
          estimatedDistance: activeSearchDistance,
          estimatedDuration: estimatedDuration
        }
      });
    });

    // Check if a tab for this provider already exists
    chrome.tabs.query({ url: `*://*.${provider.domain}/*` }, (tabs) => {
      if (tabs && tabs.length > 0) {
        // Reuse the first existing tab
        const existingTab = tabs[0];
        
        chrome.tabs.update(existingTab.id!, { url: provider.url, active: false }, (updatedTab) => {
          if (updatedTab && updatedTab.id) {
            activeSearchTabs[updatedTab.id] = provider.name;
            setupTimeout(updatedTab.id, provider.name, expectedFareVal, activeSearchDistance);
          }
        });
      } else {
        // Create a new tab
        chrome.tabs.create({ url: provider.url, active: false }, (tab) => {
          if (tab.id) {
            activeSearchTabs[tab.id] = provider.name;
            setupTimeout(tab.id, provider.name, expectedFareVal, activeSearchDistance);
          }
        });
      }
    });
  });
}

function setupTimeout(tabId: number, providerName: string, expectedFareVal: number, distance: number) {
  setTimeout(() => {
    if (activeSearchTabs[tabId]) {
      chrome.runtime.sendMessage({
        type: 'AGGREGATE_UPDATE',
        payload: { 
          provider: providerName, 
          result: { 
            provider: providerName, 
            status: 'failed',
            expectedFare: expectedFareVal,
            estimatedDistance: distance
          } 
        }
      }).catch(() => {});
      delete activeSearchTabs[tabId];
    }
  }, 120000); // 2 minutes timeout
}

async function handleAggregateResult(provider: string, ride: RideDetails) {
  try {
    const settings = await storageService.getSettings();
    
    // Override raw scraped distance if it's default/not found on page, using background route estimation
    if (!ride.distance || ride.distance === 5) {
      ride.distance = activeSearchDistance;
    }

    const fp = fairnessEngine.calculateFairPrice(ride, settings);
    const ta = transparencyEngine.analyze(ride);
    const fa = fairnessEngine.calculateOverallFairness(fp.status, ta.transparencyScore, ride.surgeDetected);

    const resultPayload = { 
      provider, 
      status: 'completed' as const, 
      details: ride,
      fairnessScore: fa.fairnessScore,
      transparencyScore: ta.transparencyScore,
      fairPriceAnalysis: fp
    };

    chrome.runtime.sendMessage({
      type: 'AGGREGATE_UPDATE',
      payload: { 
        provider, 
        result: resultPayload 
      }
    }).catch(() => {});
    
    // Save to storage directly from background as well, in case popup is closed
    const { searchParams, aggregatedResults } = await storageService.getSearchState();
    await storageService.saveSearchState(searchParams, {
      ...aggregatedResults,
      [provider]: resultPayload
    });

  } catch (error) {
    console.error('Error handling aggregate result:', error);
  }
}

async function handleRideDetected(ride: RideDetails) {
  try {
    const settings = await storageService.getSettings();
    
    // Analyze
    const fp = fairnessEngine.calculateFairPrice(ride, settings);
    const ta = transparencyEngine.analyze(ride);
    const fa = fairnessEngine.calculateOverallFairness(fp.status, ta.transparencyScore, ride.surgeDetected);

    // Create history entry
    const historyEntry: RideHistoryEntry = {
      id: Date.now().toString(),
      date: ride.timestamp,
      provider: ride.provider,
      fare: ride.options.length > 0 ? Math.min(...ride.options.map(o => o.fare)) : 0,
      expectedFare: fp.expectedFare,
      savings: fp.savings,
      fairnessScore: fa.fairnessScore
    };

    await storageService.addHistoryEntry(historyEntry);
    
    // Save to storage as last active ride
    await storageService.saveLastRide(ride, { fp, ta, fa });

    // Notify popup that new data is available
    chrome.runtime.sendMessage({
      type: 'ANALYSIS_COMPLETE',
      payload: { ride, fp, ta, fa }
    }).catch(() => {
      // Ignore error if popup is not open
    });
  } catch (error) {
    console.error('Error in background processing:', error);
  }
}
