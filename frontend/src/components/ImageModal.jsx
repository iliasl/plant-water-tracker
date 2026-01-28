import React from 'react';
import { X, RefreshCw } from 'lucide-react';

const ImageModal = ({ imageUrl, onClose, onEdit }) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-in fade-in" onClick={onClose}>
      <div className="relative bg-white rounded-lg shadow-xl overflow-hidden max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <img src={imageUrl} alt="Plant" className="w-full h-auto" />
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 bg-white/80 text-slate-800 hover:bg-white rounded-full transition-all duration-200 shadow-md"
            title="Change Picture"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/80 text-slate-800 hover:bg-white rounded-full transition-all duration-200 shadow-md"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
