
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
                                    <h1 className="text-xl font-black text-white italic leading-none" style={{ fontFamily: 'Orbitron' }}>{settings.name.split(' ')[0] || 'ICARUS'}</h1>
                                    <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest">Football Schools</p>
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
                                          <h1 className="text-4xl font-black text-white italic tracking-tighter" style={{ fontFamily: 'Orbitron' }}>{settings.name.split(' ')[0] || 'ICARUS'}</h1>
                                          <p className="text-cyan-400 font-bold uppercase tracking-[0.3em] text-sm">Official Announcement</p>
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
                                      <p className="text-gray-500 text-sm">Training Grounds & Academy HQ</p>
                                      <p className="text-gray-500 text-sm mt-4">www.icarusfootball.com</p>
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Orbitron' }}>
             OFFICIAL <span className="text-icarus-500">NOTICES</span>
          </h2>
          <p className="text-gray-500 font-medium mt-2">Updates, schedules, and important team news.</p>
        </div>
        {(role === 'admin' || role === 'coach') && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-icarus-900 text-white px-6 py-3 rounded-xl hover:bg-black transition-all shadow-lg shadow-icarus-900/20 active:scale-95"
          >
            <Plus size={20} />
            <span className="font-bold text-sm uppercase tracking-wider">New Post</span>
          </button>
        )}
      </div>

      {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-xl text-gray-900">Create Announcement</h3>
                      <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={20} /></button>
                  </div>
                  
                  <form onSubmit={handlePost} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Title</label>
                          <input 
                            className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-icarus-500 focus:ring-4 focus:ring-icarus-500/10 font-bold text-gray-800 transition-all" 
                            placeholder="e.g. Summer Camp Registration Open" 
                            value={newNotice.title} 
                            onChange={e => setNewNotice({...newNotice, title: e.target.value})} 
                            required 
                          />
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Message Body</label>
                          <textarea 
                            className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-icarus-500 focus:ring-4 focus:ring-icarus-500/10 font-medium text-gray-600 transition-all h-32" 
                            placeholder="Details about the announcement..." 
                            value={newNotice.content} 
                            onChange={e => setNewNotice({...newNotice, content: e.target.value})} 
                            required 
                          />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cover Image (Poster)</label>
                              <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-icarus-500 hover:bg-gray-50 transition-all h-32 relative overflow-hidden group"
                              >
                                  {newNotice.imageUrl ? (
                                      <img src={newNotice.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                  ) : (
                                      <div className="text-center text-gray-400">
                                          <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                                          <span className="text-xs font-bold">Upload Poster/Image</span>
                                      </div>
                                  )}
                                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                              </div>
                              <p className="text-[10px] text-gray-400">If uploaded, this will act as the full background of the brochure.</p>
                          </div>

                          <div className="space-y-4">
                              <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">QR Code (Optional)</label>
                                  <div 
                                    onClick={() => qrInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-2 flex items-center justify-center gap-3 cursor-pointer hover:border-icarus-500 hover:bg-gray-50 transition-all h-14 relative overflow-hidden"
                                  >
                                      {newNotice.qrCodeUrl ? (
                                          <div className="flex items-center gap-2 text-green-600 font-bold text-xs">
                                              <QrCode size={16} /> QR Attached
                                          </div>
                                      ) : (
                                          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold">
                                              <QrCode size={16} /> Upload QR
                                          </div>
                                      )}
                                      <input type="file" ref={qrInputRef} className="hidden" accept="image/*" onChange={handleQrUpload} />
                                  </div>
                              </div>

                              <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Priority</label>
                                  <select 
                                      className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-icarus-500 font-medium bg-white" 
                                      value={newNotice.priority} 
                                      onChange={e => setNewNotice({...newNotice, priority: e.target.value as any})}
                                  >
                                      <option value="normal">Normal</option>
                                      <option value="high">High Priority</option>
                                  </select>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Signed By</label>
                                  <input 
                                      className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:border-icarus-500 font-medium" 
                                      placeholder="e.g. Head Coach" 
                                      value={newNotice.author} 
                                      onChange={e => setNewNotice({...newNotice, author: e.target.value})} 
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                          <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                          <button type="submit" className="px-8 py-3 bg-icarus-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all">Post Notice</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Notice Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {notices.map(notice => (
              <div key={notice.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  {/* Card Header Image */}
                  <div className={`h-48 relative overflow-hidden ${!notice.imageUrl ? (notice.priority === 'high' ? 'bg-gradient-to-br from-red-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600') : 'bg-gray-100'}`}>
                      {notice.imageUrl ? (
                          <img src={notice.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                          <div className="absolute inset-0 flex items-center justify-center opacity-20">
                              <Shield size={120} className="text-white" />
                          </div>
                      )}
                      
                      {/* Badges */}
                      <div className="absolute top-4 left-4 flex gap-2">
                          <span className="px-3 py-1 bg-black/30 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/10">
                              {new Date(notice.date).toLocaleDateString()}
                          </span>
                      </div>
                      
                      {notice.priority === 'high' && (
                          <div className="absolute top-4 right-4">
                              <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg flex items-center gap-1">
                                  <AlertCircle size={10} /> Important
                              </span>
                          </div>
                      )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                      <div className="mb-4">
                          <h3 className="text-xl font-black text-gray-900 leading-tight mb-2 group-hover:text-icarus-600 transition-colors">{notice.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-wider">
                              <User size={12} /> {notice.author}
                          </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-1 line-clamp-4">
                          {notice.content}
                      </p>

                      <div className="flex items-center gap-3 pt-6 border-t border-gray-50">
                          <button 
                            onClick={() => initiateDownload(notice)}
                            disabled={downloadingId === notice.id}
                            className="flex-1 py-3 bg-gray-50 text-gray-700 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 group/btn"
                          >
                              {downloadingId === notice.id ? (
                                  <Loader2 size={16} className="animate-spin text-icarus-600" />
                              ) : (
                                  <>
                                    <Download size={16} className="group-hover/btn:text-icarus-600 transition-colors" />
                                    Brochure
                                  </>
                              )}
                          </button>
                          
                          {(role === 'admin' || role === 'coach') && (
                              <button 
                                onClick={() => handleDeleteClick(notice.id)}
                                className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                title="Delete"
                              >
                                  <X size={16} />
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          ))}
          
          {notices.length === 0 && (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                  <Megaphone size={48} className="mb-4 opacity-20" />
                  <h3 className="font-bold text-gray-500">No Announcements</h3>
                  <p className="text-sm">The notice board is currently empty.</p>
              </div>
          )}
      </div>

      <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => {
              setDeleteModalOpen(false);
              setNoticeToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Announcement"
          message="Are you sure you want to delete this announcement? This action cannot be undone."
          confirmText="Delete"
          type="danger"
      />
    </div>
  );
};
