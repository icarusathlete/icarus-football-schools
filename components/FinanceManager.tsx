
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Player, FeeRecord, AcademySettings } from '../types';
import { Check, X, AlertCircle, DollarSign, Search, Calendar, ChevronRight, User as UserIcon, FileText, Download, Loader2, Send, Phone, MapPin, Mail, Globe, Trophy } from 'lucide-react';
import html2canvas from 'html2canvas';

import { jsPDF } from 'jspdf';

// Helper to convert number to words (Simplified for demo)
const numberToWords = (num: number): string => {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

    if ((num = num.toString().length > 9 ? parseFloat(num.toString().slice(0, 9)) : num) === 0) return 'Zero';
    
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';

    let str = '';
    str += (parseInt(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (parseInt(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (parseInt(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (parseInt(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (parseInt(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';

    return str + 'Only';
};

export const FinanceManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tracking'>('tracking');
  const [players, setPlayers] = useState<Player[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
  const [invoiceTemplate, setInvoiceTemplate] = useState<string | null>(localStorage.getItem('icarus_invoice_template'));

  // Invoice State
  const [isInvoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedPlayerForInvoice, setSelectedPlayerForInvoice] = useState<Player | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [invoiceForm, setInvoiceForm] = useState({
      invoiceNo: '',
      date: new Date().toISOString().split('T')[0],
      amount: 2400, // Default amount in Rupees
      paymentMode: 'UPI' as 'Cash' | 'UPI' | 'Bank Transfer' | 'Card',
      validTill: '',
  });

  const loadData = () => {
    setPlayers(StorageService.getPlayers());
    setFees(StorageService.getFees());
    setSettings(StorageService.getSettings());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('academy_data_update', loadData);
    return () => window.removeEventListener('academy_data_update', loadData);
  }, []);

  const getStatus = (playerId: string) => {
    return fees.find(f => f.playerId === playerId && f.month === month);
  };

  const updateStatus = (playerId: string, status: FeeRecord['status']) => {
    const existing = getStatus(playerId);
    const record: FeeRecord = {
        id: existing ? existing.id : Math.random().toString(36).substr(2, 9),
        playerId,
        month,
        status,
        amount: existing ? existing.amount : 2400,
        datePaid: status === 'PAID' ? new Date().toISOString() : undefined
    };
    StorageService.updateFee(record);
  };

  // --- Invoice Logic ---
  const openInvoiceGenerator = (player: Player) => {
      setSelectedPlayerForInvoice(player);
      const existing = getStatus(player.id);
      
      const nextId = existing?.invoice?.invoiceNo || StorageService.getNextInvoiceId();
      
      // Calculate 'Valid Till'
      const [y, m] = month.split('-');
      const lastDay = new Date(parseInt(y), parseInt(m), 0).toISOString().split('T')[0];

      setInvoiceForm({
          invoiceNo: nextId,
          date: existing?.invoice?.date || new Date().toISOString().split('T')[0],
          amount: existing?.amount || 2400,
          paymentMode: (existing?.invoice?.paymentMode as any) || 'UPI',
          validTill: existing?.invoice?.validTill || lastDay
      });
      setInvoiceModalOpen(true);
  };

  const handleSubmitInvoice = async () => {
      if (!selectedPlayerForInvoice) return;
      setIsSubmitting(true);

      await new Promise(resolve => setTimeout(resolve, 800));

      const existingRecord = getStatus(selectedPlayerForInvoice.id);
      
      const updatedFee: FeeRecord = {
          id: existingRecord ? existingRecord.id : Math.random().toString(36).substr(2, 9),
          playerId: selectedPlayerForInvoice.id,
          month: month,
          status: 'PAID',
          amount: invoiceForm.amount,
          datePaid: new Date().toISOString(),
          invoice: invoiceForm
      };

      StorageService.updateFee(updatedFee);
      
      if (!existingRecord?.invoice) {
        StorageService.saveLastInvoiceId(invoiceForm.invoiceNo);
      }
      
      setIsSubmitting(false);
      setInvoiceModalOpen(false);
  };

  const handleDownloadPDF = async () => {
      if (!invoiceRef.current) return;
      
      // Ensure the element is scrolled to top before capturing to avoid cutting
      const originalScrollPos = window.scrollY;
      window.scrollTo(0, 0);

      try {
          const canvas = await html2canvas(invoiceRef.current, {
              scale: 3, // Higher scale for better quality
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
              windowWidth: invoiceRef.current.scrollWidth,
              windowHeight: invoiceRef.current.scrollHeight,
              y: 0,
              x: 0
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'px',
              format: [canvas.width / 3, canvas.height / 3]
          });
          
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 3, canvas.height / 3);
          pdf.save(`Invoice_${selectedPlayerForInvoice?.fullName.replace(/\s+/g, '_')}_${invoiceForm.invoiceNo}.pdf`);
      } finally {
          window.scrollTo(0, originalScrollPos);
      }
  };

  // Tax Calculation Logic (18% GST included in Total)
  const calculateTaxes = (total: number) => {
      const base = total / 1.18;
      const cgst = base * 0.09;
      const sgst = base * 0.09;
      return {
          base: Math.round(base),
          cgst: Math.round(cgst),
          sgst: Math.round(sgst),
          total: total
      };
  };

  const filteredPlayers = players.filter(p => p.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalDue = filteredPlayers.length * 2400;
  const totalCollected = filteredPlayers.reduce((sum, p) => {
      const rec = getStatus(p.id);
      return sum + (rec?.status === 'PAID' ? (rec.amount || 2400) : 0);
  }, 0);

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'PAID': return 'bg-green-100 text-green-700 border-green-200';
          case 'OVERDUE': return 'bg-red-100 text-red-700 border-red-200';
          default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      }
  };

  const taxes = calculateTaxes(invoiceForm.amount);

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              setInvoiceTemplate(base64String);
              localStorage.setItem('icarus_invoice_template', base64String);
          };
          reader.readAsDataURL(file);
      }
  };

  const clearTemplate = () => {
      setInvoiceTemplate(null);
      localStorage.removeItem('icarus_invoice_template');
  };

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-700 font-display">
       {/* Removed External Invoice Generator Tab as per request */}

       {activeTab === 'tracking' ? (
         <>
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-brand-500 p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><DollarSign size={160} className="text-white" /></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none flex items-center gap-4">
                        FINANCE <span className="text-brand-950">DECK</span>
                    </h1>
                    <p className="text-white/80 font-black uppercase text-[10px] tracking-[0.4em] mt-3 italic">Academy Revenue & Fee Tracking System</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-6 relative z-10 w-full lg:w-auto">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-brand-950 uppercase tracking-widest italic ml-1">Archive Month</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-950" />
                            <input 
                              type="month" 
                              value={month} 
                              onChange={e => setMonth(e.target.value)} 
                              className="w-full sm:w-auto pl-12 pr-6 py-4 bg-white border border-brand-200 rounded-2xl text-brand-950 font-black italic text-sm outline-none focus:border-brand-950 transition-all font-mono shadow-sm"
                            />
                        </div>
                    </div>
                    
                    <div className="bg-brand-500/20 backdrop-blur-xl px-8 py-4 rounded-[2rem] border border-brand-500/40 shadow-inner flex items-center justify-between gap-10">
                        <div>
                            <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest mb-1 italic">COLLECTED DATA</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-lime italic">₹{totalCollected}</span>
                                <span className="text-[10px] font-bold text-brand-700">/ ₹{totalDue}</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-lime/10 flex items-center justify-center text-lime border border-lime/20 shadow-[0_0_20px_rgba(190,242,100,0.1)]">
                            <Trophy size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-400 group-focus-within:text-brand-950 transition-colors w-5 h-5" />
                <input 
                  placeholder="Search student athletes..." 
                  className="w-full pl-16 pr-8 py-5 bg-white border border-brand-100 rounded-[2rem] shadow-xl focus:border-brand-500 outline-none transition-all font-black text-xs text-brand-950 placeholder:text-brand-200 italic tracking-wider"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

           {/* Mobile Card View (Hidden on MD+) */}
           <div className="md:hidden grid gap-4">
              {filteredPlayers.map(p => {
                  const status = getStatus(p.id);
                  const statusVal = status?.status || 'PENDING';
                  return (
                      <div key={p.id} className="bg-brand-500/10 backdrop-blur-md p-6 rounded-[2rem] border border-brand-500/20 shadow-2xl relative overflow-hidden group">
                          <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[9px] font-black tracking-widest uppercase border-b border-l border-white/10 ${
                              statusVal === 'PAID' ? 'bg-lime text-brand-950' : 
                              statusVal === 'OVERDUE' ? 'bg-red-600 text-white' : 
                              'bg-brand-900 text-brand-500'
                          }`}>
                              {statusVal === 'PAID' ? 'SECURED' : statusVal === 'OVERDUE' ? 'BREACH' : 'PENDING'}
                          </div>
                          <div className="flex items-center gap-4 mb-4">
                              <img src={p.photoUrl} className="w-16 h-16 rounded-full bg-brand-900 object-cover border-2 border-white/10" />
                              <div>
                                  <h3 className="font-black text-white italic truncate">{p.fullName}</h3>
                                  <p className="text-[10px] text-brand-700 font-mono tracking-widest uppercase">{p.memberId}</p>
                                  {status?.datePaid && (
                                    <p className="text-[9px] font-black text-brand-500 mt-1 flex items-center gap-1 uppercase italic bg-brand-500/10 px-2 py-0.5 rounded-full w-fit border border-brand-500/20">
                                        <Check size={10} /> {new Date(status.datePaid).toLocaleDateString()}
                                    </p>
                                  )}
                              </div>
                          </div>
                          <div className="flex justify-between items-center pt-4 border-t border-white/5">
                              <div className="font-mono font-black text-white italic text-xl">₹2400</div>
                              <div className="flex gap-2">
                                  <button onClick={() => openInvoiceGenerator(p)} className="p-3 bg-brand-900 border border-white/5 text-brand-500 rounded-xl hover:text-white transition-all shadow-xl" title="Generate Invoice">
                                       <FileText size={18} />
                                  </button>
                                  {statusVal !== 'PAID' && (
                                      <button onClick={() => updateStatus(p.id, 'PAID')} className="p-3 bg-brand-900 border border-lime/20 text-lime rounded-xl hover:bg-lime hover:text-brand-950 transition-all shadow-xl"><Check size={18} /></button>
                                  )}
                                  {statusVal !== 'OVERDUE' && (
                                      <button onClick={() => updateStatus(p.id, 'OVERDUE')} className="p-3 bg-brand-900 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-xl"><AlertCircle size={18} /></button>
                                  )}
                              </div>
                          </div>
                      </div>
                  )
              })}
              {filteredPlayers.length === 0 && <div className="text-center text-brand-700 font-black uppercase tracking-widest py-10 italic">No operatives detected.</div>}
           </div>
           
            {/* Desktop Table View */}
            <div className="bg-white rounded-[3rem] border border-brand-100 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-brand-50/50 border-y border-brand-100">
                            <tr className="font-display italic">
                                <th className="px-10 py-8 text-[12px] font-black text-brand-950 uppercase tracking-[0.2em] leading-none">Athlete Profile</th>
                                <th className="px-10 py-8 text-[12px] font-black text-brand-950 uppercase tracking-[0.2em] leading-none">Internal ID</th>
                                <th className="px-10 py-8 text-[12px] font-black text-brand-950 uppercase tracking-[0.2em] leading-none">Monthly Quota</th>
                                <th className="px-10 py-8 text-[12px] font-black text-brand-950 uppercase tracking-[0.2em] leading-none text-center">Collection Protocol</th>
                                <th className="px-10 py-8 text-[12px] font-black text-brand-950 uppercase tracking-[0.2em] leading-none text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-50">
                            {filteredPlayers.map(p => {
                                const status = getStatus(p.id);
                                const statusVal = status?.status || 'PENDING';
                                
                                return (
                                    <tr key={p.id} className="group hover:bg-brand-50/50 transition-all">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-6">
                                                <img src={p.photoUrl} className="w-14 h-14 rounded-2xl bg-brand-50 object-cover border-2 border-brand-500/20 group-hover:border-brand-500 transition-all shadow-lg" />
                                                <div>
                                                   <span className="font-black text-brand-950 italic text-lg uppercase tracking-tight block leading-none mb-1">{p.fullName}</span>
                                                   {status?.datePaid && (
                                                       <div className="inline-flex px-2 py-0.5 bg-brand-500/10 text-[9px] font-black text-brand-500 uppercase tracking-widest rounded-md border border-brand-500/20">
                                                           SECURED: {new Date(status.datePaid).toLocaleDateString()}
                                                       </div>
                                                   )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-brand-950 font-black text-[11px] uppercase tracking-widest italic opacity-40">{p.memberId}</td>
                                        <td className="px-10 py-8 font-mono font-black text-brand-950 italic text-2xl tracking-tighter">₹2400</td>
                                        <td className="px-10 py-8 text-center">
                                            <div className={`inline-flex px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border italic shadow-sm transition-all ${
                                                statusVal === 'PAID' ? 'bg-brand-500 text-brand-950 border-brand-500' : 
                                                statusVal === 'OVERDUE' ? 'bg-red-600 text-white border-red-600' : 
                                                'bg-brand-950 text-brand-500 border-white/10'
                                            }`}>
                                                {statusVal === 'PAID' ? 'CLEARANCE GRANTED' : statusVal === 'OVERDUE' ? 'PROTOCOL BREACH' : 'PENDING SYNC'}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex items-center justify-end gap-3 transition-all">
                                                <button 
                                                    onClick={() => openInvoiceGenerator(p)} 
                                                    className="w-12 h-12 flex items-center justify-center bg-brand-50 text-brand-950 rounded-2xl hover:bg-brand-950 hover:text-brand-500 transition-all shadow-xl active:scale-95 border border-brand-100 group/btn"
                                                    title="Generate Receipt"
                                                >
                                                    <FileText size={20} className="group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                                {statusVal !== 'PAID' && (
                                                    <button 
                                                        onClick={() => updateStatus(p.id, 'PAID')} 
                                                        className="w-12 h-12 flex items-center justify-center bg-brand-500 text-brand-950 rounded-2xl hover:bg-brand-950 hover:text-brand-500 transition-all shadow-xl active:scale-95 border border-brand-500/20 group/btn"
                                                        title="Approve Settlement"
                                                    >
                                                        <Check size={20} className="group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                )}
                                                {statusVal !== 'OVERDUE' && (
                                                    <button 
                                                        onClick={() => updateStatus(p.id, 'OVERDUE')} 
                                                        className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-600 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-95 border border-red-100 group/btn"
                                                        title="Mark Breakdown"
                                                    >
                                                        <AlertCircle size={20} className="group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
         </>
       ) : (
         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-[800px] relative">
            <div className="absolute inset-0 flex flex-col">
                <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-700">
                        <AlertCircle size={18} />
                        <span className="text-sm font-medium">Integrating your external Invoice Generator App</span>
                    </div>
                    <p className="text-xs text-blue-600 italic">Open in new tab if needed for full features</p>
                </div>
                <iframe 
                    src="https://your-invoice-app-url.run.app" 
                    className="w-full h-full border-none"
                    title="Invoice Generator"
                    allow="camera; microphone; geolocation"
                />
            </div>
         </div>
       )}

        {/* Invoice Generator Modal */}
        {isInvoiceModalOpen && selectedPlayerForInvoice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/90 backdrop-blur-xl animate-in fade-in">
                <div className="bg-brand-900 rounded-[3rem] shadow-3xl w-full max-w-6xl h-[95vh] flex flex-col md:flex-row overflow-hidden border border-white/10">
                    
                    {/* Left Panel: Controls */}
                    <div className="w-full md:w-1/3 bg-brand-950 p-10 border-r border-white/5 overflow-y-auto">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">INVOICE <span className="text-brand-500">CORE</span></h3>
                            <button onClick={() => setInvoiceModalOpen(false)} className="p-2 hover:bg-brand-500/10 rounded-full text-brand-500 transition-colors"><X size={24} /></button>
                        </div>
                        
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Serial Number</label>
                                <input 
                                    type="text" 
                                    value={invoiceForm.invoiceNo} 
                                    onChange={e => setInvoiceForm({...invoiceForm, invoiceNo: e.target.value})}
                                    className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none font-mono text-sm text-white font-black italic"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Issuance Cycle</label>
                                <input 
                                    type="date" 
                                    value={invoiceForm.date} 
                                    onChange={e => setInvoiceForm({...invoiceForm, date: e.target.value})}
                                    className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-black text-white italic uppercase"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Access Valid Until</label>
                                <input 
                                    type="date" 
                                    value={invoiceForm.validTill} 
                                    onChange={e => setInvoiceForm({...invoiceForm, validTill: e.target.value})}
                                    className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-black text-white italic uppercase"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                                     <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Quota (₹)</label>
                                     <input 
                                         type="number" 
                                         value={invoiceForm.amount} 
                                         onChange={e => setInvoiceForm({...invoiceForm, amount: parseInt(e.target.value)})}
                                         className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-black text-lime italic"
                                     />
                                 </div>
                                 <div className="space-y-2">
                                     <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Channel</label>
                                     <select 
                                         value={invoiceForm.paymentMode} 
                                         onChange={e => setInvoiceForm({...invoiceForm, paymentMode: e.target.value as any})}
                                         className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-black text-brand-500 italic bg-brand-950"
                                     >
                                         <option value="Cash">Cash</option>
                                         <option value="UPI">UPI Sync</option>
                                         <option value="Bank Transfer">Bank Intel</option>
                                         <option value="Card">Terminal Credit</option>
                                     </select>
                                 </div>
                            </div>
                        </div>

                        <div className="mt-12 space-y-4">
                            <button 
                                 onClick={handleSubmitInvoice}
                                 disabled={isSubmitting}
                                 className="w-full py-5 bg-brand-500 text-brand-950 font-black rounded-2xl shadow-xl shadow-brand-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm italic disabled:opacity-70 disabled:cursor-not-allowed group"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={20} className="group-hover:translate-x-1 transition-transform" />}
                                {isSubmitting ? 'SYNCING DATA...' : 'TRANSMIT CLEARANCE'}
                            </button>
                            
                            <button 
                                 onClick={handleDownloadPDF}
                                 className="w-full py-5 bg-brand-500/10 border border-brand-500/30 text-brand-500 font-black rounded-2xl hover:bg-brand-500/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm italic backdrop-blur-md shadow-xl"
                            >
                                <Download size={20} />
                                ARCHIVE PDF
                            </button>

                            <p className="text-[9px] text-center text-brand-700 font-black uppercase tracking-widest mt-6 italic">This will grant clearance and sync data to the operative's hub.</p>
                        </div>
                    </div>

                    {/* Right Panel: Live Preview */}
                    <div className="w-full md:w-2/3 bg-brand-900 p-10 overflow-y-auto flex items-center justify-center">
                        <div ref={invoiceRef} className="bg-white w-full max-w-[700px] min-h-[900px] shadow-2xl relative text-gray-900 overflow-hidden">
                            
                            {invoiceTemplate ? (
                                <div className="relative w-full h-full min-h-[900px]">
                                    <img src={invoiceTemplate} className="absolute inset-0 w-full h-full object-contain" referrerPolicy="no-referrer" />
                                    
                                    {/* Overlay Data on Template */}
                                    <div className="absolute inset-0 p-10 pointer-events-none font-sans text-gray-900">
                                        {/* Invoice Metadata */}
                                        <div className="absolute top-[18%] right-[8%] text-right space-y-1">
                                            <p className="text-xs font-bold uppercase text-gray-500">Invoice No</p>
                                            <p className="text-sm font-black">{invoiceForm.invoiceNo.replace('INV-', '')}</p>
                                            <p className="text-xs font-bold uppercase text-gray-500 mt-2">Date</p>
                                            <p className="text-sm font-black">{new Date(invoiceForm.date).toLocaleDateString('en-GB')}</p>
                                        </div>

                                        {/* Billed To Section */}
                                        <div className="absolute top-[32%] left-[10%] space-y-1">
                                            <p className="text-xs font-black uppercase text-gray-400 tracking-widest mb-1">Billed To</p>
                                            <p className="font-black text-xl leading-tight">{selectedPlayerForInvoice.fullName}</p>
                                            <p className="text-sm font-bold text-gray-600">Parent: {selectedPlayerForInvoice.parentName}</p>
                                            <p className="text-xs font-medium text-gray-500">{selectedPlayerForInvoice.contactNumber}</p>
                                        </div>

                                        {/* Program Details */}
                                        <div className="absolute top-[48%] left-[10%] space-y-1">
                                            <p className="text-xs font-black uppercase text-gray-400 tracking-widest mb-1">Program Details</p>
                                            <p className="text-sm font-bold">Monthly Elite Training</p>
                                            <p className="text-xs font-medium text-gray-600">Location: Playall, Gaur City Sports Complex</p>
                                        </div>

                                        {/* Payment Table Breakdown */}
                                        <div className="absolute top-[65%] left-[10%] right-[10%]">
                                            <div className="flex justify-between py-2 border-b border-gray-100">
                                                <span className="text-xs font-bold text-gray-500 uppercase">Coaching Fee</span>
                                                <span className="text-sm font-black">₹ {taxes.base}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-gray-100">
                                                <span className="text-xs font-bold text-gray-500 uppercase">GST (18%)</span>
                                                <span className="text-sm font-black">₹ {taxes.cgst + taxes.sgst}</span>
                                            </div>
                                            <div className="flex justify-between py-3 border-b-2 border-gray-900">
                                                <span className="text-sm font-black uppercase">Total Amount</span>
                                                <span className="text-xl font-black">₹ {taxes.total}</span>
                                            </div>
                                            <p className="text-[10px] font-bold italic text-gray-400 mt-2 text-right uppercase tracking-wider">
                                                {numberToWords(taxes.total)}
                                            </p>
                                        </div>

                                        {/* Footer Info */}
                                        <div className="absolute bottom-[12%] left-[10%] flex gap-8">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Mode</p>
                                                <p className="text-xs font-bold">{invoiceForm.paymentMode}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valid Until</p>
                                                <p className="text-xs font-bold">{new Date(invoiceForm.validTill).toLocaleDateString('en-GB')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* HEADER WITH SLANTED BLACK SHAPE */}
                            <div className="relative h-40 w-full bg-gray-200">
                                 {/* Left Side: Logo */}
                                 <div className="absolute top-0 left-0 h-full w-2/5 pl-8 flex items-center z-10">
                                     <div className="flex flex-col">
                                         {settings.logoUrl && <img src={settings.logoUrl} className="h-16 object-contain mb-2" />}
                                         <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900 leading-none" style={{ fontFamily: settings.fontFamily }}>
                                             {settings.name}
                                         </h1>
                                     </div>
                                 </div>

                                 {/* Right Side: Slanted Black Background */}
                                 <div className="absolute top-0 right-0 h-full w-[65%] bg-black text-white" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }}>
                                     <div className="h-full flex flex-col justify-center items-start pl-24 space-y-2 text-[11px] font-medium">
                                         <div className="flex items-center gap-3">
                                             <Phone size={14} className="text-white" />
                                             <span>+91 9259418625</span>
                                         </div>
                                         <div className="flex items-center gap-3">
                                             <Phone size={14} className="text-white" />
                                             <span>+91 9259418625</span>
                                         </div>
                                         <div className="flex items-center gap-3">
                                             <MapPin size={14} className="text-white" />
                                             <span className="max-w-[200px] leading-tight">Sector 13/868, Vasundhara, Ghaziabad, Uttar Pradesh - 201012</span>
                                         </div>
                                         <div className="flex items-center gap-3">
                                             <Mail size={14} className="text-white" />
                                             <span>support@academyportal.com</span>
                                         </div>
                                         <div className="flex items-center gap-3">
                                             <Globe size={14} className="text-white" />
                                             <span>www.academyportal.com</span>
                                         </div>
                                     </div>
                                 </div>
                            </div>

                            <div className="px-10 py-8">
                                 {/* TITLE ROW */}
                                 <div className="flex justify-between items-start mb-8">
                                     <h2 className="text-2xl font-bold uppercase tracking-wide text-gray-800">Payment Receipt</h2>
                                     <div className="text-right">
                                         <p className="text-sm font-bold text-gray-800">GSTIN : 09AAHCI6679R1ZD</p>
                                         <p className="text-sm text-gray-600 mt-1">Invoice Number: {invoiceForm.invoiceNo.replace('INV-', '')}</p>
                                         <p className="text-sm text-gray-600">Date: {new Date(invoiceForm.date).toLocaleDateString('en-GB')}</p>
                                     </div>
                                 </div>

                                 {/* DIVIDER */}
                                 <div className="h-1.5 bg-gray-400 w-full mb-6"></div>

                                 {/* BILLED TO */}
                                 <div className="mb-6">
                                     <h3 className="text-lg font-bold text-gray-900 mb-2">Billed To:</h3>
                                     <ul className="text-sm text-gray-800 space-y-1 ml-4 list-disc pl-2">
                                         <li><span className="font-bold">Name:</span> {selectedPlayerForInvoice.parentName}</li>
                                         <li><span className="font-bold">Player Name:</span> {selectedPlayerForInvoice.fullName}</li>
                                         <li><span className="font-bold">Phone Number:</span> {selectedPlayerForInvoice.contactNumber}</li>
                                         {selectedPlayerForInvoice.address && (
                                             <li><span className="font-bold">Address:</span> {selectedPlayerForInvoice.address}</li>
                                         )}
                                     </ul>
                                 </div>

                                 {/* DIVIDER */}
                                 <div className="h-1.5 bg-gray-400 w-full mb-6"></div>

                                 {/* PROGRAM DETAILS */}
                                 <div className="mb-6">
                                     <h3 className="text-lg font-bold text-gray-900 mb-2">Program Details:</h3>
                                     <ul className="text-sm text-gray-800 space-y-1 ml-4 list-disc pl-2">
                                         <li><span className="font-bold">Program Enrolled:</span> Monthly Elite Training</li>
                                         <li><span className="font-bold">Training Location:</span> Playall, Gaur City Sports Complex, Noida</li>
                                         <li><span className="font-bold">Training Days:</span> Monday To Friday</li>
                                         <li><span className="font-bold">Coach:</span> Aditya Anand</li>
                                     </ul>
                                 </div>

                                 {/* DIVIDER */}
                                 <div className="h-1.5 bg-gray-400 w-full mb-6"></div>

                                 {/* PAYMENT INFO TABLE */}
                                 <h3 className="text-lg font-bold text-gray-900 mb-3">Payment Information</h3>
                                 <div className="mb-6 border-2 border-black">
                                     <div className="flex border-b border-black">
                                         <div className="w-1/2 p-2 font-bold border-r border-black pl-4">COACHING FEE</div>
                                         <div className="w-1/2 p-2 font-bold text-center">₹ {taxes.base}</div>
                                     </div>
                                     <div className="flex border-b border-black">
                                         <div className="w-1/2 p-2 font-bold border-r border-black pl-4">CGST @ 9%</div>
                                         <div className="w-1/2 p-2 font-bold text-center">₹ {taxes.cgst}</div>
                                     </div>
                                     <div className="flex border-b border-black">
                                         <div className="w-1/2 p-2 font-bold border-r border-black pl-4">SGST @ 9%</div>
                                         <div className="w-1/2 p-2 font-bold text-center">₹ {taxes.sgst}</div>
                                     </div>
                                     <div className="flex bg-white">
                                         <div className="w-1/2 p-3 font-bold border-r border-black pl-4 text-lg">TOTAL AMOUNT</div>
                                         <div className="w-1/2 p-3 font-bold text-center text-lg">₹ {taxes.total}</div>
                                     </div>
                                 </div>

                                 <div className="text-sm font-bold text-gray-800 mb-4 ml-2">
                                     <p>• Payment Mode: {invoiceForm.paymentMode}</p>
                                     <p>• Payment Date: {new Date(invoiceForm.date).toLocaleDateString('en-GB')}</p>
                                     <p>• Fee Valid Until: {new Date(invoiceForm.validTill).toLocaleDateString('en-GB')}</p>
                                 </div>

                                 <div className="mb-8">
                                     <p className="font-bold text-gray-900 border-b-2 border-gray-400 pb-1 text-sm">
                                         Total Amount Received: <span className="font-normal">{numberToWords(taxes.total)}</span>
                                     </p>
                                 </div>

                                 <div className="mb-12">
                                     <p className="font-bold text-sm text-gray-800">Thank You For Choosing {settings.name}. We look forward to helping you achieve your football goals!</p>
                                 </div>

                                 {/* SIGNATURE */}
                                 <div className="text-sm font-bold text-gray-900">
                                     <p>Authorized By:</p>
                                     <p>Academy Director</p>
                                     <p>{settings.name}</p>
                                     <div className="mt-2 w-48 border-b border-black">
                                          <div className="h-10">
                                              <span className="font-calendary text-3xl ml-4 opacity-70" style={{fontFamily: 'cursive'}}>AbhiB</span>
                                          </div>
                                     </div>
                                     <p className="mt-1">Signature:</p>
                                 </div>
                            </div>

                            {/* BOTTOM CURVE */}
                            <div className="absolute bottom-0 left-0 w-full h-12 bg-gray-300" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0)' }}></div>
                            </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
