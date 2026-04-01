import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  requireTypeToConfirm?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  requireTypeToConfirm,
  onConfirm,
  onCancel
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-3">
          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
            <AlertTriangle size={20} />
          </div>
          <h3 className="font-bold text-lg text-red-900">{title}</h3>
          <button onClick={handleCancel} className="ml-auto p-2 hover:bg-red-100 rounded-full text-red-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-6">{message}</p>
          
          {requireTypeToConfirm && (
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Type "{requireTypeToConfirm}" to confirm
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                placeholder={requireTypeToConfirm}
              />
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={requireTypeToConfirm ? inputValue !== requireTypeToConfirm : false}
              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
