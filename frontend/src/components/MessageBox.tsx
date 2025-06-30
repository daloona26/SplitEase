import React from "react";
import { AlertCircle, CheckCircle, XCircle, Info } from "lucide-react";

export type MessageType = "info" | "success" | "error" | "confirm";

interface MessageBoxProps {
  type: MessageType;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  show: boolean;
}

const MessageBoxComponent: React.FC<MessageBoxProps> = ({
  type,
  message,
  onConfirm,
  onCancel,
  show,
}) => {
  if (!show) return null;

  const iconMap: Record<MessageType, React.ReactNode> = {
    info: <Info className="h-8 w-8 text-blue-500" />,
    success: <CheckCircle className="h-8 w-8 text-green-500" />,
    error: <XCircle className="h-8 w-8 text-red-500" />,
    confirm: <AlertCircle className="h-8 w-8 text-amber-500" />,
  };

  const bgColorMap: Record<MessageType, string> = {
    info: "bg-blue-50/90 border-blue-200 text-blue-800",
    success: "bg-green-50/90 border-green-200 text-green-800",
    error: "bg-red-50/90 border-red-200 text-red-800",
    confirm: "bg-amber-50/90 border-amber-200 text-amber-800",
  };

  const buttonColorMap: Record<MessageType, string> = {
    info: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
    success:
      "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800",
    error:
      "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800",
    confirm:
      "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800",
  };

  const buttonBaseClass =
    "px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div
        className={`max-w-md w-full p-8 rounded-3xl border-2 shadow-2xl ${bgColorMap[type]} bg-white/90 backdrop-blur-sm transform transition-all duration-300 scale-100`}
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="flex-shrink-0">{iconMap[type]}</div>
          <div>
            <p className="text-lg font-semibold leading-relaxed">{message}</p>
          </div>
          <div className="flex space-x-4 w-full">
            {type === "confirm" ? (
              <>
                <button
                  onClick={onCancel}
                  className={`${buttonBaseClass} flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300 focus:ring-slate-400`}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className={`${buttonBaseClass} flex-1 text-white ${buttonColorMap[type]} focus:ring-red-500`}
                >
                  Confirm
                </button>
              </>
            ) : (
              <button
                onClick={onConfirm}
                className={`${buttonBaseClass} w-full text-white ${buttonColorMap[type]} focus:ring-opacity-50`}
              >
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBoxComponent;
