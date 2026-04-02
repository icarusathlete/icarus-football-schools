
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Announcement, Role, AcademySettings } from '../types';
import { Bell, Megaphone, Clock, Plus, X, Image as ImageIcon, Download, Share2, Calendar, User, Shield, AlertCircle, Loader2, QrCode } from 'lucide-react';
import html2canvas from 'html2canvas';
import { ConfirmModal } from './ConfirmModal';

interface NoticeBoardProps {
  role: Role;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({ role }) => {
  const [notices, setNotices] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newNotice, setNewNotice] = useState<{
      title: string, 
      content: string, 
      priority: 'normal' | 'high', 
      author: string, 
      imageUrl: string,
      qrCodeUrl: string
  }>({ 
      title: '', content: '', priority: 'normal', author: '', imageUrl: '', qrCodeUrl: '' 
  });
  const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<string | null>(null);
  
  // Ref for the hidden brochure container
  const brochureRef = useRef<HTMLDivElement>(null);
  // State to hold the specific notice being rendered into the brochure template
  const [brochureData, setBrochureData] = useState<Announcement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotices(StorageService.getNotices());
    const handleSettings = () => setSettings(StorageService.getSettings());
    window.addEventListener('settingsChanged', handleSettings);
    return () => window.removeEventListener('settingsChanged', handleSettings);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setNewNotice(prev => ({ ...prev, imageUrl: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setNewNotice(prev => ({ ...prev, qrCodeUrl: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.addNotice({ 
        ...newNotice, 
        author: newNotice.author || (role === 'admin' ? 'Academy Management' : 'Coach') 
    });
    setNotices(StorageService.getNotices());
    setShowForm(false);
    setNewNotice({ title: '', content: '', priority: 'normal', author: '', imageUrl: '', qrCodeUrl: '' });
  };

  const handleDeleteClick = (id: string) => {
      setNoticeToDelete(id);
      setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (noticeToDelete) {
          try {
              await StorageService.deleteNotice(noticeToDelete);
              // Local state will update via Firebase sync listener
          } catch (err: any) {
              console.error("Error deleting notice:", err);
              alert("Failed to delete notice.");
          } finally {
              setDeleteModalOpen(false);
              setNoticeToDelete(null);
          }
      }
  };

  // Trigger the download process
  const initiateDownload = async (notice: Announcement) => {
      setBrochureData(notice);
      setDownloadingId(notice.id);
      
      // Wait for React to render the brochure template
      setTimeout(async () => {
          if (brochureRef.current) {
              try {
                  const canvas = await html2canvas(brochureRef.current, {
                      scale: 2, // High resolution
                      useCORS: true,
                      backgroundColor: '#ffffff'
                  });
                  
                  const link = document.createElement('a');
                  link.download = `Brochure_${notice.title.replace(/\s+/g, '_')}.png`;
                  link.href = canvas.toDataURL('image/png');
                  link.click();
              } catch (err) {
                  console.error("Brochure generation failed", err);
                  alert("Could not generate brochure.");
              } finally {
                  setDownloadingId(null);
                  setBrochureData(null);
              }
          }
      }, 500);
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* Hidden Brochure Template - Rendered off-screen */}
      <div className="fixed left-[-9999px] top-0">
          {brochureData && (
              <div 
                ref={brochureRef} 
                className="w-[800px] h-[1132px] bg-white relative flex flex-col overflow-hidden"
              >
                  {/* SCENARIO A: Full Image Poster Mode */}
                  {brochureData.imageUrl ? (
                      <div className="absolute inset-0 w-full h-full">
                          <img 
                            src={brochureData.imageUrl} 
                            className="w-full h-full object-cover" 
                            alt="Full Poster"
                          />
                          
                          {/* Branding Overlay (Top Right) */}
                          <div className="absolute top-8 right-8 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl flex items-center gap-3">
                                {settings.logoUrl ? (
                                    <img src={settings.logoUrl} className="w-12 h-12 object-contain" />
                                ) : (
                                    <Shield className="w-12 h-12 text-white" />
                                )}
                                <div>
                                    <h1 className="text-xl font-black text-white italic leading-none" style={{ fontFamily: 'Orbitron' }}>{settings.name.split(' ')[0]}</h1>
                                    <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest">{settings.name.split(' ').slice(1).join(' ') || 'Portal'}</p>
                                </div>
                          </div>

                          {/* QR Code Overlay (Bottom Right) */}
                          {brochureData.qrCodeUrl && (
                              <div className="absolute bottom-8 right-8 bg-white p-3 rounded-2xl shadow-2xl border-4 border-white/20 backdrop-blur-sm">
                                  <img src={brochureData.qrCodeUrl} className="w-32 h-32 object-contain" />
                                  <p className="text-center text-xs font-bold text-gray-900 mt-2 uppercase tracking-wide">Scan Me</p>
                              </div>
                          )}
                      </div>
                  ) : (
                      /* SCENARIO B: Clean & Beautiful Text-Based Brochure */
                      <div className="flex flex-col h-full font-sans text-gray-900 bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {/* Decorative Header */}
                          <div className="h-64 bg-slate-900 relative overflow-hidden flex-shrink-0">
                              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
                              
                              <div className="relative z-10 h-full flex flex-col justify-center px-16">
                                  <div className="flex items-center gap-4 mb-4">
                                      <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                                          {settings.logoUrl ? (
                                              <img src={settings.logoUrl} className="w-10 h-10 object-contain" />
                                          ) : (
                                              <Shield className="w-10 h-10 text-cyan-400" />
                                          )}
                                      </div>
                                      <div>
                                          <h1 className="text-4xl font-black text-white italic tracking-tighter" style={{ fontFamily: 'Orbitron' }}>{settings.name.split(' ')[0]}</h1>
                                          <p className="text-brand-500 font-bold uppercase tracking-[0.3em] text-sm">Official Announcement</p>
                                      </div>
                                  </div>
                              </div>
                              <div className="absolute bottom-0 left-0 w-full h-12 bg-white" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0)' }}></div>
                          </div>

                          {/* Main Content */}
                          <div className="flex-1 px-16 py-8">
                              <div className="flex items-center justify-between border-b-2 border-gray-100 pb-6 mb-8">
                                  <div>
                                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Date</p>
                                      <p className="text-xl font-bold text-gray-800">{new Date(brochureData.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">From</p>
                                      <p className="text-xl font-bold text-gray-800">{brochureData.author}</p>
                                  </div>
                              </div>

                              <h2 className="text-5xl font-black text-slate-900 mb-8 leading-tight tracking-tight">{brochureData.title}</h2>
                              
                              <div className="prose prose-xl prose-slate max-w-none text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                                  {brochureData.content}
                              </div>
                          </div>

                          {/* Footer */}
                          <div className="bg-slate-50 px-16 py-12 border-t border-gray-200 mt-auto">
                              <div className="flex justify-between items-end">
                                  <div>
                                      <h3 className="font-bold text-slate-900 text-lg mb-1">{settings.name}</h3>
                                      <p className="text-gray-500 text-sm">Official Academy Hub</p>
                                      <p className="text-gray-500 text-sm mt-4">{settings.name.toLowerCase().replace(/\s+/g, '')}.com</p>
                                  </div>
                                  <div className="text-right">
                                      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 inline-block">
                                          {brochureData.qrCodeUrl ? (
                                              <img src={brochureData.qrCodeUrl} className="w-24 h-24 object-contain" />
                                          ) : (
                                              <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-gray-300">
                                                  <Share2 size={32} />
                                              </div>
                                          )}
                                      </div>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Scan for details</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-brand-800 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Megaphone size={120} className="text-white" /></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter" style={{ fontFamily: 'Orbitron' }}>
             INTELLIGENCE <span className="text-lime">BULLETINS</span>
          </h2>
          <p className="text-white/40 font-black uppercase text-[10px] tracking-widest mt-1">Official Directives • Tactical Briefings • Sector Updates</p>
        </div>
        {(role === 'admin' || role === 'coach') && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-3 bg-brand-500 text-brand-950 px-8 py-3.5 rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-brand-500/20 active:scale-95 z-10"
          >
            <Plus size={20} />
            <span className="font-black text-[10px] uppercase tracking-[0.2em]">Broadcast Directive</span>
          </button>
        )}
      </div>

      {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/90 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-brand-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">
                  <div className="px-10 py-6 border-b border-white/5 flex justify-between items-center relative bg-brand-950/50">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-30" />
                      <h3 className="font-black text-2xl text-white italic uppercase tracking-tight">Draft <span className="text-brand-500">Intelligence Bulletin</span></h3>
                      <button onClick={() => setShowForm(false)} className="p-3 hover:bg-white/10 rounded-full text-brand-500 transition-colors"><X size={20} /></button>
                  </div>
                  
                  <form onSubmit={handlePost} className="p-10 space-y-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Directive Header (Title)</label>
                          <input 
                            className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl outline-none focus:border-gold font-bold text-white shadow-inner transition-all placeholder:text-brand-700" 
                            placeholder="e.g. MISSION: SUMMER CAMP REGISTRATION" 
                            value={newNotice.title} 
                            onChange={e => setNewNotice({...newNotice, title: e.target.value})} 
                            required 
                          />
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Bulletin Content</label>
                          <textarea 
                            className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl outline-none focus:border-gold font-bold text-white shadow-inner transition-all h-32 placeholder:text-brand-700 text-sm" 
                            placeholder="Provide full intelligence briefing..." 
                            value={newNotice.content} 
                            onChange={e => setNewNotice({...newNotice, content: e.target.value})} 
                            required 
                          />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Visual Asset (Poster)</label>
                              <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-gold hover:bg-gold/5 transition-all h-32 relative overflow-hidden group shadow-inner bg-brand-800/50"
                              >
                                  {newNotice.imageUrl ? (
                                      <img src={newNotice.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                  ) : (
                                      <div className="text-center text-brand-600">
                                          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gold opacity-50" />
                                          <span className="text-[10px] font-black uppercase tracking-widest">Attach Media</span>
                                      </div>
                                  )}
                                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                              </div>
                          </div>

                          <div className="space-y-6">
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Tactical Auth (QR)</label>
                                  <div 
                                    onClick={() => qrInputRef.current?.click()}
                                    className="border border-white/10 rounded-2xl p-4 flex items-center justify-center gap-3 cursor-pointer hover:border-gold hover:bg-gold/5 transition-all h-14 bg-brand-800 shadow-inner group"
                                  >
                                      {newNotice.qrCodeUrl ? (
                                          <div className="flex items-center gap-2 text-gold font-black text-[10px] uppercase tracking-widest">
                                              <QrCode size={16} /> QR Encrypted
                                          </div>
                                      ) : (
                                          <div className="flex items-center gap-2 text-brand-600 text-[10px] font-black uppercase tracking-widest group-hover:text-gold transition-colors">
                                              <QrCode size={16} /> Data Link (QR)
                                          </div>
                                      )}
                                      <input type="file" ref={qrInputRef} className="hidden" accept="image/*" onChange={handleQrUpload} />
                                  </div>
                              </div>

                              <div className="flex gap-4">
                                  <div className="flex-1 space-y-2">
                                      <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Threat Level</label>
                                      <select 
                                          className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl outline-none focus:border-gold font-bold text-white shadow-inner appearance-none text-xs" 
                                          value={newNotice.priority} 
                                          onChange={e => setNewNotice({...newNotice, priority: e.target.value as any})}
                                      >
                                          <option value="normal">Routine</option>
                                          <option value="high">Critical</option>
                                      </select>
                                  </div>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Authorized Signatory</label>
                                  <input 
                                      className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl outline-none focus:border-gold font-bold text-white shadow-inner text-xs placeholder:text-brand-700" 
                                      placeholder="e.g. COMMANDER DAVID" 
                                      value={newNotice.author} 
                                      onChange={e => setNewNotice({...newNotice, author: e.target.value})} 
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="pt-8 flex justify-end gap-4 border-t border-white/5">
                          <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 text-brand-500 font-black hover:text-white rounded-2xl transition-all text-[10px] uppercase tracking-widest">Abort</button>
                          <button type="submit" className="flex-[2] py-4 bg-gold text-brand-950 font-black rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em]">Authorize Broadcast</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Notice Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {notices.map(notice => (
              <div key={notice.id} className="bg-brand-900 rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden flex flex-col group hover:border-gold/30 transition-all duration-500 hover:-translate-y-2 relative">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Card Header Image */}
                  <div className={`h-52 relative overflow-hidden ${!notice.imageUrl ? (notice.priority === 'high' ? 'bg-gradient-to-br from-red-600 to-red-900' : 'bg-brand-950') : 'bg-brand-950'}`}>
                      {notice.imageUrl ? (
                          <img src={notice.imageUrl} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110 opacity-70 group-hover:opacity-100" />
                      ) : (
                          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                              <Shield size={200} className="text-white" />
                          </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-transparent to-transparent" />

                      {/* Badges */}
                      <div className="absolute top-6 left-6 flex gap-2">
                          <span className="px-3 py-1 bg-brand-950/80 backdrop-blur-md text-brand-400 text-[8px] font-black uppercase tracking-[0.2em] rounded-lg border border-white/10 shadow-xl">
                              {new Date(notice.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                      </div>
                      
                      {notice.priority === 'high' && (
                          <div className="absolute top-6 right-6">
                              <div className="px-3 py-1 bg-red-600 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg shadow-2xl flex items-center gap-2 animate-pulse">
                                  <AlertCircle size={10} /> CRITICAL
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-8 flex-1 flex flex-col relative bg-brand-900">
                      <div className="mb-6">
                          <h3 className="text-xl font-black text-white italic leading-tight mb-3 group-hover:text-gold transition-colors uppercase tracking-tight" style={{ fontFamily: 'Orbitron' }}>{notice.title}</h3>
                          <div className="flex items-center gap-2 text-[9px] text-brand-500 font-black uppercase tracking-[0.2em]">
                              <div className="w-1.5 h-1.5 rounded-full bg-gold/50 shadow-[0_0_8px_#fbbf24]" />
                              Authorized by <span className="text-brand-300 ml-1">{notice.author}</span>
                          </div>
                      </div>
                      
                      <div className="text-brand-400 text-[12px] leading-relaxed mb-8 flex-1 line-clamp-4 font-medium italic opacity-80 border-l-2 border-white/5 pl-4">
                          {notice.content}
                      </div>

                      <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                          <button 
                            onClick={() => initiateDownload(notice)}
                            disabled={downloadingId === notice.id}
                            className="flex-1 py-3.5 bg-brand-950 border border-white/5 text-brand-400 font-black text-[9px] uppercase tracking-[0.2em] rounded-xl hover:bg-gold hover:text-brand-950 hover:border-gold transition-all duration-300 flex items-center justify-center gap-3 group/btn shadow-inner"
                          >
                              {downloadingId === notice.id ? (
                                  <Loader2 size={14} className="animate-spin text-gold" />
                              ) : (
                                  <>
                                    <Download size={16} className="transition-transform group-hover/btn:translate-y-[-2px]" />
                                    Generate Brochure
                                  </>
                              )}
                          </button>
                          
                          {(role === 'admin' || role === 'coach') && (
                              <button 
                                onClick={() => handleDeleteClick(notice.id)}
                                className="p-3.5 bg-brand-950 border border-white/10 text-brand-600 rounded-xl hover:bg-red-600/10 hover:text-red-500 hover:border-red-500/30 transition-all"
                                title="Revoke Directive"
                              >
                                  <X size={18} />
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          ))}
          
          {notices.length === 0 && (
              <div className="col-span-full py-40 text-center flex flex-col items-center justify-center text-brand-600 bg-brand-800/30 rounded-[4rem] border-2 border-dashed border-white/5">
                  <Megaphone size={64} className="mb-6 opacity-5" />
                  <h3 className="font-black text-brand-400 uppercase tracking-[0.4em] italic">Intelligence Void</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-50">No active bulletins in the datastore.</p>
              </div>
          )}
      </div>

      <ConfirmModal
          isOpen={deleteModalOpen}
          onCancel={() => {
              setDeleteModalOpen(false);
              setNoticeToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="REDLINE PROTOCOL"
          message="Are you sure you want to revoke this directive? This action will permanently remove the bulletin from all terminal nodes."
          confirmText="REVOKE"
          type="danger"
      />
    </div>
  );
};
