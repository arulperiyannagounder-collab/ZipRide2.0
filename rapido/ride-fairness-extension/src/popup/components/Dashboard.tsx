import React from 'react';
import { useStore } from '../../store/useStore';
import { AlertTriangle, CheckCircle, Info, TrendingDown, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { currentRide, fairPriceAnalysis, fairnessAnalysis, transparencyAnalysis, settings, setCurrentRide, setAnalysis } = useStore();

  const handleSimulate = (provider: 'Uber' | 'Ola' | 'Rapido') => {
    const mockRide = {
      provider,
      distance: 18.16,
      surgeDetected: provider === 'Uber',
      timestamp: Date.now(),
      options: [
        { vehicleType: provider === 'Uber' ? 'UberGo' : provider === 'Ola' ? 'Mini' : 'Auto', fare: 120, eta: 21 },
        { vehicleType: provider === 'Uber' ? 'Premier' : provider === 'Ola' ? 'Prime Sedan' : 'Cab', fare: 145, eta: 18 }
      ],
      breakdown: {
        baseFare: 25.00,
        distanceCharge: 145.28,
        timeCharge: 21.00,
        tolls: 50.00,
        platformFee: 7.00,
        gst: 47.55,
        lockedFare: 120.00
      }
    };

    const mockFp = {
      expectedFare: 120.00,
      actualFare: 120.00,
      difference: 0,
      savings: 0,
      status: 'FAIR' as const,
      pricingStatus: 'FAIR' as const
    };

    const mockTa = {
      transparencyScore: 90,
      reasons: ['Detailed fare breakdown successfully verified']
    };

    const mockFa = {
      fairnessScore: 88,
      rating: 'Excellent' as const
    };

    setCurrentRide(mockRide);
    setAnalysis(mockFp, { trafficLevel: 'MEDIUM', congestionScore: 50, expectedDelay: 5, weatherImpact: 'Clear' }, mockTa, mockFa);
  };

  if (!currentRide || !fairPriceAnalysis || !fairnessAnalysis || !transparencyAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 py-6 space-y-4">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Info size={32} className="text-slate-400" />
          </div>
          <p className="text-center font-medium">No ride detected.</p>
          <p className="text-sm text-center mt-2 px-6">Open a ride-hailing website and select a ride to see fairness analysis.</p>
        </div>
        
        <div className="w-full border-t border-slate-200 pt-6 px-4">
          <p className="text-xs text-center font-semibold text-slate-400 uppercase tracking-wider mb-3">Or Quick Test Extension</p>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => handleSimulate('Uber')} 
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 px-3 rounded-lg text-xs transition-colors"
            >
              Simulate Uber Ride (₹120.00, 18.16 km)
            </button>
            <button 
              onClick={() => handleSimulate('Rapido')} 
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold py-2 px-3 rounded-lg text-xs transition-colors"
            >
              Simulate Rapido Ride (₹120.00, 18.16 km)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isFair = fairPriceAnalysis.status === 'FAIR' || fairPriceAnalysis.status === 'UNDERPRICED';

  // Resolve breakdown, falling back to estimated values if not scraped
  const cheapestOption = currentRide.options.length > 0 
    ? currentRide.options.reduce((min, opt) => opt.fare < min.fare ? opt : min, currentRide.options[0])
    : null;
  const eta = cheapestOption ? cheapestOption.eta : 5;
  const rawBreakdown = currentRide.breakdown || cheapestOption?.breakdown;

  const baseFare = rawBreakdown?.baseFare ?? settings?.baseFare ?? 50;
  const distanceCharge = rawBreakdown?.distanceCharge ?? parseFloat((currentRide.distance * (settings?.distanceRate ?? 15)).toFixed(2));
  const timeCharge = rawBreakdown?.timeCharge ?? parseFloat((eta * (settings?.timeRate ?? 2)).toFixed(2));
  const tolls = rawBreakdown?.tolls ?? 0;
  const platformFee = rawBreakdown?.platformFee ?? settings?.fixedServiceFee ?? 10;
  const gst = rawBreakdown?.gst ?? parseFloat(((baseFare + distanceCharge + timeCharge + platformFee) * 0.05).toFixed(2));
  const surge = rawBreakdown?.surge ?? (currentRide.surgeDetected ? 50 : 0);
  const discount = rawBreakdown?.discount ?? 0;

  const isEstimated = !rawBreakdown;

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xl font-bold text-slate-800">{currentRide.provider}</p>
            <p className="text-sm text-slate-500">{currentRide.options.length > 0 ? currentRide.options[0].vehicleType : 'Standard'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Current Fare</p>
            <p className="text-2xl font-bold text-slate-800">
              ₹{currentRide.options.length > 0 ? Math.min(...currentRide.options.map(o => o.fare)) : 0}
            </p>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 w-fit ${isFair ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isFair ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {fairPriceAnalysis.status}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Actual Fare</p>
            <p className="text-2xl font-bold text-slate-800">₹{currentRide.options.length > 0 ? Math.min(...currentRide.options.map(o => o.fare)) : 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Expected Fare</p>
            <p className="text-xl font-semibold text-slate-600 line-through decoration-slate-400">₹{fairPriceAnalysis.expectedFare}</p>
          </div>
        </div>
      </div>

      {/* Savings & Score */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-xl p-4 shadow-sm border ${fairPriceAnalysis.savings > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            {fairPriceAnalysis.savings > 0 ? <TrendingDown size={18} className="text-emerald-600"/> : <TrendingUp size={18} className="text-rose-600"/>}
            <h3 className={`font-semibold ${fairPriceAnalysis.savings > 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
              {fairPriceAnalysis.savings > 0 ? 'Savings' : 'Overcharge'}
            </h3>
          </div>
          <p className={`text-2xl font-bold ${fairPriceAnalysis.savings > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ₹{Math.abs(fairPriceAnalysis.savings)}
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-2">Fairness Score</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-blue-600">{fairnessAnalysis.fairnessScore}</span>
            <span className="text-sm text-slate-500 mb-1">/ 100</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Rating: <strong className="text-slate-700">{fairnessAnalysis.rating}</strong></p>
        </div>
      </div>

      {/* Transparency */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-slate-800">Transparency</h3>
          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">{transparencyAnalysis.transparencyScore}%</span>
        </div>
        
        {transparencyAnalysis.reasons.length > 0 ? (
          <ul className="space-y-2">
            {transparencyAnalysis.reasons.map((r, i) => (
              <li key={i} className="text-sm flex gap-2 text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-emerald-600 flex items-center gap-2 bg-emerald-50 p-2 rounded border border-emerald-100">
            <CheckCircle size={16} /> Highly transparent pricing.
          </p>
        )}
      </div>

      {/* Detailed Fare Breakdown Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-slate-800">Detailed Fare Breakdown</h3>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isEstimated ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
            {isEstimated ? 'Estimated' : 'Scraped'}
          </span>
        </div>
        
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex justify-between items-center py-1 border-b border-slate-50">
            <span className="flex items-center gap-1">✔ Base Fare</span>
            <span className="font-semibold text-slate-800">₹{baseFare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-50">
            <span className="flex items-center gap-1">✔ Distance Charge {isEstimated ? `(${currentRide.distance} km)` : ''}</span>
            <span className="font-semibold text-slate-800">₹{distanceCharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-50">
            <span className="flex items-center gap-1">✔ Time Charge {isEstimated ? `(${eta} min)` : ''}</span>
            <span className="font-semibold text-slate-800">₹{timeCharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-50">
            <span className="flex items-center gap-1">✔ Toll Charges</span>
            <span className="font-semibold text-slate-800">₹{tolls.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-50">
            <span className="flex items-center gap-1">✔ Platform Fee</span>
            <span className="font-semibold text-slate-800">₹{platformFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-50">
            <span className="flex items-center gap-1">✔ GST Tax</span>
            <span className="font-semibold text-slate-800">₹{gst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-50">
            <span className="flex items-center gap-1">✔ Surge Charges</span>
            <span className={`font-semibold ${surge > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              ₹{surge.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="flex items-center gap-1">✔ Discount</span>
            <span className={`font-semibold ${discount > 0 ? 'text-green-600' : 'text-slate-800'}`}>
              {discount > 0 ? `-₹${discount.toFixed(2)}` : `₹0.00`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
