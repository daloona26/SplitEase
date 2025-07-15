import React, { useState, useEffect } from "react";
import {
  Calendar,
  DollarSign,
  Users,
  Repeat,
  X,
  Clock,
  AlertCircle,
  Trash2,
  Edit3,
} from "lucide-react";

interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  start_date: string;
  end_date?: string;
  next_execution: string;
  is_active: boolean;
  payer_id: string;
  payer_name: string;
  participant_ids: string[];
  split_type: "equal" | "custom" | "percentage";
  custom_shares?: Record<string, number>;
}

interface Member {
  id: string;
  name: string;
  email: string;
}

interface RecurringExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  members: Member[];
  onSave: (
    recurringExpense: Omit<RecurringExpense, "id" | "next_execution">
  ) => Promise<void>;
  onUpdate: (
    id: string,
    recurringExpense: Partial<RecurringExpense>
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  recurringExpenses: RecurringExpense[];
  editingExpense?: RecurringExpense | null;
}

const EXPENSE_CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "insurance", label: "Insurance" },
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function RecurringExpenseModal({
  isOpen,
  onClose,
  groupId,
  members,
  onSave,
  onUpdate,
  onDelete,
  recurringExpenses,
  editingExpense,
}: RecurringExpenseModalProps) {
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: "rent",
    frequency: "monthly" as const,
    start_date: "",
    end_date: "",
    payer_id: "",
    participant_ids: [] as string[],
    split_type: "equal" as const,
    custom_shares: {} as Record<string, number>,
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        name: editingExpense.name,
        amount: editingExpense.amount.toString(),
        category: editingExpense.category,
        frequency: editingExpense.frequency,
        start_date: editingExpense.start_date,
        end_date: editingExpense.end_date || "",
        payer_id: editingExpense.payer_id,
        participant_ids: editingExpense.participant_ids,
        split_type: editingExpense.split_type,
        custom_shares: editingExpense.custom_shares || {},
        is_active: editingExpense.is_active,
      });
      setActiveTab("create");
    }
  }, [editingExpense]);

  const handleSave = async () => {
    if (
      !formData.name.trim() ||
      !formData.amount ||
      !formData.start_date ||
      !formData.payer_id
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const expenseData = {
        name: formData.name.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        payer_id: formData.payer_id,
        payer_name: members.find((m) => m.id === formData.payer_id)?.name || "",
        participant_ids: formData.participant_ids,
        split_type: formData.split_type,
        custom_shares:
          formData.split_type !== "equal" ? formData.custom_shares : undefined,
        is_active: formData.is_active,
      };

      if (editingExpense) {
        await onUpdate(editingExpense.id, expenseData);
      } else {
        await onSave(expenseData);
      }

      resetForm();
      setActiveTab("manage");
    } catch (error) {
      console.error("Failed to save recurring expense:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      category: "rent",
      frequency: "monthly",
      start_date: "",
      end_date: "",
      payer_id: "",
      participant_ids: [],
      split_type: "equal",
      custom_shares: {},
      is_active: true,
    });
  };

  const handleParticipantToggle = (memberId: string) => {
    setFormData((prev) => ({
      ...prev,
      participant_ids: prev.participant_ids.includes(memberId)
        ? prev.participant_ids.filter((id) => id !== memberId)
        : [...prev.participant_ids, memberId],
    }));
  };

  const handleCustomShareChange = (memberId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      custom_shares: {
        ...prev.custom_shares,
        [memberId]: parseFloat(value) || 0,
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl xs:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 dark:border-slate-700/50">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Recurring Expenses
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex mt-4 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "create"
                  ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Repeat className="h-4 w-4 mr-2 inline" />
              {editingExpense ? "Edit" : "Create"}
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "manage"
                  ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Clock className="h-4 w-4 mr-2 inline" />
              Manage ({recurringExpenses.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "create" ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200"
                    placeholder="Monthly rent, Netflix subscription..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Frequency *
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        frequency: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200"
                  >
                    {FREQUENCY_OPTIONS.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        start_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        end_date: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Payer */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Who Pays? *
                </label>
                <select
                  value={formData.payer_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      payer_id: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200"
                >
                  <option value="">Select payer</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Split Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  How to Split?
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { value: "equal", label: "Equal Split" },
                    { value: "custom", label: "Custom Amounts" },
                    { value: "percentage", label: "Percentages" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          split_type: option.value as any,
                          custom_shares: {},
                        }))
                      }
                      className={`px-3 py-2 rounded-lg border-2 transition-all font-semibold text-xs ${
                        formData.split_type === option.value
                          ? "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                          : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Participants */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Participants *
                </label>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3 p-3 bg-white/50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={formData.participant_ids.includes(member.id)}
                        onChange={() => handleParticipantToggle(member.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-500 rounded"
                      />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {member.name}
                      </span>
                      {formData.split_type !== "equal" &&
                        formData.participant_ids.includes(member.id) && (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.custom_shares[member.id] || ""}
                            onChange={(e) =>
                              handleCustomShareChange(member.id, e.target.value)
                            }
                            className="w-20 px-2 py-1 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 text-xs text-slate-700 dark:text-slate-200"
                            placeholder={
                              formData.split_type === "percentage" ? "%" : "$"
                            }
                          />
                        )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab("manage");
                  }}
                  className="flex-1 px-4 py-3 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 font-semibold"
                >
                  {isLoading
                    ? "Saving..."
                    : editingExpense
                    ? "Update"
                    : "Create"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {recurringExpenses.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    No recurring expenses yet
                  </p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create First Recurring Expense
                  </button>
                </div>
              ) : (
                recurringExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="bg-white/50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                            {expense.name}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              expense.is_active
                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {expense.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <div>
                            <span className="font-medium">Amount:</span> $
                            {expense.amount.toFixed(2)}
                          </div>
                          <div>
                            <span className="font-medium">Frequency:</span>{" "}
                            {expense.frequency}
                          </div>
                          <div>
                            <span className="font-medium">Next:</span>{" "}
                            {new Date(
                              expense.next_execution
                            ).toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Paid by:</span>{" "}
                            {expense.payer_name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setActiveTab("create");
                            // Set editing expense in parent component
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(expense.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
