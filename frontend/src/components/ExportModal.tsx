// frontend/src/components/ExportModal.tsx

import React, { useState } from "react";
import { Download, FileText, X, Loader2 } from "lucide-react";
import { api } from "../contexts/AuthContext"; // Assuming you export 'api' from AuthContext
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Helper function to generate HTML for the PDF report
const generateHTMLReport = (expenses, balances, group) => {
  const totalAmount = expenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount || 0),
    0
  );
  return `
      <div style="font-family: Arial, sans-serif; margin: 20px; color: #333; width: 210mm;">
        <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">💰 Expense Report: ${
          group.name
        }</h1>
        <h2 style="color: #34495e; margin-top: 30px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;">📋 Expenses</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead><tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #3498db; color: white;">Date</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #3498db; color: white;">Description</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #3498db; color: white;">Amount</th></tr></thead>
          <tbody>${expenses
            .map(
              (e) =>
                `<tr><td style="border: 1px solid #ddd; padding: 8px;">${new Date(
                  e.expense_date
                ).toLocaleDateString()}</td><td style="border: 1px solid #ddd; padding: 8px;">${
                  e.description || "N/A"
                }</td><td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${parseFloat(
                  e.amount || 0
                ).toFixed(2)}</td></tr>`
            )
            .join("")}</tbody>
        </table>
        <h2 style="color: #34495e; margin-top: 30px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px;">⚖️ Member Balances</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead><tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #3498db; color: white;">Member</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #3498db; color: white;">Balance</th></tr></thead>
          <tbody>${balances
            .map(
              (b) =>
                `<tr><td style="border: 1px solid #ddd; padding: 8px;">${
                  b.name || "Unknown"
                }</td><td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: ${
                  parseFloat(b.balance) >= 0 ? "#27ae60" : "#e74c3c"
                };">$${parseFloat(b.balance || 0).toFixed(2)}</td></tr>`
            )
            .join("")}</tbody>
        </table>
      </div>
    `;
};

// Helper function to generate CSV content

const createCsvContent = (expenses) => {
  const headers = [
    "Date",
    "Description",
    "Amount",
    "Category",
    "Payers",
    "Participants",
  ];
  const rows = expenses.map((expense) => {
    const dateString = expense.expense_date
      ? new Date(expense.expense_date).toLocaleDateString()
      : "N/A";

    // =================================================================
    // THE FIX IS HERE: Use parseFloat() to convert the amount string to a number
    // =================================================================
    const amount = (parseFloat(expense.amount) || 0).toFixed(2);

    return [
      dateString,
      `"${expense.description || ""}"`,
      amount, // Use the corrected amount variable
      expense.category || "",
      `"${expense.payers || ""}"`,
      `"${expense.participants || ""}"`,
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\n");
};

export default function ExportModal({ isOpen, onClose, groupId, groupName }) {
  const [exportFormat, setExportFormat] = useState("csv");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 1. Fetch data from the new, single backend endpoint
      const params = new URLSearchParams();
      if (dateRange.start) params.append("startDate", dateRange.start);
      if (dateRange.end) params.append("endDate", dateRange.end);

      const response = await api.get(
        `/export/group/${groupId}/data?${params.toString()}`
      );
      const { expenses, balances, group } = response.data;

      const fileName = `${group.name.replace(/[^a-zA-Z0-9]/g, "_")}_report`;

      if (exportFormat === "csv") {
        // =================================================================
        // THE FIX IS HERE
        // =================================================================
        const csvContent = createCsvContent(expenses);
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${fileName}.csv`); // Set the filename here
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click(); // This triggers the download
        document.body.removeChild(link); // Clean up the link
        // =================================================================
      } else {
        // PDF
        const reportElement = document.createElement("div");
        reportElement.innerHTML = generateHTMLReport(expenses, balances, group);
        document.body.appendChild(reportElement);

        const canvas = await html2canvas(reportElement, { scale: 2 }); // Increase scale for better quality
        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`);

        document.body.removeChild(reportElement);
      }
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      // You can add a user-facing error message here
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            Export Report for {groupName}
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportFormat("csv")}
                className={`p-4 rounded-xl border-2 ${
                  exportFormat === "csv"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-300"
                }`}
              >
                <FileText className="mx-auto" />
              </button>
              <button
                onClick={() => setExportFormat("pdf")}
                className={`p-4 rounded-xl border-2 ${
                  exportFormat === "pdf"
                    ? "border-red-500 bg-red-50"
                    : "border-slate-300"
                }`}
              >
                <Download className="mx-auto" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-3">
              Date Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((p) => ({ ...p, start: e.target.value }))
                }
                className="w-full p-2 border-2 rounded-lg"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((p) => ({ ...p, end: e.target.value }))
                }
                className="w-full p-2 border-2 rounded-lg"
              />
            </div>
          </div>
          <div className="pt-4">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center font-semibold disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="animate-spin" />
              ) : (
                `Export ${exportFormat.toUpperCase()}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
