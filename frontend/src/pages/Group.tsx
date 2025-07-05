// frontend/src/pages/GroupEnhanced.tsx

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth, api } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import {
  Plus,
  DollarSign,
  UsersIcon,
  TrendingUp,
  Filter,
  Edit,
  Trash2,
  UserPlus,
  BarChart3,
  PieChart,
  XCircle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shuffle,
  Percent,
  Calculator,
  Star, // Used for trial banner
} from "lucide-react";

// Interfaces (kept as is, no changes needed here for responsiveness)
interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
  total_paid: number;
  total_owed: number;
  balance: number;
  expenses_count: number;
}

interface Payment {
  user_id: string;
  name: string;
  amount_paid: number;
}

interface Participant {
  user_id: string;
  name: string;
  share_amount: number;
  share_percentage: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  payments: Payment[];
  participants: Participant[];
}

interface GroupDetails {
  id: string;
  name: string;
  description: string;
  creator_name: string;
  role: string;
  creator_user_id: string;
  memberCount: number;
  expensesCount: number;
  totalAmount: number;
  created_at: string;
}

interface Balance {
  user_id: string;
  name: string;
  email: string;
  total_paid: number;
  total_owed: number;
  balance: number;
}

interface ExpenseStats {
  totalCount: number;
  totalAmount: number;
  averageAmount: number;
  categoriesCount: number;
}

interface Category {
  category: string;
  expenses_count: number;
  total_amount: number;
  average_amount: number;
}

type TabType = "expenses" | "balances" | "members" | "stats";
type SplitType = "equal" | "custom" | "percentage";

const EXPENSE_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "entertainment", label: "Entertainment" },
  { value: "shopping", label: "Shopping" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
];

export default function GroupEnhanced() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State for fetched data
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({
    totalCount: 0,
    totalAmount: 0,
    averageAmount: 0,
    categoriesCount: 0,
  });

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>("expenses");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showRedistributeExpense, setShowRedistributeExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Form State
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "general",
    payments: [{ userId: user?.id || "", amountPaid: "" }],
    participantUserIds: [user?.id || ""],
    splitType: "equal" as SplitType,
    customShares: {} as Record<string, number>,
  });

  const [editExpense, setEditExpense] = useState({
    id: "",
    description: "",
    amount: "",
    category: "general",
    payments: [{ userId: user?.id || "", amountPaid: "" }],
    participantUserIds: [user?.id || ""],
    splitType: "equal" as SplitType,
    customShares: {} as Record<string, number>,
  });

  const [redistributeForm, setRedistributeForm] = useState({
    participantUserIds: [] as string[],
    splitType: "equal" as SplitType,
    customShares: {} as Record<string, number>,
  });

  const [newMemberEmail, setNewMemberEmail] = useState("");

  // Filter State
  const [filters, setFilters] = useState({
    category: "all",
    startDate: "",
    endDate: "",
    search: "",
  });

  // Loading States
  const [loading, setLoading] = useState({
    group: true,
    expenses: true,
    members: true,
    balances: true,
    categories: true,
  });

  // Action Loading States
  const [actionLoading, setActionLoading] = useState({
    addExpense: false,
    editExpense: false,
    deleteExpense: false,
    redistributeExpense: false,
    addMember: false,
    deleteGroup: false, // Not used in this component, but good to keep if inherited
    removeMember: false,
    updateGroup: false, // Not used in this component, but good to keep if inherited
  });

  // Error state
  const [error, setError] = useState("");

  // Message Box State
  const [messageBox, setMessageBox] = useState({
    show: false,
    type: "info" as "info" | "success" | "error" | "confirm",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  // Function to display custom message box
  const showMessageBox = useCallback(
    (
      type: "info" | "success" | "error" | "confirm",
      message: string,
      onConfirm?: () => void,
      onCancel?: () => void
    ) => {
      setMessageBox({
        show: true,
        type,
        message,
        onConfirm:
          onConfirm ||
          (() => setMessageBox((prev) => ({ ...prev, show: false }))),
        onCancel:
          onCancel ||
          (() => setMessageBox((prev) => ({ ...prev, show: false }))),
      });
    },
    []
  );

  // Helper function to format participant names for display
  const getParticipantNamesForDisplay = useCallback(
    (participants: Array<{ user_id: string; name: string }>): string => {
      if (!participants || participants.length === 0) {
        return "No participants";
      }
      return participants
        .map((p) => p.name)
        .filter(Boolean)
        .join(", ");
    },
    []
  );

  // Helper function to format payer names for display
  const getPayerNamesForDisplay = useCallback((payments: Payment[]): string => {
    if (!payments || payments.length === 0) {
      return "No payers";
    }
    return payments
      .map((p) => `${p.name} ($${p.amount_paid.toFixed(2)})`)
      .filter(Boolean)
      .join(", ");
  }, []);

  // Helper function to calculate custom shares total
  const calculateCustomSharesTotal = useCallback(
    (customShares: Record<string, number>) => {
      return Object.values(customShares).reduce(
        (sum, amount) => sum + (Number.parseFloat(amount.toString()) || 0),
        0
      );
    },
    []
  );

  // Helper function to validate custom shares
  const validateCustomShares = useCallback(
    (
      splitType: SplitType,
      amount: number,
      customShares: Record<string, number>
    ) => {
      if (splitType === "equal") return true;

      if (splitType === "custom") {
        const total = calculateCustomSharesTotal(customShares);
        return Math.abs(total - amount) <= 0.01;
      }

      if (splitType === "percentage") {
        const total = calculateCustomSharesTotal(customShares);
        return Math.abs(total - 100) <= 0.01;
      }

      return false;
    },
    [calculateCustomSharesTotal]
  );

  // Helper function to calculate total paid amount from payments array
  const calculateTotalPaid = useCallback(
    (payments: { userId: string; amountPaid: string }[]) => {
      return payments.reduce(
        (sum, payment) => sum + (Number.parseFloat(payment.amountPaid) || 0),
        0
      );
    },
    []
  );

  // Effect for initial authentication and subscription/trial check
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!user.isSubscribed) {
      const isTrialStillActive =
        user.isTrialActive &&
        user.trialEndsAt &&
        new Date(user.trialEndsAt) > new Date();
      if (!isTrialStillActive) {
        navigate("/pricing");
      }
    }
  }, [user, navigate]);

  // Enhanced fetch group details with better error handling
  const fetchGroupDetails = useCallback(async () => {
    if (!user || !groupId || !api) return;
    setLoading((prev) => ({ ...prev, group: true }));
    setError("");

    try {
      // Removed /api prefix
      const response = await api.get(`/groups/${groupId}`);
      setGroupDetails(response.data);
    } catch (err: any) {
      console.error("Failed to fetch group details:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to load group details.";
      setError(errorMessage);

      if (err.response?.status === 403) {
        showMessageBox(
          "error",
          "Access denied to group. Redirecting to dashboard..."
        );
        setTimeout(() => navigate("/dashboard"), 2000);
      } else if (err.response?.status === 404) {
        showMessageBox("error", "Group not found. Redirecting to dashboard...");
        setTimeout(() => navigate("/dashboard"), 2000);
      } else {
        showMessageBox("error", errorMessage);
      }
    } finally {
      setLoading((prev) => ({ ...prev, group: false }));
    }
  }, [user, groupId, api, showMessageBox, navigate]);

  // Enhanced fetch expenses with better error handling
  const fetchExpenses = useCallback(async () => {
    if (!user || !groupId || !api) return;
    setLoading((prev) => ({ ...prev, expenses: true }));

    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== "all")
        params.append("category", filters.category);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.search) params.append("search", filters.search);

      // Removed /api prefix
      const response = await api.get(
        `/expenses/${groupId}/expenses?${params.toString()}`
      );

      setExpenses(response.data.expenses || []);
      setStats(
        response.data.stats || {
          totalCount: 0,
          totalAmount: 0,
          averageAmount: 0,
          categoriesCount: 0,
        }
      );
      setCategories(response.data.categories || []);
    } catch (err: any) {
      console.error("Failed to fetch expenses:", err);
      showMessageBox(
        "error",
        err.response?.data?.message || "Failed to load expenses."
      );
    } finally {
      setLoading((prev) => ({ ...prev, expenses: false }));
    }
  }, [user, groupId, filters, api, showMessageBox]);

  // Enhanced fetch members with better error handling
  const fetchMembers = useCallback(async () => {
    if (!user || !groupId || !api) return;
    setLoading((prev) => ({ ...prev, members: true }));

    try {
      // Removed /api prefix
      const response = await api.get(`/groups/${groupId}/members`);
      setMembers(response.data.members || []);
    } catch (err: any) {
      console.error("Failed to fetch members:", err);
      showMessageBox(
        "error",
        err.response?.data?.message || "Failed to load members."
      );
    } finally {
      setLoading((prev) => ({ ...prev, members: false }));
    }
  }, [user, groupId, api, showMessageBox]);

  // Enhanced fetch balances with detailed debugging
  const fetchBalances = useCallback(async () => {
    if (!user || !groupId || !api) return;
    setLoading((prev) => ({ ...prev, balances: true }));

    try {
      // Removed /api prefix
      const response = await api.get(`/expenses/${groupId}/balances`);

      if (response.data && Array.isArray(response.data.balances)) {
        const processedBalances = response.data.balances.map((balance: any) => {
          const processed = {
            user_id: balance.user_id,
            name: balance.name,
            email: balance.email,
            total_paid: Number(balance.total_paid) || 0,
            total_owed: Number(balance.total_owed) || 0,
            balance: Number(balance.balance) || 0,
          };

          return processed;
        });

        setBalances(processedBalances);
      } else {
        console.error(
          "🔍 FRONTEND: Invalid balances data structure:",
          response.data
        );
        setBalances([]);
      }
    } catch (err: any) {
      console.error("🔍 FRONTEND: Failed to fetch balances:", err);
      console.error("🔍 FRONTEND: Error response:", err.response?.data);
      showMessageBox(
        "error",
        err.response?.data?.message || "Failed to load balances."
      );
      setBalances([]);
    } finally {
      setLoading((prev) => ({ ...prev, balances: false }));
    }
  }, [user, groupId, api, showMessageBox]);

  // Initial data fetch on component mount and when groupId or user changes
  useEffect(() => {
    if (user && groupId && api) {
      fetchGroupDetails();
      fetchMembers();
      fetchExpenses();
    }
  }, [fetchGroupDetails, fetchMembers, fetchExpenses, user, groupId, api]);

  // Refetch data when activeTab changes, or for expenses/balances when filters change
  useEffect(() => {
    if (activeTab === "balances") {
      fetchBalances();
    } else if (activeTab === "expenses") {
      fetchExpenses();
    } else if (activeTab === "members") {
      fetchMembers();
    }
  }, [activeTab, fetchBalances, fetchExpenses, fetchMembers]);

  // Add Expense Helper for payments
  const handleAddPayment = (formType: "new" | "edit") => {
    const setState = formType === "new" ? setNewExpense : setEditExpense;
    setState((prev) => ({
      ...prev,
      payments: [
        ...prev.payments,
        { userId: members[0]?.id || "", amountPaid: "" },
      ],
    }));
  };

  const handleRemovePayment = (formType: "new" | "edit", index: number) => {
    const setState = formType === "new" ? setNewExpense : setEditExpense;
    setState((prev) => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== index),
    }));
  };

  const handlePaymentChange = (
    formType: "new" | "edit",
    index: number,
    field: "userId" | "amountPaid",
    value: string
  ) => {
    const setState = formType === "new" ? setNewExpense : setEditExpense;
    setState((prev) => ({
      ...prev,
      payments: prev.payments.map((payment, i) =>
        i === index ? { ...payment, [field]: value } : payment
      ),
    }));
  };

  // Enhanced add expense handler
  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalAmount = Number.parseFloat(newExpense.amount);
    const totalPaid = calculateTotalPaid(newExpense.payments);

    if (
      !newExpense.description.trim() ||
      !newExpense.amount ||
      totalAmount <= 0
    ) {
      showMessageBox("error", "Please fill description and amount.");
      return;
    }
    if (newExpense.participantUserIds.length === 0) {
      showMessageBox("error", "Please select at least one participant.");
      return;
    }
    if (newExpense.payments.length === 0 || !newExpense.payments[0].userId) {
      showMessageBox("error", "Please add at least one payer and amount.");
      return;
    }

    if (Math.abs(totalPaid - totalAmount) > 0.01) {
      showMessageBox(
        "error",
        `Total paid ($${totalPaid.toFixed(
          2
        )}) must exactly match the expense amount ($${totalAmount.toFixed(2)}).`
      );
      return;
    }

    if (
      newExpense.splitType !== "equal" &&
      !validateCustomShares(
        newExpense.splitType,
        totalAmount,
        newExpense.customShares
      )
    ) {
      if (newExpense.splitType === "custom") {
        showMessageBox(
          "error",
          "Custom amounts must add up to the total expense amount."
        );
      } else {
        showMessageBox("error", "Custom percentages must add up to 100%.");
      }
      return;
    }

    setActionLoading((prev) => ({ ...prev, addExpense: true }));

    try {
      // Removed /api prefix
      await api.post("/expenses", {
        groupId,
        description: newExpense.description.trim(),
        amount: totalAmount,
        category: newExpense.category,
        payments: newExpense.payments.map((p) => ({
          userId: p.userId,
          amountPaid: Number.parseFloat(p.amountPaid),
        })),
        participants: newExpense.participantUserIds,
        splitType: newExpense.splitType,
        customShares:
          newExpense.splitType !== "equal" ? newExpense.customShares : null,
      });

      showMessageBox("success", "Expense added successfully!");
      setShowAddExpense(false);
      setNewExpense({
        description: "",
        amount: "",
        category: "general",
        payments: [{ userId: user?.id || "", amountPaid: "" }],
        participantUserIds: [user?.id || ""],
        splitType: "equal",
        customShares: {},
      });
      fetchExpenses();
      fetchBalances();
    } catch (err: any) {
      console.error("Failed to add expense:", err);
      showMessageBox(
        "error",
        err.response?.data?.message || "Failed to add expense."
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, addExpense: false }));
    }
  };

  // Enhanced edit expense handler
  const editExpenseHandler = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalAmount = Number.parseFloat(editExpense.amount);
    const totalPaid = calculateTotalPaid(editExpense.payments);

    if (
      !editExpense.description.trim() ||
      !editExpense.amount ||
      totalAmount <= 0
    ) {
      showMessageBox("error", "Please fill description and amount.");
      return;
    }
    if (editExpense.participantUserIds.length === 0) {
      showMessageBox("error", "Please select at least one participant.");
      return;
    }
    if (editExpense.payments.length === 0 || !editExpense.payments[0].userId) {
      showMessageBox("error", "Please add at least one payer and amount.");
      return;
    }

    if (Math.abs(totalPaid - totalAmount) > 0.01) {
      showMessageBox(
        "error",
        `Total paid ($${totalPaid.toFixed(
          2
        )}) must exactly match the expense amount ($${totalAmount.toFixed(2)}).`
      );
      return;
    }

    if (
      editExpense.splitType !== "equal" &&
      !validateCustomShares(
        editExpense.splitType,
        totalAmount,
        editExpense.customShares
      )
    ) {
      if (editExpense.splitType === "custom") {
        showMessageBox(
          "error",
          "Custom amounts must add up to the total expense amount."
        );
      } else {
        showMessageBox("error", "Custom percentages must add up to 100%.");
      }
      return;
    }

    setActionLoading((prev) => ({ ...prev, editExpense: true }));

    try {
      // Removed /api prefix
      await api.put(`/expenses/${editExpense.id}`, {
        description: editExpense.description.trim(),
        amount: totalAmount,
        category: editExpense.category,
        payments: editExpense.payments.map((p) => ({
          userId: p.userId,
          amountPaid: Number.parseFloat(p.amountPaid),
        })),
        participants: editExpense.participantUserIds,
        splitType: editExpense.splitType,
        customShares:
          editExpense.splitType !== "equal" ? editExpense.customShares : null,
      });

      showMessageBox("success", "Expense updated successfully!");
      setShowEditExpense(false);
      setSelectedExpense(null);
      fetchExpenses();
      fetchBalances();
    } catch (err: any) {
      console.error("Failed to edit expense:", err);
      showMessageBox(
        "error",
        err.response?.data?.message || "Failed to update expense."
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, editExpense: false }));
    }
  };

  // Delete expense handler
  const deleteExpense = async (expenseId: string) => {
    setActionLoading((prev) => ({ ...prev, deleteExpense: true }));

    try {
      // Removed /api prefix
      await api.delete(`/expenses/${expenseId}`);
      showMessageBox("success", "Expense deleted successfully!");
      fetchExpenses();
      fetchBalances();
    } catch (err: any) {
      console.error("Failed to delete expense:", err);
      showMessageBox(
        "error",
        err.response?.data?.message || "Failed to delete expense."
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, deleteExpense: false }));
    }
  };

  // Redistribute expense handler
  const redistributeExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (redistributeForm.participantUserIds.length === 0) {
      showMessageBox("error", "Please select at least one participant.");
      return;
    }

    if (!selectedExpense) {
      showMessageBox("error", "No expense selected for redistribution.");
      return;
    }

    if (
      redistributeForm.splitType !== "equal" &&
      !validateCustomShares(
        redistributeForm.splitType,
        selectedExpense.amount,
        redistributeForm.customShares
      )
    ) {
      if (redistributeForm.splitType === "custom") {
        showMessageBox(
          "error",
          "Custom amounts must add up to the total expense amount."
        );
      } else {
        showMessageBox("error", "Custom percentages must add up to 100%.");
      }
      return;
    }

    setActionLoading((prev) => ({ ...prev, redistributeExpense: true }));

    try {
      // Removed /api prefix
      await api.put(`/expenses/${selectedExpense.id}/redistribute`, {
        participants: redistributeForm.participantUserIds,
        splitType: redistributeForm.splitType,
        customShares:
          redistributeForm.splitType !== "equal"
            ? redistributeForm.customShares
            : null,
      });

      showMessageBox("success", "Expense redistributed successfully!");
      setShowRedistributeExpense(false);
      setSelectedExpense(null);
      fetchExpenses();
      fetchBalances();
    } catch (err: any) {
      console.error("Failed to redistribute expense:", err);
      showMessageBox(
        "error",
        err.response?.data?.message || "Failed to redistribute expense."
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, redistributeExpense: false }));
    }
  };

  // Add member handler
  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMemberEmail.trim()) {
      showMessageBox("error", "Please enter a valid email address.");
      return;
    }

    setActionLoading((prev) => ({ ...prev, addMember: true }));

    try {
      // Removed /api prefix
      await api.post(`/groups/${groupId}/members`, {
        email: newMemberEmail.trim(),
      });
      showMessageBox("success", "Member added successfully!");
      setShowAddMember(false);
      setNewMemberEmail("");
      fetchMembers();
    } catch (err: any) {
      console.error("Failed to add member:", err);
      showMessageBox(
        "error",
        err.response?.data?.message || "Failed to add member."
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, addMember: false }));
    }
  };

  // Remove member handler
  const removeMember = async (memberId: string) => {
    const targetMember = members.find((m) => m.id === memberId);

    if (memberId === user?.id) {
      showMessageBox("error", "You cannot remove yourself from the group.");
      return;
    }

    showMessageBox(
      "confirm",
      `Are you sure you want to remove ${
        targetMember?.name || "this member"
      } from the group?`,
      async () => {
        setActionLoading((prev) => ({ ...prev, removeMember: true }));
        try {
          // Removed /api prefix
          await api.delete(`/groups/${groupId}/members/${memberId}`);
          showMessageBox("success", "Member removed successfully!");
          fetchMembers();
        } catch (err: any) {
          console.error("Failed to remove member:", err);
          showMessageBox(
            "error",
            err.response?.data?.message || "Failed to remove member."
          );
        } finally {
          setActionLoading((prev) => ({ ...prev, removeMember: false }));
        }
      }
    );
  };

  // Prepare edit expense form
  const prepareEditExpense = (expense: Expense) => {
    const customSharesMap: Record<string, number> = {};
    let detectedSplitType: SplitType = "equal";

    if (expense.participants.length > 0) {
      const equalShareAmount = Number(
        (expense.amount / expense.participants.length).toFixed(2)
      );
      const isActuallyEqual = expense.participants.every(
        (p) => Math.abs(p.share_amount - equalShareAmount) < 0.01
      );

      if (isActuallyEqual) {
        detectedSplitType = "equal";
      } else {
        const totalPercentage = expense.participants.reduce(
          (sum, p) => sum + p.share_percentage,
          0
        );
        if (Math.abs(totalPercentage - 100) < 0.01) {
          detectedSplitType = "percentage";
          expense.participants.forEach((p) => {
            customSharesMap[p.user_id] = p.share_percentage;
          });
        } else {
          detectedSplitType = "custom";
          expense.participants.forEach((p) => {
            customSharesMap[p.user_id] = p.share_amount;
          });
        }
      }
    }

    setEditExpense({
      id: expense.id,
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      payments: expense.payments.map((p) => ({
        userId: p.user_id,
        amountPaid: p.amount_paid.toString(),
      })),
      participantUserIds: expense.participants.map((p) => p.user_id),
      splitType: detectedSplitType,
      customShares: customSharesMap,
    });
    setSelectedExpense(expense);
    setShowEditExpense(true);
  };

  // Prepare redistribute expense form
  const prepareRedistributeExpense = (expense: Expense) => {
    setRedistributeForm({
      participantUserIds: expense.participants.map((p) => p.user_id),
      splitType: "equal",
      customShares: {},
    });
    setSelectedExpense(expense);
    setShowRedistributeExpense(true);
  };

  // Handle custom share change for new expense
  const handleCustomShareChange = (
    formType: "new" | "edit" | "redistribute",
    userId: string,
    value: string
  ) => {
    const numValue = Number.parseFloat(value) || 0;

    if (formType === "new") {
      setNewExpense((prev) => ({
        ...prev,
        customShares: { ...prev.customShares, [userId]: numValue },
      }));
    } else if (formType === "edit") {
      setEditExpense((prev) => ({
        ...prev,
        customShares: { ...prev.customShares, [userId]: numValue },
      }));
    } else if (formType === "redistribute") {
      setRedistributeForm((prev) => ({
        ...prev,
        customShares: { ...prev.customShares, [userId]: numValue },
      }));
    }
  };

  // Handle participant toggle
  const handleParticipantToggle = (
    formType: "new" | "edit" | "redistribute",
    userId: string
  ) => {
    if (formType === "new") {
      setNewExpense((prev) => ({
        ...prev,
        participantUserIds: prev.participantUserIds.includes(userId)
          ? prev.participantUserIds.filter((id) => id !== userId)
          : [...prev.participantUserIds, userId],
        // Remove custom share if participant is unticked
        customShares: prev.customShares.hasOwnProperty(userId)
          ? (({ [userId]: removed, ...rest }) => rest)(prev.customShares)
          : prev.customShares,
      }));
    } else if (formType === "edit") {
      setEditExpense((prev) => ({
        ...prev,
        participantUserIds: prev.participantUserIds.includes(userId)
          ? prev.participantUserIds.filter((id) => id !== userId)
          : [...prev.participantUserIds, userId],
        customShares: prev.customShares.hasOwnProperty(userId)
          ? (({ [userId]: removed, ...rest }) => rest)(prev.customShares)
          : prev.customShares,
      }));
    } else if (formType === "redistribute") {
      setRedistributeForm((prev) => ({
        ...prev,
        participantUserIds: prev.participantUserIds.includes(userId)
          ? prev.participantUserIds.filter((id) => id !== userId)
          : [...prev.participantUserIds, userId],
        customShares: prev.customShares.hasOwnProperty(userId)
          ? (({ [userId]: removed, ...rest }) => rest)(prev.customShares)
          : prev.customShares,
      }));
    }
  };

  // Auto-distribute equal amounts for payments
  const autoDistributePayments = (formType: "new" | "edit") => {
    const currentForm = formType === "new" ? newExpense : editExpense;
    const setState = formType === "new" ? setNewExpense : setEditExpense;
    const totalAmount = Number.parseFloat(currentForm.amount) || 0;
    const numPayers = currentForm.payments.length;

    if (totalAmount > 0 && numPayers > 0) {
      const amountPerPayer = (totalAmount / numPayers).toFixed(2);
      setState((prev) => ({
        ...prev,
        payments: prev.payments.map((payment) => ({
          ...payment,
          amountPaid: amountPerPayer,
        })),
      }));
    }
  };

  // Auto-distribute equal shares for participants
  const autoDistributeShares = (formType: "new" | "edit" | "redistribute") => {
    const currentForm =
      formType === "new"
        ? newExpense
        : formType === "edit"
        ? editExpense
        : redistributeForm;
    const setState =
      formType === "new"
        ? setNewExpense
        : formType === "edit"
        ? setEditExpense
        : setRedistributeForm;

    const totalAmount =
      formType === "redistribute"
        ? selectedExpense?.amount || 0
        : Number.parseFloat(
            (formType === "new" ? newExpense : editExpense).amount
          ) || 0;
    const numParticipants = currentForm.participantUserIds.length;

    if (totalAmount > 0 && numParticipants > 0) {
      const newCustomShares: Record<string, number> = {};

      if (currentForm.splitType === "custom") {
        const amountPerParticipant = totalAmount / numParticipants;
        currentForm.participantUserIds.forEach((userId) => {
          newCustomShares[userId] = Number.parseFloat(
            amountPerParticipant.toFixed(2)
          );
        });
      } else if (currentForm.splitType === "percentage") {
        const percentagePerParticipant = 100 / numParticipants;
        currentForm.participantUserIds.forEach((userId) => {
          newCustomShares[userId] = Number.parseFloat(
            percentagePerParticipant.toFixed(2)
          );
        });
      }

      setState((prev) => ({
        ...prev,
        customShares: newCustomShares,
      }));
    }
  };

  // Render helper functions
  const renderLoadingSpinner = () => (
    <div className="flex justify-center items-center py-12">
      <div className="relative">
        <div className="animate-spin rounded-full h-10 w-10 xxs:h-12 xxs:w-12 border-4 border-slate-200 dark:border-slate-700"></div>
        <div className="animate-spin rounded-full h-10 w-10 xxs:h-12 xxs:w-12 border-4 border-blue-500 dark:border-blue-400 border-t-transparent absolute top-0 left-0"></div>
      </div>
      <p className="text-slate-700 dark:text-slate-300 text-base xxs:text-lg mt-4 font-medium ml-4">
        Loading...
      </p>
    </div>
  );

  const renderMessageBox = () => {
    if (!messageBox.show) return null;

    const iconMap = {
      info: (
        <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-blue-500 dark:text-blue-400" />
      ),
      success: (
        <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-green-500 dark:text-green-400" />
      ),
      error: (
        <XCircle className="h-7 w-7 sm:h-8 sm:w-8 text-red-500 dark:text-red-400" />
      ),
      confirm: (
        <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-amber-500 dark:text-amber-400" />
      ),
    };

    const bgColorMap = {
      info: "bg-blue-50/90 border-blue-200 text-blue-800 dark:bg-blue-950/90 dark:border-blue-800 dark:text-blue-200",
      success:
        "bg-green-50/90 border-green-200 text-green-800 dark:bg-green-950/90 dark:border-green-800 dark:text-green-200",
      error:
        "bg-red-50/90 border-red-200 text-red-800 dark:bg-red-950/90 dark:border-red-800 dark:text-red-200",
      confirm:
        "bg-amber-50/90 border-amber-200 text-amber-800 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-200",
    };

    const buttonColorMap = {
      info: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 dark:focus:ring-blue-400",
      success:
        "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:ring-green-500 dark:from-green-500 dark:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700 dark:focus:ring-green-400",
      error:
        "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500 dark:from-red-500 dark:to-red-600 dark:hover:from-red-600 dark:hover:to-red-700 dark:focus:ring-red-400",
      confirm:
        "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500 dark:from-red-500 dark:to-red-600 dark:hover:from-red-600 dark:hover:to-red-700 dark:focus:ring-red-400",
    };

    const buttonBaseClass =
      "px-4 py-2 xs:px-6 xs:py-3 rounded-lg xs:rounded-xl font-semibold transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg text-sm xs:text-base";

    return (
      <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div
          className={`max-w-xs xxs:max-w-sm xs:max-w-md w-full p-6 xs:p-8 rounded-2xl xs:rounded-3xl border-2 shadow-2xl ${
            bgColorMap[messageBox.type]
          } bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm transform transition-all duration-300 scale-100`}
        >
          <div className="flex flex-col items-center text-center space-y-4 xs:space-y-6">
            <div className="flex-shrink-0">{iconMap[messageBox.type]}</div>
            <div>
              <p className="text-base xs:text-lg font-semibold leading-relaxed">
                {messageBox.message}
              </p>
            </div>
            <div className="flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-4 w-full">
              {messageBox.type === "confirm" ? (
                <>
                  <button
                    onClick={messageBox.onCancel}
                    className={`${buttonBaseClass} flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 focus:ring-slate-400 dark:focus:ring-slate-500`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={messageBox.onConfirm}
                    className={`${buttonBaseClass} flex-1 text-white ${
                      buttonColorMap[messageBox.type]
                    }`}
                    disabled={
                      actionLoading.removeMember || actionLoading.deleteExpense
                    }
                  >
                    {(actionLoading.removeMember ||
                      actionLoading.deleteExpense) && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={messageBox.onConfirm}
                  className={`${buttonBaseClass} w-full text-white ${
                    buttonColorMap[messageBox.type]
                  }`}
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

  const renderExpensesTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-white/20 dark:border-slate-700/50 shadow-lg">
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search expenses..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Expenses List */}
      {loading.expenses ? (
        renderLoadingSpinner()
      ) : expenses.length === 0 ? (
        <div className="text-center py-8 sm:py-16">
          <DollarSign className="h-16 w-16 sm:h-20 sm:w-20 text-slate-300 dark:text-slate-600 mx-auto mb-4 sm:mb-6" />
          <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-medium">
            No expenses found.
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
            Try adjusting your filters or add a new expense.
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-5 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-white/20 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="flex-1 w-full sm:w-auto mb-4 sm:mb-0">
                  <div className="flex flex-col xxs:flex-row items-start xxs:items-center space-y-2 xxs:space-y-0 xxs:space-x-3 mb-3">
                    <h3 className="text-lg xs:text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent break-words max-w-[calc(100%-80px)] xxs:max-w-none">
                      {expense.description}
                    </h3>
                    <span className="px-2 py-0.5 xs:px-3 xs:py-1 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 text-white text-xs rounded-full font-semibold shadow-md shrink-0">
                      {expense.category}
                    </span>
                  </div>
                  <div className="text-2xl xs:text-3xl font-bold text-green-600 dark:text-green-400 mb-3">
                    ${expense.amount.toFixed(2)}
                  </div>
                  <div className="grid grid-cols-1 xxs:grid-cols-2 gap-2 xs:gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="font-semibold block sm:inline">
                        Paid by:
                      </span>{" "}
                      {getPayerNamesForDisplay(expense.payments)}
                    </div>
                    <div>
                      <span className="font-semibold block sm:inline">
                        Participants:
                      </span>{" "}
                      {getParticipantNamesForDisplay(expense.participants)}
                    </div>
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-500 font-medium">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 xs:space-x-2 mt-4 sm:mt-0 flex-shrink-0">
                  {(groupDetails?.creator_user_id === user?.id ||
                    expense.payments.some((p) => p.user_id === user?.id)) && (
                    <>
                      <button
                        onClick={() => prepareEditExpense(expense)}
                        className="p-2 xs:p-3 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg xs:rounded-xl transition-colors shadow-md bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm"
                        title="Edit expense"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => prepareRedistributeExpense(expense)}
                        className="p-2 xs:p-3 text-amber-500 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-lg xs:rounded-xl transition-colors shadow-md bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm"
                        title="Redistribute expense"
                      >
                        <Shuffle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          showMessageBox(
                            "confirm",
                            "Are you sure you want to delete this expense? This action cannot be undone.",
                            () => deleteExpense(expense.id)
                          )
                        }
                        className="p-2 xs:p-3 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg xs:rounded-xl transition-colors shadow-md bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm"
                        title="Delete expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderBalancesTab = () => (
    <div className="space-y-6">
      {loading.balances ? (
        renderLoadingSpinner()
      ) : balances.length === 0 ? (
        <div className="text-center py-8 sm:py-16">
          <TrendingUp className="h-16 w-16 sm:h-20 sm:w-20 text-slate-300 dark:text-slate-600 mx-auto mb-4 sm:mb-6" />
          <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-medium">
            No balance data available.
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
            Add expenses and members to see balances.
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {balances.map((balance) => (
            <div
              key={balance.user_id}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-5 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-white/20 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="flex-1 w-full sm:w-auto mb-4 sm:mb-0">
                  <h3 className="text-lg xs:text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-1.5 sm:mb-2">
                    {balance.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4 sm:mb-6 font-medium">
                    {balance.email}
                  </p>

                  <div className="grid grid-cols-1 xxs:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-6">
                    <div className="text-center p-3 xs:p-4 bg-green-50/80 dark:bg-green-950/80 backdrop-blur-sm rounded-lg xs:rounded-xl border border-green-200 dark:border-green-800">
                      <span className="block text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300 mb-0.5 sm:mb-1">
                        Total Paid
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                        ${balance.total_paid.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-center p-3 xs:p-4 bg-red-50/80 dark:bg-red-950/80 backdrop-blur-sm rounded-lg xs:rounded-xl border border-red-200 dark:border-red-800">
                      <span className="block text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300 mb-0.5 sm:mb-1">
                        Total Owed
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                        ${balance.total_owed.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-center p-3 xs:p-4 bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-lg xs:rounded-xl border border-slate-200 dark:border-slate-600">
                      <span className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-0.5 sm:mb-1">
                        Balance
                      </span>
                      <span
                        className={`text-xl sm:text-2xl font-bold ${
                          balance.balance > 0
                            ? "text-green-600 dark:text-green-400"
                            : balance.balance < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        ${Math.abs(balance.balance).toFixed(2)}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        {balance.balance > 0
                          ? "Should receive"
                          : balance.balance < 0
                          ? "Should pay"
                          : "Even"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Balance verification summary */}
          <div className="bg-blue-50/90 dark:bg-blue-950/90 backdrop-blur-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-blue-200 dark:border-blue-800 shadow-lg">
            <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2 text-base sm:text-lg">
              Balance Verification
            </h4>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">
                Total balance sum: $
                {balances.reduce((sum, b) => sum + b.balance, 0).toFixed(2)}
              </p>
              <p className="text-xs mt-1.5 font-semibold">
                {Math.abs(balances.reduce((sum, b) => sum + b.balance, 0)) <=
                0.01
                  ? "✓ System is balanced"
                  : "⚠ Balance discrepancy detected"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMembersTab = () => {
    const currentGroupDetails = groupDetails;

    if (!currentGroupDetails) {
      return renderLoadingSpinner();
    }

    const isCurrentUserCreator =
      currentGroupDetails.creator_user_id === user?.id;

    return (
      <div className="space-y-6">
        {loading.members ? (
          renderLoadingSpinner()
        ) : members.length === 0 ? (
          <div className="text-center py-8 sm:py-16">
            <UsersIcon className="h-16 w-16 sm:h-20 sm:w-20 text-slate-300 dark:text-slate-600 mx-auto mb-4 sm:mb-6" />
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-medium">
              No members found.
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
              Add members to get your group started.
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-5 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-white/20 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex flex-col xxs:flex-row items-start xxs:items-center space-y-1 xxs:space-y-0 xxs:space-x-3 mb-2 sm:mb-3">
                      <h3 className="text-lg xs:text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                        {member.name}
                      </h3>
                      {isCurrentUserCreator && member.id === user?.id && (
                        <span className="px-2 py-0.5 xs:px-3 xs:py-1 text-xxs xs:text-xs rounded-full bg-gradient-to-r from-purple-500 to-pink-600 dark:from-purple-400 dark:to-pink-500 text-white font-semibold shadow-md">
                          Creator
                        </span>
                      )}
                      {!isCurrentUserCreator && member.id === user?.id && (
                        <span className="px-2 py-0.5 xs:px-3 xs:py-1 text-xxs xs:text-xs rounded-full bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold shadow-md">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-2 sm:mb-3 font-medium">
                      {member.email}
                    </p>
                    <p className="text-xxs sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
                      Joined: {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1.5 xs:space-x-2">
                    {isCurrentUserCreator && member.id !== user?.id && (
                      <button
                        onClick={() =>
                          showMessageBox(
                            "confirm",
                            `Are you sure you want to remove ${member.name} from the group? This action cannot be undone.`,
                            () => removeMember(member.id)
                          )
                        }
                        className="p-2 xs:p-3 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg xs:rounded-xl transition-colors shadow-md bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm"
                        title="Remove member"
                        disabled={actionLoading.removeMember}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStatsTab = () => (
    <div className="space-y-6 sm:space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-white/20 dark:border-slate-700/50 shadow-lg sm:shadow-xl text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
            <DollarSign className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 sm:mb-2">
            Total Amount
          </p>
          <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            ${stats.totalAmount.toFixed(2)}
          </p>
        </div>
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-white/20 dark:border-slate-700/50 shadow-lg sm:shadow-xl text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
            <BarChart3 className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 sm:mb-2">
            Total Expenses
          </p>
          <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            {stats.totalCount}
          </p>
        </div>
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-white/20 dark:border-slate-700/50 shadow-lg sm:shadow-xl text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-400 dark:to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
            <TrendingUp className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 sm:mb-2">
            Average
          </p>
          <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            ${stats.averageAmount.toFixed(2)}
          </p>
        </div>
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-white/20 dark:border-slate-700/50 shadow-lg sm:shadow-xl text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-600 dark:from-orange-400 dark:to-red-500 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
            <PieChart className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 sm:mb-2">
            Categories
          </p>
          <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            {stats.categoriesCount}
          </p>
        </div>
      </div>

      {/* Categories Breakdown */}
      {categories.length > 0 && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-white/20 dark:border-slate-700/50 shadow-lg sm:shadow-xl">
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4 sm:mb-6">
            Expenses by Category
          </h3>
          <div className="space-y-4">
            {categories.map((category) => (
              <div
                key={category.category}
                className="flex flex-col xxs:flex-row justify-between items-start xxs:items-center p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-600 hover:shadow-lg transition-all duration-200"
              >
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 capitalize text-base sm:text-lg mb-1 xxs:mb-0">
                    {category.category}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {category.expenses_count} expenses
                  </p>
                </div>
                <div className="text-left xxs:text-right mt-3 xxs:mt-0">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-lg sm:text-xl">
                    ${category.total_amount.toFixed(2)}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Avg: ${category.average_amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Main render
  if (loading.group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950">
        <Navbar />
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderLoadingSpinner()}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950">
        <Navbar />
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50">
            <XCircle className="h-16 w-16 sm:h-20 sm:w-20 text-red-500 dark:text-red-400 mx-auto mb-4 sm:mb-6" />
            <p className="text-red-600 dark:text-red-400 text-base sm:text-lg font-medium">
              {error}
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-6 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!groupDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950">
        <Navbar />
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50">
            <AlertCircle className="h-16 w-16 sm:h-20 sm:w-20 text-amber-500 dark:text-amber-400 mx-auto mb-4 sm:mb-6" />
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg font-medium">
              Group not found or inaccessible.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-6 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 font-sans antialiased transition-colors duration-300">
      <Navbar />

      {/* Message Box */}
      {renderMessageBox()}

      {/* Main Content Container */}
      <div
        className="max-w-xxs mx-auto px-3
                   xs:max-w-sm xs:px-4
                   sm:max-w-md sm:px-6
                   md:max-w-2xl md:px-8
                   lg:max-w-4xl lg:px-10
                   xl:max-w-6xl xl:px-12
                   2xl:max-w-7xl 2xl:px-14
                   3xl:max-w-full 3xl:px-20
                   4xl:px-32 5xl:px-48 py-6 sm:py-8"
      >
        {/* Trial Status Banner */}
        {user?.isTrialActive &&
          new Date(user.trialEndsAt || 0) > new Date() && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-l-4 border-blue-500 dark:border-blue-400 text-blue-800 dark:text-blue-200 p-4 sm:p-6 mb-6 rounded-xl sm:rounded-2xl shadow-lg backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-start">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
                <div>
                  <p className="font-bold text-base sm:text-lg">
                    Free Trial Active!
                  </p>
                  <p className="text-xs sm:text-sm mt-1 leading-tight">
                    Your trial ends on:{" "}
                    <span className="font-semibold">
                      {new Date(user.trialEndsAt || "").toLocaleDateString(
                        "en-US"
                      )}
                      .
                    </span>{" "}
                    Enjoy premium features!
                  </p>
                  <p className="mt-2 text-xs sm:text-sm">
                    Upgrade anytime from the{" "}
                    <Link
                      to="/pricing"
                      className="underline font-semibold hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                    >
                      Pricing Page
                    </Link>{" "}
                    to continue uninterrupted service.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Expired Trial Banner */}
        {user?.isTrialActive &&
          new Date(user.trialEndsAt || 0) <= new Date() && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/50 dark:to-pink-950/50 border-l-4 border-red-500 dark:border-red-400 text-red-800 dark:text-red-200 p-4 sm:p-6 mb-6 rounded-xl sm:rounded-2xl shadow-lg backdrop-blur-sm border border-red-200/50 dark:border-red-800/50">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400 mr-3 mt-1" />
                <div>
                  <p className="font-bold text-base sm:text-lg">
                    Your Free Trial Has Expired!
                  </p>
                  <p className="text-xs sm:text-sm mt-1 leading-tight">
                    Please{" "}
                    <Link
                      to="/pricing"
                      className="underline font-semibold hover:text-red-900 dark:hover:text-red-100 transition-colors"
                    >
                      subscribe to a Pro plan
                    </Link>{" "}
                    to continue using all SplitEase features.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Group Header */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl xs:rounded-3xl shadow-xl xs:shadow-2xl border border-white/20 dark:border-slate-700/50 p-5 xs:p-8 mb-6 xs:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-3xl xs:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2 sm:mb-3">
                {groupDetails.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mb-4 sm:mb-6 text-sm xs:text-lg leading-relaxed">
                {groupDetails.description}
              </p>
              <div className="flex flex-wrap items-center gap-y-2 xxs:gap-y-0 gap-x-2 sm:gap-x-8 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center bg-slate-100 dark:bg-slate-700 px-2 py-1 xs:px-3 xs:py-2 rounded-lg">
                  <UsersIcon className="h-3 w-3 xs:h-4 xs:w-4 mr-1.5 xs:mr-2 text-slate-500 dark:text-slate-400" />
                  {groupDetails.memberCount} members
                </span>
                <span className="flex items-center bg-slate-100 dark:bg-slate-700 px-2 py-1 xs:px-3 xs:py-2 rounded-lg">
                  <DollarSign className="h-3 w-3 xs:h-4 xs:w-4 mr-1.5 xs:mr-2 text-slate-500 dark:text-slate-400" />
                  {groupDetails.expensesCount} expenses
                </span>
                <span className="flex items-center bg-slate-100 dark:bg-slate-700 px-2 py-1 xs:px-3 xs:py-2 rounded-lg">
                  <TrendingUp className="h-3 w-3 xs:h-4 xs:w-4 mr-1.5 xs:mr-2 text-slate-500 dark:text-slate-400" />
                  ${groupDetails.totalAmount.toFixed(2)} total
                </span>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-x-2 gap-y-2 mt-4 sm:mt-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 sm:px-6 sm:py-3 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg sm:rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-semibold text-sm"
              >
                <Filter className="h-4 w-4 mr-1.5" />
                Filters
              </button>
              {groupDetails.creator_user_id === user?.id && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center px-4 py-2 sm:px-6 sm:py-3 text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 rounded-lg sm:rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors font-semibold text-sm"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Add Member
                </button>
              )}
              <button
                onClick={() => setShowAddExpense(true)}
                className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 font-semibold text-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Expense
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl xs:rounded-3xl shadow-xl xs:shadow-2xl border border-white/20 dark:border-slate-700/50 mb-6 xs:mb-8">
          <div className="border-b border-slate-200/50 dark:border-slate-700/50">
            <nav className="flex flex-wrap justify-center xs:justify-start gap-x-4 xxs:gap-x-6 sm:gap-x-8 px-4 xs:px-6 sm:px-8 overflow-x-auto">
              {[
                { id: "expenses", label: "Expenses", icon: DollarSign },
                { id: "balances", label: "Balances", icon: TrendingUp },
                { id: "members", label: "Members", icon: UsersIcon },
                { id: "stats", label: "Statistics", icon: BarChart3 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center py-4 sm:py-6 px-1 xxs:px-2 border-b-4 font-semibold text-xs xs:text-sm transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  <tab.icon className="h-3 w-3 xs:h-4 xs:w-4 mr-1 xs:mr-3" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-8">
            {activeTab === "expenses" && renderExpensesTab()}
            {activeTab === "balances" && renderBalancesTab()}
            {activeTab === "members" && renderMembersTab()}
            {activeTab === "stats" && renderStatsTab()}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl xs:rounded-3xl shadow-2xl max-w-sm xxs:max-w-full xs:max-w-md md:max-w-xl lg:max-w-2xl w-full max-h-[95vh] overflow-y-auto border border-white/20 dark:border-slate-700/50">
            <div className="p-5 xs:p-8 border-b border-slate-200/50 dark:border-slate-700/50">
              <h2 className="text-xl xs:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Add New Expense
              </h2>
            </div>
            <form
              onSubmit={addExpense}
              className="p-5 xs:p-8 space-y-4 sm:space-y-6"
            >
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) =>
                      setNewExpense((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
                    placeholder="Enter expense description"
                    required
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
                    value={newExpense.amount}
                    onChange={(e) =>
                      setNewExpense((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) =>
                    setNewExpense((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Who Paid */}
              <div>
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center mb-3">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 xs:mb-0">
                    Who Paid? *
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => autoDistributePayments("new")}
                      className="text-xs px-2.5 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors font-semibold"
                    >
                      Auto-distribute
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPayment("new")}
                      className="text-xs px-2.5 py-1.5 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors font-semibold"
                    >
                      Add Payer
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {newExpense.payments.map((payment, index) => (
                    <div
                      key={index}
                      className="flex flex-col xxs:flex-row space-y-2 xxs:space-y-0 xxs:space-x-3 items-stretch xxs:items-center"
                    >
                      <select
                        value={payment.userId}
                        onChange={(e) =>
                          handlePaymentChange(
                            "new",
                            index,
                            "userId",
                            e.target.value
                          )
                        }
                        className="flex-1 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
                        required
                      >
                        <option value="">Select member</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payment.amountPaid}
                        onChange={(e) =>
                          handlePaymentChange(
                            "new",
                            index,
                            "amountPaid",
                            e.target.value
                          )
                        }
                        className="w-full xxs:w-28 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
                        placeholder="0.00"
                        required
                      />
                      {newExpense.payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePayment("new", index)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Total paid: $
                  {calculateTotalPaid(newExpense.payments).toFixed(2)}
                  {newExpense.amount &&
                    Math.abs(
                      calculateTotalPaid(newExpense.payments) -
                        Number.parseFloat(newExpense.amount)
                    ) > 0.01 && (
                      <span className="text-red-600 dark:text-red-400 ml-2 font-semibold text-xs">
                        (Must equal $
                        {Number.parseFloat(newExpense.amount).toFixed(2)})
                      </span>
                    )}
                </div>
              </div>

              {/* Split Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  How to Split?
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { value: "equal", label: "Equal Split", icon: Calculator },
                    {
                      value: "custom",
                      label: "Custom Amounts",
                      icon: DollarSign,
                    },
                    {
                      value: "percentage",
                      label: "Percentages",
                      icon: Percent,
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setNewExpense((prev) => ({
                          ...prev,
                          splitType: option.value as SplitType,
                          customShares: {},
                        }))
                      }
                      className={`flex items-center px-3 py-2 rounded-lg border-2 transition-all duration-200 font-semibold text-xs whitespace-nowrap ${
                        newExpense.splitType === option.value
                          ? "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                          : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
                      }`}
                    >
                      <option.icon className="h-3 w-3 mr-1" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Participants */}
              <div>
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center mb-3">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 xs:mb-0">
                    Participants *
                  </label>
                  {newExpense.splitType !== "equal" && (
                    <button
                      type="button"
                      onClick={() => autoDistributeShares("new")}
                      className="text-xs px-2.5 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors font-semibold"
                    >
                      Auto-distribute
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3 p-3 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={newExpense.participantUserIds.includes(
                          member.id
                        )}
                        onChange={() =>
                          handleParticipantToggle("new", member.id)
                        }
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-slate-300 dark:border-slate-500 rounded"
                      />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {member.name}
                      </span>
                      {newExpense.splitType !== "equal" &&
                        newExpense.participantUserIds.includes(member.id) && (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newExpense.customShares[member.id] || ""}
                            onChange={(e) =>
                              handleCustomShareChange(
                                "new",
                                member.id,
                                e.target.value
                              )
                            }
                            className="w-20 px-2 py-1 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-xs text-slate-700 dark:text-slate-200"
                            placeholder={
                              newExpense.splitType === "percentage" ? "%" : "$"
                            }
                          />
                        )}
                    </div>
                  ))}
                </div>
                {newExpense.splitType !== "equal" && (
                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Total:{" "}
                    {newExpense.splitType === "custom"
                      ? `$${calculateCustomSharesTotal(
                          newExpense.customShares
                        ).toFixed(2)}`
                      : `${calculateCustomSharesTotal(
                          newExpense.customShares
                        ).toFixed(2)}%`}
                    {newExpense.splitType === "custom" &&
                      newExpense.amount &&
                      Math.abs(
                        calculateCustomSharesTotal(newExpense.customShares) -
                          Number.parseFloat(newExpense.amount)
                      ) > 0.01 && (
                        <span className="text-red-600 dark:text-red-400 ml-2 font-semibold text-xs">
                          (Must equal $
                          {Number.parseFloat(newExpense.amount).toFixed(2)})
                        </span>
                      )}
                    {newExpense.splitType === "percentage" &&
                      Math.abs(
                        calculateCustomSharesTotal(newExpense.customShares) -
                          100
                      ) > 0.01 && (
                        <span className="text-red-600 dark:text-red-400 ml-2 font-semibold text-xs">
                          (Must equal 100%)
                        </span>
                      )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="px-4 py-2 sm:px-6 sm:py-3 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.addExpense}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold text-sm"
                >
                  {actionLoading.addExpense && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl xs:rounded-3xl shadow-2xl max-w-sm xxs:max-w-full xs:max-w-md w-full mx-4 border border-white/20 dark:border-slate-700/50">
            <div className="p-5 xs:p-8 border-b border-slate-200/50 dark:border-slate-700/50">
              <h2 className="text-xl xs:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Add Member
              </h2>
            </div>
            <form onSubmit={addMember} className="p-5 xs:p-8">
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
                  placeholder="Enter member's email"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 sm:px-6 sm:py-3 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.addMember}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold text-sm"
                >
                  {actionLoading.addMember && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditExpense && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl xs:rounded-3xl shadow-2xl max-w-sm xxs:max-w-full xs:max-w-md md:max-w-xl lg:max-w-2xl w-full max-h-[95vh] overflow-y-auto border border-white/20 dark:border-slate-700/50">
            <div className="p-5 xs:p-8 border-b border-slate-200/50 dark:border-slate-700/50">
              <h2 className="text-xl xs:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Edit Expense
              </h2>
            </div>
            <form
              onSubmit={editExpenseHandler}
              className="p-5 xs:p-8 space-y-4 sm:space-y-6"
            >
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={editExpense.description}
                    onChange={(e) =>
                      setEditExpense((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
                    placeholder="Enter expense description"
                    required
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
                    value={editExpense.amount}
                    onChange={(e) =>
                      setEditExpense((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={editExpense.category}
                  onChange={(e) =>
                    setEditExpense((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Who Paid */}
              <div>
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center mb-3">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 xs:mb-0">
                    Who Paid? *
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => autoDistributePayments("edit")}
                      className="text-xs px-2.5 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors font-semibold"
                    >
                      Auto-distribute
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPayment("edit")}
                      className="text-xs px-2.5 py-1.5 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors font-semibold"
                    >
                      Add Payer
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {editExpense.payments.map((payment, index) => (
                    <div
                      key={index}
                      className="flex flex-col xxs:flex-row space-y-2 xxs:space-y-0 xxs:space-x-3 items-stretch xxs:items-center"
                    >
                      <select
                        value={payment.userId}
                        onChange={(e) =>
                          handlePaymentChange(
                            "edit",
                            index,
                            "userId",
                            e.target.value
                          )
                        }
                        className="flex-1 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
                        required
                      >
                        <option value="">Select member</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={payment.amountPaid}
                        onChange={(e) =>
                          handlePaymentChange(
                            "edit",
                            index,
                            "amountPaid",
                            e.target.value
                          )
                        }
                        className="w-full xxs:w-28 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm text-slate-700 dark:text-slate-200"
                        placeholder="0.00"
                        required
                      />
                      {editExpense.payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePayment("edit", index)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Total paid: $
                  {calculateTotalPaid(editExpense.payments).toFixed(2)}
                  {editExpense.amount &&
                    Math.abs(
                      calculateTotalPaid(editExpense.payments) -
                        Number.parseFloat(editExpense.amount)
                    ) > 0.01 && (
                      <span className="text-red-600 dark:text-red-400 ml-2 font-semibold text-xs">
                        (Must equal $
                        {Number.parseFloat(editExpense.amount).toFixed(2)})
                      </span>
                    )}
                </div>
              </div>

              {/* Split Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  How to Split?
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { value: "equal", label: "Equal Split", icon: Calculator },
                    {
                      value: "custom",
                      label: "Custom Amounts",
                      icon: DollarSign,
                    },
                    {
                      value: "percentage",
                      label: "Percentages",
                      icon: Percent,
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setEditExpense((prev) => ({
                          ...prev,
                          splitType: option.value as SplitType,
                          customShares: {},
                        }))
                      }
                      className={`flex items-center px-3 py-2 rounded-lg border-2 transition-all duration-200 font-semibold text-xs whitespace-nowrap ${
                        editExpense.splitType === option.value
                          ? "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                          : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
                      }`}
                    >
                      <option.icon className="h-3 w-3 mr-1" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Participants */}
              <div>
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center mb-3">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 xs:mb-0">
                    Participants *
                  </label>
                  {editExpense.splitType !== "equal" && (
                    <button
                      type="button"
                      onClick={() => autoDistributeShares("edit")}
                      className="text-xs px-2.5 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors font-semibold"
                    >
                      Auto-distribute
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3 p-3 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={editExpense.participantUserIds.includes(
                          member.id
                        )}
                        onChange={() =>
                          handleParticipantToggle("edit", member.id)
                        }
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-slate-300 dark:border-slate-500 rounded"
                      />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {member.name}
                      </span>
                      {editExpense.splitType !== "equal" &&
                        editExpense.participantUserIds.includes(member.id) && (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editExpense.customShares[member.id] || ""}
                            onChange={(e) =>
                              handleCustomShareChange(
                                "edit",
                                member.id,
                                e.target.value
                              )
                            }
                            className="w-20 px-2 py-1 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-xs text-slate-700 dark:text-slate-200"
                            placeholder={
                              editExpense.splitType === "percentage" ? "%" : "$"
                            }
                          />
                        )}
                    </div>
                  ))}
                </div>
                {editExpense.splitType !== "equal" && (
                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Total:{" "}
                    {editExpense.splitType === "custom"
                      ? `$${calculateCustomSharesTotal(
                          editExpense.customShares
                        ).toFixed(2)}`
                      : `${calculateCustomSharesTotal(
                          editExpense.customShares
                        ).toFixed(2)}%`}
                    {editExpense.splitType === "custom" &&
                      editExpense.amount &&
                      Math.abs(
                        calculateCustomSharesTotal(editExpense.customShares) -
                          Number.parseFloat(editExpense.amount)
                      ) > 0.01 && (
                        <span className="text-red-600 dark:text-red-400 ml-2 font-semibold text-xs">
                          (Must equal $
                          {Number.parseFloat(editExpense.amount).toFixed(2)})
                        </span>
                      )}
                    {editExpense.splitType === "percentage" &&
                      Math.abs(
                        calculateCustomSharesTotal(editExpense.customShares) -
                          100
                      ) > 0.01 && (
                        <span className="text-red-600 dark:text-red-400 ml-2 font-semibold text-xs">
                          (Must equal 100%)
                        </span>
                      )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowEditExpense(false)}
                  className="px-4 py-2 sm:px-6 sm:py-3 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.editExpense}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold text-sm"
                >
                  {actionLoading.editExpense && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redistribute Expense Modal */}
      {showRedistributeExpense && selectedExpense && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl xs:rounded-3xl shadow-2xl max-w-sm xxs:max-w-full xs:max-w-md w-full mx-4 max-h-[95vh] overflow-y-auto border border-white/20 dark:border-slate-700/50">
            <div className="p-5 xs:p-8 border-b border-slate-200/50 dark:border-slate-700/50">
              <h2 className="text-xl xs:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Redistribute Expense
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1.5">
                "{selectedExpense.description}" - $
                {selectedExpense.amount.toFixed(2)}
              </p>
            </div>
            <form
              onSubmit={redistributeExpense}
              className="p-5 xs:p-8 space-y-4 sm:space-y-6"
            >
              {/* Split Type for Redistribution */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  How to Redistribute?
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { value: "equal", label: "Equal Split", icon: Calculator },
                    {
                      value: "custom",
                      label: "Custom Amounts",
                      icon: DollarSign,
                    },
                    {
                      value: "percentage",
                      label: "Percentages",
                      icon: Percent,
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setRedistributeForm((prev) => ({
                          ...prev,
                          splitType: option.value as SplitType,
                          customShares: {},
                        }))
                      }
                      className={`flex items-center px-3 py-2 rounded-lg border-2 transition-all duration-200 font-semibold text-xs whitespace-nowrap ${
                        redistributeForm.splitType === option.value
                          ? "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                          : "bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
                      }`}
                    >
                      <option.icon className="h-3 w-3 mr-1" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Participants for Redistribution */}
              <div>
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center mb-3">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 xs:mb-0">
                    Participants *
                  </label>
                  {redistributeForm.splitType !== "equal" && (
                    <button
                      type="button"
                      onClick={() => autoDistributeShares("redistribute")}
                      className="text-xs px-2.5 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors font-semibold"
                    >
                      Auto-distribute
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3 p-3 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={redistributeForm.participantUserIds.includes(
                          member.id
                        )}
                        onChange={() =>
                          handleParticipantToggle("redistribute", member.id)
                        }
                        className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-slate-300 dark:border-slate-500 rounded"
                      />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {member.name}
                      </span>
                      {redistributeForm.splitType !== "equal" &&
                        redistributeForm.participantUserIds.includes(
                          member.id
                        ) && (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={
                              redistributeForm.customShares[member.id] || ""
                            }
                            onChange={(e) =>
                              handleCustomShareChange(
                                "redistribute",
                                member.id,
                                e.target.value
                              )
                            }
                            className="w-20 px-2 py-1 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-xs text-slate-700 dark:text-slate-200"
                            placeholder={
                              redistributeForm.splitType === "percentage"
                                ? "%"
                                : "$"
                            }
                          />
                        )}
                    </div>
                  ))}
                </div>
                {redistributeForm.splitType !== "equal" && (
                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Total:{" "}
                    {redistributeForm.splitType === "custom"
                      ? `$${calculateCustomSharesTotal(
                          redistributeForm.customShares
                        ).toFixed(2)}`
                      : `${calculateCustomSharesTotal(
                          redistributeForm.customShares
                        ).toFixed(2)}%`}
                    {redistributeForm.splitType === "custom" &&
                      selectedExpense.amount &&
                      Math.abs(
                        calculateCustomSharesTotal(
                          redistributeForm.customShares
                        ) - selectedExpense.amount
                      ) > 0.01 && (
                        <span className="text-red-600 dark:text-red-400 ml-2 font-semibold text-xs">
                          (Must equal ${selectedExpense.amount.toFixed(2)})
                        </span>
                      )}
                    {redistributeForm.splitType === "percentage" &&
                      Math.abs(
                        calculateCustomSharesTotal(
                          redistributeForm.customShares
                        ) - 100
                      ) > 0.01 && (
                        <span className="text-red-600 dark:text-red-400 ml-2 font-semibold text-xs">
                          (Must equal 100%)
                        </span>
                      )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowRedistributeExpense(false)}
                  className="px-4 py-2 sm:px-6 sm:py-3 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.redistributeExpense}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold text-sm"
                >
                  {actionLoading.redistributeExpense && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  Redistribute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
