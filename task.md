# Task List: ZipRide Next-Gen Enhancements

## Core Service Architecture & Service Layer
- [x] Create generic service interface in `src/services/dbInterface.ts` for database scalability
- [x] Create `src/services/FareEngine.ts` for Dynamic Fare cap regulations and fairness breakdowns
- [x] Create `src/services/WeatherIntelligenceService.ts` for risk scores and alert notifications
- [x] Create `src/services/DriverReputationEngine.ts` for safety compliance, ratings, and driver leaderboard rankings

## Safety Modules & Sensoring
- [x] Create `src/services/FamilySafetyModule.ts` for guardian live-tracking notifications
- [x] Create `src/services/ChildSafetyModule.ts` for pickup verification codes and guardian safe arrival approval
- [x] Create `src/services/WomenSafetyModule.ts` for route tracking and deviation triggers
- [x] Create `src/services/EmergencyMonitoringService.ts` for idle checks and *"Are you safe?"* prompts
- [x] Extend Ride data model in `src/types.ts` with `selectedRouteIndex` and `routePath`
- [x] Update backend creation API in `backend/routes.ts` to save route index and path
- [x] Refactor and expand `src/components/LiveJourneyMap.tsx`:
  - [x] Support `isTrackingMode` with animated marker placement along active path
  - [x] Implement selected route styling (glowing pulse, higher z-index)
  - [x] Implement card ↔ map hover highlights (`hoveredRouteIndex`)
  - [x] Add click handlers on polylines to select routes
  - [x] Implement interactive popup hazards (Pothole 🕳️, Speedbreaker ⚠️, Road Work 🚧, Flood 🌊, Accident 💥) showing details
  - [x] Draw red-cross hospitals (🏥) and flashing neon emergency route to nearest hospital under SOS/anomaly state
  - [x] Add accessibility ramp indicator overlays
  - [x] Auto-fit bounds on active route change
- [x] Refactor `src/components/BookingView.tsx`:
  - [x] Track hovered route index and sync hover states with map
  - [x] Calculate Route Reliability Score dynamically
  - [x] Guarantee 4 unique, non-duplicate route choices (Fastest, Safest, Eco, Best Quality)
  - [x] Pass chosen route index and coordinates path to booking request
- [x] Refactor `src/components/RideTrackerView.tsx`:
  - [x] Replace animated SVG map with `LiveJourneyMap`
  - [x] Bind real-time remaining distances, times, and logs in tracking panel
- [x] Refactor `src/components/DriverConsoleView.tsx`:
  - [x] Render `LiveJourneyMap` during active jobs to sync with telemetry progress
- [x] Add glow polyline styling in `src/index.css`
- [x] Verify build compiles cleanly (`npm run lint` and `npm run build`)

## UI Components
- [x] Create `src/components/RideMatePanel.tsx` for AI travel guidelines
- [x] Create `src/components/RoadIntelligenceView.tsx` for community hazard reports and verify calculations

## Views Refactoring
- [x] Integrate 4 routes, Fare Fairness Meter, and RideMate Panel inside `src/components/BookingView.tsx`
- [x] Add pickup verification fields and Emergency Monitoring prompts in `src/components/RideTrackerView.tsx`
- [x] Add hazard notifications, leaderboards, and reputation badges inside `src/components/DriverConsoleView.tsx`
- [x] Add safety, accessibility, and road intelligence dashboard analytics inside `src/components/DashboardView.tsx`
- [x] Update signup wizard fields (Guardian, Medical, Accessibility) inside `src/components/LoginView.tsx` and `src/components/SettingsView.tsx`
- [x] Wire up routes and state adapters in `src/App.tsx` and verify clean build (`tsc` and `vite build`)
