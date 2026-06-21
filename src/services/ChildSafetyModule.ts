export interface ChildRideDetails {
  rideId: string;
  childName: string;
  guardianName: string;
  guardianPhone: string;
  preApproved: boolean;
  pickupCode: string; // 4-digit pin
  approvalStatus: 'pending' | 'approved' | 'rejected';
  arrivalVerified: boolean;
}

export class ChildSafetyModule {
  /**
   * Request pre-approval from guardian before child booking goes live.
   */
  public static requestPreApproval(childName: string, destination: string): { approvalCode: string; pickupCode: string } {
    // Generates random 4-digit pickup code
    const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();
    const approvalCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`[ChildSafetyModule] Sent pre-approval request to guardian. Code: ${approvalCode}. Pickup Pin: ${pickupCode}`);
    return { approvalCode, pickupCode };
  }

  /**
   * Validates pickup PIN input.
   */
  public static verifyPickupCode(enteredCode: string, expectedCode: string): boolean {
    return enteredCode === expectedCode;
  }

  /**
   * Checks if the ride has been confirmed as completed by the guardian.
   */
  public static isArrivalConfirmed(rideId: string): boolean {
    const status = localStorage.getItem(`child_arrival_confirmed_${rideId}`);
    return status === 'true';
  }

  /**
   * Confirms child arrival by guardian.
   */
  public static confirmArrival(rideId: string): void {
    localStorage.setItem(`child_arrival_confirmed_${rideId}`, 'true');
    console.log(`[ChildSafetyModule] Guardian has approved safe arrival for ride ${rideId}. Release lock.`);
  }
}
