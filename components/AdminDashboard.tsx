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
    <div className="space-y-8 pb-32 animate-in fade-in duration-700 font-display">
      {/* Dashboard Overview */}
      <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center flex-1 gap-6 bg-brand-900 p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700"><Command size={120} className="text-white" /></div>
              <div className="relative z-10 space-y-2">
                  <h2 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter leading-none pointer-events-none">
                     ACADEMY <span className="text-[#CCFF00] font-black">DASHBOARD</span>
                  </h2>
                  <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em] italic">Central Intelligence // Performance Metrics Hub</p>
              </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 xl:w-1/3">
              <div className="glass-card flex-1 p-8 rounded-[2.5rem] border-white/5 relative overflow-hidden group hover:border-brand-primary/20">
                  <div className="flex justify-between items-start mb-6">
                      <div className="p-4 bg-brand-primary/10 rounded-2xl text-brand-primary group-hover:scale-110 group-hover:bg-brand-primary group-hover:text-brand-950 transition-all duration-500 shadow-xl"><Users size={24} /></div>
                      <span className="text-[10px] font-black text-brand-primary bg-brand-primary/5 px-3 py-1 rounded-full border border-brand-primary/10 italic">TOTAL_ACTIVE</span>
                  </div>
                  <p className="text-[10px] font-black text-brand-950/60 uppercase tracking-[0.2em] mb-1 italic">Squad Enrollment</p>
                  <p className="text-5xl font-black text-slate-900 italic tracking-tighter">
                      {venueStats['All Locations'] || 0}
                      <span className="text-brand-primary text-xl ml-2 font-black uppercase">Units</span>
                  </p>
              </div>
          </div>
      </div>

      {/* Location Control Hub with Standard Bar Divider */}
      <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
              <div className="space-y-1">
                  <h2 className="text-xl font-black text-brand-950 uppercase italic tracking-[0.3em] flex items-center gap-3">
                      <MapPin className="text-brand-primary" size={20} /> 
                      LOCATION_HUB_INTERFACE
                      <span className="bg-brand-primary/10 text-brand-primary px-4 py-1 rounded-xl text-xs font-black ml-4 border border-brand-primary/20 shadow-xl">{availableVenues.length + 1} SITES</span>
                  </h2>
                  <div className="h-1 w-32 bg-brand-primary/20 rounded-full" />
              </div>
          </div>

          <div className="bg-brand-900 p-3 sm:p-4 rounded-[2rem] border border-white/5 shadow-2xl">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {/* All Locations chip */}
                  <button
                      onClick={() => setSelectedVenue('All Locations')}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-[1.2rem] border transition-all duration-300 group/btn ${
                          selectedVenue === 'All Locations'
                          ? 'bg-[#CCFF00] border-[#CCFF00] text-brand-950 shadow-[0_0_16px_rgba(204,255,0,0.35)]'
                          : 'bg-white/5 border-white/5 text-white/60 hover:border-[#CCFF00]/30 hover:bg-[#CCFF00]/5 hover:text-white'
                      }`}
                  >
                      <div className={`p-1.5 rounded-lg transition-all ${selectedVenue === 'All Locations' ? 'bg-brand-950/20' : 'bg-white/5 group-hover/btn:scale-110'}`}>
                          <Layers size={13} strokeWidth={2.5} />
                      </div>
                      <div className="text-left">
                          <p className="text-[10px] font-black uppercase italic tracking-tighter leading-none whitespace-nowrap">All Locations</p>
                          <p className={`text-[9px] font-bold italic leading-none mt-0.5 ${selectedVenue === 'All Locations' ? 'text-brand-950/70' : 'text-[#CCFF00]/70'}`}>
                              {venueStats['All Locations'] || 0} players
                          </p>
                      </div>
                  </button>

                  {/* Divider */}
                  <div className="w-px bg-white/10 flex-shrink-0 my-1" />

                  {availableVenues.map((venue) => (
                      <button
                          key={venue.id}
                          onClick={() => setSelectedVenue(venue.name)}
                          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-[1.2rem] border transition-all duration-300 group/btn ${
                              selectedVenue === venue.name
                              ? 'bg-[#CCFF00] border-[#CCFF00] text-brand-950 shadow-[0_0_16px_rgba(204,255,0,0.35)]'
                              : 'bg-white/5 border-white/5 text-white/60 hover:border-[#CCFF00]/30 hover:bg-[#CCFF00]/5 hover:text-white'
                          }`}
                      >
                          <div className={`p-1.5 rounded-lg transition-all ${selectedVenue === venue.name ? 'bg-brand-950/20' : 'bg-white/5 group-hover/btn:scale-110'}`}>
                              <MapPin size={13} strokeWidth={2.5} />
                          </div>
                          <div className="text-left">
                              <p className="text-[10px] font-black uppercase italic tracking-tighter leading-none whitespace-nowrap">{venue.name}</p>
                              <p className={`text-[9px] font-bold italic leading-none mt-0.5 ${selectedVenue === venue.name ? 'text-brand-950/70' : 'text-[#CCFF00]/70'}`}>
                                  {venueStats[venue.name] || 0} players
                              </p>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      </div>


      {/* Academy Insights Grid with Standard Bar Divider */}
      <section className="space-y-8">
          <div className="flex items-center justify-between px-2">
              <div className="space-y-1">
                  <h2 className="text-xl font-black text-brand-950 uppercase italic tracking-[0.3em] flex items-center gap-3">
                      <TrendingUp className="text-brand-primary" size={20} /> 
                      ACADEMY_INSIGHTS_MATRIX
                  </h2>
                  <div className="h-1 w-32 bg-brand-primary/20 rounded-full" />
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'TOTAL PLAYERS', value: stats.totalPlayers, unit: 'PLAYERS', icon: Users, color: 'text-brand-primary' },
              { label: 'ATTENDANCE RATE', value: stats.attendanceRate.toFixed(1), unit: 'PERCENT', icon: Target, color: 'text-brand-accent' },
              { label: 'DAILY ATTENDANCE', value: stats.dailyAttendance, unit: 'PRESENT', icon: Activity, color: 'text-brand-primary' },
              { label: 'PLAYER RECORDS', value: StorageService.getAttendance().length.toLocaleString(), unit: 'LOGS', icon: Shield, color: 'text-brand-primary' },
            ].map((item, i) => (
              <div key={i} className="glass-card p-10 rounded-[2.5rem] border-slate-100/50 hover:bg-brand-50 transition-all group shadow-sm">
                <div className="flex justify-between items-start mb-10">
                  <p className="text-[11px] font-black text-slate-500 italic uppercase tracking-[0.3em]">{item.label}</p>
                  <item.icon size={20} className={`${item.color} group-hover:scale-125 transition-transform`} />
                </div>
                <div className="space-y-1">
                  <p className="text-5xl font-black text-slate-900 italic tracking-tighter mb-2 leading-none">{item.value}</p>
                  <p className="text-[9px] font-black text-brand-500 uppercase tracking-[0.4em] italic">{item.unit}</p>
                </div>
              </div>
            ))}
          </div>
      </section>

      {/* Performance Analytics with Standard Bar Divider */}
      <section className="space-y-8">
          <div className="flex items-center justify-between px-2">
              <div className="space-y-1">
                  <h2 className="text-xl font-black text-brand-950 uppercase italic tracking-[0.3em] flex items-center gap-3">
                      <Zap className="text-brand-primary" size={20} /> 
                      PERFORMANCE_PROTOCOL_ANALYTICS
                  </h2>
                  <div className="h-1 w-32 bg-brand-primary/20 rounded-full" />
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Activity Chart */}
            <div className="lg:col-span-2 glass-card p-10 rounded-[2.5rem] border-white/5 hover:border-brand-primary/10 transition-all group">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-brand-900 italic uppercase tracking-tighter leading-none flex items-center gap-3">
                    <Clock className="text-brand-500" size={24} /> ACTIVITY LOG • <span className="text-brand-200 uppercase">Today</span>
                  </h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Real-time attendance & metrics sync</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-5 py-2 bg-brand-500 text-white rounded-xl text-[10px] font-black uppercase italic tracking-widest shadow-lg shadow-brand-500/20">LIVE_FEED</button>
                    <button className="px-5 py-2 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase italic tracking-widest border border-slate-200">HISTORY_LOG</button>
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
            <div className="glass-card p-10 rounded-[2.5rem] bg-slate-50 border-slate-100 flex flex-col justify-between group overflow-hidden relative shadow-sm">
                <div className="absolute -top-10 -right-10 opacity-[0.05] group-hover:scale-125 transition-transform duration-1000"><Zap size={240} className="text-brand-500" /></div>
                
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 text-brand-500 group-hover:rotate-12 transition-transform"><AlertCircle size={20} /></div>
                        <h3 className="text-xl font-black text-brand-900 italic uppercase tracking-tighter">DATASET_CORE</h3>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Intelligence Matrix v4.0</p>
                    
                    <div className="space-y-6 pt-10">
                        {[
                            { label: 'TECHNICAL_SKILLS', value: 88 },
                            { label: 'TACTICAL_SYNC', value: 94 },
                            { label: 'ENERGY_OUTPUT', value: 72 }
                        ].map((m, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-brand-950/60 italic"><span>{m.label}</span><span>{m.value}%</span></div>
                                <div className="h-1 bg-brand-950/10 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-brand-primary shadow-glow shadow-brand-primary/40" style={{ width: `${m.value}%` }} /></div>
                            </div>
                        ))}
                    </div>
                </div>

                <button className="relative z-10 w-full py-5 bg-brand-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.4em] italic shadow-2xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all mt-10">DOWNLOAD_INTEL_REPORT</button>
            </div>
          </div>
      </section>

    </div>
  );
};
