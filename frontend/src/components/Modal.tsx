import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
  };

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300 ease-out
                  ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      onClick={onClose}
    >
      <div
        className={`bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl ${
          sizeClasses[size]
        } w-full transform transition-all duration-300 ease-out border border-white/20
                    ${isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-200/50">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl p-2 transition-all duration-200"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
