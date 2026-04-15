import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { AttendanceStatus } from '../types';
import {
  Users, Activity, Command, Star, Clock, Receipt,
  UserPlus, Trophy, AlertTriangle, Timer, XCircle,
  ChevronLeft, Shield, Radio, TrendingUp, Zap,
  ArrowUp, ArrowDown, Minus, CalendarPlus, Medal,
  MapPin, Layers, ChevronDown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateOffset(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function dayLabel(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}
function ageGroup(dob: string) {
  if (!dob) return 'U12';
  const a = new Date().getFullYear() - new Date(dob).getFullYear();
  if (a <= 8) return 'U8';
  if (a <= 10) return 'U10';
  return 'U12';
}
function initials(name: string) {
  const p = name.trim().split(' ');
  return p.length >= 2 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
}
function nameColor(name: string) {
  const palette = ['#CCFF00', '#60a5fa', '#f59e0b', '#4ade80', '#a78bfa', '#f87171', '#22d3ee'];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}
function rateColor(r: number) {
  return r >= 75 ? '#CCFF00' : r >= 50 ? '#f59e0b' : r > 0 ? '#f87171' : 'rgba(255,255,255,0.15)';
}

// ─── Ring Meter ───────────────────────────────────────────────────────────────

const Ring: React.FC<{ value: number; size?: number; stroke?: number }> = ({ value, size = 56, stroke = 5 }) => {
  const v = Math.min(Math.max(value, 0), 100);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - v / 100);
  const c = rateColor(v);
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        {v > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
        )}
      </svg>
      <span className="relative z-10 text-[10px] font-black italic leading-none" style={{ color: v > 0 ? c : 'rgba(255,255,255,0.2)' }}>
        {v > 0 ? `${v}%` : '—'}
      </span>
    </div>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CentreStat {
  name: string; players: number; presentToday: number;
  attendanceRate: number; avgRating: number; pendingFees: number;
}
interface PlayerRow {
  name: string; memberId: string; sessions: number; present: number; rate: number; rating: number;
}
interface ChartPoint { name: string; present: number; absent: number; }
interface AgePoint { name: string; value: number; color: string; }
interface LeagueRanking {
  rank: number;
  prevRank: number; // 0 = new entry (no history)
  name: string;
  venue: string;
  memberId: string;
  compositeScore: number; // 0–100
  attendanceRate: number;
  overallRating: number;
  scoutScore: number; // avg of 6 skill metrics 0–10
  developmentAreas: string[];
  trend: 'up' | 'down' | 'stable' | 'new';
  posChange: number; // absolute positions moved
}

// ─── Centre Card ──────────────────────────────────────────────────────────────

const CentreCard: React.FC<{ stat: CentreStat; onClick: () => void }> = ({ stat, onClick }) => {
  const empty = stat.players === 0;
  return (
    <button
      onClick={empty ? undefined : onClick}
      disabled={empty}
      className={`text-left p-5 rounded-[2rem] border transition-all duration-300 w-full ${
        empty
          ? 'bg-brand-950/20 border-white/[0.04] opacity-40 cursor-default'
          : 'bg-brand-900 border-white/[0.07] hover:bg-brand-bg hover:border-white/[0.12] hover:shadow-[0_0_20px_rgba(204,255,0,0.05)] active:scale-[0.98]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${empty ? 'bg-white/15' : stat.attendanceRate >= 50 ? 'bg-[#CCFF00]' : 'bg-red-400'}`} />
            <p className="text-[8px] font-black uppercase italic tracking-[0.3em] text-white/25">{empty ? 'NO PLAYERS' : 'ACTIVE'}</p>
          </div>
          <h3 className="text-[13px] font-black italic uppercase text-white tracking-tight leading-tight line-clamp-2">{stat.name}</h3>
        </div>
        <Ring value={stat.attendanceRate} size={52} stroke={4.5} />
      </div>

      {/* Big number */}
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-5xl font-black italic text-white leading-none">{stat.players}</span>
        <span className="text-[9px] font-black uppercase italic text-white/25 pb-1">enrolled</span>
      </div>

      {/* Attendance bar */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-[9px] font-black italic text-white/30">
          <span>TODAY'S TRAINING</span>
          <span>{stat.presentToday}/{stat.players}</span>
        </div>
        <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${stat.attendanceRate}%`, background: rateColor(stat.attendanceRate) }} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.05]">
        <span className="text-[9px] font-black italic text-white/25">
          {stat.avgRating > 0 ? <><span className="text-[#CCFF00]/60">⭐</span> {stat.avgRating.toFixed(1)} avg rating</> : 'No evaluations'}
        </span>
        {stat.pendingFees > 0
          ? <span className="text-[9px] font-black italic text-red-400 bg-red-400/10 px-2 py-0.5 rounded-lg border border-red-400/15">{stat.pendingFees} overdue</span>
          : <span className="text-[9px] font-black italic text-white/15">fees ✓</span>}
      </div>
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');

  const [availableVenues, setAvailableVenues] = useState<string[]>([]);
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);

  // Analytics Data
  const [centres, setCentres] = useState<CentreStat[]>([]);
  const [globalStats, setGlobalStats] = useState({ players: 0, presentToday: 0, rate: 0, alerts: 0, overdueCount: 0, expiringCount: 0, newThisMonth: 0 });
  const [alertItems, setAlertItems] = useState<{ id: string; severity: 'critical' | 'warning' | 'info'; icon: React.ReactNode; label: string; detail: string }[]>([]);
  const [chartAll, setChartAll] = useState<ChartPoint[]>([]);
  const [ageAll, setAgeAll] = useState<AgePoint[]>([]);
  const [topPerformers, setTopPerformers] = useState<{ name: string; rating: number; venue: string }[]>([]);
  const [activityFeed, setActivityFeed] = useState<{ id: string; type: 'player' | 'match' | 'fee'; label: string; sub: string; ts: number }[]>([]);
  const [leagueRankings, setLeagueRankings] = useState<LeagueRanking[]>([]);
  const [playerRoster, setPlayerRoster] = useState<PlayerRow[]>([]);

  const AGE_GROUPS = ['U12', 'U10', 'U8'];
  const AGE_COLORS = ['#CCFF00', '#a3e635', '#4ade80'];

  useEffect(() => {
    const loadData = () => {
      const allPlayers = StorageService.getPlayers();
      const allVenues = StorageService.getVenues();
    const allBatches = StorageService.getBatches();
    const allAttendance = StorageService.getAttendance();
    const allMatches = StorageService.getMatches();
    const allFees = StorageService.getFees();

    // Populate dropdowns
    setAvailableVenues(allVenues.map(v => v.name));
    setAvailableBatches(allBatches.map(b => b.name));

    // Apply Filters
    let players = allPlayers;
    if (selectedVenue !== 'all') {
      players = players.filter(p => p.venue === selectedVenue);
    }
    if (selectedBatch !== 'all') {
      players = players.filter(p => p.batch === selectedBatch);
    }

    const playerIds = new Set(players.map(p => p.id));
    const attendance = allAttendance.filter(a => playerIds.has(a.playerId));
    const fees = allFees.filter(f => playerIds.has(f.playerId));
    
    // activity feed includes matches, which aren't strictly filtered by player except conceptually.
    // we will leave matches global unless explicitly wanted, but the feed will show them.

    const today = getDateOffset(0);
    const ago30 = getDateOffset(-30);
    const in30 = getDateOffset(30);

    // ── Centre stats (always show based on current filtered context) ──────────
    // If a specific venue is selected, this will just yield 1 centre card. If 'all', all centres.
    const centreData: CentreStat[] = allVenues
      .filter(v => selectedVenue === 'all' || v.name === selectedVenue)
      .map(v => {
        const vp = players.filter(p => p.venue === v.name);
        const vPresent = attendance.filter(r => r.venue === v.name && r.date === today && String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length;
        const evaluated = vp.filter(p => p.evaluation?.overallRating);
        const avgR = evaluated.length > 0 ? Math.round((evaluated.reduce((s, p) => s + (p.evaluation?.overallRating ?? 0), 0) / evaluated.length) * 10) / 10 : 0;
        const vFees = fees.filter(f => { const pl = players.find(x => x.id === f.playerId); return pl?.venue === v.name && (f.status === 'PENDING' || f.status === 'OVERDUE'); }).length;
        return { name: v.name, players: vp.length, presentToday: vPresent, attendanceRate: vp.length > 0 ? Math.round((vPresent / vp.length) * 100) : 0, avgRating: avgR, pendingFees: vFees };
      });
    setCentres(centreData);

    // ── Alerts ───────────────────────────────────────────────────────────────
    const newAlerts: typeof alertItems = [];
    const overdueCount = fees.filter(f => f.status === 'OVERDUE').length;
    const expiringPkgs = fees.filter(f => f.invoice?.validTill && f.status === 'PAID' && f.invoice.validTill >= today && f.invoice.validTill <= in30).length;
    const lowAttPlayers = players.filter(p => {
      const rec = attendance.filter(r => r.playerId === p.id && r.date >= ago30);
      if (rec.length < 3) return false;
      return rec.filter(r => String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length / rec.length < 0.6;
    });
    const underCentres = centreData.filter(v => v.players > 0 && v.players < 3);

    if (overdueCount > 0) newAlerts.push({ id: 'ov', severity: 'critical', icon: <XCircle size={13} />, label: `${overdueCount} Overdue ${overdueCount > 1 ? 'Fees' : 'Fee'}`, detail: 'Needs immediate collection' });
    if (expiringPkgs > 0) newAlerts.push({ id: 'ex', severity: 'warning', icon: <Timer size={13} />, label: `${expiringPkgs} Package${expiringPkgs > 1 ? 's' : ''} Expiring`, detail: 'Within next 30 days' });
    if (lowAttPlayers.length > 0) newAlerts.push({ id: 'la', severity: 'warning', icon: <Activity size={13} />, label: `${lowAttPlayers.length} Low Attendance`, detail: lowAttPlayers.slice(0, 2).map(p => p.fullName.split(' ')[0]).join(', ') + (lowAttPlayers.length > 2 ? ` +${lowAttPlayers.length - 2}` : '') });
    if (underCentres.length > 0) newAlerts.push({ id: 'uc', severity: 'info', icon: <Users size={13} />, label: `${underCentres.length} Centre${underCentres.length > 1 ? 's' : ''} Under-Enrolled`, detail: underCentres.map(v => v.name.split(',')[0]).join(', ') });
    setAlertItems(newAlerts);

    // ── Global stats ─────────────────────────────────────────────────────────
    const global_present = attendance.filter(r => r.date === today && String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length;
    const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const newThisMonth = players.filter(p => (p.registeredAt || '').startsWith(thisMonth)).length;
    setGlobalStats({ players: players.length, presentToday: global_present, rate: players.length > 0 ? Math.round((global_present / players.length) * 100) : 0, alerts: newAlerts.length, overdueCount, expiringCount: expiringPkgs, newThisMonth });

    // ── 7-day chart (filtered) ────────────────────────────────────────────────
    setChartAll(Array.from({ length: 7 }, (_, i) => {
      const date = getDateOffset(i - 6);
      const day = attendance.filter(r => r.date === date);
      return { name: dayLabel(date), present: day.filter(r => String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length, absent: day.filter(r => String(r.status).toUpperCase() === AttendanceStatus.ABSENT).length };
    }));

    // ── Age dist (filtered) ───────────────────────────────────────────────────
    const ac: Record<string, number> = {};
    AGE_GROUPS.forEach(g => ac[g] = 0);
    players.forEach(p => { const g = ageGroup(p.dateOfBirth); ac[g] = (ac[g] || 0) + 1; });
    setAgeAll(AGE_GROUPS.map((g, i) => ({ name: g, value: ac[g] || 0, color: AGE_COLORS[i] })));

    // ── Top performers (filtered) ─────────────────────────────────────────────
    const tp = players.filter(p => p.evaluation?.overallRating).sort((a, b) => (b.evaluation?.overallRating ?? 0) - (a.evaluation?.overallRating ?? 0)).slice(0, 5).map(p => ({ name: p.fullName, rating: p.evaluation!.overallRating, venue: p.venue || '—' }));
    setTopPerformers(tp);

    // ── Activity feed (filtered) ──────────────────────────────────────────────
    const feed: typeof activityFeed = [];
    [...players].sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()).slice(0, 3).forEach(p => feed.push({ id: `p-${p.id}`, type: 'player', label: `${p.fullName} joined`, sub: p.venue || 'No centre', ts: new Date(p.registeredAt).getTime() }));
    // To filter matches to specific venue involves more mapping, we will let match feed remain global contextual
    [...allMatches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3).forEach(m => feed.push({ id: `m-${m.id}`, type: 'match', label: `${m.result === 'W' ? 'Won' : m.result === 'L' ? 'Lost' : 'Drew'} vs ${m.opponent}`, sub: `${m.scoreFor}–${m.scoreAgainst} · ${new Date(m.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, ts: new Date(m.date).getTime() }));
    [...fees].filter(f => f.invoice).sort((a, b) => new Date(b.invoice!.date).getTime() - new Date(a.invoice!.date).getTime()).slice(0, 3).forEach(f => { const pl = players.find(p => p.id === f.playerId); if (pl) feed.push({ id: `f-${f.id}`, type: 'fee', label: `₹${f.invoice!.amount.toLocaleString('en-IN')} collected`, sub: `${pl.fullName} · Invoice ${f.invoice!.invoiceNo}`, ts: new Date(f.invoice!.date).getTime() }); });
    setActivityFeed(feed.sort((a, b) => b.ts - a.ts).slice(0, 8));

    // ── Academy League Rankings (filtered) ────────────────────────────────────
    const computeScore = (overallRating: number, attRate: number, metrics?: { passing: number; juggling: number; shooting: number; beepTest: number; weakFoot: number; longPass: number }) => {
      const ratingPart = (overallRating / 10) * 40;
      const attPart = (attRate / 100) * 35;
      const metricPart = metrics
        ? ((metrics.passing + metrics.juggling + metrics.shooting + metrics.beepTest + metrics.weakFoot + metrics.longPass) / 6 / 10) * 25
        : 0;
      return Math.round((ratingPart + attPart + metricPart) * 10) / 10;
    };

    const evaluated = players.filter(p => p.evaluation?.overallRating);
    const playerScores = evaluated.map(p => {
      const rec30 = attendance.filter(r => r.playerId === p.id && r.date >= ago30);
      const present30 = rec30.filter(r => String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length;
      const attRate = rec30.length > 0 ? Math.round((present30 / rec30.length) * 100) : 0;
      const m = p.evaluation!.metrics;
      const scoutScore = Math.round(((m.passing + m.juggling + m.shooting + m.beepTest + m.weakFoot + m.longPass) / 6) * 10) / 10;
      return {
        id: p.id,
        name: p.fullName,
        venue: p.venue || '—',
        memberId: p.memberId || '',
        overallRating: p.evaluation!.overallRating,
        attRate,
        scoutScore,
        compositeScore: computeScore(p.evaluation!.overallRating, attRate, m),
        developmentAreas: p.evaluation!.developmentAreas || [],
        prevEval: p.evaluationHistory && p.evaluationHistory.length > 0
          ? p.evaluationHistory[p.evaluationHistory.length - 1]
          : null,
      };
    }).sort((a, b) => b.compositeScore - a.compositeScore);

    const prevScores = playerScores
      .filter(ps => ps.prevEval)
      .map(ps => {
        const prevE = ps.prevEval!;
        const m2 = prevE.metrics;
        return { id: ps.id, prevScore: computeScore(prevE.overallRating, ps.attRate, m2) };
      })
      .sort((a, b) => b.prevScore - a.prevScore);

    const prevRankMap: Record<string, number> = {};
    prevScores.forEach((ps, idx) => { prevRankMap[ps.id] = idx + 1; });

    const rankings: LeagueRanking[] = playerScores.slice(0, 10).map((ps, idx) => {
      const currentRank = idx + 1;
      const prevRank = prevRankMap[ps.id] ?? 0;
      let trend: LeagueRanking['trend'] = 'new';
      let posChange = 0;
      if (prevRank > 0) {
        posChange = prevRank - currentRank;
        trend = posChange > 0 ? 'up' : posChange < 0 ? 'down' : 'stable';
      }
      return {
        rank: currentRank,
        prevRank,
        name: ps.name,
        venue: ps.venue,
        memberId: ps.memberId,
        compositeScore: ps.compositeScore,
        attendanceRate: ps.attRate,
        overallRating: ps.overallRating,
        scoutScore: ps.scoutScore,
        developmentAreas: ps.developmentAreas,
        trend,
        posChange: Math.abs(posChange),
      };
    });
    setLeagueRankings(rankings);

    // ── Player Roster (for filtered lists) ────────────────────────────────────
    setPlayerRoster(players.map(p => {
      const rec = attendance.filter(r => r.playerId === p.id && r.date >= ago30);
      const present = rec.filter(r => String(r.status).toUpperCase() === AttendanceStatus.PRESENT).length;
      return { 
        name: p.fullName, 
        memberId: p.memberId || '', 
        sessions: rec.length, 
        present, 
        rate: rec.length > 0 ? Math.round((present / rec.length) * 100) : 0, 
        rating: p.evaluation?.overallRating ?? 0 
      };
    }).sort((a, b) => a.rate - b.rate));
    };

    loadData();
    window.addEventListener('academy_data_update', loadData);
    return () => window.removeEventListener('academy_data_update', loadData);
  }, [selectedVenue, selectedBatch]);

  // ── Render helpers ────────────────────────────────────────────────────────

  const alertStyle = {
    critical: 'border-red-500/20 bg-red-500/8 text-red-400',
    warning: 'border-amber-400/20 bg-amber-400/6 text-amber-400',
    info: 'border-blue-400/20 bg-blue-400/6 text-blue-400',
  } as const;

  const feedColor = { player: '#CCFF00', match: '#f59e0b', fee: '#a78bfa' } as const;
  const feedIcon = { player: <UserPlus size={11} />, match: <Trophy size={11} />, fee: <Receipt size={11} /> } as const;

  const activeCentres = centres.filter(c => c.players > 0);
  const emptyCentres = centres.filter(c => c.players === 0);

  // ── Chart shared props ────────────────────────────────────────────────────
  const renderChart = (data: ChartPoint[]) => {
    const hasData = data.some(d => d.present > 0 || d.absent > 0);
    if (!hasData) return (
      <div className="h-full flex flex-col items-center justify-center gap-2 opacity-25">
        <Activity size={24} className="text-white/20" />
        <p className="text-[9px] font-black text-white/25 uppercase italic tracking-widest">No attendance records yet</p>
      </div>
    );
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#CCFF00" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900 }} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900 }} />
          <Tooltip contentStyle={{ backgroundColor: '#0D1B8A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', fontSize: 11 }} labelStyle={{ color: 'rgba(255,255,255,0.35)', fontWeight: 900, fontSize: 9 }} itemStyle={{ fontWeight: 900 }} />
          <Area type="monotone" dataKey="present" name="Present" stroke="#CCFF00" strokeWidth={2} fill="url(#g1)" dot={false} />
          <Area type="monotone" dataKey="absent" name="Absent" stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#g2)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // OVERVIEW VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5 pb-32 font-display animate-in fade-in duration-500">

      {/* ── Hero KPIs ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#00054e] via-brand-900 to-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/[0.06] shadow-2xl relative overflow-visible">
        <div className="absolute top-0 right-0 p-8 opacity-[0.025] pointer-events-none select-none">
          <Command size={180} className="text-white" />
        </div>
        <div className="relative z-10">
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black italic text-white uppercase tracking-tighter leading-none">
                ACADEMY <span className="text-[#CCFF00]">HUB</span>
              </h1>
              <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.5em] italic mt-2">
                ADMINISTRATIVE DASHBOARD · OPERATIONS OVERVIEW
              </p>
            </div>
            
            {/* Global Filters */}
            <div className="flex flex-col sm:flex-row w-full md:w-auto bg-brand-950/40 p-2 rounded-2xl border border-white/5 gap-2 backdrop-blur-xl">
              <div className="relative">
                <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <select
                  value={selectedVenue}
                  onChange={e => {
                    setSelectedVenue(e.target.value);
                    setSelectedBatch('all');
                  }}
                  className="w-full sm:w-auto bg-white/5 hover:bg-white/10 active:bg-white/10 text-white font-bold text-[10px] uppercase tracking-widest pl-8 pr-8 py-2.5 rounded-xl border-none outline-none cursor-pointer appearance-none sm:min-w-[140px] transition-all"
                >
                  <option value="all" className="bg-brand-900">ALL LOCATIONS</option>
                  {availableVenues.map(v => (
                    <option key={v} value={v} className="bg-brand-900">{v}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 border-l border-white/10 pl-2">
                  <ChevronDown size={12} />
                </div>
              </div>

              <div className="relative">
                <Layers size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <select
                  value={selectedBatch}
                  onChange={e => setSelectedBatch(e.target.value)}
                  className="w-full sm:w-auto bg-white/5 hover:bg-white/10 active:bg-white/10 text-white font-bold text-[10px] uppercase tracking-widest pl-8 pr-8 py-2.5 rounded-xl border-none outline-none cursor-pointer appearance-none sm:min-w-[140px] transition-all"
                >
                  <option value="all" className="bg-brand-900">ALL BATCHES</option>
                  {availableBatches.map(b => (
                    <option key={b} value={b} className="bg-brand-900">{b}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 border-l border-white/10 pl-2">
                  <ChevronDown size={12} />
                </div>
              </div>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Enrolled', value: globalStats.players, sub: 'active players', icon: <Users size={14} />, color: '#CCFF00', accent: 'bg-brand-950/50 border-[#CCFF00]/15 shadow-[0_0_20px_rgba(204,255,0,0.05)]' },
              { label: 'New This Month', value: globalStats.newThisMonth, sub: new Date().toLocaleString('en-IN', { month: 'long' }), icon: <CalendarPlus size={14} />, color: globalStats.newThisMonth > 0 ? '#4ade80' : 'rgba(255,255,255,0.4)', accent: globalStats.newThisMonth > 0 ? 'bg-emerald-500/6 border-emerald-500/15' : 'bg-brand-950/50 border-white/10' },
              { label: "Daily Attendance", value: `${globalStats.rate}%`, sub: `${globalStats.presentToday} present`, icon: <Activity size={14} />, color: globalStats.rate >= 75 ? '#4ade80' : globalStats.rate >= 50 ? '#f59e0b' : '#f87171', accent: 'bg-brand-950/50 border-white/10' },
              { label: 'Fees Overdue', value: globalStats.overdueCount, sub: `${globalStats.expiringCount} soon`, icon: <Receipt size={14} />, color: globalStats.overdueCount > 0 ? '#f87171' : '#4ade80', accent: globalStats.overdueCount > 0 ? 'bg-red-500/6 border-red-500/15' : 'bg-brand-950/50 border-white/10' },
              { label: 'System Alerts', value: alertItems.length, sub: alertItems.length > 0 ? 'review below' : 'all clear', icon: <AlertTriangle size={14} />, color: alertItems.length > 0 ? '#f59e0b' : '#4ade80', accent: alertItems.length > 0 ? 'bg-amber-500/6 border-amber-500/15' : 'bg-brand-950/50 border-white/10' },
            ].map((k, i) => (
              <div key={i} className={`rounded-3xl border p-5 group transition-all duration-500 hover:scale-[1.02] ${k.accent}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-black uppercase italic tracking-[0.2em] text-white/60">{k.label}</p>
                  <span style={{ color: k.color }} className="opacity-80 group-hover:opacity-100 transition-opacity">{k.icon}</span>
                </div>
                <p className="text-4xl font-black italic leading-none tracking-tighter" style={{ color: k.color }}>{k.value}</p>
                <p className="text-[10px] font-black italic text-white/60 mt-2.5">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────────── */}
      {alertItems.length > 0 && (
        <div className="bg-brand-900 rounded-[2rem] border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.05] flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-400" />
            <p className="text-[9px] font-black text-white/60 uppercase italic tracking-[0.3em]">ACTION REQUIRED</p>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {alertItems.map(a => (
              <div key={a.id} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-[1.25rem] border ${alertStyle[a.severity]}`}>
                {a.icon}
                <div>
                  <p className="text-[10px] font-black italic leading-tight">{a.label}</p>
                  <p className="text-[8px] font-bold italic opacity-60">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Academy League Rankings ─────────────────────────────────────────── */}
      {leagueRankings.length > 0 && (
        <div className="bg-brand-900 rounded-[2.5rem] border border-white/[0.06] shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-5 sm:px-8 py-5 border-b border-white/[0.05] flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/20 flex items-center justify-center">
                <Medal size={14} className="text-[#CCFF00]" />
              </div>
              <div>
                <h3 className="text-[13px] font-black italic uppercase text-white tracking-tight">PERFORMANCE RANKINGS</h3>
                <p className="text-[8px] font-black italic text-white/45 uppercase tracking-[0.3em]">
                  TOP 10 PLAYERS · {selectedBatch !== 'all' ? selectedBatch : selectedVenue !== 'all' ? selectedVenue : 'ALL CENTRES COMBINED'}
                </p>
              </div>
            </div>
            <div className="sm:ml-auto flex gap-2 flex-wrap">
              {[
                { dot: 'bg-[#CCFF00]', label: 'Coach Assessment 40%' },
                { dot: 'bg-brand-500', label: 'Attendance 35%' },
                { dot: 'bg-brand-accent', label: 'Skill Metrics 25%' },
              ].map((l, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[9px] font-black italic text-white/50 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl">
                  <span className={`w-1.5 h-1.5 rounded-full ${l.dot} shadow-[0_0_8px_currentColor]`} />{l.label}
                </span>
              ))}
            </div>
          </div>

          {/* Table scroll wrapper */}
          <div className="overflow-x-auto custom-scrollbar-tactical">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-black/20">
                  {['RANK', 'PLAYER PROFILE', 'COMPOSITE', 'RATING', 'ATTENDANCE', 'SKILLS', 'TREND', 'DEVELOPMENT'].map((h, i) => (
                    <th key={i} className={`px-6 py-4 text-[9px] font-black italic text-white/60 uppercase tracking-[0.2em] ${
                      i === 0 ? 'w-20 text-center' : i === 1 ? 'text-left' : 'text-center'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {leagueRankings.map((r) => {
                  const trendConfig = {
                    up: { icon: <ArrowUp size={11} />, color: '#4ade80', label: `+${r.posChange}`, bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    down: { icon: <ArrowDown size={11} />, color: '#f87171', label: `-${r.posChange}`, bg: 'bg-red-500/10 border-red-500/20' },
                    stable: { icon: <Minus size={11} />, color: 'rgba(255,255,255,0.25)', label: '—', bg: 'bg-brand-950 border-white/10' },
                    new: { icon: <Zap size={11} />, color: '#f59e0b', label: 'NEW', bg: 'bg-amber-500/10 border-amber-500/20' },
                  }[r.trend];
                  const medalColors = ['#CCFF00', '#C0C0C0', '#CD7F32'];
                  const isTop3 = r.rank <= 3;
                  return (
                    <tr key={r.name} className="hover:bg-black/10 transition-colors group">
                      {/* Rank */}
                      <td className="px-4 py-4 text-center">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black italic mx-auto ${
                          isTop3 ? 'shadow-lg' : ''
                        }`} style={{
                          background: isTop3 ? `${medalColors[r.rank - 1]}20` : 'rgba(255,255,255,0.05)',
                          color: isTop3 ? medalColors[r.rank - 1] : 'rgba(255,255,255,0.3)',
                          border: isTop3 ? `1px solid ${medalColors[r.rank - 1]}30` : '1px solid rgba(255,255,255,0.06)',
                        }}>{r.rank}</div>
                      </td>
                      {/* Player */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0"
                            style={{ background: nameColor(r.name), color: '#0D1B8A' }}>
                            {initials(r.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-black italic text-white truncate">{r.name}</p>
                            <p className="text-[8px] font-bold italic text-white/50 truncate">{r.venue}</p>
                          </div>
                        </div>
                      </td>
                      {/* Composite */}
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-[16px] font-black italic leading-none" style={{ color: r.compositeScore >= 70 ? '#CCFF00' : r.compositeScore >= 50 ? '#f59e0b' : '#f87171' }}>
                            {r.compositeScore}
                          </span>
                          <span className="text-[7px] font-black italic text-white/40">/100</span>
                        </div>
                      </td>
                      {/* Scout rating */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-[13px] font-black italic text-[#CCFF00]">{r.overallRating}</span>
                        <span className="text-[8px] font-black italic text-white/20">/10</span>
                      </td>
                      {/* Attendance */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[12px] font-black italic" style={{ color: rateColor(r.attendanceRate) }}>{r.attendanceRate}%</span>
                          <div className="w-10 h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.attendanceRate}%`, background: rateColor(r.attendanceRate) }} />
                          </div>
                        </div>
                      </td>
                      {/* Skill avg */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-[12px] font-black italic text-purple-400">{r.scoutScore}</span>
                        <span className="text-[8px] font-black italic text-white/20">/10</span>
                      </td>
                      {/* Trend */}
                      <td className="px-4 py-4 text-center">
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[9px] font-black italic ${trendConfig.bg}`}
                          style={{ color: trendConfig.color }}>
                          {trendConfig.icon}
                          {trendConfig.label}
                        </div>
                      </td>
                      {/* Dev areas */}
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {r.developmentAreas.slice(0, 2).map((a, i) => (
                            <span key={i} className="text-[7px] font-black italic text-white/40 bg-brand-950 border border-white/10 px-2 py-0.5 rounded-lg">{a}</span>
                          ))}
                          {r.developmentAreas.length > 2 && (
                            <span className="text-[7px] font-black italic text-white/20">+{r.developmentAreas.length - 2}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend footer */}
          <div className="px-5 sm:px-8 py-3.5 border-t border-white/[0.04] flex flex-wrap gap-4">
            {[
              { icon: <ArrowUp size={9} className="text-emerald-400" />, label: 'Climbing vs last evaluation', color: 'text-emerald-400' },
              { icon: <ArrowDown size={9} className="text-red-400" />, label: 'Dropped vs last evaluation', color: 'text-red-400' },
              { icon: <Zap size={9} className="text-amber-400" />, label: 'First time ranked', color: 'text-amber-400' },
            ].map((l, i) => (
              <span key={i} className={`flex items-center gap-1 text-[8px] font-black italic ${l.color} opacity-50`}>{l.icon}{l.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Filtered Player Roster (Visible when a specific venue/batch is selected) ── */}
      {(selectedVenue !== 'all' || selectedBatch !== 'all') && playerRoster.length > 0 && (
        <div className="bg-brand-900 rounded-[2.5rem] border border-white/[0.06] shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="px-5 sm:px-8 py-5 border-b border-white/[0.05] flex items-center gap-3">
            <Users size={14} className="text-[#CCFF00]" />
            <h3 className="text-[11px] font-black italic uppercase text-white/60 tracking-[0.25em]">ATTENDANCE & EVALUATION ROSTER</h3>
            <span className="ml-auto text-[9px] font-black text-white/40 bg-brand-950 px-2.5 py-1 rounded-lg">{playerRoster.length} PLAYERS</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {playerRoster.map((p, i) => (
              <div key={i} className="flex items-center gap-4 px-5 sm:px-8 py-4 hover:bg-black/20 transition-colors">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black text-brand-950 flex-shrink-0"
                  style={{ background: nameColor(p.name) }}>
                  {initials(p.name)}
                </div>
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black italic text-white truncate">{p.name}</p>
                  <p className="text-[9px] font-bold text-white/25 italic">{p.memberId || 'No ID'}</p>
                </div>
                {/* Attendance bar */}
                <div className="flex-1 max-w-[120px] space-y-1 hidden sm:block">
                  <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.rate}%`, background: rateColor(p.rate) }} />
                  </div>
                  <p className="text-[8px] font-black italic text-white/20">
                    {p.sessions > 0 ? `${p.present}/${p.sessions} sessions` : 'No records'}
                  </p>
                </div>
                {/* Rate */}
                <div className="text-right flex-shrink-0 w-12">
                  {p.sessions > 0
                    ? <p className="text-[13px] font-black italic" style={{ color: rateColor(p.rate) }}>{p.rate}%</p>
                    : <p className="text-[11px] font-black italic text-white/15">—</p>}
                </div>
                {/* Rating */}
                <div className="text-right flex-shrink-0 w-10 hidden sm:block">
                  {p.rating > 0
                    ? <p className="text-[11px] font-black italic text-white/40">⭐ {p.rating}</p>
                    : <p className="text-[10px] font-black italic text-white/12">—</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Active Centre Cards (Only shows when no specific batch is selected) ── */}
      {selectedBatch === 'all' && activeCentres.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Zap size={12} className="text-[#CCFF00]" />
            <p className="text-[10px] font-black text-brand-900/40 uppercase italic tracking-[0.35em]">
              {selectedVenue === 'all' ? 'OPERATIONAL CENTRES' : `${selectedVenue.toUpperCase()} OVERVIEW`}
            </p>
            <div className="ml-auto flex items-center gap-2">
                <span className="text-[9px] font-black text-[#CCFF00] bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-3 py-1 rounded-full uppercase italic tracking-wider shadow-[0_0_15px_rgba(204,255,0,0.1)]">LIVE STATUS</span>
                <span className="text-[9px] font-black text-white/40 bg-brand-950 px-3 py-1 rounded-lg border border-white/10">{activeCentres.length} CENTRES</span>
            </div>
          </div>
          <div className={`grid gap-4 ${activeCentres.length === 1 ? 'grid-cols-1 max-w-sm' : activeCentres.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {activeCentres.map(c => <CentreCard key={c.name} stat={c} onClick={() => { setSelectedVenue(c.name); setSelectedBatch('all'); }} />)}
          </div>
        </div>
      )}

      {/* ── Analytics Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 7-day chart */}
        <div className="lg:col-span-2 bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/[0.06] shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-[#CCFF00]" />
              <h3 className="text-[11px] font-black italic uppercase text-white/50 tracking-[0.25em]">ATTENDANCE TREND (7 DAYS)</h3>
            </div>
            <div className="flex gap-3 text-[9px] font-black italic text-white/20">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#CCFF00] inline-block rounded" /> Present</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block rounded" /> Absent</span>
            </div>
          </div>
          <div className="h-[200px] sm:h-[240px]">{renderChart(chartAll)}</div>
        </div>

        {/* Top performers */}
        <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/[0.06] shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <Star size={13} className="text-[#CCFF00]" />
            <h3 className="text-[11px] font-black italic uppercase text-white/50 tracking-[0.25em]">TOP RANKED PLAYERS</h3>
          </div>
          {topPerformers.length > 0 ? (
            <div className="flex-1 space-y-1">
              {topPerformers.map((p, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                  <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[9px] font-black italic text-brand-950"
                    style={{ background: i === 0 ? '#CCFF00' : i === 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black italic text-white truncate">{p.name}</p>
                    <p className="text-[8px] font-bold italic text-white/25 truncate">{p.venue}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[11px] font-black italic text-[#CCFF00]">{p.rating}</span>
                    <span className="text-[8px] text-white/20 font-black italic">/10</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-25">
              <Shield size={24} className="text-white/20" />
              <p className="text-[9px] font-black italic text-white/25 uppercase text-center">No player evaluations<br />recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Age distribution */}
        <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/[0.06] shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={13} className="text-[#CCFF00]" />
            <h3 className="text-[11px] font-black italic uppercase text-white/50 tracking-[0.25em]">DEMOGRAPHIC DISTRIBUTION</h3>
          </div>
          {ageAll.length > 0 ? (
            <div className="space-y-2.5">
              {ageAll.map(g => {
                const max = Math.max(...ageAll.map(x => x.value));
                const total = ageAll.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={g.name} className="flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase italic text-white/30 w-8 flex-shrink-0">{g.name}</span>
                    <div className="flex-1 h-6 bg-brand-950/60 rounded-xl overflow-hidden">
                      <div className="h-full rounded-xl flex items-center px-2.5 transition-all duration-1000"
                        style={{ width: `${(g.value / max) * 100}%`, background: g.color, minWidth: '2rem' }}>
                        <span className="text-[10px] font-black italic text-brand-950">{g.value}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black italic text-white/20 w-7 text-right">{Math.round((g.value / total) * 100)}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center opacity-25">
              <p className="text-[9px] font-black italic text-white/25 uppercase">No player data yet</p>
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="bg-brand-900 p-6 sm:p-8 rounded-[2.5rem] border border-white/[0.06] shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <Radio size={13} className="text-[#CCFF00]" />
            <h3 className="text-[11px] font-black italic uppercase text-white/50 tracking-[0.25em]">RECENT ACTIVITY</h3>
          </div>
          {activityFeed.length > 0 ? (
            <div className="space-y-0.5">
              {activityFeed.map(item => (
                <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                  <div className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{ background: `${feedColor[item.type]}12`, color: feedColor[item.type] }}>
                    {feedIcon[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black italic text-white truncate">{item.label}</p>
                    <p className="text-[8px] font-bold italic text-white/25">{item.sub}</p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: feedColor[item.type], opacity: 0.5 }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center opacity-25">
              <p className="text-[9px] font-black italic text-white/25 uppercase">No activity yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Inactive Centres (collapsed) ───────────────────────────────────── */}
      {emptyCentres.length > 0 && (
        <div className="bg-brand-bg rounded-[2rem] border border-white/[0.04] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/15" />
            <p className="text-[9px] font-black text-white/20 uppercase italic tracking-[0.3em]">
              {emptyCentres.length} INACTIVE CENTRE{emptyCentres.length > 1 ? 'S' : ''} (NO PLAYERS ENROLLED)
            </p>
            <p className="text-[9px] font-bold italic text-white/15 ml-auto">{emptyCentres.map(c => c.name).join(' · ')}</p>
          </div>
        </div>
      )}

    </div>
  );
};
