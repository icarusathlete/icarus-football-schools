
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Drill, DrillCategory, DrillDifficulty } from '../types';
import { Dumbbell, Plus, Search, Filter, Clock, Users, ClipboardList, Zap, Shield, Target, PlayCircle, X, Trash2, Save, Image as ImageIcon, UploadCloud, Youtube } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export const TrainingManager: React.FC = () => {
    const [drills, setDrills] = useState<Drill[]>([]);
    const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<DrillCategory | 'ALL'>('ALL');

    // Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [drillToDelete, setDrillToDelete] = useState<string | null>(null);

    // New Drill Form State
    const [newDrill, setNewDrill] = useState<Omit<Drill, 'id'>>({
        title: '',
        category: 'Technical',
        difficulty: 'Intermediate',
        duration: 15,
        minPlayers: 4,
        description: '',
        equipment: [],
        instructions: [],
        coachingPoints: [],
        imageUrl: '',
        videoUrl: ''
    });

    // Helper for array inputs
    const [tempEquip, setTempEquip] = useState('');
    const [tempInstr, setTempInstr] = useState('');
    const [tempPoint, setTempPoint] = useState('');

    // File Input Ref for Image Upload
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadDrills = () => {
        setDrills(StorageService.getDrills());
    };

    useEffect(() => {
        loadDrills();
    }, []);

    const handleDeleteClick = (id: string) => {
        setDrillToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (drillToDelete) {
            StorageService.deleteDrill(drillToDelete);
            loadDrills();
            if (selectedDrill?.id === drillToDelete) setSelectedDrill(null);
            setDeleteModalOpen(false);
            setDrillToDelete(null);
        }
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        StorageService.addDrill(newDrill);
        loadDrills();
        setIsCreating(false);
        // Reset
        setNewDrill({
            title: '', category: 'Technical', difficulty: 'Intermediate', duration: 15, minPlayers: 4,
            description: '', equipment: [], instructions: [], coachingPoints: [], imageUrl: '', videoUrl: ''
        });
    };

    const addItem = (field: 'equipment' | 'instructions' | 'coachingPoints', value: string, setter: (s: string) => void) => {
        if (!value.trim()) return;
        setNewDrill(prev => ({
            ...prev,
            [field]: [...prev[field], value]
        }));
        setter('');
    };

    const removeItem = (field: 'equipment' | 'instructions' | 'coachingPoints', index: number) => {
        setNewDrill(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewDrill(prev => ({ ...prev, imageUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const filteredDrills = drills.filter(d => {
        const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = filterCategory === 'ALL' || d.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'Advanced': return 'text-red-600 bg-red-50 border-red-100';
            case 'Intermediate': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
            default: return 'text-green-600 bg-green-50 border-green-100';
        }
    };

    const getCategoryIcon = (cat: DrillCategory) => {
        switch (cat) {
            case 'Physical': return <Zap size={14} className="text-yellow-500" />;
            case 'Tactical': return <Shield size={14} className="text-blue-500" />;
            default: return <Target size={14} className="text-green-500" />;
        }
    };

    const getYouTubeEmbedUrl = (url: string | undefined) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?modestbranding=1&rel=0` : null;
    };

    const formEmbedPreview = getYouTubeEmbedUrl(newDrill.videoUrl);

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            {/* Tactical Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 glass-card p-12 rounded-[3.5rem] border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Dumbbell size={220} className="text-brand-400" /></div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <span className="px-5 py-2 bg-brand-500 text-brand-950 text-[10px] font-black uppercase tracking-[0.3em] rounded-xl shadow-lg italic">Tactical Archive</span>
                        <span className="text-white/20 text-[10px] font-black tracking-[0.4em] uppercase italic font-mono">v4.0.0_PRO</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">
                        TRAINING <span className="text-brand-500">GROUND</span>
                    </h1>
                    <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em] mt-6 italic">Advanced Blueprint Library • Tactical Deployment Protocols</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="relative z-10 group/btn flex items-center gap-4 bg-brand-500 text-brand-950 px-10 py-5 rounded-2xl hover:scale-105 transition-all shadow-[0_20px_40px_rgba(0,200,255,0.2)] active:scale-95 font-black text-xs uppercase tracking-widest italic"
                >
                    <Plus size={20} className="transition-transform group-hover/btn:rotate-90" />
                    CREATE BLUEPRINT
                </button>
            </div>

            {/* Tactical Toolbar */}
            <div className="glass-card p-3 rounded-[2.5rem] shadow-2xl border-white/5 flex flex-col md:flex-row gap-4 backdrop-blur-3xl">
                <div className="relative flex-1 group">
                    <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-500 transition-colors w-5 h-5" />
                    <input
                        type="text"
                        placeholder="LOCATE DRILL METADATA..."
                        className="w-full pl-16 pr-8 py-5 bg-white/5 border border-white/5 rounded-[1.8rem] outline-none focus:border-brand-500/50 transition-all text-[11px] font-black text-white placeholder:text-white/10 italic tracking-[0.2em] font-mono"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap gap-2 p-2">
                    {['ALL', 'Technical', 'Tactical', 'Physical', 'Psychosocial'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat as any)}
                            className={`px-8 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border italic ${filterCategory === cat
                                    ? 'bg-brand-500 text-brand-950 border-brand-500 shadow-lg shadow-brand-500/20'
                                    : 'bg-white/5 text-white/30 border-white/5 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Blueprint Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredDrills.map(drill => (
                    <div
                        key={drill.id}
                        onClick={() => setSelectedDrill(drill)}
                        className="group glass-card rounded-[2.8rem] border-white/5 shadow-2xl hover:border-brand-500/50 hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col"
                    >
                        <div className="h-48 bg-brand-950 relative overflow-hidden">
                            {drill.imageUrl ? (
                                <img src={drill.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" alt={drill.title} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-brand-950 opacity-10">
                                    <ClipboardList className="text-white w-12 h-12" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-transparent to-transparent opacity-60" />
                            <div className="absolute top-5 right-5">
                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-2xl italic backdrop-blur-md ${getDifficultyColor(drill.difficulty).includes('red') ? 'bg-red-500/20 text-red-400 border-red-500/30' : getDifficultyColor(drill.difficulty).includes('yellow') ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-brand-500/20 text-brand-400 border-brand-500/30'}`}>
                                    {drill.difficulty}
                                </span>
                            </div>
                            {drill.videoUrl && (
                                <div className="absolute bottom-5 left-5 bg-[#BFFF00] text-brand-950 px-4 py-2 rounded-xl flex items-center gap-3 text-[9px] font-black uppercase tracking-widest shadow-2xl italic">
                                    <PlayCircle size={14} /> FIELD INTEL
                                </div>
                            )}
                        </div>
                        <div className="p-10 flex-1 flex flex-col">
                            <div className="flex items-center gap-4 mb-6 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] italic">
                                <div className="p-2 bg-white/5 rounded-lg border border-white/5">{getCategoryIcon(drill.category)}</div>
                                {drill.category}
                            </div>
                            <h3 className="text-2xl font-black text-white mb-4 italic tracking-tighter uppercase leading-tight group-hover:text-brand-500 transition-colors">{drill.title}</h3>
                            <p className="text-[11px] text-white/40 line-clamp-3 mb-8 flex-1 italic leading-relaxed font-medium">/// {drill.description}</p>

                            <div className="flex items-center justify-between pt-8 border-t border-white/5 text-[10px] font-black text-white/30 italic">
                                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5 font-mono text-brand-500" style={{ fontFamily: 'Orbitron' }}>
                                    <Clock size={14} /> {drill.duration} <span className="text-[8px] opacity-40">MIN</span>
                                </div>
                                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5 font-mono text-white" style={{ fontFamily: 'Orbitron' }}>
                                    <Users size={14} className="text-brand-500" /> {drill.minPlayers} <span className="text-[8px] opacity-40">CAP</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Drill Detail Modal */}
            {selectedDrill && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-brand-950 w-full max-w-6xl h-[92vh] rounded-[4rem] shadow-[0_0_100px_rgba(0,200,255,0.1)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-700 border border-white/10">
                        {/* Modal Header */}
                        <div className="relative h-64 md:h-80 bg-brand-950 flex-shrink-0 border-b border-white/5">
                            {selectedDrill.imageUrl && (
                                <img src={selectedDrill.imageUrl} className="w-full h-full object-cover opacity-30" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/40 to-transparent" />
                            <button onClick={() => setSelectedDrill(null)} className="absolute top-10 right-10 p-4 bg-brand-500 text-brand-950 rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-2xl z-20">
                                <X size={24} />
                            </button>
                            <div className="absolute bottom-0 left-0 p-12 w-full">
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="px-5 py-2 bg-brand-500 text-brand-950 text-[10px] font-black uppercase tracking-[0.3em] rounded-xl italic shadow-lg">
                                        {selectedDrill.category}
                                    </span>
                                    <span className="px-5 py-2 bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] rounded-xl italic border border-white/10">
                                        {selectedDrill.difficulty}
                                    </span>
                                </div>
                                <h2 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">
                                    {selectedDrill.title}
                                </h2>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar-dark bg-brand-950">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 p-12">
                                {/* Side Column: Specs & Media */}
                                <div className="lg:col-span-4 space-y-10">
                                    <div className="glass-card p-10 rounded-[2.5rem] border-white/5 shadow-xl">
                                        <h4 className="text-[11px] font-black text-brand-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4 italic">
                                            <Target size={16} /> TACTICAL SPECS
                                        </h4>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center py-4 border-b border-white/5">
                                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">Duration</span>
                                                <span className="text-2xl font-black text-white font-mono italic" style={{ fontFamily: 'Orbitron' }}>{selectedDrill.duration}<span className="text-[10px] ml-1 opacity-20">MIN</span></span>
                                            </div>
                                            <div className="flex justify-between items-center py-4 border-b border-white/5">
                                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">Min Squad</span>
                                                <span className="text-2xl font-black text-white font-mono italic" style={{ fontFamily: 'Orbitron' }}>{selectedDrill.minPlayers}<span className="text-[10px] ml-1 opacity-20">CAP</span></span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedDrill.videoUrl && (
                                        <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/5 group relative">
                                            <div className="absolute inset-0 bg-brand-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                            <iframe
                                                src={getYouTubeEmbedUrl(selectedDrill.videoUrl) || ''}
                                                className="w-full aspect-video scale-[1.01]"
                                                title="Drill Video"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    )}

                                    <div className="glass-card p-10 rounded-[2.5rem] border-white/5 shadow-xl">
                                        <h4 className="text-[11px] font-black text-brand-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4 italic">
                                            <Dumbbell size={16} /> REQUIRED GEAR
                                        </h4>
                                        <div className="flex flex-wrap gap-3">
                                            {selectedDrill.equipment.map((item, idx) => (
                                                <span key={idx} className="px-5 py-2.5 bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/5 italic">
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDeleteClick(selectedDrill.id)}
                                        className="w-full py-5 border-2 border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all italic"
                                    >
                                        <Trash2 size={16} /> DESTRUCT BLUEPRINT
                                    </button>
                                </div>

                                {/* Main Column: Intel & Analysis */}
                                <div className="lg:col-span-8 space-y-12">
                                    <div className="glass-card p-12 rounded-[3.5rem] border-white/5 shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-[4px] h-full bg-brand-500" />
                                        <h3 className="text-[11px] font-black text-brand-500 uppercase tracking-[0.3em] mb-8 italic">Mission Briefing</h3>
                                        <p className="text-xl text-white/70 leading-relaxed italic font-medium">/// {selectedDrill.description}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="glass-card p-10 rounded-[3rem] border-brand-500/10 bg-brand-500/[0.02]">
                                            <h4 className="text-[11px] font-black text-brand-500 uppercase tracking-[0.3em] mb-8 italic">Deployment Steps</h4>
                                            <ul className="space-y-6">
                                                {selectedDrill.instructions.map((step, idx) => (
                                                    <li key={idx} className="flex gap-6 text-[13px] text-white italic font-medium leading-relaxed group">
                                                        <span className="flex-shrink-0 w-8 h-8 bg-brand-500 text-brand-950 rounded-xl flex items-center justify-center text-[11px] font-black font-mono shadow-lg group-hover:scale-110 transition-transform" style={{ fontFamily: 'Orbitron' }}>{idx + 1}</span>
                                                        <span className="pt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">{step}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="glass-card p-10 rounded-[3rem] border-[#BFFF00]/10 bg-[#BFFF00]/[0.02]">
                                            <h4 className="text-[11px] font-black text-[#BFFF00] uppercase tracking-[0.3em] mb-8 italic">Strategic Focus</h4>
                                            <ul className="space-y-6">
                                                {selectedDrill.coachingPoints.map((point, idx) => (
                                                    <li key={idx} className="flex gap-6 text-[13px] text-white italic font-medium leading-relaxed group">
                                                        <span className="flex-shrink-0 w-8 h-8 bg-[#BFFF00] text-brand-950 rounded-xl flex items-center justify-center text-[11px] font-black shadow-lg group-hover:scale-110 transition-transform">!</span>
                                                        <span className="pt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">{point}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Drill Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-xl text-gray-900">Design New Drill</h3>
                            <button type="button" onClick={() => setIsCreating(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Drill Title</label>
                                <input required type="text" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm font-bold" value={newDrill.title} onChange={e => setNewDrill({ ...newDrill, title: e.target.value })} placeholder="e.g. 3-Zone Transition Game" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Category</label>
                                    <select className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm bg-white" value={newDrill.category} onChange={e => setNewDrill({ ...newDrill, category: e.target.value as any })}>
                                        <option value="Technical">Technical</option>
                                        <option value="Tactical">Tactical</option>
                                        <option value="Physical">Physical</option>
                                        <option value="Psychosocial">Psychosocial</option>
                                        <option value="Set Pieces">Set Pieces</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Difficulty</label>
                                    <select className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm bg-white" value={newDrill.difficulty} onChange={e => setNewDrill({ ...newDrill, difficulty: e.target.value as any })}>
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Duration (Mins)</label>
                                    <input type="number" className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm" value={newDrill.duration} onChange={e => setNewDrill({ ...newDrill, duration: parseInt(e.target.value) })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Min Players</label>
                                    <input type="number" className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm" value={newDrill.minPlayers} onChange={e => setNewDrill({ ...newDrill, minPlayers: parseInt(e.target.value) })} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Drill Diagram / Image (WebP)</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-gray-50 transition-all group min-h-[160px] relative overflow-hidden"
                                >
                                    {newDrill.imageUrl ? (
                                        <>
                                            <img src={newDrill.imageUrl} className="absolute inset-0 w-full h-full object-contain p-2" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-white font-bold text-sm flex items-center gap-2"><UploadCloud size={16} /> Change Image</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors text-gray-400">
                                                <UploadCloud size={24} />
                                            </div>
                                            <p className="text-sm font-bold text-gray-600">Click to upload image</p>
                                            <p className="text-xs text-gray-400 mt-1">Supports WebP, PNG, JPG</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/webp, image/png, image/jpeg, image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Youtube size={14} className="text-red-500" /> Demonstration Video URL
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm font-medium"
                                    value={newDrill.videoUrl}
                                    onChange={e => setNewDrill({ ...newDrill, videoUrl: e.target.value })}
                                    placeholder="https://youtu.be/..."
                                />
                                {formEmbedPreview && (
                                    <div className="mt-2 rounded-lg overflow-hidden aspect-video bg-black w-32 shadow-md">
                                        <iframe src={formEmbedPreview} className="w-full h-full" title="Video Preview" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Description</label>
                                <textarea className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm h-24" value={newDrill.description} onChange={e => setNewDrill({ ...newDrill, description: e.target.value })} placeholder="Overview of the drill..." />
                            </div>

                            {/* Dynamic Lists */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Equipment Needed</label>
                                <div className="flex gap-2 mb-2">
                                    <input type="text" className="flex-1 p-2 border border-gray-200 rounded-lg text-sm" value={tempEquip} onChange={e => setTempEquip(e.target.value)} placeholder="Add item..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('equipment', tempEquip, setTempEquip))} />
                                    <button type="button" onClick={() => addItem('equipment', tempEquip, setTempEquip)} className="bg-gray-100 px-4 rounded-lg font-bold text-gray-600">+</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {newDrill.equipment.map((item, i) => (
                                        <span key={i} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs flex items-center gap-1">{item} <button type="button" onClick={() => removeItem('equipment', i)}><X size={10} /></button></span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Instructions (Step by Step)</label>
                                <div className="flex gap-2 mb-2">
                                    <input type="text" className="flex-1 p-2 border border-gray-200 rounded-lg text-sm" value={tempInstr} onChange={e => setTempInstr(e.target.value)} placeholder="Add step..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('instructions', tempInstr, setTempInstr))} />
                                    <button type="button" onClick={() => addItem('instructions', tempInstr, setTempInstr)} className="bg-blue-50 px-4 rounded-lg font-bold text-blue-600">+</button>
                                </div>
                                <ul className="space-y-1">
                                    {newDrill.instructions.map((item, i) => (
                                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-gray-400 font-mono">{i + 1}.</span> {item} <button type="button" onClick={() => removeItem('instructions', i)} className="text-red-400 ml-auto"><X size={12} /></button></li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Coaching Points</label>
                                <div className="flex gap-2 mb-2">
                                    <input type="text" className="flex-1 p-2 border border-gray-200 rounded-lg text-sm" value={tempPoint} onChange={e => setTempPoint(e.target.value)} placeholder="Add key point..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('coachingPoints', tempPoint, setTempPoint))} />
                                    <button type="button" onClick={() => addItem('coachingPoints', tempPoint, setTempPoint)} className="bg-green-50 px-4 rounded-lg font-bold text-green-600">+</button>
                                </div>
                                <ul className="space-y-1">
                                    {newDrill.coachingPoints.map((item, i) => (
                                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-green-500 font-bold">•</span> {item} <button type="button" onClick={() => removeItem('coachingPoints', i)} className="text-red-400 ml-auto"><X size={12} /></button></li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50">
                                <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition-colors text-sm">Cancel</button>
                                <button type="submit" className="px-8 py-3 bg-brand-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all text-sm uppercase tracking-wider flex items-center gap-2">
                                    <Save size={16} /> Save Drill
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModalOpen}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setDrillToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Drill"
                message="Are you sure you want to delete this drill? This action cannot be undone."
                confirmText="Delete"
                type="danger"
            />
        </div>
    );
};
