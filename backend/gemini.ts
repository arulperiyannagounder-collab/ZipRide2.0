import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// Initialize Gemini client lazily to avoid immediate failure if API key is not yet present
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Mock fallback will be used.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

/**
 * Summarizes the ride telemetry, safety telemetry events (overspeeding, harsh brakes), and dynamic pricing factors
 * to output an official operations-friendly summary of a ride dispute, along with automated pricing decision logs.
 */
export async function summarizeDispute(
  rideSummary: {
    pickup: string;
    drop: string;
    driverName: string;
    safetyScore: number;
    initialFare: number;
    finalFare: number;
    overspeedEvents: number;
    harshBrakeEvents: number;
    weather: string;
    traffic: string;
    userStateReason: string;
  }
): Promise<string> {
  const prompt = `You are ZipRide's Lead Dispute Analyst. Review this ride's details, telemetries, and the user's filed dispute complaint.
Provide a clear, brief, structured analysis of the dispute as bullet points:
- Analysis of the incident (highlight weather, traffic, and dynamic price factors)
- Assessment of driver behavior (specifically overspeeding [${rideSummary.overspeedEvents} times] and harsh braking [${rideSummary.harshBrakeEvents} times] relative to safety rules)
- Pricing/cost adjustment log (explain why the price dropped from ₹${rideSummary.initialFare.toFixed(2)} to ₹${rideSummary.finalFare.toFixed(2)} based on behavioral discounts)
- Final Ops Recommendation (Confirm refund/resolution status)

Ride Details:
Pickup: ${rideSummary.pickup}
Drop: ${rideSummary.drop}
Driver: ${rideSummary.driverName}
Weather Condition during ride: ${rideSummary.weather}
Traffic congestion level: ${rideSummary.traffic}
Initial Fare: ₹${rideSummary.initialFare.toFixed(2)}
Final Charged Fare: ₹${rideSummary.finalFare.toFixed(2)}
Overspeeding Events: ${rideSummary.overspeedEvents}
Harsh Braking EventsCount: ${rideSummary.harshBrakeEvents}
Final Safety Score: ${rideSummary.safetyScore}%
Rider's Filed Dispute Complaint: "${rideSummary.userStateReason}"`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return getMockDisputeSummary(rideSummary);
    }
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
      }
    });
    return response.text || getMockDisputeSummary(rideSummary);
  } catch (error) {
    console.error("Gemini API dispute summary failed, falling back to mock:", error);
    return getMockDisputeSummary(rideSummary);
  }
}

/**
 * Direct real-time RAG system answering user's queries about pricing, safety penalties, weather/traffic surcharges, and behavior adjustments.
 */
export async function askGeminiAssist(
  question: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  context?: string
): Promise<string> {
  const systemInstruction = `You are the ZipRide RideMate Companion—an intelligent, friendly, and travel-focused AI assistant that acts as a real-time ride companion for passengers, drivers, and operations.

ZipRide Safety & Surcharge Policy Rules:
1. Base Fare: ₹20.00, Per-KM: ₹12.00, Per-Minute: ₹1.50
2. Weather base surcharges: Overcast (+₹10, limit 75km/h), High Winds (+₹20, limit 65km/h), Heavy Rain (+₹30, limit 60km/h), Monsoon Storm (+₹50, limit 50km/h).
3. Traffic multipliers: Light (1.0x), Moderate (1.1x multiplier, ETA 1.3x), Heavy Congestion (1.3x multiplier, ETA 1.8x), Gridlock (1.5x multiplier, ETA 2.5x).
4. Behavior deductions: Overspeeding past ceiling triggers -₹15 dynamic discount. Harsh braking triggers -₹10 dynamic discount. Deductions are subtracted directly from fare.

Active Safety Modes & Protocols:
- Child Safety Mode: Requires a 4-digit pickup verification code to start the ride, and guardian arrival confirmation at the drop destination. Always display the pickup verification PIN if this mode is ACTIVE and the user asks about it.
- Women Safety Mode: Performs GPS deviation tracking (>350m threshold). Guardians receive automatic route alerts on warning triggers.
- Family Safety Mode: Shares live tracking links and broadcasts vehicle coordinates to synced emergency contacts.

Formatting Instructions:
- Keep answers friendly, travel-focused, and highly contextual.
- If the user uses Tamil or Tanglish (Tamil-English mix), respond in a friendly mixed Tanglish/English style.
- If you notice dynamic issues (weather storm, high traffic, low safety score, or route deviations), proactively recommend actions.
- For safety status queries, always display a scorecard in this exact format:
  Safety Score: [score]%
  Traffic Risk: [Low/Medium/High]
  Weather Risk: [Low/Medium/High]
  Driver Rating: [rating]
  Recommendation: [recommendation]
- Include Smart Action Alert Cards using these exact tags on their own line:
  [ALERT: WEATHER] Description
  [ALERT: TRAFFIC] Description
  [ALERT: SAFETY] Description
- Suggest actions using these exact tags on their own line:
  [SUGGESTION: SHOW_SAFER_ROUTE] Label
  [SUGGESTION: REDUCE_FARE] Label
  [SUGGESTION: TRACK_DRIVER] Label
  [SUGGESTION: EMERGENCY_HELP] Label

Rely heavily on the Active State Grounding Context provided. Prioritize giving specific recommendations (like switching routes, warning limits, safety PINs, or emergency alerts) over general explanations.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return getMockAssistAnswer(question, context);
    }
    const client = getGeminiClient();
    
    // Convert history into the structure expected by the modern SDK
    const pastChats = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.parts[0].text }]
    }));

    const contents = [
      { role: 'user' as const, parts: [{ text: systemInstruction + (context ? `\n\nActive State Grounding Context:\n${context}` : "") }] },
      ...pastChats,
      { role: 'user' as const, parts: [{ text: question }] }
    ];

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        temperature: 0.5,
      }
    });

    return response.text || getMockAssistAnswer(question, context);
  } catch (error) {
    console.error("Gemini API assist assistant failed:", error);
    return getMockAssistAnswer(question, context);
  }
}

function getMockDisputeSummary(ride: any): string {
  return `### **ZipRide Automated Operations Dispute Analysis (AI Fallback)**

- **Weather & Traffic Surcharges**: Reviewed. Ride operated during **${ride.weather}** with **${ride.traffic}** traffic. The initial base fare of ₹${ride.initialFare.toFixed(2)} correctly factored environment surcharges.
- **Safety Telemetry Review**: 
  - **Overspeeding Events**: ${ride.overspeedEvents} warnings issued. Driver exceeded safe guidelines.
  - **Harsh Braking Events**: ${ride.harshBrakeEvents} sudden safety stops registered.
- **Cost Adjustments Log**: Real-time telemetry flagged ${ride.overspeedEvents + ride.harshBrakeEvents} behavioral violations. Combined safety discounts successfully dropped the final client fare to **₹${ride.finalFare.toFixed(2)}** (a total safety discount of ₹${(ride.initialFare - ride.finalFare).toFixed(2)} was credited).
- **Executive Recommendation**: Complaint is **VALID**. The safety score of **${ride.safetyScore}%** warrants processing a final full fare lock, and warning the driver (ID: Rajesh Kumar) for reckless transit behavior. No further refund is required as the safety discount was already subtracted in real-time.`;
}

function parseGroundedContext(context?: string) {
  const result = {
    weather: 'Clear',
    traffic: 'Light',
    currentUser: 'Saran',
    role: 'passenger',
    activeRide: null as null | {
      id: string;
      pickup: string;
      drop: string;
      status: string;
      driverName: string;
      riderName: string;
      vehicleType: string;
      initialFare: number;
      finalFare: number;
      speed: number;
      safetyScore: number;
      overspeedEvents: number;
      harshBrakeEvents: number;
      paymentStatus: string;
      hasActiveSOS: boolean;
      isChildSafety?: boolean;
      isWomenSafety?: boolean;
      isFamilySafety?: boolean;
      pickupCode?: string;
      childArrivalConfirmed?: boolean;
    },
    routes: [] as Array<{
      name: string;
      durationMin: number;
      distanceKm: number;
      trafficScore: number;
      fuelUsageLiters: number;
      roadHealthScore: number;
      reliabilityScore: number;
      isSelected: boolean;
    }>,
    driverRating: 4.8
  };

  if (!context) return result;

  // Extract weather
  const weatherMatch = context.match(/System Weather configuration:\s*([^,]+)/i);
  if (weatherMatch) result.weather = weatherMatch[1].trim();

  // Extract traffic
  const trafficMatch = context.match(/Traffic:\s*([^\.]+)/i);
  if (trafficMatch) result.traffic = trafficMatch[1].trim();

  // Extract user & role
  const userMatch = context.match(/Current user:\s*([^,]+)/i);
  if (userMatch) result.currentUser = userMatch[1].trim();

  // Check if Active Ride is present
  if (context.includes('Active Ride:')) {
    const getVal = (regex: RegExp, def = '') => {
      const m = context.match(regex);
      return m ? m[1].trim() : def;
    };

    result.activeRide = {
      id: getVal(/Ride ID:\s*([^\n]+)/i),
      pickup: getVal(/Pickup:\s*([^\n]+)/i),
      drop: getVal(/Drop:\s*([^\n]+)/i),
      status: getVal(/Status:\s*([^\n]+)/i),
      driverName: getVal(/Driver Name:\s*([^\n]+)/i, 'Rajesh Kumar'),
      riderName: getVal(/Rider Name:\s*([^\n]+)/i, 'Saran'),
      vehicleType: getVal(/Vehicle Type:\s*([^\n]+)/i, 'Bike'),
      initialFare: parseFloat(getVal(/Dynamic Fare:\s*Initial\s*₹([\d\.]+)/i, '0')),
      finalFare: parseFloat(getVal(/Dynamic Fare:.*Final\s*charged\s*₹([\d\.]+)/i, '0')),
      speed: parseFloat(getVal(/Speed:\s*([\d\.]+)/i, '0')),
      safetyScore: parseFloat(getVal(/Safety Score:\s*([\d\.]+)/i, '100')),
      overspeedEvents: parseInt(getVal(/Overspeed Events:\s*(\d+)/i, '0')),
      harshBrakeEvents: parseInt(getVal(/Harsh Braking:\s*(\d+)/i, '0')),
      paymentStatus: getVal(/Payment Status:\s*([^\n]+)/i, 'Pending'),
      hasActiveSOS: getVal(/Active SOS Flag:\s*([^\n]+)/i).toLowerCase() === 'yes',
      isChildSafety: getVal(/Child Safety Mode:\s*([^\n]+)/i).toLowerCase() === 'active',
      isWomenSafety: getVal(/Women Safety Mode:\s*([^\n]+)/i).toLowerCase() === 'active',
      isFamilySafety: getVal(/Family Safety Mode:\s*([^\n]+)/i).toLowerCase() === 'active',
      pickupCode: getVal(/Pickup Verification PIN:\s*([^\n]+)/i, 'N/A'),
      childArrivalConfirmed: getVal(/Child Arrival Confirmed by Guardian:\s*([^\n]+)/i).toLowerCase() === 'yes'
    };
  }

  // Parse Routes
  const routeLines = context.split('\n');
  routeLines.forEach(line => {
    const routeMatch = line.match(/-\s*Route\s*(\d+):\s*([^\.\(]+)(?:\s*\((Selected)\))?\.\s*ETA:\s*([\d\.]+)\s*mins,\s*Distance:\s*([\d\.]+)\s*km,\s*Traffic\s*Score:\s*(\d+)\/100,\s*Fuel:\s*([\d\.]+)L,\s*Road\s*Health:\s*(\d+)\/100/i);
    if (routeMatch) {
      const reliabilityMatch = line.match(/Reliability\s*Score:\s*(\d+)%/i);
      result.routes.push({
        name: routeMatch[2].trim(),
        durationMin: parseFloat(routeMatch[4]),
        distanceKm: parseFloat(routeMatch[5]),
        trafficScore: parseInt(routeMatch[6]),
        fuelUsageLiters: parseFloat(routeMatch[7]),
        roadHealthScore: parseInt(routeMatch[8]),
        reliabilityScore: reliabilityMatch ? parseInt(reliabilityMatch[1]) : 90,
        isSelected: !!routeMatch[3]
      });
    }
  });

  // Driver rating
  const ratingMatch = context.match(/Driver Reputation \/ Rating:\s*([\d\.]+)/i);
  if (ratingMatch) result.driverRating = parseFloat(ratingMatch[1]);

  return result;
}

function getMockAssistAnswer(question: string, context?: string): string {
  const q = question.toLowerCase();
  const state = parseGroundedContext(context);

  // 1. Safety Queries
  if (q.includes('safe') || q.includes('safety') || q.includes('risk') || q.includes('accident') || q.includes('danger') || q.includes('child') || q.includes('women') || q.includes('family') || q.includes('pin') || q.includes('code')) {
    const score = state.activeRide ? state.activeRide.safetyScore : 100;
    const weather = state.weather;
    const traffic = state.traffic;
    const rating = state.driverRating;

    let weatherRisk = 'Low';
    if (weather === 'Heavy Rain' || weather === 'High Winds') weatherRisk = 'Medium';
    else if (weather === 'Monsoon Storm') weatherRisk = 'High';

    let trafficRisk = 'Low';
    if (traffic === 'Heavy Congestion') trafficRisk = 'Medium';
    else if (traffic === 'Gridlock') trafficRisk = 'High';

    let recommendation = 'Your ride appears safe. The driver status checks out fine.';
    if (state.activeRide?.hasActiveSOS) {
      recommendation = 'An active emergency SOS has been triggered! PCR emergency dispatch is routing to your position.';
    } else if (score < 75) {
      recommendation = 'Reckless driver behavior detected. Speed limit cap has been activated. Switch to Route 2 for safety.';
    } else if (weatherRisk === 'High' || weatherRisk === 'Medium') {
      recommendation = 'Inclement weather hazards reported near destination. Driver speed has been capped for traction.';
    }

    // Append child / women / family safe mode status dynamically
    let safetyDetails = '';
    if (state.activeRide) {
      if (state.activeRide.isChildSafety) {
        safetyDetails += `\n🔒 **Child Safety Mode is ACTIVE** for this trip. Guardian pre-approval is verified. The pickup verification code is **${state.activeRide.pickupCode}** (share this with the driver only at pickup).`;
      }
      if (state.activeRide.isWomenSafety) {
        safetyDetails += `\n🛡️ **Women Safety Mode is ACTIVE**. GPS Geofence deviation monitoring (>350m) is active. Guardian SMS tracking link is shared.`;
      }
      if (state.activeRide.isFamilySafety) {
        safetyDetails += `\n👪 **Family Safety Mode is ACTIVE**. Live location sharing broadcasts are running.`;
      }
      if (!state.activeRide.isChildSafety && !state.activeRide.isWomenSafety && !state.activeRide.isFamilySafety) {
        safetyDetails += `\nℹ️ Travel safety modes are currently inactive. You can toggle Child/Women/Family safe modes in settings or during booking.`;
      }
    }

    const safetyCard = `Safety Score: ${score}%

Traffic Risk: ${trafficRisk}
Weather Risk: ${weatherRisk}
Driver Rating: ${rating}

Recommendation:
${recommendation}${safetyDetails}

[ALERT: SAFETY] Safety Insight - GPS Geofencing active.
[ALERT: WEATHER] Weather Risk - ${weatherRisk === 'Low' ? 'Normal weather conditions.' : 'Inclement weather guidelines active.'}`;

    const emergencySug = '[SUGGESTION: EMERGENCY_HELP] Emergency Help';
    const trackSug = '[SUGGESTION: TRACK_DRIVER] Track Driver';
    const routeSug = '[SUGGESTION: SHOW_SAFER_ROUTE] Show Safer Route';

    return `${safetyCard}\n\n${routeSug}\n${trackSug}\n${emergencySug}`;
  }

  // 2. Fare Queries
  if (q.includes('fare') || q.includes('surcharge') || q.includes('price') || q.includes('cost') || q.includes('increase') || q.includes('fee') || q.includes('charge')) {
    const active = state.activeRide;
    const initial = active ? active.initialFare : 50.00;
    const final = active ? active.finalFare : 50.00;

    let weatherFee = 0;
    if (state.weather === 'Overcast') weatherFee = 10;
    else if (state.weather === 'High Winds') weatherFee = 20;
    else if (state.weather === 'Heavy Rain') weatherFee = 30;
    else if (state.weather === 'Monsoon Storm') weatherFee = 50;

    let trafficMult = '1.0x';
    if (state.traffic === 'Moderate') trafficMult = '1.1x';
    else if (state.traffic === 'Heavy Congestion') trafficMult = '1.3x';
    else if (state.traffic === 'Gridlock') trafficMult = '1.5x';

    const overspeedDiscount = active ? active.overspeedEvents * 15 : 0;
    const harshDiscount = active ? active.harshBrakeEvents * 10 : 0;

    let recommendation = 'Your fare increased due to weather and traffic conditions. To minimize costs, maintain safe speeds to qualify for compliance discounts.';
    if (overspeedDiscount > 0 || harshDiscount > 0) {
      recommendation = `Behavioral discounts applied: -₹${overspeedDiscount + harshDiscount} due to driving exceptions.`;
    }

    const fareBreakdown = `Base Fare: ₹20.00
Weather Surcharge: +₹${weatherFee.toFixed(2)} (${state.weather})
Traffic Multiplier: ${trafficMult} (${state.traffic})
Driver Safety Penalties: -₹${(overspeedDiscount + harshDiscount).toFixed(2)}

Recommendation:
${recommendation}

[ALERT: TRAFFIC] Surcharge Active - Traffic multiplier is ${trafficMult}.
[ALERT: WEATHER] Weather Fee - Weather fee is +₹${weatherFee}.`;

    const routeSug = '[SUGGESTION: SHOW_SAFER_ROUTE] Show Safer Route';
    const reduceSug = '[SUGGESTION: REDUCE_FARE] Learn Surcharges';

    return `${fareBreakdown}\n\n${routeSug}\n${reduceSug}`;
  }

  // 3. Route / ETA / Best Route Queries
  if (q.includes('traffic') || q.includes('route') || q.includes('eta') || q.includes('delay') || q.includes('congestion') || q.includes('best route') || q.includes('road')) {
    let routeDetails = 'Route Options Analysed:\n';
    if (state.routes.length > 0) {
      state.routes.forEach((r, idx) => {
        routeDetails += `- Route ${idx + 1}: ${r.name} (${r.durationMin} mins, ${r.distanceKm} km, Road Health: ${r.roadHealthScore}/100)\n`;
      });
    } else {
      routeDetails += '- Route 1: NH Highway Freeway (12 mins, Heavy traffic)\n- Route 2: Link Road Green Corridor (8 mins, Free flowing)\n';
    }

    const rec = state.routes.length > 0 
      ? 'Route 2 currently has the lowest traffic congestion index. Switching routes will optimize transit time.'
      : 'Switching to Route 2 can save 4 minutes.';

    return `${routeDetails}
Recommendation:
${rec}

[ALERT: TRAFFIC] Traffic Alert - Route 1 has additional delays.

[SUGGESTION: SHOW_SAFER_ROUTE] Switch to Route 2`;
  }

  // 4. Weather Queries
  if (q.includes('weather') || q.includes('rain') || q.includes('storm') || q.includes('wind')) {
    let surchargeInfo = 'No active weather surcharges.';
    if (state.weather !== 'Clear') {
      surchargeInfo = `Weather Base Surcharge: Active (+₹${state.weather === 'Overcast' ? '10' : state.weather === 'High Winds' ? '20' : state.weather === 'Heavy Rain' ? '30' : '50'})`;
    }

    return `Weather Condition: ${state.weather}
Surcharge Status: ${surchargeInfo}
Safety Capping: Speed cap is active at ${state.weather === 'Monsoon Storm' ? '50 km/h' : state.weather === 'Heavy Rain' ? '60 km/h' : state.weather === 'High Winds' ? '65 km/h' : '75 km/h'}.

Recommendation:
Maintain a safe braking distance. Wet/overcast roads limit tire traction.

[ALERT: WEATHER] Weather Alert - ${state.weather} conditions reported.

[SUGGESTION: SHOW_SAFER_ROUTE] View Safer Route`;
  }

  // 5. Driver Reputation / rating
  if (q.includes('driver') || q.includes('reputation') || q.includes('rating') || q.includes('who is') || q.includes('rajesh') || q.includes('saran') || q.includes('arul')) {
    const active = state.activeRide;
    const rating = state.driverRating || 4.8;
    const driverName = active ? active.driverName : 'Rajesh Kumar';

    return `Driver Name: ${driverName}
Rating: ${rating} / 5.0
Compliance Status: Verified RideMate Driver
Telemetry Alerts: ${active ? active.overspeedEvents : 0} Speeding Warning(s)

Recommendation:
Driver has high rating of ${rating}. Telemetry checks are active.

[ALERT: SAFETY] Compliance Monitor - Safety logs are normal.

[SUGGESTION: TRACK_DRIVER] Track Driver`;
  }

  // 6. Hospital / emergency / medical queries / unsafe
  if (q.includes('hospital') || q.includes('medical') || q.includes('emergency') || q.includes('doctor') || q.includes('accident') || q.includes('help') || q.includes('danger') || q.includes('sos') || q.includes('unsafe') || q.includes('threat')) {
    return `Emergency Guidance Mode:
- Nearest Hospital: Apollo Emergency Care (1.8 km away, ~4 mins)
- Backup Clinic: Apollo Clinic (2.5 km away)
- Ambulance Dispatch: Mapped on SOS trigger

Recommendation:
If you feel unsafe or have an emergency, please press the [Emergency Help] button immediately. This triggers PCR ambulance dispatch, shares live coordinates, and texts your guardians.

[ALERT: SAFETY] Emergency Mode - Emergency guidance active.

[SUGGESTION: EMERGENCY_HELP] Emergency Help`;
  }

  // 7. General fallback
  const rating = state.driverRating || 4.8;
  const weather = state.weather;
  const traffic = state.traffic;
  return `Hello! I am your RideMate Companion. I have live telemetry access to weather (${weather}), traffic (${traffic}), active routes, and driver details (Rating: ${rating}). How can I help you on your commute today?

[ALERT: SAFETY] Compliance Monitor - Operations logs are nominal.

[SUGGESTION: SHOW_SAFER_ROUTE] Show Safer Route
[SUGGESTION: EMERGENCY_HELP] Emergency Help`;
}

/**
 * Executes a geographic query against the cached indian_cities.json file using Gemini.
 */
export async function queryGeographicCities(userQuery: string): Promise<{ answer: string; source: 'gemini' | 'programmatic' }> {
  const LOCAL_CITIES_FILE = path.join(process.cwd(), 'indian_cities.json');
  let citiesData = "";
  let rawCities: any[] = [];
  try {
    if (fs.existsSync(LOCAL_CITIES_FILE)) {
      citiesData = fs.readFileSync(LOCAL_CITIES_FILE, 'utf-8');
      rawCities = JSON.parse(citiesData);
    } else {
      // Fetch it directly in case
      console.log("Fetching cities.json from raw source on demand...");
      const res = await fetch("https://raw.githubusercontent.com/thatisuday/indian-cities-database/master/cities.json");
      if (res.ok) {
        citiesData = await res.text();
        fs.writeFileSync(LOCAL_CITIES_FILE, citiesData, 'utf-8');
        rawCities = JSON.parse(citiesData);
      }
    }
  } catch (err) {
    console.error("Error reading cities JSON for Gemini context:", err);
  }

  const systemInstruction = `
You are a precise geographic data retrieval engine. Your absolute source of truth is the attached document. 

When a user asks for places in a location, you must scan the document and return a structured list.

Strict Rules:
1. Do not use outside knowledge. If a place is not explicitly listed in the document, do not include it.
2. Group the results logically by state or district.
3. Format your response cleanly using bullet points.
4. If a user queries a place that does not exist in the file, politely inform them that it is missing from the database.
`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      answer: getProgrammaticQueryFallback(userQuery, rawCities),
      source: 'programmatic'
    };
  }

  try {
    const client = getGeminiClient();
    
    // To fit neatly and keep it highly optimized, we'll pass the first 800KB of the file content
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { role: 'user', parts: [
          { text: systemInstruction },
          { text: `ATTACHED DOCUMENT (cities.json):\n${citiesData.slice(0, 800000)}` },
          { text: `USER QUERY: ${userQuery}` }
        ]}
      ],
      config: {
        temperature: 0.1,
      }
    });

    return {
      answer: response.text || getProgrammaticQueryFallback(userQuery, rawCities),
      source: 'gemini'
    };
  } catch (err) {
    console.error("Gemini city query failed, running programmatic fallback:", err);
    return {
      answer: getProgrammaticQueryFallback(userQuery, rawCities),
      source: 'programmatic'
    };
  }
}

function getProgrammaticQueryFallback(query: string, cities: any[]): string {
  const qClean = query.toLowerCase();
  
  if (!cities || cities.length === 0) {
    return "The geographic database file is currently loading or was empty. Please check back in a few seconds.";
  }

  // Extract unique states & districts
  const states = Array.from(new Set(cities.map(c => String(c.state || '').trim())));
  const districts = Array.from(new Set(cities.map(c => String(c.district || '').trim())));
  
  let foundState = states.find(s => qClean.includes(s.toLowerCase()));
  let foundDistrict = districts.find(d => qClean.includes(d.toLowerCase()));

  if (foundState) {
    const filtered = cities.filter(c => String(c.state).toLowerCase() === foundState!.toLowerCase());
    if (filtered.length === 0) {
      return `Politely informing you that places in "${foundState}" are missing from the database.`;
    }
    
    const grouped: Record<string, string[]> = {};
    filtered.forEach(c => {
      const dist = c.district || 'General';
      if (!grouped[dist]) grouped[dist] = [];
      if (!grouped[dist].includes(c.name)) {
        grouped[dist].push(c.name);
      }
    });

    let res = `### Available Cities in **${foundState}** (Programmatic Search Online)\n\n`;
    Object.entries(grouped).sort().forEach(([dist, names]) => {
      res += `* **District: ${dist}**\n`;
      names.sort().forEach(name => {
        res += `  - ${name}\n`;
      });
    });
    return res;
  }

  if (foundDistrict) {
    const filtered = cities.filter(c => String(c.district).toLowerCase() === foundDistrict!.toLowerCase());
    if (filtered.length === 0) {
      return `Politely informing you that places in "${foundDistrict}" are missing from the database.`;
    }
    
    let res = `### Available Cities in District: **${foundDistrict}** (Programmatic Search Online)\n\n`;
    filtered.sort((a,b) => String(a.name).localeCompare(String(b.name))).forEach(c => {
      res += `- ${c.name} (State: ${c.state})\n`;
    });
    return res;
  }

  // General search fallback
  const searchTerms = qClean.split(/\s+/).filter(w => w.length > 2 && !['list', 'all', 'the', 'available', 'cities', 'in', 'of', 'and', 'place', 'places', 'located', 'find', 'from'].includes(w));
  if (searchTerms.length > 0) {
    const filtered = cities.filter(c => 
      searchTerms.some(term => 
        String(c.name).toLowerCase().includes(term) || 
        String(c.state).toLowerCase().includes(term) || 
        String(c.district).toLowerCase().includes(term)
      )
    );
    if (filtered.length > 0) {
      const grouped: Record<string, string[]> = {};
      filtered.forEach(c => {
        const state = c.state || 'Unknown';
        if (!grouped[state]) grouped[state] = [];
        const label = `${c.name} (District: ${c.district || 'N/A'})`;
        if (!grouped[state].includes(label)) {
          grouped[state].push(label);
        }
      });

      let res = `### Search Results for "${searchTerms.join(' ')}" (Programmatic Search Online)\n\n`;
      Object.entries(grouped).forEach(([state, names]) => {
        res += `* **State: ${state}**\n`;
        names.slice(0, 50).forEach(name => {
          res += `  - ${name}\n`;
        });
        if (names.length > 50) {
          res += `  - ...and ${names.length - 50} more results match.`;
        }
      });
      return res;
    }
  }

  return `I have scanned the geographic database, and the location you requested ("${query}") does not exist or matches no entries in the file. Politely informing you that the places are missing from the database.`;
}
