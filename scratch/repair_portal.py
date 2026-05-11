
import sys

path = 'scratch/PlayerPortal_dump.tsx'
with open(path, 'r', encoding='latin-1') as f:
    content = f.read()

# Find the start point: after the Hero action grid buttons
start_marker = 'ATTENDANCE'
start_pos = content.find(start_marker)
if start_pos == -1:
    print("Could not find start marker")
    sys.exit(1)

# Find the first </div> </div> </div> after the start_pos
end_hero_pos = content.find('</div>', start_pos)
end_hero_pos = content.find('</div>', end_hero_pos + 6)
end_hero_pos = content.find('</div>', end_hero_pos + 6)
end_hero_pos = content.find('</div>', end_hero_pos + 6)
end_hero_pos = content.find('</div>', end_hero_pos + 6)
end_hero_pos += 6

# Find the end point: before the hidden invoice template
end_marker = 'Hidden invoice template for download'
end_pos = content.find(end_marker)
if end_pos == -1:
    print("Could not find end marker")
    sys.exit(1)

# Backtrack to the start of that comment
end_pos = content.rfind('{/*', 0, end_pos)

# Content to insert
middle = """
                    {/* ─── Command Modules grid ────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Highlights Row */}
                        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Self Check-In Card */}
                            <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group flex flex-col items-center justify-between gap-6 text-center">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000"><UserCheck size={100} className="text-white" /></div>
                                <div className="relative z-10">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 mx-auto mb-4 ${checkedInToday ? 'bg-brand-accent border-brand-accent text-brand-950' : 'bg-white/5 border-white/10 text-white/20'}`}>
                                        <Activity size={28} />
                                    </div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
                                        {checkedInToday ? <>CHECK-IN <span className="text-brand-accent">SUCCESS</span></> : <>SESSION <span className="text-brand-primary">CHECK-IN</span></>}
                                    </h3>
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1 italic">
                                        {checkedInToday ? 'Your attendance recorded' : 'Mark your arrival now'}
                                    </p>
                                </div>
                                <button 
                                    onClick={handleSelfCheckIn}
                                    disabled={checkedInToday || isCheckingIn}
                                    className={`relative z-10 w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl ${checkedInToday ? 'bg-white/5 text-white/20 border border-white/5' : 'bg-brand-primary text-brand-950 hover:bg-white shadow-brand-primary/20 active:scale-95'}`}
                                >
                                    {isCheckingIn ? <Loader2 size={14} className="animate-spin" /> : checkedInToday ? <CheckCircle2 size={14} /> : <Zap size={14} fill="currentColor" />}
                                    {checkedInToday ? 'PRESENT' : 'CHECK IN'}
                                </button>
                            </div>

                             {/* MOTM Showcase */}
                            <div className={`glass-card rounded-[2.5rem] p-8 border shadow-2xl relative overflow-hidden group transition-all duration-700 flex flex-col items-center justify-between gap-6 text-center ${motmToday?.playerId === player.id ? 'border-brand-accent/30 bg-brand-accent/5' : 'border-white/5'}`}>
                                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Trophy size={120} className="text-white" /></div>
                                <div className="relative z-10">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 mx-auto mb-4 ${motmToday?.playerId === player.id ? 'bg-brand-accent border-brand-accent text-brand-950 shadow-[0_0_20px_rgba(200,255,0,0.3)]' : 'bg-white/5 border-white/10 text-white/20'}`}>
                                        <Trophy size={28} />
                                    </div>
                                    <h3 className={`text-xl font-black italic uppercase tracking-tighter ${motmToday?.playerId === player.id ? 'text-brand-accent' : 'text-white'}`}>
                                        PLAYER OF <span className={motmToday?.playerId === player.id ? 'text-white' : 'text-brand-primary'}>THE DAY</span>
                                    </h3>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] mt-1 italic text-white/30">
                                        {motmToday?.playerId === player.id ? 'Excellent performance' : 'Top performer recognition'}
                                    </p>
                                </div>
                                {motmToday?.playerId === player.id && (
                                    <div className="relative z-10 w-full py-3 bg-brand-accent text-brand-950 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl animate-pulse">ELITE STATUS</div>
                                )}
                            </div>

                             {/* Academy Ranking Card */}
                            <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group flex flex-col items-center justify-between gap-6 bg-brand-900/40 text-center">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Medal size={100} className="text-white" /></div>
                                <div className="relative z-10">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 mx-auto mb-4 ${academyRank ? 'bg-amber-400 border-amber-400 text-brand-950 shadow-[0_0_20px_rgba(251,191,36,0.3)]' : 'bg-white/5 border-white/10 text-white/20'}`}>
                                        <Crown size={28} />
                                    </div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
                                        {academyRank ? <>ACADEMY <span className="text-amber-400">RANK #{academyRank.rank}</span></> : <>RANKING <span className="text-white/20">PENDING</span></>}
                                    </h3>
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1 italic">
                                        {academyRank ? `${academyRank.pts} Performance Pts` : 'Establishing establish rank'}
                                    </p>
                                </div>
                                {academyRank && (
                                    <div className="relative z-10 w-full py-3 bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10">
                                        TOP {Math.round((academyRank.rank / academyRank.total) * 100)}%
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Large Modules Row */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Operational Schedule */}
                            <div className="glass-card rounded-[3rem] p-10 sm:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-[6px] h-full bg-brand-primary" />
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                                    <div>
                                        <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-5">
                                            <Calendar className="text-brand-primary" size={32} /> Schedule
                                        </h3>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-2 italic">Upcoming Academy Sessions</p>
                                    </div>
                                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
                                        {(['training', 'match'] as const).map(t => (
                                            <button key={t} onClick={() => setEventFilter(t as any)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all ${eventFilter === t ? 'bg-brand-primary text-brand-950 shadow-xl' : 'text-white/40 hover:text-white'}`}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="space-y-5">
                                    {filteredEvents.length > 0 ? filteredEvents.map(event => (
                                        <div key={event.id} className="group p-8 rounded-[2.5rem] border border-white/5 bg-white/5 hover:bg-white/10 hover:border-brand-primary/50 transition-all flex flex-col md:flex-row items-center justify-between gap-10 hover:-translate-y-1">
                                            <div className="flex items-center gap-10">
                                                <div className="w-20 h-20 bg-brand-950 rounded-3xl flex flex-col items-center justify-center font-black border border-white/10 text-brand-primary shadow-sm transform group-hover:rotate-6 transition-transform">
                                                    <span className="text-[10px] uppercase tracking-[0.2em] opacity-40">{new Date(event.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                                    <span className="text-3xl leading-none font-mono mt-1">{new Date(event.date).getDate()}</span>
                                                </div>
                                                <div>
                                                    <div className="font-black text-2xl text-white italic uppercase tracking-tight group-hover:text-brand-primary transition-colors">{event.title}</div>
                                                    <div className="flex flex-wrap gap-8 mt-3 text-white/40 text-[11px] font-black uppercase italic tracking-widest">
                                                        <span className="flex items-center gap-3"><Clock size={16} className="text-brand-primary" /> {event.time}</span>
                                                        <span className="flex items-center gap-3"><MapPin size={16} className="text-brand-primary" /> {event.location}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 w-full md:w-auto">
                                                <button onClick={() => StorageService.toggleRSVP(event.id, user.linkedPlayerId!, 'attending')} 
                                                    className={`flex-1 md:px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-3 border ${event.rsvps?.[player.id] === 'attending' ? 'bg-brand-accent text-brand-950 border-brand-accent shadow-xl shadow-brand-accent/20' : 'bg-white/5 text-white/40 border-white/5 hover:border-brand-accent hover:text-brand-accent'}`}>
                                                    <CheckCircle2 size={18} /> Confirm
                                                </button>
                                                <button onClick={() => StorageService.toggleRSVP(event.id, user.linkedPlayerId!, 'declined')} 
                                                    className={`flex-1 md:px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-3 border ${event.rsvps?.[player.id] === 'declined' ? 'bg-red-500 text-white border-red-500 shadow-xl' : 'bg-white/5 text-white/40 border-white/5 hover:border-red-500 hover:text-red-500'}`}>
                                                    <XCircle size={18} /> Decline
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-32 text-center border-4 border-dashed border-white/5 rounded-[3rem] font-black text-white/10 uppercase tracking-[0.5em] italic">
                                            NO UPCOMING SESSIONS
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Match Performance Tracker */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="glass-card rounded-[3rem] p-12 border border-white/5 shadow-2xl flex flex-col min-h-[450px] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 -rotate-12"><Activity size={300} className="text-white" /></div>
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-5 mb-10 text-white">
                                        <Activity className="text-brand-primary" size={32} /> Match History
                                    </h3>
                                    {myMatchStats.length > 0 ? (
                                        <div className="space-y-6 flex-1">
                                        {myMatchStats.slice(0,3).map(m => (
                                            <div key={m.id} className="p-8 bg-white/5 rounded-3xl border border-white/10 group/item hover:bg-white/10 transition-all">
                                                <div className="flex justify-between items-center mb-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[11px] font-black text-white/20 uppercase tracking-widest italic">{new Date(m.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                                        {m.playerOfTheMatchId === player.id && (
                                                            <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 text-amber-500 text-[8px] font-black px-2 py-0.5 rounded-lg">
                                                                <Trophy size={10} className="fill-amber-500" /> MOTM
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {m.myStats?.rating && (
                                                            <span className="text-[10px] font-black text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-1 rounded-lg italic">RTG: {m.myStats.rating}</span>
                                                        )}
                                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black italic uppercase tracking-widest border ${m.result === 'W' ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>{m.result === 'W' ? 'WON' : 'LOST'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div className="font-black text-2xl text-white italic uppercase tracking-tighter">vs {m.opponent}</div>
                                                    <div className="text-4xl font-black text-brand-primary font-mono tracking-tighter">{m.scoreFor}<span className="text-white/20 mx-1">:</span>{m.scoreAgainst}</div>
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-white/5 font-black italic uppercase tracking-[0.5em] py-12 text-center">
                                            NO MATCH DATA
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Performance Side-Bar (Telemetry) */}
                        <div className="lg:col-span-4 space-y-8">
                            <div className="bg-brand-900/50 backdrop-blur-2xl p-12 rounded-[4rem] shadow-2xl flex flex-col items-center group text-white relative overflow-hidden border border-white/5">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Trophy size={200} /></div>
                                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 mb-10 transform group-hover:rotate-12 transition-transform shadow-2xl">
                                    <Trophy className="text-brand-accent" size={60} />
                                </div>
                                <div className="text-center relative z-10">
                                    <div className="text-[12px] font-black uppercase tracking-[0.4em] text-white/40 mb-2 italic">Career Stats</div>
                                    <div className="text-[80px] md:text-[100px] font-black italic leading-none font-mono tracking-tighter text-brand-accent">{totalGoals}</div>
                                    <div className="h-2 w-24 bg-brand-accent/20 rounded-full mt-6 mx-auto overflow-hidden">
                                        <div className="h-full bg-brand-accent animate-progress" style={{ width: '70%' }} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="glass-card rounded-[4rem] border border-white/5 p-12 shadow-2xl space-y-12 relative overflow-hidden">
                                <div className="flex justify-between items-center group gap-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-white/5 text-brand-primary rounded-2xl border border-white/10 group-hover:rotate-12 transition-transform shadow-lg"><Star size={24} /></div>
                                        <div className="text-left font-black italic uppercase leading-none">
                                            <span className="text-[9px] text-white/20 uppercase tracking-widest mb-1 block">RATING</span>
                                            <span className="text-xl text-white">PERFORMANCE</span>
                                        </div>
                                    </div>
                                    <div className="text-5xl font-black text-brand-primary font-mono tracking-tighter shrink-0">{avgRating}</div>
                                </div>
                                
                                <div className="flex justify-between items-center group gap-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-white/5 text-brand-primary rounded-2xl border border-white/10 group-hover:rotate-12 transition-transform shadow-lg"><Shirt size={24} /></div>
                                        <div className="text-left font-black italic uppercase leading-none">
                                            <span className="text-[9px] text-white/20 uppercase tracking-widest mb-1 block">STARTS</span>
                                            <span className="text-xl text-white">MATCH STARTS</span>
                                        </div>
                                    </div>
                                    <div className="text-5xl font-black text-white font-mono tracking-tighter shrink-0">{totalStarts}</div>
                                </div>
                                
                                <div className="flex justify-between items-center pt-10 border-t border-white/5 group gap-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-white/5 text-brand-primary rounded-2xl border border-white/10 group-hover:rotate-12 transition-transform shadow-lg"><Activity size={24} /></div>
                                        <div className="text-left font-black italic uppercase leading-none">
                                            <span className="text-[9px] text-white/20 uppercase tracking-widest mb-1 block">MATCHES</span>
                                            <span className="text-xl text-white">PLAYED</span>
                                        </div>
                                    </div>
                                    <div className="text-5xl font-black text-white font-mono tracking-tighter shrink-0">{myMatchStats.length}</div>
                                </div>
                            </div>

                            {/* Tactical Gear Brief */}
                            <div className="glass-card rounded-[3.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
                                <div className="green-light-bar" />
                                <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000"><Shirt size={140} className="text-white" /></div>
                                <h4 className="text-[11px] font-black text-brand-accent uppercase tracking-[0.4em] mb-10 italic">Equipment Checklist</h4>
                                {upcomingEvents[0] ? (
                                    <div className="space-y-8 relative z-10">
                                        <div className="flex items-center gap-8">
                                            <div className={`p-6 rounded-[2rem] border shadow-2xl transition-all duration-500 group-hover:rotate-6 ${getKitRequirement(upcomingEvents[0].date).style.replace('bg-slate-50', 'bg-white/5').replace('text-slate-400', 'text-white/40').replace('border-slate-200', 'border-white/10')}`}>
                                                <Shirt size={28} className="animate-pulse" />
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">REQUIRED UNIFORM</div>
                                                <div className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">{getKitRequirement(upcomingEvents[0].date).color}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all">
                                                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-3">FOOTWEAR</div>
                                                <div className="flex items-center gap-3">
                                                    <Dumbbell size={14} className="text-brand-accent" />
                                                    <span className="text-[10px] font-black text-white uppercase italic">Firm Ground</span>
                                                </div>
                                            </div>
                                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all">
                                                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-3">HYDRATION</div>
                                                <div className="flex items-center gap-3">
                                                    <Coffee size={14} className="text-brand-accent" />
                                                    <span className="text-[10px] font-black text-white uppercase italic">Water (1.5L)</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-brand-accent" />
                                                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">EQUIPMENT READINESS: VERIFIED</span>
                                            </div>
                                            <Zap size={14} className="text-brand-accent animate-pulse" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em] italic">NO UPCOMING EVENTS</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
"""

new_content = content[:end_hero_pos] + middle + content[end_pos:]

with open('components/PlayerPortal.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Fixed successfully")
