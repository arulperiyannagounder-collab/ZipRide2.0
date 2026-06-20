import { RoadIntelligence } from '../types';

export const roadIntelligence = {
  async getMockData(distance: number): Promise<RoadIntelligence> {
    // In a real application, this would call a traffic API (like Google Maps)
    return new Promise((resolve) => {
      setTimeout(() => {
        // Randomly generate mock conditions based on distance to make it look realistic
        const trafficRand = Math.random();
        let trafficLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE' = 'MEDIUM';
        let congestionScore = 50;
        let expectedDelay = 5;

        if (trafficRand > 0.8) {
          trafficLevel = 'SEVERE';
          congestionScore = 90;
          expectedDelay = Math.round(distance * 2);
        } else if (trafficRand > 0.6) {
          trafficLevel = 'HIGH';
          congestionScore = 75;
          expectedDelay = Math.round(distance * 1.5);
        } else if (trafficRand < 0.3) {
          trafficLevel = 'LOW';
          congestionScore = 20;
          expectedDelay = 0;
        }

        resolve({
          trafficLevel,
          congestionScore,
          weatherImpact: 'Clear', // Could also be randomized
          expectedDelay
        });
      }, 500); // Simulate network delay
    });
  }
};
