import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { 
    Calendar as CalendarIcon, Clock, MapPin, Plus, MonitorPlay, 
    Users, Coffee, Edit3, Trash2, X, Save, Trophy, ArrowRight, 
    ClipboardList, Check, User as UserIcon, Filter, Zap, 
    PartyPopper, ChevronRight, ChevronLeft, LayoutList, Calendar, History,
    Radio, Layers, Target, Command
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
  
  // Location Hub State
  const [selectedVenue, setSelectedVenue] = useState<string>('All Locations');
  const [availableVenues, setAvailableVenues] = useState<any[]>([]);
  const [venueStats, setVenueStats] = useState<Record<string, number>>({});
  
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
    
    const venues = StorageService.getVenues();
    setAvailableVenues(venues);
    
    // Calculate player counts per venue for the selector
    const players = StorageService.getPlayers();
    const counts: Record<string, number> = { 'All Locations': players.length };
    venues.forEach(v => {
        counts[v.name] = players.filter(p => p.venue === v.name).length;
    });
    setVenueStats(counts);
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

  const filteredEvents = events.filter(e => {
    const matchesTab = activeTab === 'all' || e.type === activeTab;
    const matchesVenue = selectedVenue === 'All Locations' || e.location === selectedVenue;
    return matchesTab && matchesVenue;
  });

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
      for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-slate-50 border border-slate-100" />);

      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayEvents = events.filter(e => e.date === dateStr);
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          days.push(
              <div key={d} className={`h-24 md:h-36 p-2 md:p-3 border border-slate-100 transition-all hover:bg-slate-50 relative overflow-hidden group/day ${isToday ? 'bg-brand-500/5' : 'bg-white'}`}>
                  <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-black italic tracking-widest ${isToday ? 'text-brand-500' : 'text-slate-300'}`}>{d}</span>
                      {isToday && <span className="text-[8px] font-black text-brand-500 uppercase tracking-widest italic animate-pulse">TODAY</span>}
                  </div>
                  <div className="space-y-1.5 overflow-y-auto max-h-[80%] custom-scrollbar relative z-10">
                      {dayEvents.map(e => {
                          const s = getTypeStyles(e.type);
                          return (
                              <div key={e.id} onClick={() => handleEdit(e)} className={`px-2 py-1.5 rounded-lg text-[9px] font-black truncate cursor-pointer bg-slate-50 ${s.text} border border-slate-100 hover:border-brand-500/50 transition-all flex items-center gap-1.5 italic shadow-sm`}>
                                  <div className={`w-1 h-1 rounded-full ${s.dot} shadow-[0_0_8px_currentColor]`} />
                                  <span className="opacity-70 group-hover/day:opacity-100">{e.title}</span>
                              </div>
                          );
                      })}
                  </div>
                  {isToday && <div className="absolute inset-0 border-2 border-brand-500/20 pointer-events-none" />}
                  <div className="absolute bottom-[-20px] right-[-20px] text-slate-100 font-black text-5xl italic select-none pointer-events-none group-hover/day:text-brand-500/[0.03] transition-colors">{d}</div>
              </div>
          );
      }

      return (
          <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.05)] animate-in fade-in zoom-in-95 duration-500">
              <div className="p-5 md:p-10 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 backdrop-blur-xl">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter italic">
                      <div className="p-2 md:p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20">
                        <CalendarIcon size={20} className="text-brand-500" />
                      </div>
                      {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex gap-2">
                      <button onClick={() => changeMonth(-1)} className="w-11 h-11 md:w-14 md:h-14 flex items-center justify-center bg-white border border-slate-200 text-slate-500 rounded-2xl hover:bg-brand-500 hover:text-white transition-all shadow-sm active:scale-90"><ChevronLeft size={18} strokeWidth={3} /></button>
                      <button onClick={() => setCurrentMonth(new Date())} className="px-5 md:px-8 bg-brand-950 text-white rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all italic border border-white/10 hover:border-brand-500/40 active:scale-95">TODAY</button>
                      <button onClick={() => changeMonth(1)} className="w-11 h-11 md:w-14 md:h-14 flex items-center justify-center bg-white border border-slate-200 text-slate-500 rounded-2xl hover:bg-brand-500 hover:text-white transition-all shadow-sm active:scale-90"><ChevronRight size={18} strokeWidth={3} /></button>
                  </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                  <div className="min-w-[800px]">
                      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
                              <div key={i} className="py-6 text-center text-[10px] font-black text-brand-500 uppercase tracking-[0.5em] font-mono opacity-60 italic">{d}</div>
                          ))}
                      </div>
                      <div className="grid grid-cols-7 bg-white">
                          {days}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-700">
      
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-brand-100 shadow-xl group p-8 md:p-12">
        {/* Mesh gradient — subtle on white */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,_rgba(59,130,246,0.05),_transparent)] opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_10%_100%,_rgba(14,165,233,0.03),_transparent)] opacity-40" />
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12">
          <CalendarIcon size={120} className="text-brand-950" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 w-full">
          <div>
            <div className="flex items-center gap-3 mb-4 transition-transform duration-500 hover:translate-x-1">
              <div className="w-10 h-10 rounded-2xl bg-brand-500/10 flex items-center justify-center shadow-lg shadow-brand-500/5">
                <CalendarIcon size={18} className="text-brand-500" />
              </div>
              <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em] italic leading-none">ACADEMY_OPERATIONS_HUB</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black italic text-brand-950 uppercase tracking-tighter leading-none">
               Academy <span className="text-brand-500">Schedule</span>
            </h2>
            <p className="font-black mt-3 uppercase text-[10px] tracking-[0.35em] text-brand-400 italic max-w-md leading-relaxed">
              Manage training sessions, matches, and events.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 w-full lg:w-auto mt-6 lg:mt-0">
            {/* View Toggle - Light Pill */}
            <div className="flex bg-brand-50 p-1.5 rounded-2xl border border-brand-100 shadow-inner self-start">
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`px-4 sm:px-6 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'list' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-brand-400 hover:text-brand-600'}`}
                >
                    <LayoutList size={14} strokeWidth={2.5} /> LIST
                </button>
                <button 
                  onClick={() => setViewMode('calendar')} 
                  className={`px-4 sm:px-6 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'calendar' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-brand-400 hover:text-brand-600'}`}
                >
                    <Calendar size={14} strokeWidth={2.5} /> CAL
                </button>
            </div>

            {/* Filter Hub - horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar max-w-full">
                {[
                    { id: 'all', label: 'ALL', icon: Filter },
                    { id: 'training', label: 'TRAINING', icon: Zap },
                    { id: 'match', label: 'MATCHES', icon: Trophy },
                    { id: 'social', label: 'SOCIAL', icon: PartyPopper }
                ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${activeTab === tab.id ? 'bg-brand-950 text-white border-brand-950 shadow-lg scale-105' : 'text-brand-400 border-brand-100 bg-brand-50 hover:border-brand-300 hover:text-brand-600'}`}
                        >
                            <tab.icon size={12} strokeWidth={activeTab === tab.id ? 3 : 2} />
                            {tab.label}
                        </button>
                ))}
            </div>

            {(role === 'admin' || role === 'coach') && (
                <button 
                    onClick={handleCreate}
                    className="flex items-center gap-2.5 bg-brand-500 text-white px-6 py-3.5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-500/20 font-black text-[10px] uppercase tracking-[0.2em] italic border border-brand-400/20 ml-auto"
                >
                    <Plus size={16} strokeWidth={3} />
                    ADD EVENT
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Location Control Hub */}
      <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-500/10 rounded-lg text-brand-500"><MapPin size={16} /></div>
                  <div>
                      <h3 className="text-sm font-black text-brand-950 italic uppercase tracking-tighter leading-none">LOCATION HUB</h3>
                      <p className="text-[9px] font-black text-brand-950/50 uppercase tracking-[0.2em] italic mt-1">Satellite Feed Active</p>
                  </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-brand-500/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                  <span className="text-[9px] font-black text-brand-950/60 uppercase tracking-widest italic">{availableVenues.length + 1} NODES CONNECTED</span>
              </div>
          </div>

          <div className="glass-card p-2 rounded-[2.5rem] border-slate-100 bg-white shadow-sm relative overflow-hidden group">
              <div className="flex gap-2 overflow-x-auto p-2 no-scrollbar">
                  <button 
                      onClick={() => setSelectedVenue('All Locations')}
                      className={`relative min-w-[200px] p-6 rounded-[2rem] border transition-all duration-500 group/btn overflow-hidden ${
                          selectedVenue === 'All Locations'
                          ? 'bg-brand-500 border-brand-500 text-white shadow-xl shadow-brand-500/20'
                          : 'bg-white border-brand-500/10 text-brand-950/50 hover:border-brand-500/30 hover:bg-brand-500/5'
                      }`}
                  >
                      <div className="relative z-10 flex flex-col items-start gap-4">
                          <div className={`p-3 rounded-2xl transition-all duration-500 ${selectedVenue === 'All Locations' ? 'bg-brand-950 text-brand-500' : 'bg-slate-50 text-slate-500 group-hover/btn:scale-110'}`}>
                              <Layers size={20} />
                          </div>
                          <div className="text-left">
                              <p className={`text-[9px] font-black uppercase tracking-[0.3em] italic mb-1 ${selectedVenue === 'All Locations' ? 'text-white/60' : 'text-slate-500'}`}>GLOBAL VIEW</p>
                              <p className="text-lg font-black uppercase italic tracking-tighter leading-none">ALL LOCATIONS</p>
                              <p className={`text-[10px] font-bold mt-2 italic ${selectedVenue === 'All Locations' ? 'text-white' : 'text-brand-500'}`}>
                                  {venueStats['All Locations'] || 0} TOTAL PLAYERS
                              </p>
                          </div>
                      </div>
                      {selectedVenue === 'All Locations' && (
                          <div className="absolute top-0 right-0 p-4 opacity-20"><Zap size={40} /></div>
                      )}
                  </button>

                  {availableVenues.map((venue) => (
                      <button 
                          key={venue.id}
                          onClick={() => setSelectedVenue(venue.name)}
                          className={`relative min-w-[200px] p-6 rounded-[2rem] border transition-all duration-500 group/btn overflow-hidden ${
                              selectedVenue === venue.name
                              ? 'bg-brand-500 border-brand-500 text-white shadow-xl shadow-brand-500/20'
                              : 'bg-white border-white text-slate-500 hover:border-slate-100 hover:bg-slate-50'
                      }`}
                  >
                      <div className="relative z-10 flex flex-col items-start gap-4">
                          <div className={`p-3 rounded-2xl transition-all duration-500 ${selectedVenue === venue.name ? 'bg-brand-950 text-brand-500' : 'bg-slate-50 text-slate-500 group-hover/btn:scale-110'}`}>
                              <MapPin size={20} />
                          </div>
                          <div className="text-left">
                              <p className={`text-[9px] font-black uppercase tracking-[0.3em] italic mb-1 ${selectedVenue === venue.name ? 'text-white/60' : 'text-slate-500'}`}>NODE ALPHA</p>
                              <p className="text-lg font-black uppercase italic tracking-tighter leading-none truncate w-full">{venue.name}</p>
                              <p className={`text-[10px] font-bold mt-2 italic ${selectedVenue === venue.name ? 'text-white' : 'text-brand-500'}`}>
                                  {venueStats[venue.name] || 0} PLAYERS
                              </p>
                          </div>
                      </div>
                      {selectedVenue === venue.name && (
                          <div className="absolute top-0 right-0 p-4 opacity-20"><Target size={40} /></div>
                      )}
                  </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="animate-slide-up">
        {viewMode === 'calendar' ? <CalendarView /> : (
            <div className="grid grid-cols-1 gap-6">
                {filteredEvents.length === 0 && (
                    <div className="glass-card p-24 text-center flex flex-col items-center border-dashed bg-white border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-1 ring-slate-100">
                            <CalendarIcon size={32} className="text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-display font-black text-slate-200 uppercase tracking-[0.2em] italic leading-none">NO EVENTS SCHEDULED</h3>
                        <p className="text-slate-300 mt-4 text-[9px] font-black uppercase tracking-[0.3em] italic">The academy schedule is currently empty.</p>
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
                          className={`group glass-card overflow-hidden flex flex-col md:flex-row transition-all duration-500 border border-slate-100 bg-white hover:ring-2 hover:ring-brand-500/10 ${isPast ? 'opacity-30' : ''}`}
                        >
                            {/* Temporal Anchor */}
                            <div className="w-full md:w-56 p-8 bg-slate-50 flex flex-row md:flex-col justify-between md:justify-center items-center gap-4 border-b md:border-b-0 md:border-r border-slate-100 relative">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(0,200,255,0.05),transparent_50%)]" />
                                <div className="text-center relative z-10">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-500">{dateObj.toLocaleDateString(undefined, { month: 'short' })}</span>
                                    <div className="text-5xl font-display font-black text-brand-950 leading-none my-2 tracking-tighter italic drop-shadow-sm">
                                        {dateObj.getDate()}
                                    </div>
                                    <span className="text-[9px] font-bold uppercase text-slate-300 tracking-[0.25em]">{dateObj.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                                </div>
                                <div className="h-px w-10 bg-slate-200 hidden md:block" />
                                <div className="flex items-center gap-2.5 bg-white px-5 py-2.5 rounded-xl border border-slate-100 shadow-sm group-hover:border-brand-500/30 transition-colors">
                                    <Clock size={14} className="text-brand-500" />
                                    <span className="text-xs font-display font-black text-brand-950">{event.time}</span>
                                </div>
                            </div>

                            {/* Mission Specs */}
                            <div className="flex-1 p-8 md:p-10 flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-500/5 blur-3xl rounded-full" />
                                
                                <div className="flex items-center justify-between mb-6">
                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2.5 bg-slate-50 border border-slate-100`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${s.dot} shadow-[0_0_8px_currentColor]`} />
                                        <span className="text-slate-400">{event.type}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-200 group-hover:text-brand-500 transition-colors">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>

                                <h3 className="text-3xl font-display font-black text-brand-950 mb-6 group-hover:text-brand-500 transition-all duration-500 italic uppercase tracking-tight leading-tight">
                                    {event.title}
                                </h3>
                                
                                <div className="flex flex-wrap items-center gap-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center transition-transform group-hover:rotate-12">
                                          <MapPin size={18} className="text-brand-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">LOCATION</span>
                                            <span className="text-sm text-slate-800 font-bold uppercase tracking-wide">{event.location}</span>
                                        </div>
                                    </div>
                                    
                                    {event.type === 'training' && event.drillIds && event.drillIds.length > 0 && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-500/5 rounded-xl border border-brand-500/10 flex items-center justify-center">
                                              <ClipboardList size={18} className="text-brand-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-brand-500 uppercase tracking-widest leading-none mb-1">TRAINING LOAD</span>
                                                <span className="text-sm text-slate-800 font-bold">{event.drillIds.length} SELECTED DRILLS</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {coach && (
                                        <div className="flex items-center gap-4 pl-8 border-l border-slate-100">
                                            <img src={coach.photoUrl || `https://ui-avatars.com/api/?name=${coach.username}`} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 object-cover shadow-sm group-hover:ring-2 group-hover:ring-brand-500/30 transition-all" />
                                            <div className="flex flex-col">
                                              <span className="text-[8px] uppercase text-slate-300 font-black tracking-widest leading-none mb-1">LEAD COACH</span>
                                              <span className="text-sm text-brand-500 font-black italic uppercase">{coach.username}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tactical Actions */}
                            {(role === 'admin' || role === 'coach') && (
                                <div className="p-8 md:p-10 flex flex-row md:flex-col items-center justify-center gap-4 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100">
                                   {!isPast ? (
                                       <>
                                          <button onClick={() => handleEdit(event)} className="w-full md:w-14 h-14 flex items-center justify-center bg-white border border-slate-200 text-slate-300 rounded-2xl hover:text-brand-500 hover:border-brand-500 hover:bg-white transition-all shadow-sm group/btn active:scale-90" title="Edit Event">
                                              <Edit3 size={20} strokeWidth={2.5} className="group-hover/btn:scale-110 transition-transform" />
                                          </button>
                                          <button onClick={() => handleDeleteClick(event.id)} className="w-full md:w-14 h-14 flex items-center justify-center bg-white border border-slate-200 text-slate-300 rounded-2xl hover:text-red-500 hover:border-red-500 hover:bg-white transition-all shadow-sm group/btn active:scale-90" title="Delete Event">
                                              <Trash2 size={20} strokeWidth={2.5} className="group-hover/btn:scale-110 transition-transform" />
                                          </button>
                                       </>
                                   ) : (
                                      <div className="text-center">
                                          <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 flex items-center justify-center grayscale">
                                              <History size={20} className="text-slate-200" />
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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-950/20 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="bg-slate-50 px-6 sm:px-10 py-6 sm:py-8 border-b border-slate-100 flex justify-between items-center relative">
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-500 opacity-10" />
                <div>
                   <h3 className="font-display font-black text-2xl sm:text-3xl text-brand-950 italic uppercase tracking-tight">{editingId ? 'EDIT' : 'ADD'} <span className="text-brand-500 uppercase">EVENT</span></h3>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Event Information</p>
                </div>
                <button type="button" onClick={() => setShowForm(false)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white hover:bg-slate-50 rounded-2xl text-slate-300 transition-colors border border-slate-200"><X size={20} strokeWidth={3} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 sm:space-y-10 custom-scrollbar">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-1 flex items-center gap-2"><ArrowRight size={10} strokeWidth={4} /> EVENT TITLE</label>
                <input required type="text" placeholder="e.g. U14 REGULAR TRAINING" className="w-full p-4 sm:p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-brand-500/50 outline-none font-display font-black text-brand-950 text-base sm:text-lg placeholder:text-slate-200 shadow-inner group" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">EVENT DATE</label>
                    <input required type="date" className="w-full p-4 sm:p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-brand-500/50 outline-none text-sm font-black text-slate-900 shadow-inner uppercase" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">START TIME</label>
                    <input required type="time" className="w-full p-4 sm:p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-brand-500/50 outline-none text-sm font-display font-black text-slate-900 shadow-inner" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">EVENT TYPE</label>
                    <div className="relative">
                        <select className="w-full p-4 sm:p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-brand-500/50 outline-none text-sm font-black text-slate-900 shadow-inner appearance-none uppercase" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                            <option value="training">Training</option>
                            <option value="match">Match</option>
                            <option value="social">Social/Event</option>
                        </select>
                        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-500 rotate-90" size={16} />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">LOCATION</label>
                    <input required type="text" placeholder="ACADEMY GROUND" className="w-full p-4 sm:p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-brand-500/50 outline-none text-sm font-black text-slate-900 shadow-inner placeholder:text-slate-200 uppercase" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                 </div>
              </div>

              <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">LEAD COACH</label>
                  <div className="relative">
                      <select className="w-full p-4 sm:p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:border-brand-500/50 outline-none text-sm font-black text-slate-900 shadow-inner appearance-none uppercase" value={form.leadCoachId} onChange={e => setForm({...form, leadCoachId: e.target.value})}>
                          <option value="">AWAITING ASSIGNMENT...</option>
                          {coaches.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
                      </select>
                      <UserIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-500" size={16} />
                  </div>
              </div>

              {form.type === 'training' && (
                  <div className="pt-10 border-t border-white/5 animate-in slide-in-from-top-4">
                      <div className="flex justify-between items-end mb-6">
                          <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-1 flex items-center gap-2"><ClipboardList size={14} className="text-brand-500" /> DRILL LIST</label>
                          <span className="text-[9px] font-black text-lime bg-lime/10 px-4 py-1.5 rounded-full border border-lime/20 shadow-[0_0_15px_rgba(195,246,41,0.1)]">{form.drillIds.length} DRILLS SELECTED</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-2 p-1">
                          {drills.length > 0 ? (
                              drills.map(drill => {
                                  const isSelected = form.drillIds.includes(drill.id);
                                  return (
                                      <div key={drill.id} onClick={() => toggleDrill(drill.id)} className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-brand-500/10 border-brand-500 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-brand-500/30'}`}>
                                          <div className="flex flex-col">
                                              <span className={`text-sm font-display font-black italic uppercase ${isSelected ? 'text-brand-500' : 'text-slate-900'}`}>{drill.title}</span>
                                              <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1">{drill.category} • {drill.duration} MIN SESSION</span>
                                          </div>
                                          {isSelected && <div className="bg-brand-500 text-white p-1.5 rounded-xl text-[8px] font-black px-3">SELECTED</div>}
                                      </div>
                                  );
                              })
                          ) : (
                              <p className="text-center text-[10px] text-white/20 py-8 italic font-black uppercase tracking-[0.2em]">No drills found. Add drills in the Training module.</p>
                          )}
                      </div>
                  </div>
              )}
            </form>

            <div className="px-6 sm:px-10 py-6 sm:py-8 border-t border-slate-100 bg-slate-50 flex gap-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 text-slate-300 font-black hover:text-slate-900 rounded-2xl transition-all text-[10px] uppercase tracking-[0.3em] font-display">CANCEL</button>
                <button onClick={handleSubmit} className="flex-[2] py-4 sm:py-5 bg-brand-500 text-white font-black rounded-2xl shadow-2xl shadow-brand-500/20 hover:scale-[1.02] transform active:scale-95 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] italic font-display border border-white/20">
                    <Save size={18} strokeWidth={3} /> {editingId ? 'UPDATE EVENT' : 'CREATE EVENT'}
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
          title="DELETE EVENT"
          message="Are you sure you want to remove this event? This will also remove any drill links associated with this session."
      />
    </div>
  );
};
