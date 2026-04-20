import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  requireTypeToConfirm?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  type?: 'danger' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  requireTypeToConfirm,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  type = "danger"
}) => {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireTypeToConfirm && inputValue !== requireTypeToConfirm) {
      return;
    }
    onConfirm();
    setInputValue('');
  };

  const handleCancel = () => {
    onCancel();
    setInputValue('');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className="glass-card w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/5">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#CCFF00] opacity-40" />
        
        <div className={`${type === 'danger' ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'} px-8 py-6 border-b flex items-center gap-4 relative`}>
          <div className={`p-2.5 ${type === 'danger' ? 'bg-red-500/20 text-red-500 shadow-lg shadow-red-500/20' : 'bg-[#CCFF00]/10 text-[#CCFF00] shadow-lg shadow-[#CCFF00]/20'} rounded-xl border border-white/5`}>
            <AlertTriangle size={20} />
          </div>
          <h3 className="font-black text-white uppercase tracking-tight text-lg italic font-display">{title}</h3>
          <button onClick={handleCancel} className="ml-auto p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all border border-transparent hover:border-white/10">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8">
          <p className="text-white/60 text-sm font-bold leading-relaxed mb-8 italic uppercase tracking-wider">{message}</p>
          
          {requireTypeToConfirm && (
            <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner ring-1 ring-white/5">
              <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">
                Type "{requireTypeToConfirm}" to confirm
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-sm font-black text-white placeholder:text-white/20 focus:border-[#CCFF00] outline-none transition-all shadow-sm italic uppercase tracking-widest"
                placeholder={requireTypeToConfirm}
              />
            </div>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-black uppercase tracking-[0.15em] text-[10px] rounded-[1.5rem] transition-all border border-white/10 shadow-sm italic"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={requireTypeToConfirm ? inputValue !== requireTypeToConfirm : false}
              className={`flex-1 py-4 px-6 font-black uppercase tracking-[0.15em] text-[10px] rounded-[1.5rem] transition-all shadow-xl transform active:scale-95 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed italic ${
                type === 'danger' 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30' 
                  : 'bg-[#CCFF00] hover:scale-[1.02] text-brand-950 shadow-[#CCFF00]/30'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
