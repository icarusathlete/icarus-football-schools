
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Player, User } from '../types';
import { ChevronLeft, ChevronRight, Shield, User as UserIcon, Star, MapPin, Layers, Lock, Mail, CheckCircle2 } from 'lucide-react';

interface TeamProps {
    currentUser: User;
}

const PlayerCard: React.FC<{ player: Player }> = ({ player }) => (
    <div className="flex-shrink-0 w-72 h-96 relative rounded-3xl overflow-hidden group snap-center shadow-2xl transition-transform duration-500 hover:scale-[1.02] border border-gray-800 bg-slate-900">
        {/* Background Image */}
        <img 
            src={player.photoUrl} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => { e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/166/166344.png"; }}
            alt={player.fullName}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90" />

        {/* Card Content */}
        <div className="absolute inset-0 p-6 flex flex-col justify-end">
            <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-center justify-between mb-2">
                    <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                        {player.position}
                    </span>
                    <span className="text-4xl font-black text-white/10 font-mono tracking-tighter group-hover:text-white/30 transition-colors">
                        {player.memberId.split('-')[1] || '00'}
                    </span>
                </div>
                
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-1 leading-none">
                    {player.fullName}
                </h3>
                
                <div className="flex items-center gap-3 text-xs font-bold text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><Layers size={12} className="text-icarus-500" /> {player.batch || 'Academy'}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                    <span className="flex items-center gap-1"><MapPin size={12} className="text-icarus-500" /> {player.venue || 'General'}</span>
                </div>

                {/* Mini Stats (Mocked or Real if available) */}
                <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    <div className="text-center">
                        <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Rating</div>
                        <div className="text-lg font-black text-yellow-400">{player.evaluation?.overallRating || '-'}</div>
                    </div>
                    <div className="text-center border-l border-white/10">
                        <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Age</div>
                        <div className="text-lg font-black text-white">{new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear()}</div>
                    </div>
                    <div className="text-center border-l border-white/10">
                        <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Form</div>
                        <div className="text-lg font-black text-green-400">8.5</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const CoachCard: React.FC<{ user: User }> = ({ user }) => (
    <div className="flex-shrink-0 w-72 bg-white rounded-[2rem] overflow-hidden shadow-lg border border-gray-100 group relative hover:shadow-2xl transition-all duration-300 snap-center flex flex-col">
        {/* Background Pattern / Header */}
        <div className="h-28 bg-slate-900 relative overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            
            {/* Staff Badge */}
            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                <Shield size={10} className="text-cyan-400" /> Official Staff
            </div>
        </div>

        {/* Profile Image - Floating */}
        <div className="relative -mt-12 px-6 flex justify-between items-end">
            <div className="relative">
                <div className="w-24 h-24 rounded-2xl p-1 bg-white shadow-xl">
                    <img 
                        src={user.photoUrl || `https://ui-avatars.com/api/?name=${user.username}&background=0c4a6e&color=fff&size=256`} 
                        className="w-full h-full object-cover rounded-xl bg-gray-50"
                        alt={user.username}
                        onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${user.username}&background=0c4a6e&color=fff&size=256`; }}
                    />
                </div>
                {/* Online/Status Indicator */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-[3px] border-white rounded-full"></div>
            </div>
            
            {/* Quick Action */}
            <button className="mb-1 p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-cyan-50 hover:text-cyan-600 transition-colors border border-slate-100">
                <Mail size={20} />
            </button>
        </div>

        {/* Info Section */}
        <div className="p-6 pt-4 flex-1">
            <h3 className="text-xl font-black text-slate-900 leading-tight">{user.username}</h3>
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-5">Senior Coach</p>

            {/* Assignments / Specialization */}
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400 mt-0.5 border border-gray-100">
                        <MapPin size={14} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Assigned Venues</p>
                        <p className="text-xs font-bold text-gray-700 leading-snug line-clamp-2">
                            {user.assignedVenues && user.assignedVenues.length > 0 
                                ? user.assignedVenues.join(', ') 
                                : 'General Roving'}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg text-gray-400 mt-0.5 border border-gray-100">
                        <Layers size={14} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Squad Responsibility</p>
                        <p className="text-xs font-bold text-gray-700 leading-snug line-clamp-2">
                            {user.assignedBatches && user.assignedBatches.length > 0 
                                ? user.assignedBatches.join(', ') 
                                : 'All Academy'}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center mt-auto">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">ID: {user.id.substring(0,6).toUpperCase()}</span>
            <span className="text-[10px] font-bold text-green-600 flex items-center gap-1.5 uppercase tracking-wider bg-green-50 px-2 py-1 rounded-md border border-green-100">
                <CheckCircle2 size={10} /> Certified
            </span>
        </div>
    </div>
);

export const Team: React.FC<TeamProps> = ({ currentUser }) => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [coaches, setCoaches] = useState<User[]>([]);
    const [myPlayerProfile, setMyPlayerProfile] = useState<Player | null>(null);
    const [filter, setFilter] = useState<'MY_BATCH' | 'ALL'>('MY_BATCH');

    const squadScrollRef = useRef<HTMLDivElement>(null);
    const coachScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = () => {
        const allPlayers = StorageService.getPlayers();
        const allUsers = StorageService.getUsers();
        
        // Get Coaches ONLY (Filter out admins)
        const coachUsers = allUsers.filter(u => u.role === 'coach');
        setCoaches(coachUsers);

        if (currentUser.role === 'player' && currentUser.linkedPlayerId) {
            // IF PLAYER: Show only their batch mates (by default)
            const me = allPlayers.find(p => p.id === currentUser.linkedPlayerId);
            setMyPlayerProfile(me || null);
            setPlayers(allPlayers);
        } else if (currentUser.role === 'coach') {
            // IF COACH: Filter based on assigned Venues & Batches
            let visiblePlayers = allPlayers;
            
            // Check if coach has assignments (if undefined/empty, we assume no access or full access depending on policy. Let's strict: no access)
            const hasAssignments = (currentUser.assignedVenues && currentUser.assignedVenues.length > 0) || 
                                   (currentUser.assignedBatches && currentUser.assignedBatches.length > 0);

            if (hasAssignments) {
                visiblePlayers = allPlayers.filter(p => {
                    const venueMatch = !currentUser.assignedVenues?.length || (p.venue && currentUser.assignedVenues.includes(p.venue));
                    const batchMatch = !currentUser.assignedBatches?.length || (p.batch && currentUser.assignedBatches.includes(p.batch));
                    return venueMatch && batchMatch;
                });
            } else {
                // If legacy coach with no assignments, show none to prompt assignment
                visiblePlayers = []; 
            }
            
            setPlayers(visiblePlayers);
            setFilter('ALL');
        } else {
            // IF ADMIN: Show everyone
            setPlayers(allPlayers);
            setFilter('ALL');
        }
    };

    const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
        if (ref.current) {
            const scrollAmount = 320; // Approx card width + gap
            ref.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const displayedPlayers = players.filter(p => {
        if (filter === 'ALL') return true;
        if (filter === 'MY_BATCH' && myPlayerProfile) {
            return p.batch === myPlayerProfile.batch;
        }
        return true;
    });

    return (
        <div className="space-y-12 pb-20 animate-in fade-in duration-500">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Orbitron' }}>
                        TEAM <span className="text-icarus-500">HUB</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-2">
                        {currentUser.role === 'coach' 
                            ? 'Manage your assigned squads.' 
                            : myPlayerProfile ? `Squad Roster: ${myPlayerProfile.batch} Batch` : 'Academy Roster & Staff'}
                    </p>
                </div>
                
                {/* Filter Toggle for Admins Only (Coaches see their assigned list) */}
                {(currentUser.role === 'admin') && (
                    <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex">
                        <button className="px-4 py-2 bg-icarus-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-md">
                            All Players
                        </button>
                        <button className="px-4 py-2 text-gray-500 hover:text-gray-900 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
                            By Batch
                        </button>
                    </div>
                )}
            </div>

            {/* Coaches Section */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-lg font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                        <Shield className="text-icarus-500" size={18} /> Coaching Staff
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => scroll(coachScrollRef, 'left')} className="p-2 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-icarus-600 hover:border-icarus-500 transition-all"><ChevronLeft size={20} /></button>
                        <button onClick={() => scroll(coachScrollRef, 'right')} className="p-2 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-icarus-600 hover:border-icarus-500 transition-all"><ChevronRight size={20} /></button>
                    </div>
                </div>
                
                <div 
                    ref={coachScrollRef}
                    className="flex gap-6 overflow-x-auto pb-8 pt-2 px-2 snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {coaches.map(coach => (
                        <CoachCard key={coach.id} user={coach} />
                    ))}
                    {coaches.length === 0 && (
                        <div className="w-full py-12 text-center text-gray-400 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                            No coaches listed.
                        </div>
                    )}
                </div>
            </section>

            {/* Squad Section */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-lg font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                        <UserIcon className="text-icarus-500" size={18} /> 
                        {myPlayerProfile ? 'Your Teammates' : 'Academy Squad'}
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-black ml-2">{displayedPlayers.length}</span>
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => scroll(squadScrollRef, 'left')} className="p-2 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-icarus-600 hover:border-icarus-500 transition-all"><ChevronLeft size={20} /></button>
                        <button onClick={() => scroll(squadScrollRef, 'right')} className="p-2 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-icarus-600 hover:border-icarus-500 transition-all"><ChevronRight size={20} /></button>
                    </div>
                </div>

                <div 
                    ref={squadScrollRef}
                    className="flex gap-6 overflow-x-auto pb-12 pt-4 px-2 snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {displayedPlayers.map(player => (
                        <PlayerCard key={player.id} player={player} />
                    ))}
                    {displayedPlayers.length === 0 && (
                        <div className="w-full py-20 text-center flex flex-col items-center justify-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                            {currentUser.role === 'coach' ? (
                                <>
                                    <Lock size={48} className="text-gray-300 mb-4" />
                                    <p className="text-gray-800 font-bold">No players assigned.</p>
                                    <p className="text-xs text-gray-400 mt-1">Contact an Admin to assign Venues and Batches to your profile.</p>
                                </>
                            ) : (
                                <>
                                    <UserIcon size={48} className="text-gray-300 mb-4" />
                                    <p className="text-gray-500 font-bold">No players found in this list.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </section>

        </div>
    );
};
