import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, api } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import {
  Plus,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  UserPlus,
  AlertCircle,
  RefreshCw,
  Edit,
  Trash2,
  XCircle,
  CheckCircle,
  Eye,
  Star,
  Zap, // Added Zap icon for potential future use or alternative for trial
  Shield, // Added Shield icon for potential future use or alternative for subscription
} from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  role: string;
  creator_user_id: string;
  memberCount: number;
  expensesCount: number;
  totalAmount: number;
  created_at: string;
}

interface DashboardStats {
  totalGroups: number;
  totalExpenses: number;
  totalAmount: number;
  totalMembers: number;
}

interface RecentActivity {
  id: string;
  type: "expense" | "group" | "member";
  description: string;
  amount?: number;
  group_name: string;
  created_at: string;
  actor_name?: string;
}

type MessageBoxType = "info" | "success" | "error" | "confirm";

export default function DashboardEnhanced() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalGroups: 0,
    totalExpenses: 0,
    totalAmount: 0,
    totalMembers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "created" | "expenses" | "amount"
  >("created");

  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
  });
  const [editGroupForm, setEditGroupForm] = useState({
    id: "",
    name: "",
    description: "",
  });

  const [loading, setLoading] = useState({
    groups: true,
    stats: true,
    activity: true,
  });
  const [isLoadingInitialDashboardData, setIsLoadingInitialDashboardData] =
    useState(true);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [error, setError] = useState("");
  const [activityError, setActivityError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const [messageBox, setMessageBox] = useState({
    show: false,
    type: "info" as MessageBoxType,
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showMessageBox = useCallback(
    (
      type: MessageBoxType,
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

  useEffect(() => {
    if (!authLoading) {
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
    }
  }, [user, navigate, authLoading]);

  const fetchGroups = useCallback(
    async (isRetry = false) => {
      if (!user) {
        setLoading((prev) => ({ ...prev, groups: false }));
        return;
      }

      if (!isRetry) {
        setLoading((prev) => ({ ...prev, groups: true }));
        setError("");
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await api.get("/groups", {
          signal: controller.signal,
          timeout: 10000,
        });

        clearTimeout(timeoutId);

        if (!Array.isArray(response.data)) {
          throw new Error("Invalid response format: expected array of groups");
        }

        setGroups(response.data);
        setRetryCount(0);

        const totalGroups = response.data.length;
        const totalExpenses = response.data.reduce(
          (sum: number, group: Group) => sum + (group.expensesCount || 0),
          0
        );
        const totalAmount = response.data.reduce(
          (sum: number, group: Group) => sum + (group.totalAmount || 0),
          0
        );
        const totalMembers = response.data.reduce(
          (sum: number, group: Group) => sum + (group.memberCount || 0),
          0
        );

        setStats({
          totalGroups,
          totalExpenses,
          totalAmount,
          totalMembers,
        });
      } catch (err: any) {
        let errorMessage = "Failed to load groups.";

        if (err.name === "AbortError") {
          errorMessage =
            "Request timed out. Please check your connection and try again.";
        } else if (err.response) {
          const status = err.response.status;
          const serverMessage = err.response.data?.message;

          switch (status) {
            case 401:
              errorMessage = "Authentication failed. Please log in again.";
              navigate("/login");
              return;
            case 403:
              errorMessage = "Access denied. Please check your subscription.";
              navigate("/pricing");
              return;
            case 500:
              errorMessage =
                serverMessage || "Server error. Please try again later.";
              break;
            case 502:
            case 503:
            case 504:
              errorMessage =
                "Service temporarily unavailable. Please try again.";
              break;
            default:
              errorMessage =
                serverMessage || `Server error (${status}). Please try again.`;
          }
        } else if (err.request) {
          errorMessage =
            "Network error. Please check your internet connection.";
        } else {
          errorMessage = err.message || "An unexpected error occurred.";
        }

        setError(errorMessage);

        if (retryCount < 3 && (err.response?.status >= 500 || !err.response)) {
          setRetryCount((prev) => prev + 1);
          setTimeout(() => fetchGroups(true), 2000 * (retryCount + 1));
        }
      } finally {
        setLoading((prev) => ({ ...prev, groups: false }));
      }
    },
    [user, navigate, retryCount]
  );

  const generateFallbackActivity = useCallback(
    (groupsData: Group[]): RecentActivity[] => {
      const fallbackActivities: RecentActivity[] = [];

      groupsData
        .filter((group) => {
          const groupAge = Date.now() - new Date(group.created_at).getTime();
          return groupAge < 7 * 24 * 60 * 60 * 1000; // Last 7 days
        })
        .slice(0, 5) // Limit to 5 recent groups for fallback
        .forEach((group) => {
          fallbackActivities.push({
            id: `fallback_group_${group.id}`,
            type: "group",
            description: `Group "${group.name}" was created`,
            group_name: group.name,
            created_at: group.created_at,
          });

          if (group.expensesCount > 0) {
            fallbackActivities.push({
              id: `fallback_expense_${group.id}`,
              type: "expense",
              description: `${group.expensesCount} expense${
                group.expensesCount > 1 ? "s" : ""
              } in "${group.name}"`,
              amount: group.totalAmount,
              group_name: group.name,
              created_at: group.created_at,
            });
          }
        });

      return fallbackActivities
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 10); // Ensure max 10 activities
    },
    []
  );

  const fetchRecentActivity = useCallback(async () => {
    if (!user) {
      setLoading((prev) => ({ ...prev, activity: false }));
      return;
    }

    setLoading((prev) => ({ ...prev, activity: true }));
    setActivityError("");

    try {
      // Assuming '/activity/recent' is your endpoint for recent activities
      const response = await api.get("/activity/recent?limit=10", {
        timeout: 3000,
      });

      if (Array.isArray(response.data)) {
        setRecentActivity(response.data);
      } else {
        // Fallback if the API returns non-array or empty
        setRecentActivity(generateFallbackActivity(groups));
      }
    } catch (err: any) {
      // Always fall back on error
      setRecentActivity(generateFallbackActivity(groups));
      if (err.response?.status === 404) {
        setActivityError("Using simplified activity view (404)");
      } else if (err.response?.status >= 500) {
        setActivityError("Activity service temporarily unavailable (5xx)");
      } else {
        setActivityError("Using offline activity view (network/other error)");
      }
    } finally {
      setLoading((prev) => ({ ...prev, activity: false }));
    }
  }, [user, groups, generateFallbackActivity]); // Added groups to dependencies

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!authLoading && user) {
        setIsLoadingInitialDashboardData(true);
        // Fetch groups first, as activity might depend on them for fallback
        await fetchGroups();
        setIsLoadingInitialDashboardData(false);
      } else if (!authLoading && !user) {
        setIsLoadingInitialDashboardData(false);
      }
    };
    loadDashboardData();
  }, [authLoading, user, fetchGroups]);

  useEffect(() => {
    // Fetch recent activity only after groups are loaded and initial dashboard data is ready
    if (
      !isLoadingInitialDashboardData &&
      !loading.groups &&
      groups.length >= 0 // Ensure groups data is available for fallback
    ) {
      fetchRecentActivity();
    }
  }, [
    isLoadingInitialDashboardData,
    loading.groups,
    groups, // Dependency to re-run if groups change
    fetchRecentActivity,
  ]);

  const handleRetry = () => {
    setRetryCount(0);
    setError(""); // Clear previous error
    setActivityError(""); // Clear previous activity error
    fetchGroups();
    fetchRecentActivity();
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupForm.name.trim()) {
      showMessageBox("error", "Group name is required.");
      return;
    }

    setCreatingGroup(true);
    setError(""); // Clear any general dashboard errors

    try {
      const response = await api.post("/groups", {
        name: groupForm.name.trim(),
        description: groupForm.description.trim() || undefined,
      });

      // Optimistically update groups list
      setGroups([response.data.group, ...groups]);
      setGroupForm({ name: "", description: "" });
      setShowCreateGroup(false);

      setStats((prev) => ({
        ...prev,
        totalGroups: prev.totalGroups + 1,
      }));

      showMessageBox("success", "Group created successfully!");
      // Refetch activity after a small delay to allow server processing
      setTimeout(() => fetchRecentActivity(), 1000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Failed to create group.";
      showMessageBox("error", errorMessage);

      if (err.response && err.response.status === 403) {
        navigate("/pricing"); // Redirect to pricing if unathorized
      }
    } finally {
      setCreatingGroup(false);
    }
  };

  const prepareEditGroup = useCallback((group: Group) => {
    setSelectedGroup(group);
    setEditGroupForm({
      id: group.id,
      name: typeof group.name === "string" ? group.name : "",
      description:
        typeof group.description === "string" ? group.description : "",
    });
    setShowEditGroup(true);
  }, []);

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    const newName = editGroupForm.name?.trim();
    const newDescription = editGroupForm.description?.trim();

    if (!newName) {
      showMessageBox("error", "Group name is required.");
      return;
    }
    if (!selectedGroup) {
      showMessageBox("error", "No group selected for editing.");
      return;
    }

    setEditingGroup(true);

    try {
      const response = await api.put(`/groups/${selectedGroup.id}`, {
        name: newName,
        description: newDescription || undefined,
      });

      setGroups(
        groups.map((g) =>
          g.id === selectedGroup.id
            ? {
                ...g,
                name: response.data.group.name,
                description: response.data.group.description,
              }
            : g
        )
      );

      setShowEditGroup(false);
      setSelectedGroup(null);
      showMessageBox("success", "Group updated successfully!");
      setTimeout(() => fetchRecentActivity(), 1000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Failed to update group.";
      showMessageBox("error", errorMessage);
    } finally {
      setEditingGroup(false);
    }
  };

  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      setDeletingGroup(true);
      try {
        await api.delete(`/groups/${groupId}`);
        setGroups(groups.filter((g) => g.id !== groupId));
        setStats((prev) => ({
          ...prev,
          totalGroups: prev.totalGroups - 1,
        }));
        showMessageBox("success", "Group deleted successfully!");
        setTimeout(() => fetchRecentActivity(), 1000);
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || "Failed to delete group.";
        showMessageBox("error", errorMessage);
      } finally {
        setDeletingGroup(false);
      }
    },
    [groups, showMessageBox, fetchRecentActivity]
  );

  const filteredAndSortedGroups = groups
    .filter(
      (group) =>
        searchTerm === "" ||
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.description &&
          group.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "expenses":
          return (b.expensesCount || 0) - (a.expensesCount || 0);
        case "amount":
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        case "created":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "expense":
        return (
          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
        );
      case "group":
        return <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "member":
        return (
          <UserPlus className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        );
      default:
        return (
          <Activity className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        );
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString("en-US");
  };

  const renderMessageBox = () => {
    if (!messageBox.show) return null;

    const iconMap = {
      info: (
        <AlertCircle className="h-8 w-8 text-blue-500 dark:text-blue-400" />
      ),
      success: (
        <CheckCircle className="h-8 w-8 text-green-500 dark:text-green-400" />
      ),
      error: <XCircle className="h-8 w-8 text-red-500 dark:text-red-400" />,
      confirm: (
        <AlertCircle className="h-8 w-8 text-amber-500 dark:text-amber-400" />
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
      "px-4 py-2 xs:px-6 xs:py-3 rounded-xl font-semibold transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg text-white"; // Added text-white here for consistency

    return (
      <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div
          className={`max-w-xs xs:max-w-md w-full p-6 xs:p-8 rounded-3xl border-2 shadow-2xl ${
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
                    className={`${buttonBaseClass} flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300 focus:ring-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={messageBox.onConfirm}
                    className={`${buttonBaseClass} flex-1 ${
                      buttonColorMap[messageBox.type]
                    }`}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={messageBox.onConfirm}
                  className={`${buttonBaseClass} w-full ${
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

  if (authLoading || isLoadingInitialDashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-700"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 dark:border-blue-400 border-t-transparent absolute top-0 left-0"></div>
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-lg mt-6 font-medium">
              Loading dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // This check should remain, but the initial loading state handles the visual
  if (
    !user ||
    (!user.isSubscribed &&
      (!user.isTrialActive || new Date(user.trialEndsAt || 0) <= new Date()))
  ) {
    // Optionally render a minimal message or redirect quickly without full dashboard load
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 font-sans antialiased transition-colors duration-300">
      <Navbar />
      {renderMessageBox()}
      <div className="max-w-xs mx-auto px-2 sm:max-w-sm md:max-w-xl lg:max-w-3xl xl:max-w-5xl 2xl:max-w-7xl 3xl:max-w-full 3xl:px-16 4xl:px-24 5xl:px-32 py-4 xs:py-8">
        {/* Trial Status Banner */}
        {user.isTrialActive && new Date(user.trialEndsAt || 0) > new Date() && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-l-4 border-blue-500 dark:border-blue-400 text-blue-800 dark:text-blue-200 p-4 sm:p-6 mb-6 sm:mb-8 rounded-xl sm:rounded-2xl shadow-lg backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50">
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
                  </span>
                  <br className="sm:hidden" /> Enjoy premium features!
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

        {/* Trial Expired Banner */}
        {user.isTrialActive &&
          new Date(user.trialEndsAt || 0) <= new Date() && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/50 dark:to-pink-950/50 border-l-4 border-red-500 dark:border-red-400 text-red-800 dark:text-red-200 p-4 sm:p-6 mb-6 sm:mb-8 rounded-xl sm:rounded-2xl shadow-lg backdrop-blur-sm border border-red-200/50 dark:border-red-800/50">
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 xs:mb-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-6 xs:p-8 rounded-2xl xs:rounded-3xl shadow-xl xs:shadow-2xl border border-white/20 dark:border-slate-700/50">
          <div>
            <h1 className="text-3xl xs:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2 xs:mb-3">
              Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm xs:text-lg leading-relaxed">
              Welcome{" "}
              <span className="font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                {user.name}
              </span>
              , here's a summary of your groups.
            </p>
          </div>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="mt-4 sm:mt-0 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl flex items-center space-x-2 sm:space-x-3 hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 font-semibold text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Error Message for Groups Fetch */}
        {error && (
          <div className="bg-red-50/90 dark:bg-red-950/90 backdrop-blur-sm border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl mb-6 xs:mb-8 shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-center text-center sm:text-left mb-2 sm:mb-0">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                <span className="font-medium text-sm sm:text-base">
                  {error}
                </span>
              </div>
              <button
                onClick={handleRetry}
                className="flex items-center space-x-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium transition-colors bg-red-100 dark:bg-red-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl hover:bg-red-200 dark:hover:bg-red-800 text-sm"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        <div className="min-h-[50vh]">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl border border-white/20 dark:border-slate-700/50 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="flex items-center">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 rounded-xl sm:rounded-2xl shadow-lg">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="ml-4 sm:ml-6">
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Groups
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    {stats.totalGroups}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl border border-white/20 dark:border-slate-700/50 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="flex items-center">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 rounded-xl sm:rounded-2xl shadow-lg">
                  <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="ml-4 sm:ml-6">
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Total Expenses
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    ${stats.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl border border-white/20 dark:border-slate-700/50 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="flex items-center">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-400 dark:to-pink-500 rounded-xl sm:rounded-2xl shadow-lg">
                  <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="ml-4 sm:ml-6">
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Transactions
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    {stats.totalExpenses}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl border border-white/20 dark:border-slate-700/50 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="flex items-center">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-orange-500 to-red-600 dark:from-orange-400 dark:to-red-500 rounded-xl sm:rounded-2xl shadow-lg">
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div className="ml-4 sm:ml-6">
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Total Members
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    {stats.totalMembers}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Groups Section & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-white/20 dark:border-slate-700/50">
                <div className="p-6 sm:p-8 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4 sm:mb-0">
                    Your Groups
                  </h2>
                  <div className="flex flex-col xs:flex-row items-center space-y-2 xs:space-y-0 xs:space-x-4 w-full sm:w-auto">
                    <button
                      onClick={() =>
                        setViewMode(viewMode === "grid" ? "list" : "grid")
                      }
                      className="p-2 sm:p-3 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg sm:rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/50 w-full xs:w-auto"
                      title={
                        viewMode === "grid"
                          ? "Switch to List View"
                          : "Switch to Grid View"
                      }
                    >
                      {viewMode === "grid" ? (
                        <BarChart3 className="h-5 w-5 mx-auto" />
                      ) : (
                        <PieChart className="h-5 w-5 mx-auto" />
                      )}
                    </button>
                    <div className="flex-1 relative w-full">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search groups..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 sm:pl-12 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm"
                      />
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(
                          e.target.value as
                            | "name"
                            | "created"
                            | "expenses"
                            | "amount"
                        )
                      }
                      className="px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm w-full xs:w-auto"
                    >
                      <option value="created">Sort by Created</option>
                      <option value="name">Sort by Name</option>
                      <option value="expenses">Sort by Expenses</option>
                      <option value="amount">Sort by Amount</option>
                    </select>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  {filteredAndSortedGroups.length === 0 && !error && (
                    <div className="text-center py-8 sm:py-16">
                      <Users className="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-slate-300 dark:text-slate-600 mb-4 sm:mb-6" />
                      <h3 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
                        No groups found
                      </h3>
                      <p className="mt-2 text-slate-500 dark:text-slate-400 text-base sm:text-lg">
                        {searchTerm
                          ? "Try adjusting your search terms."
                          : "Get started by creating your first group."}
                      </p>
                      {!searchTerm && (
                        <div className="mt-6 sm:mt-8">
                          <button
                            onClick={() => setShowCreateGroup(true)}
                            className="inline-flex items-center px-6 py-3 sm:px-8 sm:py-4 border border-transparent shadow-lg text-base sm:text-lg font-semibold rounded-xl sm:rounded-2xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
                          >
                            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                            Create Group
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {filteredAndSortedGroups.length > 0 && (
                    <div
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
                          : "space-y-4"
                      }
                    >
                      {filteredAndSortedGroups.map((group) => (
                        <div
                          key={group.id}
                          className="relative bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-2 border-white/20 dark:border-slate-600/50 rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-md sm:shadow-xl hover:shadow-2xl transition-all duration-300 group transform hover:-translate-y-1"
                        >
                          <Link
                            to={`/groups/${group.id}`}
                            className="absolute inset-0 z-0"
                          ></Link>

                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                              <h3 className="font-bold text-lg sm:text-xl bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent truncate pr-8 sm:pr-10">
                                {group.name}
                              </h3>
                              {group.creator_user_id === user?.id && (
                                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 text-white shadow-md">
                                  Creator
                                </span>
                              )}
                              {group.creator_user_id !== user?.id && (
                                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300">
                                  Member
                                </span>
                              )}
                            </div>
                            {group.description && (
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-4 sm:mb-6 line-clamp-2 leading-relaxed">
                                {group.description}
                              </p>
                            )}
                            <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm border-t border-slate-200/50 dark:border-slate-600/50 pt-4">
                              <div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">
                                  Members
                                </p>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-base sm:text-lg">
                                  {group.memberCount}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">
                                  Expenses
                                </p>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-base sm:text-lg">
                                  {group.expensesCount}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">
                                  Total
                                </p>
                                <p className="font-bold text-green-600 dark:text-green-400 text-base sm:text-lg">
                                  ${group.totalAmount.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="absolute top-3 right-3 flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                            {group.creator_user_id === user?.id && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation(); // Prevent Link navigation
                                    prepareEditGroup(group);
                                  }}
                                  className="p-1.5 sm:p-2 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full transition-colors shadow-sm sm:shadow-lg bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm"
                                  title="Edit Group"
                                >
                                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation(); // Prevent Link navigation
                                    showMessageBox(
                                      "confirm",
                                      `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
                                      () => handleDeleteGroup(group.id) // Pass the actual delete function
                                    );
                                  }}
                                  className="p-1.5 sm:p-2 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-colors shadow-sm sm:shadow-lg bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm"
                                  title="Delete Group"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                              </>
                            )}
                            <Link
                              to={`/groups/${group.id}`}
                              onClick={(e) => e.stopPropagation()} // Prevent double navigation from parent Link
                              className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full transition-colors shadow-sm sm:shadow-lg bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm"
                              title="View Group Details"
                            >
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity Section */}
            <div className="lg:col-span-1">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-white/20 dark:border-slate-700/50">
                <div className="p-6 sm:p-8 border-b border-slate-200/50 dark:border-slate-700/50">
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent flex items-center">
                    Recent Activity
                    {activityError && (
                      <span className="text-xs text-amber-700 dark:text-amber-200 bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded-full font-medium ml-2 flex items-center">
                        <AlertCircle className="inline h-3 w-3 mr-1" />
                        {activityError}
                      </span>
                    )}
                  </h2>
                </div>
                <div className="p-6 sm:p-8">
                  {loading.activity ? (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-4 border-slate-200 dark:border-slate-700"></div>
                        <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-4 border-blue-500 dark:border-blue-400 border-t-transparent absolute top-0 left-0"></div>
                      </div>
                      <span className="text-slate-600 dark:text-slate-400 mt-4 font-medium text-sm sm:text-base">
                        Loading activity...
                      </span>
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <Clock className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-slate-300 dark:text-slate-600 mb-4 sm:mb-6" />
                      <p className="mt-2 text-base sm:text-lg text-slate-500 dark:text-slate-400 font-medium">
                        No recent activity
                      </p>
                      <p className="text-xxs sm:text-sm text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                        Activity will appear here as you use SplitEase
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 sm:space-y-6">
                      {recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/20 dark:border-slate-600/50 hover:shadow-lg transition-all duration-200"
                        >
                          <div className="flex-shrink-0 p-2 sm:p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-lg sm:rounded-xl shadow-sm">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-semibold leading-relaxed">
                              {activity.description}
                            </p>
                            <p className="text-xxs sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                              <span className="font-semibold">
                                {activity.group_name}
                              </span>{" "}
                              • {formatRelativeTime(activity.created_at)}
                            </p>
                          </div>
                          {activity.amount !== undefined &&
                            activity.amount !== null && (
                              <div className="flex-shrink-0">
                                <span className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">
                                  ${activity.amount.toFixed(2)}
                                </span>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl max-w-xs sm:max-w-md w-full p-6 sm:p-8 shadow-2xl transform transition-all duration-300 scale-100 border border-white/20 dark:border-slate-700/50">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4 sm:mb-6">
                Create New Group
              </h2>
              <form onSubmit={createGroup}>
                <div className="mb-4 sm:mb-6">
                  <label
                    htmlFor="groupName"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="groupName"
                    value={groupForm.name}
                    onChange={(e) =>
                      setGroupForm({ ...groupForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-slate-800 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm"
                    placeholder="e.g., Weekend Trip, Family Budget"
                    required
                  />
                </div>
                <div className="mb-6 sm:mb-8">
                  <label
                    htmlFor="groupDescription"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Description (Optional)
                  </label>
                  <textarea
                    id="groupDescription"
                    value={groupForm.description}
                    onChange={(e) =>
                      setGroupForm({
                        ...groupForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-slate-800 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm"
                    placeholder="A brief description of this group's purpose"
                    rows={3}
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateGroup(false);
                      setGroupForm({ name: "", description: "" });
                      setError("");
                    }}
                    className="px-4 py-2 sm:px-6 sm:py-3 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingGroup}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 transform hover:-translate-y-0.5 font-semibold text-sm"
                  >
                    {creatingGroup && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    {creatingGroup ? "Creating..." : "Create Group"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Group Modal */}
        {showEditGroup && selectedGroup && (
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl max-w-xs sm:max-w-md w-full p-6 sm:p-8 shadow-2xl transform transition-all duration-300 scale-100 border border-white/20 dark:border-slate-700/50">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4 sm:mb-6">
                Edit Group
              </h2>
              <form onSubmit={handleEditGroup}>
                <div className="mb-4 sm:mb-6">
                  <label
                    htmlFor="editGroupName"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="editGroupName"
                    value={editGroupForm.name}
                    onChange={(e) =>
                      setEditGroupForm({
                        ...editGroupForm,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-slate-800 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm"
                    placeholder="Enter group name"
                    required
                  />
                </div>
                <div className="mb-6 sm:mb-8">
                  <label
                    htmlFor="editGroupDescription"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Description (Optional)
                  </label>
                  <textarea
                    id="editGroupDescription"
                    value={editGroupForm.description}
                    onChange={(e) =>
                      setEditGroupForm({
                        ...editGroupForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-slate-800 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-sm"
                    placeholder="A brief description of this group's purpose"
                    rows={3}
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditGroup(false);
                      setSelectedGroup(null);
                    }}
                    className="px-4 py-2 sm:px-6 sm:py-3 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editingGroup}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 transform hover:-translate-y-0.5 font-semibold text-sm"
                  >
                    {editingGroup && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    {editingGroup ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
