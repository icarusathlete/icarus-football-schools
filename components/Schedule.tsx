import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { ScheduleEvent, Role, Drill, User, EventType } from '../types';
import { 
    Calendar as CalendarIcon, Clock, MapPin, Plus, MonitorPlay, 
    Users, Coffee, Edit3, Trash2, X, Save, Trophy, ArrowRight, 
    ClipboardList, Check, User as UserIcon, Filter, Zap, 
    PartyPopper, ChevronRight, ChevronLeft, LayoutList, Calendar
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
          case 'match': return { border: 'border-l-brand-500', bg: 'bg-brand-500/10', text: 'text-brand-500', icon: <Trophy size={14} className="text-brand-500" />, dot: 'bg-brand-500' };
          case 'social': return { border: 'border-l-lime', bg: 'bg-lime/10', text: 'text-lime', icon: <PartyPopper size={14} className="text-lime" />, dot: 'bg-lime' };
          default: return { border: 'border-l-brand-400', bg: 'bg-brand-400/10', text: 'text-brand-400', icon: <Zap size={14} className="text-brand-400" />, dot: 'bg-brand-400' };
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
              <div key={d} className={`h-24 md:h-32 p-2 border border-white/5 transition-colors hover:bg-brand-500/10 overflow-hidden ${isToday ? 'bg-brand-500/20 border-brand-500/50' : 'bg-brand-500/5'}`}>
                  <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-black ${isToday ? 'text-brand-500' : 'text-brand-500'}`}>{d}</span>
                      {isToday && <span className="text-[8px] font-black text-brand-500 uppercase tracking-tighter">Today</span>}
                  </div>
                  <div className="space-y-1 overflow-y-auto max-h-[80%] custom-scrollbar">
                      {dayEvents.map(e => {
                          const s = getTypeStyles(e.type);
                          return (
                              <div key={e.id} onClick={() => handleEdit(e)} className={`px-1.5 py-0.5 rounded text-[8px] font-bold truncate cursor-pointer ${s.bg} ${s.text} border-l-2 ${s.border} hover:opacity-80`}>
                                  {e.title}
                              </div>
                          );
                      })}
                  </div>
              </div>
          );
      }

      return (
          <div className="bg-brand-500/10 backdrop-blur-xl rounded-3xl border border-brand-500/30 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-500">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-brand-950/30">
                  <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-widest italic">
                      {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex gap-2">
                      <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-xl text-brand-400 transition-colors"><ChevronLeft size={20}/></button>
                      <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 hover:bg-white/10 rounded-xl text-xs font-bold text-white uppercase tracking-widest transition-colors">Today</button>
                      <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-xl text-brand-400 transition-colors"><ChevronRight size={20}/></button>
                  </div>
              </div>
              <div className="grid grid-cols-7 border-b border-white/5 bg-brand-950/20">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="py-3 text-center text-[10px] font-black text-brand-500 uppercase tracking-widest">{d}</div>
                  ))}
              </div>
              <div className="grid grid-cols-7">
                  {days}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase">
             TEAM <span className="text-brand-500">SCHEDULE</span>
          </h2>
          <p className="text-brand-400 font-medium mt-1">Orchestrate sessions, matches, and media events.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            {/* View Toggle */}
            <div className="flex bg-brand-950 p-1 rounded-xl border border-white/5">
                <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-brand-500 text-brand-950 shadow-lg shadow-brand-500/20' : 'text-brand-500 hover:text-white'}`}>
                    <LayoutList size={14}/> List
                </button>
                <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-brand-500 text-brand-950 shadow-lg shadow-brand-500/20' : 'text-brand-500 hover:text-white'}`}>
                    <Calendar size={14}/> Calendar
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'all', label: 'All', icon: Filter, active: 'bg-brand-500 text-brand-950 ring-2 ring-brand-500/20 shadow-lg shadow-brand-500/10' },
                    { id: 'training', label: 'Training', icon: Zap, active: 'bg-lime text-brand-950 ring-2 ring-lime/20 shadow-lg shadow-lime/10' },
                    { id: 'match', label: 'Matches', icon: Trophy, active: 'bg-brand-500 text-brand-950 ring-2 ring-brand-500/20 shadow-lg shadow-brand-500/10' },
                    { id: 'social', label: 'Events', icon: PartyPopper, active: 'bg-brand-500/20 text-brand-500 ring-2 ring-brand-500/20 shadow-lg shadow-brand-500/10' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? tab.active : 'bg-brand-800 text-brand-500 border border-transparent hover:border-white/10'}`}
                    >
                        <tab.icon size={12} />
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {(role === 'admin' || role === 'coach') && (
            <button 
                onClick={handleCreate}
                className="hidden lg:flex items-center gap-2 bg-brand-500 text-brand-950 px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-500/20 font-black text-xs uppercase tracking-widest"
            >
                <Plus size={18} />
                PLAN ACTIVITY
            </button>
        )}
      </div>

      {viewMode === 'calendar' ? <CalendarView /> : (
          <div className="space-y-4">
              {filteredEvents.length === 0 && (
                 <div className="bg-brand-500/10 backdrop-blur-xl border border-brand-500/30 rounded-[2.5rem] p-20 text-center flex flex-col items-center">
                     <CalendarIcon size={48} className="text-brand-500 mb-4 opacity-20" />
                     <h3 className="text-xl font-black text-white uppercase tracking-widest italic leading-none">OPERATIONS <span className="text-brand-500">SILENT</span></h3>
                     <p className="text-brand-500 mt-4 text-[10px] font-black uppercase tracking-[0.2em] italic">No active missions detected for the current period.</p>
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
                        className={`group relative bg-brand-500/10 backdrop-blur-md rounded-3xl border border-brand-500/20 hover:border-brand-500/40 transition-all duration-500 overflow-hidden flex flex-col md:flex-row ${isPast ? 'opacity-40 grayscale' : ''} border-l-4 ${s.border}`}
                      >
                          {/* Left: Date & Time */}
                          <div className="w-full md:w-48 p-8 bg-brand-950/30 flex flex-row md:flex-col justify-between md:justify-center items-center gap-3 border-b md:border-b-0 md:border-r border-white/5">
                              <div className="text-center">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">{dateObj.toLocaleDateString(undefined, { month: 'short' })}</span>
                                  <div className="text-4xl font-black text-white leading-none my-1 tracking-tighter italic">{dateObj.getDate()}</div>
                                  <span className="text-[10px] font-bold uppercase text-brand-500 tracking-[0.2em]">{dateObj.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                              </div>
                              <div className="h-10 w-px bg-white/5 hidden md:block my-2"></div>
                              <div className="flex items-center gap-2 bg-brand-950 px-4 py-2 rounded-xl border border-white/10">
                                  <Clock size={14} className="text-brand-500" />
                                  <span className="text-xs font-black text-white">{event.time}</span>
                              </div>
                          </div>

                          {/* Middle: Content */}
                          <div className="flex-1 p-8 flex flex-col justify-center relative">
                              <div className="absolute top-8 right-8 hidden md:block">
                                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${s.bg} ${s.text} border border-${s.text}/20`}>
                                      {s.icon} {event.type}
                                  </span>
                              </div>

                              <h3 className="text-2xl font-black text-white mb-3 group-hover:text-brand-500 transition-colors italic uppercase tracking-tight">
                                  {event.title}
                              </h3>
                              
                              <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-brand-400">
                                  <div className="flex items-center gap-2.5">
                                      <div className="p-2 bg-brand-950 rounded-lg"><MapPin size={16} className="text-brand-500" /></div>
                                      {event.location}
                                  </div>
                                  
                                  {event.type === 'training' && event.drillIds && event.drillIds.length > 0 && (
                                      <div className="flex items-center gap-2.5">
                                          <div className="p-2 bg-brand-500/10 rounded-lg text-brand-500"><ClipboardList size={16} /></div>
                                          <span className="text-xs uppercase tracking-widest">{event.drillIds.length} DRILLS ASSIGNED</span>
                                      </div>
                                  )}
                                  
                                  {coach && (
                                      <div className="flex items-center gap-3 pl-6 border-l border-white/5">
                                          <img src={coach.photoUrl || `https://ui-avatars.com/api/?name=${coach.username}`} className="w-8 h-8 rounded-full bg-brand-950 border border-white/10 object-cover shadow-lg" />
                                          <div className="flex flex-col">
                                            <span className="text-[10px] uppercase text-brand-500 font-black tracking-widest">Lead Strategist</span>
                                            <span className="text-xs text-white">{coach.username}</span>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>

                          {/* Right: Actions */}
                          {(role === 'admin' || role === 'coach') && (
                              <div className="p-6 md:p-8 flex flex-row md:flex-col items-center justify-center gap-3 bg-brand-950/20 border-t md:border-t-0 md:border-l border-white/5">
                                 {!isPast ? (
                                     <>
                                        <button onClick={() => handleEdit(event)} className="w-full md:w-auto p-4 bg-brand-900 border border-white/5 text-brand-400 rounded-2xl hover:text-brand-500 hover:border-brand-500/30 hover:bg-brand-500/5 transition-all shadow-xl group/btn" title="Refine Action">
                                            <Edit3 size={20} className="group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                        <button onClick={() => handleDeleteClick(event.id)} className="w-full md:w-auto p-4 bg-brand-900 border border-white/5 text-brand-400 rounded-2xl hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-all shadow-xl group/btn" title="Abort Mission">
                                            <Trash2 size={20} className="group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                     </>
                                 ) : (
                                    <div className="text-center px-4">
                                        <div className="p-4 bg-brand-900/50 rounded-2xl border border-white/5">
                                            <History size={20} className="mx-auto text-brand-700" />
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

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-brand-900 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
            <div className="bg-brand-950/50 px-10 py-6 border-b border-white/5 flex justify-between items-center relative">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-30" />
                <h3 className="font-black text-2xl text-white italic uppercase tracking-tight">{editingId ? 'Refine' : 'Formulate'} <span className="text-brand-500">Activity</span></h3>
                <button type="button" onClick={() => setShowForm(false)} className="p-3 hover:bg-white/10 rounded-full text-brand-500 transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Activity Designation</label>
                <input required type="text" placeholder="e.g. Tactical Drill 04 / Home Opener" className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-brand-500 outline-none font-bold text-white shadow-inner" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Deployment Date</label>
                    <input required type="date" className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-bold text-white shadow-inner" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Start Time</label>
                    <input required type="time" className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-bold text-white shadow-inner" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Engagement Type</label>
                    <select className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-bold text-white shadow-inner appearance-none" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                        <option value="training">Training</option>
                        <option value="match">Match</option>
                        <option value="social">Social/Event</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Operational Zone</label>
                    <input required type="text" placeholder="Pitch Alpha / VR Suite" className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-bold text-white shadow-inner" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                 </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Designated Strategist</label>
                  <select className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-bold text-white shadow-inner appearance-none" value={form.leadCoachId} onChange={e => setForm({...form, leadCoachId: e.target.value})}>
                      <option value="">Awaiting Assignment...</option>
                      {coaches.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
                  </select>
              </div>

              {form.type === 'training' && (
                  <div className="pt-6 border-t border-white/5 animate-in slide-in-from-top-4">
                      <div className="flex justify-between items-end mb-4">
                          <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><ClipboardList size={14} className="text-brand-500" /> Tactical Components</label>
                          <span className="text-[9px] font-black text-brand-500 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">{form.drillIds.length} SELECTED</span>
                      </div>
                      
                      <div className="bg-brand-950/20 border border-white/5 rounded-3xl p-3 max-h-48 overflow-y-auto custom-scrollbar">
                          {drills.length > 0 ? (
                              <div className="space-y-2">
                                  {drills.map(drill => {
                                      const isSelected = form.drillIds.includes(drill.id);
                                      return (
                                          <div key={drill.id} onClick={() => toggleDrill(drill.id)} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-brand-500/10 border-brand-500/30 shadow-lg shadow-brand-500/5' : 'bg-brand-900/50 border-white/5 hover:border-white/10'}`}>
                                              <div className="flex flex-col">
                                                  <span className={`text-sm font-black italic uppercase ${isSelected ? 'text-brand-500' : 'text-white'}`}>{drill.title}</span>
                                                  <span className="text-[9px] text-brand-500 font-bold uppercase tracking-[0.15em]">{drill.category} • {drill.duration} MIN</span>
                                              </div>
                                              {isSelected && <div className="bg-brand-500 text-brand-950 p-1 rounded-lg"><Check size={12} strokeWidth={4} /></div>}
                                          </div>
                                      );
                                  })}
                              </div>
                          ) : (
                              <p className="text-center text-xs text-brand-600 py-6 italic font-medium">Drill database empty. Initialize from Training module.</p>
                          )}
                      </div>
                  </div>
              )}
            </form>

            <div className="px-10 py-6 border-t border-white/5 bg-brand-950/50 flex gap-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 text-brand-500 font-black hover:text-white rounded-2xl transition-all text-xs uppercase tracking-[0.2em]">Abort</button>
                <button onClick={handleSubmit} className="flex-1 py-4 bg-brand-500 text-brand-950 font-black rounded-2xl shadow-2xl hover:scale-[1.02] transform active:scale-95 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em]">
                    <Save size={18} /> {editingId ? 'Confirm Redesign' : 'Authorize Plan'}
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
          title="Abort Operation"
          message="Are you sure you want to permanently remove this activity? All assigned drills and data links will be severed."
      />
    </div>
  );
};
