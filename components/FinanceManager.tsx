
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
    const [players, setPlayers] = useState<Player[]>([]);
    const [fees, setFees] = useState<FeeRecord[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedVenue, setSelectedVenue] = useState('All');
    const [feeStatusFilter, setFeeStatusFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
    const [invoiceTemplate, setInvoiceTemplate] = useState<string | null>(localStorage.getItem('icarus_invoice_template'));

    // Invoice State
    const [isInvoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [selectedPlayerForInvoice, setSelectedPlayerForInvoice] = useState<Player | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null);
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [invoiceForm, setInvoiceForm] = useState({
        invoiceNo: '',
        date: new Date().toISOString().split('T')[0],
        amount: 24000, // Default amount in Rupees
        paymentMode: 'UPI' as 'Cash' | 'UPI' | 'Bank Transfer' | 'Card',
        validTill: '',
    });

    // Mobile Scaling Logic (v18)
    const [previewScale, setPreviewScale] = useState(1);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateScale = () => {
            if (!previewContainerRef.current) return;
            const availableWidth = previewContainerRef.current.clientWidth - 48;
            const scale = Math.min(1, availableWidth / 595);
            setPreviewScale(scale);
        };

        if (isInvoiceModalOpen) {
            const timer = setTimeout(updateScale, 100);
            window.addEventListener('resize', updateScale);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateScale);
            };
        }
    }, [isInvoiceModalOpen]);

    // ── Body scroll lock (iOS-safe) ────────────────────────────────────────
    // Prevents the background page from scrolling while the invoice modal is open.
    useEffect(() => {
        if (!isInvoiceModalOpen) return;
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflowY = 'scroll'; // keep scrollbar width so layout doesn't shift
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflowY = '';
            window.scrollTo(0, scrollY);
        };
    }, [isInvoiceModalOpen]);

    const loadData = () => {
        setPlayers(StorageService.getPlayers());
        setFees(StorageService.getFees());
        setVenues(StorageService.getVenues());
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
            amount: existing ? existing.amount : 24000,
            datePaid: status === 'PAID' ? new Date().toISOString() : undefined
        };
        StorageService.updateFee(record);
    };

    const getDaysRemaining = (statusRecord?: any) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let targetDate;
        
        if (statusRecord && statusRecord.status === 'PAID') {
            // Next payment is 6 months from the paid date
            const paidDate = statusRecord.datePaid ? new Date(statusRecord.datePaid) : new Date();
            paidDate.setHours(0, 0, 0, 0);
            
            targetDate = new Date(paidDate);
            targetDate.setMonth(targetDate.getMonth() + 6);
        } else {
            const [year, m] = month.split('-').map(Number);
            // Deadline is last day of the selected month
            targetDate = new Date(year, m, 0); // Month is 1-indexed for '0' hack
            targetDate.setHours(23, 59, 59, 999);
        }
        
        const diff = targetDate.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
            amount: existing?.amount || 24000,
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
        return {
            base: total,
            cgst: 0,
            sgst: 0,
            total: total
        };
    };

    const filteredPlayers = players.filter(p => {
        const matchesSearch = p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             p.memberId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesVenue = selectedVenue === 'All' || p.venue === selectedVenue;
        
        const status = getStatus(p.id);
        const statusVal = status?.status || 'PENDING';
        let matchesStatus = true;
        if (feeStatusFilter === 'Pending') {
            matchesStatus = statusVal === 'PENDING' || statusVal === 'OVERDUE';
        } else if (feeStatusFilter === 'Paid') {
            matchesStatus = statusVal === 'PAID';
        }

        return matchesSearch && matchesVenue && matchesStatus;
    });

    const totalDue = filteredPlayers.length * 24000;
    const totalCollected = filteredPlayers.reduce((sum, p) => {
        const rec = getStatus(p.id);
        return sum + (rec?.status === 'PAID' ? (rec.amount || 24000) : 0);
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
            {/* Student Search & Stats */}
            <div className="flex flex-col space-y-8">
                <>
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-brand-950/40 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700"><DollarSign size={120} className="text-white" /></div>
                        <div className="relative z-10 space-y-2">
                            <h2 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter leading-none">
                                FINANCE <span className="text-brand-primary font-black">DECK</span>
                            </h2>
                            <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em] italic pt-2">Revenue Tracking // Transaction Records</p>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 relative z-10 w-full lg:w-auto">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest italic ml-1">Payment Status</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary" />
                                    <select
                                        value={feeStatusFilter}
                                        onChange={e => setFeeStatusFilter(e.target.value)}
                                        className="w-full pl-12 pr-10 py-4 bg-brand-950 border border-white/10 rounded-2xl outline-none text-white font-black italic text-[10px] uppercase tracking-[0.2em] appearance-none cursor-pointer shadow-xl hover:border-brand-primary/40 transition-all focus:ring-4 focus:ring-brand-primary/10"
                                    >
                                        <option value="All" className="bg-brand-950 text-white">All Statuses</option>
                                        <option value="Pending" className="bg-brand-950 text-white">Pending / Overdue</option>
                                        <option value="Paid" className="bg-brand-950 text-white">Fees Paid</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest italic ml-1">Training Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary" />
                                    <select
                                        value={selectedVenue}
                                        onChange={e => setSelectedVenue(e.target.value)}
                                        className="w-full pl-12 pr-10 py-4 bg-brand-950 border border-white/10 rounded-2xl outline-none text-white font-black italic text-[10px] uppercase tracking-[0.2em] appearance-none cursor-pointer shadow-xl hover:border-brand-primary/40 transition-all focus:ring-4 focus:ring-brand-primary/10"
                                    >
                                        <option value="All" className="bg-brand-950 text-white">All Locations</option>
                                        {venues.map(v => (
                                            <option key={v.id} value={v.name} className="bg-brand-950 text-white">{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-white/[0.03] backdrop-blur-md px-8 py-5 rounded-[2rem] border border-white/10 flex flex-row items-center justify-between gap-6 w-full sm:w-auto shadow-xl">
                                <div>
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1 italic">COLLECTED DATA</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-brand-primary italic">₹{totalCollected}</span>
                                        <span className="text-[10px] font-bold text-white/20">/ ₹{totalDue}</span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shadow-glow-sm">
                                    <Trophy size={20} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-primary transition-colors w-5 h-5" />
                        <input
                            placeholder="SEARCH_STUDENT_ATHLETES_..."
                            className="w-full pl-16 pr-8 py-5 bg-white/[0.03] border border-white/10 rounded-[2rem] shadow-2xl focus:border-brand-primary outline-none transition-all font-black text-xs text-white placeholder:text-white/20 italic tracking-[0.2em] backdrop-blur-xl"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Unified Responsive Card Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredPlayers.map(p => {
                            const status = getStatus(p.id);
                            const statusVal = status?.status || 'PENDING';
                            const daysLeft = getDaysRemaining(status);
                            const isDueSoon = statusVal !== 'PAID' && statusVal !== 'OVERDUE' && daysLeft > 0 && daysLeft <= 15;
                            const isOverdue = statusVal === 'OVERDUE' || (statusVal !== 'PAID' && daysLeft <= 0);

                            // Card border tint per status
                            const cardBorder = statusVal === 'PAID'
                                ? '!border-brand-primary/25 hover:!border-brand-primary/50'
                                : isOverdue
                                ? '!border-red-500/25 hover:!border-red-500/50'
                                : isDueSoon
                                ? '!border-orange-500/25 hover:!border-orange-500/50'
                                : 'hover:!border-brand-primary/40 focus-within:!border-brand-primary/40';

                            // LED dot colours
                            const dotColor = statusVal === 'PAID'
                                ? 'bg-brand-primary shadow-[0_0_7px_3px_rgba(195,246,41,0.65)]'
                                : isOverdue
                                ? 'bg-red-500 shadow-[0_0_7px_3px_rgba(239,68,68,0.65)]'
                                : isDueSoon
                                ? 'bg-orange-400 shadow-[0_0_7px_3px_rgba(251,146,60,0.65)]'
                                : 'bg-white/20 shadow-none';

                            return (
                                <div key={p.id} className={`glass-card p-6 !rounded-[2.5rem] relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 ${cardBorder}`}>

                                    {/* ── LED status dot (top-right) ── */}
                                    <div className="absolute top-4 right-4 z-10">
                                        <div className={`relative w-2.5 h-2.5 rounded-full ${dotColor} ${statusVal !== 'PENDING' || isDueSoon || isOverdue ? 'animate-pulse' : ''}`}>
                                            {/* inner specular highlight — light-bulb feel */}
                                            <div className="absolute top-[2px] left-[2px] w-[4px] h-[4px] rounded-full bg-white/70" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-5 mb-6">
                                        <div className="relative">
                                            <img src={p.photoUrl} className="w-16 h-16 rounded-2xl bg-brand-950 object-cover border-2 border-white/10 shadow-xl group-hover:border-brand-primary/30 transition-colors" />
                                            {statusVal === 'PAID' && <div className="absolute -bottom-1 -right-1 bg-brand-primary text-brand-secondary p-1 rounded-full shadow-glow-sm"><Check size={12} strokeWidth={4} /></div>}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-black text-white italic truncate text-lg uppercase leading-none mb-1 group-hover:text-brand-primary transition-colors">{p.fullName}</h3>
                                            <p className="text-[10px] text-white/40 font-black tracking-[0.2em] uppercase truncate mb-3 italic">{p.memberId}</p>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                <div className="flex items-center gap-1 px-2 py-1 bg-white/[0.03] rounded-lg border border-white/10">
                                                    <MapPin size={10} className="text-brand-primary" />
                                                    <span className="text-[9px] font-black text-white/30 uppercase italic tracking-tighter">{p.venue || 'NOT ASSIGNED'}</span>
                                                </div>
                                                {statusVal === 'PAID' && status?.datePaid && (
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-brand-primary/10 rounded-lg border border-brand-primary/20">
                                                        <Calendar size={10} className="text-brand-primary" />
                                                        <span className="text-[9px] font-black text-brand-primary/60 uppercase italic tracking-tighter">PAID: {new Date(status.datePaid).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-white/5">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">FEES DUE</p>
                                            <p className="font-black text-white italic text-2xl tracking-tighter leading-none">₹24000</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">NEXT PAYMENT</p>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${getDaysRemaining(status) > 0 ? 'bg-brand-primary' : 'bg-red-500'} animate-pulse shadow-glow-sm`} />
                                                <p className="font-black text-white italic text-[10px] uppercase tracking-widest">
                                                    {getDaysRemaining(status) > 0 ? `${getDaysRemaining(status)} DAYS LEFT` : `${Math.abs(getDaysRemaining(status))} OVERDUE`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-2">
                                        <button 
                                            onClick={() => openInvoiceGenerator(p)} 
                                            className="flex-1 h-12 bg-white/[0.03] flex items-center justify-center gap-3 rounded-2xl shadow-xl active:scale-95 transition-all text-white group/inv border border-white/10 hover:bg-white/10 hover:border-brand-primary/30"
                                            title="Generate Invoice"
                                        >
                                            <FileText size={18} className="text-brand-primary group-hover/inv:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black uppercase tracking-widest italic">INVOICE</span>
                                        </button>
                                        {statusVal !== 'PAID' && (
                                            <button 
                                                onClick={() => setConfirmPaymentId(p.id)}
                                                className="w-12 h-12 bg-gradient-to-br from-brand-primary to-[#A3D900] text-brand-secondary rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-primary/20 group/btn border border-white/10"
                                                title="Mark as Paid"
                                            >
                                                <Check size={20} strokeWidth={4} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {filteredPlayers.length === 0 && <div className="col-span-full text-center text-white/60 font-black uppercase tracking-widest py-10 italic">No players detected.</div>}
                    </div>
                </>
            </div>


            {/* Invoice Generator Modal */}
            {isInvoiceModalOpen && selectedPlayerForInvoice && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-950/90 backdrop-blur-xl animate-in fade-in">
                    {/* On mobile: the whole sheet scrolls (overflow-y-auto + overscroll-y-contain stops scroll bleeding to body).
                        On desktop (md+): height is fixed at 95dvh and each panel scrolls independently. */}
                    <div
                        className="bg-brand-900 rounded-t-[2.5rem] sm:rounded-[3rem] shadow-3xl w-full max-w-6xl flex flex-col md:flex-row overflow-y-auto overscroll-y-contain md:overflow-hidden border border-white/10"
                        style={{maxHeight: '95dvh'}}
                    >

                         {/* Control Panel: full-width on mobile, sidebar on desktop */}
                        <div className="w-full md:w-1/3 bg-brand-950 p-6 sm:p-10 border-b md:border-b-0 md:border-r border-white/10 md:overflow-y-auto flex-shrink-0">
                            <div className="flex items-center justify-between mb-6 sm:mb-10">
                                <h3 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tighter">INVOICE <span className="text-brand-primary">GEN</span></h3>
                                <button onClick={() => setInvoiceModalOpen(false)} className="p-3 hover:bg-white/5 rounded-2xl text-white/40 hover:text-brand-primary transition-all border border-transparent hover:border-white/10"><X size={22} /></button>
                            </div>

                            <div className="space-y-5 sm:space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic ml-1">Invoice No</label>
                                    <input
                                        type="text"
                                        value={invoiceForm.invoiceNo}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNo: e.target.value })}
                                        className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl focus:border-brand-primary outline-none font-black text-xs text-white italic uppercase tracking-widest transition-all focus:ring-4 focus:ring-brand-primary/10"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic ml-1">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={invoiceForm.date}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                                        className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl focus:border-brand-primary outline-none font-black text-xs text-white italic uppercase tracking-widest transition-all focus:ring-4 focus:ring-brand-primary/10"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic ml-1">Valid Until</label>
                                    <input
                                        type="date"
                                        value={invoiceForm.validTill}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, validTill: e.target.value })}
                                        className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl focus:border-brand-primary outline-none font-black text-xs text-white italic uppercase tracking-widest transition-all focus:ring-4 focus:ring-brand-primary/10"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic ml-1">Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={invoiceForm.amount}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, amount: parseInt(e.target.value) })}
                                            className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl focus:border-brand-primary outline-none font-black text-xs text-brand-primary italic uppercase tracking-widest transition-all focus:ring-4 focus:ring-brand-primary/10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic ml-1">Payment Mode</label>
                                        <select
                                            value={invoiceForm.paymentMode}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, paymentMode: e.target.value as any })}
                                            className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl focus:border-brand-primary outline-none font-black text-xs text-brand-primary italic uppercase tracking-widest bg-brand-950 transition-all focus:ring-4 focus:ring-brand-primary/10"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="UPI">UPI Payment</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Card">Credit Card</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 sm:mt-12 space-y-4">
                                <button
                                    onClick={handleSubmitInvoice}
                                    disabled={isSubmitting}
                                    className="w-full py-5 bg-gradient-to-br from-brand-primary to-[#A3D900] text-brand-secondary font-black rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm italic disabled:opacity-70 disabled:cursor-not-allowed group border border-white/10"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={20} className="group-hover:translate-x-1 transition-transform" />}
                                    {isSubmitting ? 'SENDING...' : 'GENERATE RECEIPT'}
                                </button>

                                <button
                                    onClick={handleDownloadPDF}
                                    className="w-full py-5 bg-white/[0.03] border border-white/10 text-white font-black rounded-2xl hover:bg-white/10 hover:border-brand-primary/30 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm italic backdrop-blur-md shadow-xl active:scale-95"
                                >
                                    <Download size={20} className="text-brand-primary" />
                                    DOWNLOAD PDF
                                </button>

                                <p className="text-[9px] text-center text-white/20 font-black uppercase tracking-widest mt-6 italic">This will mark as paid and sync data to the player's dashboard.</p>
                            </div>
                        </div>

                        {/* Right Panel: Live Preview — on mobile the outer container scrolls,
                             on desktop (md+) this panel gets its own scroll. */}
                        <div
                            ref={previewContainerRef}
                            className="w-full md:w-2/3 bg-brand-900 p-6 md:overflow-y-auto flex items-start justify-center"
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
                                    <div style={{ position: 'absolute', inset: 0, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10.5px', color: '#111', pointerEvents: 'none', zIndex: 10 }}>

                                        {/* ── HEADER BOX (Top Right) ────────────────── */}
                                        <span style={{ position: 'absolute', top: '141px', left: '412px', fontWeight: 800, color: '#111' }}>
                                            {invoiceForm.invoiceNo.replace('INV-', '')}
                                        </span>

                                        <span style={{ position: 'absolute', top: '141px', left: '504px', fontWeight: 800, color: '#111' }}>
                                            {invoiceForm.date ? new Date(invoiceForm.date).toLocaleDateString('en-GB') : ''}
                                        </span>

                                        {/* BILLED TO section - Corrected Data Mapping */}
                                        <span style={{ position: 'absolute', top: '228px', left: '120px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.parentName || ''}
                                        </span>
                                        <span style={{ position: 'absolute', top: '228px', left: '331px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.email || ''}
                                        </span>

                                        <span style={{ position: 'absolute', top: '253px', left: '120px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.fullName || ''}
                                        </span>
                                        <span style={{ position: 'absolute', top: '253px', left: '331px', fontWeight: 700, maxWidth: '240px', lineHeight: '1.2' }}>
                                            {invoiceForm.address || selectedPlayerForInvoice.address || ''}
                                        </span>

                                        <span style={{ position: 'absolute', top: '279px', left: '120px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.contactNumber?.startsWith('+') 
                                                ? selectedPlayerForInvoice.contactNumber 
                                                : selectedPlayerForInvoice.contactNumber ? `+91 ${selectedPlayerForInvoice.contactNumber}` : ''}
                                        </span>

                                        {/* ── PROGRAM DETAILS SECTION ──────────────── */}
                                        <span style={{ position: 'absolute', top: '362px', left: '125px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.program || 'Monthly Elite Training'}
                                        </span>
                                        <span style={{ position: 'absolute', top: '362px', left: '335px', fontWeight: 700 }}>
                                            Mon – Fri
                                        </span>

                                        <span style={{ position: 'absolute', top: '388px', left: '125px', fontWeight: 700, maxWidth: '210px' }}>
                                            {selectedPlayerForInvoice.venue || 'Gaur City, Noida'}
                                        </span>
                                        <span style={{ position: 'absolute', top: '388px', left: '335px', fontWeight: 700 }}>
                                            Abhishek Begal
                                        </span>

                                        {/* ── PAYMENT TABLE ───────────────────────── */}
                                        <div style={{ position: 'absolute', top: '498px', left: '425px', width: '120px', textAlign: 'left', fontWeight: 700 }}>
                                            ₹ {taxes.base}
                                        </div>
                                        <div style={{ position: 'absolute', top: '524px', left: '425px', width: '120px', textAlign: 'left', fontWeight: 700 }}>
                                            ₹ 0
                                        </div>
                                        <div style={{ position: 'absolute', top: '550px', left: '425px', width: '120px', textAlign: 'left', fontWeight: 700 }}>
                                            ₹ 0
                                        </div>
                                        {/* FINAL TOTAL — flush in text row */}
                                        <div style={{ position: 'absolute', top: '576px', left: '425px', width: '120px', textAlign: 'left', fontWeight: 850, color: '#fff' }}>
                                            ₹ {taxes.total}
                                        </div>

                                        {/* ── FOOTER BOX (Metadata) ────────────────── */}
                                        <span style={{ position: 'absolute', top: '612px', left: '95px', fontWeight: 700 }}>
                                            {invoiceForm.paymentMode}
                                        </span>
                                        <span style={{ position: 'absolute', top: '612px', left: '275px', fontWeight: 700 }}>
                                            {invoiceForm.date ? new Date(invoiceForm.date).toLocaleDateString('en-GB') : ''}
                                        </span>
                                        <span style={{ position: 'absolute', top: '612px', left: '445px', fontWeight: 700 }}>
                                            {invoiceForm.validTill ? new Date(invoiceForm.validTill).toLocaleDateString('en-GB') : ''}
                                        </span>

                                        {/* AMOUNT IN WORDS */}
                                        <span style={{ position: 'absolute', top: '647px', left: '155px', fontWeight: 700, color: '#1a365d' }}>
                                            {numberToWords(invoiceForm.amount)}
                                        </span>



                                        {/* AUTHORIZED SIGNATORY SECTION (Bottom Left signatures box) */}
                                        <div style={{ position: 'absolute', top: '768px', left: '175px', textAlign: 'left' }}>
                                            <div style={{ fontWeight: 800, fontSize: '11px', color: '#111', textDecoration: 'underline' }}>
                                                ABHISHEK BEGAL
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmPaymentId && (
                <div className="fixed inset-0 bg-brand-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="glass-card p-10 max-w-sm w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-300 !rounded-[3rem] border border-white/10 text-center">
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary mb-6 shadow-glow-sm border border-brand-primary/20">
                                <Check size={40} strokeWidth={4} />
                            </div>
                            
                            <h3 className="font-black text-white text-2xl tracking-tighter uppercase italic mb-2 leading-none">Confirm <span className="text-brand-primary">Payment</span></h3>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest italic mb-8">
                                ARE YOU SURE YOU WANT TO MARK THESE FEES AS PAID? THIS ACTION CANNOT BE UNDONE.
                            </p>
                            
                            <div className="flex gap-4 w-full">
                                <button 
                                    onClick={() => setConfirmPaymentId(null)}
                                    className="flex-1 bg-white/[0.03] hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] italic py-5 rounded-2xl transition-all border border-white/10 active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => {
                                        updateStatus(confirmPaymentId, 'PAID');
                                        setConfirmPaymentId(null);
                                    }}
                                    className="flex-1 bg-gradient-to-br from-brand-primary to-[#A3D900] text-brand-secondary font-black uppercase tracking-widest text-[10px] italic py-5 rounded-2xl transition-all shadow-xl shadow-brand-primary/20 border border-white/10 active:scale-105"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
