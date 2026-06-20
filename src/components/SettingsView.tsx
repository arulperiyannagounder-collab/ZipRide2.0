import React, { useState, useEffect } from 'react';
import { User, Sun, Moon, Laptop, MapPin, Plus, Trash2, LogOut, ShieldAlert, Heart, Accessibility, ShieldCheck, RefreshCw, Flame } from 'lucide-react';
import { useToast } from './ToastNotification';
import { ZipRideRepository, UserProfile } from '../services/dbInterface';
import { SessionResetService } from '../services/SessionResetService';

interface SavedLocation {
  id: string;
  label: string;
  address: string;
}

interface SettingsViewProps {
  currentUser: string | null;
  currentUserRole: 'passenger' | 'driver' | 'admin' | null;
  onLogout: () => void;
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (newTheme: 'light' | 'dark' | 'system') => void;
}

export default function SettingsView({ currentUser, currentUserRole, onLogout, theme, onThemeChange }: SettingsViewProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const { showToast } = useToast();
  
  // Animation settings state
  const [enableAnimations, setEnableAnimations] = useState(() => {
    return localStorage.getItem("skipZipRideIntro") !== "true";
  });

  const handleToggleAnimations = (checked: boolean) => {
    setEnableAnimations(checked);
    if (checked) {
      localStorage.removeItem("skipZipRideIntro");
    } else {
      localStorage.setItem("skipZipRideIntro", "true");
    }
    showToast(checked ? 'Cinematic intro enabled!' : 'Cinematic intro disabled.', 'info');
  };

  // Load and manage user profile
  const [profile, setProfile] = useState<UserProfile>(() => ZipRideRepository.getProfile());

  const [savedLocs, setSavedLocs] = useState<SavedLocation[]>(() => {
    const saved = localStorage.getItem('zipride_saved_locations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: '1', label: 'Home', address: 'Indiranagar 100 Feet Boulevard, Bengaluru, KA' },
      { id: '2', label: 'Work', address: 'Cyber City Business Park, Gurugram, HR' }
    ];
  });
  
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    ZipRideRepository.saveProfile(profile);
    window.dispatchEvent(new Event('zipride_profile_updated'));
    showToast('User profile settings saved successfully!', 'success');
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newAddress.trim()) return;
    const updated = [...savedLocs, {
      id: Date.now().toString(),
      label: newLabel.trim(),
      address: newAddress.trim()
    }];
    setSavedLocs(updated);
    localStorage.setItem('zipride_saved_locations', JSON.stringify(updated));
    setNewLabel('');
    setNewAddress('');
  };

  const handleRemoveLocation = (id: string) => {
    const updated = savedLocs.filter(loc => loc.id !== id);
    setSavedLocs(updated);
    localStorage.setItem('zipride_saved_locations', JSON.stringify(updated));
  };

  const handleAccessibilityToggle = (requirement: string) => {
    const current = profile.accessibilityRequirements || [];
    const updated = current.includes(requirement)
      ? current.filter(r => r !== requirement)
      : [...current, requirement];
    
    const nextProfile = { ...profile, accessibilityRequirements: updated };
    setProfile(nextProfile);
    ZipRideRepository.saveProfile(nextProfile);
    window.dispatchEvent(new Event('zipride_profile_updated'));
    
    if (requirement === 'Visually Impaired') {
      if (updated.includes('Visually Impaired')) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new SpeechSynthesisUtterance("Voice guidance and speech synthesis enabled."));
        }
      } else {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new SpeechSynthesisUtterance("Voice guidance disabled."));
        }
      }
    }
    
    showToast(`Accessibility preference updated.`, 'info');
  };

  const handleClearChat = () => {
    SessionResetService.resetChatHistory();
    showToast('AI Chat History cleared successfully!', 'success');
  };

  const handleResetLocalSession = () => {
    SessionResetService.resetLocalData();
    showToast('Local session resetting...', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleFullDemoReset = async () => {
    try {
      const res = await fetch('/api/admin/reset-demo', { method: 'POST' });
      if (res.ok) {
        SessionResetService.resetLocalData();
        showToast('Full demo database reset completed! Redirecting...', 'success');
        setTimeout(() => {
          onLogout();
          window.location.reload();
        }, 1200);
      } else {
        showToast('Failed to reset backend demo database.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server connection error during database reset.', 'error');
    }
  };

  const accessibilityOptions = [
    { id: 'Senior Citizen', label: 'Senior Citizen (Large text & high contrast UI)' },
    { id: 'Child', label: 'Child Mode (Guardian monitoring & pickup code)' },
    { id: 'Wheelchair User', label: 'Wheelchair User (Prioritize accessible vehicles)' },
    { id: 'Visually Impaired', label: 'Visually Impaired (Voice guidance & speech synthesis)' },
    { id: 'Hearing Impaired', label: 'Hearing Impaired (Visual alerts & flashing notifications)' },
    { id: 'Mobility Assistance Required', label: 'Mobility Assistance Required' },
    { id: 'Autism Spectrum', label: 'Autism Spectrum Support' },
    { id: 'ADHD', label: 'ADHD Support' },
    { id: 'Cognitive Assistance Required', label: 'Cognitive Assistance Required' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-black text-theme-text-primary tracking-tight">Account & Safety Settings</h2>
        <p className="text-sm text-theme-text-secondary mt-1">Manage passenger profile, guardian networks, medical cards, and accessibility requirements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Profile Card & Themes */}
        <div className="space-y-6 lg:col-span-1">
          {/* Profile Basic Card */}
          <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-theme-text-primary text-base">{profile.fullName}</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400">
                  {currentUserRole || 'passenger'}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-theme-border text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Age</label>
                  <input 
                    type="number" 
                    value={profile.age || ''} 
                    onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 0 })}
                    className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary outline-none focus:border-indigo-500 font-semibold mt-1" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Gender</label>
                  <select
                    value={profile.gender || 'Male'}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary outline-none focus:border-indigo-500 font-semibold mt-1"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Full Name</label>
                <input 
                  type="text" 
                  value={profile.fullName} 
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary outline-none focus:border-indigo-500 font-semibold mt-1" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Phone Number</label>
                <input 
                  type="text" 
                  value={profile.phone} 
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary font-mono mt-1 font-semibold outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Email Address</label>
                <input 
                  type="email" 
                  value={profile.email} 
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary font-mono mt-1 font-semibold outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Address</label>
                <input 
                  type="text" 
                  value={profile.address || ''} 
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary outline-none focus:border-indigo-500 font-semibold mt-1" 
                />
              </div>
            </div>
            <button
              onClick={handleProfileSave}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition duration-200"
            >
              Save Profile Info
            </button>
          </div>

          {/* Theme customizer */}
          <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-3">
            <span className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Display Theme</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Laptop }
              ].map(item => {
                const Icon = item.icon;
                const isSelected = theme === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onThemeChange(item.id as any)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition cursor-pointer ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' 
                        : 'border-theme-border bg-theme-input-bg hover:border-theme-text-secondary text-theme-text-secondary font-semibold'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animations Settings */}
          <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-3">
            <span className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Animations Settings</span>
            <label className="flex items-center gap-3 p-3 bg-theme-input-bg rounded-xl border border-theme-border cursor-pointer hover:border-theme-text-secondary">
              <input
                type="checkbox"
                checked={enableAnimations}
                onChange={(e) => handleToggleAnimations(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-500 bg-theme-input-bg border-theme-border w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-semibold text-theme-text-primary">Enable Cinematic Intro</span>
            </label>
          </div>

          {/* Logout card */}
          <div className="bg-theme-card border border-theme-border rounded-3xl p-4 shadow-sm">
            <button
              onClick={onLogout}
              className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out & Lock Session</span>
            </button>
          </div>

          {/* Demo Control Center */}
          <div className="bg-theme-card border border-theme-border rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-theme-text-secondary font-mono">Demo Control Center</h4>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={handleClearChat}
                className="w-full py-2.5 bg-theme-input-bg hover:bg-theme-hover-bg text-theme-text-primary border border-theme-border font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Chat History</span>
              </button>
              
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2.5 bg-theme-input-bg hover:bg-theme-hover-bg text-theme-text-primary border border-theme-border font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
              
              <button
                type="button"
                onClick={handleResetLocalSession}
                className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Local Session</span>
              </button>
              
              <button
                type="button"
                onClick={handleFullDemoReset}
                className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Full Demo Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Guardian Details, Medical Card, Accessibility & Locations */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Guardian & SOS Network Setup */}
          <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-theme-text-primary text-base">Guardian & SOS Safety Network</h3>
                <p className="text-xs text-theme-text-secondary">Setup emergency guardian details for women/child route monitoring</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-theme-border text-xs">
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Emergency SOS Contact Name</label>
                <input 
                  type="text" 
                  value={profile.emergencyContactName} 
                  onChange={(e) => setProfile({ ...profile, emergencyContactName: e.target.value })}
                  placeholder="e.g. Police Control Room"
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary outline-none focus:border-rose-500 mt-1 font-semibold" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Emergency SOS Phone</label>
                <input 
                  type="text" 
                  value={profile.emergencyContactPhone} 
                  onChange={(e) => setProfile({ ...profile, emergencyContactPhone: e.target.value })}
                  placeholder="e.g. 112"
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary font-mono mt-1 font-semibold outline-none focus:border-rose-500" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Family Guardian Name</label>
                <input 
                  type="text" 
                  value={profile.guardianName} 
                  onChange={(e) => setProfile({ ...profile, guardianName: e.target.value })}
                  placeholder="e.g. Aishwarya"
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary outline-none focus:border-rose-500 mt-1 font-semibold" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Family Guardian Relationship</label>
                <input 
                  type="text" 
                  value={profile.guardianRelationship || ''} 
                  onChange={(e) => setProfile({ ...profile, guardianRelationship: e.target.value })}
                  placeholder="e.g. Spouse, Parent"
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary outline-none focus:border-rose-500 mt-1 font-semibold" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Family Guardian Phone</label>
                <input 
                  type="text" 
                  value={profile.guardianPhone} 
                  onChange={(e) => setProfile({ ...profile, guardianPhone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary font-mono mt-1 font-semibold outline-none focus:border-rose-500" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Family Guardian Email</label>
                <input 
                  type="email" 
                  value={profile.guardianEmail || ''} 
                  onChange={(e) => setProfile({ ...profile, guardianEmail: e.target.value })}
                  placeholder="e.g. aishwarya@guardian.com"
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary font-mono mt-1 font-semibold outline-none focus:border-rose-500" 
                />
              </div>
            </div>
            <button
              onClick={handleProfileSave}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs transition duration-200"
            >
              Save Guardian Details
            </button>
          </div>

          {/* Passenger Medical Emergency Card */}
          <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-theme-text-primary text-base">Emergency Medical Card</h3>
                <p className="text-xs text-theme-text-secondary">Vital info automatically sent to hospitals during SOS events</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-theme-border text-xs">
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Blood Group</label>
                <input 
                  type="text" 
                  value={profile.bloodGroup} 
                  onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                  placeholder="e.g. O+"
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary outline-none focus:border-indigo-500 mt-1 font-semibold" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Allergies</label>
                <input 
                  type="text" 
                  value={profile.allergies} 
                  onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Nuts"
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary outline-none focus:border-indigo-500 mt-1 font-semibold" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Preferred Hospital</label>
                <input 
                  type="text" 
                  value={profile.preferredHospital} 
                  onChange={(e) => setProfile({ ...profile, preferredHospital: e.target.value })}
                  placeholder="e.g. Apollo Hospital"
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary outline-none focus:border-indigo-500 mt-1 font-semibold" 
                />
              </div>
              <div className="sm:col-span-3 flex items-center gap-4 py-2 bg-theme-input-bg px-3 rounded-xl border border-theme-border">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.asthma || false}
                    onChange={(e) => setProfile({ ...profile, asthma: e.target.checked })}
                    className="rounded text-indigo-500 focus:ring-indigo-500 bg-theme-input-bg border-theme-border w-4 h-4"
                  />
                  <span className="font-semibold text-theme-text-secondary">Asthma</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.diabetes || false}
                    onChange={(e) => setProfile({ ...profile, diabetes: e.target.checked })}
                    className="rounded text-indigo-500 focus:ring-indigo-500 bg-theme-input-bg border-theme-border w-4 h-4"
                  />
                  <span className="font-semibold text-theme-text-secondary">Diabetes</span>
                </label>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Active Medications</label>
                <input 
                  type="text" 
                  value={profile.medications} 
                  onChange={(e) => setProfile({ ...profile, medications: e.target.value })}
                  placeholder="e.g. Inhaler, insulin"
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary outline-none focus:border-indigo-500 mt-1 font-semibold" 
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">Other Medical Conditions</label>
                <input 
                  type="text" 
                  value={(profile.medicalConditions || []).join(', ')} 
                  onChange={(e) => setProfile({ ...profile, medicalConditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="e.g. Hypertension, None"
                  className="w-full bg-theme-input-bg border border-theme-input-border px-3 py-2 rounded-xl text-theme-text-primary outline-none focus:border-indigo-500 mt-1 font-semibold" 
                />
              </div>
            </div>
            <button
              onClick={handleProfileSave}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition duration-200"
            >
              Save Medical Card
            </button>
          </div>

          {/* Accessibility Settings */}
          <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                <Accessibility className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-theme-text-primary text-base">Accessibility Preferences</h3>
                <p className="text-xs text-theme-text-secondary">Flag accessibility support to notify dispatch drivers</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-theme-border text-xs">
              {accessibilityOptions.map(option => {
                const isActive = (profile.accessibilityRequirements || []).includes(option.id);
                return (
                  <label key={option.id} className="flex items-center gap-3 p-3 bg-theme-input-bg border border-theme-border rounded-xl cursor-pointer hover:border-theme-text-secondary transition">
                    <input 
                      type="checkbox" 
                      checked={isActive} 
                      onChange={() => handleAccessibilityToggle(option.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 bg-theme-input-bg border-theme-border w-4 h-4 cursor-pointer"
                    />
                    <span className="font-semibold text-theme-text-secondary text-xs">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Saved commute locations */}
          <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <span className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono block">Saved Commute Locations</span>
              <p className="text-xs text-theme-text-secondary mt-1">Configure saved shortcuts to speed up pick-up and destination selection.</p>
            </div>

            {/* List of saved locations */}
            <div className="space-y-3">
              {savedLocs.length > 0 ? (
                savedLocs.map(loc => (
                  <div key={loc.id} className="flex items-center justify-between p-4 bg-theme-input-bg border border-theme-border rounded-2xl hover:bg-theme-hover-bg transition">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 bg-theme-card border border-theme-border rounded-xl text-theme-text-secondary shrink-0">
                        <MapPin className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-theme-text-primary block">{loc.label}</span>
                        <span className="text-[11px] text-theme-text-secondary font-medium truncate block mt-0.5">{loc.address}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveLocation(loc.id)}
                      className="p-2 text-theme-text-secondary hover:text-rose-500 rounded-lg hover:bg-theme-hover-bg border border-transparent transition cursor-pointer"
                      title="Remove Location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-theme-input-bg border border-dashed border-theme-border rounded-2xl text-theme-text-secondary text-xs">
                  No saved locations. Add your first commute shortcut below.
                </div>
              )}
            </div>

            {/* Add new saved location form */}
            <form onSubmit={handleAddLocation} className="border-t border-theme-border pt-5 space-y-4">
              <span className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono block">Add Saved Location</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="e.g. Home, Work"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-theme-input-bg border border-theme-input-border px-4 py-3 rounded-xl text-xs font-semibold text-theme-text-primary outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Full address in India..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full sm:col-span-2 bg-theme-input-bg border border-theme-input-border px-4 py-3 rounded-xl text-xs font-semibold text-theme-text-primary outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={!newLabel.trim() || !newAddress.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-theme-hover-bg disabled:text-theme-text-secondary/50 text-white font-bold text-xs py-3 px-5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed shadow-xs border-0"
              >
                <Plus className="w-4 h-4" />
                <span>Save Location</span>
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
