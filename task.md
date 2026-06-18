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
