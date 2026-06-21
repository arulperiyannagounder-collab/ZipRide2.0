import React, { useState, useEffect } from 'react';
import { ZipRideRepository, HazardReport } from '../services/dbInterface';
import { AlertTriangle, Plus, Check, ShieldAlert, MapPin, Eye, ThumbsUp, Calendar } from 'lucide-react';

export const RoadIntelligenceView: React.FC = () => {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState<HazardReport['type']>('Pothole');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('Saran');
  const [roadHealthScore, setRoadHealthScore] = useState(100);

  useEffect(() => {
    loadHazards();
  }, []);

  const loadHazards = () => {
    const data = ZipRideRepository.getHazards();
    setHazards(data);
    calculateHealth(data);
  };

  const calculateHealth = (list: HazardReport[]) => {
    let score = 100;
    // Deductions only for verified hazards or active ones
    list.forEach(h => {
      const multiplier = h.isVerified ? 1.0 : 0.5;
      if (h.type === 'Pothole') score -= 15 * multiplier;
      else if (h.type === 'Flood') score -= 25 * multiplier;
      else if (h.type === 'Accident') score -= 20 * multiplier;
      else if (h.type === 'Road Work') score -= 10 * multiplier;
    });
    setRoadHealthScore(Math.max(10, Math.round(score)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newHazard: HazardReport = {
      id: `HAZ-${Math.floor(1000 + Math.random() * 9000)}`,
      type,
      description,
      location: {
        lat: 13.0827 + (Math.random() - 0.5) * 0.05,
        lng: 80.2707 + (Math.random() - 0.5) * 0.05
      },
      reporterName: reporterName || 'Anonymous Rider',
      createdAt: new Date().toISOString(),
      confirmations: [],
      isVerified: false
    };

    const updated = ZipRideRepository.addHazard(newHazard);
    setHazards(updated);
    calculateHealth(updated);
    setDescription('');
    setShowAddForm(false);
  };

  const handleConfirm = (id: string) => {
    const profile = ZipRideRepository.getProfile();
    const updated = ZipRideRepository.confirmHazard(id, profile.fullName);
    setHazards(updated);
    calculateHealth(updated);
  };

  // Get color for Road Health Score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
    if (score >= 55) return 'text-amber-500 border-amber-500/20 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/20 bg-rose-500/10';
  };

  const getHazardBadgeColor = (hazardType: string) => {
    switch (hazardType) {
      case 'Flood': return 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30';
      case 'Accident': return 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30';
      case 'Pothole': return 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30';
      default: return 'bg-slate-500/20 text-slate-650 dark:text-slate-350 border-slate-500/30';
    }
  };

  return (
    <div className="bg-theme-card border border-theme-border rounded-2xl p-6 shadow-xs">
      {/* Header and Road Health Meter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-theme-border pb-5 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-theme-text-primary flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-indigo-500 animate-pulse shrink-0" />
            Community Road Intelligence
          </h2>
          <p className="text-xs text-theme-text-secondary">Crowdsourced transit hazard reporting and safety telemetry</p>
        </div>

        {/* Road Health Score Card */}
        <div className={`flex items-center gap-4 border px-4 py-2.5 rounded-xl ${getScoreColor(roadHealthScore)}`}>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold opacity-85">Local Road Health Score</p>
            <h3 className="text-2xl font-black">{roadHealthScore}%</h3>
          </div>
          <div className="text-xs font-semibold px-2 py-0.5 rounded-md bg-black/10 dark:bg-black/25">
            {roadHealthScore >= 80 ? 'Safe Roads' : roadHealthScore >= 55 ? 'Caution Advised' : 'High Risk Area'}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form or Report Button */}
        <div className="lg:col-span-1">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-750 text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-all duration-200 cursor-pointer border-0"
            >
              <Plus className="h-5 w-5" />
              Report Road Hazard
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="bg-theme-bg/40 border border-theme-border p-5 rounded-xl space-y-4">
              <h3 className="text-sm font-bold text-theme-text-primary">File Hazard Report</h3>
              
              <div>
                <label className="block text-xs font-semibold text-theme-text-secondary mb-1.5">Hazard Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as HazardReport['type'])}
                  className="w-full bg-theme-card border border-theme-border rounded-lg text-theme-text-primary p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Pothole">🕳️ Pothole / Road Damage</option>
                  <option value="Flood">🌊 Water Logging / Flood</option>
                  <option value="Road Work">🚧 Barricade / Road Work</option>
                  <option value="Accident">💥 Collision / Accident</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-text-secondary mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe location details, lane blockade status..."
                  className="w-full bg-theme-card border border-theme-border rounded-lg text-theme-text-primary p-2.5 text-xs h-24 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-text-secondary mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full bg-theme-card border border-theme-border rounded-lg text-theme-text-primary p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-theme-bg hover:bg-theme-hover-bg text-theme-text-secondary text-xs font-bold py-2 px-3 rounded-lg border border-theme-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-xs cursor-pointer border-0"
                >
                  Submit Report
                </button>
              </div>
            </form>
          )}

          {/* Guidelines info */}
          <div className="mt-4 bg-theme-bg/20 border border-theme-border p-4 rounded-xl text-xs space-y-2 text-theme-text-secondary">
            <h4 className="font-bold text-theme-text-primary">How verification works</h4>
            <p>Every submitted hazard remains in 'Pending' status. Once 2 independent riders or drivers tap the verify checkmark, the hazard becomes officially 'Verified'.</p>
            <p>Verified hazards directly affect regional Road Health Scores and help the smart routing engine recalculate eco or safest commutes.</p>
          </div>
        </div>

        {/* Hazard List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-theme-text-primary flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-indigo-500 shrink-0" />
              Active Hazards List ({hazards.length})
            </h3>
            <button 
              onClick={loadHazards} 
              className="text-xs text-indigo-500 hover:underline cursor-pointer bg-transparent border-0"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {hazards.length > 0 ? (
              hazards.map((hazard) => {
                const user = ZipRideRepository.getProfile();
                const alreadyConfirmed = hazard.confirmations.includes(user.fullName) || hazard.reporterName === user.fullName;

                return (
                  <div 
                    key={hazard.id} 
                    className="bg-theme-bg/30 border border-theme-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-theme-bg/50 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getHazardBadgeColor(hazard.type)}`}>
                          {hazard.type}
                        </span>
                        {hazard.isVerified ? (
                          <span className="bg-emerald-500/20 text-emerald-650 dark:text-emerald-405 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3 shrink-0" /> Verified
                          </span>
                        ) : (
                          <span className="bg-theme-bg/50 text-theme-text-secondary border border-theme-border text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Pending ({hazard.confirmations.length}/2 verifies)
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs font-semibold text-theme-text-primary">{hazard.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-theme-text-secondary">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" /> Lat: {hazard.location.lat.toFixed(4)}, Lng: {hazard.location.lng.toFixed(4)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 shrink-0" /> {new Date(hazard.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>Reporter: {hazard.reporterName}</span>
                      </div>
                    </div>

                    {/* Verification Button */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleConfirm(hazard.id)}
                        disabled={alreadyConfirmed}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg transition-all border cursor-pointer ${
                          alreadyConfirmed 
                            ? 'bg-theme-bg text-theme-text-secondary border-theme-border cursor-not-allowed opacity-60' 
                            : 'bg-indigo-600/10 text-indigo-650 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-600/20'
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5 shrink-0" />
                        {alreadyConfirmed ? 'Already Verified' : 'Verify Hazard'}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-theme-bg/30 border border-dashed border-theme-border rounded-xl text-theme-text-secondary text-xs">
                No active hazards reported in your area. Safe travels!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default RoadIntelligenceView;
