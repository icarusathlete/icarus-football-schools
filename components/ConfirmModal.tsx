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
  confirmText = "Verify & Execute",
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-brand-500/10 backdrop-blur-xl w-full max-w-md rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(14,165,233,0.3)] border border-brand-500/30 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-red-500/10 px-8 py-5 border-b border-red-500/20 flex items-center gap-4">
          <div className="p-2.5 bg-red-500/20 text-red-500 rounded-xl">
            <AlertTriangle size={20} />
          </div>
          <h3 className="font-black text-white uppercase tracking-tight text-lg" style={{ fontFamily: 'Orbitron' }}>{title}</h3>
          <button onClick={handleCancel} className="ml-auto p-2 hover:bg-white/5 rounded-xl text-brand-600 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8">
          <p className="text-red-200/60 text-sm font-bold leading-relaxed mb-8">{message}</p>
          
          {requireTypeToConfirm && (
            <div className="mb-8 p-6 bg-brand-950/50 rounded-2xl border border-white/5 shadow-inner">
              <label className="block text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-3">
                Authorization Sequence: Type "{requireTypeToConfirm}"
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-brand-800 border border-white/10 rounded-xl px-5 py-3.5 text-sm font-black text-white placeholder:text-brand-700 focus:border-red-500 outline-none transition-all shadow-inner"
                placeholder={requireTypeToConfirm}
              />
            </div>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 text-brand-400 hover:text-white font-black uppercase tracking-[0.15em] text-[10px] rounded-[1.5rem] transition-all border border-white/5 shadow-inner"
            >
              Abort Action
            </button>
            <button
              onClick={handleConfirm}
              disabled={requireTypeToConfirm ? inputValue !== requireTypeToConfirm : false}
              className={`flex-1 py-4 px-6 font-black uppercase tracking-[0.15em] text-[10px] rounded-[1.5rem] transition-all shadow-xl transform active:scale-95 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed ${
                type === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20' 
                  : 'bg-brand-500 hover:bg-brand-600 text-brand-950 shadow-brand-500/20'
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
