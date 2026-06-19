export class SessionResetService {
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
    localStorage.removeItem('zipride_rebook_pickup');
    localStorage.removeItem('zipride_rebook_drop');
    localStorage.removeItem('zipride_family_safety_active');
    localStorage.removeItem('zipride_child_safety_active');
    localStorage.removeItem('zipride_women_safety_active');
    localStorage.removeItem('zipride_driver_online');
    localStorage.removeItem('zipride_rejected_rides');
    
    // Clear any ride progress or arrival flags
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('child_arrival_confirmed_') || 
        key.includes('zipride_dismissed_driver_') || 
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
