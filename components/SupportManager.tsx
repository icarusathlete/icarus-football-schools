
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { SupportTicket, Role, SupportTicketMessage, User } from '../types';
import { LifeBuoy, MessageSquare, Clock, CheckCircle2, AlertCircle, X, Search, Filter, Send, User as UserIcon, Plus, ChevronRight, HelpCircle, ArrowLeft, ShieldAlert } from 'lucide-react';

export const SupportManager: React.FC = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'medium' as any });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('open');

    const currentUser = StorageService.getCurrentUser();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'coach';

    useEffect(() => {
        const loadTickets = () => {
            const allTickets = StorageService.getTickets();
            if (isAdmin) {
                setTickets(allTickets);
            } else {
                // Players only see their own tickets
                setTickets(allTickets.filter(t => t.playerId === currentUser?.linkedPlayerId || t.playerId === currentUser?.id));
            }
        };

        loadTickets();
        const handleUpdate = () => loadTickets();
        window.addEventListener('academy_data_update', handleUpdate);
        return () => window.removeEventListener('academy_data_update', handleUpdate);
    }, [isAdmin, currentUser]);

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setIsSubmitting(true);
        try {
            await StorageService.addTicket({
                playerId: currentUser.linkedPlayerId || currentUser.id,
                playerName: currentUser.fullName || currentUser.username,
                subject: newTicket.subject,
                description: newTicket.description,
                status: 'open',
                priority: newTicket.priority
            });
            setShowNewTicket(false);
            setNewTicket({ subject: '', description: '', priority: 'medium' });
        } catch (error) {
            console.error("Failed to create ticket", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicket || !replyContent.trim() || !currentUser) return;

        const newMessage: SupportTicketMessage = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: currentUser.id,
            senderName: currentUser.fullName || currentUser.username,
            content: replyContent,
            timestamp: new Date().toISOString()
        };

        const updatedTicket: SupportTicket = {
            ...selectedTicket,
            status: isAdmin ? 'in-progress' : 'open',
            messages: [...selectedTicket.messages, newMessage],
            updatedAt: new Date().toISOString()
        };

        try {
            await StorageService.updateTicket(updatedTicket);
            setSelectedTicket(updatedTicket);
            setReplyContent('');
        } catch (error) {
            console.error("Failed to update ticket", error);
        }
    };

    const resolveTicket = async (id: string) => {
        const ticket = tickets.find(t => t.id === id);
        if (ticket) {
            await StorageService.updateTicket({ ...ticket, status: 'resolved' });
            if (selectedTicket?.id === id) {
                setSelectedTicket({ ...ticket, status: 'resolved' });
            }
        }
    };

    const filteredTickets = tickets
        .filter(t => statusFilter === 'all' || (statusFilter === 'open' && t.status !== 'resolved') || (statusFilter === 'resolved' && t.status === 'resolved'))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return (
        <div className="min-h-screen bg-brand-950 space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Header Section - Tactical Midnight Blue Card */}
            <div className="bg-brand-950 p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group mx-4">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-12">
                    <LifeBuoy size={120} className="text-white" />
                </div>
                <div className="relative z-10 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter leading-none">
                        SUPPORT <span className="text-brand-primary">HUB</span>
                    </h2>
                    <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em] italic pt-2">
                        {isAdmin ? 'Management Interface // Resolution Stream' : 'Help & Feedback // Direct Academy Support'}
                    </p>
                </div>
                
                {!isAdmin && (
                    <button 
                        onClick={() => setShowNewTicket(true)}
                        className="mt-8 flex items-center gap-4 bg-brand-primary text-brand-secondary px-10 py-5 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all font-black text-xs uppercase tracking-widest italic border border-white/10"
                    >
                        <Plus size={18} strokeWidth={3} />
                        CREATE_NEW_QUERY
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-4">
                {/* Ticket List Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-brand-950/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Queries</h3>
                            <div className="flex bg-brand-950/50 rounded-lg p-1 border border-white/5">
                                <button 
                                    onClick={() => setStatusFilter('open')}
                                    className={`px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${statusFilter === 'open' ? 'bg-brand-primary text-brand-950' : 'text-white/40'}`}
                                >
                                    Active
                                </button>
                                <button 
                                    onClick={() => setStatusFilter('resolved')}
                                    className={`px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${statusFilter === 'resolved' ? 'bg-brand-primary text-brand-950' : 'text-white/40'}`}
                                >
                                    Resolved
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar-dark pr-2">
                            {filteredTickets.length === 0 ? (
                                <div className="py-12 text-center opacity-20 flex flex-col items-center">
                                    <HelpCircle size={32} className="text-white" />
                                    <span className="text-[8px] font-black uppercase tracking-widest mt-2 text-white">No tickets here</span>
                                </div>
                            ) : (
                                filteredTickets.map(ticket => (
                                    <button
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className={`w-full text-left p-4 rounded-2xl border transition-all relative group ${
                                            selectedTicket?.id === ticket.id 
                                                ? 'bg-brand-primary border-brand-primary text-brand-950 shadow-lg' 
                                                : 'bg-brand-950/40 border-white/5 text-white/40 hover:bg-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                                ticket.priority === 'high' 
                                                    ? 'bg-red-500/20 text-red-400' 
                                                    : ticket.priority === 'medium' 
                                                        ? 'bg-blue-500/20 text-blue-400' 
                                                        : 'bg-white/10 text-white/40'
                                            }`}>
                                                {ticket.priority}
                                            </span>
                                            <span className={`text-[7px] font-black ${selectedTicket?.id === ticket.id ? 'text-brand-950 opacity-40' : 'text-white/20'}`}>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className={`text-[11px] font-black uppercase tracking-tight truncate ${selectedTicket?.id === ticket.id ? 'text-brand-950' : 'text-white group-hover:text-brand-primary transition-colors'}`}>
                                            {ticket.subject}
                                        </h4>
                                        <p className={`text-[9px] mt-1 line-clamp-1 font-medium italic ${selectedTicket?.id === ticket.id ? 'text-brand-950/60' : 'text-white/20'}`}>
                                            {ticket.playerName}
                                        </p>
                                        
                                        {ticket.status === 'open' && (
                                            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Conversation Area */}
                <div className="lg:col-span-3 space-y-6">
                    {selectedTicket ? (
                        <div className="bg-brand-950/40 backdrop-blur-xl flex flex-col h-[750px] rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                             {/* Chat Header */}
                             <div className="p-8 border-b border-white/5 flex items-center justify-between bg-brand-950/50">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg relative ${
                                        selectedTicket.status === 'resolved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-brand-950 text-brand-primary border border-white/10'
                                    }`}>
                                        <MessageSquare size={20} />
                                        {selectedTicket.status !== 'resolved' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-primary rounded-full animate-pulse border-2 border-brand-950" />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">{selectedTicket.subject}</h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest italic">{selectedTicket.playerName}</span>
                                            <span className="w-1 h-1 rounded-full bg-white/10" />
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest italic">ID: {selectedTicket.id.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {isAdmin && selectedTicket.status !== 'resolved' && (
                                        <button 
                                            onClick={() => resolveTicket(selectedTicket.id)}
                                            className="px-6 py-3 bg-brand-accent/10 text-brand-accent font-black text-[10px] uppercase tracking-widest italic rounded-xl hover:bg-brand-accent hover:text-brand-950 transition-all shadow-xl flex items-center gap-2 border border-brand-accent/20"
                                        >
                                            <CheckCircle2 size={14} /> MARK_RESOLVED
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setSelectedTicket(null)}
                                        className="p-3 bg-white/5 text-white/20 rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/5"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                </div>
                             </div>

                             {/* Messages Area */}
                             <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar-dark bg-[radial-gradient(circle_at_center,rgba(0,200,255,0.03),transparent_70%)]">
                                {/* Initial Description */}
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] space-y-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest italic">{selectedTicket.playerName}</span>
                                            <span className="text-[8px] text-white/20 font-black italic">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="p-6 bg-brand-950/50 border border-white/5 rounded-3xl rounded-tl-none">
                                            <p className="text-[13px] text-white/60 font-medium leading-relaxed italic line-clamp-none whitespace-pre-wrap">
                                                {selectedTicket.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Replies */}
                                {selectedTicket.messages.map((msg, i) => {
                                    const isMe = msg.senderId === currentUser?.id;
                                    return (
                                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-${isMe ? 'right' : 'left'} duration-500`}>
                                            <div className={`max-w-[80%] space-y-2 ${isMe ? 'items-end flex flex-col' : ''}`}>
                                                <div className="flex items-center gap-2 mb-1 px-2">
                                                    {!isMe && <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest italic">{msg.senderName}</span>}
                                                    <span className="text-[8px] text-white/20 font-black italic">{new Date(msg.timestamp).toLocaleString()}</span>
                                                    {isMe && <span className="text-[8px] font-black text-white/40 uppercase tracking-widest italic">You</span>}
                                                </div>
                                                <div className={`p-6 shadow-xl rounded-3xl ${
                                                    isMe 
                                                        ? 'bg-brand-primary text-brand-950 rounded-tr-none' 
                                                        : 'bg-brand-950 text-white rounded-tl-none border border-white/10'
                                                }`}
                                                >
                                                    <p className="text-[13px] font-black leading-relaxed italic whitespace-pre-wrap">
                                                        {msg.content}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {selectedTicket.status === 'resolved' && (
                                    <div className="flex justify-center pt-8">
                                        <div className="px-10 py-4 bg-brand-accent/10 border border-brand-accent/20 rounded-full flex items-center gap-4 text-brand-accent font-black text-[10px] uppercase tracking-[0.2em] italic shadow-sm">
                                            <CheckCircle2 size={16} /> This query has been marked as resolved
                                        </div>
                                    </div>
                                )}
                             </div>

                             {/* Input Area */}
                             {selectedTicket.status !== 'resolved' && (
                                 <div className="p-8 border-t border-white/5 bg-brand-950/50">
                                    <form onSubmit={handleReply} className="flex gap-4">
                                        <input 
                                            className="flex-1 p-5 bg-brand-950 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary font-black text-white text-xs uppercase italic tracking-widest placeholder:text-white/10 transition-all"
                                            placeholder="TYPE YOUR RESPONSE_ [ESC TO DISCARD]"
                                            value={replyContent}
                                            onChange={e => setReplyContent(e.target.value)}
                                        />
                                        <button 
                                            type="submit"
                                            className="px-8 bg-brand-primary text-brand-950 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest italic flex items-center gap-3 disabled:opacity-50"
                                            disabled={!replyContent.trim()}
                                        >
                                            <Send size={16} /> SEND
                                        </button>
                                    </form>
                                 </div>
                             )}
                        </div>
                    ) : (
                        <div className="h-[750px] rounded-[2.5rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white bg-brand-950/40 backdrop-blur-xl group">
                             <LifeBuoy size={100} className="mb-8 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 text-brand-primary" />
                             <h4 className="text-2xl font-black italic tracking-[0.2em] uppercase text-white/20">Select a Query to Review</h4>
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-3 italic text-white/10">Establish direct lines of academy support</p>
                        </div>
                    )}
                </div>
            </div>

            {/* New Ticket Modal */}
            {showNewTicket && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-950/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-brand-950 rounded-t-[3rem] sm:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 border border-white/10 flex flex-col max-h-[95vh] sm:max-h-[85vh]">
                        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-brand-950/50">
                            <div className="space-y-1">
                                <h3 className="font-black text-2xl text-white italic uppercase tracking-tight">Raise <span className="text-brand-primary">Query</span></h3>
                                <p className="text-[9px] text-white/20 font-black uppercase tracking-widest italic">Direct Support Channel</p>
                            </div>
                            <button onClick={() => setShowNewTicket(false)} className="p-3 bg-white/5 text-white/20 rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/5"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreateTicket} className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar-dark">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] ml-1">Subject</label>
                                <input 
                                    className="w-full p-5 bg-brand-950 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary font-black text-white shadow-sm transition-all placeholder:text-white/10 uppercase italic text-xs tracking-widest"
                                    placeholder="TICKET_SUBJECT"
                                    value={newTicket.subject}
                                    onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] ml-1">Urgency</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['low', 'medium', 'high'] as const).map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setNewTicket({...newTicket, priority: p})}
                                            className={`py-4 rounded-xl border text-[9px] font-black uppercase tracking-widest italic transition-all ${
                                                newTicket.priority === p 
                                                    ? (p === 'high' ? 'bg-red-500 border-red-500 text-white' : 'bg-brand-primary border-brand-primary text-brand-950')
                                                    : 'bg-brand-950/50 border-white/5 text-white/20 hover:bg-white/5 hover:border-white/10'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] ml-1">Describe Requirement</label>
                                <textarea 
                                    className="w-full p-5 bg-brand-950 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary font-black text-white shadow-sm transition-all h-40 resize-none placeholder:text-white/10 text-xs tracking-widest leading-relaxed italic"
                                    placeholder="PLEASE_DESCRIBE_IN_DETAIL"
                                    value={newTicket.description}
                                    onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="pt-8 flex justify-end gap-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowNewTicket(false)} className="flex-1 py-4 text-white/20 font-black hover:text-white rounded-2xl transition-all text-[10px] uppercase tracking-widest italic">Discard</button>
                                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-brand-primary text-brand-950 font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em] italic flex items-center justify-center gap-3">
                                    {isSubmitting ? <Clock size={16} className="animate-spin" /> : <>SUBMIT_TICKET <ChevronRight size={14} /></>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
