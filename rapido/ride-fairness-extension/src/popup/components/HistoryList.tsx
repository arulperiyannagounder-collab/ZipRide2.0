import React from 'react';
import { useStore } from '../../store/useStore';
import { storageService } from '../../services/storageService';
import { Trash2 } from 'lucide-react';

const HistoryList: React.FC = () => {
  const { history, setHistory } = useStore();

  const handleClear = async () => {
    await storageService.clearHistory();
    setHistory([]);
  };

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <p>No ride history available.</p>
      </div>
    );
  }

  // Reverse to show newest first
  const sortedHistory = [...history].reverse();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-slate-800">Recent Rides</h2>
        <button 
          onClick={handleClear}
          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
        >
          <Trash2 size={14} /> Clear
        </button>
      </div>

      <div className="space-y-3">
        {sortedHistory.map((entry) => {
          const date = new Date(entry.date);
          const isFair = entry.fairnessScore >= 60;
          
          return (
            <div key={entry.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-800">{entry.provider}</p>
                <p className="text-xs text-slate-500">
                  {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="font-bold text-slate-800">₹{entry.fare}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${isFair ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  Score: {entry.fairnessScore}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryList;
