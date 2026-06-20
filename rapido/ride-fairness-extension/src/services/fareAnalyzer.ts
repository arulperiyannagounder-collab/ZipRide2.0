import { RideDetails, RideOption, FareBreakdown } from '../types';

export interface FareAdapter {
  providerName: string;
  canHandle(url: string): boolean;
  extractDetails(document: Document): RideDetails | null;
}

export function extractDistance(text: string): number {
  // Try to find distance in parenthesized label (e.g. Distance Charge (18.16 km))
  const parenMatch = text.match(/(?:Distance\s?Charge|Distance\s?Cost|Distance\s?Fare)\s*\(([^)]+)\)/i);
  if (parenMatch) {
    const dMatch = parenMatch[1].match(/(\d+(?:\.\d+)?)/);
    if (dMatch) {
      return parseFloat(dMatch[1]);
    }
  }

  // Fallback to standard distance pattern
  const distRegex = /(\d+(?:\.\d+)?)\s?(?:km|kms|kilometers)/i;
  const match = text.match(distRegex);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0; // Return 0 to indicate not found (background script will fall back to geocoding)
}

export function extractFareBreakdown(text: string): FareBreakdown | undefined {
  const breakdown: FareBreakdown = {};
  let found = false;

  const extractValue = (labels: string[]): number | undefined => {
    // Matches the label, then up to 150 non-currency characters (to bypass parenthesized details like "(18.16 km)" or lines like "Live discount refund shield active"),
    // followed by a currency indicator (+/- sign, ₹, Rs., INR), then the numeric value
    const regexPattern = new RegExp(`(?:${labels.join('|')})[\\s\\S]{0,150}?(?:[+-\\s]*)(?:₹|Rs\\.?|INR)\\s*([\\d+(?:,\\d+)*(?:\\.\\d+)?]+)`, 'i');
    const match = text.match(regexPattern);
    if (match) {
      const valStr = match[1].replace(/,/g, '').trim();
      const val = parseFloat(valStr);
      if (!isNaN(val)) {
        return val;
      }
    }
    return undefined;
  };

  const baseFare = extractValue(['Base\\s?(?:Flag\\s?Down)?\\s?Fare', 'Flag\\s?Down\\s?Fare', 'Base\\s?Fare', 'Flag\\s?Down']);
  if (baseFare !== undefined) { breakdown.baseFare = baseFare; found = true; }

  const distanceCharge = extractValue(['Distance\\s?Charge', 'Distance\\s?Cost', 'Distance\\s?Fare']);
  if (distanceCharge !== undefined) { breakdown.distanceCharge = distanceCharge; found = true; }

  const timeCharge = extractValue(['Time\\s?Duration\\s?Charge', 'Time\\s?Charge', 'Duration\\s?Charge', 'Time\\s?Cost']);
  if (timeCharge !== undefined) { breakdown.timeCharge = timeCharge; found = true; }

  const tolls = extractValue(['Tolls\\s?&\\s?Gateways', 'Tolls', 'Toll\\s?Charges', 'Toll']);
  if (tolls !== undefined) { breakdown.tolls = tolls; found = true; }

  const platformFee = extractValue(['Platform\\s?Booking\\s?Fee', 'Platform\\s?Fee', 'Booking\\s?Fee']);
  if (platformFee !== undefined) { breakdown.platformFee = platformFee; found = true; }

  const gst = extractValue(['GST\\s?Tax', 'GST\\s?\\(.*?\\)', 'GST', 'Tax', 'Taxes']);
  if (gst !== undefined) { breakdown.gst = gst; found = true; }

  const surge = extractValue(['Surge\\s?Fee', 'Surge\\s?Pricing', 'Surge', 'Peak\\s?Pricing', 'Demand\\s?Fee']);
  if (surge !== undefined) { breakdown.surge = surge; found = true; }

  const discount = extractValue(['Discount', 'Promo', 'Promotion', 'Offer', 'Coupon']);
  if (discount !== undefined) { breakdown.discount = discount; found = true; }

  const lockedFare = extractValue(['Locked\\s?Ride\\s?Fare', 'Locked\\s?Fare', 'Guaranteed\\s?Fare']);
  if (lockedFare !== undefined) { breakdown.lockedFare = lockedFare; found = true; }

  return found ? breakdown : undefined;
}

export function extractOptions(text: string, providerName: string, document: Document): RideOption[] {
  const knownVehicles: Record<string, string[]> = {
    'Uber': ['UberGo', 'Premier', 'UberXL', 'Moto', 'Auto', 'Go Sedan', 'Uber Go', 'Shuttle', 'Cab'],
    'Ola': ['Mini', 'Prime Sedan', 'Prime SUV', 'Auto', 'Bike', 'Prime Plus', 'Prime', 'Cab'],
    'Rapido': ['Bike', 'Auto', 'Cab', 'Standard']
  };

  const vehicles = knownVehicles[providerName] || ['Standard'];
  const optionsMap = new Map<string, RideOption>();

  // Extract parsed ETA from the page breakdown if available (e.g. Time Duration Charge (21 min))
  const parenTimeMatch = text.match(/(?:Time\s?Duration\s?Charge|Time\s?Charge|Duration\s?Charge|Time\s?Cost)\s*\(([^)]+)\)/i);
  let parsedEta = 5;
  if (parenTimeMatch) {
    const tMatch = parenTimeMatch[1].match(/(\d+)/);
    if (tMatch) {
      parsedEta = parseInt(tMatch[1]);
    }
  }

  // 1. Try DOM Selector Strategy First
  const candidateSelectors = [
    '[role="button"]', 
    'li', 
    'div[data-test="vehicle-option"]', 
    '.ride-option', 
    '.booking-card',
    '.product-selection-option',
    'div.option'
  ];

  for (const selector of candidateSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const el of Array.from(elements)) {
        const elText = (el as HTMLElement).innerText || '';
        if (!elText.includes('₹') && !elText.includes('Rs.') && !elText.includes('INR')) continue;

        let foundVehicle: string | null = null;
        for (const v of vehicles) {
          if (elText.toLowerCase().includes(v.toLowerCase())) {
            foundVehicle = v;
            break;
          }
        }

        if (foundVehicle) {
          const regex = /(?:₹|Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/gi;
          const match = regex.exec(elText);
          if (match) {
            const fare = parseFloat(match[1].replace(/,/g, ''));
            const etaRegex = /(\d+)\s?(?:min|mins|minute|minutes)/i;
            const etaMatch = elText.match(etaRegex);
            let eta = etaMatch ? parseInt(etaMatch[1]) : parsedEta;

            // Store option, keeping the lowest fare version of the vehicle type (e.g. if discounted)
            if (!optionsMap.has(foundVehicle) || fare < optionsMap.get(foundVehicle)!.fare) {
              optionsMap.set(foundVehicle, {
                vehicleType: foundVehicle,
                fare,
                eta
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Selector extraction failed for', selector, e);
    }
  }

  // 2. Fallback: Split page text by line and perform regex extraction
  if (optionsMap.size === 0) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let unclassifiedCount = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const regex = /(?:₹|Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/gi;
      let match;
      const pricesOnLine: number[] = [];

      while ((match = regex.exec(line)) !== null) {
        pricesOnLine.push(parseFloat(match[1].replace(/,/g, '')));
      }

      if (pricesOnLine.length > 0) {
        const fare = Math.min(...pricesOnLine);
        if (fare > 0) {
          let foundVehicle: string | null = null;
          // Look within a search window of 5 adjacent lines
          const searchWindow = [line, lines[i-1], lines[i-2], lines[i+1], lines[i+2]].filter(Boolean);

          for (const textWindow of searchWindow) {
            for (const v of vehicles) {
              if (textWindow.toLowerCase().includes(v.toLowerCase())) {
                foundVehicle = v;
                break;
              }
            }
            if (foundVehicle) break;
          }

          const vehicleType = foundVehicle || `Option ${unclassifiedCount++}`;

          // Extract ETA from window
          let eta = parsedEta;
          const etaRegex = /(\d+)\s?(?:min|mins|minute|minutes)/i;
          for (const winText of searchWindow) {
            const etaMatch = winText.match(etaRegex);
            if (etaMatch) {
              eta = parseInt(etaMatch[1]);
              break;
            }
          }

          if (!optionsMap.has(vehicleType) || fare < optionsMap.get(vehicleType)!.fare) {
            optionsMap.set(vehicleType, {
              vehicleType,
              fare,
              eta
            });
          }
        }
      }
    }
  }

  const options = Array.from(optionsMap.values());
  return options.sort((a, b) => a.fare - b.fare);
}

class GenericAdapter implements FareAdapter {
  providerName = 'Generic';

  canHandle(url: string): boolean {
    return true; // Fallback
  }

  extractDetails(document: Document): RideDetails | null {
    try {
      const text = document.body.innerText;
      const options = extractOptions(text, this.providerName, document);

      if (options.length === 0) return null;

      const distance = extractDistance(text);
      const breakdown = extractFareBreakdown(text);

      return {
        provider: 'Unknown Provider',
        options: options,
        distance: distance || 5, // Default fallback if 0
        surgeDetected: text.toLowerCase().includes('surge') || text.toLowerCase().includes('high demand'),
        timestamp: Date.now(),
        breakdown
      };
    } catch (e) {
      console.error('Error in GenericAdapter', e);
      return null;
    }
  }
}

class UberAdapter implements FareAdapter {
  providerName = 'Uber';
  canHandle(url: string): boolean { return url.includes('uber.com'); }
  extractDetails(document: Document): RideDetails | null {
    try {
      const text = document.body.innerText;
      const options = extractOptions(text, this.providerName, document);
      if (options.length === 0) return null;
      const distance = extractDistance(text);
      const breakdown = extractFareBreakdown(text);
      const surgeDetected = text.toLowerCase().includes('surge') || text.toLowerCase().includes('peak pricing') || text.toLowerCase().includes('high demand');
      
      return {
        provider: 'Uber',
        options: options,
        distance: distance || 5,
        surgeDetected,
        timestamp: Date.now(),
        breakdown
      };
    } catch (e) {
      console.error('Error in UberAdapter', e);
      return null;
    }
  }
}

class OlaAdapter implements FareAdapter {
  providerName = 'Ola';
  canHandle(url: string): boolean { return url.includes('olacabs.com') || url.includes('ola'); }
  extractDetails(document: Document): RideDetails | null {
    try {
      const text = document.body.innerText;
      const options = extractOptions(text, this.providerName, document);
      if (options.length === 0) return null;
      const distance = extractDistance(text);
      const breakdown = extractFareBreakdown(text);
      const surgeDetected = text.toLowerCase().includes('surge') || text.toLowerCase().includes('peak pricing') || text.toLowerCase().includes('high demand');
      
      return {
        provider: 'Ola',
        options: options,
        distance: distance || 5,
        surgeDetected,
        timestamp: Date.now(),
        breakdown
      };
    } catch (e) {
      console.error('Error in OlaAdapter', e);
      return null;
    }
  }
}

class RapidoAdapter implements FareAdapter {
  providerName = 'Rapido';
  canHandle(url: string): boolean { return url.includes('rapido.bike') || url.includes('rapido'); }
  extractDetails(document: Document): RideDetails | null {
    try {
      const text = document.body.innerText;
      const options = extractOptions(text, this.providerName, document);
      if (options.length === 0) return null;
      const distance = extractDistance(text);
      const breakdown = extractFareBreakdown(text);
      const surgeDetected = text.toLowerCase().includes('surge') || text.toLowerCase().includes('high demand');
      
      return {
        provider: 'Rapido',
        options: options,
        distance: distance || 5,
        surgeDetected,
        timestamp: Date.now(),
        breakdown
      };
    } catch (e) {
      console.error('Error in RapidoAdapter', e);
      return null;
    }
  }
}

export const fareAnalyzer = {
  adapters: [new UberAdapter(), new OlaAdapter(), new RapidoAdapter(), new GenericAdapter()],

  analyzeCurrentPage(url: string, document: Document): RideDetails | null {
    const adapter = this.adapters.find(a => a.canHandle(url));
    if (adapter) {
      const details = adapter.extractDetails(document);
      if (details) {
         details.provider = adapter.providerName !== 'Generic' ? adapter.providerName : details.provider;
         return details;
      }
    }
    return null;
  }
};
