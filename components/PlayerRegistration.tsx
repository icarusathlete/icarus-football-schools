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
    position: 'TBD' as Player['position'],
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
                position: 'TBD',
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
                position: (row.position || 'TBD') as Player['position'],
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
        : 'border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:border-[#C3F629]/50'
    }
  `;

  return (
    <div className="max-w-6xl mx-auto pb-44 space-y-8 animate-in fade-in duration-700 font-display">
        
        {/* Mode Switcher - Compact Pill Design */}
        {/* Mode Switcher - Precision HUD Pill */}
        <div className="flex justify-center mb-4">
            <div className="bg-white/5 backdrop-blur-xl p-1 rounded-xl border border-white/10 flex gap-1 shadow-2xl relative z-10">
                <button 
                    onClick={() => setMode('player')}
                    className={`px-10 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${mode === 'player' ? 'bg-[#C3F629] text-[#00054e] shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                    ATHLETE_UNITS
                </button>
                <button 
                    onClick={() => setMode('coach')}
                    className={`px-10 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${mode === 'coach' ? 'bg-[#C3F629] text-[#00054e] shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                    STAFF_OFFICERS
                </button>
            </div>
        </div>

      <div className="glass-card overflow-hidden relative border-none bg-surface-default/40">
        
        {/* Header Section - Tactical HUD */}
        <div className="relative px-8 py-10 text-white overflow-hidden bg-[#00054e]/50 border-b border-white/5">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#C3F629]/20 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(195,246,41,0.05),transparent_70%)]" />
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4 text-[#C3F629] font-black uppercase tracking-[0.4em] text-[8px] italic">
                <Shield size={12} className="animate-pulse" /> ACADEMY ROSTER MANAGEMENT
              </div>
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none font-display text-white">
                {mode === 'player' ? 'ATHLETE ' : 'STAFF '} 
                <span className="text-[#C3F629]">
                    REGISTRATION
                </span>
              </h2>
            </div>
            
            <div className="flex items-center gap-6">
                {mode === 'player' && (
                    <div className="bg-[#1e2a95]/40 backdrop-blur-3xl px-8 py-6 rounded-xl border border-[#C3F629]/10 flex flex-col items-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[#C3F629]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[8px] font-black text-[#C3F629]/50 uppercase tracking-[0.4em] mb-2 relative z-10 italic">MEMBER ID ALLOCATION</span>
                        <span className="text-4xl font-black tracking-tighter text-white font-mono relative z-10 shadow-2xl">{nextId}</span>
                        {/* Scanning Line Effect */}
                        <div className="absolute h-0.5 w-full bg-[#C3F629]/20 top-0 left-0 animate-scan" />
                    </div>
                )}
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => setShowConfigModal(true)}
                        className="flex items-center justify-center gap-3 text-[8px] font-black uppercase tracking-[0.3em] bg-white/5 border border-white/10 hover:border-[#C3F629]/50 hover:text-white px-6 py-3 rounded-lg transition-all group italic"
                    >
                        <Settings size={14} className="group-hover:rotate-90 transition-transform" /> TAXONOMY MODULE
                    </button>
                    {mode === 'player' && (
                        <button 
                            onClick={() => csvInputRef.current?.click()}
                            className="flex items-center justify-center gap-3 text-[8px] font-black uppercase tracking-[0.3em] bg-[#00C8FF] text-[#00054e] px-6 py-3 rounded-lg transition-all shadow-xl italic hover:scale-105 active:scale-95"
                        >
                            <FileText size={14} /> DATA INGESTION
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
                                    w-56 h-64 rounded-xl bg-white/5 border border-dashed flex items-center justify-center overflow-hidden transition-all duration-700 
                                    ${previewUrl ? 'border-[#C3F629]/50 shadow-2xl scale-[1.02]' : 'border-white/10 group-hover:border-[#C3F629]/30'}
                                `}>
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 text-white/10 group-hover:text-[#C3F629]/40 transition-colors">
                                            <Camera size={40} strokeWidth={1} />
                                            <span className="text-[9px] font-black uppercase tracking-[0.3em] italic">Initialize Avatar</span>
                                        </div>
                                    )}
                                </div>
                                <label className="absolute -bottom-2 -right-2 cursor-pointer bg-[#C3F629] text-[#00054e] p-4 rounded-lg shadow-2xl hover:scale-110 active:scale-95 transition-all z-20">
                                    <Upload size={18} />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </label>
                            </div>
                            
                            <div className="space-y-6 bg-white/5 p-6 rounded-xl border border-white/5">
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-[#C3F629] uppercase tracking-[0.2em] ml-1">Athlete Full Name</label>
                                    <input type="text" className={getInputClass('fullName')} value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="NAME_ENTRY..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-[#C3F629] uppercase tracking-[0.2em] ml-1">Date of Birth</label>
                                    <input type="date" className={getInputClass('dateOfBirth')} value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Operational Config */}
                        <div className="lg:col-span-8 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                                        <Shield size={14} className="text-[#C3F629]" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 italic">Field <span className="text-white">Assignment</span></h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Forward', 'Midfielder', 'Defender', 'Goalkeeper', 'TBD'].map(pos => (
                                            <button key={pos} type="button" onClick={() => setFormData({...formData, position: pos as any})}
                                                className={`py-3 px-4 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border transition-all duration-300 italic
                                                    ${formData.position === pos ? 'bg-[#C3F629] border-[#C3F629] text-[#00054e] shadow-lg' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                                            >
                                                {pos}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                                        <MapPin size={14} className="text-[#00C8FF]" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 italic">Zone <span className="text-white">Mapping</span></h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Operational Sector (Venue)</label>
                                            <select className={getInputClass('venue')} value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})}>
                                                <option value="">Select Venue</option>
                                                {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Division Assignment (Batch)</label>
                                            <select className={getInputClass('batch')} value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})}>
                                                <option value="">Select Batch</option>
                                                {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-6">
                                    <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                                        <Phone size={14} className="text-[#C3F629]" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 italic">Contact <span className="text-white">Registry</span></h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Guardian Name</label>
                                            <input type="text" className={getInputClass('parentName')} value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} placeholder="PRIMARY_CONTACT..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Contact Number</label>
                                            <input type="text" className={getInputClass('contactNumber')} value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} placeholder="+91 XXX..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3 text-[9px] font-black text-white/20 uppercase tracking-[0.3em] italic">
                            <Zap size={14} className="text-[#C3F629]" />
                            Secure Layer Persistent Storage Synchronized
                        </div>
                        <button type="submit" disabled={status === 'submitting'}
                            className="bg-[#C3F629] text-[#00054e] font-black py-4 px-12 rounded-xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-[10px] italic font-display"
                        >
                            {status === 'submitting' ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                            {status === 'submitting' ? 'SYNCHRONIZING...' : 'EXECUTE ENROLLMENT'}
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleCoachSubmit} className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-[#C3F629] border-4 border-[#00054e] text-[#00054e] rounded-xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#C3F629]/20">
                            <UserCheck size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter font-display">Tactical <span className="text-[#C3F629]">Officer Credentials</span></h3>
                        <p className="text-[#C3F629]/60 text-[9px] font-black uppercase tracking-[0.3em] mt-2 italic">Authorize encrypted command-level credentials</p>
                    </div>

                    <div className="space-y-8 bg-white/5 p-8 rounded-xl border border-white/5 shadow-inner">
                        <div className="flex flex-col items-center gap-6 mb-8">
                            <div className="relative group">
                                <div className={`w-40 h-40 rounded-xl bg-white/5 border border-dashed border-white/10 overflow-hidden transition-all duration-700 ${coachPreviewUrl ? 'border-[#C3F629]/50 shadow-2xl scale-[1.02]' : 'group-hover:border-[#C3F629]/30'}`}>
                                    {coachPreviewUrl ? <img src={coachPreviewUrl} className="w-full h-full object-cover" /> : <Camera size={24} className="text-white/10" />}
                                </div>
                                <label className="absolute -bottom-2 -right-2 cursor-pointer bg-[#C3F629] text-[#00054e] p-4 rounded-lg shadow-2xl"><Upload size={16} /><input type="file" className="hidden" onChange={handleCoachFileChange} /></label>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2"><label className="text-[8px] font-black text-[#C3F629] uppercase tracking-[0.3em]">Command Username</label><input type="text" className={getInputClass('username')} value={coachForm.username} onChange={e => setCoachForm({...coachForm, username: e.target.value})} /></div>
                            <div className="space-y-2"><label className="text-[8px] font-black text-[#C3F629] uppercase tracking-[0.3em]">Access Key (PWD)</label><input type="password" className={getInputClass('password')} value={coachForm.password} onChange={e => setCoachForm({...coachForm, password: e.target.value})} /></div>
                        </div>
                    </div>

                    <div className="space-y-8 bg-white/5 p-8 rounded-xl border border-white/5 shadow-inner">
                        <div className="space-y-4">
                            <label className="text-[8px] font-black text-[#C3F629] uppercase tracking-[0.3em] flex items-center gap-3"><Map size={14} /> Operational Sectors (Venues)</label>
                            <div className="flex flex-wrap gap-2">
                                {venues.map(v => <button key={v.id} type="button" onClick={() => toggleCoachAssignment('venue', v.name)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${coachForm.assignedVenues.includes(v.name) ? 'bg-[#C3F629] text-[#00054e] border-[#C3F629] shadow-xl' : 'bg-white/5 text-white/40 border-white/5 hover:text-white'}`}>{v.name}</button>)}
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={status === 'submitting'} className="w-full bg-[#C3F629] text-[#00054e] font-black py-5 rounded-xl shadow-2xl uppercase tracking-[0.4em] text-[10px] italic font-display hover:scale-[1.01] transition-all">AUTHORIZE_COMMISSION</button>
                </form>
            )}
        </div>
      </div>

      {/* Roster Table - Denser Desktop Layout */}
      {mode === 'player' && players.length > 0 && (
          <div className="glass-card overflow-hidden mt-12 animate-in slide-in-from-bottom-8 duration-1000 bg-surface-default/40 border-none">
            <div className="px-8 py-6 border-b border-white/5 bg-white/2 flex justify-between items-center">
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Active <span className="text-[#C3F629] ml-2 underline underline-offset-8 decoration-2 whitespace-nowrap">TACTICAL_SQUAD</span></h3>
                <span className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10 text-[8px] font-black text-[#00C8FF] uppercase tracking-[0.2em] italic">{players.length} TOTAL_UNITS</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead><tr className="bg-white/2 border-b border-white/5 font-display"><th className="px-8 py-4 text-[9px] uppercase font-black tracking-[0.3em] text-white/40 italic">Profile_id</th><th className="px-8 py-4 text-[9px] uppercase font-black tracking-[0.3em] text-white/40 italic">Member_code</th><th className="px-8 py-4 text-[9px] uppercase font-black tracking-[0.3em] text-white/40 italic">Sector_mapping</th><th className="text-right px-8 py-4 text-[9px] uppercase font-black tracking-[0.3em] text-white/40 italic">Status</th></tr></thead>
                    <tbody className="divide-y divide-white/2">
                        {players.map(p => (
                            <tr key={p.id} className="group hover:bg-[#C3F629]/5 transition-all outline-none border-none"><td className="px-8 py-4 flex items-center gap-4"><div className="relative"><img src={p.photoUrl} className="w-10 h-10 rounded-lg object-cover border border-white/10 shadow-lg" /><div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#C3F629] border-2 border-[#00054e] rounded-full shadow-glow"></div></div><span className="font-black text-white uppercase italic tracking-tight text-xs">{p.fullName}</span></td><td className="px-8 py-4 font-mono text-[10px] text-[#00C8FF]/70">{p.memberId}</td><td className="px-8 py-4"><div className="text-[10px] font-black text-white/80 uppercase italic tracking-widest">{p.venue}</div><div className="text-[8px] font-bold text-[#C3F629]/60 mt-0.5 uppercase italic tracking-tighter">{p.batch} • {p.position}</div></td><td className="px-8 py-4 text-right"><button onClick={() => handleSecureDelete('player', p.id, p.fullName)} className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all border border-white/5 hover:border-red-500/20 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
      )}

      {/* Taxonomy Modal - Tactical Config */}
      {showConfigModal && (
          <div className="fixed inset-0 z-[100] bg-[#00054e]/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
              <div className="glass-card w-full max-w-2xl rounded-xl border border-white/10 shadow-3xl relative overflow-hidden animate-in zoom-in-95 duration-500 bg-surface-default/90">
                  <div className="bg-white/2 p-10 border-b border-white/5 flex justify-between items-center">
                    <div><h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Global <span className="text-[#C3F629]">Taxonomy_module</span></h3><p className="text-[8px] text-white/30 font-black uppercase tracking-[0.3em] mt-1 italic">Configure operational sectors & divisions</p></div>
                    <button onClick={() => setShowConfigModal(false)} className="p-3 bg-white/5 rounded-lg text-white/20 hover:text-[#C3F629] transition-all border border-white/10"><X size={20} /></button>
                  </div>
                  <div className="flex bg-white/2 p-2">
                    {['venues', 'batches'].map(t => <button key={t} onClick={() => setConfigTab(t as any)} className={`flex-1 py-4 rounded-lg text-[9px] font-black uppercase tracking-[0.3em] italic transition-all ${configTab === t ? 'bg-[#C3F629] text-[#00054e] shadow-lg scale-105' : 'text-white/30 hover:text-white'}`}>{t === 'venues' ? 'SECTORS_VENUES' : 'DIVISIONS_BATCHES'}</button>)}
                  </div>
                  <div className="p-10 space-y-8 h-[400px] overflow-y-auto custom-scrollbar">
                    <div className="flex gap-3"><input type="text" className={getInputClass('newItem')} value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="DEFINE_NEW_PARAM..." /><button onClick={handleAddItem} className="bg-[#C3F629] text-[#00054e] px-8 rounded-lg font-black uppercase tracking-widest hover:scale-105 transition-all text-[9px] italic">DEPLOY</button></div>
                    <div className="grid grid-cols-1 gap-3">
                        {(configTab === 'venues' ? venues : batches).map(item => (
                            <div key={item.id} className="p-5 bg-white/2 rounded-lg border border-white/5 flex justify-between items-center group hover:border-[#C3F629]/20 transition-all"><span className="font-black text-white/80 uppercase italic tracking-widest text-[10px]">{item.name}</span><button onClick={() => handleSecureDelete(configTab === 'venues' ? 'venue' : 'batch', item.id, item.name)} className="p-2 text-white/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button></div>
                        ))}
                    </div>
                  </div>
              </div>
          </div>
      )}

      <ConfirmModal isOpen={deleteModalOpen} title={`Revoke ${itemToDelete?.type}`} message={`Are you sure you want to permanently revoke "${itemToDelete?.name}"? Data restoration is impossible.`} onConfirm={confirmDelete} onCancel={() => {setDeleteModalOpen(false); setItemToDelete(null);}} requireTypeToConfirm="delete" />
    </div>
  );
};
