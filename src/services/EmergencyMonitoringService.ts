export interface SafetyState {
  isIdle: boolean;
  idleDurationSeconds: number;
  showSafetyPrompt: boolean;
  promptCountdown: number; // Seconds remaining to respond
  alarmTriggered: boolean;
}

export class EmergencyMonitoringService {
  private static idleTimer: NodeJS.Timeout | null = null;
  private static promptTimer: NodeJS.Timeout | null = null;
  
  /**
   * Evaluates speed and motion telemetry to detect anomalies.
   * If speed is 0 for more than 20 seconds, we flag it as an unexpected idle stop.
   */
  public static checkUnexpectedStop(
    speed: number,
    motion: string,
    currentDurationSeconds: number,
    onAnomalyDetected: () => void
  ): boolean {
    // If vehicle is stationary or speed is 0 during active ride for > 20s
    if (speed === 0 || motion === 'stationary') {
      if (currentDurationSeconds >= 20) {
        onAnomalyDetected();
        return true;
      }
    }
    return false;
  }
}
