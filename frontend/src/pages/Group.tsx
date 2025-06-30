import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  MoreVertical,
  Shuffle,
  Percent,
  Calculator,
  UserCheck,
  UserX,
  Star,
  Shield,
  Zap,
} from "lucide-react";

// Interfaces
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
    deleteGroup: false,
    removeMember: false,
    updateGroup: false,
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
      const response = await api.get(`/groups/${groupId}`);
      setGroupDetails(response.data);
    } catch (err: any) {
      console.error("Failed to fetch group details:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to load group details.";
      setError(errorMessage);

      if (err.response?.status === 403) {
        navigate("/dashboard");
      } else if (err.response?.status === 404) {
        showMessageBox("error", "Group not found. Redirecting to dashboard...");
        setTimeout(() => navigate("/dashboard"), 2000);
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
      console.log(`🔍 FRONTEND: Fetching balances for group ${groupId}`);
      const response = await api.get(`/expenses/${groupId}/balances`);

      console.log("🔍 FRONTEND: Raw API response:", response.data);
      console.log("🔍 FRONTEND: Balances array:", response.data.balances);

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

          console.log(`🔍 FRONTEND: Processed ${processed.name}:`, {
            paid: processed.total_paid,
            owed: processed.total_owed,
            balance: processed.balance,
          });

          return processed;
        });

        setBalances(processedBalances);
        console.log("🔍 FRONTEND: Final balances state:", processedBalances);
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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200"></div>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
      </div>
    </div>
  );

  const renderMessageBox = () => {
    if (!messageBox.show) return null;

    const iconMap = {
      info: <AlertCircle className="h-8 w-8 text-blue-500" />,
      success: <CheckCircle className="h-8 w-8 text-green-500" />,
      error: <XCircle className="h-8 w-8 text-red-500" />,
      confirm: <AlertCircle className="h-8 w-8 text-amber-500" />,
    };

    const bgColorMap = {
      info: "bg-blue-50/90 border-blue-200 text-blue-800",
      success: "bg-green-50/90 border-green-200 text-green-800",
      error: "bg-red-50/90 border-red-200 text-red-800",
      confirm: "bg-amber-50/90 border-amber-200 text-amber-800",
    };

    const buttonColorMap = {
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div
          className={`max-w-md w-full p-8 rounded-3xl border-2 shadow-2xl ${
            bgColorMap[messageBox.type]
          } bg-white/90 backdrop-blur-sm transform transition-all duration-300 scale-100`}
        >
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="flex-shrink-0">{iconMap[messageBox.type]}</div>
            <div>
              <p className="text-lg font-semibold leading-relaxed">
                {messageBox.message}
              </p>
            </div>
            <div className="flex space-x-4 w-full">
              {messageBox.type === "confirm" ? (
                <>
                  <button
                    onClick={messageBox.onCancel}
                    className={`${buttonBaseClass} flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300 focus:ring-slate-400`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={messageBox.onConfirm}
                    className={`${buttonBaseClass} flex-1 text-white ${
                      buttonColorMap[messageBox.type]
                    } focus:ring-red-500`}
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
                  } focus:ring-opacity-50`}
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
        <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border-2 border-white/20 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
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
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search expenses..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Expenses List */}
      {loading.expenses ? (
        renderLoadingSpinner()
      ) : expenses.length === 0 ? (
        <div className="text-center py-16">
          <DollarSign className="h-20 w-20 text-slate-300 mx-auto mb-6" />
          <p className="text-slate-500 text-lg font-medium">
            No expenses found.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border-2 border-white/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      {expense.description}
                    </h3>
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs rounded-full font-semibold shadow-lg">
                      {expense.category}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-green-600 mb-4">
                    ${expense.amount.toFixed(2)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                    <div>
                      <span className="font-semibold">Paid by:</span>{" "}
                      {getPayerNamesForDisplay(expense.payments)}
                    </div>
                    <div>
                      <span className="font-semibold">Participants:</span>{" "}
                      {getParticipantNamesForDisplay(expense.participants)}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-500 font-medium">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {(groupDetails?.creator_user_id === user?.id ||
                    expense.payments.some((p) => p.user_id === user?.id)) && (
                    <>
                      <button
                        onClick={() => prepareEditExpense(expense)}
                        className="p-3 text-blue-500 hover:bg-blue-100 rounded-xl transition-colors shadow-lg bg-white/80 backdrop-blur-sm"
                        title="Edit expense"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => prepareRedistributeExpense(expense)}
                        className="p-3 text-amber-500 hover:bg-amber-100 rounded-xl transition-colors shadow-lg bg-white/80 backdrop-blur-sm"
                        title="Redistribute expense"
                      >
                        <Shuffle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          showMessageBox(
                            "confirm",
                            "Are you sure you want to delete this expense?",
                            () => deleteExpense(expense.id)
                          )
                        }
                        className="p-3 text-red-500 hover:bg-red-100 rounded-xl transition-colors shadow-lg bg-white/80 backdrop-blur-sm"
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
        <div className="text-center py-16">
          <TrendingUp className="h-20 w-20 text-slate-300 mx-auto mb-6" />
          <p className="text-slate-500 text-lg font-medium">
            No balance data available.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {balances.map((balance) => (
            <div
              key={balance.user_id}
              className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border-2 border-white/20 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
                    {balance.name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-6 font-medium">
                    {balance.email}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-green-50/80 backdrop-blur-sm rounded-xl border border-green-200">
                      <span className="block text-sm font-semibold text-green-700 mb-1">
                        Total Paid
                      </span>
                      <span className="text-2xl font-bold text-green-600">
                        ${balance.total_paid.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-center p-4 bg-red-50/80 backdrop-blur-sm rounded-xl border border-red-200">
                      <span className="block text-sm font-semibold text-red-700 mb-1">
                        Total Owed
                      </span>
                      <span className="text-2xl font-bold text-red-600">
                        ${balance.total_owed.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-center p-4 bg-slate-50/80 backdrop-blur-sm rounded-xl border border-slate-200">
                      <span className="block text-sm font-semibold text-slate-700 mb-1">
                        Balance
                      </span>
                      <span
                        className={`text-2xl font-bold ${
                          balance.balance > 0
                            ? "text-green-600"
                            : balance.balance < 0
                            ? "text-red-600"
                            : "text-slate-600"
                        }`}
                      >
                        ${Math.abs(balance.balance).toFixed(2)}
                      </span>
                      <span className="block text-sm text-slate-500 mt-1 font-medium">
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
          <div className="bg-blue-50/90 backdrop-blur-sm p-6 rounded-2xl border-2 border-blue-200 shadow-lg">
            <h4 className="font-bold text-blue-900 mb-3 text-lg">
              Balance Verification
            </h4>
            <div className="text-sm text-blue-800">
              <p className="font-medium">
                Total balance sum: $
                {balances.reduce((sum, b) => sum + b.balance, 0).toFixed(2)}
              </p>
              <p className="text-xs mt-2 font-semibold">
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
          <div className="text-center py-16">
            <UsersIcon className="h-20 w-20 text-slate-300 mx-auto mb-6" />
            <p className="text-slate-500 text-lg font-medium">
              No members found.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border-2 border-white/20 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                        {member.name}
                      </h3>
                      {isCurrentUserCreator && member.id === user?.id && (
                        <span className="px-3 py-1 text-xs rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold shadow-lg">
                          Creator
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mb-3 font-medium">
                      {member.email}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      Joined: {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isCurrentUserCreator && member.id !== user?.id && (
                      <button
                        onClick={() =>
                          showMessageBox(
                            "confirm",
                            `Are you sure you want to remove ${member.name} from the group?`,
                            () => removeMember(member.id)
                          )
                        }
                        className="p-3 text-red-500 hover:bg-red-100 rounded-xl transition-colors shadow-lg bg-white/80 backdrop-blur-sm"
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
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border-2 border-white/20 shadow-xl text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <DollarSign className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Total Amount
          </p>
          <p className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            ${stats.totalAmount.toFixed(2)}
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border-2 border-white/20 shadow-xl text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Total Expenses
          </p>
          <p className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {stats.totalCount}
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border-2 border-white/20 shadow-xl text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Average
          </p>
          <p className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            ${stats.averageAmount.toFixed(2)}
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border-2 border-white/20 shadow-xl text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <PieChart className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Categories
          </p>
          <p className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {stats.categoriesCount}
          </p>
        </div>
      </div>

      {/* Categories Breakdown */}
      {categories.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border-2 border-white/20 shadow-xl">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
            Expenses by Category
          </h3>
          <div className="space-y-4">
            {categories.map((category) => (
              <div
                key={category.category}
                className="flex justify-between items-center p-6 bg-slate-50/80 backdrop-blur-sm rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-200"
              >
                <div>
                  <h4 className="font-bold text-slate-900 capitalize text-lg">
                    {category.category}
                  </h4>
                  <p className="text-sm text-slate-500 font-medium">
                    {category.expenses_count} expenses
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 text-xl">
                    ${category.total_amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-500 font-medium">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderLoadingSpinner()}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <XCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
            <p className="text-red-600 text-lg font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!groupDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <AlertCircle className="h-20 w-20 text-amber-500 mx-auto mb-6" />
            <p className="text-slate-600 text-lg font-medium">
              Group not found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      {/* Message Box */}
      {renderMessageBox()}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Group Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
                {groupDetails.name}
              </h1>
              <p className="text-slate-600 mb-6 text-lg leading-relaxed">
                {groupDetails.description}
              </p>
              <div className="flex items-center space-x-8 text-sm text-slate-500">
                <span className="flex items-center bg-slate-100 px-3 py-2 rounded-xl">
                  <UsersIcon className="h-4 w-4 mr-2" />
                  {groupDetails.memberCount} members
                </span>
                <span className="flex items-center bg-slate-100 px-3 py-2 rounded-xl">
                  <DollarSign className="h-4 w-4 mr-2" />
                  {groupDetails.expensesCount} expenses
                </span>
                <span className="flex items-center bg-slate-100 px-3 py-2 rounded-xl">
                  <TrendingUp className="h-4 w-4 mr-2" />$
                  {groupDetails.totalAmount.toFixed(2)} total
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-6 py-3 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-semibold"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
              {groupDetails.creator_user_id === user?.id && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center px-6 py-3 text-blue-600 bg-blue-100 rounded-xl hover:bg-blue-200 transition-colors font-semibold"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </button>
              )}
              <button
                onClick={() => setShowAddExpense(true)}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 mb-8">
          <div className="border-b border-slate-200/50">
            <nav className="flex space-x-8 px-8">
              {[
                { id: "expenses", label: "Expenses", icon: DollarSign },
                { id: "balances", label: "Balances", icon: TrendingUp },
                { id: "members", label: "Members", icon: UsersIcon },
                { id: "stats", label: "Statistics", icon: BarChart3 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center py-6 px-2 border-b-4 font-semibold text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-3" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {activeTab === "expenses" && renderExpensesTab()}
            {activeTab === "balances" && renderBalancesTab()}
            {activeTab === "members" && renderMembersTab()}
            {activeTab === "stats" && renderStatsTab()}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="p-8 border-b border-slate-200/50">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Add New Expense
              </h2>
            </div>
            <form onSubmit={addExpense} className="p-8 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
                    placeholder="Enter expense description"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
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
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Who Paid? *
                  </label>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => autoDistributePayments("new")}
                      className="text-xs px-3 py-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors font-semibold"
                    >
                      Auto-distribute
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPayment("new")}
                      className="text-xs px-3 py-2 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-colors font-semibold"
                    >
                      Add Payer
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {newExpense.payments.map((payment, index) => (
                    <div key={index} className="flex space-x-4">
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
                        className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
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
                        className="w-32 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
                        placeholder="0.00"
                        required
                      />
                      {newExpense.payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePayment("new", index)}
                          className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm text-slate-600 font-medium">
                  Total paid: $
                  {calculateTotalPaid(newExpense.payments).toFixed(2)}
                  {newExpense.amount &&
                    Math.abs(
                      calculateTotalPaid(newExpense.payments) -
                        Number.parseFloat(newExpense.amount)
                    ) > 0.01 && (
                      <span className="text-red-600 ml-2 font-semibold">
                        (Must equal $
                        {Number.parseFloat(newExpense.amount).toFixed(2)})
                      </span>
                    )}
                </div>
              </div>

              {/* Split Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-4">
                  How to Split?
                </label>
                <div className="flex space-x-4 mb-6">
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
                      className={`flex items-center px-6 py-3 rounded-xl border-2 transition-all duration-200 font-semibold ${
                        newExpense.splitType === option.value
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <option.icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Participants */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Participants *
                  </label>
                  {newExpense.splitType !== "equal" && (
                    <button
                      type="button"
                      onClick={() => autoDistributeShares("new")}
                      className="text-xs px-3 py-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors font-semibold"
                    >
                      Auto-distribute
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={newExpense.participantUserIds.includes(
                          member.id
                        )}
                        onChange={() =>
                          handleParticipantToggle("new", member.id)
                        }
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                      />
                      <span className="flex-1 text-sm text-slate-700 font-medium">
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
                            className="w-24 px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
                            placeholder={
                              newExpense.splitType === "percentage" ? "%" : "$"
                            }
                          />
                        )}
                    </div>
                  ))}
                </div>
                {newExpense.splitType !== "equal" && (
                  <div className="mt-3 text-sm text-slate-600 font-medium">
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
                        <span className="text-red-600 ml-2 font-semibold">
                          (Must equal $
                          {Number.parseFloat(newExpense.amount).toFixed(2)})
                        </span>
                      )}
                    {newExpense.splitType === "percentage" &&
                      Math.abs(
                        calculateCustomSharesTotal(newExpense.customShares) -
                          100
                      ) > 0.01 && (
                        <span className="text-red-600 ml-2 font-semibold">
                          (Must equal 100%)
                        </span>
                      )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-8 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="px-6 py-3 text-slate-700 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.addExpense}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl max-w-md w-full mx-4 border border-white/20">
            <div className="p-8 border-b border-slate-200/50">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Add Member
              </h2>
            </div>
            <form onSubmit={addMember} className="p-8">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
                  placeholder="Enter member's email"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-6 py-3 text-slate-700 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.addMember}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="p-8 border-b border-slate-200/50">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Edit Expense
              </h2>
            </div>
            <form onSubmit={editExpenseHandler} className="p-8 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
                    placeholder="Enter expense description"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
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
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Who Paid? *
                  </label>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => autoDistributePayments("edit")}
                      className="text-xs px-3 py-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors font-semibold"
                    >
                      Auto-distribute
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPayment("edit")}
                      className="text-xs px-3 py-2 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-colors font-semibold"
                    >
                      Add Payer
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {editExpense.payments.map((payment, index) => (
                    <div key={index} className="flex space-x-4">
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
                        className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
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
                        className="w-32 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
                        placeholder="0.00"
                        required
                      />
                      {editExpense.payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePayment("edit", index)}
                          className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm text-slate-600 font-medium">
                  Total paid: $
                  {calculateTotalPaid(editExpense.payments).toFixed(2)}
                  {editExpense.amount &&
                    Math.abs(
                      calculateTotalPaid(editExpense.payments) -
                        Number.parseFloat(editExpense.amount)
                    ) > 0.01 && (
                      <span className="text-red-600 ml-2 font-semibold">
                        (Must equal $
                        {Number.parseFloat(editExpense.amount).toFixed(2)})
                      </span>
                    )}
                </div>
              </div>

              {/* Split Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-4">
                  How to Split?
                </label>
                <div className="flex space-x-4 mb-6">
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
                      className={`flex items-center px-6 py-3 rounded-xl border-2 transition-all duration-200 font-semibold ${
                        editExpense.splitType === option.value
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <option.icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Participants */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Participants *
                  </label>
                  {editExpense.splitType !== "equal" && (
                    <button
                      type="button"
                      onClick={() => autoDistributeShares("edit")}
                      className="text-xs px-3 py-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors font-semibold"
                    >
                      Auto-distribute
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={editExpense.participantUserIds.includes(
                          member.id
                        )}
                        onChange={() =>
                          handleParticipantToggle("edit", member.id)
                        }
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                      />
                      <span className="flex-1 text-sm text-slate-700 font-medium">
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
                            className="w-24 px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
                            placeholder={
                              editExpense.splitType === "percentage" ? "%" : "$"
                            }
                          />
                        )}
                    </div>
                  ))}
                </div>
                {editExpense.splitType !== "equal" && (
                  <div className="mt-3 text-sm text-slate-600 font-medium">
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
                        <span className="text-red-600 ml-2 font-semibold">
                          (Must equal $
                          {Number.parseFloat(editExpense.amount).toFixed(2)})
                        </span>
                      )}
                    {editExpense.splitType === "percentage" &&
                      Math.abs(
                        calculateCustomSharesTotal(editExpense.customShares) -
                          100
                      ) > 0.01 && (
                        <span className="text-red-600 ml-2 font-semibold">
                          (Must equal 100%)
                        </span>
                      )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-8 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setShowEditExpense(false)}
                  className="px-6 py-3 text-slate-700 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.editExpense}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="p-8 border-b border-slate-200/50">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Redistribute Expense
              </h2>
              <p className="text-slate-600 text-sm mt-2">
                "{selectedExpense.description}" - $
                {selectedExpense.amount.toFixed(2)}
              </p>
            </div>
            <form onSubmit={redistributeExpense} className="p-8 space-y-6">
              {/* Split Type for Redistribution */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-4">
                  How to Redistribute?
                </label>
                <div className="flex space-x-4 mb-6">
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
                      className={`flex items-center px-4 py-2 rounded-xl border-2 transition-all duration-200 font-semibold text-xs ${
                        redistributeForm.splitType === option.value
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
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
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Participants *
                  </label>
                  {redistributeForm.splitType !== "equal" && (
                    <button
                      type="button"
                      onClick={() => autoDistributeShares("redistribute")}
                      className="text-xs px-3 py-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors font-semibold"
                    >
                      Auto-distribute
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3 p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={redistributeForm.participantUserIds.includes(
                          member.id
                        )}
                        onChange={() =>
                          handleParticipantToggle("redistribute", member.id)
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                      />
                      <span className="flex-1 text-sm text-slate-700 font-medium">
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
                            className="w-20 px-2 py-1 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm text-xs"
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
                  <div className="mt-3 text-sm text-slate-600 font-medium">
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
                        <span className="text-red-600 ml-2 font-semibold">
                          (Must equal ${selectedExpense.amount.toFixed(2)})
                        </span>
                      )}
                    {redistributeForm.splitType === "percentage" &&
                      Math.abs(
                        calculateCustomSharesTotal(
                          redistributeForm.customShares
                        ) - 100
                      ) > 0.01 && (
                        <span className="text-red-600 ml-2 font-semibold">
                          (Must equal 100%)
                        </span>
                      )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setShowRedistributeExpense(false)}
                  className="px-6 py-3 text-slate-700 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading.redistributeExpense}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold"
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

