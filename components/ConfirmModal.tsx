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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className={`${type === 'danger' ? 'bg-red-50 border-red-100' : 'bg-brand-50 border-brand-100'} px-8 py-6 border-b flex items-center gap-4`}>
          <div className={`p-2.5 ${type === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-brand-500/10 text-brand-500'} rounded-xl`}>
            <AlertTriangle size={20} />
          </div>
          <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg italic">{title}</h3>
          <button onClick={handleCancel} className="ml-auto p-2 hover:bg-white rounded-xl text-slate-300 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100 shadow-sm">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8">
          <p className="text-slate-500 text-sm font-bold leading-relaxed mb-8 italic uppercase tracking-wider">{message}</p>
          
          {requireTypeToConfirm && (
            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                Type "{requireTypeToConfirm}" to confirm
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-black text-slate-900 placeholder:text-slate-300 focus:border-brand-500 outline-none transition-all shadow-sm italic uppercase tracking-widest"
                placeholder={requireTypeToConfirm}
              />
            </div>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              className="flex-1 py-4 px-6 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 font-black uppercase tracking-[0.15em] text-[10px] rounded-[1.5rem] transition-all border border-slate-200 shadow-sm italic"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={requireTypeToConfirm ? inputValue !== requireTypeToConfirm : false}
              className={`flex-1 py-4 px-6 font-black uppercase tracking-[0.15em] text-[10px] rounded-[1.5rem] transition-all shadow-xl transform active:scale-95 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed italic ${
                type === 'danger' 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                  : 'bg-brand-500 hover:bg-brand-600 text-slate-900 shadow-brand-500/20'
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
