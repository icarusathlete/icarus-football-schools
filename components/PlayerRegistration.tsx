import React, { useState, useEffect, useRef } from 'react';
import { Upload, Save, X, User, Phone, Shield, Camera, Check, RefreshCw, AlertCircle, Calendar, Briefcase, Trash2, MapPin, Settings, Map, Layers, Plus, Edit2, Key, UserCheck, FileText, Zap, UserPlus, Command, Activity, Radio, ChevronDown } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch } from '../types';
import { ConfirmModal } from './ConfirmModal';

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
      fullName: '',
      contactNumber: '',
      email: '',
      dateOfBirth: '',
      address: '',
      password: '',
      employeeNumber: '',
      photoUrl: '',
      role: 'coach' as const,
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

  useEffect(() => {
    loadAcademyConfig();
    
    const handleDataUpdate = () => {
        loadAcademyConfig();
        refreshData();
    };

    window.addEventListener('academy_data_update', handleDataUpdate);
    return () => window.removeEventListener('academy_data_update', handleDataUpdate);
  }, []);

  const loadAcademyConfig = () => {
      const v = StorageService.getVenues();
      const b = StorageService.getBatches();
      setVenues(v);
      setBatches(b);
  };

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
      if (!coachForm.fullName.trim()) newErrors.fullName = 'Full Name is required';
      if (!coachForm.username.trim()) newErrors.username = 'Username is required';
      if (!coachForm.employeeNumber.trim()) newErrors.employeeNumber = 'Employee ID is required';
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
            
            // Notify other components to refresh
            window.dispatchEvent(new CustomEvent('academy_data_update'));

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
      setTimeout(async () => {
          try {
              await StorageService.addUser({
                  username: coachForm.username,
                  fullName: coachForm.fullName,
                  password: coachForm.password,
                  role: 'coach',
                  photoUrl: coachForm.photoUrl,
                  employeeNumber: coachForm.employeeNumber,
                  contactNumber: coachForm.contactNumber,
                  email: coachForm.email,
                  dateOfBirth: coachForm.dateOfBirth,
                  address: coachForm.address,
                  assignedVenues: coachForm.assignedVenues,
                  assignedBatches: coachForm.assignedBatches
              });

              // Notify other components to refresh
              window.dispatchEvent(new CustomEvent('academy_data_update'));

              setStatus('success');
              setStatusMsg(`Coach onboarded!`);
              setCoachForm({ username: '', fullName: '', contactNumber: '', email: '', dateOfBirth: '', address: '', password: '', employeeNumber: '', photoUrl: '', role: 'coach', assignedVenues: [], assignedBatches: [] });
              setCoachPreviewUrl(null);
              refreshData();
              setTimeout(() => setStatus('idle'), 4000);
          } catch (err: any) {
              setStatus('error');
              setStatusMsg(err.message || 'Could not create account.');
          }
      }, 800);
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
    w-full bg-white/[0.03] border backdrop-blur-3xl rounded-2xl p-6 text-white placeholder:text-white/10 text-[11px] font-black uppercase tracking-[0.2em] italic outline-none transition-all duration-500 shadow-2xl
    ${errors[field] 
        ? 'border-red-500/40 bg-red-500/5 text-red-100 ring-2 ring-red-500/10' 
        : 'border-white/5 focus:border-brand-accent/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-brand-accent/5'
    }
  `;

  const getSelectClass = (field: string) => `
    w-full bg-white/[0.03] border border-white/5 backdrop-blur-3xl rounded-2xl p-6 text-white text-[11px] font-black uppercase tracking-[0.2em] italic outline-none appearance-none cursor-pointer transition-all duration-500 shadow-2xl hover:border-white/10
    ${errors[field] 
        ? 'border-red-500/40 bg-red-500/5 ring-2 ring-red-500/10' 
        : 'focus:border-brand-accent/50 focus:ring-4 focus:ring-brand-accent/5'
    }
  `;

  return (
    <div className="min-h-screen bg-brand-bg space-y-10 pb-44 animate-in fade-in duration-1000 font-display">
      <div className="max-w-7xl mx-auto pt-10 px-4 space-y-10">
        
      {/* ── Registration Command Header ────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#00054e] via-[#070b42] to-black p-10 md:p-16 rounded-[3.5rem] border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none select-none group-hover:opacity-[0.06] transition-opacity duration-1000">
          <Command size={320} className="text-white -mr-20 -mt-20" />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent/20 to-transparent" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px]" />
        
        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 mb-2">
                <Zap size={14} className="text-brand-accent animate-pulse" />
                <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">System Ready</span>
            </div>
            <h1 className="text-6xl sm:text-8xl font-black italic text-white uppercase tracking-tighter leading-none">
              REGISTRATION <span className="premium-gradient-text drop-shadow-[0_0_30px_rgba(0,200,255,0.2)]">COMMAND</span>
            </h1>
            <div className="flex items-center gap-5">
                <span className="w-20 h-[2px] bg-brand-accent/60 shadow-[0_0_15px_rgba(195,246,41,0.5)]"></span>
                <p className="text-[11px] font-black text-white/60 uppercase tracking-[0.5em] italic">
                    ATHLETE & COACH ONBOARDING PROTOCOL
                </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-8 w-full xl:w-auto">
               <div className="flex w-full sm:w-auto gap-2 bg-black/50 p-2.5 rounded-[2rem] border border-white/[0.05] backdrop-blur-3xl shadow-inner">
                    <button 
                        onClick={() => setMode('player')}
                        className={`flex-1 sm:flex-initial px-12 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-700 italic flex items-center justify-center gap-4 border border-transparent ${mode === 'player' ? 'bg-brand-accent text-brand-950 shadow-[0_15px_45px_rgba(195,246,41,0.3)] border-brand-accent' : 'text-white/30 hover:text-white/70 hover:bg-white/5'}`}
                    >
                        <User size={16} className={mode === 'player' ? 'animate-bounce' : ''} /> ATHLETES
                    </button>
                    <button 
                        onClick={() => setMode('coach')}
                        className={`flex-1 sm:flex-initial px-12 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-700 italic flex items-center justify-center gap-4 border border-transparent ${mode === 'coach' ? 'bg-brand-primary text-white shadow-[0_15px_45px_rgba(0,200,255,0.3)] border-brand-primary' : 'text-white/30 hover:text-white/70 hover:bg-white/5'}`}
                    >
                        <Shield size={16} className={mode === 'coach' ? 'animate-pulse' : ''} /> COACHES
                    </button>
               </div>
            
               <div className="flex items-center gap-5 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-initial bg-white/[0.04] border border-white/[0.1] backdrop-blur-3xl px-10 py-6 rounded-3xl flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group min-w-[200px] hover:border-brand-accent/30 transition-colors duration-500">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 relative z-10 italic">{mode === 'player' ? 'REGISTRATION ID' : 'SYSTEM STATUS'}</span>
                        <span className="text-3xl font-black tracking-tighter text-brand-accent font-mono relative z-10 whitespace-nowrap drop-shadow-[0_0_10px_rgba(195,246,41,0.4)]">
                            {mode === 'player' ? nextId : 'READY'}
                        </span>
                        <div className="absolute h-[1px] w-full bg-brand-accent/30 top-0 left-0 animate-scan" />
                    </div>
                    <button 
                        onClick={() => setShowConfigModal(true)}
                        className="p-6 bg-white/[0.04] border border-white/[0.1] hover:border-brand-accent/50 rounded-2xl text-white/30 hover:text-brand-accent transition-all duration-500 group shadow-2xl"
                        title="Academy Configuration"
                    >
                        <Settings size={28} className="group-hover:rotate-180 transition-transform duration-700" />
                    </button>
               </div>
          </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {mode === 'player' ? (
            <form onSubmit={handlePlayerSubmit} className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Panel: Profile Capture & Identity */}
                    <div className="lg:col-span-4 space-y-10">
                        <div className="glass-card p-10 flex flex-col items-center bg-[#070b42]/40 relative overflow-hidden group/profile">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent" />
                            
                            {/* Profile Image with Digital Scan Effect */}
                            <div className="relative mb-12">
                                <div className={`
                                    w-64 h-80 rounded-[2.5rem] bg-black/40 border-2 border-dashed flex items-center justify-center overflow-hidden transition-all duration-1000 relative
                                    ${previewUrl ? 'border-brand-accent/40 shadow-[0_0_60px_rgba(195,246,41,0.15)] scale-[1.02]' : 'border-white/10 group-hover/profile:border-brand-accent/30'}
                                `}>
                                    {previewUrl ? (
                                        <>
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                            {/* Digital Scan Animation Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-accent/10 to-transparent animate-scan h-20 w-full opacity-60" />
                                            <div className="absolute inset-0 ring-4 ring-brand-accent/10 ring-inset" />
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-8 text-white/5 group-hover/profile:text-brand-accent/20 transition-all duration-700">
                                            <div className="p-10 rounded-full bg-white/[0.02] border border-white/5 shadow-inner">
                                                <Camera size={56} strokeWidth={1} />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-[11px] font-black uppercase tracking-[0.5em] italic block">Identity Capture</span>
                                                <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] mt-2 block">Required for authentication</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <label className="absolute -bottom-6 -right-4 cursor-pointer bg-brand-accent text-brand-950 p-6 rounded-[1.5rem] shadow-[0_15px_40px_rgba(195,246,41,0.4)] hover:scale-110 active:scale-95 transition-all z-30 group/btn">
                                    <Upload size={22} className="group-hover/btn:rotate-12 transition-transform" />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </label>

                                {/* Decorative HUD corner */}
                                <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-brand-accent/20 rounded-tl-3xl group-hover/profile:border-brand-accent/60 transition-colors duration-700" />
                                <div className="absolute -top-4 -right-4 w-12 h-12 border-t-2 border-r-2 border-brand-accent/20 rounded-tr-3xl group-hover/profile:border-brand-accent/60 transition-colors duration-700" />
                            </div>

                            {/* Core Identity Fields */}
                            <div className="w-full space-y-8">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Full Identifier</label>
                                        <div className="h-[1px] flex-1 mx-4 bg-white/5" />
                                        <User size={12} className="text-brand-accent/40" />
                                    </div>
                                    <input type="text" className={getInputClass('fullName')} value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Athlete full name..." />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Temporal Data (DOB)</label>
                                        <div className="h-[1px] flex-1 mx-4 bg-white/5" />
                                        <Calendar size={12} className="text-brand-accent/40" />
                                    </div>
                                    <input type="date" className={getInputClass('dateOfBirth')} value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* Position Selection */}
                        <div className="glass-card p-10 bg-[#070b42]/40 relative overflow-hidden group/tactical">
                             <div className="flex items-center gap-5 border-b border-white/5 pb-8 mb-8">
                                <div className="p-4 bg-brand-accent/10 rounded-2xl group-hover/tactical:bg-brand-accent/20 transition-colors">
                                    <Shield size={20} className="text-brand-accent" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white italic">Tactical <span className="text-brand-accent">Position</span></h3>
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Operational field role</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {['Forward', 'Midfielder', 'Defender', 'Goalkeeper'].map(pos => (
                                    <button key={pos} type="button" onClick={() => setFormData({...formData, position: pos as any})}
                                        className={`py-5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all duration-700 italic relative overflow-hidden group/pos
                                            ${formData.position === pos 
                                                ? 'bg-brand-accent border-brand-accent text-brand-950 shadow-[0_15px_30px_rgba(195,246,41,0.25)]' 
                                                : 'bg-white/[0.02] border-white/5 text-white/30 hover:text-white/70 hover:bg-white/5 hover:border-white/10'}`}
                                    >
                                        {formData.position === pos && (
                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-950/20" />
                                        )}
                                        {pos}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Logistics & Emergency */}
                    <div className="lg:col-span-8 space-y-10">
                        {/* Operational Deployment Section */}
                        <div className="glass-card p-12 bg-[#070b42]/40 relative overflow-hidden group/deployment">
                            <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover/deployment:opacity-[0.04] transition-opacity duration-1000">
                                <MapPin size={180} className="text-white" />
                            </div>
                            
                            <div className="flex items-center gap-6 border-b border-white/5 pb-8 mb-10">
                                <div className="p-5 bg-brand-primary/10 rounded-2xl group-hover/deployment:bg-brand-primary/20 transition-colors">
                                    <Layers size={22} className="text-brand-primary" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-[0.3em] text-white italic">Deployment <span className="premium-gradient-text">Logistics</span></h3>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-1 italic">Academy Venue & Batch Logic</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-1">
                                        <MapPin size={12} className="text-brand-primary/60" />
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Strategic Sector (Venue)</label>
                                    </div>
                                    <div className="relative group/sel">
                                        <select className={getSelectClass('venue')} value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})}>
                                            <option value="" className="bg-[#070b42]">Select Training Sector...</option>
                                            {venues.map(v => <option key={v.id} value={v.name} className="bg-[#070b42]">{v.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 group-hover/sel:text-brand-accent pointer-events-none transition-colors" size={18} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-1">
                                        <Plus size={12} className="text-brand-primary/60" />
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Operation Batch</label>
                                    </div>
                                    <div className="relative group/sel">
                                        <select className={getSelectClass('batch')} value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})}>
                                            <option value="" className="bg-[#070b42]">Assign Protocol Channel...</option>
                                            {batches.map(b => <option key={b.id} value={b.name} className="bg-[#070b42]">{b.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 group-hover/sel:text-brand-accent pointer-events-none transition-colors" size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Emergency Relay Section */}
                        <div className="glass-card p-12 bg-[#070b42]/40 relative overflow-hidden group/emergency">
                           <div className="absolute -bottom-10 -right-10 p-12 opacity-[0.015] pointer-events-none group-hover/emergency:opacity-[0.03] transition-opacity duration-1000 rotate-12">
                                <Phone size={240} className="text-white" />
                            </div>

                            <div className="flex items-center gap-6 border-b border-white/5 pb-8 mb-10">
                                <div className="p-5 bg-orange-500/10 rounded-2xl group-hover/emergency:bg-orange-500/20 transition-colors">
                                    <AlertCircle size={22} className="text-orange-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-[0.3em] text-white italic">Emergency <span className="text-orange-400">Relay</span></h3>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-1 italic">Guardian Communication Matrix</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-1">
                                        <User size={12} className="text-orange-400/60" />
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Guardian Entity</label>
                                    </div>
                                    <input type="text" className={getInputClass('parentName')} value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} placeholder="Full legal name..." />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-1">
                                        <Phone size={12} className="text-orange-400/60" />
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Neural Uplink (Contact)</label>
                                    </div>
                                    <input type="text" className={getInputClass('contactNumber')} value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} placeholder="+91 XXXXX XXXXX" />
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                    <div className="flex items-center gap-3 px-1">
                                        <MapPin size={12} className="text-orange-400/60" />
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Base Coordinates (Address)</label>
                                    </div>
                                    <input type="text" className={getInputClass('address')} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Location details..." />
                                </div>
                            </div>
                        </div>

                        {/* Action Layer */}
                        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-12">
                            <div className="flex items-center gap-6 group/status">
                                <div className="w-16 h-16 rounded-[1.25rem] bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20 group-hover/status:scale-110 transition-transform duration-700">
                                    <Zap size={24} className="text-brand-accent animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-white italic uppercase tracking-[0.3em]">Protocol Verified</p>
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1 italic">Profile synchronization ready</p>
                                </div>
                            </div>
                            
                            <button type="submit" disabled={status === 'submitting'}
                                className="w-full md:w-auto group bg-brand-accent text-brand-950 font-black py-8 px-20 rounded-[2rem] shadow-[0_25px_60px_rgba(195,246,41,0.3)] hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-5 uppercase tracking-[0.5em] text-[12px] italic relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                <span className="relative z-10 flex items-center gap-5">
                                    {status === 'submitting' ? <RefreshCw size={24} className="animate-spin" /> : <UserPlus size={24} className="group-hover:rotate-12 transition-transform" />}
                                    {status === 'submitting' ? 'SYNCHRONIZING...' : 'ENROLL ATHLETE'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        ) : (
            <form onSubmit={handleCoachSubmit} className="space-y-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Panel: Coach Identity */}
                    <div className="lg:col-span-4 space-y-10">
                        <div className="glass-card p-10 flex flex-col items-center bg-[#070b42]/40 relative overflow-hidden group/profile">
                            <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent/30" />
                            
                            {/* Profile Capture Area */}
                            <div className="relative mb-12">
                                <div className={`w-64 h-72 rounded-[2.5rem] bg-black/40 border-2 border-dashed transition-all duration-700 relative overflow-hidden flex items-center justify-center
                                    ${coachPreviewUrl ? 'border-brand-accent/40 shadow-[0_0_50px_rgba(195,246,41,0.15)] scale-[1.02]' : 'border-white/10 group-hover/profile:border-brand-accent/30'}`}>
                                    
                                    {coachPreviewUrl ? (
                                        <>
                                            <img src={coachPreviewUrl} alt="Coach Preview" className="w-full h-full object-cover" />
                                            {/* Digital Scan Animation Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-accent/10 to-transparent animate-scan h-20 w-full opacity-60" />
                                            <div className="absolute inset-0 ring-4 ring-brand-accent/10 ring-inset" />
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-8 text-white/5 group-hover/profile:text-brand-accent/20 transition-all duration-700">
                                            <div className="p-10 rounded-full bg-white/[0.02] border border-white/5 shadow-inner">
                                                <Camera size={56} strokeWidth={1} />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-[11px] font-black uppercase tracking-[0.5em] italic block">Personnel ID Capture</span>
                                                <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] mt-2 block">Required for command access</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <label className="absolute -bottom-6 -right-4 cursor-pointer bg-brand-accent text-brand-950 p-6 rounded-[1.5rem] shadow-[0_15px_40px_rgba(195,246,41,0.4)] hover:scale-110 active:scale-95 transition-all z-30 group/btn">
                                    <Upload size={22} className="group-hover/btn:rotate-12 transition-transform" />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleCoachFileChange} />
                                </label>

                                {/* Decorative HUD corners */}
                                <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-brand-accent/20 rounded-tl-3xl group-hover/profile:border-brand-accent/60 transition-colors duration-700" />
                                <div className="absolute -top-4 -right-4 w-12 h-12 border-t-2 border-r-2 border-brand-accent/20 rounded-tr-3xl group-hover/profile:border-brand-accent/60 transition-colors duration-700" />
                            </div>

                            {/* Core Identity Fields */}
                            <div className="w-full space-y-8">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Personnel Identifier</label>
                                        <div className="h-[1px] flex-1 mx-4 bg-white/5" />
                                        <User size={12} className="text-brand-accent/40" />
                                    </div>
                                    <input type="text" className={getInputClass('fullName')} value={coachForm.fullName} onChange={e => setCoachForm({...coachForm, fullName: e.target.value})} placeholder="Official personnel name..." />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Command Username</label>
                                        <div className="h-[1px] flex-1 mx-4 bg-white/5" />
                                        <Shield size={12} className="text-brand-accent/40" />
                                    </div>
                                    <input type="text" className={getInputClass('username')} value={coachForm.username} onChange={e => setCoachForm({...coachForm, username: e.target.value})} placeholder="Unique access key..." />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Employee Token (ID)</label>
                                        <div className="h-[1px] flex-1 mx-4 bg-white/5" />
                                        <Activity size={12} className="text-brand-accent/40" />
                                    </div>
                                    <input type="text" className={getInputClass('employeeNumber')} value={coachForm.employeeNumber} onChange={e => setCoachForm({...coachForm, employeeNumber: e.target.value})} placeholder="EMP-XXXXX" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Coach Deployment */}
                    <div className="lg:col-span-8 space-y-10">
                        <div className="grid grid-cols-1 gap-10">
                            {/* Mission Assignments */}
                            <div className="glass-card p-12 bg-[#070b42]/40 relative overflow-hidden group/jurisdiction">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover/jurisdiction:opacity-[0.04] transition-opacity duration-1000">
                                    <MapPin size={180} className="text-white" />
                                </div>
                                
                                <div className="flex items-center gap-6 border-b border-white/5 pb-8 mb-10">
                                    <div className="p-5 bg-brand-primary/10 rounded-2xl group-hover/jurisdiction:bg-brand-primary/20 transition-colors">
                                        <Map size={22} className="text-brand-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black uppercase tracking-[0.3em] text-white italic">Operational <span className="premium-gradient-text">Jurisdiction</span></h3>
                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-1 italic">Assigned Training Sectors</p>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="flex items-center gap-3 px-1">
                                        <Layers size={12} className="text-brand-primary/60" />
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Strategic Sector Authorization</label>
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        {venues.map(v => (
                                            <button key={v.id} type="button" onClick={() => toggleCoachAssignment('venue', v.name)} 
                                                className={`px-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] border transition-all duration-700 italic relative overflow-hidden group/venue
                                                ${coachForm.assignedVenues.includes(v.name) 
                                                    ? 'bg-brand-primary text-brand-950 border-brand-primary shadow-[0_15px_30px_rgba(64,213,255,0.25)]' 
                                                    : 'bg-white/[0.02] border-white/5 text-white/30 hover:text-white/70 hover:bg-white/5 hover:border-white/10'}`}
                                            >
                                                {v.name}
                                                {coachForm.assignedVenues.includes(v.name) && (
                                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-950/20" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Communication Matrix */}
                            <div className="glass-card p-12 bg-[#070b42]/40 relative overflow-hidden group/matrix">
                                <div className="absolute -bottom-10 -right-10 p-12 opacity-[0.015] pointer-events-none group-hover/matrix:opacity-[0.03] transition-opacity duration-1000">
                                    <Key size={240} className="text-white" />
                                </div>

                                <div className="flex items-center gap-6 border-b border-white/5 pb-8 mb-10">
                                    <div className="p-5 bg-brand-accent/10 rounded-2xl group-hover/matrix:bg-brand-accent/20 transition-colors">
                                        <Shield size={22} className="text-brand-accent" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black uppercase tracking-[0.3em] text-white italic">Security <span className="text-brand-accent">& Contact</span> Matrix</h3>
                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-1 italic">Network Uplink & Data Encryption</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-1">
                                            <Phone size={12} className="text-brand-accent/60" />
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Mobile Uplink</label>
                                        </div>
                                        <input type="tel" className={getInputClass('contactNumber')} value={coachForm.contactNumber} onChange={e => setCoachForm({...coachForm, contactNumber: e.target.value})} placeholder="+91 XXXXX XXXXX" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-1">
                                            <Radio size={12} className="text-brand-accent/60" />
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Digital Mailbox (Email)</label>
                                        </div>
                                        <input type="email" className={getInputClass('email')} value={coachForm.email} onChange={e => setCoachForm({...coachForm, email: e.target.value})} placeholder="personnel@icarus.com" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-1">
                                            <Key size={12} className="text-brand-accent/60" />
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Access Cipher (Password)</label>
                                        </div>
                                        <input type="password" className={getInputClass('password')} value={coachForm.password} onChange={e => setCoachForm({...coachForm, password: e.target.value})} placeholder="••••••••" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-1">
                                            <Calendar size={12} className="text-brand-accent/60" />
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Temporal Data (DOB)</label>
                                        </div>
                                        <input type="date" className={getInputClass('dateOfBirth')} value={coachForm.dateOfBirth} onChange={e => setCoachForm({...coachForm, dateOfBirth: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2 space-y-4">
                                        <div className="flex items-center gap-3 px-1">
                                            <MapPin size={12} className="text-brand-accent/60" />
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Base Coordinates (Address)</label>
                                        </div>
                                        <input type="text" className={getInputClass('address')} value={coachForm.address} onChange={e => setCoachForm({...coachForm, address: e.target.value})} placeholder="Location details..." />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Layer */}
                <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="flex items-center gap-6 group/status">
                        <div className="w-16 h-16 rounded-[1.25rem] bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 group-hover/status:scale-110 transition-transform duration-700">
                            <UserCheck size={24} className="text-brand-primary animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-white italic uppercase tracking-[0.3em]">Personnel Authorized</p>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1 italic">Security protocols initialized</p>
                        </div>
                    </div>
                    
                    <button type="submit" disabled={status === 'submitting'}
                        className="w-full md:w-auto group bg-brand-accent text-brand-950 font-black py-8 px-20 rounded-[2rem] shadow-[0_25px_60px_rgba(195,246,41,0.3)] hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-5 uppercase tracking-[0.5em] text-[12px] italic relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        <span className="relative z-10 flex items-center gap-5">
                            {status === 'submitting' ? <RefreshCw size={24} className="animate-spin" /> : <Save size={24} className="group-hover:rotate-12 transition-transform" />}
                            {status === 'submitting' ? 'ONBOARDING...' : 'REGISTER PERSONNEL'}
                        </span>
                    </button>
                </div>
            </form>
        )}
      </div>

      {/* Settings Modal - Management Interface */}
      {showConfigModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 animate-in fade-in duration-500">
              <div className="absolute inset-0 bg-brand-bg/95 backdrop-blur-2xl" onClick={() => setShowConfigModal(false)} />
              
              <div className="glass-card w-full max-w-2xl rounded-[3rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden animate-in zoom-in-95 duration-700 bg-brand-950/80 decoration-brand-accent/30">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-accent shadow-[0_0_20px_rgba(195,246,41,0.5)]" />
                  
                  <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex items-center gap-5">
                       <div className="p-5 bg-brand-accent/10 rounded-[1.5rem] border border-brand-accent/20">
                          <Command size={24} className="text-brand-accent animate-pulse" />
                       </div>
                       <div>
                            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">CONFIG <span className="text-brand-primary">MATRIX</span></h3>
                            <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.4em] italic mt-1">Operational sectors & batch logic</p>
                        </div>
                    </div>
                    <button onClick={() => setShowConfigModal(false)} className="p-5 bg-white/5 rounded-2xl text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/10 hover:border-white/20"><X size={24} /></button>
                  </div>

                  <div className="p-8">
                      <div className="flex bg-black/40 p-2 rounded-[1.5rem] border border-white/5 gap-2 relative">
                        {['venues', 'batches'].map(t => (
                            <button key={t} onClick={() => setConfigTab(t as any)} 
                                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] italic transition-all duration-700 relative z-10
                                ${configTab === t ? 'text-brand-950' : 'text-white/30 hover:text-white'}`}>
                                {configTab === t && <div className="absolute inset-0 bg-brand-accent rounded-xl shadow-[0_10px_25px_rgba(195,246,41,0.3)] -z-10" />}
                                {t === 'venues' ? 'STRATEGIC SECTORS' : 'PROTOCOL CHANNELS'}
                            </button>
                        ))}
                      </div>
                  </div>

                  <div className="px-10 pb-12 space-y-10">
                    <div className="flex gap-4 group/input">
                        <div className="flex-1 relative">
                            <input type="text" className={getInputClass('newItem')} value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Personnel identifier..." />
                        </div>
                        <button onClick={handleAddItem} className="bg-brand-primary text-brand-950 px-12 rounded-2xl font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all text-[11px] italic shadow-[0_15px_35px_rgba(64,213,255,0.25)]">ADD ENTRY</button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 max-h-[350px] overflow-y-auto custom-scrollbar-tactical pr-2">
                        {(configTab === 'venues' ? venues : batches).map(item => (
                            <div key={item.id} className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 flex justify-between items-center group/item hover:bg-white/[0.04] hover:border-brand-accent/20 transition-all duration-500">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-brand-accent group-hover/item:shadow-[0_0_10px_#c3f629] transition-all" />
                                    <span className="font-black text-white/80 uppercase italic tracking-[0.1em] text-[12px]">{item.name}</span>
                                </div>
                                <button onClick={() => handleSecureDelete(configTab === 'venues' ? 'venue' : 'batch', item.id, item.name)} 
                                    className="p-3 text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all group-hover/item:opacity-100 opacity-0 transform translate-x-4 group-hover/item:translate-x-0">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        {(configTab === 'venues' ? venues : batches).length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center opacity-20 gap-4">
                                <Zap size={40} strokeWidth={1} />
                                <p className="text-[10px] font-black uppercase tracking-widest italic text-center">No active credentials detected in the matrix</p>
                            </div>
                        )}
                    </div>
                  </div>
              </div>
          </div>
      )}

      <ConfirmModal 
        isOpen={deleteModalOpen} 
        title={`DECOMMISSION ${itemToDelete?.type?.toUpperCase()}`} 
        message={`Are you sure you want to permanently delete "${itemToDelete?.name}"? All associated metadata will be purged from the neural network.`} 
        onConfirm={confirmDelete} 
        onCancel={() => {setDeleteModalOpen(false); setItemToDelete(null);}} 
        requireTypeToConfirm="delete" 
      />
      </div>
    </div>
  );
};

export default PlayerRegistration;
