
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

    const addItem = (field: 'equipment' | 'instructions' | 'coachingPoints', value: string, setter: (s:string)=>void) => {
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
                setNewDrill(prev => ({...prev, imageUrl: reader.result as string}));
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
        switch(diff) {
            case 'Advanced': return 'text-red-600 bg-red-50 border-red-100';
            case 'Intermediate': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
            default: return 'text-green-600 bg-green-50 border-green-100';
        }
    };

    const getCategoryIcon = (cat: DrillCategory) => {
        switch(cat) {
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
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-brand-500 p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><Dumbbell size={160} className="text-white" /></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                        TRAINING <span className="text-brand-950">GROUND</span>
                    </h1>
                    <p className="text-white/80 font-black uppercase text-[10px] tracking-[0.3em] mt-3 italic">
                        Advanced Drill Library & Tactical Academy Resources
                    </p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="relative z-10 flex items-center gap-2 bg-white text-brand-950 px-8 py-4 rounded-xl hover:scale-105 transition-all shadow-xl active:scale-95 font-black text-xs uppercase tracking-widest italic"
                >
                    <Plus size={18} />
                    NEW DRILL
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-5 rounded-[2rem] shadow-xl border border-brand-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-300 group-focus-within:text-brand-950 transition-colors w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="SEARCH DRILLS..." 
                        className="w-full pl-14 pr-6 py-4 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:border-brand-500 transition-all text-[11px] font-black text-brand-950 placeholder:text-brand-200 italic tracking-widest"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                    {['ALL', 'Technical', 'Tactical', 'Physical', 'Psychosocial'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat as any)}
                            className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border italic ${
                                filterCategory === cat 
                                ? 'bg-brand-500 text-brand-950 border-brand-500 shadow-lg' 
                                : 'bg-brand-50 text-brand-400 border-brand-100 hover:text-brand-950 hover:bg-white'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDrills.map(drill => (
                    <div 
                        key={drill.id}
                        onClick={() => setSelectedDrill(drill)}
                        className="group bg-white rounded-[2.5rem] border border-brand-100 shadow-xl hover:border-brand-500 hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col"
                    >
                        <div className="h-44 bg-brand-50 relative overflow-hidden border-b border-brand-100">
                            {drill.imageUrl ? (
                                <img src={drill.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={drill.title} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-brand-50">
                                    <ClipboardList className="text-brand-200 w-12 h-12" />
                                </div>
                            )}
                            <div className="absolute top-4 right-4 shadow-3xl">
                                <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border shadow-2xl italic ${getDifficultyColor(drill.difficulty)}`}>
                                    {drill.difficulty}
                                </span>
                            </div>
                            {drill.videoUrl && (
                                <div className="absolute bottom-4 left-4 bg-brand-500 text-brand-950 px-3 py-1.5 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-2xl italic">
                                    <PlayCircle size={14} /> WATCH
                                </div>
                            )}
                        </div>
                        <div className="p-8 flex-1 flex flex-col">
                            <div className="flex items-center gap-3 mb-4 text-[9px] font-black text-brand-400 uppercase tracking-widest italic">
                                {getCategoryIcon(drill.category)}
                                {drill.category}
                            </div>
                            <h3 className="text-xl font-black text-brand-950 mb-3 italic tracking-tight uppercase leading-tight group-hover:text-brand-500 transition-colors">{drill.title}</h3>
                            <p className="text-xs text-brand-400 line-clamp-2 mb-6 flex-1 italic leading-relaxed">{drill.description}</p>
                            
                            <div className="flex items-center justify-between pt-6 border-t border-brand-50 text-[10px] font-black text-brand-300 italic">
                                <div className="flex items-center gap-2 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100">
                                    <Clock size={14} /> {drill.duration} MINS
                                </div>
                                <div className="flex items-center gap-2 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100">
                                    <Users size={14} /> {drill.minPlayers}+ PLAYERS
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Drill Detail Modal */}
            {selectedDrill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/90 backdrop-blur-xl animate-in fade-in">
                    <div className="bg-brand-500/10 backdrop-blur-3xl w-full max-w-4xl h-[90vh] rounded-[4rem] shadow-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-700 border border-brand-500/30">
                        {/* Modal Header */}
                        <div className="relative h-48 md:h-64 bg-brand-950 flex-shrink-0">
                            {selectedDrill.imageUrl && (
                                <img src={selectedDrill.imageUrl} className="w-full h-full object-cover opacity-40" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-transparent to-transparent" />
                            <button onClick={() => setSelectedDrill(null)} className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-white hover:text-black text-white rounded-full transition-all backdrop-blur-sm z-20">
                                <X size={24} />
                            </button>
                            <div className="absolute bottom-0 left-0 p-8 w-full">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-3 py-1 bg-brand-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg">
                                        {selectedDrill.category}
                                    </span>
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-white/20">
                                        {selectedDrill.difficulty}
                                    </span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-white italic tracking-tight uppercase" style={{fontFamily: 'Orbitron'}}>
                                    {selectedDrill.title}
                                </h2>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
                                {/* Left Column: Info & Equipment */}
                                <div className="space-y-8">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <PlayCircle size={16} className="text-brand-500" /> Drill Specs
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                                                <span className="text-xs font-bold text-gray-400 uppercase">Duration</span>
                                                <span className="text-sm font-bold text-gray-800">{selectedDrill.duration} Mins</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                                                <span className="text-xs font-bold text-gray-400 uppercase">Min Players</span>
                                                <span className="text-sm font-bold text-gray-800">{selectedDrill.minPlayers}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedDrill.videoUrl && (
                                        <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                                            <iframe 
                                                src={getYouTubeEmbedUrl(selectedDrill.videoUrl) || ''} 
                                                className="w-full aspect-video" 
                                                title="Drill Video"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    )}

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Dumbbell size={16} className="text-brand-500" /> Equipment
                                        </h4>
                                        <ul className="space-y-2">
                                            {selectedDrill.equipment.map((item, idx) => (
                                                <li key={idx} className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <button 
                                        onClick={() => handleDeleteClick(selectedDrill.id)}
                                        className="w-full py-3 border-2 border-red-100 text-red-500 hover:bg-red-50 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Trash2 size={16} /> Delete Drill
                                    </button>
                                </div>

                                {/* Right Column: Description & Coaching Points */}
                                <div className="md:col-span-2 space-y-8">
                                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Description</h3>
                                        <p className="text-gray-600 leading-relaxed">{selectedDrill.description}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                                            <h4 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-4">Instructions</h4>
                                            <ul className="space-y-3">
                                                {selectedDrill.instructions.map((step, idx) => (
                                                    <li key={idx} className="flex gap-3 text-sm text-blue-900 font-medium">
                                                        <span className="flex-shrink-0 w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                                                        {step}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
                                            <h4 className="text-sm font-black text-green-800 uppercase tracking-widest mb-4">Coaching Points</h4>
                                            <ul className="space-y-3">
                                                {selectedDrill.coachingPoints.map((point, idx) => (
                                                    <li key={idx} className="flex gap-3 text-sm text-green-900 font-medium">
                                                        <span className="flex-shrink-0 w-5 h-5 bg-green-200 text-green-700 rounded-full flex items-center justify-center text-[10px] font-black">!</span>
                                                        {point}
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
                                <input required type="text" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm font-bold" value={newDrill.title} onChange={e => setNewDrill({...newDrill, title: e.target.value})} placeholder="e.g. 3-Zone Transition Game"/>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Category</label>
                                    <select className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm bg-white" value={newDrill.category} onChange={e => setNewDrill({...newDrill, category: e.target.value as any})}>
                                        <option value="Technical">Technical</option>
                                        <option value="Tactical">Tactical</option>
                                        <option value="Physical">Physical</option>
                                        <option value="Psychosocial">Psychosocial</option>
                                        <option value="Set Pieces">Set Pieces</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Difficulty</label>
                                    <select className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm bg-white" value={newDrill.difficulty} onChange={e => setNewDrill({...newDrill, difficulty: e.target.value as any})}>
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Duration (Mins)</label>
                                    <input type="number" className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm" value={newDrill.duration} onChange={e => setNewDrill({...newDrill, duration: parseInt(e.target.value)})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Min Players</label>
                                    <input type="number" className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm" value={newDrill.minPlayers} onChange={e => setNewDrill({...newDrill, minPlayers: parseInt(e.target.value)})} />
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
                                                <p className="text-white font-bold text-sm flex items-center gap-2"><UploadCloud size={16}/> Change Image</p>
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
                                    onChange={e => setNewDrill({...newDrill, videoUrl: e.target.value})} 
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
                                <textarea className="w-full p-3 border border-gray-200 rounded-xl outline-none text-sm h-24" value={newDrill.description} onChange={e => setNewDrill({...newDrill, description: e.target.value})} placeholder="Overview of the drill..." />
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
                                        <span key={i} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs flex items-center gap-1">{item} <button type="button" onClick={() => removeItem('equipment', i)}><X size={10}/></button></span>
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
                                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-gray-400 font-mono">{i+1}.</span> {item} <button type="button" onClick={() => removeItem('instructions', i)} className="text-red-400 ml-auto"><X size={12}/></button></li>
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
                                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-green-500 font-bold">•</span> {item} <button type="button" onClick={() => removeItem('coachingPoints', i)} className="text-red-400 ml-auto"><X size={12}/></button></li>
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
