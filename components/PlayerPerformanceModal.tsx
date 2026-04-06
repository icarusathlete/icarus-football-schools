import React, { useState } from 'react';
import { Player } from '../types';
import { X, Activity, Image as ImageIcon, Video, Paperclip, ChevronRight, Target } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface Props {
  player: Player;
  onCancel: () => void;
  onUpdate: (updatedPlayer: Player) => void;
}

export const PlayerPerformanceModal: React.FC<Props> = ({ player, onCancel, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'kpis' | 'attachments'>('timeline');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentNote, setNewAttachmentNote] = useState('');
  const [newAttachmentType, setNewAttachmentType] = useState<'image' | 'video'>('image');

  // Dummy timeline data based on joined date
  const milestones = [
    { date: player.registeredAt, title: 'Joined Academy', desc: 'Completed orientation and technical baseline.' },
    { date: new Date(Date.now() - 30*24*60*60*1000).toISOString(), title: 'First Month Review', desc: 'Showed great improvement in stamina.' },
    { date: new Date(Date.now() - 7*24*60*60*1000).toISOString(), title: 'Match Debut', desc: 'Played 45 mins, 1 assist in friendly.' }
  ];

  const getKPIs = () => {
    switch(player.position.toLowerCase()) {
      case 'forward': return [{ label: 'Shot Accuracy', val: '68%' }, { label: 'Conversion Rate', val: '22%' }, { label: 'Attacking Runs', val: '14/match' }];
      case 'midfielder': return [{ label: 'Pass Completion', val: '84%' }, { label: 'Key Passes', val: '3.2/match' }, { label: 'Distance Covered', val: '6.8 km' }];
      case 'defender': return [{ label: 'Tackle Success', val: '76%' }, { label: 'Interceptions', val: '5/match' }, { label: 'Aerial Duels', val: '62% won' }];
      case 'goalkeeper': return [{ label: 'Save Percentage', val: '71%' }, { label: 'Clean Sheets', val: '4' }, { label: 'Distribution Acc.', val: '88%' }];
      default: return [{ label: 'General Fitness', val: 'Good' }, { label: 'Match Rating', val: '7.2' }];
    }
  };

  const handleAddAttachment = () => {
    if(!newAttachmentUrl) return;
    const newAttachment = {
      url: newAttachmentUrl,
      type: newAttachmentType,
      note: newAttachmentNote,
      date: new Date().toISOString()
    };
    const updated = {
       ...player,
       attachments: [...(player.attachments || []), newAttachment]
    };
    StorageService.updatePlayer(updated);
    onUpdate(updated);
    setNewAttachmentUrl('');
    setNewAttachmentNote('');
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* HEADER */}
        <div className="bg-slate-900 px-8 py-8 flex justify-between items-center relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-3xl -z-10 rounded-full" />
           <div className="flex items-center gap-6 relative z-10">
              <img src={player.photoUrl} className="w-16 h-16 rounded-2xl border-2 border-white/20 shadow-xl object-cover bg-white/5" />
              <div>
                  <h3 className="font-black text-2xl text-white italic uppercase tracking-tight leading-none mb-2">{player.fullName}</h3>
                  <div className="flex gap-2 items-center">
                      <span className="text-[9px] bg-brand-500 text-slate-900 px-3 py-1 rounded-full uppercase tracking-widest font-black italic">{player.position}</span>
                      <span className="text-[10px] text-white/40 font-black tracking-widest uppercase italic bg-white/5 px-3 py-1 rounded-full border border-white/10">{player.memberId}</span>
                  </div>
              </div>
           </div>
           <button onClick={onCancel} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/10 shadow-lg relative z-10">
              <X size={24} />
           </button>
        </div>

        {/* TABS */}
        <div className="flex bg-slate-50 px-8 border-b border-slate-200 gap-8 text-[10px] font-black uppercase tracking-[0.2em] italic">
           {['timeline', 'kpis', 'attachments'].map((tab) => (
               <button 
                 key={tab}
                 onClick={() => setActiveTab(tab as any)} 
                 className={`pb-5 pt-6 border-b-2 transition-all relative ${activeTab === tab ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
               >
                 {tab === 'timeline' ? 'Progress Timeline' : tab === 'kpis' ? 'Performance Stats' : 'Photos & Videos'}
                 {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 shadow-[0_-4px_10px_rgba(14,165,233,0.5)]" />}
               </button>
           ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar-light relative text-left">
           
           {activeTab === 'timeline' && (
               <div className="space-y-8 animate-in slide-in-from-left-4 duration-300 pl-4 border-l-2 border-slate-100 ml-4">
                  {milestones.map((m, i) => (
                      <div key={i} className="relative">
                          <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-brand-500 shadow-[0_0_15px_rgba(14,165,233,0.6)] border-2 border-white transition-transform hover:scale-125" />
                          <div className="pl-6 group">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">{new Date(m.date).toLocaleDateString()}</div>
                              <h4 className="text-lg font-black text-slate-900 uppercase italic tracking-tight group-hover:text-brand-500 transition-colors">{m.title}</h4>
                              <p className="text-slate-500 text-[13px] font-bold mt-2 leading-relaxed italic">{m.desc}</p>
                          </div>
                      </div>
                  ))}
               </div>
           )}

           {activeTab === 'kpis' && (
               <div className="animate-in slide-in-from-right-4 duration-300 grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="md:col-span-2 mb-4 bg-brand-50 p-6 rounded-[1.5rem] border border-brand-100 flex items-center gap-4">
                       <div className="p-3 bg-brand-500 rounded-2xl text-white shadow-lg shadow-brand-500/20"><Target size={24} /></div>
                       <div>
                           <div className="text-slate-900 font-black italic uppercase tracking-tight">{player.position} Stats</div>
                           <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Key performance indicators for this player.</div>
                       </div>
                   </div>
                   {getKPIs().map((kpi, i) => (
                       <div key={i} className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex flex-col justify-center items-center text-center group hover:border-brand-500/20 transition-all hover:bg-white hover:shadow-xl">
                           <div className="text-4xl font-black text-slate-900 italic tracking-tighter group-hover:text-brand-500 transition-colors">{kpi.val}</div>
                           <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mt-3 font-black italic">{kpi.label}</div>
                       </div>
                   ))}
               </div>
           )}

           {activeTab === 'attachments' && (
               <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-10">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       {player.attachments?.map((att, i) => (
                           <div key={i} className="bg-white border border-slate-100 rounded-[1.5rem] overflow-hidden group shadow-sm hover:shadow-xl transition-all">
                               {att.type === 'image' ? (
                                   <div className="h-40 bg-slate-100 relative overflow-hidden">
                                       <img src={att.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                       <div className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-xl border border-white/20"><ImageIcon size={14} className="text-white"/></div>
                                   </div>
                               ) : (
                                   <div className="h-40 bg-slate-900 flex items-center justify-center relative">
                                        <div className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center border border-brand-500/30"><Video className="text-brand-500" /></div>
                                        <div className="absolute top-4 right-4 p-2 bg-white/10 rounded-xl"><Video size={14} className="text-white"/></div>
                                   </div>
                               )}
                               <div className="p-5">
                                   <div className="text-[13px] font-black text-slate-900 italic uppercase tracking-tight truncate mb-1">{att.note || 'Untitled Note'}</div>
                                   <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic">{new Date(att.date).toLocaleDateString()}</div>
                               </div>
                           </div>
                       ))}
                       {(!player.attachments || player.attachments.length === 0) && (
                           <div className="col-span-2 p-12 border-2 border-dashed border-slate-100 rounded-[2rem] text-center text-slate-300 font-black uppercase tracking-widest flex flex-col items-center italic">
                               <Paperclip className="mb-4 opacity-20" size={48} />
                               No photos or videos added yet
                           </div>
                       )}
                   </div>

                   {/* Add new attachment form */}
                   <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                       <h4 className="text-slate-900 font-black italic uppercase tracking-tight mb-6 flex items-center gap-3"><Paperclip size={20} className="text-brand-500" /> Add Record</h4>
                       <div className="space-y-6">
                           <div className="flex gap-6">
                               {['image', 'video'].map((type) => (
                                   <label key={type} className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest italic cursor-pointer group">
                                       <input type="radio" checked={newAttachmentType === type} onChange={() => setNewAttachmentType(type as any)} className="w-4 h-4 accent-brand-500" />
                                       <span className={`${newAttachmentType === type ? 'text-brand-500' : 'group-hover:text-slate-700'} transition-colors`}>{type.toUpperCase()} TYPE</span>
                                   </label>
                               ))}
                           </div>
                           <div className="grid grid-cols-1 gap-4">
                               <input 
                                 type="text" 
                                 placeholder={newAttachmentType === 'image' ? 'IMAGE URL' : 'VIDEO URL'} 
                                 value={newAttachmentUrl}
                                 onChange={e=>setNewAttachmentUrl(e.target.value)}
                                 className="w-full bg-white border border-slate-200 rounded-xl p-5 text-slate-900 text-xs font-black italic uppercase tracking-widest outline-none focus:border-brand-500 shadow-sm"
                               />
                               <input 
                                 type="text" 
                                 placeholder="NOTES (OPTIONAL)" 
                                 value={newAttachmentNote}
                                 onChange={e=>setNewAttachmentNote(e.target.value)}
                                 className="w-full bg-white border border-slate-200 rounded-xl p-5 text-slate-900 text-xs font-black italic uppercase tracking-widest outline-none focus:border-brand-500 shadow-sm"
                               />
                           </div>
                           <button onClick={handleAddAttachment} className="w-full py-5 bg-brand-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-brand-500/20 italic">
                               SAVE TO PROFILE
                           </button>
                       </div>
                   </div>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};
