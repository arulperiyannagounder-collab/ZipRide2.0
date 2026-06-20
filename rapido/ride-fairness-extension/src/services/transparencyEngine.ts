import { RideDetails, TransparencyAnalysis } from '../types';

export const transparencyEngine = {
  analyze(ride: RideDetails): TransparencyAnalysis {
    let score = 100;
    const reasons: string[] = [];

    if (ride.surgeDetected) {
      score -= 30;
      reasons.push('Surge pricing is active');
    }

    if (ride.provider.toLowerCase() === 'generic' || ride.provider.toLowerCase() === 'unknown provider') {
      score -= 10;
      reasons.push('Unable to verify exact fare details for unknown provider');
    }

    // Check if breakdown exists
    const hasBreakdown = !!ride.breakdown || ride.options.some(o => !!o.breakdown);
    if (!hasBreakdown) {
      score -= 20;
      reasons.push('Detailed fare breakdown is hidden/unavailable');
    } else {
      reasons.push('Detailed fare breakdown successfully verified');
    }

    const minFare = ride.options.length > 0 ? Math.min(...ride.options.map(o => o.fare)) : 0;
    if (minFare > 1000) {
      score -= 5;
      reasons.push("Unusually high absolute fare");
    }

    return {
      transparencyScore: Math.max(0, score),
      reasons
    };
  }
};
