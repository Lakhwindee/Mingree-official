import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Briefcase,
  Scale,
  ArrowUpRight,
  CreditCard,
  Landmark,
  MapPin,
  Sliders,
  Tag,
  FileSpreadsheet,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Lock,
  ExternalLink,
  Clock,
  Check,
  Ban,
  Building2,
  Wallet,
  Receipt,
  ArrowUpDown,
  ShieldCheck,
  UserCheck,
  Sparkles,
  History,
} from "lucide-react";

type AdminTabId =
  | "overview"
  | "users"
  | "risk-review"
  | "campaigns-deals"
  | "disputes"
  | "withdrawals"
  | "payments"
  | "cities"
  | "settings"
  | "promo-codes-pro"
  | "audit-log";

type CampaignsSubTab = "campaigns" | "manual_check" | "artist_silent";

interface NavItem {
  id: AdminTabId;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Core",
    items: [
      { id: "overview", label: "Overview", shortDesc: "Platform metrics, queues & reconciliation", icon: LayoutDashboard },
    ],
  },
  {
    title: "Marketplace & Trust",
    items: [
      { id: "users", label: "Users", shortDesc: "Creators, sponsors & access control", icon: Users },
      { id: "risk-review", label: "Risk Review", shortDesc: "Follower burst & anomaly screening", icon: ShieldAlert },
      { id: "campaigns-deals", label: "Campaigns & Deals", shortDesc: "Active campaigns & post verification", icon: Briefcase },
      { id: "disputes", label: "Disputes", shortDesc: "Escrow arbitration & settlement", icon: Scale },
    ],
  },
  {
    title: "Treasury & Ledger",
    items: [
      { id: "withdrawals", label: "Withdrawals", shortDesc: "Creator payouts & UTR settlement", icon: CreditCard },
      { id: "payments", label: "Payments & Ledger", shortDesc: "UPI verifications & immutable ledger", icon: Landmark },
    ],
  },
  {
    title: "Governance & Config",
    items: [
      { id: "cities", label: "Cities", shortDesc: "Regional availability & relocations", icon: MapPin },
      { id: "settings", label: "Settings", shortDesc: "Take rates, GST & operational rules", icon: Sliders },
      { id: "promo-codes-pro", label: "Promo Codes & Pro", shortDesc: "Incentives & Creator Pro subscriptions", icon: Tag },
      { id: "audit-log", label: "Audit Log", shortDesc: "Immutable administrative event trail", icon: FileSpreadsheet },
    ],
  },
];

const allNavItems: NavItem[] = navSections.flatMap((s) => s.items);

function formatINR(value: number | string | undefined | null): string {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "₹0";
  return `₹${num.toLocaleString("en-IN")}`;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
  const [campaignsSubTab, setCampaignsSubTab] = useState<CampaignsSubTab>("campaigns");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch lightweight overview counts so sidebar can display subtle live queue indicators
  const { data: overviewSummary } = useQuery({
    queryKey: ["/api/admin/overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/overview");
      if (!res.ok) throw new Error("Failed to load admin overview");
      return res.json();
    },
  });

  const needs = overviewSummary?.needsAttention || {};

  const getBadgeCountForTab = (id: AdminTabId): number => {
    switch (id) {
      case "risk-review":
        return Number(needs.riskReviewCount || 0);
      case "campaigns-deals":
        return Number(needs.manualCheckDealsCount || 0) + Number(needs.silentArtistDealsCount || 0);
      case "disputes":
        return Number(needs.disputesCount || 0);
      case "withdrawals":
        return Number(needs.pendingWithdrawalsCount || 0);
      case "payments":
        return Number(needs.pendingUpiCount || 0);
      case "cities":
        return Number(needs.pendingCityRequestsCount || 0);
      default:
        return 0;
    }
  };

  const handleNavigate = (tab: AdminTabId, subTab?: CampaignsSubTab) => {
    setActiveTab(tab);
    if (subTab) {
      setCampaignsSubTab(subTab);
    }
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      queryClient.clear();
      toast.success("Admin signed out");
      setLocation("/admin");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const activeNavMeta = allNavItems.find((item) => item.id === activeTab) || allNavItems[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased selection:bg-pink-500/15 selection:text-pink-900">
      {/* Top Enterprise Header */}
      <header className="h-14 bg-white border-b border-slate-200/90 sticky top-0 z-40 px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-xs tracking-tight relative">
              M
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#FF3399] ring-2 ring-white" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-900 tracking-tight">Mingree</span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-medium text-slate-500">Admin Console</span>
              <span className="hidden md:inline-block text-slate-300">/</span>
              <span className="hidden md:inline-block text-xs font-semibold text-slate-800">
                {activeNavMeta.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {user?.email && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-700 truncate max-w-[180px]">{user.email}</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium text-xs hidden sm:inline-flex gap-1.5 shadow-none"
            onClick={() => setLocation("/dashboard")}
          >
            <span>Creator Workspace</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 font-medium text-xs inline-flex items-center gap-1.5 shadow-none transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Enterprise Compact Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-30 w-60 bg-white border-r border-slate-200/90 flex flex-col
            transform transition-transform duration-150 ease-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="px-2.5 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </p>
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const badgeCount = getBadgeCountForTab(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavigate(item.id)}
                        className={`group relative w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors ${
                          isActive
                            ? "bg-slate-100/90 text-slate-950 font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[#FF3399]" />
                        )}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? "text-[#FF3399]"
                                : "text-slate-400 group-hover:text-slate-600"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {badgeCount > 0 && (
                          <span
                            className={`ml-2 px-1.5 py-0.5 text-[10px] font-mono tabular-nums font-semibold rounded ${
                              isActive
                                ? "bg-[#FF3399] text-white"
                                : "bg-amber-50 text-amber-800 border border-amber-200/80"
                            }`}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span className="font-medium text-slate-700">Escrow Status</span>
              {overviewSummary?.escrowInvariant?.isOk !== false ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Reconciled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  Variance
                </span>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#F8FAFC]">
          <div className="max-w-[1360px] mx-auto space-y-6">
            {activeTab === "overview" && (
              <OverviewPage onNavigate={(tab, subTab) => handleNavigate(tab as AdminTabId, subTab)} />
            )}
            {activeTab === "users" && <UsersPage />}
            {activeTab === "risk-review" && <RiskReviewPage />}
            {activeTab === "campaigns-deals" && (
              <CampaignsDealsPage activeSubTab={campaignsSubTab} onSubTabChange={setCampaignsSubTab} />
            )}
            {activeTab === "disputes" && <DisputesPage />}
            {activeTab === "withdrawals" && <WithdrawalsPage />}
            {activeTab === "payments" && <PaymentsPage />}
            {activeTab === "cities" && <CitiesPage />}
            {activeTab === "settings" && <SettingsPage />}
            {activeTab === "promo-codes-pro" && <PromoCodesProPage />}
            {activeTab === "audit-log" && <AuditLogPage />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================= 1. OVERVIEW PAGE ================= */
function OverviewPage({
  onNavigate,
}: {
  onNavigate: (tab: AdminTabId, subTab?: CampaignsSubTab) => void;
}) {
  const { data: overview, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["/api/admin/overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/overview");
      if (!res.ok) throw new Error("Failed to load admin overview");
      return res.json();
    },
  });

  if (isLoading) return <LoadingSpinner label="Loading platform telemetry and treasury verification..." />;
  if (isError) return <ErrorAlert onRetry={() => refetch()} message="Could not connect to overview backend service" />;

  const needs = overview?.needsAttention || {};
  const escrowCheck = overview?.escrowInvariant || { isOk: true, artistDetails: [] };

  const operationalQueues = [
    {
      id: "risk-review",
      label: "Risk Review",
      category: "Trust & Safety",
      description: "Creators flagged for follower bursts, anomalies, or manual compliance checks",
      count: Number(needs.riskReviewCount || 0),
      icon: ShieldAlert,
      onClick: () => onNavigate("risk-review"),
    },
    {
      id: "manual-check",
      label: "Manual Check Pending",
      category: "Deliverables",
      description: "Submitted Instagram posts requiring manual tag and audio verification",
      count: Number(needs.manualCheckDealsCount || 0),
      icon: Briefcase,
      onClick: () => onNavigate("campaigns-deals", "manual_check"),
    },
    {
      id: "silent-artist",
      label: "Silent Artist Deals",
      category: "SLA Enforcement",
      description: "Deliverables past the 48-hour sponsor review window awaiting auto-release",
      count: Number(needs.silentArtistDealsCount || 0),
      icon: Clock,
      onClick: () => onNavigate("campaigns-deals", "artist_silent"),
    },
    {
      id: "disputes",
      label: "Open Disputes",
      category: "Arbitration",
      description: "Frozen escrow deals requiring administrative split, refund, or release",
      count: Number(needs.disputesCount || 0),
      icon: Scale,
      onClick: () => onNavigate("disputes"),
    },
    {
      id: "withdrawals",
      label: "Withdrawal Pending",
      category: "Treasury",
      description: "Creator payout requests awaiting bank transfer UTR confirmation",
      count: Number(needs.pendingWithdrawalsCount || 0),
      icon: CreditCard,
      onClick: () => onNavigate("withdrawals"),
    },
    {
      id: "upi-pending",
      label: "Manual UPI Pending",
      category: "Treasury",
      description: "Sponsor wallet top-ups awaiting UTR verification and ledger credit",
      count: Number(needs.pendingUpiCount || 0),
      icon: Landmark,
      onClick: () => onNavigate("payments"),
    },
    {
      id: "city-changes",
      label: "City Changes Pending",
      category: "Directory",
      description: "Creator location transfer requests pending regional approval",
      count: Number(needs.pendingCityRequestsCount || 0),
      icon: MapPin,
      onClick: () => onNavigate("cities"),
    },
  ];

  const totalPendingQueueItems = operationalQueues.reduce((acc, q) => acc + q.count, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Platform Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time treasury balances, marketplace volume, operational queues, and escrow invariant reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-3 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-none gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh Data</span>
          </Button>
        </div>
      </div>

      {/* Section 1: Financial & Treasury Position (Primary Hierarchy) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Treasury & Financial Position
          </h2>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">Currency: INR (₹)</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/90">
          {/* Total Escrow Held */}
          <div className="p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Escrow Held</span>
              <Lock className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums tracking-tight">
                {formatINR(overview?.totalEscrowHeld)}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                {escrowCheck.isOk ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    100% invariant verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                    <AlertCircle className="w-3 h-3 text-rose-600" />
                    Variance: {formatINR(escrowCheck.totalDiscrepancy)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Wallet Balances Total */}
          <div className="p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Wallet Balances</span>
              <Wallet className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums tracking-tight">
                {formatINR(overview?.totalWalletBalances)}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Available across creator & sponsor wallets
              </p>
            </div>
          </div>

          {/* Fees Earned (Month) */}
          <div className="p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Fees Earned (Month)</span>
              <Receipt className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums tracking-tight">
                {formatINR(overview?.feesEarned?.total)}
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500 font-mono tabular-nums">
                <span>Net: <strong className="font-semibold text-slate-700">{formatINR(overview?.feesEarned?.net)}</strong></span>
                <span className="text-slate-300">|</span>
                <span>GST: <strong className="font-semibold text-slate-700">{formatINR(overview?.feesEarned?.gstPortion)}</strong></span>
              </div>
            </div>
          </div>

          {/* Withdrawals Paid (Month) */}
          <div className="p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Withdrawals Paid</span>
              <CreditCard className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums tracking-tight">
                {formatINR(overview?.withdrawalsPaidThisMonth)}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Disbursed to verified creators this month
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Marketplace & Platform Activity (Secondary Hierarchy) */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Marketplace & Network Activity
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200/90 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Creators</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
                {(overview?.totalCreators || 0).toLocaleString("en-IN")}
              </span>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono tabular-nums">
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                  Nano: {overview?.creatorsByTier?.Nano || 0}
                </span>
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                  Micro: {overview?.creatorsByTier?.Micro || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Artists / Sponsors</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
                {(overview?.totalArtists || 0).toLocaleString("en-IN")}
              </span>
              <span className="text-[11px] text-slate-400">Registered accounts</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active Campaigns</span>
              <Briefcase className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
                {(overview?.activeCampaignsCount || 0).toLocaleString("en-IN")}
              </span>
              <button
                type="button"
                onClick={() => onNavigate("campaigns-deals", "campaigns")}
                className="text-[11px] font-medium text-slate-600 hover:text-[#FF3399] inline-flex items-center gap-0.5 transition-colors"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Open Deals</span>
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xl font-semibold text-slate-900 font-mono tabular-nums">
                {(overview?.openDealsCount || 0).toLocaleString("en-IN")}
              </span>
              <span className="text-[11px] text-slate-400">In-flight deliverables</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Needs Attention Operational Queues */}
      <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold text-slate-900">Needs Attention Queues</h2>
              <span
                className={`px-2 py-0.5 text-[11px] font-mono tabular-nums font-semibold rounded ${
                  totalPendingQueueItems > 0
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {totalPendingQueueItems} pending
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Operational review queues requiring administrative verification, settlement, or approval.
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-5">
                Operational Queue
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">
                Category
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                Verification Scope
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Status
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                Queue Depth
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-5">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y divide-slate-100">
            {operationalQueues.map((q) => {
              const Icon = q.icon;
              const hasItems = q.count > 0;
              return (
                <TableRow
                  key={q.id}
                  onClick={q.onClick}
                  className="hover:bg-slate-50/90 cursor-pointer transition-colors group"
                >
                  <TableCell className="py-3 pl-5 font-medium text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-7 w-7 rounded-md flex items-center justify-center border ${
                          hasItems
                            ? "bg-amber-50/80 border-amber-200 text-amber-700"
                            : "bg-slate-50 border-slate-200/80 text-slate-500"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span>{q.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 hidden md:table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {q.category}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-slate-500 hidden lg:table-cell max-w-md truncate">
                    {q.description}
                  </TableCell>
                  <TableCell className="py-3">
                    {hasItems ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Action Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        All Clear
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono tabular-nums">
                    <span
                      className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded text-xs font-semibold ${
                        hasItems
                          ? "bg-[#FF3399]/10 text-[#FF3399] border border-[#FF3399]/20"
                          : "text-slate-400"
                      }`}
                    >
                      {q.count}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-right pr-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        q.onClick();
                      }}
                      className="h-7 px-2.5 text-xs font-medium text-slate-700 group-hover:text-[#FF3399] group-hover:bg-pink-50/50 inline-flex items-center gap-1"
                    >
                      <span>Review</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Section 4: Financial & Escrow Invariant Verification */}
      <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">
                Money Check: Escrow Invariant Verification
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reconciliation invariant: <code className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">wallet.escrow_held == active_campaigns.budget_remaining + open_deals.unreleased</code>
            </p>
          </div>

          <div>
            {escrowCheck.isOk ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>OK — Escrow Holds Cleanly</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Discrepancy Detected: {formatINR(escrowCheck.totalDiscrepancy)}</span>
              </div>
            )}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-5">
                Artist
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                Escrow Held (Wallet)
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                Active Campaigns Remaining
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                Open Deals Unreleased
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                Expected Total Escrow
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-5">
                Status / Difference
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y divide-slate-100">
            {!escrowCheck.artistDetails || escrowCheck.artistDetails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <ShieldCheck className="w-5 h-5 text-slate-400" />
                    <p className="font-medium text-slate-700">No artist accounts currently holding active escrow</p>
                    <p className="text-[11px] text-slate-400">All sponsor escrow ledgers are at ₹0 with zero variance.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              escrowCheck.artistDetails.map((a: any) => {
                const isRowOk = a.status === "OK";
                return (
                  <TableRow key={a.artistId} className="hover:bg-slate-50/80">
                    <TableCell className="py-3 pl-5 font-medium text-slate-900">
                      <span>{a.artistName}</span>
                      <span className="ml-1.5 text-[11px] font-mono tabular-nums text-slate-400">
                        #{a.artistId}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums text-slate-700">
                      {formatINR(a.escrowHeld)}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums text-slate-700">
                      {formatINR(a.campaignsBudgetRemaining)}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums text-slate-700">
                      {formatINR(a.openDealsUnreleased)}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(a.expectedEscrow)}
                    </TableCell>
                    <TableCell className="py-3 text-right pr-5">
                      {isRowOk ? (
                        <span className="inline-flex items-center justify-end gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>OK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-end gap-1 text-rose-700 font-semibold font-mono tabular-nums">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Difference: {formatINR(a.difference)}</span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ================= 2. USERS PAGE ================= */
function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Action Dialog States
  const [actionDialog, setActionDialog] = useState<{
    type: "block" | "unblock" | "reset_ig" | "change_city";
    userId: number;
    userName: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionCity, setActionCity] = useState("");

  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["/api/admin/users", page, search, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        search,
        role: roleFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users list");
      return res.json();
    },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ userId, block, reason }: { userId: number; block: boolean; reason: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update block status");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("User status updated cleanly");
      setActionDialog(null);
      setActionReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetIgMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/reset-instagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reset Instagram link");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Instagram link reset for user");
      setActionDialog(null);
      setActionReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const cityMutation = useMutation({
    mutationFn: async ({ userId, city, reason }: { userId: number; city: string; reason: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/city`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update city");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("User city updated and audited");
      setActionDialog(null);
      setActionReason("");
      setActionCity("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Users Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search and manage creators, artists/sponsors, and administrators. All state changes require an audited justification.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200/90 flex flex-wrap gap-2.5 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Search by name, email, or Instagram handle..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8 h-8 text-xs border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs border-slate-200">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="creator">Creators</SelectItem>
              <SelectItem value="sponsor">Artists / Sponsors</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="needs_review">Needs Review</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-3 text-xs border-slate-200 text-slate-700 gap-1.5 shadow-none"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <LoadingSpinner label="Loading user directory..." />
      ) : isError ? (
        <ErrorAlert onRetry={() => refetch()} />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
                  User ID
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Name / Email
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Role
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  City
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Instagram Profile
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                  Wallet Balance
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-slate-100">
              {!data?.users || data.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No users found matching current search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                data.users.map((u: any) => (
                  <TableRow key={u.id} className="hover:bg-slate-50/80">
                    <TableCell className="py-3 pl-4 font-mono tabular-nums font-medium text-slate-600">
                      #{u.id}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize bg-slate-100 text-slate-700">
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-slate-700">{u.city || "—"}</TableCell>
                    <TableCell className="py-3">
                      {u.creatorProfile ? (
                        <div>
                          <span className="font-semibold text-slate-900">@{u.creatorProfile.username}</span>
                          <span className="block text-[11px] text-slate-500 font-mono tabular-nums">
                            {u.creatorProfile.followers?.toLocaleString("en-IN")} followers · {u.creatorProfile.metricsSource}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Unlinked</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums font-medium text-slate-900">
                      {formatINR(u.wallet?.balance)}
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusIndicator status={u.status} />
                    </TableCell>
                    <TableCell className="py-3 text-right pr-4">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] h-7 px-2.5 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-none"
                          onClick={() => setSelectedUser(u)}
                        >
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`text-[11px] h-7 px-2.5 shadow-none ${
                            u.status === "blocked"
                              ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              : "border-rose-200 text-rose-700 hover:bg-rose-50"
                          }`}
                          onClick={() =>
                            setActionDialog({
                              type: u.status === "blocked" ? "unblock" : "block",
                              userId: u.id,
                              userName: u.name,
                            })
                          }
                        >
                          {u.status === "blocked" ? "Unblock" : "Block"}
                        </Button>
                        {u.creatorProfile && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 px-2.5 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-none"
                            onClick={() =>
                              setActionDialog({
                                type: "reset_ig",
                                userId: u.id,
                                userName: u.name,
                              })
                            }
                          >
                            Reset IG
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] h-7 px-2.5 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-none"
                          onClick={() => {
                            setActionDialog({
                              type: "change_city",
                              userId: u.id,
                              userName: u.name,
                            });
                            setActionCity(u.city || "");
                          }}
                        >
                          City
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <PaginationFooter page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </div>
      )}

      {/* Confirmation & Reason Modal */}
      <Dialog open={Boolean(actionDialog)} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Confirm Action: {actionDialog?.type.replace("_", " ").toUpperCase()} — {actionDialog?.userName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A mandatory justification reason is required. This operation will be permanently recorded in the security audit log.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {actionDialog?.type === "change_city" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">New City Name</Label>
                <Input
                  value={actionCity}
                  onChange={(e) => setActionCity(e.target.value)}
                  placeholder="e.g. Mumbai, Delhi, Bangalore"
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Audit Justification Reason</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Provide clear operational justification for this action..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium"
              disabled={!actionReason.trim() || (actionDialog?.type === "change_city" && !actionCity.trim())}
              onClick={() => {
                if (!actionDialog) return;
                if (actionDialog.type === "block" || actionDialog.type === "unblock") {
                  blockMutation.mutate({
                    userId: actionDialog.userId,
                    block: actionDialog.type === "block",
                    reason: actionReason,
                  });
                } else if (actionDialog.type === "reset_ig") {
                  resetIgMutation.mutate({ userId: actionDialog.userId, reason: actionReason });
                } else if (actionDialog.type === "change_city") {
                  cityMutation.mutate({
                    userId: actionDialog.userId,
                    city: actionCity,
                    reason: actionReason,
                  });
                }
              }}
            >
              Confirm & Log Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Modal */}
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}

function UserDetailModal({ user, onClose }: { user: any; onClose: () => void }) {
  if (!user) return null;
  return (
    <Dialog open={Boolean(user)} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900">
            Account Profile — <span className="font-mono text-slate-500">#{user.id}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
             Comprehensive account metadata, KYC identity verification, and creator telemetry.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200/80">
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Full Name</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">{user.name}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Email Address</span>
              <span className="font-medium text-slate-800 mt-0.5 block">{user.email}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Account Role</span>
              <span className="font-medium capitalize text-slate-800 mt-0.5 block">{user.role}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Operating City</span>
              <span className="font-medium text-slate-800 mt-0.5 block">{user.city || "—"}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Masked PAN</span>
              <span className="font-mono text-slate-800 mt-0.5 block">{user.maskedPan || "Not Submitted"}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Wallet Balance</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5 block">
                {formatINR(user.wallet?.balance)}
              </span>
            </div>
          </div>

          {user.creatorProfile && (
            <div className="bg-white p-4 rounded-lg border border-slate-200/90 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-semibold text-slate-900">Linked Instagram Telemetry</h4>
                <span className="font-mono text-xs font-semibold text-[#FF3399]">
                  @{user.creatorProfile.username}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Followers</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5 block">
                    {user.creatorProfile.followers?.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Metrics Source</span>
                  <span className="font-medium text-slate-800 mt-0.5 block">{user.creatorProfile.metricsSource}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Risk Score</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono tabular-nums font-semibold mt-0.5 ${
                      user.creatorProfile.riskScore >= 40
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {user.creatorProfile.riskScore} / 100
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= 3. RISK REVIEW PAGE ================= */
function RiskReviewPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [note, setNote] = useState("");

  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["/api/admin/risk-review", page, search],
    queryFn: async () => {
      const res = await fetch(`/api/admin/risk-review?page=${page}&limit=15&search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("Failed to load risk review queue");
      return res.json();
    },
  });

  const decideMutation = useMutation({
    mutationFn: async ({ userId, action, notes }: { userId: number; action: "approve" | "reject"; notes: string }) => {
      const res = await fetch(`/api/admin/risk-review/${userId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit decision");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Risk decision executed successfully");
      setSelectedCreator(null);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/risk-review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Risk Review Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Creators flagged for follower bursts, elevated anomaly scores, or manual compliance screening.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Filter flagged creators..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-8 text-xs bg-white border-slate-200"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-3 text-xs bg-white border-slate-200 text-slate-700 gap-1.5 shadow-none"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading risk review queue..." />
      ) : isError ? (
        <ErrorAlert onRetry={() => refetch()} />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
                  User ID
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Creator
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Instagram Handle
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                  Followers
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Burst Detection
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                  Risk Score
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-4">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-slate-100">
              {!data?.queue || data.queue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <p className="font-medium text-slate-700">Risk review queue is clear</p>
                      <p className="text-[11px] text-slate-400">No creators are currently flagged for anomaly screening.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.queue.map((c: any) => (
                  <TableRow key={c.userId} className="hover:bg-slate-50/80">
                    <TableCell className="py-3 pl-4 font-mono tabular-nums font-medium text-slate-600">
                      #{c.userId}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.email}</div>
                    </TableCell>
                    <TableCell className="py-3 font-medium text-slate-900">
                      @{c.username || "N/A"}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums text-slate-700">
                      {c.followers?.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        {c.burstDetection}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono tabular-nums font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {c.riskScore}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right pr-4">
                      <Button
                        size="sm"
                        className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-7 px-3 text-xs shadow-none"
                        onClick={() => setSelectedCreator(c)}
                      >
                        Review & Decide
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Decision Dialog */}
      <Dialog open={Boolean(selectedCreator)} onOpenChange={() => setSelectedCreator(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Risk Compliance Review — {selectedCreator?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Approve creator to restore active marketplace eligibility or reject to restrict account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Risk Score</span>
                <span className="font-mono tabular-nums font-semibold text-rose-700 mt-0.5 block">
                  {selectedCreator?.riskScore}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Burst Telemetry</span>
                <span className="font-medium text-slate-800 mt-0.5 block">{selectedCreator?.burstDetection}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Compliance Decision Note (Required)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Document findings for audit trail..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
              disabled={!note.trim()}
              onClick={() =>
                decideMutation.mutate({ userId: selectedCreator.userId, action: "reject", notes: note })
              }
            >
              Reject Creator
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              disabled={!note.trim()}
              onClick={() =>
                decideMutation.mutate({ userId: selectedCreator.userId, action: "approve", notes: note })
              }
            >
              Approve (Move Active)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= 4. CAMPAIGNS AND DEALS PAGE ================= */
function CampaignsDealsPage({
  activeSubTab,
  onSubTabChange,
}: {
  activeSubTab: CampaignsSubTab;
  onSubTabChange: (tab: CampaignsSubTab) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Campaigns & Deals</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitor funded campaigns and resolve Instagram post verification exceptions or silent artist review windows.
        </p>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeSubTab === "campaigns"
              ? "border-[#FF3399] text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          onClick={() => onSubTabChange("campaigns")}
        >
          All Campaigns
        </button>
        <button
          type="button"
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeSubTab === "manual_check"
              ? "border-[#FF3399] text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          onClick={() => onSubTabChange("manual_check")}
        >
          Manual Check Queue
        </button>
        <button
          type="button"
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeSubTab === "artist_silent"
              ? "border-[#FF3399] text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          onClick={() => onSubTabChange("artist_silent")}
        >
          Silent Artist Deals
        </button>
      </div>

      {activeSubTab === "campaigns" && <CampaignsSubView />}
      {activeSubTab === "manual_check" && <ManualCheckSubView />}
      {activeSubTab === "artist_silent" && <ArtistSilentSubView />}
    </div>
  );
}

function CampaignsSubView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["/api/admin/campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/admin/campaigns");
      if (!res.ok) throw new Error("Failed to load campaigns");
      return res.json();
    },
  });

  const filteredCampaigns = useMemo(() => {
    const list = Array.isArray(data?.campaigns) ? data.campaigns : [];
    return list.filter((c: any) => {
      const matchesSearch =
        !search.trim() ||
        String(c.title || "").toLowerCase().includes(search.toLowerCase()) ||
        String(c.artistName || "").toLowerCase().includes(search.toLowerCase()) ||
        String(c.id).includes(search.trim());
      const matchesStatus = statusFilter === "all" || String(c.status).toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.campaigns, search, statusFilter]);

  if (isLoading) return <LoadingSpinner label="Loading campaigns ledger..." />;
  if (isError) return <ErrorAlert onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg border border-slate-200/90 flex flex-wrap gap-2.5 items-center justify-between">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Filter by campaign title, ID, or artist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs border-slate-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-3 text-xs border-slate-200 text-slate-700 gap-1.5 shadow-none"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
                Campaign ID
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Title
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Artist / Sponsor
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                Total Budget
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                Budget Remaining
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pr-4">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y divide-slate-100">
            {filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No campaigns found matching your filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-slate-50/80">
                  <TableCell className="py-3 pl-4 font-mono tabular-nums font-medium text-slate-600">
                    #{c.id}
                  </TableCell>
                  <TableCell className="py-3 font-semibold text-slate-900">{c.title}</TableCell>
                  <TableCell className="py-3 text-slate-700">{c.artistName}</TableCell>
                  <TableCell className="py-3 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(c.budget)}
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                    {formatINR(c.budgetRemaining)}
                  </TableCell>
                  <TableCell className="py-3 pr-4">
                    <StatusIndicator status={c.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ManualCheckSubView() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/admin/manual-check-deals"],
    queryFn: async () => {
      const res = await fetch("/api/admin/manual-check-deals");
      if (!res.ok) throw new Error("Failed to load manual check deals");
      return res.json();
    },
  });

  const decideMutation = useMutation({
    mutationFn: async ({ dealId, action, reason }: { dealId: number; action: "approve" | "reject"; reason: string }) => {
      const res = await fetch(`/api/admin/manual-check-deals/${dealId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error("Failed to decide deal");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Manual check decision executed");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/manual-check-deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
  });

  if (isLoading) return <LoadingSpinner label="Loading manual check queue..." />;
  if (isError) return <ErrorAlert onRetry={() => refetch()} />;

  return (
    <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
              Deal ID
            </TableHead>
            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Campaign
            </TableHead>
            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Creator
            </TableHead>
            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Submitted Deliverable
            </TableHead>
            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
              Deal Value
            </TableHead>
            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-4">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs divide-y divide-slate-100">
          {!data || data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                <div className="flex flex-col items-center justify-center space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <p className="font-medium text-slate-700">Manual verification queue is clear</p>
                  <p className="text-[11px] text-slate-400">All submitted Instagram posts have been verified.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((d: any) => (
              <TableRow key={d.dealId} className="hover:bg-slate-50/80">
                <TableCell className="py-3 pl-4 font-mono tabular-nums font-medium text-slate-600">
                  #{d.dealId}
                </TableCell>
                <TableCell className="py-3 font-medium text-slate-900">{d.campaignTitle}</TableCell>
                <TableCell className="py-3 text-slate-700">{d.creatorName}</TableCell>
                <TableCell className="py-3">
                  <a
                    href={d.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-700 hover:text-[#FF3399] font-medium underline underline-offset-2"
                  >
                    <span>Inspect Post</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </TableCell>
                <TableCell className="py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                  {formatINR(d.price)}
                </TableCell>
                <TableCell className="py-3 text-right pr-4 space-x-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 shadow-none"
                    onClick={() =>
                      decideMutation.mutate({
                        dealId: d.dealId,
                        action: "reject",
                        reason: "Post verification failed",
                      })
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-none"
                    onClick={() =>
                      decideMutation.mutate({
                        dealId: d.dealId,
                        action: "approve",
                        reason: "Admin verified post tags and audio",
                      })
                    }
                  >
                    Approve Post
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ArtistSilentSubView() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/admin/silent-artist-deals"],
    queryFn: async () => {
      const res = await fetch("/api/admin/silent-artist-deals");
      if (!res.ok) throw new Error("Failed to load silent artist deals");
      return res.json();
    },
  });

  const decideMutation = useMutation({
    mutationFn: async ({
      dealId,
      action,
      reason,
    }: {
      dealId: number;
      action: "approve" | "send_back";
      reason: string;
    }) => {
      const res = await fetch(`/api/admin/silent-artist-deals/${dealId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error("Failed to process action");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Silent deal rule executed");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/silent-artist-deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
  });

  if (isLoading) return <LoadingSpinner label="Loading silent artist deals queue..." />;
  if (isError) return <ErrorAlert onRetry={() => refetch()} />;

  return (
    <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
              Deal ID
            </TableHead>
            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Campaign
            </TableHead>
            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Silent Artist
            </TableHead>
            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Creator
            </TableHead>
            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
              Hours Past Window
            </TableHead>
            <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-4">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs divide-y divide-slate-100">
          {!data || data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                <div className="flex flex-col items-center justify-center space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <p className="font-medium text-slate-700">No silent artist deals pending</p>
                  <p className="text-[11px] text-slate-400">All sponsor reviews are within the 48-hour SLA window.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((d: any) => (
              <TableRow key={d.dealId} className="hover:bg-slate-50/80">
                <TableCell className="py-3 pl-4 font-mono tabular-nums font-medium text-slate-600">
                  #{d.dealId}
                </TableCell>
                <TableCell className="py-3 font-medium text-slate-900">{d.campaignTitle}</TableCell>
                <TableCell className="py-3 text-slate-700">{d.artistName}</TableCell>
                <TableCell className="py-3 text-slate-700">{d.creatorName}</TableCell>
                <TableCell className="py-3 text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono tabular-nums font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    {d.hoursSilent}h
                  </span>
                </TableCell>
                <TableCell className="py-3 text-right pr-4 space-x-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs border-slate-200 text-slate-700 shadow-none"
                    onClick={() =>
                      decideMutation.mutate({
                        dealId: d.dealId,
                        action: "send_back",
                        reason: "Reminded artist to review",
                      })
                    }
                  >
                    Send Back
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-none"
                    onClick={() =>
                      decideMutation.mutate({
                        dealId: d.dealId,
                        action: "approve",
                        reason: "Auto-approve enforced past 48h review window",
                      })
                    }
                  >
                    Auto-Approve & Release Funds
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* ================= 5. DISPUTES PAGE ================= */
function DisputesPage() {
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolution, setResolution] = useState<"refund_artist" | "release_creator" | "split">("release_creator");
  const [creatorPct, setCreatorPct] = useState(50);
  const [reason, setReason] = useState("");

  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["/api/admin/disputes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/disputes");
      if (!res.ok) throw new Error("Failed to load disputes");
      return res.json();
    },
  });

  const settleMutation = useMutation({
    mutationFn: async ({
      disputeId,
      resolution,
      reason,
      creatorPercent,
    }: {
      disputeId: number;
      resolution: string;
      reason: string;
      creatorPercent?: number;
    }) => {
      const idempotencyKey = `settle_${disputeId}_${Date.now()}`;
      const res = await fetch(`/api/admin/disputes/${disputeId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          reason,
          splitParams:
            resolution === "split"
              ? { creatorPercent, artistPercent: 100 - (creatorPercent || 50) }
              : undefined,
          idempotencyKey,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to settle dispute");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Dispute settled via atomic ledger transaction");
      setSelectedDispute(null);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/disputes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Disputes Resolution Console</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Idempotent escrow settlement engine. Funds move strictly through double-entry ledger records.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 px-3 text-xs bg-white border-slate-200 text-slate-700 gap-1.5 shadow-none"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading disputes registry..." />
      ) : isError ? (
        <ErrorAlert onRetry={() => refetch()} />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
                  Dispute ID
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Deal Ref
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Raised By
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                  Frozen Escrow
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                  Elapsed Age
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-4">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-slate-100">
              {!data?.disputes || data.disputes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <p className="font-medium text-slate-700">No open disputes requiring resolution</p>
                      <p className="text-[11px] text-slate-400">All campaign deals are operating without arbitration locks.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.disputes.map((disp: any) => (
                  <TableRow key={disp.id} className="hover:bg-slate-50/80">
                    <TableCell className="py-3 pl-4 font-mono tabular-nums font-medium text-slate-600">
                      #{disp.id}
                    </TableCell>
                    <TableCell className="py-3 font-mono tabular-nums text-slate-700">
                      Deal #{disp.dealId}
                    </TableCell>
                    <TableCell className="py-3 font-medium text-slate-900">{disp.raisedByName}</TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(disp.frozenAmount)}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums text-slate-600">
                      {disp.ageHours}h
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusIndicator status={disp.status} />
                    </TableCell>
                    <TableCell className="py-3 text-right pr-4">
                      {disp.status === "open" ? (
                        <Button
                          size="sm"
                          className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-7 px-3 text-xs shadow-none"
                          onClick={() => setSelectedDispute(disp)}
                        >
                          Settle Dispute
                        </Button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Settled</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Settle Modal */}
      <Dialog open={Boolean(selectedDispute)} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Settle Dispute #{selectedDispute?.id}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Execute atomic ledger release or refund for frozen deal funds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Frozen Escrow Amount</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatINR(selectedDispute?.frozenAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Claim Reason</span>
                <p className="font-medium text-slate-800 mt-0.5">{selectedDispute?.reason}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Settlement Decision</Label>
              <Select value={resolution} onValueChange={(v: any) => setResolution(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="release_creator">100% Release to Creator</SelectItem>
                  <SelectItem value="refund_artist">100% Refund to Artist</SelectItem>
                  <SelectItem value="split">Custom Split Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {resolution === "split" && (
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-md border border-slate-200">
                <div className="flex justify-between text-xs font-mono tabular-nums">
                  <span>Creator Share: <strong>{creatorPct}%</strong></span>
                  <span>Artist Share: <strong>{100 - creatorPct}%</strong></span>
                </div>
                <Input
                  type="range"
                  min={1}
                  max={99}
                  value={creatorPct}
                  onChange={(e) => setCreatorPct(Number(e.target.value))}
                  className="h-6"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Mandatory Audit Justification</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Document settlement rationale for financial audit log..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSelectedDispute(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium"
              disabled={!reason.trim()}
              onClick={() =>
                settleMutation.mutate({
                  disputeId: selectedDispute.id,
                  resolution,
                  reason,
                  creatorPercent: creatorPct,
                })
              }
            >
              Confirm Settlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= 6. WITHDRAWALS PAGE ================= */
function WithdrawalsPage() {
  const [page, setPage] = useState(1);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [utrRef, setUtrRef] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [modalType, setModalType] = useState<"approve" | "reject">("approve");

  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["/api/admin/withdrawals", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/withdrawals?page=${page}&limit=15`);
      if (!res.ok) throw new Error("Failed to load withdrawals");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ withdrawalId, utr }: { withdrawalId: number; utr: string }) => {
      const res = await fetch(`/api/admin/withdrawals/${withdrawalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utrRef: utr }),
      });
      if (!res.ok) throw new Error("Failed to approve payout");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Payout approved and recorded with UTR");
      setSelectedWithdrawal(null);
      setUtrRef("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ withdrawalId, reason }: { withdrawalId: number; reason: string }) => {
      const res = await fetch(`/api/admin/withdrawals/${withdrawalId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to reject payout");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Payout rejected and funds returned to creator wallet");
      setSelectedWithdrawal(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Withdrawals & Payouts Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Disburse creator withdrawals with bank UTR reference numbers or reject with automatic wallet reversal.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 px-3 text-xs bg-white border-slate-200 text-slate-700 gap-1.5 shadow-none"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading withdrawal requests..." />
      ) : isError ? (
        <ErrorAlert onRetry={() => refetch()} />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
                  Withdrawal ID
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Creator
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                  Requested Amount
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Masked Payout Destination
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  KYC Verification
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-4">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-slate-100">
              {!data?.withdrawals || data.withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                    No withdrawal requests found.
                  </TableCell>
                </TableRow>
              ) : (
                data.withdrawals.map((w: any) => (
                  <TableRow key={w.id} className="hover:bg-slate-50/80">
                    <TableCell className="py-3 pl-4 font-mono tabular-nums font-medium text-slate-600">
                      #{w.id}
                    </TableCell>
                    <TableCell className="py-3 font-medium text-slate-900">{w.userName}</TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(w.amount)}
                    </TableCell>
                    <TableCell className="py-3 font-mono text-slate-600">{w.maskedPayoutMethod}</TableCell>
                    <TableCell className="py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {w.kycStatus}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusIndicator status={w.status} />
                    </TableCell>
                    <TableCell className="py-3 text-right pr-4 space-x-1.5">
                      {w.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-700 border-rose-200 hover:bg-rose-50 h-7 px-2.5 text-xs shadow-none"
                            onClick={() => {
                              setSelectedWithdrawal(w);
                              setModalType("reject");
                            }}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-7 px-2.5 text-xs shadow-none"
                            onClick={() => {
                              setSelectedWithdrawal(w);
                              setModalType("approve");
                            }}
                          >
                            Approve (UTR)
                          </Button>
                        </>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Processed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <PaginationFooter page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </div>
      )}

      {/* Approval / Rejection Modal */}
      <Dialog open={Boolean(selectedWithdrawal)} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              {modalType === "approve" ? "Confirm Payout UTR" : "Reject Payout Request"} — #{selectedWithdrawal?.id}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {modalType === "approve"
                ? "Enter the bank transfer UTR reference number to mark this withdrawal as paid."
                : "Rejecting this request immediately credits the locked amount back to the creator's wallet."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 flex justify-between items-center">
              <span className="text-slate-500">Payout Amount ({selectedWithdrawal?.userName})</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatINR(selectedWithdrawal?.amount)}
              </span>
            </div>

            {modalType === "approve" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Bank UTR Reference Number (Required)</Label>
                <Input
                  value={utrRef}
                  onChange={(e) => setUtrRef(e.target.value)}
                  placeholder="e.g. UTR31415926535"
                  className="h-8 text-xs font-mono"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Rejection Reason (Required)</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="State reason for rejecting withdrawal request..."
                  rows={3}
                  className="text-xs"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSelectedWithdrawal(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={`h-8 text-xs text-white font-medium ${
                modalType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
              disabled={modalType === "approve" ? !utrRef.trim() : !rejectReason.trim()}
              onClick={() => {
                if (modalType === "approve")
                  approveMutation.mutate({ withdrawalId: selectedWithdrawal.id, utr: utrRef });
                else rejectMutation.mutate({ withdrawalId: selectedWithdrawal.id, reason: rejectReason });
              }}
            >
              {modalType === "approve" ? "Confirm Payout" : "Reject & Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= 7. PAYMENTS PAGE ================= */
function PaymentsPage() {
  const { data: upiList } = useQuery({
    queryKey: ["/api/admin/payments/upi"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payments/upi");
      return res.json();
    },
  });

  const { data: ledgerData } = useQuery({
    queryKey: ["/api/admin/ledger"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ledger");
      return res.json();
    },
  });

  const queryClient = useQueryClient();

  const approveUpi = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/payments/upi/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to approve UPI topup");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Manual UPI top-up approved and credited");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/upi"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ledger"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
  });

  const safeUpiList = Array.isArray(upiList) ? upiList : [];
  const safeLedgerEntries = Array.isArray(ledgerData?.entries) ? ledgerData.entries : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Payments & Ledger Explorer</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Verify manual UPI wallet top-ups and audit the read-only double-entry financial ledger.
        </p>
      </div>

      {/* Manual UPI Queue */}
      <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Manual UPI Top-Up Queue</h2>
            <p className="text-xs text-slate-500">Sponsor UTR submissions awaiting verification</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
                Payment ID
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                UTR Reference
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Payer
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                Amount
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Status
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-4">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y divide-slate-100">
            {safeUpiList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No manual UPI payments recorded.
                </TableCell>
              </TableRow>
            ) : (
              safeUpiList.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-slate-50/80">
                  <TableCell className="py-3 pl-4 font-mono tabular-nums text-slate-600">#{p.id}</TableCell>
                  <TableCell className="py-3 font-mono font-semibold text-slate-900">{p.utr}</TableCell>
                  <TableCell className="py-3 text-slate-700">{p.payerName}</TableCell>
                  <TableCell className="py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {formatINR(p.amount)}
                  </TableCell>
                  <TableCell className="py-3">
                    <StatusIndicator status={p.status} />
                  </TableCell>
                  <TableCell className="py-3 text-right pr-4">
                    {p.status === "pending" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-7 px-3 text-xs shadow-none"
                        onClick={() => approveUpi.mutate(p.id)}
                      >
                        Approve Top-Up
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Immutable Ledger Explorer */}
      <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Immutable Financial Ledger</h2>
            <p className="text-xs text-slate-500">Append-only audit trail of all wallet credits, debits, and escrow locks</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
                Tx ID
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Account
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Entry Type
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                Delta Amount
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                Balance After
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-4">
                Timestamp
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y divide-slate-100">
            {safeLedgerEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No ledger transactions recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              safeLedgerEntries.map((e: any) => (
                <TableRow key={e.id} className="hover:bg-slate-50/80">
                  <TableCell className="py-3 pl-4 font-mono tabular-nums font-medium text-slate-600">
                    #{e.id}
                  </TableCell>
                  <TableCell className="py-3 font-mono tabular-nums text-slate-700">User #{e.userId}</TableCell>
                  <TableCell className="py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700">
                      {e.type}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`py-3 text-right font-mono tabular-nums font-semibold ${
                      e.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {e.amount >= 0 ? `+${formatINR(e.amount)}` : formatINR(e.amount)}
                  </TableCell>
                  <TableCell className="py-3 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(e.balanceAfter)}
                  </TableCell>
                  <TableCell className="py-3 text-right pr-4 font-mono tabular-nums text-slate-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ================= 8. CITIES PAGE ================= */
function CitiesPage() {
  const { data: citiesListRaw } = useQuery({
    queryKey: ["/api/admin/cities"],
    queryFn: async () => {
      const res = await fetch("/api/admin/cities");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const { data: cityRequestsRaw } = useQuery({
    queryKey: ["/api/admin/city-change-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/city-change-requests");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const citiesList = Array.isArray(citiesListRaw) ? citiesListRaw : [];
  const cityRequests = Array.isArray(cityRequestsRaw) ? cityRequestsRaw : [];

  const queryClient = useQueryClient();

  const decideRequest = useMutation({
    mutationFn: async ({
      requestId,
      action,
      note,
    }: {
      requestId: number;
      action: "approve" | "reject";
      note: string;
    }) => {
      const res = await fetch(`/api/admin/city-change-requests/${requestId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (!res.ok) throw new Error("Failed to decide city change request");
      return res.json();
    },
    onSuccess: () => {
      toast.success("City relocation request processed");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/city-change-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Cities & Regional Directory</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review creator city transfer requests and inspect supported regional markets.
        </p>
      </div>

      {/* City Change Requests Queue */}
      <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80">
          <h2 className="text-sm font-semibold text-slate-900">City Change Requests Queue</h2>
          <p className="text-xs text-slate-500">Creator relocation requests awaiting verification</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
                Req ID
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Creator
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Origin City
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Requested City
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Reason
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-4">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y divide-slate-100">
            {cityRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No pending city change requests.
                </TableCell>
              </TableRow>
            ) : (
              cityRequests.map((r: any) => (
                <TableRow key={r.id} className="hover:bg-slate-50/80">
                  <TableCell className="py-3 pl-4 font-mono tabular-nums text-slate-600">#{r.id}</TableCell>
                  <TableCell className="py-3 font-medium text-slate-900">{r.creatorName}</TableCell>
                  <TableCell className="py-3 text-slate-600">{r.fromCity}</TableCell>
                  <TableCell className="py-3 font-semibold text-slate-900">{r.toCity}</TableCell>
                  <TableCell className="py-3 text-slate-600">{r.reason}</TableCell>
                  <TableCell className="py-3 text-right pr-4 space-x-1.5">
                    {r.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-700 border-rose-200 hover:bg-rose-50 h-7 px-2.5 text-xs shadow-none"
                          onClick={() =>
                            decideRequest.mutate({ requestId: r.id, action: "reject", note: "Rejected" })
                          }
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-7 px-2.5 text-xs shadow-none"
                          onClick={() =>
                            decideRequest.mutate({ requestId: r.id, action: "approve", note: "Approved" })
                          }
                        >
                          Approve
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Active Cities List */}
      <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80">
          <h2 className="text-sm font-semibold text-slate-900">Active Operating Cities</h2>
          <p className="text-xs text-slate-500">Configured regional markets for campaign targeting</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
                City ID
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                City Name
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                State / Region
              </TableHead>
              <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pr-4">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y divide-slate-100">
            {citiesList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                  No cities configured in directory.
                </TableCell>
              </TableRow>
            ) : (
              citiesList.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-slate-50/80">
                  <TableCell className="py-3 pl-4 font-mono tabular-nums text-slate-600">#{c.id}</TableCell>
                  <TableCell className="py-3 font-semibold text-slate-900">{c.name}</TableCell>
                  <TableCell className="py-3 text-slate-600">{c.state}</TableCell>
                  <TableCell className="py-3 pr-4">
                    <StatusIndicator status={c.active ? "active" : "inactive"} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ================= 9. SETTINGS PAGE ================= */
function SettingsPage() {
  const { data: settingsData, refetch } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) return {};
      const json = await res.json();
      return typeof json === "object" && json !== null ? json : {};
    },
  });

  const [settings, setSettings] = useState<any>({});
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (settingsData) setSettings(settingsData);
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, reason }),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Platform parameters updated and logged to audit trail");
      setReason("");
      refetch();
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure marketplace commission rates, GST taxation, SLA review windows, and creator thresholds.
        </p>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-lg max-w-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80">
          <h2 className="text-sm font-semibold text-slate-900">Economic & Operational Parameters</h2>
          <p className="text-xs text-slate-500">Changes take effect immediately for newly created campaigns and payouts.</p>
        </div>

        <div className="p-6 space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Artist / Sponsor Fee (%)</Label>
              <Input
                type="number"
                value={settings.feeArtistPercent ?? 10}
                onChange={(e) => setSettings({ ...settings, feeArtistPercent: Number(e.target.value) })}
                className="h-9 text-xs font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Creator Platform Fee (%)</Label>
              <Input
                type="number"
                value={settings.feeCreatorPercent ?? 7.5}
                onChange={(e) => setSettings({ ...settings, feeCreatorPercent: Number(e.target.value) })}
                className="h-9 text-xs font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">GST Rate (%)</Label>
              <Input
                type="number"
                value={settings.gstPercent ?? 18}
                onChange={(e) => setSettings({ ...settings, gstPercent: Number(e.target.value) })}
                className="h-9 text-xs font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Artist Review Window (Hours)</Label>
              <Input
                type="number"
                value={settings.reviewWindowHours ?? 48}
                onChange={(e) => setSettings({ ...settings, reviewWindowHours: Number(e.target.value) })}
                className="h-9 text-xs font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Minimum Withdrawal Amount (₹)</Label>
              <Input
                type="number"
                value={settings.minWithdrawalAmount ?? 1000}
                onChange={(e) => setSettings({ ...settings, minWithdrawalAmount: Number(e.target.value) })}
                className="h-9 text-xs font-mono tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Minimum Creator Followers</Label>
              <Input
                type="number"
                value={settings.minCreatorFollowers ?? 5000}
                onChange={(e) => setSettings({ ...settings, minCreatorFollowers: Number(e.target.value) })}
                className="h-9 text-xs font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              Mandatory Audit Justification Reason
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Document the business reason for modifying platform parameters..."
              rows={2}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-9 px-5 text-xs shadow-none"
              disabled={!reason.trim()}
              onClick={() => updateMutation.mutate()}
            >
              Save Parameters & Log Audit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= 10. PROMO CODES & PRO PAGE ================= */
function PromoCodesProPage() {
  const { data: promoCodesRaw, refetch: refetchPromos } = useQuery({
    queryKey: ["/api/admin/promo-codes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/promo-codes");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const { data: proSubscribersRaw } = useQuery({
    queryKey: ["/api/admin/creator-pro"],
    queryFn: async () => {
      const res = await fetch("/api/admin/creator-pro");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const promoCodes = Array.isArray(promoCodesRaw) ? promoCodesRaw : [];
  const proSubscribers = Array.isArray(proSubscribersRaw) ? proSubscribersRaw : [];

  const [code, setCode] = useState("");
  const [discountValue, setDiscountValue] = useState(100);

  const createPromo = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, discountType: "fixed", discountValue }),
      });
      if (!res.ok) throw new Error("Failed to create code");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Promotional code created");
      setCode("");
      refetchPromos();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Promo Codes & Creator Pro</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Issue fixed-value promotional codes and monitor active Creator Pro memberships.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Create Promo Form */}
        <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80">
            <h3 className="text-sm font-semibold text-slate-900">Create Promo Code</h3>
            <p className="text-xs text-slate-500">Issue a new discount code for campaigns</p>
          </div>
          <div className="p-5 space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Promo Code String</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. MINGREE100"
                className="h-8 text-xs font-mono uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Discount Amount (₹)</Label>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="h-8 text-xs font-mono tabular-nums"
              />
            </div>
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium w-full h-8 text-xs shadow-none"
              disabled={!code.trim()}
              onClick={() => createPromo.mutate()}
            >
              Create Promo Code
            </Button>
          </div>
        </div>

        {/* Promo Codes Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Active Promotional Codes</h3>
              <p className="text-xs text-slate-500">Redemption count and status across all codes</p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {promoCodes.length} codes
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
                  Code
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                  Discount Value
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">
                  Redemptions
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pr-4">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-slate-100">
              {promoCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    No promotional codes created yet.
                  </TableCell>
                </TableRow>
              ) : (
                promoCodes.map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/80">
                    <TableCell className="py-3 pl-4 font-mono font-semibold text-slate-900">{p.code}</TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums text-slate-700">
                      {formatINR(p.discountValue)}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono tabular-nums text-slate-700">
                      {p.usedCount || 0}
                    </TableCell>
                    <TableCell className="py-3 pr-4">
                      <StatusIndicator status={p.isActive ? "active" : "disabled"} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Creator Pro Subscribers */}
      {proSubscribers.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80">
            <h3 className="text-sm font-semibold text-slate-900">Creator Pro Subscribers</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
                  Subscriber
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-slate-100">
              {proSubscribers.map((sub: any, idx: number) => (
                <TableRow key={sub.id || idx}>
                  <TableCell className="py-3 pl-4 font-medium text-slate-900">
                    {sub.name || sub.email || `User #${sub.userId}`}
                  </TableCell>
                  <TableCell className="py-3">
                    <StatusIndicator status="active" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* ================= 11. AUDIT LOG PAGE ================= */
function AuditLogPage() {
  const [search, setSearch] = useState("");

  const { data: auditData, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["/api/admin/audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit-logs");
      if (!res.ok) throw new Error("Failed to load audit logs");
      return res.json();
    },
  });

  const filteredLogs = useMemo(() => {
    const list = Array.isArray(auditData?.logs) ? auditData.logs : [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (l: any) =>
        String(l.event || "").toLowerCase().includes(q) ||
        String(l.adminName || "").toLowerCase().includes(q) ||
        String(l.reason || "").toLowerCase().includes(q) ||
        String(l.targetType || "").toLowerCase().includes(q)
    );
  }, [auditData?.logs, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Security Audit Logs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable chronological record of every administrative action, justification, and origin IP address.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Search event, admin, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-white border-slate-200"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-3 text-xs bg-white border-slate-200 text-slate-700 gap-1.5 shadow-none"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading security audit trail..." />
      ) : isError ? (
        <ErrorAlert onRetry={() => refetch()} />
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 pl-4">
                  Log ID
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Administrator
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Event Action
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Target Entity
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Audit Justification
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  IP Address
                </TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right pr-4">
                  Timestamp
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                    No audit log entries match the current view.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((l: any) => (
                  <TableRow key={l.id} className="hover:bg-slate-50/80">
                    <TableCell className="py-3 pl-4 font-mono tabular-nums font-medium text-slate-600">
                      #{l.id}
                    </TableCell>
                    <TableCell className="py-3 font-medium text-slate-900">
                      {l.adminName}{" "}
                      <span className="font-mono tabular-nums text-slate-400 text-[11px]">(#{l.adminId})</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-800">
                        {l.event}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 font-mono tabular-nums text-slate-700">
                      {l.targetType} #{l.targetId}
                    </TableCell>
                    <TableCell className="py-3 text-slate-600 max-w-xs truncate">{l.reason}</TableCell>
                    <TableCell className="py-3 font-mono tabular-nums text-slate-500">{l.ipAddress}</TableCell>
                    <TableCell className="py-3 text-right pr-4 font-mono tabular-nums text-slate-500">
                      {new Date(l.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* ================= SHARED ENTERPRISE UI PRIMITIVES ================= */
function StatusIndicator({ status }: { status: string }) {
  const norm = String(status || "").toLowerCase();

  if (["active", "approved", "paid", "ok", "completed"].includes(norm)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 capitalize">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>{status}</span>
      </span>
    );
  }

  if (["blocked", "rejected", "failed", "disputed"].includes(norm)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80 capitalize">
        <Ban className="w-3 h-3 text-rose-600" />
        <span>{status}</span>
      </span>
    );
  }

  if (["pending", "open", "needs_review"].includes(norm)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80 capitalize">
        <Clock className="w-3 h-3 text-amber-600" />
        <span>{status.replace("_", " ")}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 capitalize">
      <span>{status || "Unknown"}</span>
    </span>
  );
}

function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-lg p-12 text-center space-y-2.5 text-xs text-slate-500">
      <RotateCw className="w-5 h-5 text-slate-400 animate-spin mx-auto" />
      <p className="font-medium text-slate-600">{label || "Loading data..."}</p>
    </div>
  );
}

function ErrorAlert({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div className="p-6 bg-white border border-rose-200 rounded-lg text-center space-y-3 text-xs">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 mx-auto">
        <AlertCircle className="w-4 h-4" />
      </div>
      <p className="font-semibold text-slate-900">{message || "Unable to load data from the administration service."}</p>
      <div>
        <Button
          size="sm"
          variant="outline"
          className="border-slate-200 text-slate-700 hover:bg-slate-50 h-8 px-3 text-xs shadow-none"
          onClick={onRetry}
        >
          Retry Request
        </Button>
      </div>
    </div>
  );
}

function PaginationFooter({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="px-4 py-3 border-t border-slate-200/80 flex items-center justify-between text-xs bg-slate-50/50">
      <span className="text-slate-500 font-mono tabular-nums">
        Page <strong className="font-semibold text-slate-900">{page}</strong> of{" "}
        <strong className="font-semibold text-slate-900">{totalPages}</strong>
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs border-slate-200 bg-white shadow-none"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs border-slate-200 bg-white shadow-none"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default AdminDashboard;
