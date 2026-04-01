
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { ScheduleEvent, Role, Drill, User, EventType } from '../types';
import { Calendar, Clock, MapPin, Plus, MonitorPlay, Users, Coffee, Edit3, Trash2, X, Save, Trophy, ArrowRight, ClipboardList, Check, User as UserIcon, Filter, Zap, PartyPopper, ChevronRight } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface ScheduleProps {
  role: Role;
}

export const Schedule: React.FC<ScheduleProps> = ({ role }) => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | EventType>('all');
  
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

  useEffect(() => {
    const loadedEvents = loadEvents();
    loadDrills();
    loadCoaches();
    determineDefaultTab(loadedEvents);
  }, []);

  const loadEvents = () => {
    const allEvents = StorageService.getSchedule();
    // Sort by date/time
    allEvents.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    setEvents(allEvents);
    return allEvents;
  };

  const determineDefaultTab = (allEvents: ScheduleEvent[]) => {
      const now = new Date();
      // Find the first event that hasn't happened yet (or happened today)
      const nextEvent = allEvents.find(e => {
          const eventDate = new Date(`${e.date}T${e.time}`);
          return eventDate >= now;
      });

      if (nextEvent) {
          setActiveTab(nextEvent.type);
      } else {
          setActiveTab('all');
      }
  };

  const loadDrills = () => {
      setDrills(StorageService.getDrills());
  };

  const loadCoaches = () => {
      const allUsers = StorageService.getUsers();
      setCoaches(allUsers.filter(u => u.role === 'coach'));
  };

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
          loadEvents();
          setDeleteModalOpen(false);
          setEventToDelete(null);
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
        if (eventToUpdate) {
            StorageService.updateEvent({ ...eventToUpdate, ...form });
        }
    } else {
        StorageService.addEvent(form);
    }
    
    const updatedEvents = loadEvents();
    // If we created a new event, switch to that tab to show it
    if (!editingId) setActiveTab(form.type);
    
    setShowForm(false);
    setEditingId(null);
  };

  const isEventPast = (date: string, time: string) => {
      const eventDate = new Date(`${date}T${time}`);
      return new Date() > eventDate;
  };

  const filteredEvents = events.filter(e => activeTab === 'all' || e.type === activeTab);

  // --- UI COMPONENTS ---

  const TabButton = ({ type, label, icon: Icon, colorClass, activeClass }: any) => (
      <button
          onClick={() => setActiveTab(type)}
          className={`
              relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300
              ${activeTab === type ? `${activeClass} text-white shadow-lg transform scale-105` : `bg-white text-gray-500 hover:bg-gray-50 border border-gray-200`}
          `}
      >
          <Icon size={16} />
          <span className="hidden md:inline">{label}</span>
      </button>
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter text-gray-900" style={{ fontFamily: 'Orbitron' }}>
             TEAM <span className="text-icarus-500">SCHEDULE</span>
          </h2>
          <p className="text-gray-500 font-medium mt-2">Manage sessions, fixtures, and events.</p>
        </div>

        <div className="flex flex-wrap gap-3 bg-gray-100/50 p-1.5 rounded-2xl border border-gray-200 w-full lg:w-auto">
            <TabButton type="all" label="All" icon={Filter} activeClass="bg-gray-800" />
            <TabButton type="training" label="Training" icon={Zap} activeClass="bg-cyan-500" />
            <TabButton type="match" label="Matches" icon={Trophy} activeClass="bg-yellow-500" />
            <TabButton type="social" label="Events" icon={PartyPopper} activeClass="bg-purple-500" />
        </div>

        {(role === 'admin' || role === 'coach') && (
          <button 
            onClick={handleCreate}
            className="hidden lg:flex items-center gap-2 bg-icarus-900 text-white px-6 py-3 rounded-xl hover:bg-black transition-all shadow-lg shadow-icarus-900/20 active:scale-95"
          >
            <Plus size={20} />
            <span className="font-bold text-sm uppercase tracking-wider">New Activity</span>
          </button>
        )}
      </div>

      {/* Mobile Create Button */}
      {(role === 'admin' || role === 'coach') && (
          <button 
            onClick={handleCreate}
            className="lg:hidden w-full flex items-center justify-center gap-2 bg-icarus-900 text-white px-6 py-4 rounded-xl hover:bg-black transition-all shadow-lg active:scale-95"
          >
            <Plus size={20} />
            <span className="font-bold text-sm uppercase tracking-wider">Schedule New Activity</span>
          </button>
      )}

      {/* Event Stream */}
      <div className="space-y-4">
          {filteredEvents.length === 0 && (
             <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-16 text-center flex flex-col items-center">
                 <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                     activeTab === 'match' ? 'bg-yellow-50 text-yellow-300' :
                     activeTab === 'training' ? 'bg-cyan-50 text-cyan-300' :
                     activeTab === 'social' ? 'bg-purple-50 text-purple-300' : 'bg-gray-50 text-gray-300'
                 }`}>
                     <Calendar size={40} />
                 </div>
                 <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">No {activeTab === 'all' ? 'events' : activeTab} Scheduled</h3>
                 <p className="text-gray-400 mt-2 text-sm">Check back later or change filters.</p>
             </div>
          )}

          {filteredEvents.map((event) => {
              const isPast = isEventPast(event.date, event.time);
              const dateObj = new Date(event.date);
              const coach = coaches.find(c => c.id === event.leadCoachId);
              
              // Type-specific styles
              const getTypeStyles = () => {
                  switch(event.type) {
                      case 'match': return {
                          border: 'border-l-yellow-400', 
                          bg: 'bg-yellow-50', 
                          text: 'text-yellow-700',
                          icon: <Trophy size={18} className="text-yellow-600" />
                      };
                      case 'social': return {
                          border: 'border-l-purple-400', 
                          bg: 'bg-purple-50', 
                          text: 'text-purple-700',
                          icon: <PartyPopper size={18} className="text-purple-600" />
                      };
                      default: return {
                          border: 'border-l-cyan-400', 
                          bg: 'bg-cyan-50', 
                          text: 'text-cyan-700',
                          icon: <Zap size={18} className="text-cyan-600" />
                      };
                  }
              };
              const styles = getTypeStyles();

              return (
                  <div 
                    key={event.id} 
                    className={`group relative bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col md:flex-row ${isPast ? 'opacity-60 grayscale' : ''} border-l-4 ${styles.border}`}
                  >
                      {/* Left: Date & Time */}
                      <div className="w-full md:w-48 p-6 bg-gray-50/50 flex flex-row md:flex-col justify-between md:justify-center items-center gap-2 border-b md:border-b-0 md:border-r border-gray-100">
                          <div className="text-center">
                              <span className="text-xs font-black uppercase tracking-widest text-gray-400">{dateObj.toLocaleDateString(undefined, { month: 'short' })}</span>
                              <div className="text-3xl font-black text-gray-900 leading-none my-1" style={{ fontFamily: 'Orbitron' }}>{dateObj.getDate()}</div>
                              <span className="text-xs font-bold uppercase text-gray-400">{dateObj.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                          </div>
                          <div className="h-8 w-px bg-gray-200 hidden md:block my-2"></div>
                          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                              <Clock size={14} className="text-icarus-500" />
                              <span className="text-xs font-bold text-gray-700">{event.time}</span>
                          </div>
                      </div>

                      {/* Middle: Content */}
                      <div className="flex-1 p-6 flex flex-col justify-center relative">
                          {/* Type Badge */}
                          <div className="absolute top-6 right-6 hidden md:block">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${styles.bg} ${styles.text}`}>
                                  {styles.icon} {event.type}
                              </span>
                          </div>

                          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-icarus-600 transition-colors flex items-center gap-3">
                              {event.title}
                              <span className={`md:hidden px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${styles.bg} ${styles.text}`}>{event.type}</span>
                          </h3>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-500 mt-2">
                              <div className="flex items-center gap-2">
                                  <MapPin size={16} className="text-gray-400" />
                                  {event.location}
                              </div>
                              
                              {/* Contextual Info based on type */}
                              {event.type === 'training' && event.drillIds && event.drillIds.length > 0 && (
                                  <div className="flex items-center gap-2 text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">
                                      <ClipboardList size={14} />
                                      <span className="text-xs font-bold">{event.drillIds.length} Drills</span>
                                  </div>
                              )}
                              
                              {coach && (
                                  <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                                      <img src={coach.photoUrl || `https://ui-avatars.com/api/?name=${coach.username}`} className="w-5 h-5 rounded-full bg-gray-200" />
                                      <span className="text-xs font-bold text-gray-700">{coach.username}</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Right: Actions */}
                      {(role === 'admin' || role === 'coach') && (
                          <div className="p-4 md:p-6 flex flex-row md:flex-col items-center justify-center gap-2 bg-gray-50/30 border-t md:border-t-0 md:border-l border-gray-100">
                             {!isPast ? (
                                 <>
                                    <button 
                                        onClick={() => handleEdit(event)}
                                        className="w-full md:w-auto p-3 bg-white border border-gray-200 text-gray-500 rounded-xl hover:text-icarus-600 hover:border-icarus-500 transition-all shadow-sm group/btn"
                                        title="Edit Event"
                                    >
                                        <Edit3 size={18} className="group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteClick(event.id)}
                                        className="w-full md:w-auto p-3 bg-white border border-gray-200 text-gray-500 rounded-xl hover:text-red-500 hover:border-red-500 transition-all shadow-sm group/btn"
                                        title="Delete Event"
                                    >
                                        <Trash2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                 </>
                             ) : (
                                <div className="text-center px-4">
                                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Locked</span>
                                </div>
                             )}
                          </div>
                      )}
                  </div>
              );
          })}
      </div>

      {/* Modal Form (Reused Logic, Updated Style) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-xl text-gray-800">{editingId ? 'Edit Activity' : 'New Activity'}</h3>
                <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-5 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Activity Title</label>
                <input 
                    required 
                    type="text" 
                    placeholder="e.g. Tactical Session / League Match"
                    className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none font-bold text-gray-900"
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Date</label>
                    <input 
                        required 
                        type="date" 
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-medium"
                        value={form.date} 
                        onChange={e => setForm({...form, date: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Time</label>
                    <input 
                        required 
                        type="time" 
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-medium"
                        value={form.time} 
                        onChange={e => setForm({...form, time: e.target.value})} 
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Type</label>
                    <select 
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-medium bg-white"
                        value={form.type} 
                        onChange={e => setForm({...form, type: e.target.value as any})}
                    >
                        <option value="training">Training</option>
                        <option value="match">Match</option>
                        <option value="social">Event</option>
                    </select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Location</label>
                    <input 
                        required 
                        type="text" 
                        placeholder="Pitch A"
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-medium"
                        value={form.location} 
                        onChange={e => setForm({...form, location: e.target.value})} 
                    />
                 </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Lead Coach</label>
                  <select 
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-medium bg-white"
                      value={form.leadCoachId} 
                      onChange={e => setForm({...form, leadCoachId: e.target.value})}
                  >
                      <option value="">Select Coach...</option>
                      {coaches.map(c => (
                          <option key={c.id} value={c.id}>{c.username}</option>
                      ))}
                  </select>
              </div>

              {/* Drill Selector - Only for Training Sessions */}
              {form.type === 'training' && (
                  <div className="pt-4 border-t border-gray-100 animate-in fade-in">
                      <div className="flex justify-between items-end mb-3">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                              <ClipboardList size={14} /> Session Drills
                          </label>
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{form.drillIds.length} Selected</span>
                      </div>
                      
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {drills.length > 0 ? (
                              <div className="space-y-1">
                                  {drills.map(drill => {
                                      const isSelected = form.drillIds.includes(drill.id);
                                      return (
                                          <div 
                                            key={drill.id} 
                                            onClick={() => toggleDrill(drill.id)}
                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-white border border-icarus-500 shadow-sm' : 'hover:bg-white border border-transparent'}`}
                                          >
                                              <div className="flex flex-col">
                                                  <span className={`text-sm font-bold ${isSelected ? 'text-icarus-700' : 'text-gray-700'}`}>{drill.title}</span>
                                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{drill.category} • {drill.duration} min</span>
                                              </div>
                                              {isSelected && <div className="bg-icarus-500 text-white p-1 rounded-full"><Check size={12} strokeWidth={3} /></div>}
                                          </div>
                                      );
                                  })}
                              </div>
                          ) : (
                              <p className="text-center text-xs text-gray-400 py-4">No drills created yet.</p>
                          )}
                      </div>
                  </div>
              )}
            </form>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors text-sm">Cancel</button>
                <button onClick={handleSubmit} className="flex-1 py-3 bg-icarus-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider">
                    <Save size={16} />
                    {editingId ? 'Update Activity' : 'Schedule Activity'}
                </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
              setDeleteModalOpen(false);
              setEventToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone."
          confirmText="Delete"
          type="danger"
      />
    </div>
  );
};
