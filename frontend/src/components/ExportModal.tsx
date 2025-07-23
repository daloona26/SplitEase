import React, { useState } from "react";
import {
  Download,
  FileText,
  Calendar,
  DollarSign,
  X,
  Loader2,
} from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onExport: (
    format: "csv" | "pdf",
    dateRange?: { start: string; end: string }
  ) => Promise<void>;
}

export default function ExportModal({
  isOpen,
  onClose,
  groupId,
  groupName,
  onExport,
}: ExportModalProps) {
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(
        exportFormat,
        dateRange.start && dateRange.end ? dateRange : undefined
      );
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl xs:rounded-3xl shadow-2xl max-w-md w-full border border-white/20 dark:border-slate-700/50">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              {"Export Data"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
              aria-label={"Close modal"}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {`Export expenses for ${groupName}`}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Format */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              {"Export Format"}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportFormat("csv")}
                className={`flex items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  exportFormat === "csv"
                    ? "bg-blue-50 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                    : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
                }`}
              >
                <FileText className="h-5 w-5 mr-2" />
                {"CSV"}
              </button>
              <button
                onClick={() => setExportFormat("pdf")}
                className={`flex items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  exportFormat === "pdf"
                    ? "bg-red-50 dark:bg-red-900/50 border-red-300 dark:border-red-600 text-red-700 dark:text-red-300"
                    : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
                }`}
              >
                <Download className="h-5 w-5 mr-2" />
                {"PDF"}
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              {"Date Range (Optional)"}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {"Start Date"}
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {"End Date"}
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 px-4 py-3 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold disabled:opacity-50"
            >
              {"Cancel"}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {"Exporting..."}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {"Export"} {exportFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
