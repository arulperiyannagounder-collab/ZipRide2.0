import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { storageService } from '../../services/storageService';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  BarChart3, 
  Award, 
  Sparkles, 
  Trash2, 
  DollarSign, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck
} from 'lucide-react';

const Charts: React.FC = () => {
  const { history, setHistory } = useStore();
  const [filterCount, setFilterCount] = useState<number>(10);
  const [chartMetric, setChartMetric] = useState<'score' | 'savings'>('score');

  const handleSimulateHistory = async () => {
    const mockEntries = [
      { id: 'm1', date: Date.now() - 9 * 86400000, provider: 'Uber', fare: 260, expectedFare: 220, savings: -40, fairnessScore: 65 },
      { id: 'm2', date: Date.now() - 8 * 86400000, provider: 'Ola', fare: 180, expectedFare: 190, savings: 10, fairnessScore: 88 },
      { id: 'm3', date: Date.now() - 7 * 86400000, provider: 'Rapido', fare: 110, expectedFare: 125, savings: 15, fairnessScore: 94 },
      { id: 'm4', date: Date.now() - 6 * 86400000, provider: 'Uber', fare: 340, expectedFare: 290, savings: -50, fairnessScore: 60 },
      { id: 'm5', date: Date.now() - 5 * 86400000, provider: 'Ola', fare: 210, expectedFare: 230, savings: 20, fairnessScore: 90 },
      { id: 'm6', date: Date.now() - 4 * 86400000, provider: 'Rapido', fare: 105, expectedFare: 110, savings: 5, fairnessScore: 92 },
      { id: 'm7', date: Date.now() - 3 * 86400000, provider: 'Uber', fare: 480, expectedFare: 360, savings: -120, fairnessScore: 40 },
      { id: 'm8', date: Date.now() - 2 * 86400000, provider: 'Ola', fare: 235, expectedFare: 230, savings: -5, fairnessScore: 80 },
      { id: 'm9', date: Date.now() - 1 * 86400000, provider: 'Rapido', fare: 140, expectedFare: 130, savings: -10, fairnessScore: 76 },
      { id: 'm10', date: Date.now(), provider: 'Uber', fare: 285, expectedFare: 300, savings: 15, fairnessScore: 95 }
    ];
    
    // Set in storage
    for (const entry of mockEntries) {
      await storageService.addHistoryEntry(entry);
    }
    const updated = await storageService.getHistory();
    setHistory(updated);
  };

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear all history data?")) {
      await storageService.clearHistory();
      setHistory([]);
    }
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-5 bg-white rounded-2xl border border-slate-100 shadow-xs max-w-md mx-auto mt-6">
        <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
          <BarChart3 size={32} className="animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-bold text-slate-800 text-base">No Analytics Available Yet</h3>
          <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-relaxed">
            We need ride logs to generate trends. Search rides on the **Compare** tab to populate records!
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full pt-2">
          <button 
            onClick={handleSimulateHistory}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all shadow-md shadow-blue-200 cursor-pointer"
          >
            <Sparkles size={14} /> Simulate Sample Data
          </button>
        </div>
      </div>
    );
  }

  // Filter history
  const filteredHistory = history.slice(-filterCount);

  // Format data for recharts
  const chartData = filteredHistory.map(entry => ({
    name: new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    shortName: new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    Fare: entry.fare,
    Expected: entry.expectedFare,
    Score: entry.fairnessScore,
    Savings: entry.savings,
    provider: entry.provider
  }));

  // Aggregated Stats
  const totalRides = history.length;
  const avgFairness = Math.round(history.reduce((acc, h) => acc + h.fairnessScore, 0) / totalRides);
  const totalSavings = history.reduce((acc, h) => acc + h.savings, 0);
  const overpricedCount = history.filter(h => h.savings < 0).length;
  const overpricedPct = Math.round((overpricedCount / totalRides) * 100);

  // Provider Comparison calculations
  const providerStats = history.reduce((acc: Record<string, any>, h: any) => {
    const p = h.provider || 'Generic';
    if (!acc[p]) acc[p] = { name: p, count: 0, totalScore: 0, totalSavings: 0 };
    acc[p].count += 1;
    acc[p].totalScore += h.fairnessScore;
    acc[p].totalSavings += h.savings;
    return acc;
  }, {} as Record<string, any>);

  const providerChartData = (Object.values(providerStats) as Array<{ name: string; count: number; totalScore: number; totalSavings: number }>).map(p => ({
    name: p.name,
    Rides: p.count,
    Score: Math.round(p.totalScore / p.count),
    Savings: parseFloat((p.totalSavings / p.count).toFixed(1))
  }));

  // Colors mapping for providers
  const getProviderColor = (name: string) => {
    if (name.toLowerCase() === 'uber') return '#000000';
    if (name.toLowerCase() === 'ola') return '#10b981'; // Green
    if (name.toLowerCase() === 'rapido') return '#eab308'; // Yellow/Orange
    return '#6366f1'; // Indigo
  };

  // Custom tooltips
  const CustomAreaTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const difference = data.Fare - data.Expected;
      const isOverpriced = difference > 0;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-sans space-y-1">
          <p className="font-bold border-b border-white/10 pb-1 mb-1 text-[10px] text-slate-400">{data.name}</p>
          <div className="flex justify-between gap-4">
            <span className="text-slate-300">Provider:</span>
            <span className="font-bold" style={{ color: getProviderColor(data.provider) }}>{data.provider}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-300">Actual Fare:</span>
            <span className="font-bold text-white">₹{data.Fare}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-300">Fair Baseline:</span>
            <span className="font-bold text-emerald-400">₹{data.Expected}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-white/10 pt-1 mt-1 font-semibold">
            <span>Result:</span>
            {isOverpriced ? (
              <span className="text-rose-400">Overpaid by ₹{difference.toFixed(1)}</span>
            ) : (
              <span className="text-emerald-400">Saved ₹{Math.abs(difference).toFixed(1)}</span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 pb-6 text-left">
      {/* Title & Filter Options */}
      <div className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
            <BarChart3 className="text-blue-600" size={18} />
            Analytics Dashboard
          </h2>
          <p className="text-[10px] text-slate-400">Long-term transparency trends &amp; savings trackers.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={filterCount} 
            onChange={(e) => setFilterCount(parseInt(e.target.value))}
            className="text-[11px] font-semibold border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer bg-slate-50 text-slate-600"
          >
            <option value={5}>Last 5 Rides</option>
            <option value={10}>Last 10 Rides</option>
            <option value={20}>Last 20 Rides</option>
            <option value={50}>All History</option>
          </select>
          <button 
            onClick={handleClearHistory}
            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            title="Clear all history data"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Grid Stats Block */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs text-center space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Avg Fairness</span>
          <div className="flex items-center justify-center gap-1">
            <Award className={`w-3.5 h-3.5 ${avgFairness >= 80 ? 'text-emerald-500' : avgFairness >= 60 ? 'text-blue-500' : 'text-rose-500'}`} />
            <span className="text-base font-extrabold text-slate-800">{avgFairness}%</span>
          </div>
          <span className="text-[8px] text-slate-400 block truncate">
            {avgFairness >= 80 ? 'Excellent audit' : avgFairness >= 60 ? 'Fair rating' : 'Poor pricing'}
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs text-center space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Net Savings</span>
          <div className="flex items-center justify-center gap-0.5">
            <DollarSign className={`w-3.5 h-3.5 ${totalSavings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
            <span className={`text-base font-extrabold ${totalSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {Math.abs(Math.round(totalSavings))}
            </span>
          </div>
          <span className="text-[8px] block truncate">
            {totalSavings >= 0 ? (
              <span className="text-emerald-600 flex items-center justify-center gap-0.5"><ArrowUpRight size={10} /> Saved</span>
            ) : (
              <span className="text-rose-600 flex items-center justify-center gap-0.5"><ArrowDownRight size={10} /> Overpaid</span>
            )}
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs text-center space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Overprice Rate</span>
          <div className="flex items-center justify-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-base font-extrabold text-slate-800">{overpricedPct}%</span>
          </div>
          <span className="text-[8px] text-slate-400 block truncate">{overpricedCount} / {totalRides} rides high</span>
        </div>
      </div>

      {/* Main Area Chart: Fare vs Expected */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-700 text-xs flex items-center gap-1">
            <TrendingUp size={14} className="text-blue-500" />
            Fare vs expected Baseline
          </h3>
          <div className="flex gap-2.5 text-[9px] font-bold">
            <span className="flex items-center gap-1 text-rose-500">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> Actual Price
            </span>
            <span className="flex items-center gap-1 text-emerald-500">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Expected Baseline
            </span>
          </div>
        </div>
        
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="expectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="shortName" tick={{fontSize: 9, fill: '#94a3b8'}} stroke="#cbd5e1" />
              <YAxis tick={{fontSize: 9, fill: '#94a3b8'}} stroke="#cbd5e1" />
              <Tooltip content={<CustomAreaTooltip />} />
              <Area type="monotone" dataKey="Fare" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#actualGrad)" dot={{r: 2, strokeWidth: 1}} activeDot={{r: 4}} />
              <Area type="monotone" dataKey="Expected" stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#expectedGrad)" dot={{r: 2, strokeWidth: 1}} activeDot={{r: 4}} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Split Analysis: Provider Comparison */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
          <h3 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-indigo-500" />
            Provider Fair Audit comparison
          </h3>
          <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setChartMetric('score')}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                chartMetric === 'score' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Fairness Score
            </button>
            <button
              onClick={() => setChartMetric('savings')}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                chartMetric === 'savings' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Avg Savings
            </button>
          </div>
        </div>

        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={providerChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fontSize: 10, fill: '#475569', fontWeight: 'bold'}} stroke="#cbd5e1" />
              <YAxis 
                domain={chartMetric === 'score' ? [0, 100] : ['auto', 'auto']} 
                tick={{fontSize: 9, fill: '#94a3b8'}} 
                stroke="#cbd5e1" 
              />
              <Tooltip 
                cursor={{fill: 'rgba(148, 163, 184, 0.05)'}}
                contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '10px' }}
                formatter={(value: any) => [
                  chartMetric === 'score' ? `${value}% Fairness` : `₹${value} Savings`,
                  chartMetric === 'score' ? 'Score' : 'Avg Savings'
                ]}
              />
              <Bar 
                dataKey={chartMetric === 'score' ? 'Score' : 'Savings'} 
                radius={[6, 6, 0, 0]}
                barSize={32}
              >
                {providerChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getProviderColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Small comparative summary footer list */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50 text-[10px]">
          {providerChartData.map((item, idx) => (
            <div key={idx} className="space-y-0.5 border-r border-slate-100 last:border-r-0 pr-1">
              <span className="font-bold flex items-center gap-1" style={{ color: getProviderColor(item.name) }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getProviderColor(item.name) }} />
                {item.name}
              </span>
              <p className="text-slate-500">
                {item.Rides} {item.Rides === 1 ? 'ride' : 'rides'} logged
              </p>
              <p className="font-semibold text-slate-700">
                {chartMetric === 'score' ? `Score: ${item.Score}%` : `Savings: ₹${item.Savings}`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Charts;
