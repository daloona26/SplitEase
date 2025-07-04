import React from "react";
import { AlertCircle, CheckCircle, XCircle, Info } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

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
  const { theme } = useTheme();

  if (!show) return null;

  const iconMap: Record<MessageType, React.ReactNode> = {
    info: <Info className="h-8 w-8 text-blue-500" />,
    success: <CheckCircle className="h-8 w-8 text-green-500" />,
    error: <XCircle className="h-8 w-8 text-red-500" />,
    confirm: <AlertCircle className="h-8 w-8 text-amber-500" />,
  };

  const bgColorMap: Record<MessageType, string> = {
    info: "bg-blue-50/90 dark:bg-blue-950/80 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200",
    success:
      "bg-green-50/90 dark:bg-green-950/80 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200",
    error:
      "bg-red-50/90 dark:bg-red-950/80 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200",
    confirm:
      "bg-amber-50/90 dark:bg-amber-950/80 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200",
  };

  const buttonColorMap: Record<MessageType, string> = {
    info: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500",
    success:
      "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:ring-green-500",
    error:
      "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500",
    confirm:
      "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500",
  };

  const buttonBaseClass =
    "px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow-lg text-white";

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6 md:p-8">
      <div
        className={`max-w-sm sm:max-w-md w-full p-6 sm:p-8 rounded-3xl border-2 shadow-2xl ${bgColorMap[type]} bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm transform transition-all duration-300 scale-100`}
      >
        <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
          <div className="flex-shrink-0">{iconMap[type]}</div>
          <div>
            <p className="text-base sm:text-lg font-semibold leading-relaxed">
              {message}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full">
            {type === "confirm" ? (
              <>
                <button
                  onClick={onCancel}
                  className={`${buttonBaseClass} flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 focus:ring-slate-400 dark:focus:ring-slate-500`}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className={`${buttonBaseClass} flex-1 ${buttonColorMap[type]}`}
                >
                  Confirm
                </button>
              </>
            ) : (
              <button
                onClick={onConfirm}
                className={`${buttonBaseClass} w-full ${buttonColorMap[type]}`}
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
