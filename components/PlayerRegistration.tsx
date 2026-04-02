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
    w-full rounded-2xl border p-4 text-sm outline-none transition-all duration-300 font-bold shadow-inner font-display italic
    ${errors[field] 
        ? 'border-red-500/50 bg-red-500/5 text-brand-500 placeholder:text-red-500/30' 
        : 'border-white/10 bg-brand-800 text-white placeholder:text-brand-700 focus:border-brand-500'
    }
  `;

  return (
    <div className="max-w-5xl mx-auto pb-32 space-y-10 animate-in fade-in duration-700 font-display">
        
        {/* Mode Switcher */}
        <div className="bg-brand-800 p-2 rounded-[3rem] shadow-2xl border border-white/5 flex flex-col sm:flex-row gap-2">
            <button 
                onClick={() => setMode('player')}
                className={`flex-1 flex items-center justify-center gap-5 py-6 rounded-[2.5rem] transition-all duration-500 ${mode === 'player' ? 'bg-brand-500 text-brand-950 shadow-xl shadow-brand-500/20 scale-[1.02]' : 'hover:bg-white/5 text-brand-500 hover:text-white'}`}
            >
                <div className={`p-3 rounded-2xl ${mode === 'player' ? 'bg-brand-950/20' : 'bg-brand-950/40'}`}><User size={24} /></div>
                <div className="text-left font-display italic">
                    <div className="font-black uppercase tracking-[0.25em] text-[11px]">Athlete Enrollment</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 opacity-70`}>Initialize Commissioning</div>
                </div>
            </button>
            <button 
                onClick={() => setMode('coach')}
                className={`flex-1 flex items-center justify-center gap-5 py-6 rounded-[2.5rem] transition-all duration-500 ${mode === 'coach' ? 'bg-brand-500 text-brand-950 shadow-xl shadow-brand-500/20 scale-[1.02]' : 'hover:bg-white/5 text-brand-500 hover:text-white'}`}
            >
                <div className={`p-3 rounded-2xl ${mode === 'coach' ? 'bg-brand-950/20' : 'bg-brand-950/40'}`}><UserCheck size={24} /></div>
                <div className="text-left font-display italic">
                    <div className="font-black uppercase tracking-[0.25em] text-[11px]">Staff Onboarding</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 opacity-70`}>Authorize Access Protocol</div>
                </div>
            </button>
        </div>

      <div className="bg-brand-900 rounded-[4rem] shadow-2xl border border-white/5 overflow-hidden relative">
        
        {/* Header Section */}
        <div className="relative px-12 py-20 text-white overflow-hidden bg-brand-950/40 border-b border-white/5">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_70%)]" />
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6 text-brand-500 font-black uppercase tracking-[0.4em] text-[10px] bg-brand-900/80 w-fit px-5 py-2.5 rounded-full border border-brand-500/20 shadow-2xl italic">
                <Shield size={14} className="animate-pulse" /> DATABASE INTAKE ACTIVE
              </div>
              <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.85] font-display">
                {mode === 'player' ? 'ATHLETE ' : 'OFFICER '} <br/>
                <span className="text-brand-500">
                    {mode === 'player' ? 'REGISTRATION' : 'ONBOARDING'}
                </span>
              </h2>
              <p className="text-brand-400 text-sm mt-8 font-medium uppercase tracking-tight max-w-xl leading-relaxed italic border-l-2 border-brand-500/30 pl-8">
                  {mode === 'player' 
                    ? 'Initialize new player profile in the Icarus tactical ecosystem. Immediate roster synchronization across all coaching stations.' 
                    : 'Establish high-level access credentials for staff deployments and operational scope assignment.'}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-6 min-w-[320px]">
                {mode === 'player' && (
                    <div className="bg-brand-950/90 backdrop-blur-2xl px-12 py-10 rounded-[3rem] border border-white/10 flex flex-col items-center shadow-3xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em] mb-4 relative z-10 italic">MEMBER ID ALLOCATION</span>
                        <span className="text-6xl font-black tracking-tighter text-white font-mono relative z-10 shadow-2xl">{nextId}</span>
                    </div>
                )}
                <div className="flex gap-4 flex-wrap justify-end">
                    <button 
                        onClick={() => setShowConfigModal(true)}
                        className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] bg-brand-900 border border-white/10 hover:border-brand-500 hover:text-white px-8 py-4 rounded-2xl transition-all shadow-xl group italic font-display"
                    >
                        <Settings size={16} className="group-hover:rotate-90 transition-transform" /> TAXONOMY MODULE
                    </button>
                    {mode === 'player' && (
                        <button 
                            onClick={() => csvInputRef.current?.click()}
                            className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] bg-brand-500 text-brand-950 px-8 py-4 rounded-2xl transition-all shadow-xl italic font-display hover:scale-105"
                        >
                            <FileText size={16} /> DATA INGESTION
                            <input type="file" accept=".csv" className="hidden" ref={csvInputRef} onChange={handleCsvUpload} />
                        </button>
                    )}
                </div>
            </div>
          </div>
        </div>

        {/* --- FORM CONTENT --- */}
        <div className="p-12 md:p-16">
            {mode === 'player' ? (
                <form onSubmit={handlePlayerSubmit} className="space-y-16">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                        {/* Left Column: Photo Upload */}
                        <div className="lg:col-span-4 flex flex-col items-center gap-10">
                        <div className="relative group">
                            <div className={`
                                w-72 h-72 rounded-full bg-brand-800 border-4 border-dashed flex items-center justify-center overflow-hidden transition-all duration-700 
                                ${previewUrl ? 'border-brand-500 shadow-2xl scale-[1.02]' : 'border-white/5 group-hover:border-brand-500/50 group-hover:bg-brand-500/5'}
                            `}>
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-5 text-brand-700 group-hover:text-brand-500 transition-colors">
                                        <Camera size={48} strokeWidth={1} />
                                        <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Initialize Avatar</span>
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-2 right-2 cursor-pointer bg-brand-500 text-brand-950 p-6 rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all z-20">
                                <Upload size={24} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                        <div className="text-center">
                            <h4 className="font-black text-white italic uppercase tracking-tight text-lg font-display">Tactical <span className="text-brand-500">Asset Profile</span></h4>
                            <p className="text-[11px] text-brand-500 font-bold uppercase tracking-[0.2em] mt-3 italic">Required for secure biometric verification.</p>
                        </div>
                        </div>

                        {/* Right Column: Details */}
                        <div className="lg:col-span-8 space-y-16">
                            <div className="space-y-10">
                                <div className="flex items-center gap-5 border-b border-white/5 pb-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20 shadow-inner"><User size={24} /></div>
                                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-brand-400 italic">Personnel <span className="text-white">Credentials</span></h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3 group">
                                        <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Athlete Full Name</label>
                                        <input type="text" className={getInputClass('fullName')} value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="e.g. Leo Messi" />
                                    </div>
                                    <div className="space-y-3 group">
                                        <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Date of Birth</label>
                                        <input type="date" className={getInputClass('dateOfBirth')} value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2 space-y-4">
                                        <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Field Assignment</label>
                                        <div className="flex flex-wrap gap-4">
                                            {['Forward', 'Midfielder', 'Defender', 'Goalkeeper', 'TBD'].map(pos => (
                                                <button key={pos} type="button" onClick={() => setFormData({...formData, position: pos as any})}
                                                    className={`py-4 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all duration-500 italic
                                                        ${formData.position === pos ? 'bg-brand-500 border-brand-500 text-brand-950 shadow-2xl scale-[1.05]' : 'bg-brand-800 border-white/5 text-brand-500 hover:text-white'}`}
                                                >
                                                    {pos}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-10">
                                <div className="flex items-center gap-5 border-b border-white/5 pb-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 border border-brand-500/20 shadow-inner"><MapPin size={24} /></div>
                                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-brand-400 italic">Deployment <span className="text-white">Mapping</span></h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3 group">
                                        <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Assigned Context (Venue)</label>
                                        <select className={getInputClass('venue')} value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})}>
                                            <option value="">Select Venue</option>
                                            {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3 group">
                                        <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Division (Batch)</label>
                                        <select className={getInputClass('batch')} value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})}>
                                            <option value="">Select Batch</option>
                                            {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="flex items-center gap-4 text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic">
                            <Shield size={20} className="text-brand-500" />
                            Secure Core Data Storage Persistence Active
                        </div>
                        <button type="submit" disabled={status === 'submitting'}
                            className="bg-brand-500 text-brand-950 font-black py-6 px-20 rounded-[2.5rem] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-5 uppercase tracking-[0.3em] text-xs italic font-display"
                        >
                            {status === 'submitting' ? <RefreshCw size={24} className="animate-spin" /> : <Save size={24} />}
                            {status === 'submitting' ? 'SYNCHRONIZING...' : 'EXECUTE ENROLLMENT'}
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleCoachSubmit} className="max-w-3xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <div className="text-center mb-16">
                        <div className="w-24 h-24 bg-brand-500 border-4 border-brand-950 text-brand-950 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-500/20">
                            <UserCheck size={48} />
                        </div>
                        <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter font-display">Tactical <span className="text-brand-500">Officer Credentials</span></h3>
                        <p className="text-brand-500 text-[11px] font-black uppercase tracking-[0.3em] mt-4 italic">Authorize encrypted command-level credentials</p>
                    </div>

                    <div className="space-y-12 bg-brand-950/20 p-12 rounded-[3.5rem] border border-white/5 shadow-inner">
                        <div className="flex flex-col items-center gap-8 mb-12">
                            <div className="relative group">
                                <div className={`w-48 h-48 rounded-full bg-brand-900 border-2 border-dashed border-white/10 overflow-hidden transition-all duration-700 ${coachPreviewUrl ? 'border-brand-500 shadow-2xl scale-[1.02]' : 'group-hover:border-brand-500/50'}`}>
                                    {coachPreviewUrl ? <img src={coachPreviewUrl} className="w-full h-full object-cover" /> : <Camera size={32} className="text-brand-800" />}
                                </div>
                                <label className="absolute -bottom-4 -right-4 cursor-pointer bg-brand-500 text-brand-950 p-5 rounded-2xl shadow-2xl"><Upload size={20} /><input type="file" className="hidden" onChange={handleCoachFileChange} /></label>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-3"><label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">Command Username</label><input type="text" className={getInputClass('username')} value={coachForm.username} onChange={e => setCoachForm({...coachForm, username: e.target.value})} /></div>
                            <div className="space-y-3"><label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">Access Key (PWD)</label><input type="text" className={getInputClass('password')} value={coachForm.password} onChange={e => setCoachForm({...coachForm, password: e.target.value})} /></div>
                        </div>
                    </div>

                    <div className="space-y-12 bg-brand-950/20 p-12 rounded-[3.5rem] border border-white/5 shadow-inner">
                        <div className="space-y-6">
                            <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] flex items-center gap-3"><Map size={18} /> Operational Sectors (Venues)</label>
                            <div className="flex flex-wrap gap-3">
                                {venues.map(v => <button key={v.id} type="button" onClick={() => toggleCoachAssignment('venue', v.name)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${coachForm.assignedVenues.includes(v.name) ? 'bg-brand-500 text-brand-950 border-brand-500 shadow-xl' : 'bg-brand-900 text-brand-700 border-white/5 hover:text-white'}`}>{v.name}</button>)}
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={status === 'submitting'} className="w-full bg-brand-500 text-brand-950 font-black py-6 rounded-[2.5rem] shadow-2xl uppercase tracking-[0.4em] text-xs italic font-display hover:scale-105 transition-all">Authorize Commission</button>
                </form>
            )}
        </div>
      </div>

      {/* Roster Table */}
      {mode === 'player' && players.length > 0 && (
          <div className="bg-brand-900 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl mt-16 animate-in slide-in-from-bottom-12 duration-1000">
            <div className="px-12 py-10 border-b border-white/5 bg-brand-950/50 flex justify-between items-center">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Active <span className="text-brand-500 text-3xl ml-2">Squad</span></h3>
                <span className="bg-brand-900 px-6 py-2.5 rounded-full border border-white/10 text-[10px] font-black text-brand-500 uppercase tracking-widest italic">{players.length} Total Operatives</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead><tr className="bg-brand-950/80 border-b border-white/5 font-display"><th className="px-10 py-6 text-[10px] uppercase font-black tracking-[0.3em] text-brand-600 italic">Operative Profile</th><th className="px-10 py-6 text-[10px] uppercase font-black tracking-[0.3em] text-brand-600 italic">Clearance ID</th><th className="px-10 py-6 text-[10px] uppercase font-black tracking-[0.3em] text-brand-600 italic">Deployment</th><th className="text-right px-10 py-6 text-[10px] uppercase font-black tracking-[0.3em] text-brand-600 italic">Revocation</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                        {players.map(p => (
                            <tr key={p.id} className="group hover:bg-brand-500/5 transition-all"><td className="px-10 py-6 flex items-center gap-6"><img src={p.photoUrl} className="w-12 h-12 rounded-full object-cover border-2 border-white/10 shadow-2xl" /><span className="font-black text-white uppercase italic tracking-tight">{p.fullName}</span></td><td className="px-10 py-6 font-mono text-xs text-brand-500">{p.memberId}</td><td className="px-10 py-6"><div className="text-xs font-black text-white uppercase italic tracking-widest">{p.venue}</div><div className="text-[10px] font-bold text-brand-600 mt-1 uppercase italic tracking-tighter">{p.batch} • {p.position}</div></td><td className="px-10 py-6 text-right"><button onClick={() => handleSecureDelete('player', p.id, p.fullName)} className="p-3 text-brand-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
      )}

      {/* Taxonmy Modal */}
      {showConfigModal && (
          <div className="fixed inset-0 z-[100] bg-brand-950/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
              <div className="bg-brand-900 w-full max-w-3xl rounded-[4rem] border border-white/10 shadow-3xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="bg-brand-950/50 p-12 border-b border-white/5 flex justify-between items-center">
                    <div><h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Global <span className="text-brand-500">Taxonomy</span></h3><p className="text-[10px] text-brand-500 font-black uppercase tracking-[0.3em] mt-2 italic">Configure operational sectors & divisions</p></div>
                    <button onClick={() => setShowConfigModal(false)} className="p-4 bg-brand-800 rounded-2xl text-brand-600 hover:text-white transition-all"><X size={28} /></button>
                  </div>
                  <div className="flex bg-brand-950/30 p-3">
                    {['venues', 'batches'].map(t => <button key={t} onClick={() => setConfigTab(t as any)} className={`flex-1 py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] italic transition-all ${configTab === t ? 'bg-brand-500 text-brand-950 shadow-2xl scale-105' : 'text-brand-700 hover:text-white'}`}>{t === 'venues' ? 'Sectors (Venues)' : 'Divisions (Batches)'}</button>)}
                  </div>
                  <div className="p-12 space-y-10 h-[500px] overflow-y-auto custom-scrollbar">
                    <div className="flex gap-4"><input type="text" className={getInputClass('newItem')} value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Define new parameter..." /><button onClick={handleAddItem} className="bg-brand-500 text-brand-950 px-10 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all text-xs italic">Deploy</button></div>
                    <div className="grid grid-cols-1 gap-4">
                        {(configTab === 'venues' ? venues : batches).map(item => (
                            <div key={item.id} className="p-6 bg-brand-950/50 rounded-3xl border border-white/5 flex justify-between items-center group hover:border-brand-500/20 transition-all"><span className="font-black text-white uppercase italic tracking-widest text-xs">{item.name}</span><button onClick={() => handleSecureDelete(configTab === 'venues' ? 'venue' : 'batch', item.id, item.name)} className="p-3 text-brand-800 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button></div>
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
