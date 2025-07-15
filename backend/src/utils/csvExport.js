const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

// Helper to round to 2 decimal places
const roundToTwoDecimals = (num) => Math.round(num * 100) / 100;

const exportToCsv = async (expenses, groupName, tempDir) => {
  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const csvFilePath = path.join(tempDir, `expenses_${Date.now()}.csv`);

  const csvWriter = createCsvWriter({
    path: csvFilePath,
    header: [
      { id: 'date', title: 'Date' },
      { id: 'description', title: 'Description' },
      { id: 'amount', title: 'Amount' },
      { id: 'category', title: 'Category' },
      { id: 'payers', title: 'Paid By' },
      { id: 'participants', title: 'Split Among' },
    ],
  });

  const csvData = expenses.map((expense) => ({
    date: new Date(expense.expense_date).toLocaleDateString(),
    description: expense.description,
    amount: `$${roundToTwoDecimals(expense.amount).toFixed(2)}`,
    category: expense.category,
    payers: expense.payers || '',
    participants: expense.participants || '',
  }));

  await csvWriter.writeRecords(csvData);
  return csvFilePath;
};

module.exports = { exportToCsv };