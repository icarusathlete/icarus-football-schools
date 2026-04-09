
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
            amount: existing ? existing.amount : 2400,
            datePaid: status === 'PAID' ? new Date().toISOString() : undefined
        };
        StorageService.updateFee(record);
    };

    const getDaysRemaining = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const [year, m] = month.split('-').map(Number);
        // Deadline is last day of the selected month
        const deadline = new Date(year, m, 0); // Month is 1-indexed for '0' hack
        deadline.setHours(23, 59, 59, 999);
        
        const diff = deadline.getTime() - today.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
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
                                <label className="text-[10px] font-black text-brand-950 uppercase tracking-widest italic ml-1">Payment Status</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-950" />
                                    <select
                                        value={feeStatusFilter}
                                        onChange={e => setFeeStatusFilter(e.target.value)}
                                        className="w-full min-w-[200px] pl-12 pr-10 py-4 bg-brand-bg/50 border border-white/10 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-500 transition-all shadow-sm appearance-none"
                                    >
                                        <option value="All">All Statuses</option>
                                        <option value="Pending">Pending / Overdue</option>
                                        <option value="Paid">Fees Paid</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-brand-950 uppercase tracking-widest italic ml-1">Training Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-950" />
                                    <select
                                        value={selectedVenue}
                                        onChange={e => setSelectedVenue(e.target.value)}
                                        className="w-full min-w-[200px] pl-12 pr-10 py-4 bg-brand-bg/50 border border-white/10 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-500 transition-all shadow-sm appearance-none"
                                    >
                                        <option value="All">All Locations</option>
                                        {venues.map(v => (
                                            <option key={v.id} value={v.name}>{v.name}</option>
                                        ))}
                                    </select>
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
                                <div key={p.id} className="bg-white/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-brand-500/10 shadow-2xl relative overflow-hidden group">
                                    <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-[10px] font-black tracking-widest uppercase border-b border-l border-brand-500/10 shadow-sm ${statusVal === 'PAID' ? 'bg-lime text-brand-950 font-bold' :
                                            statusVal === 'OVERDUE' ? 'bg-red-600 text-white' :
                                                'bg-slate-100 text-slate-500'
                                        }`}>
                                        {statusVal === 'PAID' ? 'FEES PAID' : statusVal === 'OVERDUE' ? 'OVERDUE' : 'PENDING'}
                                    </div>
                                    
                                    <div className="flex items-start gap-5 mb-6 mt-4">
                                        <div className="relative">
                                            <img src={p.photoUrl} className="w-16 h-16 rounded-2xl bg-brand-900 object-cover border-2 border-brand-500/10 shadow-xl" />
                                            {statusVal === 'PAID' && <div className="absolute -bottom-1 -right-1 bg-lime text-brand-950 p-1 rounded-full shadow-glow-sm"><Check size={12} /></div>}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-black text-brand-950 italic truncate text-lg uppercase leading-none mb-1">{p.fullName}</h3>
                                            <p className="text-[10px] text-brand-950/50 font-mono tracking-widest uppercase truncate mb-3">{p.memberId}</p>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                <div className="flex items-center gap-1 px-2 py-1 bg-brand-500/5 rounded-lg border border-brand-500/5">
                                                    <MapPin size={10} className="text-brand-500" />
                                                    <span className="text-[9px] font-black text-brand-950/60 uppercase italic tracking-tighter">{p.venue || 'NOT ASSIGNED'}</span>
                                                </div>
                                                {statusVal === 'PAID' && status?.datePaid && (
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-lime/10 rounded-lg border border-lime/20">
                                                        <Calendar size={10} className="text-lime" />
                                                        <span className="text-[9px] font-black text-brand-950/60 uppercase italic tracking-tighter">PAID: {new Date(status.datePaid).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-brand-500/5">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-brand-950/40 uppercase tracking-widest italic">FEES DUE</p>
                                            <p className="font-mono font-black text-brand-950 italic text-2xl">₹2400</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[8px] font-black text-brand-950/40 uppercase tracking-widest italic">NEXT PAYMENT</p>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${getDaysRemaining() > 0 ? 'bg-lime' : 'bg-red-500'} animate-pulse`} />
                                                <p className="font-mono font-black text-brand-950 italic text-sm">
                                                    {getDaysRemaining() > 0 ? `${getDaysRemaining()} Days Left` : `${Math.abs(getDaysRemaining())} Overdue`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-2">
                                        <button 
                                            onClick={() => openInvoiceGenerator(p)} 
                                            className="flex-1 h-12 bg-brand-950 flex items-center justify-center gap-3 rounded-2xl shadow-xl active:scale-95 transition-all text-white group"
                                            title="Generate Invoice"
                                        >
                                            <FileText size={18} className="text-brand-500 group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black uppercase tracking-widest italic">INVOICE</span>
                                        </button>
                                        {statusVal !== 'PAID' && (
                                            <button 
                                                onClick={() => setConfirmPaymentId(p.id)}
                                                className="w-12 h-12 bg-lime border-2 border-lime text-brand-950 rounded-2xl flex items-center justify-center hover:bg-transparent hover:text-lime active:scale-95 transition-all shadow-xl shadow-lime/20 group/btn"
                                                title="Mark as Paid"
                                            >
                                                <Check size={20} strokeWidth={3} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {filteredPlayers.length === 0 && <div className="text-center text-brand-700 font-black uppercase tracking-widest py-10 italic">No players detected.</div>}
                    </div>

                    {/* Desktop Holographic List View */}
                    <div className="hidden md:flex flex-col gap-4">
                        <div className="flex items-center px-10 py-5 bg-brand-950/5 rounded-3xl border border-brand-950/10 mb-2">
                            <div className="w-[30%] text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Player Info</div>
                            <div className="w-[15%] text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Player ID</div>
                            <div className="w-[20%] text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Monthly Fees</div>
                            <div className="w-[20%] text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic text-center">Payment Status</div>
                            <div className="w-[15%] text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic text-right">Actions</div>
                        </div>

                        {filteredPlayers.map(p => {
                            const status = getStatus(p.id);
                            const statusVal = status?.status || 'PENDING';

                            return (
                                <div key={p.id} className="group flex items-center px-10 py-6 bg-white border border-brand-500/10 rounded-[2.5rem] hover:shadow-2xl hover:shadow-brand-500/5 hover:border-brand-500/30 transition-all duration-500 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-brand-500/10 transition-colors" />
                                    
                                    <div className="w-[30%] flex items-center gap-6 relative z-10">
                                        <div className="relative">
                                            <img src={p.photoUrl} className="w-16 h-16 rounded-2xl bg-brand-secondary object-cover border-2 border-brand-500/10 group-hover:border-brand-500 transition-all duration-500 shadow-xl" />
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-950 rounded-lg flex items-center justify-center border-2 border-white">
                                                <div className={`w-2 h-2 rounded-full ${statusVal === 'PAID' ? 'bg-lime animate-pulse' : 'bg-slate-400'}`} />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="font-black text-brand-950 italic text-xl uppercase tracking-tighter block leading-none mb-1 group-hover:text-brand-500 transition-colors">{p.fullName}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="px-2 py-0.5 bg-brand-950 text-[8px] font-black text-white uppercase tracking-widest rounded-md">
                                                    {p.venue || 'LOCATION UNKNOWN'}
                                                </div>
                                                {status?.datePaid && (
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                                                        PAID ON: {new Date(status.datePaid).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-[15%] relative z-10">
                                        <span className="font-mono font-black text-brand-950/40 text-[11px] uppercase tracking-widest italic bg-brand-500/5 px-3 py-1 rounded-lg border border-brand-500/5 group-hover:border-brand-500/20 transition-all">{p.memberId}</span>
                                    </div>

                                    <div className="w-[20%] relative z-10">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">MONTHLY FEES</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-mono font-black text-brand-950 italic text-2xl tracking-tighter shadow-brand-500/20">₹2400</span>
                                                <div className="flex items-center gap-1">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${getDaysRemaining() > 0 ? 'bg-lime' : 'bg-red-500'} animate-pulse`} />
                                                    <span className="text-[8px] font-black text-brand-950/40 uppercase italic">{getDaysRemaining() > 0 ? `${getDaysRemaining()} Days Left` : 'Overdue'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-[20%] text-center relative z-10">
                                        <div className={`inline-flex px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border italic shadow-sm transition-all duration-500 ${
                                            statusVal === 'PAID' 
                                                ? 'bg-lime text-brand-950 border-lime shadow-lime/20' 
                                                : statusVal === 'OVERDUE' 
                                                    ? 'bg-red-600 text-white border-red-600 shadow-red-600/20' 
                                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                                        }`}>
                                            {statusVal === 'PAID' ? 'FEES PAID' : statusVal === 'OVERDUE' ? 'OVERDUE' : 'PENDING'}
                                        </div>
                                    </div>

                                    <div className="w-[15%] text-right relative z-10">
                                        <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500">
                                            <button
                                                onClick={() => openInvoiceGenerator(p)}
                                                className="w-12 h-12 flex items-center justify-center bg-brand-950 text-white rounded-2xl hover:bg-brand-500 hover:text-brand-950 transition-all shadow-xl active:scale-95 border border-brand-500/20 group/btn"
                                                title="Generate Receipt"
                                            >
                                                <FileText size={20} className="text-brand-500 group-hover/btn:text-brand-950 group-hover/btn:scale-110 transition-all" />
                                            </button>
                                            
                                            {statusVal !== 'PAID' && (
                                                <button
                                                    onClick={() => setConfirmPaymentId(p.id)}
                                                    className="w-12 h-12 flex items-center justify-center bg-lime text-brand-950 rounded-2xl hover:bg-transparent hover:text-lime hover:border-lime transition-all shadow-xl shadow-lime/20 active:scale-95 border-2 border-lime group/btn"
                                                    title="Mark as Paid"
                                                >
                                                    <Check size={20} strokeWidth={3} className="group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="bg-brand-950 rounded-[3rem] shadow-3xl border border-white/10 overflow-hidden h-[800px] relative">
                    <div className="absolute inset-0 flex flex-col">
                        <div className="p-6 bg-brand-900 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-brand-primary">
                                <AlertCircle size={20} />
                                <span className="text-sm font-black uppercase tracking-widest italic">Invoice Integration</span>
                            </div>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest italic animate-pulse">System Connected</p>
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
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">INVOICE <span className="text-brand-500">GENERATOR</span></h3>
                                <button onClick={() => setInvoiceModalOpen(false)} className="p-2 hover:bg-brand-500/10 rounded-full text-brand-500 transition-colors"><X size={24} /></button>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Invoice No</label>
                                    <input
                                        type="text"
                                        value={invoiceForm.invoiceNo}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNo: e.target.value })}
                                        className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none font-mono text-sm text-white font-black italic"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={invoiceForm.date}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                                        className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-black text-white italic uppercase"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Valid Until</label>
                                    <input
                                        type="date"
                                        value={invoiceForm.validTill}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, validTill: e.target.value })}
                                        className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-black text-white italic uppercase"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={invoiceForm.amount}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, amount: parseInt(e.target.value) })}
                                            className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-black text-lime italic"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic ml-1">Payment Mode</label>
                                        <select
                                            value={invoiceForm.paymentMode}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, paymentMode: e.target.value as any })}
                                            className="w-full p-4 bg-brand-900 border border-white/10 rounded-2xl focus:border-brand-500 outline-none text-sm font-black text-brand-500 italic bg-brand-950"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="UPI">UPI Payment</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Card">Credit Card</option>
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
                                    {isSubmitting ? 'SENDING...' : 'GENERATE RECEIPT'}
                                </button>

                                <button
                                    onClick={handleDownloadPDF}
                                    className="w-full py-5 bg-brand-500/10 border border-brand-500/30 text-brand-500 font-black rounded-2xl hover:bg-brand-500/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm italic backdrop-blur-md shadow-xl"
                                >
                                    <Download size={20} />
                                    DOWNLOAD PDF
                                </button>

                                <p className="text-[9px] text-center text-brand-700 font-black uppercase tracking-widest mt-6 italic">This will mark as paid and sync data to the player's dashboard.</p>
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

            {/* Confirmation Modal */}
            {confirmPaymentId && (
                <div className="fixed inset-0 bg-brand-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] border border-brand-500/20 p-8 max-w-sm w-full shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-lime/10 blur-[40px] rounded-full -mr-16 -mt-16" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-500/10 blur-[40px] rounded-full -ml-16 -mb-16" />
                        
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-lime/20 rounded-full flex items-center justify-center text-lime mb-6 shadow-xl shadow-lime/20 border border-lime/30">
                                <Check size={32} strokeWidth={3} />
                            </div>
                            
                            <h3 className="font-black text-brand-950 text-xl tracking-tight uppercase italic mb-2">Confirm Payment</h3>
                            <p className="text-slate-500 text-sm font-medium mb-8">
                                Are you sure you want to mark these fees as PAID? This action cannot be undone.
                            </p>
                            
                            <div className="flex gap-4 w-full">
                                <button 
                                    onClick={() => setConfirmPaymentId(null)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => {
                                        updateStatus(confirmPaymentId, 'PAID');
                                        setConfirmPaymentId(null);
                                    }}
                                    className="flex-1 bg-lime hover:bg-lime/90 text-brand-950 font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all shadow-xl shadow-lime/20"
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
