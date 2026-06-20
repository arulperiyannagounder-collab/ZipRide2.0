export class SessionResetService {
  static clearBookingState() {
    localStorage.removeItem('zipride_booking_pickup');
    localStorage.removeItem('zipride_booking_pickup_verified');
    localStorage.removeItem('zipride_booking_pickup_coords');
    localStorage.removeItem('zipride_booking_drop');
    localStorage.removeItem('zipride_booking_drop_verified');
    localStorage.removeItem('zipride_booking_drop_coords');
    localStorage.removeItem('zipride_booking_selected_pickup');
    localStorage.removeItem('zipride_booking_selected_drop');
    localStorage.removeItem('zipride_booking_vehicle');
    localStorage.removeItem('zipride_booking_payment_method');
    localStorage.removeItem('zipride_selected_route_index');
    localStorage.removeItem('zipride_routes_list');
    localStorage.removeItem('zipride_family_safety_active');
    localStorage.removeItem('zipride_child_safety_active');
    localStorage.removeItem('zipride_women_safety_active');
  }

  static resetLocalData() {
    localStorage.clear();
    sessionStorage.clear();
  }

  static resetChatHistory() {
    localStorage.removeItem('zipride_chat_history');
    localStorage.removeItem('zipride_ai_assistant_history');
    
    // Clear any dynamic chat history key entries
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.toLowerCase().includes('chat') || key.toLowerCase().includes('history') || key.toLowerCase().includes('conversation'))) {
        localStorage.removeItem(key);
      }
    }
  }

  static resetRideSession() {
    this.clearBookingState();
    localStorage.removeItem('zipride_rebook_pickup');
    localStorage.removeItem('zipride_rebook_drop');
    localStorage.removeItem('zipride_driver_online');
    localStorage.removeItem('zipride_rejected_rides');
    
    // Clear any ride progress or arrival flags
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('child_arrival_confirmed_') || 
        key.includes('zipride_dismissed_driver_') || 
        // key.includes('zipride_dismissed_passenger_ride_') ||
        key.includes('zipride_auto_redirect_') ||
        key.includes('zipride_guardian_alerts')
      )) {
        localStorage.removeItem(key);
      }
    }
  }

  static resetAll() {
    this.resetLocalData();
  }
}
