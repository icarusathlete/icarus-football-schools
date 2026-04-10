import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { AttendanceRecord, Player, Venue, AttendanceStatus } from '../types';
import {
  Users, MapPin, Activity, TrendingUp, Zap,
  Layers, Shield, Command, Star, Clock, Receipt,
  ChevronRight, UserPlus, Trophy, FileText, AlertCircle, Radio
} from 'lucide-react';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';


// ─── Helpers ────────────────────────────────────────────────────────────────

function getDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function getDayLabel(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

function getAgeGroup(dob: string): string {
  if (!dob) return 'Unknown';
  const birthYear = new Date(dob).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  if (age <= 8) return 'U8';
  if (age <= 10) return 'U10';
  if (age <= 12) return 'U12';
  if (age <= 14) return 'U14';
  if (age <= 16) return 'U16';
  if (age <= 18) return 'U18';
  return 'Adult';
}

const AGE_GROUPS = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'Adult'];
const AGE_COLORS = ['#CCFF00', '#a3e635', '#4ade80', '#34d399', '#22d3ee', '#60a5fa', '#818cf8'];

// ─── Types ───────────────────────────────────────────────────────────────────

interface CentreStat {
  name: string;
  players: number;
  presentToday: number;
  attendanceRate: number;
  avgRating: number;
  evaluatedCount: number;
  pendingFees: number;
}

interface ActivityItem {
  id: string;
  type: 'player' | 'attendance' | 'match' | 'fee';
  label: string;
  sub: string;
  timestamp: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
  const [selectedVenue, setSelectedVenue] = useState<string>('All Locations');
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [venueStats, setVenueStats] = useState<Record<string, number>>({});

  // Computed state
  const [quickStats, setQuickStats] = useState({ totalPlayers: 0, presentToday: 0, attendanceRate: 0, activeCentres: 0, pendingFees: 0 });
  const [centreComparison, setCentreComparison] = useState<CentreStat[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [ageData, setAgeData] = useState<{ name: string; value: number }[]>([]);
  const [perfSnapshot, setPerfSnapshot] = useState({ topPlayer: '', topRating: 0, avgRating: 0, evalCoverage: 0 });
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const players = StorageService.getPlayers();
    const venues = StorageService.getVenues();
    const attendance = StorageService.getAttendance();
    const matches = StorageService.getMatches();
    const fees = StorageService.getFees();

    setAvailableVenues(venues);

    const today = getDateOffset(0);

    // Venue player counts for the location selector
    const counts: Record<string, number> = { 'All Locations': players.length };
    venues.forEach(v => { counts[v.name] = players.filter(p => p.venue === v.name).length; });
    setVenueStats(counts);

    // Filtered scope
    const scopedPlayers = selectedVenue === 'All Locations' ? players : players.filter(p => p.venue === selectedVenue);
    const scopedAttendance = selectedVenue === 'All Locations' ? attendance : attendance.filter(r => r.venue === selectedVenue);

    // ── Quick Stats ──────────────────────────────────────────────────────────
    const presentToday = scopedAttendance.filter(r => r.date === today && String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length;
    const pendingFees = fees.filter(f => f.status === 'PENDING' || f.status === 'OVERDUE').length;

    setQuickStats({
      totalPlayers: scopedPlayers.length,
      presentToday,
      attendanceRate: scopedPlayers.length > 0 ? Math.round((presentToday / scopedPlayers.length) * 100) : 0,
      activeCentres: selectedVenue === 'All Locations' ? venues.length : 1,
      pendingFees,
    });

    // ── Centre Comparison ────────────────────────────────────────────────────
    const comparisons: CentreStat[] = venues.map(v => {
      const vPlayers = players.filter(p => p.venue === v.name);
      const vPresent = attendance.filter(r => r.venue === v.name && r.date === today && String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length;
      const evaluated = vPlayers.filter(p => p.evaluation?.overallRating);
      const avgRating = evaluated.length > 0
        ? Math.round((evaluated.reduce((sum, p) => sum + (p.evaluation?.overallRating ?? 0), 0) / evaluated.length) * 10) / 10
        : 0;
      const vPending = fees.filter(f => {
        const player = players.find(p => p.id === f.playerId);
        return player?.venue === v.name && (f.status === 'PENDING' || f.status === 'OVERDUE');
      }).length;

      return {
        name: v.name,
        players: vPlayers.length,
        presentToday: vPresent,
        attendanceRate: vPlayers.length > 0 ? Math.round((vPresent / vPlayers.length) * 100) : 0,
        avgRating,
        evaluatedCount: evaluated.length,
        pendingFees: vPending,
      };
    });
    setCentreComparison(comparisons);

    // ── Real 7-Day Chart ─────────────────────────────────────────────────────
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const date = getDateOffset(i - 6);
      const dayRecords = scopedAttendance.filter(r => r.date === date);
      const present = dayRecords.filter(r => String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length;
      const absent = dayRecords.filter(r => String(r.status).toUpperCase() === AttendanceStatus.ABSENT).length;
      const rate = (present + absent) > 0 ? Math.round((present / (present + absent)) * 100) : 0;
      return { name: getDayLabel(date), date, present, absent, rate };
    });
    setChartData(last7);

    // ── Age Distribution ─────────────────────────────────────────────────────
    const ageCounts: Record<string, number> = {};
    AGE_GROUPS.forEach(g => { ageCounts[g] = 0; });
    scopedPlayers.forEach(p => { const g = getAgeGroup(p.dateOfBirth); ageCounts[g] = (ageCounts[g] || 0) + 1; });
    setAgeData(AGE_GROUPS.map(g => ({ name: g, value: ageCounts[g] || 0 })).filter(g => g.value > 0));

    // ── Performance Snapshot ─────────────────────────────────────────────────
    const evaluatedPlayers = scopedPlayers.filter(p => p.evaluation?.overallRating);
    const avgRating = evaluatedPlayers.length > 0
      ? Math.round((evaluatedPlayers.reduce((s, p) => s + (p.evaluation?.overallRating ?? 0), 0) / evaluatedPlayers.length) * 10) / 10
      : 0;
    const topPlayer = evaluatedPlayers.sort((a, b) => (b.evaluation?.overallRating ?? 0) - (a.evaluation?.overallRating ?? 0))[0];
    setPerfSnapshot({
      topPlayer: topPlayer?.fullName ?? '—',
      topRating: topPlayer?.evaluation?.overallRating ?? 0,
      avgRating,
      evalCoverage: scopedPlayers.length > 0 ? Math.round((evaluatedPlayers.length / scopedPlayers.length) * 100) : 0,
    });

    // ── Activity Feed ────────────────────────────────────────────────────────
    const feed: ActivityItem[] = [];

    // Recent player registrations
    [...players]
      .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
      .slice(0, 4)
      .forEach(p => {
        feed.push({
          id: `player-${p.id}`,
          type: 'player',
          label: `${p.fullName} registered`,
          sub: `${p.venue || 'No Centre'} · ${new Date(p.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
          timestamp: new Date(p.registeredAt).getTime(),
        });
      });

    // Recent matches
    [...matches]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
      .forEach(m => {
        const resultLabel = m.result === 'W' ? 'Won' : m.result === 'L' ? 'Lost' : 'Drew';
        feed.push({
          id: `match-${m.id}`,
          type: 'match',
          label: `${resultLabel} vs ${m.opponent}`,
          sub: `${m.scoreFor}–${m.scoreAgainst} · ${new Date(m.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
          timestamp: new Date(m.date).getTime(),
        });
      });

    // Recent fee records
    [...fees]
      .sort((a, b) => (b.invoice?.date ? new Date(b.invoice.date).getTime() : 0) - (a.invoice?.date ? new Date(a.invoice.date).getTime() : 0))
      .slice(0, 3)
      .forEach(f => {
        const player = players.find(p => p.id === f.playerId);
        if (player && f.invoice) {
          feed.push({
            id: `fee-${f.id}`,
            type: 'fee',
            label: `Invoice ${f.invoice.invoiceNo}`,
            sub: `${player.fullName} · ₹${f.invoice.amount.toLocaleString('en-IN')}`,
            timestamp: new Date(f.invoice.date).getTime(),
          });
        }
      });

    feed.sort((a, b) => b.timestamp - a.timestamp);
    setActivityFeed(feed.slice(0, 10));

  }, [selectedVenue]);

  // ─── Render helpers ────────────────────────────────────────────────────────

  const activityColor: Record<ActivityItem['type'], string> = {
    player: '#CCFF00',
    attendance: '#60a5fa',
    match: '#f59e0b',
    fee: '#a78bfa',
  };
  const activityIcon: Record<ActivityItem['type'], React.ReactNode> = {
    player: <UserPlus size={13} />,
    attendance: <Activity size={13} />,
    match: <Trophy size={13} />,
    fee: <Receipt size={13} />,
  };

  const maxPlayers = Math.max(...centreComparison.map(c => c.players), 1);

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-700 font-display">

      {/* ── Hero Strip ───────────────────────────────────────────────────── */}
      <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
          <Command size={160} className="text-white" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black italic text-white uppercase tracking-tighter leading-none">
              ACADEMY <span className="text-[#CCFF00]">HUB</span>
            </h1>
            <p className="text-white/30 font-black uppercase text-[10px] tracking-[0.4em] italic mt-1">Command Centre // Live Intelligence</p>
          </div>

          {/* Quick Stat Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Players', value: quickStats.totalPlayers, icon: <Users size={12} />, color: '#CCFF00' },
              { label: 'Present Today', value: quickStats.presentToday, icon: <Activity size={12} />, color: '#4ade80' },
              { label: 'Attendance', value: `${quickStats.attendanceRate}%`, icon: <TrendingUp size={12} />, color: '#60a5fa' },
              { label: 'Centres', value: quickStats.activeCentres, icon: <MapPin size={12} />, color: '#f59e0b' },
              { label: 'Pending Fees', value: quickStats.pendingFees, icon: <Receipt size={12} />, color: quickStats.pendingFees > 0 ? '#f87171' : '#a3e635' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-2xl px-3 py-2">
                <span style={{ color: s.color }}>{s.icon}</span>
                <div className="leading-none">
                  <p className="text-[11px] font-black text-white">{s.value}</p>
                  <p className="text-[9px] font-bold text-white/40 uppercase italic">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Location Selector ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <MapPin size={14} className="text-[#CCFF00]" />
          <h2 className="text-xs font-black text-white/50 uppercase italic tracking-[0.35em]">LOCATION HUB</h2>
          <span className="bg-[#CCFF00]/10 text-[#CCFF00] px-2.5 py-0.5 rounded-lg text-[9px] font-black border border-[#CCFF00]/20">{availableVenues.length + 1} SITES</span>
        </div>
        <div className="bg-brand-900 px-3 py-2.5 rounded-[2rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedVenue('All Locations')}
              className={`flex-shrink-0 flex items-center gap-2 h-10 px-3.5 rounded-[1rem] border transition-all duration-300 group/btn ${selectedVenue === 'All Locations' ? 'bg-[#CCFF00] border-[#CCFF00] text-brand-950 shadow-[0_0_14px_rgba(204,255,0,0.4)]' : 'bg-white/5 border-white/5 text-white/50 hover:border-[#CCFF00]/25 hover:bg-[#CCFF00]/5 hover:text-white'}`}
            >
              <div className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all ${selectedVenue === 'All Locations' ? 'bg-brand-950/20' : 'bg-white/8 group-hover/btn:scale-110'}`}>
                <Layers size={11} strokeWidth={2.5} />
              </div>
              <div className="text-left leading-none">
                <p className="text-[10px] font-black uppercase italic tracking-tight whitespace-nowrap">All Locations</p>
                <p className={`text-[9px] font-bold italic whitespace-nowrap ${selectedVenue === 'All Locations' ? 'text-brand-950/60' : 'text-[#CCFF00]/60'}`}>{venueStats['All Locations'] || 0} players</p>
              </div>
            </button>
            <div className="w-px h-5 bg-white/10 flex-shrink-0" />
            {availableVenues.map(venue => (
              <button
                key={venue.id}
                onClick={() => setSelectedVenue(venue.name)}
                className={`flex-shrink-0 flex items-center gap-2 h-10 px-3.5 rounded-[1rem] border transition-all duration-300 group/btn ${selectedVenue === venue.name ? 'bg-[#CCFF00] border-[#CCFF00] text-brand-950 shadow-[0_0_14px_rgba(204,255,0,0.4)]' : 'bg-white/5 border-white/5 text-white/50 hover:border-[#CCFF00]/25 hover:bg-[#CCFF00]/5 hover:text-white'}`}
              >
                <div className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all ${selectedVenue === venue.name ? 'bg-brand-950/20' : 'bg-white/8 group-hover/btn:scale-110'}`}>
                  <MapPin size={11} strokeWidth={2.5} />
                </div>
                <div className="text-left leading-none">
                  <p className="text-[10px] font-black uppercase italic tracking-tight whitespace-nowrap">{venue.name}</p>
                  <p className={`text-[9px] font-bold italic whitespace-nowrap ${selectedVenue === venue.name ? 'text-brand-950/60' : 'text-[#CCFF00]/60'}`}>{venueStats[venue.name] || 0} players</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Centre Comparison Table ──────────────────────────────────────── */}
      {centreComparison.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <Zap size={14} className="text-[#CCFF00]" />
            <h2 className="text-xs font-black text-white/50 uppercase italic tracking-[0.35em]">CENTRE COMPARISON</h2>
          </div>
          <div className="bg-brand-900 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_60px_80px_70px_60px_70px] gap-0 px-5 py-3 border-b border-white/5">
              {['CENTRE', 'PLAYERS', 'TODAY', 'RATE', 'AVG ⭐', 'FEES DUE'].map((h, i) => (
                <p key={i} className={`text-[9px] font-black text-white/30 uppercase italic tracking-[0.2em] ${i > 0 ? 'text-right' : ''}`}>{h}</p>
              ))}
            </div>
            {/* Rows */}
            {centreComparison.map((c, i) => {
              const isBest = c.attendanceRate === Math.max(...centreComparison.map(x => x.attendanceRate)) && c.attendanceRate > 0;
              return (
                <div
                  key={c.name}
                  className={`grid grid-cols-[1fr_60px_80px_70px_60px_70px] gap-0 px-5 py-4 border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.02] ${isBest ? 'border-l-2 border-l-[#CCFF00]' : ''}`}
                >
                  {/* Centre name + bar */}
                  <div className="flex flex-col justify-center gap-1.5 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      {isBest && <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] flex-shrink-0" />}
                      <p className="text-[11px] font-black text-white uppercase italic tracking-tight truncate">{c.name}</p>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden w-full">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(c.players / maxPlayers) * 100}%`, background: '#CCFF00', opacity: 0.6 }}
                      />
                    </div>
                  </div>
                  <p className="text-[12px] font-black text-white text-right self-center">{c.players}</p>
                  <div className="text-right self-center">
                    <p className="text-[12px] font-black text-white">{c.presentToday}</p>
                    {c.players > 0 && <p className="text-[9px] text-white/30 italic">/ {c.players}</p>}
                  </div>
                  <div className="text-right self-center">
                    <p className={`text-[12px] font-black ${c.attendanceRate >= 75 ? 'text-[#CCFF00]' : c.attendanceRate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {c.attendanceRate}%
                    </p>
                  </div>
                  <p className="text-[12px] font-black text-white/70 text-right self-center">
                    {c.avgRating > 0 ? c.avgRating.toFixed(1) : '—'}
                  </p>
                  <p className={`text-[12px] font-black text-right self-center ${c.pendingFees > 0 ? 'text-red-400' : 'text-white/30'}`}>
                    {c.pendingFees > 0 ? c.pendingFees : '✓'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Chart Row: 7-Day Attendance + Performance Snapshot ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 7-Day Chart */}
        <div className="lg:col-span-2 bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                <Clock size={16} className="text-[#CCFF00]" />
                7-DAY ATTENDANCE
              </h3>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic mt-0.5">Real attendance from database</p>
            </div>
            <div className="flex gap-3 text-[9px] font-black uppercase italic">
              <span className="flex items-center gap-1.5 text-[#CCFF00]/70"><span className="w-2 h-2 rounded-full bg-[#CCFF00] inline-block" /> Present</span>
              <span className="flex items-center gap-1.5 text-red-400/70"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Absent</span>
            </div>
          </div>
          <div className="h-[250px] sm:h-[300px] w-full">
            {chartData.every(d => d.present === 0 && d.absent === 0) ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 opacity-40">
                <Activity size={32} className="text-white/20" />
                <p className="text-[10px] font-black text-white/30 uppercase italic tracking-widest">No attendance data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <defs>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#CCFF00" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 900 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 900 }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 900, marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="present" name="Present" stroke="#CCFF00" strokeWidth={2.5} fillOpacity={1} fill="url(#greenGrad)" dot={false} />
                  <Area type="monotone" dataKey="absent" name="Absent" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 3" fillOpacity={1} fill="url(#redGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Performance Snapshot */}
        <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Star size={16} className="text-[#CCFF00]" />
            <h3 className="text-base font-black text-white italic uppercase tracking-tighter">PERFORMANCE</h3>
          </div>

          {perfSnapshot.topRating > 0 ? (
            <>
              {/* Top Player */}
              <div className="bg-[#CCFF00]/5 border border-[#CCFF00]/10 rounded-2xl p-4 mb-4">
                <p className="text-[9px] font-black text-[#CCFF00]/60 uppercase italic tracking-widest mb-1">Top Rated Player</p>
                <p className="text-sm font-black text-white uppercase italic tracking-tight leading-tight">{perfSnapshot.topPlayer}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Star size={12} className="text-[#CCFF00] fill-[#CCFF00]" />
                  <span className="text-xl font-black text-[#CCFF00] italic">{perfSnapshot.topRating}</span>
                  <span className="text-[9px] text-white/30 font-black uppercase italic">/10</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-white/30 uppercase italic tracking-widest mb-1">Avg Rating</p>
                  <p className="text-2xl font-black text-white italic">{perfSnapshot.avgRating}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-white/30 uppercase italic tracking-widest mb-1">Evaluated</p>
                  <p className="text-2xl font-black text-white italic">{perfSnapshot.evalCoverage}%</p>
                </div>
              </div>

              {/* Eval coverage bar */}
              <div className="mt-auto space-y-1.5">
                <div className="flex justify-between text-[9px] font-black text-white/30 uppercase italic">
                  <span>Evaluation Coverage</span><span>{perfSnapshot.evalCoverage}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#CCFF00] rounded-full transition-all duration-1000" style={{ width: `${perfSnapshot.evalCoverage}%` }} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-40">
              <Shield size={32} className="text-white/20" />
              <p className="text-[10px] font-black text-white/30 uppercase italic tracking-widest text-center">No evaluations<br />recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Age Distribution + Activity Feed ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Age Distribution */}
        <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Users size={16} className="text-[#CCFF00]" />
            <h3 className="text-base font-black text-white italic uppercase tracking-tighter">AGE DISTRIBUTION</h3>
          </div>
          {ageData.length > 0 ? (
            <div className="space-y-3">
              {ageData.map((g, i) => {
                const maxVal = Math.max(...ageData.map(x => x.value));
                const pct = Math.round((g.value / maxVal) * 100);
                return (
                  <div key={g.name} className="flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase italic text-white/40 w-8 flex-shrink-0">{g.name}</span>
                    <div className="flex-1 h-5 bg-white/5 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg flex items-center px-2 transition-all duration-700"
                        style={{ width: `${pct}%`, background: AGE_COLORS[i % AGE_COLORS.length], minWidth: g.value > 0 ? '2rem' : '0' }}
                      >
                        <span className="text-[9px] font-black text-brand-950 italic">{g.value}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-white/30 italic w-10 text-right">{Math.round((g.value / (ageData.reduce((s, x) => s + x.value, 0))) * 100)}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-3 opacity-40">
              <Users size={32} className="text-white/20" />
              <p className="text-[10px] font-black text-white/30 uppercase italic tracking-widest">No player data</p>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Radio size={16} className="text-[#CCFF00]" />
            <h3 className="text-base font-black text-white italic uppercase tracking-tighter">LIVE ACTIVITY</h3>
          </div>
          {activityFeed.length > 0 ? (
            <div className="space-y-1">
              {activityFeed.map(item => (
                <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
                  <div
                    className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ background: `${activityColor[item.type]}15`, color: activityColor[item.type] }}
                  >
                    {activityIcon[item.type]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black text-white italic tracking-tight truncate">{item.label}</p>
                    <p className="text-[9px] font-bold text-white/30 italic">{item.sub}</p>
                  </div>
                  <div
                    className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2"
                    style={{ background: activityColor[item.type], opacity: 0.6 }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-3 opacity-40">
              <AlertCircle size={32} className="text-white/20" />
              <p className="text-[10px] font-black text-white/30 uppercase italic tracking-widest text-center">No activity<br />recorded yet</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
