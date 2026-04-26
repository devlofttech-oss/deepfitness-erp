import { useState, useEffect } from 'react';
import { getCollection, createDocument } from '../../firebase/db';
import toast from 'react-hot-toast';

export default function CheckinScreen() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [recentCheckins, setRecentCheckins] = useState([]);

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

  const handleCheckin = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      toast.error('Please select a member to check in.');
      return;
    }

    const member = members.find(m => m.id === selectedMemberId);

    try {
      setCheckingIn(true);
      const checkinRecord = {
        memberId: member.id,
        memberName: member.name,
        timestamp: new Date().toISOString(),
        status: member.status
      };

      await createDocument('attendance', checkinRecord);
      
      setRecentCheckins(prev => [checkinRecord, ...prev].slice(0, 10)); // Keep last 10 in UI
      toast.success(`${member.name} checked in successfully!`);
      setSelectedMemberId(''); // Reset
      
    } catch (error) {
      console.error(error);
      toast.error('Failed to log check-in.');
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="flex flex-col gap-2 text-center md:text-left">
        <h1 className="font-h1 text-h1 text-on-surface">Gym Check-in Desk</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Select or search for a member to log their daily attendance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Check-in Form */}
        <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)] flex flex-col justify-center min-h-[400px]">
          <div className="w-16 h-16 bg-primary-container/30 text-primary rounded-full flex items-center justify-center mb-6 mx-auto">
            <span className="material-symbols-outlined text-4xl">qr_code_scanner</span>
          </div>
          
          <form onSubmit={handleCheckin} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-medium text-sm text-on-surface text-center">Select Member (Manual Fallback)</label>
              <select 
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface outline-none appearance-none text-center font-medium"
              >
                <option value="">-- Search / Select Member --</option>
                {loading ? <option disabled>Loading...</option> : members.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                ))}
              </select>
            </div>

            <button 
              type="submit" 
              disabled={checkingIn || loading}
              className="bg-primary text-on-primary px-6 py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2 w-full text-lg"
            >
              {checkingIn ? 'Logging...' : 'Confirm Check-in'}
            </button>
          </form>
        </div>

        {/* Right Side: Recent Check-ins */}
        <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)] flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-emerald-600">how_to_reg</span>
            <h3 className="font-h3 text-h3 text-on-surface">Recent Check-ins</h3>
          </div>

          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[350px]">
            {recentCheckins.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant opacity-60">
                <p>No recent check-ins.</p>
              </div>
            ) : (
              recentCheckins.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${record.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    <span className="font-medium text-on-surface">{record.memberName}</span>
                  </div>
                  <span className="text-xs text-on-surface-variant">
                    {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
