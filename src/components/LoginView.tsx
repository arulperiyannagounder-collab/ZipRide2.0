import React, { useState } from 'react';
import { Shield, Bike, Scale, Send, Check, MapPin, Navigation, ArrowRight, Smartphone, Mail } from 'lucide-react';
import { Driver } from '../types';

interface LoginViewProps {
  onLoginSuccess: (emailOrName: string, role: 'rider' | 'driver', phone: string) => void;
  isLoggedIn: boolean;
  currentUser: string | null;
  onLogout: () => void;
  drivers: Driver[];
}

export default function LoginView({ 
  onLoginSuccess, 
  isLoggedIn, 
  currentUser, 
  onLogout,
  drivers 
}: LoginViewProps) {
  const [fullName, setFullName] = useState('Arul');
  const [phoneNumber, setPhoneNumber] = useState('9876543210');
  const [emailAddress, setEmailAddress] = useState('arul@zipride.com');
  const [password, setPassword] = useState('••••••••');
  const [role, setRole] = useState<'rider' | 'driver'>('rider');
  const [vehicleType, setVehicleType] = useState<'Bike' | 'Auto' | 'Cab'>('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('TN-09-XX-8822');
  const [showingOTP, setShowingOTP] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [enteredOTP, setEnteredOTP] = useState('');
  const [showingAgreement, setShowingAgreement] = useState(false);
  const [showingLocationSetup, setShowingLocationSetup] = useState(false);
  const [latitude, setLatitude] = useState('13.0827');
  const [longitude, setLongitude] = useState('80.2707');
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email' | 'mobile' | 'google'>('mobile');

  const setPreset = (lat: string, lng: string) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleDriverSelect = (driverId: string) => {
    if (!driverId) return;
    const d = drivers.find(drv => drv.id === driverId);
    if (d) {
      setFullName(d.name);
      const cleanPhone = d.phone.replace('+91 ', '').replace('+91', '').trim();
      setPhoneNumber(cleanPhone);
      setVehicleType(d.vehicleType);
      setVehicleNumber(d.vehicle);
      setLatitude(d.location.lat.toString());
      setLongitude(d.location.lng.toString());
    }
  };

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorText('Please enter your name.');
      return;
    }
    if (loginMethod === 'mobile' || role === 'driver') {
      if (!phoneNumber.trim() || phoneNumber.length < 8) {
        setErrorText('Please enter a valid phone number.');
        return;
      }
    } else if (loginMethod === 'email') {
      if (!emailAddress.includes('@')) {
        setErrorText('Please enter a valid email address.');
        return;
      }
    }
    setErrorText('');
    
    // Generate simulated 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOTP(code);
    setShowingOTP(true);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredOTP.trim()) {
      setErrorText('Please enter the verification code.');
      return;
    }
    if (enteredOTP === generatedOTP || enteredOTP === '1234') {
      setErrorText('');
      setShowingOTP(false);
      setShowingAgreement(true);
    } else {
      setErrorText(`Incorrect OTP. Please enter the generated OTP code: ${generatedOTP}`);
    }
  };

  const handleAcceptAgreement = () => {
    setShowingAgreement(false);
    if (role === 'driver') {
      setShowingLocationSetup(true);
    } else {
      const finalPhone = loginMethod === 'mobile' ? phoneNumber : '9876543210';
      const formattedPhone = finalPhone.startsWith('+91') ? finalPhone : `+91 ${finalPhone}`;
      onLoginSuccess(fullName, 'rider', formattedPhone);
    }
  };

  const detectLocation = () => {
    setIsDetecting(true);
    setErrorText('');
    if (!navigator.geolocation) {
      setErrorText('Geolocation is not supported by your browser.');
      setIsDetecting(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setIsDetecting(false);
      },
      (error) => {
        setErrorText(`GPS error: ${error.message}. Please input coordinates manually.`);
        setIsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleConfirmLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setErrorText('Please enter a valid latitude (-90 to 90).');
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setErrorText('Please enter a valid longitude (-180 to 180).');
      return;
    }

    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91 ${phoneNumber}`;
    const finalVehicleNum = vehicleNumber.trim() || `TN09-XX-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const response = await fetch('/api/drivers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          phone: formattedPhone,
          location: { lat: latNum, lng: lngNum },
          vehicleType: vehicleType,
          vehicleNumber: finalVehicleNum
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register driver profile on the server.');
      }

      onLoginSuccess(fullName, 'driver', formattedPhone);
      setShowingLocationSetup(false);
    } catch (err: any) {
      setErrorText(err.message || 'An error occurred during location registration.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-70px)] flex flex-col md:flex-row bg-[#020B2D]">
      
      {/* LEFT PANEL: Branding and Info */}
      <div className="w-full md:w-1/2 bg-[#020B2D] text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_50%)] z-0"></div>
        <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-indigo-650/10 rounded-full blur-3xl z-0"></div>

        <div className="relative z-10 space-y-8 md:space-y-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00C896] flex items-center justify-center shadow-[0_0_20px_rgba(0,200,150,0.3)]">
              <Bike className="w-5.5 h-5.5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">FairFare AI / ZipRide</span>
          </div>

          {/* Hero text */}
          <div className="space-y-6 max-w-lg">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Every rupee, explained.<br />Every route, verified.
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              No surge pricing, OTP for pickup and drop, live telemetry, route deviation alerts and automated refunds for unsafe driving.
            </p>
          </div>

          {/* Features list */}
          <div className="space-y-4 max-w-md">
            {[
              "Transparent fare breakdown before you book",
              "Geofenced safety alerts in real time",
              "AI dispute resolution with evidence"
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3 text-sm font-semibold text-slate-200">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-[#00C896]" strokeWidth={3} />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-8 mt-12 border-t border-slate-800/60 text-xs text-slate-400 font-medium tracking-wide">
          Built on Google Maps & Gemini AI
        </div>
      </div>

      {/* RIGHT PANEL: Login Form Card */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-6 md:p-16">
        <div className="w-full max-w-md space-y-6">

          {/* ACTIVE SESSION STATE */}
          {isLoggedIn && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center border border-emerald-100">
                <Check className="w-8 h-8 text-[#00C896]" strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Operational Session Active</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">Authorized User: {currentUser}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Authorization Node:</span>
                  <span className="font-mono font-bold text-[#00C896]">FAIR_COMPLIANCE_APPROVED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account Type:</span>
                  <span className="font-mono text-slate-600 font-bold">
                    {localStorage.getItem('zipride_role') === 'driver' ? 'Driver Console Mode' : 'Rider Account Mode'}
                  </span>
                </div>
              </div>
              <button
                onClick={onLogout}
                id="auth-logout-btn"
                className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-sm border border-rose-200/50 transition cursor-pointer"
              >
                Revoke Access (Log Out)
              </button>
            </div>
          )}

          {/* DRIVER LOCATION SETUP VIEW */}
          {!isLoggedIn && showingLocationSetup && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-md space-y-5">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                  <MapPin className="w-6 h-6 text-[#00C896]" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Set Location</h2>
                <p className="text-slate-400 text-xs font-semibold">Set coordinates to start receiving dispatches</p>
              </div>

              <form onSubmit={handleConfirmLocation} className="space-y-5">
                {errorText && (
                  <div className="bg-rose-50 text-rose-600 text-xs py-2.5 px-4 rounded-xl border border-rose-100 font-semibold text-center">
                    {errorText}
                  </div>
                )}

                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isDetecting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Navigation className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
                  <span>{isDetecting ? 'Detecting GPS Location...' : 'Use Browser Geolocation'}</span>
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-slate-500 mb-1.5 uppercase">Latitude</label>
                    <input
                      type="text"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="13.0827"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#00C896] rounded-xl text-sm transition outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-slate-500 mb-1.5 uppercase">Longitude</label>
                    <input
                      type="text"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="80.2707"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#00C896] rounded-xl text-sm transition outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold tracking-wider text-slate-500 mb-2 uppercase">Preset Coordinates (Quick Test)</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPreset('13.0827', '80.2707')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer"
                    >
                      Chennai
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreset('11.0168', '76.9558')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer"
                    >
                      Coimbatore
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreset('19.0760', '72.8777')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer"
                    >
                      Mumbai
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#00C896] hover:bg-[#00b384] text-white font-bold rounded-xl text-[14px] flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Check className="w-4.5 h-4.5" strokeWidth={3} />
                  <span>Confirm & Go Online</span>
                </button>
              </form>
            </div>
          )}

          {/* OTP VERIFICATION VIEW */}
          {!isLoggedIn && showingOTP && !showingLocationSetup && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-md space-y-5">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                  <Shield className="w-6 h-6 text-[#00C896]" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Verify Code</h2>
                <p className="text-slate-400 text-xs font-semibold">Enter SMS security verification code</p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-5">
                {errorText && (
                  <div className="bg-rose-50 text-rose-600 text-xs py-2.5 px-4 rounded-xl border border-rose-100 font-semibold text-center">
                    {errorText}
                  </div>
                )}

                <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 text-center">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block mb-1 font-bold">SMS Gateway Simulator</span>
                  <span className="text-[13px] text-slate-800 font-bold block">
                    OTP Verification Code:{" "}
                    <button
                      type="button"
                      onClick={() => setEnteredOTP(generatedOTP)}
                      className="font-mono text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer inline-block mx-1 font-extrabold focus:outline-none"
                    >
                      {generatedOTP}
                    </button>
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">(Click the code block to auto-populate)</span>
                </div>

                <div>
                  <input
                    type="text"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={enteredOTP}
                    onChange={(e) => setEnteredOTP(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full text-center tracking-[1em] font-mono text-2xl px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#00C896] rounded-xl transition outline-none text-slate-800"
                    id="auth-otp-input"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  id="auth-otp-submit-btn"
                  className="w-full py-3.5 bg-[#00C896] hover:bg-[#00b384] text-white font-bold rounded-xl text-[14px] flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Check className="w-4.5 h-4.5" strokeWidth={3} />
                  <span>Verify & Continue</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowingOTP(false);
                    setErrorText('');
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer transition py-1"
                >
                  ← Back to login details
                </button>
              </form>
            </div>
          )}

          {/* RIDER FAIRNESS AGREEMENT VIEW */}
          {!isLoggedIn && showingAgreement && !showingOTP && !showingLocationSetup && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-md space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                  <Scale className="w-6 h-6 text-[#00C896]" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Fairness Agreement</h3>
                <p className="text-xs text-slate-500">Please review and accept before continuing</p>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100 space-y-3">
                {[
                  "I will treat my driver with respect and dignity.",
                  "I will pay the locked fare digitally — no cash, no haggling.",
                  "I will not request unsafe maneuvers or speeding.",
                  "I understand fares are transparent and never surge.",
                  "Disputes will be raised through the in-app dispute flow only."
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#00C896] shrink-0 mt-0.5" strokeWidth={3} />
                    <span className="text-[12px] text-slate-600 font-semibold leading-normal">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAcceptAgreement}
                className="w-full py-3.5 bg-[#00C896] hover:bg-[#00b384] text-white font-bold rounded-xl text-[14px] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Check className="w-4.5 h-4.5" strokeWidth={3} />
                <span>I Accept & Agree</span>
              </button>
            </div>
          )}

          {/* MAIN LOGIN VIEW */}
          {!isLoggedIn && !showingOTP && !showingAgreement && !showingLocationSetup && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
                <p className="text-slate-500 text-sm font-semibold">Sign in to continue.</p>
              </div>

              {/* Segmented Toggle Role Selector */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/30">
                <button
                  type="button"
                  onClick={() => setRole('rider')}
                  className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                    role === 'rider'
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200/10'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  I'm a Rider
                </button>
                <button
                  type="button"
                  onClick={() => setRole('driver')}
                  className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                    role === 'driver'
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200/10'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  I'm a Driver
                </button>
              </div>

              {/* Login Method Tabs (Rider only, Driver always uses mobile phone/OTP) */}
              {role === 'rider' && (
                <div className="flex border-b border-slate-100">
                  {[
                    { id: 'email', label: 'Email', icon: Mail },
                    { id: 'mobile', label: 'Mobile', icon: Smartphone },
                    { id: 'google', label: 'Google', icon: () => <span className="font-mono font-extrabold text-xs">G</span> }
                  ].map((tab) => {
                    const isSel = loginMethod === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setLoginMethod(tab.id as any)}
                        className={`flex-1 pb-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSel ? 'border-[#00C896] text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Form container */}
              <form onSubmit={handleSendOTP} className="space-y-4">
                {errorText && (
                  <div className="bg-rose-50 text-rose-600 text-xs py-2.5 px-4 rounded-xl border border-rose-100 font-semibold text-center animate-shake">
                    {errorText}
                  </div>
                )}

                {/* Driver quick selection preset helper dropdown */}
                {role === 'driver' && drivers && drivers.length > 0 && (
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-1.5">
                    <label className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">Autofill Preset</label>
                    <select
                      onChange={(e) => handleDriverSelect(e.target.value)}
                      defaultValue=""
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs outline-none text-slate-700 font-semibold cursor-pointer"
                    >
                      <option value="">Select a registered driver to auto-fill...</option>
                      {drivers.map(drv => (
                        <option key={drv.id} value={drv.id}>{drv.name} ({drv.vehicleType})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Inputs */}
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-slate-500 mb-1.5 uppercase">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#00C896] focus:bg-white rounded-xl text-sm transition outline-none text-slate-700 font-semibold"
                      id="auth-fullName-input"
                    />
                  </div>

                  {/* Email inputs */}
                  {role === 'rider' && loginMethod === 'email' && (
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-slate-500 mb-1.5 uppercase">Email Address</label>
                      <input
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        placeholder="arul@zipride.com"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#00C896] focus:bg-white rounded-xl text-sm transition outline-none text-slate-700 font-semibold font-mono"
                      />
                    </div>
                  )}

                  {/* Mobile Phone Input */}
                  {(role === 'driver' || loginMethod === 'mobile') && (
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-slate-500 mb-1.5 uppercase">Mobile Number</label>
                      <div className="relative flex">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold border-r border-slate-200 pr-3 font-mono">
                          +91
                        </span>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="9876543210"
                          className="w-full pl-16 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#00C896] focus:bg-white rounded-xl text-sm transition outline-none text-slate-700 font-mono font-bold tracking-wide"
                          id="auth-phoneNumber-input"
                        />
                      </div>
                    </div>
                  )}

                  {/* Google Authenticator Prompt info */}
                  {role === 'rider' && loginMethod === 'google' && (
                    <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-xl text-center text-xs text-slate-500 font-semibold">
                      Authentication will verify using your device's primary Google account.
                    </div>
                  )}

                  {/* Vehicle configuration details (Driver Only) */}
                  {role === 'driver' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold tracking-wider text-slate-500 mb-1.5 uppercase">Vehicle Type</label>
                        <select
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value as any)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#00C896] rounded-xl text-sm outline-none text-slate-700 font-semibold cursor-pointer"
                        >
                          <option value="Bike">Bike</option>
                          <option value="Auto">Auto</option>
                          <option value="Cab">Cab</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold tracking-wider text-slate-500 mb-1.5 uppercase">Vehicle Number</label>
                        <input
                          type="text"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          placeholder="e.g. TN-09-AB-1234"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#00C896] focus:bg-white rounded-xl text-sm outline-none text-slate-700 font-mono font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Password Input */}
                  {loginMethod !== 'google' && (
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-slate-500 mb-1.5 uppercase">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#00C896] focus:bg-white rounded-xl text-sm transition outline-none text-slate-700 font-semibold font-mono"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  id="auth-login-submit-btn"
                  className="w-full py-4 bg-[#00C896] hover:bg-[#00b384] hover:shadow-lg hover:shadow-emerald-500/10 text-white font-bold rounded-2xl text-[14px] flex items-center justify-center gap-2 tracking-wide transition shadow-sm cursor-pointer mt-6"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-5 mt-5 border-t border-slate-100/80 font-sans">
                <Shield className="w-4 h-4 text-[#00C896]" />
                <span className="font-semibold">Secured by ZipRide AI Cryptography Gate</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
