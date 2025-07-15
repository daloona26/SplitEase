const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

// Helper to round to 2 decimal places
const roundToTwoDecimals = (num) => Math.round(num * 100) / 100;

const exportToPdf = async (
  expenses = [],
  balances = [],
  groupDetails = {},
  tempDir
) => {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `${
        groupDetails.name || "Group"
      }_report_${Date.now()}.pdf`;
      const pdfFilePath = path.join(tempDir, fileName);
      const doc = new PDFDocument();
      const writeStream = fs.createWriteStream(pdfFilePath);
      doc.pipe(writeStream);

      // Header
      doc
        .fontSize(16)
        .text(`${groupDetails.name || "Group"} - Expense Report`, {
          underline: true,
        });
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      // Summary
      const totalAmount = expenses.reduce(
        (sum, exp) => sum + parseFloat(exp.amount || 0),
        0
      );
      doc.fontSize(14).text("SUMMARY:");
      doc.fontSize(12).text(`Total Expenses: ${expenses.length}`);
      doc.text(`Total Amount: $${roundToTwoDecimals(totalAmount).toFixed(2)}`);
      doc.moveDown();

      // Expenses
      doc.fontSize(14).text("EXPENSES:");
      doc.moveDown(0.5);
      expenses.forEach((expense) => {
        doc
          .fontSize(12)
          .text(`Date: ${new Date(expense.expense_date).toLocaleDateString()}`);
        doc.text(`Description: ${expense.description || "N/A"}`);
        doc.text(
          `Amount: $${roundToTwoDecimals(expense.amount || 0).toFixed(2)}`
        );
        doc.text(`Category: ${expense.category || "N/A"}`);
        doc.text(`Paid By: ${expense.payers || "N/A"}`);
        doc.text(`Participants: ${expense.participants || "N/A"}`);
        doc.moveDown();
      });

      // Balances
      if (balances.length > 0) {
        doc.addPage();
        doc.fontSize(14).text("BALANCES:");
        doc.moveDown(0.5);
        balances.forEach((balance) => {
          const totalPaid = roundToTwoDecimals(
            parseFloat(balance.total_paid || 0)
          );
          const totalOwed = roundToTwoDecimals(
            parseFloat(balance.total_owed || 0)
          );
          const netBalance = roundToTwoDecimals(totalPaid - totalOwed);

          doc.fontSize(12).text(`Member: ${balance.name || "Unnamed"}`);
          doc.text(`Total Paid: $${totalPaid.toFixed(2)}`);
          doc.text(`Total Owed: $${totalOwed.toFixed(2)}`);
          doc.text(
            `Balance: $${Math.abs(netBalance).toFixed(2)} ${
              netBalance > 0
                ? "(Should receive)"
                : netBalance < 0
                ? "(Should pay)"
                : "(Even)"
            }`
          );
          doc.moveDown();
        });
      }

      doc.end();

      writeStream.on("finish", () => resolve({ path: pdfFilePath, fileName }));
      writeStream.on("error", (err) => {
        console.error("Stream error during PDF write:", err);
        reject(err);
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      reject(err);
    }
  });
};

module.exports = { exportToPdf };
