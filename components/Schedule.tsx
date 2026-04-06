import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { ScheduleEvent, Role, Drill, User, EventType } from '../types';
import { 
    Calendar as CalendarIcon, Clock, MapPin, Plus, MonitorPlay, 
    Users, Coffee, Edit3, Trash2, X, Save, Trophy, ArrowRight, 
    ClipboardList, Check, User as UserIcon, Filter, Zap, 
    PartyPopper, ChevronRight, ChevronLeft, LayoutList, Calendar, History
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface ScheduleProps {
  role: Role;
}

export const Schedule: React.FC<ScheduleProps> = ({ role }) => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | EventType>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Modal State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '17:00',
    type: 'training' as EventType,
    location: '',
    drillIds: [] as string[],
    leadCoachId: ''
  });

  const loadData = () => {
    const allEvents = StorageService.getSchedule();
    allEvents.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    setEvents(allEvents);
    setDrills(StorageService.getDrills());
    const allUsers = StorageService.getUsers();
    setCoaches(allUsers.filter(u => u.role === 'coach'));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('academy_data_update', loadData);
    return () => window.removeEventListener('academy_data_update', loadData);
  }, []);

  const handleCreate = () => {
      setEditingId(null);
      setForm({ title: '', date: new Date().toISOString().split('T')[0], time: '17:00', type: activeTab === 'all' ? 'training' : activeTab, location: '', drillIds: [], leadCoachId: '' });
      setShowForm(true);
  };

  const handleEdit = (event: ScheduleEvent) => {
      setEditingId(event.id);
      setForm({
          title: event.title,
          date: event.date,
          time: event.time,
          type: event.type,
          location: event.location,
          drillIds: event.drillIds || [],
          leadCoachId: event.leadCoachId || ''
      });
      setShowForm(true);
  };

  const handleDeleteClick = (id: string) => {
      setEventToDelete(id);
      setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
      if (eventToDelete) {
          StorageService.deleteEvent(eventToDelete);
          loadData();
          setDeleteModalOpen(false);
      }
  };

  const toggleDrill = (drillId: string) => {
      setForm(prev => {
          const current = prev.drillIds;
          if (current.includes(drillId)) {
              return { ...prev, drillIds: current.filter(id => id !== drillId) };
          } else {
              return { ...prev, drillIds: [...current, drillId] };
          }
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        const eventToUpdate = events.find(e => e.id === editingId);
        if (eventToUpdate) StorageService.updateEvent({ ...eventToUpdate, ...form });
    } else {
        StorageService.addEvent(form);
    }
    loadData();
    setShowForm(false);
  };

  const isEventPast = (date: string, time: string) => {
      const eventDate = new Date(`${date}T${time}`);
      return new Date() > eventDate;
  };

  const filteredEvents = events.filter(e => activeTab === 'all' || e.type === activeTab);

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const changeMonth = (offset: number) => {
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
      setCurrentMonth(nextMonth);
  };

  const getTypeStyles = (type: EventType) => {
      switch(type) {
          case 'match': return { border: 'border-l-brand-500', bg: 'bg-brand-500/10', text: 'text-brand-950', icon: <Trophy size={14} className="text-brand-500" />, dot: 'bg-brand-500' };
          case 'social': return { border: 'border-l-lime', bg: 'bg-lime/10', text: 'text-brand-950', icon: <PartyPopper size={14} className="text-lime" />, dot: 'bg-lime' };
          default: return { border: 'border-l-brand-400', bg: 'bg-brand-50', text: 'text-brand-950', icon: <Zap size={14} className="text-brand-500" />, dot: 'bg-brand-500' };
      }
  };

  const CalendarView = () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const firstDay = getFirstDayOfMonth(year, month);
      const days = [];

      // Empty cells for first week
      for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-brand-900/20 border border-white/5" />);

      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayEvents = events.filter(e => e.date === dateStr);
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          days.push(
              <div key={d} className={`h-24 md:h-36 p-2 md:p-3 border border-brand-100 transition-all hover:bg-brand-50 relative overflow-hidden group/day ${isToday ? 'bg-brand-50' : 'bg-white'}`}>
                  <div className="flex justify-between items-center mb-2">
                      <span className={`text-xs font-black italic ${isToday ? 'text-brand-500' : 'text-brand-950'}`}>{d}</span>
                      {isToday && <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest italic">Live Day</span>}
                  </div>
                  <div className="space-y-1.5 overflow-y-auto max-h-[80%] custom-scrollbar relative z-10">
                      {dayEvents.map(e => {
                          const s = getTypeStyles(e.type);
                          return (
                              <div key={e.id} onClick={() => handleEdit(e)} className={`px-2 py-1.5 rounded-lg text-[9px] font-black truncate cursor-pointer ${s.bg} ${s.text} border-l-2 ${s.border} hover:scale-[1.02] transition-transform flex items-center gap-1.5 italic`}>
                                  <div className={`w-1 h-1 rounded-full ${s.dot}`} />
                                  {e.title}
                              </div>
                          );
                      })}
                  </div>
                  {isToday && <div className="absolute inset-0 border-2 border-brand-500/50 pointer-events-none" />}
              </div>
          );
      }

      return (
          <div className="bg-white rounded-[3rem] border border-brand-100 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-500">
              <div className="p-8 border-b border-brand-50 flex items-center justify-between bg-brand-50">
                  <h3 className="text-xl font-black text-brand-950 flex items-center gap-3 uppercase tracking-tighter italic">
                      <CalendarIcon size={24} className="text-brand-500" />
                      {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex gap-2">
                      <button onClick={() => changeMonth(-1)} className="w-12 h-12 flex items-center justify-center bg-white border border-brand-100 text-brand-950 rounded-2xl hover:bg-brand-950 hover:text-brand-500 transition-all shadow-sm"><ChevronLeft size={20}/></button>
                      <button onClick={() => setCurrentMonth(new Date())} className="px-6 py-2 bg-brand-950 text-brand-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic border border-white/10">Now</button>
                      <button onClick={() => changeMonth(1)} className="w-12 h-12 flex items-center justify-center bg-white border border-brand-100 text-brand-950 rounded-2xl hover:bg-brand-950 hover:text-brand-500 transition-all shadow-sm"><ChevronRight size={20}/></button>
                  </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                  <div className="min-w-[600px]">
                      <div className="grid grid-cols-7 border-b border-brand-100 bg-brand-950">
                          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
                              <div key={i} className="py-4 text-center text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] font-mono">{d}</div>
                          ))}
                      </div>
                      <div className="grid grid-cols-7">
                          {days}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-700">
      
      {/* Header & Controls - Icarus Pro Hero */}
      <div className="relative group overflow-hidden rounded-[2.5rem] bg-brand-900 p-8 md:p-12 border border-white/10 shadow-2xl transition-all duration-500 hover:border-brand-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(0,200,255,0.08),transparent_50%)]" />
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform group-hover:scale-125 group-hover:rotate-0 duration-700">
            <CalendarIcon size={200} className="text-white" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-brand-500/10 rounded-full border border-brand-500/20 text-[8px] font-black uppercase tracking-[0.3em] text-brand-500 animate-pulse">Live Operations</div>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(0,200,255,0.5)]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-black italic tracking-tighter text-white uppercase leading-none">
              MISSION <span className="premium-gradient-text">CONTROL</span>
            </h2>
            <p className="font-black mt-3 uppercase text-[10px] tracking-[0.35em] text-brand-500/60 italic max-w-md leading-relaxed">
              Orchestrating elite development through precise session planning and scheduling.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            {/* View Toggle - Glass Pill */}
            <div className="flex bg-white/5 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-inner">
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`px-6 py-2.5 rounded-xl flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'list' ? 'bg-brand-500 text-brand-950 shadow-lg shadow-brand-500/20 scale-105' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                    <LayoutList size={14} strokeWidth={2.5} /> LIST
                </button>
                <button 
                  onClick={() => setViewMode('calendar')} 
                  className={`px-6 py-2.5 rounded-xl flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'calendar' ? 'bg-brand-500 text-brand-950 shadow-lg shadow-brand-500/20 scale-105' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                    <Calendar size={14} strokeWidth={2.5} /> CALENDAR
                </button>
            </div>

            {/* Filter Hub */}
            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'all', label: 'ALL', icon: Filter },
                    { id: 'training', label: 'TRAINING', icon: Zap },
                    { id: 'match', label: 'MATCHES', icon: Trophy },
                    { id: 'social', label: 'SOCIAL', icon: PartyPopper }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${activeTab === tab.id ? 'bg-white text-brand-950 border-white shadow-xl shadow-white/5 scale-105' : 'text-white/20 border-white/5 hover:border-white/20 hover:text-white'}`}
                    >
                        <tab.icon size={12} strokeWidth={activeTab === tab.id ? 3 : 2} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {(role === 'admin' || role === 'coach') && (
                <button 
                    onClick={handleCreate}
                    className="flex items-center gap-2.5 bg-lime text-brand-950 px-8 py-3.5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-lime/20 font-black text-[10px] uppercase tracking-[0.2em] italic border border-white/10 ml-auto lg:ml-0"
                >
                    <Plus size={18} strokeWidth={3} />
                    ADD INTENT
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="animate-slide-up">
        {viewMode === 'calendar' ? <CalendarView /> : (
            <div className="grid grid-cols-1 gap-6">
                {filteredEvents.length === 0 && (
                   <div className="glass-card p-24 text-center flex flex-col items-center border-dashed">
                       <div className="w-20 h-20 bg-brand-500/5 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/5">
                           <CalendarIcon size={32} className="text-brand-500/20" />
                       </div>
                       <h3 className="text-2xl font-display font-black text-white/20 uppercase tracking-[0.2em] italic leading-none">NO ACTIVE MISSIONS</h3>
                       <p className="text-white/10 mt-4 text-[9px] font-black uppercase tracking-[0.3em] italic">The operational timeline is currently clear.</p>
                   </div>
                )}

                {filteredEvents.map((event) => {
                    const isPast = isEventPast(event.date, event.time);
                    const dateObj = new Date(event.date);
                    const coach = coaches.find(c => c.id === event.leadCoachId);
                    const s = getTypeStyles(event.type);

                    return (
                        <div 
                          key={event.id} 
                          className={`group glass-card overflow-hidden flex flex-col md:flex-row transition-all duration-500 hover:ring-2 hover:ring-brand-500/30 ${isPast ? 'opacity-30' : ''}`}
                        >
                            {/* Temporal Anchor */}
                            <div className="w-full md:w-56 p-8 bg-brand-900/50 flex flex-row md:flex-col justify-between md:justify-center items-center gap-4 border-b md:border-b-0 md:border-r border-white/5 relative">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(0,200,255,0.05),transparent_50%)]" />
                                <div className="text-center relative z-10">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-500">{dateObj.toLocaleDateString(undefined, { month: 'short' })}</span>
                                    <div className="text-5xl font-display font-black text-white leading-none my-2 tracking-tighter italic drop-shadow-2xl">
                                        {dateObj.getDate()}
                                    </div>
                                    <span className="text-[9px] font-bold uppercase text-white/30 tracking-[0.25em]">{dateObj.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                                </div>
                                <div className="h-px w-10 bg-white/10 hidden md:block" />
                                <div className="flex items-center gap-2.5 bg-brand-950 px-5 py-2.5 rounded-xl border border-white/10 shadow-2xl group-hover:border-brand-500/50 transition-colors">
                                    <Clock size={14} className="text-brand-500" />
                                    <span className="text-xs font-display font-black text-white">{event.time}</span>
                                </div>
                            </div>

                            {/* Mission Specs */}
                            <div className="flex-1 p-8 md:p-10 flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-500/5 blur-3xl rounded-full" />
                                
                                <div className="flex items-center justify-between mb-6">
                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2.5 bg-brand-950 border border-white/10`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${s.dot} shadow-[0_0_8px_currentColor]`} />
                                        <span className="text-white/60">{event.type}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/20 group-hover:text-brand-500 transition-colors">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>

                                <h3 className="text-3xl font-display font-black text-white mb-6 group-hover:premium-gradient-text transition-all duration-500 italic uppercase tracking-tight leading-tight">
                                    {event.title}
                                </h3>
                                
                                <div className="flex flex-wrap items-center gap-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center transition-transform group-hover:rotate-12">
                                          <MapPin size={18} className="text-brand-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">LOCATION</span>
                                            <span className="text-sm text-white/80 font-bold uppercase tracking-wide">{event.location}</span>
                                        </div>
                                    </div>
                                    
                                    {event.type === 'training' && event.drillIds && event.drillIds.length > 0 && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-500/5 rounded-xl border border-brand-500/20 flex items-center justify-center">
                                              <ClipboardList size={18} className="text-brand-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-brand-500 uppercase tracking-widest leading-none mb-1">TACTICAL LOAD</span>
                                                <span className="text-sm text-white/80 font-bold">{event.drillIds.length} EVALUATED DRILLS</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {coach && (
                                        <div className="flex items-center gap-4 pl-8 border-l border-white/5">
                                            <img src={coach.photoUrl || `https://ui-avatars.com/api/?name=${coach.username}`} className="w-10 h-10 rounded-xl bg-brand-900 border border-white/10 object-cover shadow-2xl ring-2 ring-white/5 group-hover:ring-brand-500/30 transition-all" />
                                            <div className="flex flex-col">
                                              <span className="text-[8px] uppercase text-white/20 font-black tracking-widest leading-none mb-1">MISSION LEAD</span>
                                              <span className="text-sm text-brand-500 font-black italic uppercase italic">{coach.username}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tactical Actions */}
                            {(role === 'admin' || role === 'coach') && (
                                <div className="p-8 md:p-10 flex flex-row md:flex-col items-center justify-center gap-4 bg-brand-950/40 border-t md:border-t-0 md:border-l border-white/5">
                                   {!isPast ? (
                                       <>
                                          <button onClick={() => handleEdit(event)} className="w-full md:w-14 h-14 flex items-center justify-center bg-white/5 border border-white/5 text-white/40 rounded-2xl hover:text-brand-500 hover:border-brand-500 hover:bg-brand-500/10 transition-all shadow-sm group/btn active:scale-90" title="Edit Intent">
                                              <Edit3 size={20} strokeWidth={2.5} className="group-hover/btn:scale-110 transition-transform" />
                                          </button>
                                          <button onClick={() => handleDeleteClick(event.id)} className="w-full md:w-14 h-14 flex items-center justify-center bg-white/5 border border-white/5 text-white/40 rounded-2xl hover:text-red-500 hover:border-red-500 hover:bg-red-500/10 transition-all shadow-sm group/btn active:scale-90" title="Abort Mission">
                                              <Trash2 size={20} strokeWidth={2.5} className="group-hover/btn:scale-110 transition-transform" />
                                          </button>
                                       </>
                                   ) : (
                                      <div className="text-center">
                                          <div className="w-14 h-14 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center grayscale">
                                              <History size={20} className="text-white/20" />
                                          </div>
                                      </div>
                                   )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      {/* Modal Form - Glassmorphic Overhaul */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-brand-900/90 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-brand-950 to-brand-900 px-10 py-8 border-b border-white/5 flex justify-between items-center relative">
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50" />
                <div>
                   <h3 className="font-display font-black text-3xl text-white italic uppercase tracking-tight">{editingId ? 'RE-ENGAGE' : 'INITIATE'} <span className="premium-gradient-text uppercase">ACTIVITY</span></h3>
                   <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest mt-1">Operational Parameters Configuration</p>
                </div>
                <button type="button" onClick={() => setShowForm(false)} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 transition-colors border border-white/5"><X size={20} strokeWidth={3} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-1 flex items-center gap-2"><ArrowRight size={10} strokeWidth={4} /> MISSION DESIGNATION</label>
                <input required type="text" placeholder="e.g. TACTICAL SESSION 04" className="w-full p-5 bg-brand-950/50 border border-white/10 rounded-2xl focus:border-brand-500/50 outline-none font-display font-black text-white text-lg placeholder:text-white/10 shadow-inner group" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">TEMPORAL DATE</label>
                    <input required type="date" className="w-full p-5 bg-brand-950/50 border border-white/10 rounded-2xl focus:border-brand-500/50 outline-none text-sm font-black text-white shadow-inner uppercase" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">TIMESTAMP</label>
                    <input required type="time" className="w-full p-5 bg-brand-950/50 border border-white/10 rounded-2xl focus:border-brand-500/50 outline-none text-sm font-display font-black text-white shadow-inner" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">ENGAGEMENT MODE</label>
                    <div className="relative">
                        <select className="w-full p-5 bg-brand-950/50 border border-white/10 rounded-2xl focus:border-brand-500/50 outline-none text-sm font-black text-white shadow-inner appearance-none uppercase" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                            <option value="training">Training</option>
                            <option value="match">Match</option>
                            <option value="social">Social/Event</option>
                        </select>
                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-500 rotate-90" size={16} />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">COORDINATES</label>
                    <input required type="text" placeholder="BASE CAMP / SECTOR 7" className="w-full p-5 bg-brand-950/50 border border-white/10 rounded-2xl focus:border-brand-500/50 outline-none text-sm font-black text-white shadow-inner placeholder:text-white/10 uppercase" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                 </div>
              </div>

              <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">COMMANDING OFFICER</label>
                  <div className="relative">
                      <select className="w-full p-5 bg-brand-950/50 border border-white/10 rounded-2xl focus:border-brand-500/50 outline-none text-sm font-black text-white shadow-inner appearance-none uppercase" value={form.leadCoachId} onChange={e => setForm({...form, leadCoachId: e.target.value})}>
                          <option value="">AWAITING ASSIGNMENT...</option>
                          {coaches.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
                      </select>
                      <UserIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-500" size={16} />
                  </div>
              </div>

              {form.type === 'training' && (
                  <div className="pt-10 border-t border-white/5 animate-in slide-in-from-top-4">
                      <div className="flex justify-between items-end mb-6">
                          <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-1 flex items-center gap-2"><ClipboardList size={14} className="text-brand-500" /> TACTICAL LOADOUT</label>
                          <span className="text-[9px] font-black text-lime bg-lime/10 px-4 py-1.5 rounded-full border border-lime/20 shadow-[0_0_15px_rgba(195,246,41,0.1)]">{form.drillIds.length} DRILLS TARGETED</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-2 p-1">
                          {drills.length > 0 ? (
                              drills.map(drill => {
                                  const isSelected = form.drillIds.includes(drill.id);
                                  return (
                                      <div key={drill.id} onClick={() => toggleDrill(drill.id)} className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-brand-500/20 border-brand-500/50 shadow-xl shadow-brand-500/5' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                                          <div className="flex flex-col">
                                              <span className={`text-sm font-display font-black italic uppercase ${isSelected ? 'text-brand-500' : 'text-white'}`}>{drill.title}</span>
                                              <span className="text-[9px] text-white/30 font-black uppercase tracking-widest mt-1">{drill.category} • {drill.duration} MIN BURST</span>
                                          </div>
                                          {isSelected && <div className="bg-brand-500 text-brand-950 p-1.5 rounded-xl"><Check size={12} strokeWidth={4} /></div>}
                                      </div>
                                  );
                              })
                          ) : (
                              <p className="text-center text-[10px] text-white/20 py-8 italic font-black uppercase tracking-[0.2em]">Drill database offline. Initialize from Training module.</p>
                          )}
                      </div>
                  </div>
              )}
            </form>

            <div className="px-10 py-8 border-t border-white/5 bg-brand-950/50 flex gap-6">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 text-white/20 font-black hover:text-white rounded-2xl transition-all text-[10px] uppercase tracking-[0.3em] font-display">ABORT</button>
                <button onClick={handleSubmit} className="flex-[2] py-5 bg-brand-500 text-brand-950 font-black rounded-2xl shadow-2xl shadow-brand-500/20 hover:scale-[1.02] transform active:scale-95 transition-all flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.3em] italic font-display border border-white/20">
                    <Save size={20} strokeWidth={3} /> {editingId ? 'COMMAND UPDATE' : 'INITIALIZE MISSION'}
                </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
          isOpen={deleteModalOpen}
          onCancel={() => {
              setDeleteModalOpen(false);
              setEventToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="CRITICAL ABORT"
          message="Are you sure you want to permanently decommission this mission? All tactical drill links and session data will be purged from the timeline."
      />
    </div>
  );
};
