# Ride Fairness Assistant

A production-ready Chrome Extension (Manifest V3) that helps users determine whether ride fares (e.g., from Uber, Ola, Rapido) are fair and transparent.

## Features

- **Fare Scraper Engine:** Detects pricing information dynamically on ride-booking websites.
- **Fair Price Engine:** Calculates expected fare based on base rate, distance, and time.
- **Road Intelligence:** Integrates mock traffic and weather data.
- **Transparency Engine:** Analyzes potential hidden fees and surge pricing.
- **Ride Fairness Score:** Generates an overall 0-100 fairness score.
- **Historical Tracking:** Saves ride data locally and tracks metrics.
- **Interactive Dashboard:** Modern UI built with React, Tailwind CSS, and Recharts.

## Tech Stack

- React + TypeScript
- Vite
- Manifest V3
- Chrome Storage API (`chrome.storage.local`)
- Tailwind CSS
- Zustand (State Management)
- Recharts (Analytics)
- Lucide React (Icons)

## Development Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Dev Server:**
   *(Note: Hot Reloading in Chrome Extensions can be tricky, but Vite provides a good setup)*
   ```bash
   npm run dev
   ```

3. **Build the Extension:**
   ```bash
   npm run build
   ```
   This will generate a `dist` folder containing the compiled extension files (`manifest.json`, `background.js`, `content.js`, `popup.html`, etc.).

## Loading into Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked**.
4. Select the `dist` folder from this project.
5. The extension will now appear in your toolbar!

## Architecture

- `src/background/`: Service worker that receives data from the content script, orchestrates the analysis engines, saves to storage, and notifies the popup.
- `src/content/`: Injected script that runs on user web pages. Uses modular `Adapters` to extract fare data from different DOM structures.
- `src/services/`: Core logic engines decoupled from the UI.
- `src/popup/`: The React application rendering the extension dashboard.

## Future Plans

- Enhance `GenericAdapter` with AI-assisted parsing or robust DOM querying.
- Connect `RoadIntelligence` to real APIs (Google Maps, OpenWeather).
- Provide inputs for users to specify custom Source/Destination and auto-scrape pricing.
