import React, { useState, createContext, useContext } from 'react';

const ToastContext = createContext();

export const Toaster = () => {
  const { toasts } = useContext(ToastContext);
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div key={toast.id} className={`p-4 rounded-lg shadow-lg border bg-white ${toast.variant === 'destructive' ? 'border-red-500 text-red-600' : 'border-green-500 text-green-600'} animate-in slide-in-from-right`}>
          <div className="font-bold">{toast.title}</div>
          {toast.description && <div className="text-sm">{toast.description}</div>}
        </div>
      ))}
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const toast = ({ title, description, variant }) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, title, description, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };
  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};
