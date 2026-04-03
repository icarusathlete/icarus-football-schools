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
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-brand-500 p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10"><CalendarIcon size={160} className="text-white" /></div>
        <div className="relative z-10 text-white">
          <h2 className="text-4xl font-black italic tracking-tighter uppercase">
             TEAM <span className="text-brand-950">SCHEDULE</span>
          </h2>
          <p className="font-black mt-1 uppercase text-[10px] tracking-[0.3em] opacity-80 italic">Academy Sessions, Matches, and Events</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto relative z-10">
            {/* View Toggle */}
            <div className="flex bg-brand-950 p-1 rounded-xl border border-white/5">
                <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white text-brand-950 shadow-lg' : 'text-white/40 hover:text-white'}`}>
                    <LayoutList size={14}/> List
                </button>
                <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-white text-brand-950 shadow-lg' : 'text-white/40 hover:text-white'}`}>
                    <Calendar size={14}/> Calendar
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'all', label: 'All', icon: Filter, active: 'bg-white text-brand-950 ring-2 ring-white/20 shadow-lg' },
                    { id: 'training', label: 'Training', icon: Zap, active: 'bg-white text-brand-950 ring-2 ring-white/20 shadow-lg' },
                    { id: 'match', label: 'Matches', icon: Trophy, active: 'bg-white text-brand-950 ring-2 ring-white/20 shadow-lg' },
                    { id: 'social', label: 'Events', icon: PartyPopper, active: 'bg-white text-brand-950 ring-2 ring-white/20 shadow-lg' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? tab.active : 'text-white/40 hover:text-white'}`}
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
                className="relative z-10 flex items-center gap-2 bg-white text-brand-950 px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg font-black text-xs uppercase tracking-widest italic"
            >
                <Plus size={18} />
                NEW ACTIVITY
            </button>
        )}
      </div>

      {viewMode === 'calendar' ? <CalendarView /> : (
          <div className="space-y-4">
              {filteredEvents.length === 0 && (
                 <div className="bg-white border border-brand-100 rounded-[2.5rem] p-20 text-center flex flex-col items-center shadow-xl">
                     <CalendarIcon size={48} className="text-brand-100 mb-4" />
                     <h3 className="text-xl font-black text-brand-950 uppercase tracking-widest italic leading-none">NO <span className="text-brand-500">SCHEDULE</span></h3>
                     <p className="text-brand-300 mt-4 text-[10px] font-black uppercase tracking-[0.2em] italic">No active events detected for the current period.</p>
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
                          <div className="w-full md:w-48 p-8 bg-brand-50 flex flex-row md:flex-col justify-between md:justify-center items-center gap-3 border-b md:border-b-0 md:border-r border-brand-100">
                              <div className="text-center">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-300">{dateObj.toLocaleDateString(undefined, { month: 'short' })}</span>
                                  <div className="text-4xl font-black text-brand-950 leading-none my-1 tracking-tighter italic">{dateObj.getDate()}</div>
                                  <span className="text-[10px] font-bold uppercase text-brand-400 tracking-[0.2em]">{dateObj.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                              </div>
                              <div className="h-10 w-px bg-brand-200 hidden md:block my-2"></div>
                              <div className="flex items-center gap-2 bg-brand-950 px-4 py-2 rounded-xl border border-white/10 shadow-lg">
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

                              <h3 className="text-2xl font-black text-brand-950 mb-3 group-hover:text-brand-500 transition-colors italic uppercase tracking-tight">
                                  {event.title}
                              </h3>
                              
                              <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-brand-400">
                                  <div className="flex items-center gap-2.5">
                                      <div className="p-2 bg-brand-50 rounded-lg border border-brand-100"><MapPin size={16} className="text-brand-500" /></div>
                                      <span className="text-brand-700">{event.location}</span>
                                  </div>
                                  
                                  {event.type === 'training' && event.drillIds && event.drillIds.length > 0 && (
                                      <div className="flex items-center gap-2.5">
                                          <div className="p-2 bg-brand-500/10 rounded-lg text-brand-500"><ClipboardList size={16} /></div>
                                          <span className="text-xs uppercase tracking-widest">{event.drillIds.length} DRILLS ASSIGNED</span>
                                      </div>
                                  )}
                                  
                                  {coach && (
                                      <div className="flex items-center gap-3 pl-6 border-l border-brand-100">
                                          <img src={coach.photoUrl || `https://ui-avatars.com/api/?name=${coach.username}`} className="w-8 h-8 rounded-full bg-brand-50 border border-brand-100 object-cover shadow-sm" />
                                          <div className="flex flex-col">
                                            <span className="text-[10px] uppercase text-brand-300 font-black tracking-widest">Lead Coach</span>
                                            <span className="text-xs text-brand-950 font-bold">{coach.username}</span>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>

                          {/* Right: Actions */}
                          {(role === 'admin' || role === 'coach') && (
                              <div className="p-6 md:p-8 flex flex-row md:flex-col items-center justify-center gap-3 bg-brand-50 border-t md:border-t-0 md:border-l border-brand-100">
                                 {!isPast ? (
                                     <>
                                        <button onClick={() => handleEdit(event)} className="w-full md:w-auto p-4 bg-white border border-brand-100 text-brand-300 rounded-2xl hover:text-brand-500 hover:border-brand-500 hover:bg-brand-50 transition-all shadow-sm group/btn" title="Edit Event">
                                            <Edit3 size={20} className="group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                        <button onClick={() => handleDeleteClick(event.id)} className="w-full md:w-auto p-4 bg-white border border-brand-100 text-brand-300 rounded-2xl hover:text-red-500 hover:border-red-500 hover:bg-red-50 transition-all shadow-sm group/btn" title="Delete Event">
                                            <Trash2 size={20} className="group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                     </>
                                 ) : (
                                    <div className="text-center px-4">
                                        <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100">
                                            <History size={20} className="mx-auto text-brand-200" />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-brand-100 flex flex-col max-h-[90vh]">
            <div className="bg-brand-50 px-10 py-6 border-b border-brand-100 flex justify-between items-center relative">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-500 opacity-30" />
                <h3 className="font-black text-2xl text-brand-950 italic uppercase tracking-tight">{editingId ? 'Edit' : 'New'} <span className="text-brand-500">Activity</span></h3>
                <button type="button" onClick={() => setShowForm(false)} className="p-3 hover:bg-brand-100 rounded-full text-brand-300 transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-300 uppercase tracking-[0.2em] ml-1">Activity Name</label>
                <input required type="text" placeholder="e.g. Session 04 / Match vs City" className="w-full p-4 bg-brand-50 border border-brand-100 rounded-2xl focus:border-brand-500 outline-none font-bold text-brand-950 shadow-sm" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-300 uppercase tracking-[0.2em] ml-1">Session Date</label>
                    <input required type="date" className="w-full p-4 bg-brand-50 border border-brand-100 rounded-2xl focus:border-brand-500 outline-none text-sm font-bold text-brand-950 shadow-sm" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-300 uppercase tracking-[0.2em] ml-1">Start Time</label>
                    <input required type="time" className="w-full p-4 bg-brand-50 border border-brand-100 rounded-2xl focus:border-brand-500 outline-none text-sm font-bold text-brand-950 shadow-sm" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-300 uppercase tracking-[0.2em] ml-1">Engagement Type</label>
                    <select className="w-full p-4 bg-brand-50 border border-brand-100 rounded-2xl focus:border-brand-500 outline-none text-sm font-bold text-brand-950 shadow-sm appearance-none" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                        <option value="training">Training</option>
                        <option value="match">Match</option>
                        <option value="social">Social/Event</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-300 uppercase tracking-[0.2em] ml-1">Location</label>
                    <input required type="text" placeholder="Pitch 1 / Ground 2" className="w-full p-4 bg-brand-50 border border-brand-100 rounded-2xl focus:border-brand-500 outline-none text-sm font-bold text-brand-950 shadow-sm" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                 </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-300 uppercase tracking-[0.2em] ml-1">Lead Coach</label>
                  <select className="w-full p-4 bg-brand-50 border border-brand-100 rounded-2xl focus:border-brand-500 outline-none text-sm font-bold text-brand-950 shadow-sm appearance-none" value={form.leadCoachId} onChange={e => setForm({...form, leadCoachId: e.target.value})}>
                      <option value="">Select Coach...</option>
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

            <div className="px-10 py-6 border-t border-brand-100 bg-brand-50 flex gap-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 text-brand-300 font-black hover:text-brand-950 rounded-2xl transition-all text-xs uppercase tracking-[0.2em]">Cancel</button>
                <button onClick={handleSubmit} className="flex-1 py-4 bg-brand-500 text-brand-950 font-black rounded-2xl shadow-xl hover:scale-[1.02] transform active:scale-95 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] italic">
                    <Save size={18} /> {editingId ? 'Update Event' : 'Save Event'}
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
