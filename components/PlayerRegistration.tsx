
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
    w-full rounded-xl border-2 p-3.5 text-sm outline-none transition-all duration-300 font-medium 
    ${errors[field] 
        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50 text-red-900 placeholder:text-red-300 animate-shake' 
        : 'border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 text-gray-800 placeholder:text-gray-300 bg-white'
    }
  `;

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-8">
        
        {/* Mode Switcher */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-2">
            <button 
                onClick={() => setMode('player')}
                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl transition-all duration-300 ${mode === 'player' ? 'bg-brand-900 text-white shadow-md' : 'hover:bg-gray-50 text-gray-500'}`}
            >
                <User size={20} />
                <div className="text-left">
                    <div className="font-black uppercase tracking-wider text-xs">Student Athlete</div>
                    <div className="text-[10px] opacity-70">New Player Registration</div>
                </div>
            </button>
            <button 
                onClick={() => setMode('coach')}
                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl transition-all duration-300 ${mode === 'coach' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-50 text-gray-500'}`}
            >
                <UserCheck size={20} />
                <div className="text-left">
                    <div className="font-black uppercase tracking-wider text-xs">Coaching Staff</div>
                    <div className="text-[10px] opacity-70">Staff Onboarding & Access</div>
                </div>
            </button>
        </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
        
        {/* Status Notification Overlay */}
        {(status === 'success' || status === 'error') && (
             <div className={`
                absolute top-0 left-0 right-0 z-50 p-4 text-center font-bold tracking-wide shadow-lg flex items-center justify-center gap-3 animate-in slide-in-from-top duration-500
                ${status === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
             `}>
                 {status === 'success' ? (
                     <Check size={20} className="bg-white text-green-500 rounded-full p-0.5" />
                 ) : (
                     <AlertCircle size={20} className="bg-white text-red-500 rounded-full p-0.5" />
                 )}
                 {statusMsg}
             </div>
        )}

        {/* Header Section */}
        <div className={`relative px-8 py-10 md:py-14 text-white overflow-hidden transition-colors duration-500 ${mode === 'coach' ? 'bg-blue-900' : 'bg-brand-900'}`}>
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 text-cyan-400 font-bold uppercase tracking-widest text-xs">
                <Shield size={14} /> Official Registration
              </div>
              <h2 className="text-4xl font-black italic tracking-tighter" style={{ fontFamily: 'Orbitron' }}>
                {mode === 'player' ? 'ATHLETE ' : 'COACH '} 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                    {mode === 'player' ? 'ENROLLMENT' : 'ONBOARDING'}
                </span>
              </h2>
              <p className="text-white/70 text-sm mt-2 font-medium max-w-lg">
                  {mode === 'player' 
                    ? 'Register a new player to the Icarus database. Updates rosters instantly.' 
                    : 'Create access credentials for coaching staff and assign their squads.'}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-3">
                {mode === 'player' && (
                    <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex flex-col items-end shadow-xl">
                        <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest mb-1">Assigned Member ID</span>
                        <span className="text-3xl font-black tracking-tighter text-white font-mono">{nextId}</span>
                    </div>
                )}
                <button 
                    onClick={() => setShowConfigModal(true)}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors text-gray-300 hover:text-white"
                >
                    <Settings size={14} /> Manage Venues & Batches
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
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 hover:bg-cyan-500/30 px-4 py-2 rounded-xl transition-colors text-cyan-100 border border-cyan-500/30 disabled:opacity-50"
                        >
                            <FileText size={14} /> Bulk Upload CSV
                        </button>
                    </>
                )}
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
                        <div className="lg:col-span-4 flex flex-col items-center gap-6">
                        <div className="relative group">
                            <div className={`
                                w-56 h-56 rounded-[2.5rem] bg-gray-50 border-4 border-dashed flex items-center justify-center overflow-hidden transition-all duration-300 
                                ${previewUrl ? 'border-transparent shadow-2xl' : 'border-gray-200 group-hover:border-cyan-400'}
                            `}>
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-gray-300 group-hover:text-cyan-500 transition-colors">
                                    <div className="p-4 bg-white rounded-full shadow-sm">
                                        <Camera size={32} strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Upload Photo</span>
                                    </div>
                                )}
                            </div>
                            <label className="absolute -bottom-4 -right-4 cursor-pointer bg-brand-900 text-white p-4 rounded-2xl shadow-xl hover:bg-black transition-all hover:scale-110 active:scale-95 group-hover:animate-bounce">
                                <Upload size={20} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                        <div className="text-center">
                            <h4 className="font-bold text-gray-900 text-sm">Profile Picture</h4>
                            <p className="text-xs text-gray-400 mt-1 max-w-[180px]">Required for ID cards and scout reports.</p>
                        </div>
                        </div>

                        {/* Right Column: Details */}
                        <div className="lg:col-span-8 space-y-10">
                        {/* Section: Student Athlete */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><User size={18} /></div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Athlete Information</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 group">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 group-focus-within:text-cyan-600 transition-colors ml-1 uppercase tracking-wider">
                                    Full Name {errors.fullName && <span className="text-red-500 normal-case tracking-normal ml-auto text-[10px] bg-red-50 px-2 py-0.5 rounded-full">{errors.fullName}</span>}
                                </label>
                                <div className="relative">
                                    <User size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.fullName ? 'text-red-400' : 'text-gray-400 group-focus-within:text-cyan-500'}`} />
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
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 group-focus-within:text-cyan-600 transition-colors ml-1 uppercase tracking-wider">
                                    Date of Birth {errors.dateOfBirth && <span className="text-red-500 normal-case tracking-normal ml-auto text-[10px] bg-red-50 px-2 py-0.5 rounded-full">{errors.dateOfBirth}</span>}
                                </label>
                                <div className="relative">
                                    <Calendar size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.dateOfBirth ? 'text-red-400' : 'text-gray-400 group-focus-within:text-cyan-500'}`} />
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

                            <div className="space-y-2 md:col-span-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider mb-2">
                                    Primary Position
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {['Forward', 'Midfielder', 'Defender', 'Goalkeeper', 'TBD'].map(pos => (
                                    <button
                                    key={pos}
                                    type="button"
                                    onClick={() => setFormData({...formData, position: pos as any})}
                                    className={`
                                        py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all duration-200 flex flex-col items-center gap-1
                                        ${formData.position === pos 
                                        ? 'bg-brand-900 border-brand-900 text-white shadow-lg shadow-brand-900/20 scale-105' 
                                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50'
                                        }
                                    `}
                                    >
                                    <Briefcase size={14} className={formData.position === pos ? 'text-cyan-400' : 'text-gray-300'} />
                                    {pos}
                                    </button>
                                ))}
                                </div>
                            </div>
                            </div>
                        </div>

                        {/* Section: Training Assignment */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600"><Layers size={18} /></div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Training Assignment</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 group">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 group-focus-within:text-purple-600 transition-colors ml-1 uppercase tracking-wider">
                                        Training Venue
                                    </label>
                                    <div className="relative">
                                        <Map size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                        <select 
                                            value={formData.venue}
                                            onChange={e => setFormData({...formData, venue: e.target.value})}
                                            className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-800 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all appearance-none"
                                        >
                                            <option value="" disabled>Select Venue</option>
                                            {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 group">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 group-focus-within:text-purple-600 transition-colors ml-1 uppercase tracking-wider">
                                        Assigned Batch
                                    </label>
                                    <div className="relative">
                                        <Layers size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                        <select 
                                            value={formData.batch}
                                            onChange={e => setFormData({...formData, batch: e.target.value})}
                                            className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-800 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all appearance-none"
                                        >
                                            <option value="" disabled>Select Batch</option>
                                            {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Guardian Contact */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600"><Phone size={18} /></div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Guardian Contact</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 group">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 group-focus-within:text-green-600 transition-colors ml-1 uppercase tracking-wider">
                                    Guardian Name {errors.parentName && <span className="text-red-500 normal-case tracking-normal ml-auto text-[10px] bg-red-50 px-2 py-0.5 rounded-full">{errors.parentName}</span>}
                                </label>
                                <div className="relative">
                                    <User size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.parentName ? 'text-red-400' : 'text-gray-400 group-focus-within:text-green-500'}`} />
                                    <input
                                        type="text"
                                        className={`${getInputClass('parentName')} pl-11 focus:border-green-500 focus:ring-green-500/10`}
                                        value={formData.parentName}
                                        onChange={e => {
                                            setFormData({...formData, parentName: e.target.value});
                                            if (errors.parentName) setErrors({...errors, parentName: ''});
                                        }}
                                        placeholder="Name of parent"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 group">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 group-focus-within:text-green-600 transition-colors ml-1 uppercase tracking-wider">
                                    Mobile Number {errors.contactNumber && <span className="text-red-500 normal-case tracking-normal ml-auto text-[10px] bg-red-50 px-2 py-0.5 rounded-full">{errors.contactNumber}</span>}
                                </label>
                                <div className="relative">
                                <Phone size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.contactNumber ? 'text-red-400' : 'text-gray-400 group-focus-within:text-green-500'}`} />
                                <input
                                    type="tel"
                                    className={`${getInputClass('contactNumber')} pl-11 focus:border-green-500 focus:ring-green-500/10`}
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
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 group-focus-within:text-green-600 transition-colors ml-1 uppercase tracking-wider">
                                    Address
                                </label>
                                <div className="relative">
                                <MapPin size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-gray-400 group-focus-within:text-green-500`} />
                                <input
                                    type="text"
                                    className={`${getInputClass('address')} pl-11 focus:border-green-500 focus:ring-green-500/10`}
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                    placeholder="House No, Street, City"
                                />
                                </div>
                            </div>
                            </div>
                        </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-6">
                        <p className="text-xs text-gray-400 flex items-center gap-2 italic">
                        <Shield size={12} /> Data is securely stored locally on this device.
                        </p>
                        <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="w-full md:w-auto bg-gradient-to-r from-brand-900 to-blue-900 hover:from-black hover:to-black text-white font-black py-4 px-12 rounded-2xl shadow-xl shadow-brand-900/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center space-x-3 uppercase tracking-widest text-xs disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        style={{ fontFamily: 'Orbitron' }}
                        >
                        {status === 'submitting' ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Confirm Registration</span>
                            </>
                        )}
                        </button>
                    </div>
                </form>
            ) : (
                /* COACH ONBOARDING FORM */
                <form onSubmit={handleCoachSubmit} className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                            <UserCheck size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Staff Credentials</h3>
                        <p className="text-gray-500 text-sm mt-1">Create login and assign permissions</p>
                    </div>

                    {/* Coach Profile Image Upload */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                            <div className={`
                                w-32 h-32 rounded-full bg-gray-50 border-4 border-dashed flex items-center justify-center overflow-hidden transition-all duration-300 
                                ${coachPreviewUrl ? 'border-transparent shadow-xl' : 'border-gray-200 group-hover:border-blue-400'}
                            `}>
                                {coachPreviewUrl ? (
                                    <img src={coachPreviewUrl} alt="Coach Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera size={24} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 cursor-pointer bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 active:scale-95">
                                <Upload size={16} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleCoachFileChange} />
                            </label>
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Coach Profile Photo</span>
                    </div>

                    <div className="space-y-6 bg-gray-50 p-8 rounded-3xl border border-gray-100">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Coach Name / Username</label>
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    required
                                    type="text" 
                                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                                    placeholder="e.g. Coach David"
                                    value={coachForm.username}
                                    onChange={e => setCoachForm({...coachForm, username: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative">
                                <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    required
                                    type="text" 
                                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                                    placeholder="Set temporary password..."
                                    value={coachForm.password}
                                    onChange={e => setCoachForm({...coachForm, password: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                                <MapPin size={14} className="text-blue-500" /> Venue Assignment
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {venues.map(v => (
                                    <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => toggleCoachAssignment('venue', v.name)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                            coachForm.assignedVenues.includes(v.name)
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {v.name}
                                        {coachForm.assignedVenues.includes(v.name) && <Check size={12} className="inline ml-1.5" />}
                                    </button>
                                ))}
                                {venues.length === 0 && <span className="text-xs text-gray-400 italic">No venues configured.</span>}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                                <Layers size={14} className="text-purple-500" /> Batch Assignment
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {batches.map(b => (
                                    <button
                                        key={b.id}
                                        type="button"
                                        onClick={() => toggleCoachAssignment('batch', b.name)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                            coachForm.assignedBatches.includes(b.name)
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {b.name}
                                        {coachForm.assignedBatches.includes(b.name) && <Check size={12} className="inline ml-1.5" />}
                                    </button>
                                ))}
                                {batches.length === 0 && <span className="text-xs text-gray-400 italic">No batches configured.</span>}
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={status === 'submitting'}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-70 disabled:transform-none"
                        >
                            {status === 'submitting' ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                            {status === 'submitting' ? 'Creating Account...' : 'Complete Onboarding'}
                        </button>
                    </div>
                </form>
            )}
        </div>
      </div>

      {/* Registered Squad List (Only visible in Player Mode) */}
      {mode === 'player' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Registered Squad</h3>
                <span className="text-xs font-bold bg-white border px-3 py-1 rounded-full text-gray-600 shadow-sm">{players.length} Players</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Player</th>
                            <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider">ID</th>
                            <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Venue / Batch</th>
                            <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Position</th>
                            <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {players.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <img src={p.photoUrl} className="w-8 h-8 rounded-full bg-gray-100 object-cover" />
                                    <span className="font-bold text-gray-900">{p.fullName}</span>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-gray-500">{p.memberId}</td>
                                <td className="px-6 py-4">
                                    <div className="text-xs text-gray-800 font-bold">{p.venue || '-'}</div>
                                    <div className="text-[10px] text-gray-400 uppercase">{p.batch || '-'}</div>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold uppercase text-gray-400">{p.position}</td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleSecureDelete('player', p.id, p.fullName)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Player"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {players.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-400">No players registered yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-xl text-gray-900">Manage Configurations</h3>
                          <p className="text-xs text-gray-500">Add or remove training locations and batches</p>
                      </div>
                      <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex border-b border-gray-100">
                      <button 
                        onClick={() => setConfigTab('venues')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${configTab === 'venues' ? 'text-brand-600 border-b-2 border-brand-600 bg-white' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                      >
                          Venues
                      </button>
                      <button 
                        onClick={() => setConfigTab('batches')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${configTab === 'batches' ? 'text-brand-600 border-b-2 border-brand-600 bg-white' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                      >
                          Batches
                      </button>
                  </div>

                  <div className="p-8 h-96 overflow-y-auto custom-scrollbar">
                      {/* Add New Section */}
                      <div className="flex gap-2 mb-6">
                          <input 
                            type="text" 
                            placeholder={`New ${configTab === 'venues' ? 'Venue Name' : 'Batch Name'}...`}
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-brand-500 transition-all text-sm font-medium"
                          />
                          <button 
                            onClick={handleAddItem}
                            disabled={!newItemName.trim()}
                            className="bg-brand-900 text-white px-6 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-black transition-colors disabled:opacity-50"
                          >
                              Add
                          </button>
                      </div>

                      {/* List Section */}
                      <div className="space-y-3">
                          {(configTab === 'venues' ? venues : batches).map(item => (
                              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:border-gray-300 transition-colors">
                                  {editingItem?.id === item.id ? (
                                      <div className="flex-1 flex gap-2 mr-2">
                                          <input 
                                            autoFocus
                                            type="text" 
                                            value={editingItem.name} 
                                            onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                            className="flex-1 px-3 py-1.5 border border-brand-300 rounded-lg text-sm font-bold outline-none"
                                          />
                                          <button onClick={handleUpdateItem} className="p-1.5 bg-green-500 text-white rounded-lg"><Check size={16} /></button>
                                          <button onClick={() => setEditingItem(null)} className="p-1.5 bg-gray-300 text-gray-700 rounded-lg"><X size={16} /></button>
                                      </div>
                                  ) : (
                                      <span className="font-bold text-gray-700 text-sm">{item.name}</span>
                                  )}
                                  
                                  {editingItem?.id !== item.id && (
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => setEditingItem(item)}
                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                          >
                                              <Edit2 size={16} />
                                          </button>
                                          <button 
                                            onClick={() => handleSecureDelete(configTab === 'venues' ? 'venue' : 'batch', item.id, item.name)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  )}
                              </div>
                          ))}
                          {(configTab === 'venues' ? venues : batches).length === 0 && (
                              <p className="text-center text-gray-400 text-sm py-8">No items found.</p>
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
