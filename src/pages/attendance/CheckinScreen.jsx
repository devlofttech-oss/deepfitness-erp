import { useState, useEffect, useRef } from 'react';
import { getCollection, createDocument } from '../../firebase/db';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

const playBeep = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime); 
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      
      // double beep for error
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(150, ctx.currentTime + 0.3);
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.setValueAtTime(0.5, ctx.currentTime + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.6);
    }
  } catch(e) {
    console.error('Audio beep failed', e);
  }
};

export default function CheckinScreen() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [recentCheckins, setRecentCheckins] = useState([]);
  const lastScannedRef = useRef({ id: null, time: 0 });

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await getCollection('members');
        setMembers(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    if (loading) return;

    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: { width: 250, height: 250 },
      fps: 10,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      rememberLastUsedCamera: true
    }, false);

    const onScanSuccess = async (decodedText) => {
      // Debounce to prevent multiple rapid scans of the same code
      const now = Date.now();
      if (lastScannedRef.current.id === decodedText && now - lastScannedRef.current.time < 3000) {
        return; 
      }
      lastScannedRef.current = { id: decodedText, time: now };

      const member = members.find(m => m.id === decodedText);

      if (!member) {
        playBeep('error');
        toast.error('Invalid QR Code. Member not found.');
        return;
      }

      await processCheckin(member);
    };

    scanner.render(onScanSuccess, (error) => {
      // ignore normal scan errors
    });

    return () => {
      scanner.clear().catch(error => console.error('Failed to clear scanner', error));
    };
  }, [loading, members]);

  const processCheckin = async (member) => {
    if (checkingIn) return;
    
    if (member.status !== 'Active') {
      playBeep('error');
      toast.error(`${member.name} - Membership Expired! Please renew.`, { duration: 4000 });
      return;
    }

    try {
      setCheckingIn(true);
      const checkinRecord = {
        memberId: member.id,
        memberName: member.name,
        timestamp: new Date().toISOString(),
        status: member.status
      };

      await createDocument('attendance', checkinRecord);
      
      playBeep('success');
      setRecentCheckins(prev => [checkinRecord, ...prev].slice(0, 10)); // Keep last 10 in UI
      toast.success(`${member.name} checked in successfully!`);
      
    } catch (error) {
      console.error(error);
      playBeep('error');
      toast.error('Failed to log check-in.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleManualCheckin = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      toast.error('Please select a member to check in.');
      return;
    }

    const member = members.find(m => m.id === selectedMemberId);
    if (member) {
      await processCheckin(member);
      setSelectedMemberId(''); // Reset
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col gap-2 text-center md:text-left">
        <h1 className="font-h1 text-h1 text-on-surface">Gym Check-in Scanner</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Scan member QR code or use manual check-in.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Scanner */}
        <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)] flex flex-col justify-center min-h-[400px]">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">qr_code_scanner</span>
            <h3 className="font-h3 text-h3 text-on-surface">QR Scanner</h3>
          </div>
          
          <div className="rounded-xl overflow-hidden border-2 border-outline-variant/30 mb-6 bg-black flex-1 relative">
            <div id="reader" className="w-full h-full min-h-[300px]"></div>
            {/* HTML5 QR code adds its own UI, but we can override some styles if needed */}
            <style>{`
              #reader__scan_region { background: #000; }
              #reader__dashboard_section_csr span { color: #fff; margin-bottom: 8px; display: block; }
              #reader button { background: #7c3aed; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; margin: 4px; font-weight: 500; }
              #reader select { padding: 8px; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 8px; }
            `}</style>
          </div>
          
          <div className="border-t border-outline-variant/20 pt-6">
            <form onSubmit={handleManualCheckin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm text-on-surface">Manual Fallback</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="flex-1 px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface outline-none appearance-none font-medium"
                  >
                    <option value="">-- Select Member --</option>
                    {loading ? <option disabled>Loading...</option> : members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                    ))}
                  </select>
                  <button 
                    type="submit" 
                    disabled={checkingIn || loading || !selectedMemberId}
                    className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center"
                  >
                    Check In
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Recent Check-ins */}
        <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)] flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-emerald-600">history</span>
            <h3 className="font-h3 text-h3 text-on-surface">Live Check-ins</h3>
          </div>

          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {recentCheckins.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant opacity-60">
                <span className="material-symbols-outlined text-5xl mb-2 opacity-50">how_to_reg</span>
                <p>Waiting for scans...</p>
              </div>
            ) : (
              recentCheckins.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 shadow-sm animate-in slide-in-from-top-2 fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
                       <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface text-lg">{record.memberName}</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium tracking-wide uppercase">Active Member</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-on-surface">
                      {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs text-on-surface-variant">Today</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
