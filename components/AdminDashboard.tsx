import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { AttendanceRecord, Player, User, Venue, Batch, AttendanceStatus } from '../types';
import { 
  Users, Calendar, MapPin, Activity, TrendingUp, TrendingDown, 
  Search, Filter, ChevronRight, Zap, Target, 
  Layers, Clock, Shield, Command, AlertCircle, Radio, Check
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [selectedVenue, setSelectedVenue] = useState<string>('All Locations');
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [venueStats, setVenueStats] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({
    totalPlayers: 0,
    activeVenues: 0,
    dailyAttendance: 0,
    weeklyGrowth: 12,
    attendanceRate: 0
  });

  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const players = StorageService.getPlayers();
    const venues = StorageService.getVenues();
    const attendance = StorageService.getAttendance();
    
    setAvailableVenues(venues);

    // Calculate player counts per venue for the selector
    const counts: Record<string, number> = { 'All Locations': players.length };
    venues.forEach(v => {
        counts[v.name] = players.filter(p => p.venue === v.name).length;
    });
    setVenueStats(counts);

    // Filter data based on selected location
    const filteredPlayers = selectedVenue === 'All Locations' 
      ? players 
      : players.filter(p => p.venue === selectedVenue);

    const filteredAttendance = selectedVenue === 'All Locations'
      ? attendance
      : attendance.filter(r => r.venue === selectedVenue);

    // Calculate Stats
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = filteredAttendance.filter(r => r.date === today && String(r.status).toUpperCase() === AttendanceStatus.PRESENT);
    
    setStats({
      totalPlayers: filteredPlayers.length,
      activeVenues: selectedVenue === 'All Locations' ? venues.length : 1,
      dailyAttendance: todayAttendance.length,
      weeklyGrowth: 8,
      attendanceRate: filteredPlayers.length > 0 ? (todayAttendance.length / filteredPlayers.length) * 100 : 0
    });

    // Mock Attendance Data for Chart (Last 7 days)
    const chartData = [
      { name: 'MON', value: 45, rate: 88, active: 12 },
      { name: 'TUE', value: 52, rate: 92, active: 15 },
      { name: 'WED', value: 48, rate: 85, active: 10 },
      { name: 'THU', value: 61, rate: 95, active: 18 },
      { name: 'FRI', value: 55, rate: 90, active: 14 },
      { name: 'SAT', value: 68, rate: 98, active: 22 },
      { name: 'SUN', value: 63, rate: 94, active: 20 },
    ];
    setAttendanceData(chartData);
    setRecentRecords(filteredAttendance.slice(0, 10));
  }, [selectedVenue]);

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700 font-sans">
      {/* Dashboard Overview */}
      <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 bg-brand-500 p-8 md:p-12 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700"><Command size={180} className="text-white" /></div>
              <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3 px-4 py-1.5 bg-brand-950/10 w-fit rounded-full border border-black/5 backdrop-blur-sm">
                      <span className="w-2 h-2 rounded-full bg-brand-950 animate-pulse shadow-lg" />
                      <p className="text-[10px] font-black text-brand-950 uppercase tracking-[0.4em] italic leading-none">ACADEMY CONNECTED</p>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black italic text-white uppercase tracking-tighter leading-none pointer-events-none">
                     ACADEMY <span className="text-brand-950 font-black">DASHBOARD</span>
                  </h2>
                  <p className="text-brand-900/60 font-black uppercase text-[11px] tracking-[0.3em] mt-4 flex items-center gap-3 italic">
                      <Radio size={14} className="text-brand-950" /> Academy Performance Overview v4.0
                  </p>
              </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 xl:w-1/3">
              <div className="glass-card flex-1 p-8 rounded-[3rem] border-white/5 relative overflow-hidden group hover:border-brand-primary/20">
                  <div className="flex justify-between items-start mb-6">
                      <div className="p-4 bg-brand-primary/10 rounded-2xl text-brand-primary group-hover:scale-110 group-hover:bg-brand-primary group-hover:text-brand-950 transition-all duration-500 shadow-xl"><TrendingUp size={24} /></div>
                      <span className="text-[10px] font-black text-brand-primary bg-brand-primary/5 px-3 py-1 rounded-full border border-brand-primary/10 italic">+14% GROWTH</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">Overall Progress Rating</p>
                  <p className="text-5xl font-black text-slate-900 italic tracking-tighter">8.4<span className="text-brand-primary text-xl ml-2 font-black">pts</span></p>
              </div>
              <div className="glass-card flex-1 p-8 rounded-[3rem] border-white/5 bg-brand-primary/5 hover:bg-brand-primary/10 transition-all">
                  <div className="flex flex-col h-full justify-center items-center gap-4 py-4">
                      <div className="w-20 h-2 bg-brand-950 rounded-full overflow-hidden border border-white/5"><div className="w-3/4 h-full bg-brand-primary shadow-glow shadow-brand-primary/40 animate-pulse" /></div>
                      <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest italic">System Status</p>
                  </div>
              </div>
          </div>
      </div>

      {/* Location Control Hub */}
      <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary"><MapPin size={16} /></div>
                  <div>
                      <h3 className="text-sm font-black text-brand-900 italic uppercase tracking-tighter leading-none">LOCATION HUB</h3>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic mt-1">Satellite Feed Active</p>
                  </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">{availableVenues.length + 1} NODES CONNECTED</span>
              </div>
          </div>

          <div className="glass-card p-2 rounded-[2.5rem] border-white/10 bg-white/5 backdrop-blur-xl relative overflow-hidden group">
              <div className="flex gap-2 overflow-x-auto p-2 no-scrollbar">
                  <button 
                      onClick={() => setSelectedVenue('All Locations')}
                      className={`relative min-w-[200px] p-6 rounded-[2rem] border transition-all duration-500 group/btn overflow-hidden ${
                          selectedVenue === 'All Locations'
                          ? 'bg-brand-primary border-brand-primary text-brand-950 shadow-glow shadow-brand-primary/40'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10'
                      }`}
                  >
                      <div className="relative z-10 flex flex-col items-start gap-4">
                          <div className={`p-3 rounded-2xl transition-all duration-500 ${selectedVenue === 'All Locations' ? 'bg-brand-950 text-brand-primary' : 'bg-white/5 text-slate-500 group-hover/btn:scale-110'}`}>
                              <Layers size={20} />
                          </div>
                          <div className="text-left">
                              <p className={`text-[9px] font-black uppercase tracking-[0.3em] italic mb-1 ${selectedVenue === 'All Locations' ? 'text-brand-950/60' : 'text-slate-500'}`}>GLOBAL VIEW</p>
                              <p className="text-lg font-black uppercase italic tracking-tighter leading-none">ALL LOCATIONS</p>
                              <p className={`text-[10px] font-bold mt-2 italic ${selectedVenue === 'All Locations' ? 'text-brand-950' : 'text-brand-primary'}`}>
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
                              ? 'bg-brand-primary border-brand-primary text-brand-950 shadow-glow shadow-brand-primary/40'
                              : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10'
                          }`}
                      >
                          <div className="relative z-10 flex flex-col items-start gap-4">
                              <div className={`p-3 rounded-2xl transition-all duration-500 ${selectedVenue === venue.name ? 'bg-brand-950 text-brand-primary' : 'bg-white/5 text-slate-500 group-hover/btn:scale-110'}`}>
                                  <MapPin size={20} />
                              </div>
                              <div className="text-left">
                                  <p className={`text-[9px] font-black uppercase tracking-[0.3em] italic mb-1 ${selectedVenue === venue.name ? 'text-brand-950/60' : 'text-slate-500'}`}>NODE ALPHA</p>
                                  <p className="text-lg font-black uppercase italic tracking-tighter leading-none truncate w-full">{venue.name}</p>
                                  <p className={`text-[10px] font-bold mt-2 italic ${selectedVenue === venue.name ? 'text-brand-950' : 'text-brand-primary'}`}>
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

      {/* Academy Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'TOTAL PLAYERS', value: stats.totalPlayers, unit: 'PLAYERS', icon: Users, color: 'text-brand-primary' },
          { label: 'ATTENDANCE RATE', value: stats.attendanceRate.toFixed(1), unit: 'PERCENT', icon: Target, color: 'text-brand-accent' },
          { label: 'DAILY ATTENDANCE', value: stats.dailyAttendance, unit: 'PRESENT', icon: Activity, color: 'text-brand-primary' },
          { label: 'PLAYER RECORDS', value: StorageService.getAttendance().length.toLocaleString(), unit: 'LOGS', icon: Shield, color: 'text-brand-primary' },
        ].map((item, i) => (
          <div key={i} className="glass-card p-10 rounded-[2.5rem] border-slate-100/50 hover:bg-brand-50 transition-all group shadow-sm">
            <div className="flex justify-between items-start mb-10">
              <p className="text-[11px] font-black text-slate-400 italic uppercase tracking-[0.3em]">{item.label}</p>
              <item.icon size={20} className={`${item.color} group-hover:scale-125 transition-transform`} />
            </div>
            <div className="space-y-1">
              <p className="text-5xl font-black text-slate-900 italic tracking-tighter mb-2 leading-none">{item.value}</p>
              <p className="text-[9px] font-black text-brand-500 uppercase tracking-[0.4em] italic">{item.unit}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Activity Chart */}
        <div className="lg:col-span-2 glass-card p-10 rounded-[3.5rem] border-white/5 hover:border-brand-primary/10 transition-all group">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-brand-900 italic uppercase tracking-tighter leading-none flex items-center gap-3">
                <Clock className="text-brand-500" size={24} /> ACTIVITY LOG • <span className="text-brand-200">TODAY</span>
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Real-time attendance & metrics</p>
            </div>
            <div className="flex gap-2">
                <button className="px-5 py-2 bg-brand-500 text-white rounded-xl text-[10px] font-black uppercase italic tracking-widest shadow-lg shadow-brand-500/20">LIVE</button>
                <button className="px-5 py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase italic tracking-widest border border-slate-200">HISTORY</button>
            </div>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceData}>
                <defs>
                  <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C8FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00C8FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}
                  itemStyle={{ color: '#00C8FF', fontSize: '11px', fontWeight: 900 }}
                  labelStyle={{ display: 'none' }}
                />
                <Area type="monotone" dataKey="value" stroke="#00C8FF" strokeWidth={4} fillOpacity={1} fill="url(#cyanGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Statistics Card */}
        <div className="glass-card p-10 rounded-[3.5rem] bg-slate-50 border-slate-100 flex flex-col justify-between group overflow-hidden relative shadow-sm">
            <div className="absolute -top-10 -right-10 opacity-[0.05] group-hover:scale-125 transition-transform duration-1000"><Zap size={240} className="text-brand-500" /></div>
            
            <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 text-brand-500 group-hover:rotate-12 transition-transform"><AlertCircle size={20} /></div>
                    <h3 className="text-xl font-black text-brand-900 italic uppercase tracking-tighter">TEAM STATS</h3>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Team Statistics v4.0</p>
                
                <div className="space-y-6 pt-10">
                    {[
                        { label: 'TECHNICAL SKILLS', value: 88 },
                        { label: 'TEAMWORK', value: 94 },
                        { label: 'STAMINA', value: 72 }
                    ].map((m, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-brand-primary/60 italic"><span>{m.label}</span><span>{m.value}%</span></div>
                            <div className="h-1 bg-brand-950 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-brand-primary shadow-glow shadow-brand-primary/40" style={{ width: `${m.value}%` }} /></div>
                        </div>
                    ))}
                </div>
            </div>

            <button className="relative z-10 w-full py-5 bg-brand-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.4em] italic shadow-2xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all mt-10">DOWNLOAD REPORT</button>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="glass-card rounded-[3.5rem] border-slate-100 overflow-hidden shadow-sm">
          <div className="p-10 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter flex items-center gap-3"><Radio size={18} className="text-brand-500 animate-pulse" /> RECENT ACTIVITY</h3>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">UPDATING IN REAL-TIME</span>
          </div>
          <div className="divide-y divide-slate-100">
              {recentRecords.length > 0 ? recentRecords.slice(0, 5).map((record, i) => (
                  <div key={i} className="p-8 flex items-center justify-between hover:bg-slate-50 transition-all group">
                      <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform shadow-sm border border-slate-100"><Activity size={20} /></div>
                            <div>
                                <p className="text-sm font-black text-slate-900 italic uppercase tracking-tight">{record.playerName}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{record.venue} • {record.batch}</p>
                            </div>
                      </div>
                      <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">MARKED BY</p>
                                <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest italic">{record.markedBy}</p>
                            </div>
                            <div className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest italic ${record.status === AttendanceStatus.PRESENT ? 'bg-brand-500 text-white' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                                {record.status === AttendanceStatus.PRESENT ? 'PRESENT' : 'ABSENT'}
                            </div>
                      </div>
                  </div>
              )) : (
                <div className="p-20 text-center text-slate-300 uppercase text-[10px] font-black italic tracking-widest">No recent activity recorded</div>
              )}
          </div>
      </div>
    </div>
  );
};
