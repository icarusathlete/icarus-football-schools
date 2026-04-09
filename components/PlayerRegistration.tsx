import React, { useState, useEffect, useRef } from 'react';
import { Upload, Save, X, User, Phone, Shield, Camera, Check, RefreshCw, AlertCircle, Calendar, Briefcase, Trash2, MapPin, Settings, Map, Layers, Plus, Edit2, Key, UserCheck, FileText, Zap } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch } from '../types';
import { ConfirmModal } from './ConfirmModal';
import Papa from 'papaparse';

export const PlayerRegistration: React.FC = () => {
  const [mode, setMode] = useState<'player' | 'coach'>('player');
  const [nextId, setNextId] = useState('');
  
  // Player Form State
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    parentName: '',
    contactNumber: '',
    address: '',
    position: 'POSITION' as Player['position'],
    photoUrl: '',
    venue: '',
    batch: ''
  });

  // Coach Form State
  const [coachForm, setCoachForm] = useState({
      username: '',
      password: '',
      photoUrl: '',
      assignedVenues: [] as string[],
      assignedBatches: [] as string[]
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [coachPreviewUrl, setCoachPreviewUrl] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  
  // Data for Dropdowns
  const [venues, setVenues] = useState<Venue[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  
  // Management States
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configTab, setConfigTab] = useState<'venues' | 'batches'>('venues');
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<{id: string, name: string} | null>(null);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'player' | 'venue' | 'batch', id: string, name: string} | null>(null);

  // Validation & Status States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshData();
    // Listen for updates
    window.addEventListener('academy_data_update', refreshData);
    return () => window.removeEventListener('academy_data_update', refreshData);
  }, []);

  const refreshData = () => {
      const allPlayers = StorageService.getPlayers();
      setPlayers(allPlayers);
      updateNextIdPreview(allPlayers);
      
      const v = StorageService.getVenues();
      const b = StorageService.getBatches();
      setVenues(v);
      setBatches(b);

      // Set defaults for form if empty and available
      setFormData(prev => ({
          ...prev,
          venue: prev.venue || (v.length > 0 ? v[0].name : ''),
          batch: prev.batch || (b.length > 0 ? b[0].name : '')
      }));
  };

  const updateNextIdPreview = (currentPlayers: Player[]) => {
    if (currentPlayers.length === 0) {
      setNextId('ICR-0001');
    } else {
      const ids = currentPlayers
        .map(p => {
          const match = p.memberId?.match(/ICR-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(id => !isNaN(id));
      const maxId = ids.length > 0 ? Math.max(...ids) : 0;
      setNextId(`ICR-${(maxId + 1).toString().padStart(4, '0')}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoachFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setCoachPreviewUrl(url);
          const reader = new FileReader();
          reader.onloadend = () => {
              setCoachForm(prev => ({ ...prev, photoUrl: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const validatePlayer = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Athlete name is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.parentName.trim()) newErrors.parentName = 'Guardian name is required';
    if (!formData.contactNumber.trim()) newErrors.contactNumber = 'Contact number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCoach = () => {
      const newErrors: Record<string, string> = {};
      if (!coachForm.username.trim()) newErrors.username = 'Coach Name is required';
      if (!coachForm.password.trim()) newErrors.password = 'Password is required';
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handlePlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePlayer()) {
        setStatus('error');
        setStatusMsg('Please correct errors.');
        setTimeout(() => setStatus('idle'), 3000);
        return;
    }

    setStatus('submitting');
    setTimeout(async () => {
        try {
            await StorageService.addPlayer({
                ...formData,
                photoUrl: formData.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName)}&background=0ea5e9&color=fff`
            });
            setStatus('success');
            setStatusMsg(`Athlete successfully enrolled!`);
            setFormData({
                fullName: '',
                dateOfBirth: '',
                parentName: '',
                contactNumber: '',
                address: '',
                position: 'POSITION',
                photoUrl: '',
                venue: venues.length > 0 ? venues[0].name : '',
                batch: batches.length > 0 ? batches[0].name : ''
            });
            setPreviewUrl(null);
            refreshData();
            setTimeout(() => setStatus('idle'), 4000);
        } catch (error) {
            setStatus('error');
            setStatusMsg('System error: Could not save profile.');
        }
    }, 800);
  };

  const handleCoachSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateCoach()) {
          setStatus('error');
          setStatusMsg('Please fill in required fields.');
          setTimeout(() => setStatus('idle'), 3000);
          return;
      }

      setStatus('submitting');
      setTimeout(() => {
          try {
              StorageService.addUser({
                  username: coachForm.username,
                  password: coachForm.password,
                  role: 'coach',
                  photoUrl: coachForm.photoUrl,
                  assignedVenues: coachForm.assignedVenues,
                  assignedBatches: coachForm.assignedBatches
              });
              setStatus('success');
              setStatusMsg(`Coach onboarded!`);
              setCoachForm({ username: '', password: '', photoUrl: '', assignedVenues: [], assignedBatches: [] });
              setCoachPreviewUrl(null);
              refreshData();
              setTimeout(() => setStatus('idle'), 4000);
          } catch (err: any) {
              setStatus('error');
              setStatusMsg(err.message || 'Could not create account.');
          }
      }, 800);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkUploading(true);
    setStatus('submitting');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        let successCount = 0;
        for (const row of data) {
          try {
            const name = row.fullName || row.name || '';
            if (name) {
              await StorageService.addPlayer({
                fullName: name,
                dateOfBirth: row.dob || row.dateOfBirth || '',
                parentName: row.parent || row.guardian || '',
                contactNumber: row.phone || row.contact || '',
                address: row.address || '',
                position: (row.position || 'POSITION') as Player['position'],
                venue: row.venue || (venues[0]?.name || ''),
                batch: row.batch || (batches[0]?.name || ''),
                photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`
              });
              successCount++;
            }
          } catch (err) {}
        }
        setIsBulkUploading(false);
        setStatus(successCount > 0 ? 'success' : 'error');
        setStatusMsg(successCount > 0 ? `Registered ${successCount} players!` : 'Import failed.');
        refreshData();
        if (csvInputRef.current) csvInputRef.current.value = '';
        setTimeout(() => setStatus('idle'), 5000);
      }
    });
  };

  const handleSecureDelete = (type: 'player' | 'venue' | 'batch', id: string, name: string) => {
      setItemToDelete({ type, id, name });
      setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!itemToDelete) return;
      const { type, id } = itemToDelete;
      try {
          if (type === 'player') await StorageService.deletePlayer(id);
          else if (type === 'venue') await StorageService.deleteVenue(id);
          else if (type === 'batch') await StorageService.deleteBatch(id);
          refreshData();
          setDeleteModalOpen(false);
          setItemToDelete(null);
      } catch (error) { alert("An error occurred."); }
  };

  const handleAddItem = () => {
      if (!newItemName.trim()) return;
      if (configTab === 'venues') StorageService.addVenue(newItemName.trim());
      else StorageService.addBatch(newItemName.trim());
      setNewItemName('');
      refreshData();
  };

  const handleUpdateItem = () => {
      if (!editingItem || !editingItem.name.trim()) return;
      if (configTab === 'venues') StorageService.updateVenue(editingItem.id, editingItem.name.trim());
      else StorageService.updateBatch(editingItem.id, editingItem.name.trim());
      setEditingItem(null);
      refreshData();
  };

  const toggleCoachAssignment = (type: 'venue' | 'batch', value: string) => {
      if (type === 'venue') {
          setCoachForm(prev => ({
              ...prev,
              assignedVenues: prev.assignedVenues.includes(value)
                  ? prev.assignedVenues.filter(v => v !== value)
                  : [...prev.assignedVenues, value]
          }));
      } else {
          setCoachForm(prev => ({
              ...prev,
              assignedBatches: prev.assignedBatches.includes(value)
                  ? prev.assignedBatches.filter(b => b !== value)
                  : [...prev.assignedBatches, value]
          }));
      }
  };

  const getInputClass = (field: string) => `
    w-full rounded-md border p-3 text-[11px] outline-none transition-all duration-300 font-bold shadow-inner font-display italic
    ${errors[field] 
        ? 'border-red-500/50 bg-red-500/5 text-red-200 placeholder:text-red-900/30' 
        : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-brand-500'
    }
  `;

  return (
    <div className="max-w-6xl mx-auto pb-44 space-y-8 animate-in fade-in duration-700 font-display">
        
        {/* Mode Switcher - Compact Pill Design */}
        {/* Mode Switcher - Precision HUD Pill */}
        <div className="flex justify-center mb-4">
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1 shadow-sm relative z-10">
                <button 
                    onClick={() => setMode('player')}
                    className={`px-10 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${mode === 'player' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    PLAYERS
                </button>
                <button 
                    onClick={() => setMode('coach')}
                    className={`px-10 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${mode === 'coach' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    COACHES
                </button>
            </div>
        </div>

      <div className="glass-card overflow-hidden relative border-none bg-white">
        
        {/* Header Section - Registration Form */}
        <div className="relative px-8 py-10 text-white overflow-hidden bg-brand-950 border-b border-white/5">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,200,255,0.05),transparent_70%)]" />
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4 text-brand-500 font-black uppercase tracking-[0.4em] text-[8px] italic">
                <Shield size={12} className="animate-pulse" /> PLAYER & COACH ENROLLMENT
              </div>
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none font-display text-white">
                {mode === 'player' ? 'PLAYER ' : 'COACH '} 
                <span className="text-brand-500">
                    ENROLLMENT
                </span>
              </h2>
            </div>
            
            <div className="flex items-center gap-6">
                {mode === 'player' && (
                <div className="bg-brand-500 px-8 py-6 rounded-xl border border-brand-400/20 flex flex-col items-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.4em] mb-2 relative z-10 italic">PLAYER ID</span>
                    <span className="text-4xl font-black tracking-tighter text-white font-mono relative z-10 shadow-2xl">{nextId}</span>
                    {/* Scanning Line Effect */}
                    <div className="absolute h-0.5 w-full bg-white/20 top-0 left-0 animate-scan" />
                </div>
                )}
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => setShowConfigModal(true)}
                        className="flex items-center justify-center gap-3 text-[8px] font-black uppercase tracking-[0.3em] bg-white/5 border border-white/10 hover:border-brand-500/50 hover:text-white px-6 py-3 rounded-lg transition-all group italic"
                    >
                        <Settings size={14} className="group-hover:rotate-90 transition-transform" /> VENUE & BATCH SETTINGS
                    </button>
                    {mode === 'player' && (
                        <button 
                            onClick={() => csvInputRef.current?.click()}
                            className="flex items-center justify-center gap-3 text-[8px] font-black uppercase tracking-[0.3em] bg-brand-500 text-white px-6 py-3 rounded-lg transition-all shadow-xl italic hover:scale-105 active:scale-95"
                        >
                            <FileText size={14} /> IMPORT FROM CSV
                            <input type="file" accept=".csv" className="hidden" ref={csvInputRef} onChange={handleCsvUpload} />
                        </button>
                    )}
                </div>
            </div>
          </div>
        </div>

        {/* --- FORM CONTENT --- */}
        <div className="p-8">
            {mode === 'player' ? (
                <form onSubmit={handlePlayerSubmit} className="space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Left Column: Photo & Basic Identity */}
                        <div className="lg:col-span-4 space-y-8">
                            <div className="relative group mx-auto w-fit">
                                <div className={`
                                    w-56 h-64 rounded-xl bg-slate-50 border border-dashed flex items-center justify-center overflow-hidden transition-all duration-700 
                                    ${previewUrl ? 'border-brand-500/50 shadow-2xl scale-[1.02]' : 'border-slate-200 group-hover:border-brand-500/30'}
                                `}>
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 text-slate-200 group-hover:text-brand-500/40 transition-colors">
                                            <Camera size={40} strokeWidth={1} />
                                            <span className="text-[9px] font-black uppercase tracking-[0.3em] italic">Choose Photo</span>
                                        </div>
                                    )}
                                </div>
                                <label className="absolute -bottom-2 -right-2 cursor-pointer bg-brand-500 text-white p-4 rounded-lg shadow-2xl hover:scale-110 active:scale-95 transition-all z-20">
                                    <Upload size={18} />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </label>
                            </div>
                            
                            <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-sm">
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                                    <input type="text" className={getInputClass('fullName')} value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Player Name..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Date of Birth</label>
                                    <input type="date" className={getInputClass('dateOfBirth')} value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Academy Details */}
                        <div className="lg:col-span-8 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                                        <Shield size={14} className="text-brand-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Player <span className="text-slate-900">Position</span></h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Forward', 'Midfielder', 'Defender', 'Goalkeeper', 'POSITION'].map(pos => (
                                            <button key={pos} type="button" onClick={() => setFormData({...formData, position: pos as any})}
                                                className={`py-3 px-4 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border transition-all duration-300 italic
                                                    ${formData.position === pos ? 'bg-brand-500 border-brand-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-800'}`}
                                            >
                                                {pos}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                                        <MapPin size={14} className="text-brand-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Venue <span className="text-slate-900">& Batch</span></h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Venue</label>
                                            <select className={getInputClass('venue')} value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})}>
                                                <option value="">Select Venue</option>
                                                {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Batch</label>
                                            <select className={getInputClass('batch')} value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})}>
                                                <option value="">Select Batch</option>
                                                {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-6 bg-slate-50 p-8 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                                        <Phone size={14} className="text-brand-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Contact <span className="text-slate-900">Information</span></h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Guardian Name</label>
                                            <input type="text" className={getInputClass('parentName')} value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} placeholder="Guardian Name..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Contact Number</label>
                                            <input type="text" className={getInputClass('contactNumber')} value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} placeholder="+91 XXX..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] italic">
                            <Zap size={14} className="text-brand-500" />
                            Details verified and ready to save
                        </div>
                        <button type="submit" disabled={status === 'submitting'}
                            className="bg-brand-500 text-white font-black py-4 px-12 rounded-xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-[10px] italic font-display"
                        >
                            {status === 'submitting' ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                            {status === 'submitting' ? 'SAVING...' : 'REGISTER PLAYER'}
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleCoachSubmit} className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-brand-500 border-4 border-white text-white rounded-xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-500/20">
                            <UserCheck size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter font-display">Coach <span className="text-brand-500">Credentials</span></h3>
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mt-2 italic">Set login credentials for the coach</p>
                    </div>

                    <div className="space-y-8 bg-slate-50 p-8 rounded-xl border border-slate-100 shadow-inner">
                        <div className="flex flex-col items-center gap-6 mb-8">
                            <div className="relative group">
                                <div className={`w-40 h-40 rounded-xl bg-white border border-dashed border-slate-200 overflow-hidden transition-all duration-700 ${coachPreviewUrl ? 'border-brand-500/50 shadow-2xl scale-[1.02]' : 'group-hover:border-brand-500/30'}`}>
                                    {coachPreviewUrl ? <img src={coachPreviewUrl} className="w-full h-full object-cover" /> : <Camera size={24} className="text-slate-200" />}
                                </div>
                                <label className="absolute -bottom-2 -right-2 cursor-pointer bg-brand-500 text-white p-4 rounded-lg shadow-2xl"><Upload size={16} /><input type="file" className="hidden" onChange={handleCoachFileChange} /></label>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2"><label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Username</label><input type="text" className={getInputClass('username')} value={coachForm.username} onChange={e => setCoachForm({...coachForm, username: e.target.value})} /></div>
                            <div className="space-y-2"><label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Password</label><input type="password" className={getInputClass('password')} value={coachForm.password} onChange={e => setCoachForm({...coachForm, password: e.target.value})} /></div>
                        </div>
                    </div>

                    <div className="space-y-8 bg-slate-50 p-8 rounded-xl border border-slate-100 shadow-inner">
                        <div className="space-y-4">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3"><Map size={14} /> Assigned Venues</label>
                            <div className="flex flex-wrap gap-2">
                                {venues.map(v => <button key={v.id} type="button" onClick={() => toggleCoachAssignment('venue', v.name)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${coachForm.assignedVenues.includes(v.name) ? 'bg-brand-500 text-white border-brand-500 shadow-xl' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-900'}`}>{v.name}</button>)}
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={status === 'submitting'} className="w-full bg-brand-500 text-white font-black py-5 rounded-xl shadow-2xl uppercase tracking-[0.4em] text-[10px] italic font-display hover:scale-[1.01] transition-all">SAVE COACH PROFILE</button>
                </form>
            )}
        </div>
      </div>

      {/* Settings Modal - Academy Config */}
      {showConfigModal && (
          <div className="fixed inset-0 z-[100] bg-[#00054e]/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
              <div className="glass-card w-full max-w-2xl rounded-xl border border-white/10 shadow-3xl relative overflow-hidden animate-in zoom-in-95 duration-500 bg-surface-default/90">
                  <div className="bg-slate-50 p-10 border-b border-slate-100 flex justify-between items-center">
                    <div><h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Academy <span className="text-brand-500">Configuration</span></h3><p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1 italic">Manage venues and batches</p></div>
                    <button onClick={() => setShowConfigModal(false)} className="p-3 bg-white rounded-lg text-slate-300 hover:text-brand-500 transition-all border border-slate-100"><X size={20} /></button>
                  </div>
                  <div className="flex bg-slate-50 p-2">
                    {['venues', 'batches'].map(t => <button key={t} onClick={() => setConfigTab(t as any)} className={`flex-1 py-4 rounded-lg text-[9px] font-black uppercase tracking-[0.3em] italic transition-all ${configTab === t ? 'bg-brand-500 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-800'}`}>{t === 'venues' ? 'VENUES' : 'BATCHES'}</button>)}
                  </div>
                  <div className="p-10 space-y-8 h-[400px] overflow-y-auto custom-scrollbar">
                    <div className="flex gap-3"><input type="text" className={getInputClass('newItem')} value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Add name..." /><button onClick={handleAddItem} className="bg-brand-500 text-white px-8 rounded-lg font-black uppercase tracking-widest hover:scale-105 transition-all text-[9px] italic">ADD</button></div>
                    <div className="grid grid-cols-1 gap-3">
                        {(configTab === 'venues' ? venues : batches).map(item => (
                            <div key={item.id} className="p-5 bg-white rounded-lg border border-slate-100 flex justify-between items-center group hover:border-brand-500/20 transition-all"><span className="font-black text-slate-800 uppercase italic tracking-widest text-[10px]">{item.name}</span><button onClick={() => handleSecureDelete(configTab === 'venues' ? 'venue' : 'batch', item.id, item.name)} className="p-2 text-slate-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></div>
                        ))}
                    </div>
                  </div>
              </div>
          </div>
      )}

      <ConfirmModal isOpen={deleteModalOpen} title={`Delete ${itemToDelete?.type}`} message={`Are you sure you want to permanently delete "${itemToDelete?.name}"? This action cannot be undone.`} onConfirm={confirmDelete} onCancel={() => {setDeleteModalOpen(false); setItemToDelete(null);}} requireTypeToConfirm="delete" />
    </div>
  );
};
