import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { Venue, AttendanceStatus } from '../types';
import {
  Users, MapPin, Activity, TrendingUp, Zap, Layers, Shield,
  Command, Star, Clock, Receipt, UserPlus, Trophy, AlertCircle,
  Radio, ChevronDown, AlertTriangle, CheckCircle, XCircle, Timer
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const age = new Date().getFullYear() - new Date(dob).getFullYear();
  if (age <= 8) return 'U8';
  if (age <= 10) return 'U10';
  if (age <= 12) return 'U12';
  if (age <= 14) return 'U14';
  if (age <= 16) return 'U16';
  if (age <= 18) return 'U18';
  return 'Senior';
}

const AGE_GROUPS = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'Senior'];
const AGE_COLORS = ['#CCFF00', '#a3e635', '#4ade80', '#34d399', '#22d3ee', '#60a5fa', '#818cf8'];

interface CentreStat {
  name: string; players: number; presentToday: number;
  attendanceRate: number; avgRating: number; pendingFees: number;
}
interface ActivityItem {
  id: string; type: 'player' | 'match' | 'fee';
  label: string; sub: string; timestamp: number;
}
interface AlertItem {
  id: string; severity: 'critical' | 'warning' | 'info';
  icon: React.ReactNode; title: string; detail: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
  const [selectedVenue, setSelectedVenue] = useState<string>('All Locations');
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [venueStats, setVenueStats] = useState<Record<string, number>>({});

  // Overview mode state
  const [quickStats, setQuickStats] = useState({ totalPlayers: 0, presentToday: 0, attendanceRate: 0, activeCentres: 0, pendingFees: 0 });
  const [centreComparison, setCentreComparison] = useState<CentreStat[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [ageData, setAgeData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [perfSnapshot, setPerfSnapshot] = useState({ topPlayer: '', topRating: 0, avgRating: 0, evalCoverage: 0 });
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // Centre drill-down state (used when specific venue is selected)
  const [drillPlayers, setDrillPlayers] = useState<{ name: string; memberId: string; rate: number; sessions: number; present: number }[]>([]);

  const isOverview = selectedVenue === 'All Locations';

  useEffect(() => {
    const players = StorageService.getPlayers();
    const venues = StorageService.getVenues();
    const attendance = StorageService.getAttendance();
    const matches = StorageService.getMatches();
    const fees = StorageService.getFees();

    setAvailableVenues(venues);
    const today = getDateOffset(0);
    const thirtyDaysAgo = getDateOffset(-30);
    const thirtyDaysFromNow = getDateOffset(30);

    // Venue pill counts
    const counts: Record<string, number> = { 'All Locations': players.length };
    venues.forEach(v => { counts[v.name] = players.filter(p => p.venue === v.name).length; });
    setVenueStats(counts);

    const scopedPlayers = isOverview ? players : players.filter(p => p.venue === selectedVenue);
    const scopedAttendance = isOverview ? attendance : attendance.filter(r => r.venue === selectedVenue);

    // ── Alerts (always global — admin needs to see full picture) ──────────────
    const newAlerts: AlertItem[] = [];

    // 1. Overdue fees
    const overdueCount = fees.filter(f => f.status === 'OVERDUE').length;
    if (overdueCount > 0) {
      newAlerts.push({
        id: 'overdue', severity: 'critical',
        icon: <XCircle size={14} />,
        title: `${overdueCount} Overdue Fee${overdueCount > 1 ? 's' : ''}`,
        detail: 'Immediate collection required',
      });
    }

    // 2. Packages expiring in next 30 days
    const expiringPackages = fees.filter(f => {
      if (!f.invoice?.validTill || f.status !== 'PAID') return false;
      return f.invoice.validTill >= today && f.invoice.validTill <= thirtyDaysFromNow;
    });
    if (expiringPackages.length > 0) {
      newAlerts.push({
        id: 'expiring', severity: 'warning',
        icon: <Timer size={14} />,
        title: `${expiringPackages.length} Package${expiringPackages.length > 1 ? 's' : ''} Expiring`,
        detail: 'Due within the next 30 days',
      });
    }

    // 3. Low attendance players (< 60% in last 30 days, min 3 sessions)
    const lowAttendancePlayers = players.filter(p => {
      const recent = attendance.filter(r => r.playerId === p.id && r.date >= thirtyDaysAgo);
      if (recent.length < 3) return false;
      const present = recent.filter(r => String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length;
      return (present / recent.length) < 0.6;
    });
    if (lowAttendancePlayers.length > 0) {
      newAlerts.push({
        id: 'lowatt', severity: 'warning',
        icon: <Activity size={14} />,
        title: `${lowAttendancePlayers.length} Player${lowAttendancePlayers.length > 1 ? 's' : ''} with Low Attendance`,
        detail: lowAttendancePlayers.slice(0, 2).map(p => p.fullName.split(' ')[0]).join(', ') + (lowAttendancePlayers.length > 2 ? ` +${lowAttendancePlayers.length - 2} more` : ''),
      });
    }

    // 4. Centres below fill rate (< 3 players)
    const emptyOrLowCentres = venues.filter(v => players.filter(p => p.venue === v.name).length < 3);
    if (emptyOrLowCentres.length > 0) {
      newAlerts.push({
        id: 'lowfill', severity: 'info',
        icon: <MapPin size={14} />,
        title: `${emptyOrLowCentres.length} Centre${emptyOrLowCentres.length > 1 ? 's' : ''} Under-Enrolled`,
        detail: emptyOrLowCentres.map(v => v.name.split(' ')[0]).join(', '),
      });
    }

    setAlerts(newAlerts);

    // ── Quick Stats ───────────────────────────────────────────────────────────
    const presentToday = scopedAttendance.filter(r => r.date === today && String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length;
    const pendingFees = fees.filter(f => f.status === 'PENDING' || f.status === 'OVERDUE').length;

    setQuickStats({
      totalPlayers: scopedPlayers.length,
      presentToday,
      attendanceRate: scopedPlayers.length > 0 ? Math.round((presentToday / scopedPlayers.length) * 100) : 0,
      activeCentres: isOverview ? venues.length : 1,
      pendingFees,
    });

    // ── Centre Comparison (overview only) ─────────────────────────────────────
    if (isOverview) {
      const comparisons: CentreStat[] = venues.map(v => {
        const vPlayers = players.filter(p => p.venue === v.name);
        const vPresent = attendance.filter(r => r.venue === v.name && r.date === today && String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length;
        const evaluated = vPlayers.filter(p => p.evaluation?.overallRating);
        const avgRating = evaluated.length > 0
          ? Math.round((evaluated.reduce((s, p) => s + (p.evaluation?.overallRating ?? 0), 0) / evaluated.length) * 10) / 10 : 0;
        const vPending = fees.filter(f => {
          const pl = players.find(p => p.id === f.playerId);
          return pl?.venue === v.name && (f.status === 'PENDING' || f.status === 'OVERDUE');
        }).length;
        return { name: v.name, players: vPlayers.length, presentToday: vPresent, attendanceRate: vPlayers.length > 0 ? Math.round((vPresent / vPlayers.length) * 100) : 0, avgRating, pendingFees: vPending };
      });
      setCentreComparison(comparisons);
    } else {
      // ── Centre Drill-Down: per-player attendance ──────────────────────────
      const drillData = scopedPlayers.map(p => {
        const recent = attendance.filter(r => r.playerId === p.id && r.date >= thirtyDaysAgo);
        const present = recent.filter(r => String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length;
        return {
          name: p.fullName,
          memberId: p.memberId || '',
          sessions: recent.length,
          present,
          rate: recent.length > 0 ? Math.round((present / recent.length) * 100) : 0,
        };
      }).sort((a, b) => a.rate - b.rate);
      setDrillPlayers(drillData);
    }

    // ── 7-Day Chart ───────────────────────────────────────────────────────────
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const date = getDateOffset(i - 6);
      const dayRecords = scopedAttendance.filter(r => r.date === date);
      const present = dayRecords.filter(r => String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length;
      const absent = dayRecords.filter(r => String(r.status).toUpperCase() === AttendanceStatus.ABSENT).length;
      return { name: getDayLabel(date), present, absent };
    });
    setChartData(last7);

    // ── Age Distribution ──────────────────────────────────────────────────────
    const ageCounts: Record<string, number> = {};
    AGE_GROUPS.forEach(g => { ageCounts[g] = 0; });
    scopedPlayers.forEach(p => { const g = getAgeGroup(p.dateOfBirth); ageCounts[g] = (ageCounts[g] || 0) + 1; });
    setAgeData(AGE_GROUPS.map((g, i) => ({ name: g, value: ageCounts[g] || 0, color: AGE_COLORS[i] })).filter(g => g.value > 0));

    // ── Performance Snapshot ──────────────────────────────────────────────────
    const evaluated = scopedPlayers.filter(p => p.evaluation?.overallRating);
    const avgRating = evaluated.length > 0
      ? Math.round((evaluated.reduce((s, p) => s + (p.evaluation?.overallRating ?? 0), 0) / evaluated.length) * 10) / 10 : 0;
    const topPlayer = [...evaluated].sort((a, b) => (b.evaluation?.overallRating ?? 0) - (a.evaluation?.overallRating ?? 0))[0];
    setPerfSnapshot({ topPlayer: topPlayer?.fullName ?? '—', topRating: topPlayer?.evaluation?.overallRating ?? 0, avgRating, evalCoverage: scopedPlayers.length > 0 ? Math.round((evaluated.length / scopedPlayers.length) * 100) : 0 });

    // ── Activity Feed ─────────────────────────────────────────────────────────
    const feed: ActivityItem[] = [];
    [...players].sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()).slice(0, 3).forEach(p => {
      feed.push({ id: `player-${p.id}`, type: 'player', label: `${p.fullName} registered`, sub: `${p.venue || 'No Centre'} · ${new Date(p.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, timestamp: new Date(p.registeredAt).getTime() });
    });
    [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3).forEach(m => {
      const r = m.result === 'W' ? 'Won' : m.result === 'L' ? 'Lost' : 'Drew';
      feed.push({ id: `match-${m.id}`, type: 'match', label: `${r} vs ${m.opponent}`, sub: `${m.scoreFor}–${m.scoreAgainst} · ${new Date(m.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, timestamp: new Date(m.date).getTime() });
    });
    [...fees].filter(f => f.invoice).sort((a, b) => new Date(b.invoice!.date).getTime() - new Date(a.invoice!.date).getTime()).slice(0, 3).forEach(f => {
      const pl = players.find(p => p.id === f.playerId);
      if (pl) feed.push({ id: `fee-${f.id}`, type: 'fee', label: `Invoice ${f.invoice!.invoiceNo}`, sub: `${pl.fullName} · ₹${f.invoice!.amount.toLocaleString('en-IN')}`, timestamp: new Date(f.invoice!.date).getTime() });
    });
    setActivityFeed(feed.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));

  }, [selectedVenue]);

  // ─── Sub-components ───────────────────────────────────────────────────────

  const activityColor = { player: '#CCFF00', match: '#f59e0b', fee: '#a78bfa' } as const;
  const activityIcon = { player: <UserPlus size={12} />, match: <Trophy size={12} />, fee: <Receipt size={12} /> } as const;
  const alertStyle = {
    critical: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500' },
    warning:  { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    info:     { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  };

  const maxPlayers = Math.max(...centreComparison.map(c => c.players), 1);

  return (
    <div className="space-y-5 pb-32 animate-in fade-in duration-700 font-display">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none"><Command size={160} className="text-white" /></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black italic text-white uppercase tracking-tighter leading-none">
              ACADEMY <span className="text-[#CCFF00]">HUB</span>
            </h1>
            <p className="text-white/30 font-black uppercase text-[10px] tracking-[0.4em] italic mt-1">
              {isOverview ? 'All Centres Overview' : `Centre Drill-Down · ${selectedVenue}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: isOverview ? 'Total Players' : 'In This Centre', value: quickStats.totalPlayers, color: '#CCFF00' },
              { label: 'Present Today', value: quickStats.presentToday, color: '#4ade80' },
              { label: 'Today\'s Rate', value: `${quickStats.attendanceRate}%`, color: '#60a5fa' },
              { label: 'Fees Pending', value: quickStats.pendingFees, color: quickStats.pendingFees > 0 ? '#f87171' : '#6b7280' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-2xl px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <div className="leading-none">
                  <p className="text-[12px] font-black text-white">{s.value}</p>
                  <p className="text-[9px] font-bold text-white/35 uppercase italic">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle size={13} className="text-amber-400" />
            <p className="text-[10px] font-black text-white/40 uppercase italic tracking-[0.3em]">ACTION REQUIRED</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {alerts.map(alert => {
              const s = alertStyle[alert.severity];
              return (
                <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-[1.5rem] border ${s.border} ${s.bg}`}>
                  <div className={`mt-0.5 flex-shrink-0 ${s.text}`}>{alert.icon}</div>
                  <div className="min-w-0">
                    <p className={`text-[11px] font-black italic ${s.text} leading-tight`}>{alert.title}</p>
                    <p className="text-[9px] font-bold text-white/30 italic mt-0.5 truncate">{alert.detail}</p>
                  </div>
                </div>
              );
            })}
            {alerts.length === 0 && (
              <div className="flex items-center gap-3 p-4 rounded-[1.5rem] border border-[#CCFF00]/20 bg-[#CCFF00]/5 col-span-full">
                <CheckCircle size={14} className="text-[#CCFF00]" />
                <p className="text-[11px] font-black italic text-[#CCFF00]">All clear — no urgent actions needed</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Location Selector ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <MapPin size={13} className="text-[#CCFF00]" />
          <p className="text-[10px] font-black text-white/40 uppercase italic tracking-[0.3em]">
            {isOverview ? 'SELECT A CENTRE TO DRILL DOWN' : 'DRILL-DOWN MODE — CLICK ANOTHER OR ALL LOCATIONS'}
          </p>
          <span className="bg-[#CCFF00]/10 text-[#CCFF00] px-2 py-0.5 rounded-lg text-[9px] font-black border border-[#CCFF00]/20">{availableVenues.length + 1} SITES</span>
        </div>
        <div className="bg-brand-900 px-3 py-2.5 rounded-[2rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedVenue('All Locations')}
              className={`flex-shrink-0 flex items-center gap-2 h-10 px-3.5 rounded-[1rem] border transition-all duration-300 group/btn ${isOverview ? 'bg-[#CCFF00] border-[#CCFF00] text-brand-950 shadow-[0_0_14px_rgba(204,255,0,0.4)]' : 'bg-white/5 border-white/5 text-white/50 hover:border-[#CCFF00]/25 hover:bg-[#CCFF00]/5 hover:text-white'}`}
            >
              <div className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${isOverview ? 'bg-brand-950/20' : 'bg-white/5'}`}><Layers size={11} strokeWidth={2.5} /></div>
              <div className="text-left leading-none">
                <p className="text-[10px] font-black uppercase italic tracking-tight whitespace-nowrap">Overview</p>
                <p className={`text-[9px] font-bold italic whitespace-nowrap ${isOverview ? 'text-brand-950/60' : 'text-[#CCFF00]/60'}`}>{venueStats['All Locations'] || 0} players</p>
              </div>
            </button>
            <div className="w-px h-5 bg-white/10 flex-shrink-0" />
            {availableVenues.map(venue => {
              const isActive = selectedVenue === venue.name;
              return (
                <button
                  key={venue.id}
                  onClick={() => setSelectedVenue(venue.name)}
                  className={`flex-shrink-0 flex items-center gap-2 h-10 px-3.5 rounded-[1rem] border transition-all duration-300 group/btn ${isActive ? 'bg-[#CCFF00] border-[#CCFF00] text-brand-950 shadow-[0_0_14px_rgba(204,255,0,0.4)]' : 'bg-white/5 border-white/5 text-white/50 hover:border-[#CCFF00]/25 hover:bg-[#CCFF00]/5 hover:text-white'}`}
                >
                  <div className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${isActive ? 'bg-brand-950/20' : 'bg-white/5'}`}><MapPin size={11} strokeWidth={2.5} /></div>
                  <div className="text-left leading-none">
                    <p className="text-[10px] font-black uppercase italic tracking-tight whitespace-nowrap">{venue.name}</p>
                    <p className={`text-[9px] font-bold italic whitespace-nowrap ${isActive ? 'text-brand-950/60' : 'text-[#CCFF00]/60'}`}>{venueStats[venue.name] || 0} players</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* OVERVIEW MODE                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isOverview && (
        <>
          {/* Centre Comparison */}
          {centreComparison.length > 0 && (
            <div className="bg-brand-900 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
              <div className="grid grid-cols-[1fr_64px_88px_72px_64px_80px] px-5 py-3 border-b border-white/5">
                {['CENTRE', 'PLAYERS', 'TODAY', 'RATE', 'AVG ⭐', 'FEES'].map((h, i) => (
                  <p key={i} className={`text-[9px] font-black text-white/25 uppercase italic tracking-[0.2em] ${i > 0 ? 'text-right' : ''}`}>{h}</p>
                ))}
              </div>
              {centreComparison.filter(c => c.players > 0).map(c => {
                const isBest = c.attendanceRate === Math.max(...centreComparison.map(x => x.attendanceRate)) && c.attendanceRate > 0;
                return (
                  <button
                    key={c.name}
                    onClick={() => setSelectedVenue(c.name)}
                    className={`w-full grid grid-cols-[1fr_64px_88px_72px_64px_80px] px-5 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors text-left ${isBest ? 'border-l-2 border-l-[#CCFF00]' : ''}`}
                  >
                    <div className="flex flex-col justify-center gap-1.5 pr-3 min-w-0">
                      <div className="flex items-center gap-2">
                        {isBest && <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] flex-shrink-0" />}
                        <p className="text-[11px] font-black text-white uppercase italic tracking-tight truncate">{c.name}</p>
                        <ChevronDown size={10} className="text-white/20 flex-shrink-0 -rotate-90" />
                      </div>
                      <div className="h-[3px] bg-white/5 rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${(c.players / maxPlayers) * 100}%`, background: '#CCFF00', opacity: 0.5 }} />
                      </div>
                    </div>
                    <p className="text-[12px] font-black text-white text-right self-center">{c.players}</p>
                    <div className="text-right self-center">
                      <p className="text-[12px] font-black text-white">{c.presentToday}</p>
                      <p className="text-[9px] text-white/25 italic">/ {c.players}</p>
                    </div>
                    <p className={`text-[12px] font-black text-right self-center ${c.attendanceRate >= 75 ? 'text-[#CCFF00]' : c.attendanceRate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{c.attendanceRate}%</p>
                    <p className="text-[12px] font-black text-white/60 text-right self-center">{c.avgRating > 0 ? c.avgRating.toFixed(1) : '—'}</p>
                    <p className={`text-[12px] font-black text-right self-center ${c.pendingFees > 0 ? 'text-red-400' : 'text-white/20'}`}>{c.pendingFees > 0 ? c.pendingFees : '✓'}</p>
                  </button>
                );
              })}
              {/* Empty centres collapsed */}
              {centreComparison.filter(c => c.players === 0).length > 0 && (
                <div className="px-5 py-3 border-t border-white/[0.04] flex items-center gap-2">
                  <p className="text-[9px] font-black text-white/20 uppercase italic tracking-widest">
                    {centreComparison.filter(c => c.players === 0).length} CENTRES WITH NO PLAYERS YET —
                  </p>
                  <p className="text-[9px] font-black text-white/20 italic">{centreComparison.filter(c => c.players === 0).map(c => c.name).join(', ')}</p>
                </div>
              )}
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 7-Day Chart */}
            <div className="lg:col-span-2 bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-black text-white italic uppercase tracking-tighter flex items-center gap-2"><Clock size={14} className="text-[#CCFF00]" />7-DAY ATTENDANCE TREND</h3>
                  <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.25em] italic mt-0.5">All centres combined</p>
                </div>
                <div className="flex gap-3 text-[9px] font-black uppercase italic">
                  <span className="flex items-center gap-1 text-[#CCFF00]/60"><span className="w-2 h-0.5 bg-[#CCFF00] inline-block rounded" /> Present</span>
                  <span className="flex items-center gap-1 text-red-400/60"><span className="w-2 h-0.5 bg-red-400 inline-block rounded" /> Absent</span>
                </div>
              </div>
              <div className="h-[220px]">
                {chartData.every(d => d.present === 0 && d.absent === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 opacity-30">
                    <Activity size={28} className="text-white/20" />
                    <p className="text-[9px] font-black text-white/20 uppercase italic tracking-widest">No records yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#CCFF00" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="rG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f87171" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 900 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 900 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0d1324', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem' }} itemStyle={{ fontSize: '10px', fontWeight: 900 }} labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 900 }} />
                      <Area type="monotone" dataKey="present" name="Present" stroke="#CCFF00" strokeWidth={2} fillOpacity={1} fill="url(#gG)" dot={false} />
                      <Area type="monotone" dataKey="absent" name="Absent" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 3" fillOpacity={1} fill="url(#rG)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Performance Snapshot */}
            <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Star size={14} className="text-[#CCFF00]" />
                <h3 className="text-sm font-black text-white italic uppercase tracking-tighter">PERFORMANCE</h3>
              </div>
              {perfSnapshot.topRating > 0 ? (
                <>
                  <div className="bg-[#CCFF00]/5 border border-[#CCFF00]/10 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-[#CCFF00]/50 uppercase italic tracking-widest mb-1">Top Rated</p>
                    <p className="text-xs font-black text-white uppercase italic leading-tight">{perfSnapshot.topPlayer}</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-2xl font-black text-[#CCFF00] italic">{perfSnapshot.topRating}</span>
                      <span className="text-[9px] text-white/25 font-black uppercase italic">/10</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-2xl p-3 text-center">
                      <p className="text-xl font-black text-white italic">{perfSnapshot.avgRating}</p>
                      <p className="text-[9px] font-black text-white/25 uppercase italic">Avg Rating</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 text-center">
                      <p className="text-xl font-black text-white italic">{perfSnapshot.evalCoverage}%</p>
                      <p className="text-[9px] font-black text-white/25 uppercase italic">Evaluated</p>
                    </div>
                  </div>
                  <div className="mt-auto space-y-1">
                    <div className="flex justify-between text-[9px] font-black text-white/25 uppercase italic"><span>Coverage</span><span>{perfSnapshot.evalCoverage}%</span></div>
                    <div className="h-1 bg-white/5 rounded-full"><div className="h-full bg-[#CCFF00] rounded-full" style={{ width: `${perfSnapshot.evalCoverage}%` }} /></div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-30">
                  <Shield size={28} className="text-white/20" />
                  <p className="text-[9px] font-black text-white/25 uppercase italic text-center">No evaluations yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Age + Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <div className="flex items-center gap-2 mb-5"><Users size={14} className="text-[#CCFF00]" /><h3 className="text-sm font-black text-white italic uppercase tracking-tighter">AGE GROUPS</h3></div>
              {ageData.length > 0 ? (
                <div className="space-y-2.5">
                  {ageData.map(g => {
                    const max = Math.max(...ageData.map(x => x.value));
                    return (
                      <div key={g.name} className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase italic text-white/35 w-8 flex-shrink-0">{g.name}</span>
                        <div className="flex-1 h-5 bg-white/5 rounded-lg overflow-hidden">
                          <div className="h-full rounded-lg flex items-center px-2 transition-all duration-700" style={{ width: `${(g.value / max) * 100}%`, background: g.color, minWidth: g.value > 0 ? '1.5rem' : '0' }}>
                            <span className="text-[9px] font-black text-brand-950 italic">{g.value}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-white/25 italic w-8 text-right">{Math.round((g.value / ageData.reduce((s, x) => s + x.value, 0)) * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center opacity-25"><p className="text-[9px] font-black text-white/25 uppercase italic">No player data</p></div>
              )}
            </div>

            <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <div className="flex items-center gap-2 mb-5"><Radio size={14} className="text-[#CCFF00]" /><h3 className="text-sm font-black text-white italic uppercase tracking-tighter">LIVE FEED</h3></div>
              {activityFeed.length > 0 ? (
                <div className="space-y-0.5">
                  {activityFeed.map(item => (
                    <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                      <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mt-0.5" style={{ background: `${activityColor[item.type]}15`, color: activityColor[item.type] }}>{activityIcon[item.type]}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black text-white italic truncate">{item.label}</p>
                        <p className="text-[9px] font-bold text-white/25 italic">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center opacity-25"><p className="text-[9px] font-black text-white/25 uppercase italic">No activity yet</p></div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CENTRE DRILL-DOWN MODE                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {!isOverview && (
        <>
          {/* 7-day chart for this centre */}
          <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-black text-white italic uppercase tracking-tighter flex items-center gap-2"><Clock size={14} className="text-[#CCFF00]" />7-DAY TREND · {selectedVenue}</h3>
                <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.25em] italic mt-0.5">Last 7 days attendance for this centre only</p>
              </div>
            </div>
            <div className="h-[200px]">
              {chartData.every(d => d.present === 0 && d.absent === 0) ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 opacity-30"><Activity size={28} className="text-white/20" /><p className="text-[9px] font-black text-white/20 uppercase italic">No records for this centre yet</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gG2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#CCFF00" stopOpacity={0.2} /><stop offset="95%" stopColor="#CCFF00" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 900 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 900 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0d1324', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem' }} itemStyle={{ fontSize: '10px', fontWeight: 900 }} />
                    <Area type="monotone" dataKey="present" name="Present" stroke="#CCFF00" strokeWidth={2} fillOpacity={1} fill="url(#gG2)" dot={false} />
                    <Area type="monotone" dataKey="absent" name="Absent" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 3" fillOpacity={0} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Player Attendance Table for this centre */}
          <div className="bg-brand-900 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <Users size={14} className="text-[#CCFF00]" />
              <h3 className="text-sm font-black text-white italic uppercase tracking-tighter">PLAYER ATTENDANCE · LAST 30 DAYS</h3>
              <span className="ml-auto bg-white/5 text-white/30 px-2.5 py-0.5 rounded-lg text-[9px] font-black">{drillPlayers.length} PLAYERS</span>
            </div>
            {drillPlayers.length > 0 ? (
              <div>
                <div className="grid grid-cols-[1fr_60px_80px_80px] px-5 py-2 border-b border-white/[0.04]">
                  {['PLAYER', 'SESSIONS', 'PRESENT', 'RATE'].map((h, i) => (
                    <p key={i} className={`text-[9px] font-black text-white/20 uppercase italic tracking-[0.2em] ${i > 0 ? 'text-right' : ''}`}>{h}</p>
                  ))}
                </div>
                {drillPlayers.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1fr_60px_80px_80px] px-5 py-3.5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <div className="min-w-0 pr-3">
                      <p className="text-[11px] font-black text-white italic truncate">{p.name}</p>
                      <p className="text-[9px] font-bold text-white/20 italic">{p.memberId}</p>
                    </div>
                    <p className="text-[11px] font-black text-white/50 text-right self-center">{p.sessions > 0 ? p.sessions : '—'}</p>
                    <p className="text-[11px] font-black text-white/70 text-right self-center">{p.sessions > 0 ? p.present : '—'}</p>
                    <div className="text-right self-center">
                      {p.sessions === 0 ? (
                        <p className="text-[11px] font-black text-white/20 italic">No data</p>
                      ) : (
                        <p className={`text-[12px] font-black italic ${p.rate >= 75 ? 'text-[#CCFF00]' : p.rate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{p.rate}%</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center gap-2 opacity-30"><Users size={28} className="text-white/20" /><p className="text-[9px] font-black text-white/25 uppercase italic">No players enrolled at this centre</p></div>
            )}
          </div>

          {/* Age + Performance for this centre */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <div className="flex items-center gap-2 mb-5"><Users size={14} className="text-[#CCFF00]" /><h3 className="text-sm font-black text-white italic uppercase tracking-tighter">AGE GROUPS</h3></div>
              {ageData.length > 0 ? (
                <div className="space-y-2.5">
                  {ageData.map(g => {
                    const max = Math.max(...ageData.map(x => x.value));
                    return (
                      <div key={g.name} className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase italic text-white/35 w-8 flex-shrink-0">{g.name}</span>
                        <div className="flex-1 h-5 bg-white/5 rounded-lg overflow-hidden">
                          <div className="h-full rounded-lg flex items-center px-2" style={{ width: `${(g.value / max) * 100}%`, background: g.color, minWidth: '1.5rem' }}>
                            <span className="text-[9px] font-black text-brand-950 italic">{g.value}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="h-32 flex items-center justify-center opacity-25"><p className="text-[9px] font-black text-white/25 uppercase italic">No data for this centre</p></div>}
            </div>

            <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2"><Star size={14} className="text-[#CCFF00]" /><h3 className="text-sm font-black text-white italic uppercase tracking-tighter">PERFORMANCE</h3></div>
              {perfSnapshot.topRating > 0 ? (
                <>
                  <div className="bg-[#CCFF00]/5 border border-[#CCFF00]/10 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-[#CCFF00]/50 uppercase italic tracking-widest mb-1">Top Rated at {selectedVenue}</p>
                    <p className="text-xs font-black text-white uppercase italic leading-tight">{perfSnapshot.topPlayer}</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-2xl font-black text-[#CCFF00] italic">{perfSnapshot.topRating}</span>
                      <span className="text-[9px] text-white/25 font-black uppercase italic">/10</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-2xl p-3 text-center"><p className="text-xl font-black text-white italic">{perfSnapshot.avgRating}</p><p className="text-[9px] font-black text-white/25 uppercase italic">Avg Rating</p></div>
                    <div className="bg-white/5 rounded-2xl p-3 text-center"><p className="text-xl font-black text-white italic">{perfSnapshot.evalCoverage}%</p><p className="text-[9px] font-black text-white/25 uppercase italic">Evaluated</p></div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-30"><Shield size={24} className="text-white/20" /><p className="text-[9px] font-black text-white/25 uppercase italic text-center">No evaluations at this centre</p></div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
};
