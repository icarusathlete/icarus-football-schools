
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Player, FeeRecord, AcademySettings } from '../types';
import { Check, X, AlertCircle, DollarSign, Search, Calendar, ChevronRight, User as UserIcon, FileText, Download, Loader2, Send, Phone, MapPin, Mail, Globe, Trophy } from 'lucide-react';
import html2canvas from 'html2canvas';

import { jsPDF } from 'jspdf';

// Helper to convert number to words (Indian Currency Style)
const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

    if (num === 0) return 'Zero';
    if (isNaN(num)) return '';

    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';

    let str = '';
    str += (parseInt(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) + 'Crore ' : '';
    str += (parseInt(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'Lakh ' : '';
    str += (parseInt(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'Thousand ' : '';
    str += (parseInt(n[4]) !== 0) ? a[Number(n[4])] + 'Hundred ' : '';
    str += (parseInt(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) : '';

    return str.trim() + ' Only';
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

    // Mobile Scaling Logic (v18)
    const [previewScale, setPreviewScale] = useState(1);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateScale = () => {
            if (!previewContainerRef.current) return;
            // Get available width (subtracting padding)
            const availableWidth = previewContainerRef.current.clientWidth - 48; // p-6 is 24px each side
            const scale = Math.min(1, availableWidth / 595);
            setPreviewScale(scale);
        };

        if (isInvoiceModalOpen) {
            // Delay slightly to ensure DOM is painted
            const timer = setTimeout(updateScale, 100);
            window.addEventListener('resize', updateScale);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateScale);
            };
        }
    }, [isInvoiceModalOpen]);

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
        switch (status) {
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

                        <div className="flex flex-col md:flex-row gap-6 relative z-10 w-full lg:w-auto">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-brand-950 uppercase tracking-widest italic ml-1">Archive Month</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-950" />
                                    <input
                                        type="month"
                                        value={month}
                                        onChange={e => setMonth(e.target.value)}
                                        className="w-full pl-12 pr-6 py-4 bg-brand-bg/50 border border-white/10 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-500 transition-all font-mono shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="bg-brand-500/20 backdrop-blur-xl px-8 py-5 rounded-[2rem] border border-brand-500/40 shadow-inner flex flex-row items-center justify-between gap-6 w-full sm:w-auto">
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
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-500 transition-colors w-5 h-5" />
                        <input
                            placeholder="Search student athletes..."
                            className="w-full pl-16 pr-8 py-5 bg-brand-500/5 border border-brand-500/10 rounded-[2rem] shadow-xl focus:border-brand-500 outline-none transition-all font-black text-xs text-brand-950 placeholder:text-slate-400 italic tracking-wider backdrop-blur-xl"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Mobile Card View (Hidden on MD+) */}
                    <div className="md:hidden grid gap-6">
                        {filteredPlayers.map(p => {
                            const status = getStatus(p.id);
                            const statusVal = status?.status || 'PENDING';
                            return (
                                <div key={p.id} className="bg-brand-500/10 backdrop-blur-md p-4 rounded-3xl border border-brand-500/20 shadow-2xl relative overflow-hidden group">
                                    <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[8px] font-black tracking-widest uppercase border-b border-l border-white/10 ${statusVal === 'PAID' ? 'bg-lime text-brand-950' :
                                            statusVal === 'OVERDUE' ? 'bg-red-600 text-white' :
                                                'bg-slate-200 text-slate-600'
                                        }`}>
                                        {statusVal === 'PAID' ? 'SECURED' : statusVal === 'OVERDUE' ? 'BREACH' : 'PENDING'}
                                    </div>
                                    <div className="flex items-center gap-4 mb-4 mt-2">
                                        <img src={p.photoUrl} className="w-12 h-12 rounded-2xl bg-brand-900 object-cover border-2 border-brand-500/10" />
                                        <div className="min-w-0">
                                            <h3 className="font-black text-brand-950 italic truncate text-sm uppercase">{p.fullName}</h3>
                                            <p className="text-[9px] text-brand-900/60 font-mono tracking-widest uppercase truncate">{p.memberId}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-brand-500/10">
                                        <div className="font-mono font-black text-brand-950 italic text-lg">₹2400</div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openInvoiceGenerator(p)} className="p-2.5 bg-brand-900 border border-white/5 text-brand-500 rounded-xl hover:text-white transition-all shadow-xl" title="Generate Invoice">
                                                <FileText size={16} />
                                            </button>
                                            {statusVal !== 'PAID' && (
                                                <button onClick={() => updateStatus(p.id, 'PAID')} className="p-2.5 bg-brand-900 border border-lime/20 text-lime rounded-xl hover:bg-lime hover:text-brand-950 transition-all shadow-xl"><Check size={16} /></button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {filteredPlayers.length === 0 && <div className="text-center text-brand-700 font-black uppercase tracking-widest py-10 italic">No operatives detected.</div>}
                    </div>

                    {/* Desktop Table View */}
                    <div className="glass-card rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-y border-white/5">
                                    <tr className="font-display italic">
                                        <th className="px-10 py-8 text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Athlete Profile</th>
                                        <th className="px-10 py-8 text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Internal ID</th>
                                        <th className="px-10 py-8 text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none">Monthly Quota</th>
                                        <th className="px-10 py-8 text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-center">Collection Protocol</th>
                                        <th className="px-10 py-8 text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none text-right">Operations</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredPlayers.map(p => {
                                        const status = getStatus(p.id);
                                        const statusVal = status?.status || 'PENDING';

                                        return (
                                            <tr key={p.id} className="group hover:bg-white/5 transition-all">
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-6">
                                                        <img src={p.photoUrl} className="w-14 h-14 rounded-2xl bg-brand-secondary object-cover border-2 border-brand-500/10 group-hover:border-brand-500 transition-all shadow-lg" />
                                                        <div>
                                                            <span className="font-black text-brand-950 italic text-lg uppercase tracking-tight block leading-none mb-1">{p.fullName}</span>
                                                            {status?.datePaid && (
                                                                <div className="inline-flex px-2 py-0.5 bg-lime/10 text-[9px] font-black text-brand-950 uppercase tracking-widest rounded-md border border-lime/20">
                                                                    SECURED: {new Date(status.datePaid).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-brand-950/50 font-black text-[11px] uppercase tracking-widest italic">{p.memberId}</td>
                                                <td className="px-10 py-8 font-mono font-black text-brand-950 italic text-2xl tracking-tighter">₹2400</td>
                                                <td className="px-10 py-8 text-center">
                                                    <div className={`inline-flex px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border italic shadow-sm transition-all ${statusVal === 'PAID' ? 'bg-lime text-brand-950 border-lime' :
                                                            statusVal === 'OVERDUE' ? 'bg-red-600 text-white border-red-600' :
                                                                'bg-slate-100 text-slate-400 border-slate-200'
                                                        }`}>
                                                        {statusVal === 'PAID' ? 'CLEARANCE GRANTED' : statusVal === 'OVERDUE' ? 'PROTOCOL BREACH' : 'PENDING SYNC'}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <div className="flex items-center justify-end gap-3 transition-all">
                                                        <button
                                                            onClick={() => openInvoiceGenerator(p)}
                                                            className="w-12 h-12 flex items-center justify-center bg-white/5 text-white rounded-2xl hover:bg-brand-500 hover:text-brand-secondary transition-all shadow-xl active:scale-95 border border-white/5 group/btn"
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
                                                                className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-95 border border-red-500/20 group/btn"
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
                <div className="bg-brand-950 rounded-[3rem] shadow-3xl border border-white/10 overflow-hidden h-[800px] relative">
                    <div className="absolute inset-0 flex flex-col">
                        <div className="p-6 bg-brand-900 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-brand-primary">
                                <AlertCircle size={20} />
                                <span className="text-sm font-black uppercase tracking-widest italic">External Protocol Integration</span>
                            </div>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest italic animate-pulse">Live Link Active</p>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:pl-72 bg-brand-950/90 backdrop-blur-xl animate-in fade-in">
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
                                        onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNo: e.target.value })}
                                        className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none font-mono text-sm text-white font-black italic"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Issuance Cycle</label>
                                    <input
                                        type="date"
                                        value={invoiceForm.date}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                                        className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-black text-white italic uppercase"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Access Valid Until</label>
                                    <input
                                        type="date"
                                        value={invoiceForm.validTill}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, validTill: e.target.value })}
                                        className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-black text-white italic uppercase"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Quota (₹)</label>
                                        <input
                                            type="number"
                                            value={invoiceForm.amount}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, amount: parseInt(e.target.value) })}
                                            className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-black text-lime italic"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Channel</label>
                                        <select
                                            value={invoiceForm.paymentMode}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, paymentMode: e.target.value as any })}
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

                        {/* Right Panel: Live Preview (Responsive Scaling) */}
                        <div 
                            ref={previewContainerRef}
                            className="w-full md:w-2/3 bg-brand-900 p-6 overflow-y-auto flex items-start justify-center"
                        >
                            <div style={{ 
                                width: '595px', 
                                height: `${842 * previewScale}px`, 
                                transition: 'height 0.3s ease-out',
                                position: 'relative'
                            }}>
                                <div
                                    ref={invoiceRef}
                                    style={{ 
                                        position: 'absolute', 
                                        top: 0,
                                        left: '50%',
                                        width: '595px', 
                                        height: '842px', 
                                        flexShrink: 0, 
                                        overflow: 'hidden',
                                        transform: `scale(${previewScale})`,
                                        transformOrigin: 'top center',
                                        marginLeft: '-297.5px', // Center the 595px div
                                        transition: 'transform 0.3s ease-out'
                                    }}
                                >
                                    {/* ICARUS branded PNG background */}
                                    <img
                                        src={invoiceTemplate || "/icarus-invoice.png?v=5"}
                                        alt="Invoice Template"
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = 'icarus-invoice.png';
                                        }}
                                    />

                                    {/* Absolute-positioned data overlay (v16 GOLDILOCKS "UP AND LEFT" CALIBRATION) */}
                                    <div style={{ position: 'absolute', inset: 0, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11px', color: '#111', pointerEvents: 'none', zIndex: 10 }}>

                                        {/* ── HEADER BOX (Top Right) ────────────────── */}
                                        <span style={{ position: 'absolute', top: '141px', left: '394px', fontSize: '10px', fontWeight: 800, color: '#111' }}>
                                            {invoiceForm.invoiceNo.replace('INV-', '')}
                                        </span>

                                        <span style={{ position: 'absolute', top: '141px', left: '500px', fontSize: '9.5px', fontWeight: 800, color: '#111' }}>
                                            {invoiceForm.date ? new Date(invoiceForm.date).toLocaleDateString('en-GB') : ''}
                                        </span>

                                        {/* ── BILLED TO (Athlete Data) ─────────────────── */}
                                        <span style={{ position: 'absolute', top: '218px', left: '106px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.parentName || ''}
                                        </span>
                                        <span style={{ position: 'absolute', top: '218px', left: '331px', fontWeight: 700 }}>
                                            {(selectedPlayerForInvoice as any).email || ''}
                                        </span>

                                        <span style={{ position: 'absolute', top: '243px', left: '106px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.fullName}
                                        </span>
                                        <span style={{ position: 'absolute', top: '243px', left: '331px', fontSize: '9px', fontWeight: 700, maxWidth: '240px', lineHeight: '1.2' }}>
                                            {selectedPlayerForInvoice.address || ''}
                                        </span>

                                        <span style={{ position: 'absolute', top: '268px', left: '106px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.contactNumber || ''}
                                        </span>

                                        {/* ── PROGRAM DETAILS ────────────────────────────── */}
                                        <span style={{ position: 'absolute', top: '352px', left: '125px', fontWeight: 700 }}>
                                            Monthly Elite Training
                                        </span>
                                        <span style={{ position: 'absolute', top: '352px', left: '335px', fontWeight: 700 }}>
                                            Mon – Fri
                                        </span>

                                        <span style={{ position: 'absolute', top: '378px', left: '125px', fontSize: '9px', fontWeight: 700, maxWidth: '210px' }}>
                                            Playall, Gaur City Sports Complex, Noida
                                        </span>
                                        <span style={{ position: 'absolute', top: '378px', left: '335px', fontWeight: 700 }}>
                                            Aditya Anand
                                        </span>

                                        {/* ── PAYMENT TABLE SUMMARY ─────────────────────────── */}
                                        <span style={{ position: 'absolute', top: '500px', left: '488px', fontWeight: 800 }}>
                                            ₹ {taxes.base}
                                        </span>
                                        <span style={{ position: 'absolute', top: '526px', left: '488px', fontWeight: 800 }}>
                                            ₹ {taxes.cgst}
                                        </span>
                                        <span style={{ position: 'absolute', top: '552px', left: '488px', fontWeight: 800 }}>
                                            ₹ {taxes.sgst}
                                        </span>
                                        {/* FINAL TOTAL — flush in the dark row */}
                                        <span style={{ position: 'absolute', top: '578px', left: '488px', fontWeight: 850, color: '#fff', fontSize: '11.5px' }}>
                                            ₹ {taxes.total}
                                        </span>

                                        {/* ── FOOTER ROW ─────────────────────────────────── */}
                                        <span style={{ position: 'absolute', top: '615px', left: '105px', fontWeight: 800 }}>
                                            {invoiceForm.paymentMode}
                                        </span>
                                        <span style={{ position: 'absolute', top: '615px', left: '280px', fontWeight: 800 }}>
                                            {invoiceForm.date ? new Date(invoiceForm.date).toLocaleDateString('en-GB') : ''}
                                        </span>
                                        <span style={{ position: 'absolute', top: '615px', left: '460px', fontWeight: 800 }}>
                                            {invoiceForm.validTill ? new Date(invoiceForm.validTill).toLocaleDateString('en-GB') : ''}
                                        </span>

                                        {/* AMOUNT IN WORDS */}
                                        <span style={{ position: 'absolute', top: '645px', left: '155px', fontSize: '10px', fontWeight: 900, color: '#1a365d' }}>
                                            {numberToWords(invoiceForm.amount)}
                                        </span>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
