import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Save, X, User, Phone, Shield, Camera, Check, RefreshCw,
  AlertCircle, Calendar, Briefcase, Trash2, MapPin, Settings, Map,
  Layers, Plus, Edit2, Key, UserCheck, FileText, Zap, UserPlus,
  Command, Activity, Radio, ChevronDown, ChevronRight, Award
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch } from '../types';
import { ConfirmModal } from './ConfirmModal';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  accent: string;
  subtitle: string;
  accentClass?: string;
}> = ({ icon, title, accent, subtitle, accentClass = 'text-brand-accent' }) => (
  <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/[0.1]">
    <div className="p-3.5 rounded-2xl bg-white/[0.1] border border-white/[0.1] shadow-inner">
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-black text-white uppercase tracking-widest italic">
        {title} <span className={accentClass}>{accent}</span>
      </h3>
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mt-1 italic">{subtitle}</p>
    </div>
  </div>
);

const FieldLabel: React.FC<{ icon?: React.ReactNode; label: string; required?: boolean }> = ({
  icon, label, required
}) => (
  <div className="flex items-center gap-2 mb-2.5">
    {icon && <span className="text-white/30">{icon}</span>}
    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">
      {label}
      {required && <span className="text-brand-accent ml-1.5">*</span>}
    </label>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Component                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

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
  const [venues, setVenues] = useState<Venue[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configTab, setConfigTab] = useState<'venues' | 'batches'>('venues');
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<{ id: string; name: string } | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'player' | 'venue' | 'batch'; id: string; name: string
  } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    loadAcademyConfig();
    const handleDataUpdate = () => { loadAcademyConfig(); refreshData(); };
    window.addEventListener('academy_data_update', handleDataUpdate);
    return () => window.removeEventListener('academy_data_update', handleDataUpdate);
  }, []);

  const loadAcademyConfig = () => {
    setVenues(StorageService.getVenues());
    setBatches(StorageService.getBatches());
  };

  const refreshData = () => {
    const allPlayers = StorageService.getPlayers();
    setPlayers(allPlayers);
    updateNextIdPreview(allPlayers);
    const v = StorageService.getVenues();
    const b = StorageService.getBatches();
    setVenues(v);
    setBatches(b);
    setFormData(prev => ({
      ...prev,
      venue: prev.venue || (v.length > 0 ? v[0].name : ''),
      batch: prev.batch || (b.length > 0 ? b[0].name : '')
    }));
  };

  const updateNextIdPreview = (currentPlayers: Player[]) => {
    if (currentPlayers.length === 0) { setNextId('ICR-0001'); return; }
    const ids = currentPlayers
      .map(p => { const m = p.memberId?.match(/ICR-(\d+)/); return m ? parseInt(m[1], 10) : 0; })
      .filter(id => !isNaN(id));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    setNextId(`ICR-${(maxId + 1).toString().padStart(4, '0')}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleCoachFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoachPreviewUrl(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onloadend = () => setCoachForm(prev => ({ ...prev, photoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const validatePlayer = () => {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim()) e.fullName = 'Required';
    if (!formData.dateOfBirth) e.dateOfBirth = 'Required';
    if (!formData.parentName.trim()) e.parentName = 'Required';
    if (!formData.contactNumber.trim()) e.contactNumber = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateCoach = () => {
    const e: Record<string, string> = {};
    if (!coachForm.fullName.trim()) e.fullName = 'Required';
    if (!coachForm.username.trim()) e.username = 'Required';
    if (!coachForm.employeeNumber.trim()) e.employeeNumber = 'Required';
    if (!coachForm.password.trim()) e.password = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePlayer()) { setStatus('error'); setStatusMsg('Please fill in all required fields.'); setTimeout(() => setStatus('idle'), 3000); return; }
    setStatus('submitting');
    setTimeout(async () => {
      try {
        await StorageService.addPlayer({
          ...formData,
          photoUrl: formData.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName)}&background=0ea5e9&color=fff`
        });
        window.dispatchEvent(new CustomEvent('academy_data_update'));
        setStatus('success');
        setStatusMsg('Athlete registered successfully.');
        setFormData({ fullName: '', dateOfBirth: '', parentName: '', contactNumber: '', address: '', position: 'POSITION', photoUrl: '', venue: venues.length > 0 ? venues[0].name : '', batch: batches.length > 0 ? batches[0].name : '' });
        setPreviewUrl(null);
        refreshData();
        setTimeout(() => setStatus('idle'), 4000);
      } catch {
        setStatus('error');
        setStatusMsg('Failed to save profile. Please try again.');
      }
    }, 800);
  };

  const handleCoachSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCoach()) { setStatus('error'); setStatusMsg('Please fill in all required fields.'); setTimeout(() => setStatus('idle'), 3000); return; }
    setStatus('submitting');
    setTimeout(async () => {
      try {
        await StorageService.addUser({
          username: coachForm.username, fullName: coachForm.fullName, password: coachForm.password,
          role: 'coach', photoUrl: coachForm.photoUrl, employeeNumber: coachForm.employeeNumber,
          contactNumber: coachForm.contactNumber, email: coachForm.email, dateOfBirth: coachForm.dateOfBirth,
          address: coachForm.address, assignedVenues: coachForm.assignedVenues, assignedBatches: coachForm.assignedBatches
        });
        window.dispatchEvent(new CustomEvent('academy_data_update'));
        setStatus('success');
        setStatusMsg('Coach account created successfully.');
        setCoachForm({ username: '', fullName: '', contactNumber: '', email: '', dateOfBirth: '', address: '', password: '', employeeNumber: '', photoUrl: '', role: 'coach', assignedVenues: [], assignedBatches: [] });
        setCoachPreviewUrl(null);
        refreshData();
        setTimeout(() => setStatus('idle'), 4000);
      } catch (err: any) {
        setStatus('error');
        setStatusMsg(err.message || 'Failed to create account.');
      }
    }, 800);
  };

  const handleSecureDelete = (type: 'player' | 'venue' | 'batch', id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'player') await StorageService.deletePlayer(itemToDelete.id);
      else if (itemToDelete.type === 'venue') await StorageService.deleteVenue(itemToDelete.id);
      else if (itemToDelete.type === 'batch') await StorageService.deleteBatch(itemToDelete.id);
      refreshData(); setDeleteModalOpen(false); setItemToDelete(null);
    } catch { alert('An error occurred.'); }
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    if (configTab === 'venues') StorageService.addVenue(newItemName.trim());
    else StorageService.addBatch(newItemName.trim());
    setNewItemName(''); refreshData();
  };

  const handleUpdateItem = () => {
    if (!editingItem || !newItemName.trim()) return;
    if (configTab === 'venues') StorageService.updateVenue(editingItem.id, newItemName.trim());
    else StorageService.updateBatch(editingItem.id, newItemName.trim());
    setEditingItem(null); setNewItemName(''); refreshData();
  };

  const toggleCoachAssignment = (type: 'venue' | 'batch', value: string) => {
    if (type === 'venue') {
      setCoachForm(prev => ({
        ...prev, assignedVenues: prev.assignedVenues.includes(value)
          ? prev.assignedVenues.filter(v => v !== value)
          : [...prev.assignedVenues, value]
      }));
    } else {
      setCoachForm(prev => ({
        ...prev, assignedBatches: prev.assignedBatches.includes(value)
          ? prev.assignedBatches.filter(b => b !== value)
          : [...prev.assignedBatches, value]
      }));
    }
  };

  /* ── Styled Input Helpers ── */
  const inputBase = 'w-full rounded-xl px-4 py-3.5 text-sm font-medium text-white outline-none transition-all duration-300 border';
  const inputNormal = `${inputBase} bg-white/[0.05] border-white/[0.08] placeholder:text-white/20 focus:border-brand-accent/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-brand-accent/10`;
  const inputError = `${inputBase} bg-red-500/10 border-red-500/40 placeholder:text-red-300/30 text-red-200 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/10`;
  const selectBase = `${inputBase} bg-white/[0.05] border-white/[0.08] appearance-none cursor-pointer hover:bg-white/[0.08] focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10`;

  const inp = (field: string) => errors[field] ? inputError : inputNormal;
  const sel = (field: string) => errors[field] ? `${inputError} appearance-none cursor-pointer` : selectBase;

  /* ── Positions ── */
  const positions = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];

  /* ─────────────────────────────────────────────────────────────────────── */
  /*  Render                                                                  */
  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-accent/30 selection:text-brand-accent">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-10 pb-32 space-y-8">

        {/* ─── Page Header ────────────────────────────────────────────────── */}
        <div className="relative rounded-[3rem] overflow-hidden border border-brand-secondary/10 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #0D1B8A 0%, #1e3a8a 40%, #070b42 100%)' }}>
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)' }} />
          
          {/* Dynamics scan line */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-brand-primary/5 to-transparent h-20 -translate-y-full animate-scan pointer-events-none" />

          {/* Glow accent top-right */}
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #00C8FF 0%, transparent 70%)' }} />
          <div className="absolute -bottom-20 left-20 w-60 h-60 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #C3F629 0%, transparent 70%)' }} />

          <div className="relative z-10 px-12 py-16 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
            <div className="space-y-6">
              {/* System badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-brand-accent/10 border border-brand-accent/20 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse shadow-[0_0_12px_#C3F629]" />
                <span className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] italic">Tactical System Ready</span>
              </div>

              <div className="space-y-1">
                <h1 className="text-6xl sm:text-8xl font-black text-white uppercase italic tracking-tighter leading-[0.85]">
                  Registration
                </h1>
                <h1 className="text-6xl sm:text-8xl font-black uppercase italic tracking-tighter leading-[0.85] flex items-center gap-4"
                  style={{ background: 'linear-gradient(90deg, #00C8FF, #C3F629)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Command
                  <Command size={48} className="text-white/20 -rotate-12" />
                </h1>
              </div>

              <p className="text-[12px] font-black text-white/40 uppercase tracking-[0.5em] italic">
                Elite Athlete & Coach Onboarding Portal
              </p>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Mode switcher */}
              <div className="flex p-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl gap-1">
                {([['player', User, 'Athletes'], ['coach', Shield, 'Coaches']] as const).map(([m, Icon, label]) => (
                  <button key={m} onClick={() => setMode(m as any)}
                    className={`flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-500
                      ${mode === m
                        ? m === 'player'
                          ? 'bg-brand-accent text-brand-950 shadow-[0_8px_24px_rgba(195,246,41,0.35)]'
                          : 'bg-brand-primary text-brand-950 shadow-[0_8px_24px_rgba(0,200,255,0.35)]'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}`}>
                    <Icon size={13} className={mode === m ? '' : ''} />
                    {label}
                  </button>
                ))}
              </div>

              {/* ID Badge */}
              {mode === 'player' && (
                <div className="px-6 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl text-center min-w-[130px]">
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-0.5">Next ID</p>
                  <p className="text-xl font-black text-brand-accent font-mono tracking-tight">{nextId}</p>
                </div>
              )}

              {/* Settings */}
              <button onClick={() => setShowConfigModal(true)}
                className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-brand-accent hover:border-brand-accent/30 transition-all duration-300 group">
                <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Status Banner ───────────────────────────────────────────────── */}
        {status !== 'idle' && (
          <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-500 ${
            status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
            status === 'error'   ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                   'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'
          }`}>
            {status === 'success' && <Check size={18} />}
            {status === 'error'   && <AlertCircle size={18} />}
            {status === 'submitting' && <RefreshCw size={18} className="animate-spin" />}
            {statusMsg || (status === 'submitting' ? 'Processing…' : '')}
          </div>
        )}

        {/* ─── Forms ─────────────────────────────────────────────────────── */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          {mode === 'player' ? (
            /* ══════════════════ ATHLETE FORM ══════════════════ */
            <form onSubmit={handlePlayerSubmit} className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                {/* LEFT — Profile & Position */}
                <div className="xl:col-span-4 space-y-6">

                  {/* Profile Photo Card */}
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                    <SectionHeader
                      icon={<Camera size={16} className="text-brand-accent" />}
                      title="Athlete" accent="Photo"
                      subtitle="Profile identity capture"
                    />

                    {/* Photo upload area */}
                    <div className="flex flex-col items-center">
                      <div className="relative group/photo mb-6">
                        <div className={`w-44 h-52 rounded-2xl overflow-hidden border-2 border-dashed transition-all duration-500 flex items-center justify-center
                          ${previewUrl ? 'border-brand-accent/40 shadow-[0_0_40px_rgba(195,246,41,0.12)]' : 'border-white/10 group-hover/photo:border-white/20'}`}>
                          {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-3 text-white/20 group-hover/photo:text-white/30 transition-colors">
                              <Camera size={40} strokeWidth={1.5} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Upload Photo</span>
                            </div>
                          )}
                        </div>
                        <label className="absolute -bottom-4 -right-4 cursor-pointer bg-brand-accent text-brand-950 p-3.5 rounded-xl shadow-[0_8px_24px_rgba(195,246,41,0.4)] hover:scale-110 active:scale-95 transition-all z-10">
                          <Upload size={16} />
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                      </div>

                      {previewUrl && (
                        <button type="button" onClick={() => { setPreviewUrl(null); setFormData(p => ({ ...p, photoUrl: '' })); }}
                          className="mt-2 text-[10px] font-bold text-white/30 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-1.5">
                          <X size={12} /> Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Basic Identity */}
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                    <SectionHeader
                      icon={<User size={16} className="text-brand-primary" />}
                      title="Personal" accent="Information"
                      subtitle="Core identity details"
                      accentClass="text-brand-primary"
                    />
                    <div className="space-y-5">
                      <div>
                        <FieldLabel icon={<User size={11} />} label="Full Name" required />
                        <input type="text" className={inp('fullName')} value={formData.fullName}
                          onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="Athlete's full name" />
                        {errors.fullName && <p className="mt-1.5 text-[10px] text-red-400 font-bold">{errors.fullName}</p>}
                      </div>
                      <div>
                        <FieldLabel icon={<Calendar size={11} />} label="Date of Birth" required />
                        <input type="date" className={inp('dateOfBirth')} value={formData.dateOfBirth}
                          onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                        {errors.dateOfBirth && <p className="mt-1.5 text-[10px] text-red-400 font-bold">{errors.dateOfBirth}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Position */}
                  <div className="rounded-2xl border               {/* Logistics & Primary Contact */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* Deployment Group */}
                <div className="glass-card p-10 bg-white/[0.01]">
                  <SectionHeader
                    icon={<MapPin size={28} className="text-brand-accent" />}
                    title="Academy"
                    accent="Deployment"
                    subtitle="Venue & Cluster Assignment"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="group/input">
                      <FieldLabel icon={<MapPin size={12} />} label="Assigned Venue" required />
                      <div className="relative">
                        <select
                          className={sel('venue')}
                          value={formData.venue}
                          onChange={e => setFormData({ ...formData, venue: e.target.value })}
                        >
                          <option value="" className="bg-[#0D1B8A]">Select Venue</option>
                          {venues.map(v => <option key={v.id} value={v.name} className="bg-[#0D1B8A]">{v.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                      </div>
                    </div>

                    <div className="group/input">
                      <FieldLabel icon={<Layers size={12} />} label="Assigned Batch" required />
                      <div className="relative">
                        <select
                          className={sel('batch')}
                          value={formData.batch}
                          onChange={e => setFormData({ ...formData, batch: e.target.value })}
                        >
                          <option value="" className="bg-[#0D1B8A]">Select Batch</option>
                          {batches.map(b => <option key={b.id} value={b.name} className="bg-[#0D1B8A]">{b.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guardian Details */}
                <div className="glass-card p-10">
                  <SectionHeader
                    icon={<Phone size={28} className="text-orange-400" />}
                    title="Guardian"
                    accent="Protocol"
                    subtitle="Emergency Contact Structure"
                    accentClass="text-orange-400"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="group/input">
                      <FieldLabel icon={<User size={12} />} label="Primary Guardian" required />
                      <input
                        type="text"
                        className={inp('parentName')}
                        value={formData.parentName}
                        onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                        placeholder="Parent Name"
                      />
                      {errors.parentName && <p className="mt-2 text-[10px] text-red-400 font-black italic uppercase tracking-wider">{errors.parentName}</p>}
                    </div>

                    <div className="group/input">
                      <FieldLabel icon={<Phone size={12} />} label="Contact Number" required />
                      <input
                        type="tel"
                        className={inp('contactNumber')}
                        value={formData.contactNumber}
                        onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                        placeholder="+91"
                      />
                      {errors.contactNumber && <p className="mt-2 text-[10px] text-red-400 font-black italic uppercase tracking-wider">{errors.contactNumber}</p>}
                    </div>

                    <div className="group/input col-span-1 md:col-span-2">
                      <FieldLabel icon={<MapPin size={12} />} label="Residential Residence" />
                      <input
                        type="text"
                        className={inp('address')}
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Full Address"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="glass-card p-10 flex flex-col sm:flex-row items-center justify-between gap-8 border-t-2 border-t-brand-accent/20">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                    <Check size={24} className="text-brand-accent" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase italic tracking-widest">Enrolment Phase Ready</h4>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mt-1">Status: Operational</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full sm:w-auto min-w-[300px] h-20 bg-brand-accent text-brand-950 font-black uppercase italic tracking-[0.25em] text-sm rounded-[1.5rem] shadow-[0_20px_50px_rgba(195,246,41,0.3)] hover:shadow-[0_25px_60px_rgba(195,246,41,0.5)] hover:scale-[1.02] active:scale-95 transition-all duration-500 flex items-center justify-center gap-4 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                  {status === 'submitting' ? (
                    <><RefreshCw size={24} className="animate-spin" /> Finalizing Protocol</>
                  ) : (
                    <><Save size={24} className="group-hover:rotate-12 transition-transform" /> Authenticate & Enroll</>
                  )}
                </button>
              </div>
            </form>
x] font-bold text-white/50 uppercase tracking-widest">System Ready</p>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Profile sync on submit</p>
                      </div>
                    </div>

                    <button type="submit" disabled={status === 'submitting'}
                      className="group relative overflow-hidden bg-brand-accent text-brand-950 font-black py-4 px-10 rounded-2xl text-[12px] uppercase tracking-[0.3em] shadow-[0_12px_40px_rgba(195,246,41,0.3)] hover:shadow-[0_18px_50px_rgba(195,246,41,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 flex items-center gap-3 disabled:opacity-50">
                      <div className="absolute inset-0 bg-white/20 translate-x-[-110%] skew-x-[-20deg] group-hover:translate-x-[110%] transition-transform duration-700" />
                      <span className="relative z-10 flex items-center gap-2.5">
                        {status === 'submitting'
                          ? <><RefreshCw size={16} className="animate-spin" /> Enrolling…</>
                          : <><UserPlus size={16} className="group-hover:scale-110 transition-transform" /> Enroll Athlete</>}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </form>

          ) : (
            /* ══════════════════ COACH FORM ══════════════════ */
            <form onSubmit={handleCoachSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                {/* LEFT — Coach Identity */}
                <div className="xl:col-span-4 space-y-6">

                  {/* Photo */}
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                    <SectionHeader
                      icon={<Camera size={16} className="text-brand-accent" />}
                      title="Coach" accent="Photo"
                      subtitle="Personnel identity"
                    />
                    <div className="flex flex-col items-center">
                      <div className="relative group/photo mb-6">
                        <div className={`w-44 h-52 rounded-2xl overflow-hidden border-2 border-dashed transition-all duration-500 flex items-center justify-center
                          ${coachPreviewUrl ? 'border-brand-primary/50 shadow-[0_0_40px_rgba(0,200,255,0.12)]' : 'border-white/10 group-hover/photo:border-white/20'}`}>
                          {coachPreviewUrl ? (
                            <img src={coachPreviewUrl} alt="Coach" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-3 text-white/20 group-hover/photo:text-white/30 transition-colors">
                              <Camera size={40} strokeWidth={1.5} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Upload Photo</span>
                            </div>
                          )}
                        </div>
                        <label className="absolute -bottom-4 -right-4 cursor-pointer bg-brand-primary text-brand-950 p-3.5 rounded-xl shadow-[0_8px_24px_rgba(0,200,255,0.4)] hover:scale-110 active:scale-95 transition-all z-10">
                          <Upload size={16} />
                          <input type="file" accept="image/*" className="hidden" onChange={handleCoachFileChange} />
                        </label>
                      </div>
                      {coachPreviewUrl && (
                        <button type="button" onClick={() => { setCoachPreviewUrl(null); setCoachForm(p => ({ ...p, photoUrl: '' })); }}
                          className="mt-2 text-[10px] font-bold text-white/30 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-1.5">
                          <X size={12} /> Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Core credentials */}
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                    <SectionHeader
                      icon={<Shield size={16} className="text-brand-primary" />}
                      title="Core" accent="Credentials"
                      subtitle="Identity & access info"
                      accentClass="text-brand-primary"
                    />
                    <div className="space-y-5">
                      <div>
                        <FieldLabel icon={<User size={11} />} label="Full Name" required />
                        <input type="text" className={inp('fullName')} value={coachForm.fullName}
                          onChange={e => setCoachForm({ ...coachForm, fullName: e.target.value })}
                          placeholder="Coach's full name" />
                        {errors.fullName && <p className="mt-1.5 text-[10px] text-red-400 font-bold">{errors.fullName}</p>}
                      </div>
                      <div>
                        <FieldLabel icon={<Shield size={11} />} label="Username" required />
                        <input type="text" className={inp('username')} value={coachForm.username}
                          onChange={e => setCoachForm({ ...coachForm, username: e.target.value })}
                          placeholder="Unique login username" />
                        {errors.username && <p className="mt-1.5 text-[10px] text-red-400 font-bold">{errors.username}</p>}
                      </div>
                      <div>
                        <FieldLabel icon={<Activity size={11} />} label="Employee ID" required />
                        <input type="text" className={inp('employeeNumber')} value={coachForm.employeeNumber}
                          onChange={e => setCoachForm({ ...coachForm, employeeNumber: e.target.value })}
                          placeholder="EMP-12345" />
                        {errors.employeeNumber && <p className="mt-1.5 text-[10px] text-red-400 font-bold">{errors.employeeNumber}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT — Assignments & Contact */}
                <div className="xl:col-span-8 space-y-6">

                  {/* Venue Assignments */}
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                    <SectionHeader
                      icon={<MapPin size={16} className="text-brand-primary" />}
                      title="Venue" accent="Assignments"
                      subtitle="Select all applicable venues"
                      accentClass="text-brand-primary"
                    />
                    {venues.length === 0 ? (
                      <p className="text-[11px] text-white/30 italic">No venues configured. Use the settings panel to add venues.</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {venues.map(v => (
                          <button key={v.id} type="button" onClick={() => toggleCoachAssignment('venue', v.name)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all duration-300
                              ${coachForm.assignedVenues.includes(v.name)
                                ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary shadow-[0_4px_14px_rgba(0,200,255,0.2)]'
                                : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15]'}`}>
                            {coachForm.assignedVenues.includes(v.name) && <Check size={11} />}
                            {v.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Batch Assignments */}
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                    <SectionHeader
                      icon={<Layers size={16} className="text-brand-accent" />}
                      title="Batch" accent="Assignments"
                      subtitle="Select all applicable batches"
                    />
                    {batches.length === 0 ? (
                      <p className="text-[11px] text-white/30 italic">No batches configured. Use the settings panel to add batches.</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {batches.map(b => (
                          <button key={b.id} type="button" onClick={() => toggleCoachAssignment('batch', b.name)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all duration-300
                              ${coachForm.assignedBatches.includes(b.name)
                                ? 'bg-brand-accent/20 border-brand-accent/50 text-brand-accent shadow-[0_4px_14px_rgba(195,246,41,0.2)]'
                                : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15]'}`}>
                            {coachForm.assignedBatches.includes(b.name) && <Check size={11} />}
                            {b.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contact & Security */}
                  <div className="glass-card p-10">
                    <SectionHeader
                      icon={<Key size={16} className="text-orange-400" />}
                      title="Contact &" accent="Security"
                      subtitle="Login credentials & contact info"
                      accentClass="text-orange-400"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <FieldLabel icon={<Phone size={11} />} label="Phone Number" />
                        <input type="tel" className={inp('contactNumber')} value={coachForm.contactNumber}
                          onChange={e => setCoachForm({ ...coachForm, contactNumber: e.target.value })}
                          placeholder="+91 XXXXX XXXXX" />
                      </div>
                      <div>
                        <FieldLabel icon={<Radio size={11} />} label="Email Address" />
                        <input type="email" className={inp('email')} value={coachForm.email}
                          onChange={e => setCoachForm({ ...coachForm, email: e.target.value })}
                          placeholder="coach@icarus.com" />
                      </div>
                      <div>
                        <FieldLabel icon={<Key size={11} />} label="Password" required />
                        <input type="password" className={inp('password')} value={coachForm.password}
                          onChange={e => setCoachForm({ ...coachForm, password: e.target.value })}
                          placeholder="Choose a strong password" />
                        {errors.password && <p className="mt-1.5 text-[10px] text-red-400 font-bold">{errors.password}</p>}
                      </div>
                      <div>
                        <FieldLabel icon={<Calendar size={11} />} label="Date of Birth" />
                        <input type="date" className={inp('dateOfBirth')} value={coachForm.dateOfBirth}
                          onChange={e => setCoachForm({ ...coachForm, dateOfBirth: e.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <FieldLabel icon={<MapPin size={11} />} label="Address" />
                        <input type="text" className={inp('address')} value={coachForm.address}
                          onChange={e => setCoachForm({ ...coachForm, address: e.target.value })}
                          placeholder="Residential address" />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                    <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                      <div>
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">System Ready</p>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Account creation on submit</p>
                      </div>
                    </div>
                    <button type="submit" disabled={status === 'submitting'}
                      className="group relative overflow-hidden bg-brand-primary text-brand-950 font-black py-4 px-10 rounded-2xl text-[12px] uppercase tracking-[0.3em] shadow-[0_12px_40px_rgba(0,200,255,0.3)] hover:shadow-[0_18px_50px_rgba(0,200,255,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-300 flex items-center gap-3 disabled:opacity-50">
                      <div className="absolute inset-0 bg-white/20 translate-x-[-110%] skew-x-[-20deg] group-hover:translate-x-[110%] transition-transform duration-700" />
                      <span className="relative z-10 flex items-center gap-2.5">
                        {status === 'submitting'
                          ? <><RefreshCw size={16} className="animate-spin" /> Creating…</>
                          : <><UserCheck size={16} className="group-hover:scale-110 transition-transform" /> Register Coach</>}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ─── Config Modal ───────────────────────────────────────────────────── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-xl rounded-3xl border border-white/[0.08] bg-[#0e1020] shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 duration-500">
            {/* Accent line */}
            <div className="h-[2px] bg-gradient-to-r from-brand-accent via-brand-primary to-transparent" />

            {/* Header */}
            <div className="flex justify-between items-center p-7 border-b border-white/[0.06]">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-brand-accent/10 border border-brand-accent/20">
                  <Settings size={18} className="text-brand-accent" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">Academy Config</h3>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Venues & Batch Management</p>
                </div>
              </div>
              <button onClick={() => setShowConfigModal(false)}
                className="p-2.5 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all border border-transparent hover:border-white/[0.08]">
                <X size={18} />
              </button>
            </div>

            {/* Tab switcher */}
            <div className="px-7 pt-6">
              <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                {(['venues', 'batches'] as const).map(t => (
                  <button key={t} onClick={() => setConfigTab(t)}
                    className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300
                      ${configTab === t ? 'bg-brand-accent text-brand-950 shadow-[0_4px_14px_rgba(195,246,41,0.3)]' : 'text-white/40 hover:text-white'}`}>
                    {t === 'venues' ? 'Venues' : 'Batches'}
                  </button>
                ))}
              </div>
            </div>

            {/* Add / Edit Input */}
            <div className="px-7 pt-5 flex gap-3">
              <input type="text" className={inputNormal}
                value={newItemName} onChange={e => setNewItemName(e.target.value)}
                placeholder={editingItem ? 'Update name…' : `Add new ${configTab === 'venues' ? 'venue' : 'batch'}…`}
                onKeyDown={e => e.key === 'Enter' && (editingItem ? handleUpdateItem() : handleAddItem())} />
              <button onClick={editingItem ? handleUpdateItem : handleAddItem}
                className="shrink-0 px-5 py-3 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent font-black text-[11px] uppercase tracking-widest hover:bg-brand-accent/20 transition-all flex items-center gap-2">
                {editingItem ? <Check size={14} /> : <Plus size={14} />}
                {editingItem ? 'Save' : 'Add'}
              </button>
              {editingItem && (
                <button onClick={() => { setEditingItem(null); setNewItemName(''); }}
                  className="shrink-0 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white transition-all">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* List */}
            <div className="px-7 py-5 max-h-[280px] overflow-y-auto custom-scrollbar-tactical space-y-2">
              {(configTab === 'venues' ? venues : batches).map(item => (
                <div key={item.id}
                  className="flex justify-between items-center px-4 py-3 rounded-xl border border-white/[0.05] bg-white/[0.02] group/item hover:border-brand-accent/20 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent/60 group-hover/item:bg-brand-accent transition-colors" />
                    <span className="text-sm font-semibold text-white/70 group-hover/item:text-white transition-colors">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                    <button onClick={() => { setEditingItem(item); setNewItemName(item.name); }}
                      className="p-2 rounded-lg text-white/30 hover:text-brand-primary hover:bg-brand-primary/10 transition-all">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleSecureDelete(configTab === 'venues' ? 'venue' : 'batch', item.id, item.name)}
                      className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {(configTab === 'venues' ? venues : batches).length === 0 && (
                <div className="py-16 flex flex-col items-center gap-3 text-white/20">
                  <Layers size={32} strokeWidth={1.5} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">
                    No {configTab === 'venues' ? 'venues' : 'batches'} added yet
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-7 py-5 border-t border-white/[0.06] flex justify-end">
              <button onClick={() => setShowConfigModal(false)}
                className="px-6 py-2.5 rounded-xl text-[11px] font-bold text-white/50 uppercase tracking-widest hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-all">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm Modal ──────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={`Delete ${itemToDelete?.type}`}
        message={`Are you sure you want to permanently delete "${itemToDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        requireTypeToConfirm="delete"
      />
    </div>
  );
};

export default PlayerRegistration;
