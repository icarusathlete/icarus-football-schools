
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Save, X, User, Phone, Shield, Camera, Check, RefreshCw, AlertCircle, Calendar, Briefcase, Trash2, MapPin, Settings, Map, Layers, Plus, Edit2, Key, UserCheck, FileText } from 'lucide-react';
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
    // Listen for updates in case another tab adds a player or configs change
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
    else if (formData.fullName.length < 2) newErrors.fullName = 'Name must be at least 2 characters';

    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    
    if (!formData.parentName.trim()) newErrors.parentName = 'Guardian name is required';
    
    if (!formData.contactNumber.trim()) newErrors.contactNumber = 'Contact number is required';
    else if (formData.contactNumber.length < 6) newErrors.contactNumber = 'Please enter a valid phone number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCoach = () => {
      const newErrors: Record<string, string> = {};
      if (!coachForm.username.trim()) newErrors.username = 'Coach Name/Username is required';
      if (!coachForm.password.trim()) newErrors.password = 'Password is required';
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handlePlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handlePlayerSubmit called");
    
    if (!validatePlayer()) {
        console.log("Validation failed:", errors);
        setStatus('error');
        setStatusMsg('Please correct the highlighted errors.');
        setTimeout(() => setStatus('idle'), 3000);
        return;
    }

    setStatus('submitting');
    
    setTimeout(async () => {
        try {
            console.log("Calling StorageService.addPlayer...");
            await StorageService.addPlayer({
                ...formData,
                photoUrl: formData.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName)}&background=0ea5e9&color=fff`
            });
            
            console.log("Registration successful");
            setStatus('success');
            setStatusMsg(`Athlete ${formData.fullName} successfully enrolled!`);
            
            // Reset Form
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
            setErrors({});
            refreshData();

            setTimeout(() => {
                setStatus('idle');
                setStatusMsg('');
            }, 4000);
        } catch (error: any) {
            console.error("Registration error:", error);
            let displayMsg = 'System error: Could not save player profile.';
            try {
                const errInfo = JSON.parse(error.message);
                if (errInfo.error) {
                    displayMsg = `Error: ${errInfo.error}`;
                }
            } catch (e) {
                // Not a JSON error
            }
            setStatus('error');
            setStatusMsg(displayMsg);
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
              setStatusMsg(`Coach ${coachForm.username} onboarded!`);
              
              setCoachForm({
                  username: '',
                  password: '',
                  photoUrl: '',
                  assignedVenues: [],
                  assignedBatches: []
              });
              setCoachPreviewUrl(null);
              setErrors({});
              
              setTimeout(() => {
                  setStatus('idle');
                  setStatusMsg('');
              }, 4000);
          } catch (err: any) {
              setStatus('error');
              setStatusMsg(err.message || 'Could not create coach account.');
          }
      }, 800);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkUploading(true);
    setStatus('submitting');
    setStatusMsg('Parsing CSV data...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        let successCount = 0;
        let errorCount = 0;

        for (const row of data) {
          try {
            // Basic mapping and validation
            const playerToRegister = {
              fullName: row.fullName || row.FullName || row.name || '',
              dateOfBirth: row.dateOfBirth || row.DOB || row.dob || '',
              parentName: row.parentName || row.Guardian || row.guardian || '',
              contactNumber: row.contactNumber || row.Phone || row.phone || '',
              address: row.address || row.Address || '',
              position: (row.position || row.Position || 'TBD') as Player['position'],
              venue: row.venue || row.Venue || 'Playall',
              batch: row.batch || row.Batch || 'Elite',
              photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(row.fullName || 'Player')}&background=0ea5e9&color=fff`
            };

            if (playerToRegister.fullName && playerToRegister.dateOfBirth) {
              await StorageService.addPlayer(playerToRegister);
              successCount++;
            } else {
              errorCount++;
            }
          } catch (err) {
            console.error('Error registering player from CSV:', err);
            errorCount++;
          }
        }

        setIsBulkUploading(false);
        if (successCount > 0) {
          setStatus('success');
          setStatusMsg(`Successfully registered ${successCount} players! ${errorCount > 0 ? `(${errorCount} failed)` : ''}`);
          refreshData();
        } else {
          setStatus('error');
          setStatusMsg('Failed to register players from CSV. Check format.');
        }

        if (csvInputRef.current) csvInputRef.current.value = '';
        setTimeout(() => setStatus('idle'), 5000);
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        setIsBulkUploading(false);
        setStatus('error');
        setStatusMsg('Error parsing CSV file.');
        setTimeout(() => setStatus('idle'), 3000);
      }
    });
  };

  // --- Deletion Logic with "Type delete" security ---
  const handleSecureDelete = (type: 'player' | 'venue' | 'batch', id: string, name: string) => {
      setItemToDelete({ type, id, name });
      setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!itemToDelete) return;
      const { type, id, name } = itemToDelete;
      
      try {
          if (type === 'player') {
              await StorageService.deletePlayer(id);
          } else if (type === 'venue') {
              await StorageService.deleteVenue(id);
          } else if (type === 'batch') {
              await StorageService.deleteBatch(id);
          }
          
          refreshData();
          setDeleteModalOpen(false);
          setItemToDelete(null);
      } catch (error) {
          console.error("Error deleting:", error);
          alert("An error occurred while deleting.");
      }
  };

  // --- Config Management Logic ---
  const handleAddItem = () => {
      if (!newItemName.trim()) return;
      
      if (configTab === 'venues') {
          StorageService.addVenue(newItemName.trim());
      } else {
          StorageService.addBatch(newItemName.trim());
      }
      setNewItemName('');
      refreshData();
  };

  const handleUpdateItem = () => {
      if (!editingItem || !editingItem.name.trim()) return;
      
      if (configTab === 'venues') {
          StorageService.updateVenue(editingItem.id, editingItem.name.trim());
      } else {
          StorageService.updateBatch(editingItem.id, editingItem.name.trim());
      }
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
    w-full rounded-2xl border p-4 text-sm outline-none transition-all duration-300 font-bold shadow-inner
    ${errors[field] 
        ? 'border-red-500/50 bg-red-500/5 text-red-200 placeholder:text-red-500/30' 
        : 'border-white/10 bg-brand-800 text-white placeholder:text-brand-700 focus:border-gold'
    }
  `;

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-8">
        
        {/* Mode Switcher */}
        <div className="bg-brand-800 p-2 rounded-[2.5rem] shadow-2xl border border-white/5 flex flex-col sm:flex-row gap-2">
            <button 
                onClick={() => setMode('player')}
                className={`flex-1 flex items-center justify-center gap-4 py-5 rounded-[2rem] transition-all duration-500 ${mode === 'player' ? 'bg-gold text-brand-950 shadow-xl shadow-gold/20 scale-[1.02]' : 'hover:bg-white/5 text-brand-500 hover:text-white'}`}
            >
                <div className={`p-3 rounded-xl ${mode === 'player' ? 'bg-brand-950/10' : 'bg-brand-950/30'}`}>
                    <User size={24} />
                </div>
                <div className="text-left">
                    <div className="font-black uppercase tracking-[0.2em] text-[11px]" style={{ fontFamily: 'Orbitron' }}>Athlete Enrollment</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${mode === 'player' ? 'text-brand-950/60' : 'text-brand-600'}`}>New Commissioning Node</div>
                </div>
            </button>
            <button 
                onClick={() => setMode('coach')}
                className={`flex-1 flex items-center justify-center gap-4 py-5 rounded-[2rem] transition-all duration-500 ${mode === 'coach' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 scale-[1.02]' : 'hover:bg-white/5 text-brand-500 hover:text-white'}`}
            >
                <div className={`p-3 rounded-xl ${mode === 'coach' ? 'bg-white/10' : 'bg-brand-950/30'}`}>
                    <UserCheck size={24} />
                </div>
                <div className="text-left">
                    <div className="font-black uppercase tracking-[0.2em] text-[11px]" style={{ fontFamily: 'Orbitron' }}>Staff Onboarding</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${mode === 'coach' ? 'text-white/60' : 'text-brand-600'}`}>Authorize Access Protocol</div>
                </div>
            </button>
        </div>

      <div className="bg-brand-900 rounded-[4rem] shadow-[0_64px_128px_-32px_rgba(0,0,0,0.8)] border border-white/5 overflow-hidden relative">
        
        {/* Header Section */}
        <div className={`relative px-12 py-16 text-white overflow-hidden transition-all duration-1000 ${mode === 'coach' ? 'bg-blue-950/30' : 'bg-brand-950/40'} border-b border-white/5`}>
          <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/50 to-transparent opacity-50" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.08),transparent_70%)]" />
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6 text-gold font-black uppercase tracking-[0.4em] text-[10px] bg-brand-950/80 w-fit px-5 py-2.5 rounded-full border border-gold/20 shadow-[0_0_20px_rgba(251,191,36,0.1)]">
                <Shield size={12} className="animate-pulse" /> DATABASE INTAKE ACTIVE
              </div>
              <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-[0.9]" style={{ fontFamily: 'Orbitron' }}>
                {mode === 'player' ? 'ATHLETE ' : 'OFFICER '} <br/>
                <span className="text-gold">
                    {mode === 'player' ? 'REGISTRATION' : 'ONBOARDING'}
                </span>
              </h2>
              <p className="text-brand-500 text-[11px] mt-6 font-bold uppercase tracking-[0.2em] max-w-xl leading-relaxed italic border-l-2 border-gold/20 pl-6">
                  {mode === 'player' 
                    ? 'Initialize new player profile in the Icarus tactical ecosystem. Immediate roster synchronization across all coaching stations.' 
                    : 'Establish high-level access credentials for staff deployments and operational scope assignment.'}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-6 min-w-[280px]">
                {mode === 'player' && (
                    <div className="bg-brand-950/80 backdrop-blur-2xl px-12 py-8 rounded-[2.5rem] border border-white/10 flex flex-col items-center shadow-3xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.3em] mb-3 relative z-10">ASSIGNED MEMBER ID</span>
                        <span className="text-5xl font-black tracking-tighter text-gold font-mono relative z-10 shadow-gold/20">{nextId}</span>
                    </div>
                )}
                <div className="flex gap-4 flex-wrap justify-end">
                    <button 
                        onClick={() => setShowConfigModal(true)}
                        className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] bg-brand-950 border border-white/10 hover:border-gold/50 hover:text-gold px-8 py-4 rounded-2xl transition-all shadow-xl group"
                    >
                        <Settings size={14} className="group-hover:rotate-90 transition-transform" /> TAXONOMY
                    </button>
                    
                    {mode === 'player' && (
                        <>
                            <input 
                                type="file" 
                                accept=".csv" 
                                className="hidden" 
                                ref={csvInputRef}
                                onChange={handleCsvUpload}
                            />
                            <button 
                                onClick={() => csvInputRef.current?.click()}
                                disabled={status === 'submitting'}
                                className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] bg-blue-600/10 hover:bg-blue-600/20 px-8 py-4 rounded-2xl transition-all text-blue-400 border border-blue-600/30 disabled:opacity-50 shadow-xl"
                            >
                                <FileText size={16} /> DATA INGESTION
                            </button>
                        </>
                    )}
                </div>
            </div>
          </div>
        </div>

        {/* --- FORM CONTENT --- */}
        <div className="p-8 md:p-12">
            
            {mode === 'player' ? (
                /* PLAYER REGISTRATION FORM */
                <form onSubmit={handlePlayerSubmit} className="space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Left Column: Photo Upload */}
                        <div className="lg:col-span-4 flex flex-col items-center gap-8">
                        <div className="relative group">
                            <div className={`
                                w-64 h-64 rounded-[3rem] bg-brand-800 border-4 border-dashed flex items-center justify-center overflow-hidden transition-all duration-500 
                                ${previewUrl ? 'border-transparent shadow-2xl scale-[1.02]' : 'border-white/5 group-hover:border-gold/50 group-hover:bg-gold/5'}
                            `}>
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-brand-700 group-hover:text-gold transition-colors">
                                    <div className="p-6 bg-brand-950/50 rounded-full shadow-inner border border-white/5">
                                        <Camera size={40} strokeWidth={1} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Initialize Avatar</span>
                                    </div>
                                )}
                            </div>
                            <label className="absolute -bottom-4 -right-4 cursor-pointer bg-gold text-brand-950 p-5 rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all z-20">
                                <Upload size={24} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                        <div className="text-center">
                            <h4 className="font-black text-white italic uppercase tracking-tight text-sm">Tactical <span className="text-gold">ID Profile</span></h4>
                            <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest mt-2 max-w-[200px]">Required for identification and battlefield reports.</p>
                        </div>
                        </div>

                        {/* Right Column: Details */}
                        <div className="lg:col-span-8 space-y-12">
                        {/* Section: Student Athlete */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-950/50 flex items-center justify-center text-gold border border-white/5 shadow-inner"><User size={20} /></div>
                            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-brand-400 italic">Athlete <span className="text-white">Credentials</span></h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2 group">
                                <label className="flex items-center gap-2 text-[10px] font-black text-brand-500 group-focus-within:text-gold transition-colors ml-1 uppercase tracking-[0.2em]">
                                    Full Name {errors.fullName && <span className="text-red-400 normal-case tracking-normal ml-auto text-[9px] bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">{errors.fullName}</span>}
                                </label>
                                <div className="relative">
                                    <User size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.fullName ? 'text-red-500' : 'text-brand-600 group-focus-within:text-gold'}`} />
                                    <input
                                        type="text"
                                        className={`${getInputClass('fullName')} pl-11`}
                                        value={formData.fullName}
                                        onChange={e => {
                                            setFormData({...formData, fullName: e.target.value});
                                            if (errors.fullName) setErrors({...errors, fullName: ''});
                                        }}
                                        placeholder="e.g. Leo Messi"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 group">
                                <label className="flex items-center gap-2 text-[10px] font-black text-brand-500 group-focus-within:text-gold transition-colors ml-1 uppercase tracking-[0.2em]">
                                    Date of Birth {errors.dateOfBirth && <span className="text-red-400 normal-case tracking-normal ml-auto text-[9px] bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">{errors.dateOfBirth}</span>}
                                </label>
                                <div className="relative">
                                    <Calendar size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.dateOfBirth ? 'text-red-500' : 'text-brand-600 group-focus-within:text-gold'}`} />
                                    <input
                                        type="date"
                                        className={`${getInputClass('dateOfBirth')} pl-11`}
                                        value={formData.dateOfBirth}
                                        onChange={e => {
                                            setFormData({...formData, dateOfBirth: e.target.value});
                                            if (errors.dateOfBirth) setErrors({...errors, dateOfBirth: ''});
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 md:col-span-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-brand-500 ml-1 uppercase tracking-[0.2em]">
                                    Primary Tactical Assignment
                                </label>
                                <div className="flex flex-wrap gap-3">
                                {['Forward', 'Midfielder', 'Defender', 'Goalkeeper', 'TBD'].map(pos => (
                                    <button
                                    key={pos}
                                    type="button"
                                    onClick={() => setFormData({...formData, position: pos as any})}
                                    className={`
                                        py-3 px-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] border transition-all duration-300 flex items-center gap-3
                                        ${formData.position === pos 
                                        ? 'bg-gold border-gold text-brand-950 shadow-xl shadow-gold/20 scale-[1.05]' 
                                        : 'bg-brand-800 border-white/5 text-brand-600 hover:border-white/20 hover:text-white'
                                        }
                                    `}
                                    >
                                    <Briefcase size={14} />
                                    {pos}
                                    </button>
                                ))}
                                </div>
                            </div>
                            </div>
                        </div>

                        {/* Section: Training Assignment */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-950/50 flex items-center justify-center text-purple-400 border border-white/5 shadow-inner"><Layers size={20} /></div>
                            <h3 className="text-sm font-black uppercase tracking-[0.25em] text-brand-400 italic">Operational <span className="text-white">Deployment</span></h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2 group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-brand-500 group-focus-within:text-purple-400 transition-colors ml-1 uppercase tracking-[0.2em]">
                                        Assigned Venue
                                    </label>
                                    <div className="relative">
                                        <Map size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-600 group-focus-within:text-purple-400 transition-colors" />
                                        <select 
                                            value={formData.venue}
                                            onChange={e => setFormData({...formData, venue: e.target.value})}
                                            className="w-full pl-11 pr-4 py-4 rounded-2xl border border-white/10 bg-brand-800 text-sm font-bold text-white outline-none focus:border-purple-400 shadow-inner transition-all appearance-none"
                                        >
                                            <option value="" disabled>Select Sector</option>
                                            {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-brand-500 group-focus-within:text-purple-400 transition-colors ml-1 uppercase tracking-[0.2em]">
                                        Designated Batch
                                    </label>
                                    <div className="relative">
                                        <Layers size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-600 group-focus-within:text-purple-400 transition-colors" />
                                        <select 
                                            value={formData.batch}
                                            onChange={e => setFormData({...formData, batch: e.target.value})}
                                            className="w-full pl-11 pr-4 py-4 rounded-2xl border border-white/10 bg-brand-800 text-sm font-bold text-white outline-none focus:border-purple-400 shadow-inner transition-all appearance-none"
                                        >
                                            <option value="" disabled>Select Division</option>
                                            {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Guardian Contact */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-950/50 flex items-center justify-center text-green-400 border border-white/5 shadow-inner"><Phone size={20} /></div>
                            <h3 className="text-sm font-black uppercase tracking-[0.25em] text-brand-400 italic">Guardian <span className="text-white">Liaison</span></h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2 group">
                                <label className="flex items-center gap-2 text-[10px] font-black text-brand-500 group-focus-within:text-green-400 transition-colors ml-1 uppercase tracking-[0.2em]">
                                    Primary Liaison {errors.parentName && <span className="text-red-400 normal-case tracking-normal ml-auto text-[9px] bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">{errors.parentName}</span>}
                                </label>
                                <div className="relative">
                                    <User size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.parentName ? 'text-red-500' : 'text-brand-600 group-focus-within:text-green-500'}`} />
                                    <input
                                        type="text"
                                        className={`${getInputClass('parentName')} pl-11 focus:border-green-500`}
                                        value={formData.parentName}
                                        onChange={e => {
                                            setFormData({...formData, parentName: e.target.value});
                                            if (errors.parentName) setErrors({...errors, parentName: ''});
                                        }}
                                        placeholder="Full name of parent/guardian"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 group">
                                <label className="flex items-center gap-2 text-[10px] font-black text-brand-500 group-focus-within:text-green-400 transition-colors ml-1 uppercase tracking-[0.2em]">
                                    Comms Frequency {errors.contactNumber && <span className="text-red-400 normal-case tracking-normal ml-auto text-[9px] bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">{errors.contactNumber}</span>}
                                </label>
                                <div className="relative">
                                <Phone size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.contactNumber ? 'text-red-500' : 'text-brand-600 group-focus-within:text-green-500'}`} />
                                <input
                                    type="tel"
                                    className={`${getInputClass('contactNumber')} pl-11 focus:border-green-500`}
                                    value={formData.contactNumber}
                                    onChange={e => {
                                        setFormData({...formData, contactNumber: e.target.value});
                                        if (errors.contactNumber) setErrors({...errors, contactNumber: ''});
                                    }}
                                    placeholder="+1 (555) 000-0000"
                                />
                                </div>
                            </div>

                            <div className="space-y-2 group md:col-span-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-brand-500 group-focus-within:text-green-400 transition-colors ml-1 uppercase tracking-[0.2em]">
                                    Geospatial Residence (Address)
                                </label>
                                <div className="relative">
                                <MapPin size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-brand-600 group-focus-within:text-green-500`} />
                                <input
                                    type="text"
                                    className={`${getInputClass('address')} pl-11 focus:border-green-500`}
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                    placeholder="Full address for logistical records"
                                />
                                </div>
                            </div>
                            </div>
                        </div>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                        <p className="text-[10px] text-brand-600 font-black uppercase tracking-[0.15em] flex items-center gap-3">
                        <Shield size={16} className="text-gold" /> Encrypted datastore • Local terminal persistence
                        </p>
                        <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="w-full md:w-auto bg-gold text-brand-950 font-black py-5 px-16 rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Orbitron' }}
                        >
                        {status === 'submitting' ? (
                            <>
                                <RefreshCw size={20} className="animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                <span>Authorize Enrollment</span>
                            </>
                        )}
                        </button>
                    </div>
                </form>
            ) : (
                /* COACH ONBOARDING FORM */
                <form onSubmit={handleCoachSubmit} className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-brand-950 border border-white/10 text-gold rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl">
                            <UserCheck size={40} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tight" style={{ fontFamily: 'Orbitron' }}>Officer <span className="text-gold">Credentials</span></h3>
                        <p className="text-brand-500 text-[10px] font-black uppercase tracking-[0.2em] mt-3">Establish secure terminal access & operational scope</p>
                    </div>

                    {/* Coach Profile Image Upload */}
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative group">
                            <div className={`
                                w-40 h-40 rounded-[2.5rem] bg-brand-800 border-4 border-dashed flex items-center justify-center overflow-hidden transition-all duration-500 
                                ${coachPreviewUrl ? 'border-transparent shadow-2xl scale-[1.02]' : 'border-white/5 group-hover:border-gold/50 group-hover:bg-gold/5'}
                            `}>
                                {coachPreviewUrl ? (
                                    <img src={coachPreviewUrl} alt="Coach Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera size={28} className="text-brand-700 group-hover:text-gold transition-colors" />
                                )}
                            </div>
                            <label className="absolute -bottom-2 -right-2 cursor-pointer bg-gold text-brand-950 p-4 rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all">
                                <Upload size={18} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleCoachFileChange} />
                            </label>
                        </div>
                        <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em]">Operational Profile Photo</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-brand-950/30 p-10 rounded-[2.5rem] border border-white/5 shadow-inner">
                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1 group-focus-within:text-gold transition-colors">Officer Username</label>
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-600 group-focus-within:text-gold transition-colors" />
                                <input 
                                    required
                                    type="text" 
                                    className={`${getInputClass('username')} pl-12 pr-4 py-4`}
                                    placeholder="e.g. Commandant David"
                                    value={coachForm.username}
                                    onChange={e => setCoachForm({...coachForm, username: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1 group-focus-within:text-gold transition-colors">Access Password</label>
                            <div className="relative">
                                <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-600 group-focus-within:text-gold transition-colors" />
                                <input 
                                    required
                                    type="text" 
                                    className={`${getInputClass('password')} pl-12 pr-4 py-4 font-mono`}
                                    placeholder="Secure key..."
                                    value={coachForm.password}
                                    onChange={e => setCoachForm({...coachForm, password: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-10 bg-brand-950/30 p-10 rounded-[2.5rem] border border-white/5 shadow-inner">
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">
                                <MapPin size={14} className="text-gold" /> Sector Assignment (Venues)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {venues.map(v => (
                                    <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => toggleCoachAssignment('venue', v.name)}
                                        className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${
                                            coachForm.assignedVenues.includes(v.name)
                                            ? 'bg-gold text-brand-950 border-gold shadow-lg shadow-gold/10'
                                            : 'bg-brand-800 text-brand-500 border-white/5 hover:border-white/20 hover:text-white'
                                        }`}
                                    >
                                        {v.name}
                                        {coachForm.assignedVenues.includes(v.name) && <Check size={12} className="inline ml-2" />}
                                    </button>
                                ))}
                                {venues.length === 0 && <span className="text-[10px] text-brand-700 italic border border-white/5 px-4 py-2 rounded-lg">Tactical map empty.</span>}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-3 text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">
                                <Layers size={14} className="text-blue-400" /> Division Assignment (Batches)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {batches.map(b => (
                                    <button
                                        key={b.id}
                                        type="button"
                                        onClick={() => toggleCoachAssignment('batch', b.name)}
                                        className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${
                                            coachForm.assignedBatches.includes(b.name)
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/10'
                                            : 'bg-brand-800 text-brand-500 border-white/5 hover:border-white/20 hover:text-white'
                                        }`}
                                    >
                                        {b.name}
                                        {coachForm.assignedBatches.includes(b.name) && <Check size={12} className="inline ml-2" />}
                                    </button>
                                ))}
                                {batches.length === 0 && <span className="text-[10px] text-brand-700 italic border border-white/5 px-4 py-2 rounded-lg">No active divisions.</span>}
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                        <p className="text-[10px] text-brand-600 font-black uppercase tracking-[0.15em] flex items-center gap-3">
                        <Shield size={16} className="text-blue-500" /> Administrative bypass • High-level clearing
                        </p>
                        <button
                            type="submit"
                            disabled={status === 'submitting'}
                            className="w-full md:w-auto bg-blue-600 text-white font-black py-5 px-16 rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-[10px] disabled:opacity-50 disabled:transform-none"
                            style={{ fontFamily: 'Orbitron' }}
                        >
                            {status === 'submitting' ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                            {status === 'submitting' ? 'Initializing Account...' : 'Confirm Commissioning'}
                        </button>
                    </div>
                </form>
            )}
        </div>
      </div>

      {/* Registered Squad List (Only visible in Player Mode) */}
      {mode === 'player' && (
        <div className="bg-brand-900 rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden mt-12">
            <div className="px-10 py-8 border-b border-white/5 bg-brand-950/50 flex justify-between items-center">
                <div>
                    <h3 className="font-black text-white italic uppercase tracking-tight text-xl" style={{ fontFamily: 'Orbitron' }}>Active <span className="text-gold">Roster</span></h3>
                    <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest mt-1">Live database of commissioned athletes</p>
                </div>
                <div className="bg-brand-950 px-6 py-3 rounded-2xl border border-white/5 shadow-inner">
                    <span className="text-[10px] font-black text-gold uppercase tracking-[0.2em]">{players.length} Operatives</span>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-brand-950/80 border-b border-white/5">
                        <tr>
                            <th className="px-8 py-5 font-black text-brand-500 uppercase text-[10px] tracking-[0.2em]">Asset Profile</th>
                            <th className="px-8 py-5 font-black text-brand-500 uppercase text-[10px] tracking-[0.2em]">Clearance ID</th>
                            <th className="px-8 py-5 font-black text-brand-500 uppercase text-[10px] tracking-[0.2em]">Sector / Division</th>
                            <th className="px-8 py-5 font-black text-brand-500 uppercase text-[10px] tracking-[0.2em]">Tactical Role</th>
                            <th className="px-8 py-5 font-black text-brand-500 uppercase text-[10px] tracking-[0.2em] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {players.map(p => (
                            <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-8 py-5 flex items-center gap-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gold/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <img src={p.photoUrl} className="w-10 h-10 rounded-full border border-white/10 relative z-10 bg-brand-800 object-cover" />
                                    </div>
                                    <span className="font-black text-white uppercase tracking-tight text-sm">{p.fullName}</span>
                                </td>
                                <td className="px-8 py-5 font-mono text-[11px] text-brand-500">{p.memberId}</td>
                                <td className="px-8 py-5">
                                    <div className="text-[11px] text-white font-black uppercase tracking-widest">{p.venue || '-'}</div>
                                    <div className="text-[9px] text-gold font-bold uppercase tracking-[0.15em] mt-1">{p.batch || '-'}</div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="px-3 py-1 rounded-lg bg-brand-800 text-brand-400 text-[9px] font-black uppercase tracking-widest border border-white/5">
                                        {p.position}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button 
                                        onClick={() => handleSecureDelete('player', p.id, p.fullName)}
                                        className="p-3 text-brand-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-500/20"
                                        title="Revoke Commission"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {players.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-4 opacity-30">
                                        <Shield size={48} className="text-brand-700" />
                                        <p className="font-black text-brand-600 uppercase tracking-[0.3em] text-xs">No active rosters detected.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-brand-900 w-full max-w-2xl rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-brand-950/50 px-10 py-8 border-b border-white/5 flex justify-between items-center">
                      <div>
                          <h3 className="text-xl font-black text-white italic uppercase tracking-tight" style={{ fontFamily: 'Orbitron' }}>Global <span className="text-gold">Taxonomy</span></h3>
                          <p className="text-[10px] text-brand-500 font-bold uppercase tracking-[0.2em] mt-1">Configure operational sectors & divisions</p>
                      </div>
                      <button onClick={() => setShowConfigModal(false)} className="p-3 hover:bg-white/5 rounded-2xl text-brand-600 hover:text-white transition-all">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex bg-brand-950/30 p-2">
                      <button 
                        onClick={() => setConfigTab('venues')}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-2xl ${configTab === 'venues' ? 'bg-gold text-brand-950 shadow-lg' : 'text-brand-500 hover:text-white hover:bg-white/5'}`}
                      >
                          Sectors (Venues)
                      </button>
                      <button 
                        onClick={() => setConfigTab('batches')}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-2xl ${configTab === 'batches' ? 'bg-gold text-brand-950 shadow-lg' : 'text-brand-500 hover:text-white hover:bg-white/5'}`}
                      >
                          Divisions (Batches)
                      </button>
                  </div>

                  <div className="p-10 h-96 overflow-y-auto custom-scrollbar space-y-8">
                      {/* Add New Section */}
                      <div className="flex gap-3">
                          <input 
                            type="text" 
                            placeholder={`Define new ${configTab === 'venues' ? 'Sector' : 'Division'}...`}
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="flex-1 bg-brand-800 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-brand-700 outline-none focus:border-gold transition-all"
                          />
                          <button 
                            onClick={handleAddItem}
                            disabled={!newItemName.trim()}
                            className="bg-gold text-brand-950 px-8 rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                          >
                              Deploy
                          </button>
                      </div>

                      {/* List Section */}
                      <div className="grid grid-cols-1 gap-3">
                          {(configTab === 'venues' ? venues : batches).map(item => (
                              <div key={item.id} className="flex items-center justify-between p-5 bg-brand-950/30 rounded-[1.5rem] border border-white/5 group hover:border-gold/30 hover:bg-gold/5 transition-all">
                                  {editingItem?.id === item.id ? (
                                      <div className="flex-1 flex gap-2 mr-2">
                                          <input 
                                            autoFocus
                                            type="text" 
                                            value={editingItem.name} 
                                            onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                            className="flex-1 bg-brand-800 border border-gold/50 rounded-xl px-4 py-2 text-sm font-black text-white outline-none"
                                          />
                                          <button onClick={handleUpdateItem} className="p-2 bg-green-500/20 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all"><Check size={18} /></button>
                                          <button onClick={() => setEditingItem(null)} className="p-2 bg-white/5 text-brand-500 rounded-xl hover:bg-white/10 hover:text-white transition-all"><X size={18} /></button>
                                      </div>
                                  ) : (
                                      <span className="font-black text-brand-200 text-xs uppercase tracking-widest">{item.name}</span>
                                  )}
                                  
                                  {editingItem?.id !== item.id && (
                                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                          <button 
                                            onClick={() => setEditingItem(item)}
                                            className="p-2.5 text-brand-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all border border-transparent hover:border-blue-400/20"
                                          >
                                              <Edit2 size={16} />
                                          </button>
                                          <button 
                                            onClick={() => handleSecureDelete(configTab === 'venues' ? 'venue' : 'batch', item.id, item.name)}
                                            className="p-2.5 text-brand-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  )}
                              </div>
                          ))}
                          {(configTab === 'venues' ? venues : batches).length === 0 && (
                              <div className="flex flex-col items-center py-10 opacity-20">
                                  <Layers size={40} className="text-brand-600 mb-4" />
                                  <p className="font-black text-brand-500 uppercase tracking-[0.2em] text-[10px]">No classifications found.</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        title={`Delete ${itemToDelete?.type === 'venue' ? 'Venue' : itemToDelete?.type === 'batch' ? 'Batch' : 'Player'}`}
        message={`Are you sure you want to permanently delete "${itemToDelete?.name}"? This action cannot be undone.`}
        requireTypeToConfirm="delete"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
      />
    </div>
  );
};
