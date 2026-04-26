import { useState, useEffect } from 'react';
import { useDarkMode } from '../../hooks/useDarkMode';
import { getDocument, createDocument, updateDocument, setDocument } from '../../firebase/db';
import toast from 'react-hot-toast';

const DEFAULT_PLANS = [
  { id: '1', name: '1 Month Basic', durationDays: 30, amount: 1500 },
  { id: '2', name: '3 Months Pro', durationDays: 90, amount: 4000 },
  { id: '3', name: '1 Year Master', durationDays: 365, amount: 12000 },
];

const DEFAULT_GYM_INFO = {
  name: 'Deep Fitness',
  location: 'Bangalore, Karnataka',
  contact: '+91 94497 49003'
};

export default function Settings() {
  const { isDarkMode, setLightMode, setDarkMode } = useDarkMode();
  
  const [gymInfo, setGymInfo] = useState(DEFAULT_GYM_INFO);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isEditGymInfoOpen, setIsEditGymInfoOpen] = useState(false);
  const [editGymInfo, setEditGymInfo] = useState(DEFAULT_GYM_INFO);
  
  const [isEditPlansOpen, setIsEditPlansOpen] = useState(false);
  const [editPlans, setEditPlans] = useState([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const doc = await getDocument('settings', 'general');
        if (doc) {
          if (doc.gymInfo) setGymInfo(doc.gymInfo);
          if (doc.plans) setPlans(doc.plans);
        } else {
          // Initialize if missing
          await setDocument('settings', 'general', { gymInfo: DEFAULT_GYM_INFO, plans: DEFAULT_PLANS });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveGymInfo = async (e) => {
    e.preventDefault();
    try {
      await setDocument('settings', 'general', { gymInfo: editGymInfo });
      setGymInfo(editGymInfo);
      setIsEditGymInfoOpen(false);
      toast.success('Gym Information updated!');
    } catch (error) {
      toast.error('Failed to update Gym Information. Please make sure the document exists.');
      console.error(error);
    }
  };

  const handleSavePlans = async (e) => {
    e.preventDefault();
    try {
      await setDocument('settings', 'general', { plans: editPlans });
      setPlans(editPlans);
      setIsEditPlansOpen(false);
      toast.success('Membership Plans updated!');
    } catch (error) {
      toast.error('Failed to update Plans.');
      console.error(error);
    }
  };

  const addPlan = () => {
    setEditPlans([...editPlans, { id: Date.now().toString(), name: 'New Plan', durationDays: 30, amount: 1000 }]);
  };

  const updatePlan = (index, field, value) => {
    const newPlans = [...editPlans];
    newPlans[index][field] = field === 'durationDays' || field === 'amount' ? Number(value) : value;
    setEditPlans(newPlans);
  };

  const removePlan = (index) => {
    setEditPlans(editPlans.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex flex-col gap-2">
        <h1 className="font-h1 text-h1 text-on-surface">Settings</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Manage your gym preferences and display settings.</p>
      </div>

      {/* Appearance */}
      <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.1)]">
        <h3 className="font-h3 text-h3 text-on-surface mb-1">Appearance</h3>
        <p className="text-sm text-on-surface-variant mb-5">Choose your preferred display theme.</p>
        <div className="flex gap-3">
          <button
            onClick={setLightMode}
            className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              !isDarkMode
                ? 'border-primary bg-primary-container/20'
                : 'border-outline-variant/30 hover:border-outline-variant'
            }`}
          >
            <div className="w-full h-16 bg-slate-100 rounded-lg border border-slate-200 flex items-end p-1.5 gap-1">
              <div className="w-8 h-full bg-slate-300 rounded"></div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="h-2 bg-slate-300 rounded w-3/4"></div>
                <div className="h-2 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>light_mode</span>
              <span className={`text-sm font-medium ${!isDarkMode ? 'text-primary' : 'text-on-surface-variant'}`}>Light Mode</span>
            </div>
            {!isDarkMode && <span className="text-xs text-primary font-medium">✓ Active</span>}
          </button>

          <button
            onClick={setDarkMode}
            className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              isDarkMode
                ? 'border-primary bg-primary-container/20'
                : 'border-outline-variant/30 hover:border-outline-variant'
            }`}
          >
            <div className="w-full h-16 bg-slate-800 rounded-lg border border-slate-700 flex items-end p-1.5 gap-1">
              <div className="w-8 h-full bg-slate-600 rounded"></div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="h-2 bg-slate-600 rounded w-3/4"></div>
                <div className="h-2 bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-indigo-400" style={{ fontVariationSettings: "'FILL' 1" }}>dark_mode</span>
              <span className={`text-sm font-medium ${isDarkMode ? 'text-primary' : 'text-on-surface-variant'}`}>Dark Mode</span>
            </div>
            {isDarkMode && <span className="text-xs text-primary font-medium">✓ Active</span>}
          </button>
        </div>
      </div>

      {/* Gym Info */}
      <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.1)] relative">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-h3 text-h3 text-on-surface mb-1">Gym Information</h3>
            <p className="text-sm text-on-surface-variant">Basic details about your gym.</p>
          </div>
          <button 
            onClick={() => { setEditGymInfo(gymInfo); setIsEditGymInfoOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-outline-variant/30 text-on-surface rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span> Edit
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {[
            { label: 'Gym Name', value: gymInfo.name, icon: 'fitness_center' },
            { label: 'Location', value: gymInfo.location, icon: 'location_on' },
            { label: 'Contact', value: gymInfo.contact, icon: 'call' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-surface-container border border-outline-variant/20">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
              <div>
                <div className="text-xs text-on-surface-variant font-medium">{item.label}</div>
                <div className="text-sm font-semibold text-on-surface">{loading ? '...' : item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Membership Plans */}
      <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.1)] relative">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-h3 text-h3 text-on-surface mb-1">Membership Plans</h3>
            <p className="text-sm text-on-surface-variant">Current plans configured for this gym.</p>
          </div>
          <button 
            onClick={() => { setEditPlans([...plans]); setIsEditPlansOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-outline-variant/30 text-on-surface rounded-lg text-sm font-medium hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span> Edit
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-6 text-on-surface-variant"><span className="material-symbols-outlined animate-spin">progress_activity</span></div>
        ) : (
          <div className="flex flex-col gap-3">
            {plans.map((plan, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-container/30 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[18px]">card_membership</span>
                  </div>
                  <div>
                    <div className="font-medium text-on-surface">{plan.name}</div>
                    <div className="text-xs text-on-surface-variant">{plan.durationDays} Days</div>
                  </div>
                </div>
                <div className="font-bold text-on-surface text-lg">₹{Number(plan.amount).toLocaleString('en-IN')}</div>
              </div>
            ))}
            {plans.length === 0 && <div className="text-center py-4 text-on-surface-variant text-sm">No plans configured.</div>}
          </div>
        )}
      </div>

      {/* Version Info */}
      <div className="text-center text-xs text-on-surface-variant opacity-50 pb-4">
        Deep Fitness ERP v1.0 · Powered by Firebase
      </div>

      {/* Edit Gym Info Modal */}
      {isEditGymInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
            <h2 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">edit</span> Edit Gym Info
            </h2>
            <form onSubmit={handleSaveGymInfo} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-on-surface-variant">Gym Name</label>
                <input required type="text" value={editGymInfo.name} onChange={e => setEditGymInfo({...editGymInfo, name: e.target.value})} className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-on-surface-variant">Location</label>
                <input required type="text" value={editGymInfo.location} onChange={e => setEditGymInfo({...editGymInfo, location: e.target.value})} className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-on-surface-variant">Contact</label>
                <input required type="text" value={editGymInfo.contact} onChange={e => setEditGymInfo({...editGymInfo, contact: e.target.value})} className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface outline-none focus:border-primary" />
              </div>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant/20">
                <button type="button" onClick={() => setIsEditGymInfoOpen(false)} className="px-4 py-2 rounded-lg font-medium text-on-surface-variant hover:bg-surface-container">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 shadow-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">save</span> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Plans Modal */}
      {isEditPlansOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit</span> Edit Plans
              </h2>
              <button onClick={() => setIsEditPlansOpen(false)} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
              {editPlans.map((plan, index) => (
                <div key={index} className="p-4 bg-surface-container rounded-xl border border-outline-variant/30 flex gap-3 items-end relative">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-on-surface-variant">Plan Name</label>
                    <input required type="text" value={plan.name} onChange={e => updatePlan(index, 'name', e.target.value)} className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-md text-on-surface outline-none focus:border-primary text-sm" />
                  </div>
                  <div className="w-24 flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-on-surface-variant">Days</label>
                    <input required type="number" value={plan.durationDays} onChange={e => updatePlan(index, 'durationDays', e.target.value)} className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-md text-on-surface outline-none focus:border-primary text-sm" />
                  </div>
                  <div className="w-32 flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-on-surface-variant">Amount (₹)</label>
                    <input required type="number" value={plan.amount} onChange={e => updatePlan(index, 'amount', e.target.value)} className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-md text-on-surface outline-none focus:border-primary text-sm" />
                  </div>
                  <button type="button" onClick={() => removePlan(index)} className="h-[38px] w-[38px] rounded-md bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 flex items-center justify-center hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
              <button type="button" onClick={addPlan} className="w-full py-3 border-2 border-dashed border-outline-variant/50 rounded-xl text-primary font-medium hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add</span> Add New Plan
              </button>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant/20">
              <button type="button" onClick={() => setIsEditPlansOpen(false)} className="px-4 py-2 rounded-lg font-medium text-on-surface-variant hover:bg-surface-container">Cancel</button>
              <button onClick={handleSavePlans} type="button" className="px-5 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 shadow-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">save</span> Save All Plans
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
