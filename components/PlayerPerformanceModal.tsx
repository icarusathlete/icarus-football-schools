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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-brand-900 w-full max-w-3xl rounded-3xl shadow-[0_0_50px_rgba(30,41,59,0.8)] overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
        
        {/* HEADER */}
        <div className="bg-brand-800 px-8 py-6 flex justify-between items-center relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-3xl -z-10 rounded-full" />
           <div className="flex items-center gap-6">
              <img src={player.photoUrl} className="w-16 h-16 rounded-full border-2 border-brand-500 shadow-lg object-cover" />
              <div>
                  <h3 className="font-bold text-2xl text-white tracking-tight">{player.fullName}</h3>
                  <div className="flex gap-2 items-center mt-1">
                      <span className="text-xs bg-white/10 text-brand-300 px-2 py-0.5 rounded uppercase tracking-wider font-bold">{player.position}</span>
                      <span className="text-xs text-brand-400 font-mono">{player.memberId}</span>
                  </div>
              </div>
           </div>
           <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full text-brand-400 hover:text-white transition-all">
              <X size={24} />
           </button>
        </div>

        {/* TABS */}
        <div className="flex bg-brand-900 px-8 py-2 border-b border-white/5 gap-6 text-sm font-bold uppercase tracking-wider">
           <button 
             onClick={() => setActiveTab('timeline')} 
             className={`pb-3 pt-3 border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-gold text-gold' : 'border-transparent text-brand-400 hover:text-brand-300'}`}
           >
             Dev. Timeline
           </button>
           <button 
             onClick={() => setActiveTab('kpis')} 
             className={`pb-3 pt-3 border-b-2 transition-colors ${activeTab === 'kpis' ? 'border-gold text-gold' : 'border-transparent text-brand-400 hover:text-brand-300'}`}
           >
             Position KPIs
           </button>
           <button 
             onClick={() => setActiveTab('attachments')} 
             className={`pb-3 pt-3 border-b-2 transition-colors ${activeTab === 'attachments' ? 'border-gold text-gold' : 'border-transparent text-brand-400 hover:text-brand-300'}`}
           >
             Media Vault
           </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
           
           {activeTab === 'timeline' && (
               <div className="space-y-6 animate-fade-in pl-4 border-l-2 border-brand-800 ml-4">
                  {milestones.map((m, i) => (
                      <div key={i} className="relative">
                          <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-gold shadow-[0_0_10px_rgba(251,191,36,0.5)] -ml-px" />
                          <div className="pl-6">
                              <div className="text-xs font-bold text-brand-400 uppercase tracking-widest">{new Date(m.date).toLocaleDateString()}</div>
                              <h4 className="text-lg font-bold text-white mt-1">{m.title}</h4>
                              <p className="text-brand-300 text-sm mt-1">{m.desc}</p>
                          </div>
                      </div>
                  ))}
               </div>
           )}

           {activeTab === 'kpis' && (
               <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="md:col-span-2 mb-4 bg-brand-800/50 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                       <Target className="text-gold" size={24} />
                       <div>
                           <div className="text-white font-bold">{player.position} Metrics</div>
                           <div className="text-xs text-brand-400">Key performance indicators tracked for this position.</div>
                       </div>
                   </div>
                   {getKPIs().map((kpi, i) => (
                       <div key={i} className="bg-brand-800 p-6 rounded-2xl border border-white/5 flex flex-col justify-center items-center text-center">
                           <div className="text-3xl font-black text-white">{kpi.val}</div>
                           <div className="text-xs uppercase tracking-widest text-brand-400 mt-2 font-bold">{kpi.label}</div>
                       </div>
                   ))}
               </div>
           )}

           {activeTab === 'attachments' && (
               <div className="animate-fade-in space-y-8">
                   <div className="grid grid-cols-2 gap-4">
                       {player.attachments?.map((att, i) => (
                           <div key={i} className="bg-brand-800 border border-white/10 rounded-xl overflow-hidden group">
                               {att.type === 'image' ? (
                                   <div className="h-32 bg-brand-950 relative overflow-hidden">
                                       <img src={att.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                       <div className="absolute top-2 right-2 p-1 bg-black/50 backdrop-blur rounded"><ImageIcon size={12} className="text-white"/></div>
                                   </div>
                               ) : (
                                   <div className="h-32 bg-brand-950 flex items-center justify-center relative">
                                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"><Video className="text-white" /></div>
                                   </div>
                               )}
                               <div className="p-3">
                                   <div className="text-sm font-bold text-white truncate">{att.note || 'Untitled Attachment'}</div>
                                   <div className="text-[10px] text-brand-400 uppercase tracking-widest mt-1">{new Date(att.date).toLocaleDateString()}</div>
                               </div>
                           </div>
                       ))}
                       {(!player.attachments || player.attachments.length === 0) && (
                           <div className="col-span-2 p-8 border border-dashed border-white/10 rounded-xl text-center text-brand-500 font-bold flex flex-col items-center">
                               <Paperclip className="mb-2 opacity-50" size={32} />
                               No attachments yet
                           </div>
                       )}
                   </div>

                   {/* Add new attachment form */}
                   <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                       <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Paperclip size={16}/> Add Attachment</h4>
                       <div className="space-y-4">
                           <div className="flex gap-4">
                               <label className="flex items-center gap-2 text-sm text-brand-300">
                                   <input type="radio" checked={newAttachmentType==='image'} onChange={()=>setNewAttachmentType('image')} className="accent-gold"/> Image
                               </label>
                               <label className="flex items-center gap-2 text-sm text-brand-300">
                                   <input type="radio" checked={newAttachmentType==='video'} onChange={()=>setNewAttachmentType('video')} className="accent-gold"/> Video URL
                               </label>
                           </div>
                           <input 
                             type="text" 
                             placeholder={newAttachmentType === 'image' ? 'Image URL (e.g. from Firebase Storage)' : 'YouTube Video URL'} 
                             value={newAttachmentUrl}
                             onChange={e=>setNewAttachmentUrl(e.target.value)}
                             className="w-full bg-brand-900 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-gold"
                           />
                           <input 
                             type="text" 
                             placeholder="Note / Description (Optional)" 
                             value={newAttachmentNote}
                             onChange={e=>setNewAttachmentNote(e.target.value)}
                             className="w-full bg-brand-900 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-gold"
                           />
                           <button onClick={handleAddAttachment} className="bg-gold text-brand-950 font-bold px-6 py-2 rounded-lg text-sm transition-colors hover:bg-yellow-400">
                               Upload Media
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
