
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Drill, DrillCategory, DrillDifficulty } from '../types';
import { Dumbbell, Plus, Search, Filter, Clock, Users, ClipboardList, Zap, Shield, Target, PlayCircle, X, Trash2, Save, Image as ImageIcon, UploadCloud, Youtube, Video } from 'lucide-react';
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
            {/* Training Ground Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Dumbbell size={220} className="text-brand-500" /></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <span className="px-5 py-2 bg-brand-500 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl shadow-lg italic">Drill Library</span>
                        <span className="text-slate-300 text-[10px] font-black tracking-[0.4em] uppercase italic font-mono">v4.0</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">
                        TRAINING <span className="text-brand-500">GROUND</span>
                    </h1>
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] mt-6 italic">Professional Drill Library • Learning Objectives</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="relative z-10 group/btn flex items-center gap-4 bg-brand-500 text-white px-10 py-5 rounded-2xl hover:scale-105 transition-all shadow-xl shadow-brand-500/20 active:scale-95 font-black text-xs uppercase tracking-widest italic"
                >
                    <Plus size={20} className="transition-transform group-hover/btn:rotate-90" />
                    CREATE DRILL
                </button>
            </div>

            {/* Training Toolbar */}
            <div className="bg-white p-3 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-500 transition-colors w-5 h-5" />
                    <input
                        type="text"
                        placeholder="SEARCH DRILLS..."
                        className="w-full pl-16 pr-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.8rem] outline-none focus:border-brand-500 transition-all text-[11px] font-black text-slate-900 placeholder:text-slate-300 italic tracking-[0.2em] font-mono"
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
                                    ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20'
                                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Drill Library */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredDrills.map(drill => (
                    <div
                        key={drill.id}
                        onClick={() => setSelectedDrill(drill)}
                        className="group bg-white rounded-[2.8rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-brand-500 hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col"
                    >
                        <div className="h-48 bg-slate-100 relative overflow-hidden">
                            {drill.imageUrl ? (
                                <img src={drill.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={drill.title} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                    <ClipboardList className="text-slate-200 w-12 h-12" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                            <div className="absolute top-5 right-5">
                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-xl italic backdrop-blur-md ${getDifficultyColor(drill.difficulty).includes('red') ? 'bg-red-500 text-white border-red-600' : getDifficultyColor(drill.difficulty).includes('yellow') ? 'bg-yellow-500 text-white border-yellow-600' : 'bg-brand-500 text-white border-brand-600'}`}>
                                    {drill.difficulty}
                                </span>
                            </div>
                            {drill.videoUrl && (
                                <div className="absolute bottom-5 left-5 bg-white text-brand-500 px-4 py-2 rounded-xl flex items-center gap-3 text-[9px] font-black uppercase tracking-widest shadow-xl border border-slate-100 italic">
                                    <PlayCircle size={14} className="text-brand-500" /> VIDEO PREVIEW
                                </div>
                            )}
                        </div>
                        <div className="p-10 flex-1 flex flex-col">
                            <div className="flex items-center gap-4 mb-6 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">{getCategoryIcon(drill.category)}</div>
                                {drill.category}
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-4 italic tracking-tighter uppercase leading-tight group-hover:text-brand-500 transition-colors">{drill.title}</h3>
                            <p className="text-[11px] text-slate-400 line-clamp-3 mb-8 flex-1 italic leading-relaxed font-medium">/// {drill.description}</p>

                            <div className="flex items-center justify-between pt-8 border-t border-slate-100 text-[10px] font-black text-slate-300 italic">
                                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 font-mono text-brand-500">
                                    <Clock size={14} /> {drill.duration} <span className="text-[8px] opacity-40 text-slate-400">MIN</span>
                                </div>
                                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 font-mono text-slate-900">
                                    <Users size={14} className="text-brand-500" /> {drill.minPlayers} <span className="text-[8px] opacity-40 text-slate-400">CAP</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Drill Detail Modal */}
            {selectedDrill && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-white w-full max-w-6xl h-[92vh] rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-700 border border-slate-100">
                        {/* Modal Header */}
                        <div className="relative h-64 md:h-80 bg-slate-50 flex-shrink-0 border-b border-slate-100">
                            {selectedDrill.imageUrl && (
                                <img src={selectedDrill.imageUrl} className="w-full h-full object-cover opacity-10" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
                            <button onClick={() => setSelectedDrill(null)} className="absolute top-10 right-10 p-4 bg-white hover:bg-slate-50 text-slate-300 hover:text-slate-900 rounded-2xl transition-all shadow-xl shadow-slate-200/50 border border-slate-100 z-20">
                                <X size={24} />
                            </button>
                            <div className="absolute bottom-0 left-0 p-12 w-full text-left">
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="px-5 py-2 bg-brand-500 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl italic shadow-lg">
                                        {selectedDrill.category}
                                    </span>
                                    <span className="px-5 py-2 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] rounded-xl italic border border-slate-100">
                                        {selectedDrill.difficulty}
                                    </span>
                                </div>
                                <h2 className="text-5xl md:text-7xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">
                                    {selectedDrill.title}
                                </h2>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar-light bg-white">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 p-12">
                                {/* Side Column: Specs & Media */}
                                <div className="lg:col-span-4 space-y-10">
                                    <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                        <h4 className="text-[11px] font-black text-brand-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4 italic">
                                            <Target size={16} /> DRILL INFO
                                        </h4>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center py-4 border-b border-slate-200">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Duration</span>
                                                <span className="text-2xl font-black text-slate-900 font-mono italic">{selectedDrill.duration}<span className="text-[10px] ml-1 opacity-20">MIN</span></span>
                                            </div>
                                            <div className="flex justify-between items-center py-4 border-b border-slate-200">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Min Players</span>
                                                <span className="text-2xl font-black text-slate-900 font-mono italic">{selectedDrill.minPlayers}<span className="text-[10px] ml-1 opacity-20">CAP</span></span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedDrill.videoUrl && (
                                        <div className="rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-slate-100 group relative">
                                            <iframe
                                                src={getYouTubeEmbedUrl(selectedDrill.videoUrl) || ''}
                                                className="w-full aspect-video scale-[1.01]"
                                                title="Drill Video"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    )}

                                    <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                        <h4 className="text-[11px] font-black text-brand-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4 italic">
                                            <Dumbbell size={16} /> REQUIRED GEAR
                                        </h4>
                                        <div className="flex flex-wrap gap-3">
                                            {selectedDrill.equipment.map((item, idx) => (
                                                <span key={idx} className="px-5 py-2.5 bg-white text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-100 italic">
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDeleteClick(selectedDrill.id)}
                                        className="w-full py-5 border-2 border-red-500/10 text-red-500 hover:bg-red-50 hover:border-red-500/30 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all italic shadow-sm"
                                    >
                                        <Trash2 size={16} /> DELETE DRILL
                                    </button>
                                </div>

                                {/* Main Column: Drill Details */}
                                <div className="lg:col-span-8 space-y-12">
                                    <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-[4px] h-full bg-brand-500" />
                                        <h3 className="text-[11px] font-black text-brand-500 uppercase tracking-[0.3em] mb-8 italic">Drill Description</h3>
                                        <p className="text-xl text-slate-600 leading-relaxed italic font-medium">/// {selectedDrill.description}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                                            <h4 className="text-[11px] font-black text-brand-500 uppercase tracking-[0.3em] mb-8 italic">Training Steps</h4>
                                            <ul className="space-y-6">
                                                {selectedDrill.instructions.map((step, idx) => (
                                                    <li key={idx} className="flex gap-6 text-[13px] text-slate-700 italic font-medium leading-relaxed group">
                                                        <span className="flex-shrink-0 w-8 h-8 bg-brand-500 text-white rounded-xl flex items-center justify-center text-[11px] font-black shadow-lg group-hover:scale-110 transition-transform">{idx + 1}</span>
                                                        <span className="pt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">{step}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                                            <h4 className="text-[11px] font-black text-red-500 uppercase tracking-[0.3em] mb-8 italic">Coaching Points</h4>
                                            <ul className="space-y-6">
                                                {selectedDrill.coachingPoints.map((point, idx) => (
                                                    <li key={idx} className="flex gap-6 text-[13px] text-slate-700 italic font-medium leading-relaxed group">
                                                        <span className="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-xl flex items-center justify-center text-[11px] font-black shadow-lg group-hover:scale-110 transition-transform">!</span>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.15)] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]">
                        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center relative bg-slate-50 shrink-0">
                            <h3 className="font-black text-2xl text-slate-900 italic uppercase tracking-tight">Create <span className="text-brand-500">New Drill</span></h3>
                            <button onClick={() => setIsCreating(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-300 transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-10 custom-scrollbar-light space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Drill Title</label>
                                <input 
                                    required 
                                    type="text" 
                                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-black text-slate-900 shadow-sm transition-all placeholder:text-slate-300 uppercase italic text-sm" 
                                    value={newDrill.title} 
                                    onChange={e => setNewDrill({ ...newDrill, title: e.target.value })} 
                                    placeholder="e.g. 3-ZONE TRANSITION GAME" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Category</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-black text-slate-900 shadow-sm appearance-none text-[10px] uppercase italic tracking-widest" 
                                            value={newDrill.category} 
                                            onChange={e => setNewDrill({ ...newDrill, category: e.target.value as any })}
                                        >
                                            <option value="Technical">Technical</option>
                                            <option value="Tactical">Tactical</option>
                                            <option value="Physical">Physical</option>
                                            <option value="Psychosocial">Psychosocial</option>
                                            <option value="Set Pieces">Set Pieces</option>
                                        </select>
                                        <Zap className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-500" size={14} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Difficulty</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-black text-slate-900 shadow-sm appearance-none text-[10px] uppercase italic tracking-widest" 
                                            value={newDrill.difficulty} 
                                            onChange={e => setNewDrill({ ...newDrill, difficulty: e.target.value as any })}
                                        >
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                        </select>
                                        <Shield className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-500" size={14} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Duration (Mins)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-black text-slate-900 shadow-sm text-[10px] uppercase tracking-widest italic" 
                                            value={newDrill.duration} 
                                            onChange={e => setNewDrill({ ...newDrill, duration: parseInt(e.target.value) })} 
                                        />
                                        <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-500" size={14} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Min Players</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-black text-slate-900 shadow-sm text-[10px] uppercase tracking-widest italic" 
                                            value={newDrill.minPlayers} 
                                            onChange={e => setNewDrill({ ...newDrill, minPlayers: parseInt(e.target.value) })} 
                                        />
                                        <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-500" size={14} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Drill Diagram</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-100 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-slate-50 transition-all group min-h-[160px] relative overflow-hidden bg-slate-50 shadow-sm"
                                >
                                    {newDrill.imageUrl ? (
                                        <>
                                            <img src={newDrill.imageUrl} className="absolute inset-0 w-full h-full object-contain p-4 group-hover:opacity-50 transition-opacity" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-slate-900 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 italic bg-white/80 px-4 py-2 rounded-lg border border-slate-100">
                                                    <UploadCloud size={14} /> Change Asset
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-500/10 group-hover:text-brand-500 transition-all text-slate-300 border border-slate-100 shadow-sm">
                                                <UploadCloud size={24} />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors italic">Upload Drill Diagram</p>
                                            <p className="text-[8px] text-slate-300 mt-2 uppercase tracking-tight">Supports WebP, PNG, JPG (High Res Recommended)</p>
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

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <Video size={14} className="text-red-500" /> Demonstration Video URL
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-medium text-slate-900 shadow-sm text-xs italic tracking-wide placeholder:text-slate-300"
                                    value={newDrill.videoUrl}
                                    onChange={e => setNewDrill({ ...newDrill, videoUrl: e.target.value })}
                                    placeholder="https://youtu.be/..."
                                />
                                {formEmbedPreview && (
                                    <div className="mt-4 rounded-xl overflow-hidden aspect-video bg-black w-64 shadow-2xl border border-slate-100 border-l-4 border-l-red-500">
                                        <iframe src={formEmbedPreview} className="w-full h-full" title="Video Preview" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Drill Description</label>
                                <textarea 
                                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-medium text-slate-900 shadow-sm transition-all h-32 placeholder:text-slate-300 text-xs leading-relaxed" 
                                    value={newDrill.description} 
                                    onChange={e => setNewDrill({ ...newDrill, description: e.target.value })} 
                                    placeholder="Overview of the drill and performance targets..." 
                                />
                            </div>

                            {/* Dynamic Lists */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Equipment List</label>
                                    <div className="flex gap-4">
                                        <input 
                                            type="text" 
                                            className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 text-xs italic font-medium outline-none focus:border-brand-500 transition-all" 
                                            value={tempEquip} 
                                            onChange={e => setTempEquip(e.target.value)} 
                                            placeholder="Add item (e.g. Cones, Bibs)..." 
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('equipment', tempEquip, setTempEquip))} 
                                        />
                                        <button type="button" onClick={() => addItem('equipment', tempEquip, setTempEquip)} className="bg-brand-500 text-white px-6 rounded-2xl font-black text-xl hover:scale-110 active:scale-95 transition-all shadow-xl">+</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {newDrill.equipment.map((item, i) => (
                                            <span key={i} className="bg-slate-50 text-slate-500 border border-slate-100 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 italic">
                                                {item} 
                                                <button type="button" onClick={() => removeItem('equipment', i)} className="hover:text-red-500 transition-colors"><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Drill Steps</label>
                                    <div className="flex gap-4">
                                        <input 
                                            type="text" 
                                            className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 text-xs italic font-medium outline-none focus:border-brand-500 transition-all" 
                                            value={tempInstr} 
                                            onChange={e => setTempInstr(e.target.value)} 
                                            placeholder="Add drill step..." 
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('instructions', tempInstr, setTempInstr))} 
                                        />
                                        <button type="button" onClick={() => addItem('instructions', tempInstr, setTempInstr)} className="bg-brand-500 text-white px-6 rounded-2xl font-black text-xl hover:scale-110 active:scale-95 transition-all shadow-xl">+</button>
                                    </div>
                                    <ul className="space-y-2 pt-2">
                                        {newDrill.instructions.map((item, i) => (
                                            <li key={i} className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-4 font-medium italic">
                                                <span className="text-brand-500 font-black text-[10px] bg-white w-6 h-6 rounded-full flex items-center justify-center border border-slate-100 shrink-0">{i + 1}</span> 
                                                {item} 
                                                <button type="button" onClick={() => removeItem('instructions', i)} className="text-slate-300 hover:text-red-500 ml-auto transition-colors p-1"><X size={14} /></button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Coaching Points</label>
                                    <div className="flex gap-4">
                                        <input 
                                            type="text" 
                                            className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 text-xs italic font-medium outline-none focus:border-brand-500 transition-all" 
                                            value={tempPoint} 
                                            onChange={e => setTempPoint(e.target.value)} 
                                            placeholder="Add coaching point..." 
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('coachingPoints', tempPoint, setTempPoint))} 
                                        />
                                        <button type="button" onClick={() => addItem('coachingPoints', tempPoint, setTempPoint)} className="bg-brand-500 text-white px-6 rounded-2xl font-black text-xl hover:scale-110 active:scale-95 transition-all shadow-xl">+</button>
                                    </div>
                                    <ul className="space-y-2 pt-2">
                                        {newDrill.coachingPoints.map((item, i) => (
                                            <li key={i} className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-4 font-medium italic">
                                                <span className="text-red-500 font-black text-sm shrink-0 mt-0.5">•</span> 
                                                {item} 
                                                <button type="button" onClick={() => removeItem('coachingPoints', i)} className="text-slate-300 hover:text-red-500 ml-auto transition-colors p-1"><X size={14} /></button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </form>

                        <div className="px-10 py-8 border-t border-slate-100 bg-slate-50 flex gap-6 shrink-0">
                            <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-4 text-slate-400 font-black hover:text-slate-900 rounded-2xl transition-all text-[10px] uppercase tracking-widest italic">Cancel</button>
                            <button type="submit" onClick={(e) => { e.preventDefault(); handleCreate(e as any); }} className="flex-[2] py-4 bg-brand-500 text-white font-black rounded-2xl shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em] italic flex items-center justify-center gap-3">
                                <Save size={18} strokeWidth={3} /> Save Drill
                            </button>
                        </div>
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
