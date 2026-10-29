import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";

// Icons Fallbacks
const TrendingUp = () => <span>📊</span>;
const Users = () => <span>👥</span>;
const ShieldAlert = () => <span>🛡️</span>;
const Briefcase = () => <span>💼</span>;
const AlertTriangle = () => <span>⚠️</span>;
const CreditCard = () => <span>💳</span>;
const DollarSign = () => <span>💵</span>;
const MapPin = () => <span>📍</span>;
const Settings = () => <span>⚙️</span>;
const Ticket = () => <span>🎟️</span>;
const FileText = () => <span>📜</span>;
const RefreshCw = () => <span>🔄</span>;
const CheckCircle2 = () => <span>✅</span>;
const XCircle = () => <span>❌</span>;
const Search = () => <span>🔍</span>;

const adminMenuItems = [
  { id: "overview", label: "1. Overview", icon: TrendingUp },
  { id: "users", label: "2. Users", icon: Users },
  { id: "risk-review", label: "3. Risk review", icon: ShieldAlert },
  { id: "campaigns-deals", label: "4. Campaigns and deals", icon: Briefcase },
  { id: "disputes", label: "5. Disputes", icon: AlertTriangle },
  { id: "withdrawals", label: "6. Withdrawals", icon: CreditCard },
  { id: "payments", label: "7. Payments", icon: DollarSign },
  { id: "cities", label: "8. Cities", icon: MapPin },
  { id: "settings", label: "9. Settings", icon: Settings },
  { id: "promo-codes-pro", label: "10. Promo codes & Pro", icon: Ticket },
  { id: "audit-log", label: "11. Audit log", icon: FileText },
];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Admin Header */}
      <header className="bg-white border-b border-pink-100 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden border-pink-200 text-pink-600 font-bold"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰ Menu
          </Button>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#FF3399] animate-pulse" />
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">Mingree Admin Panel</span>
            <Badge className="bg-pink-100 text-[#FF3399] border border-pink-200 font-semibold text-xs">Production System</Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs hidden sm:inline-flex"
            onClick={() => setLocation("/dashboard")}
          >
            Creator View →
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-xs"
            onClick={handleLogout}
          >
            Log Out
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-pink-100 flex flex-col p-4
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="mb-4 px-2">
            <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Navigation</p>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {adminMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === item.id
                    ? "bg-[#FF3399] text-white shadow-md shadow-pink-500/20 font-bold scale-[1.01]"
                    : "text-slate-600 hover:bg-pink-50 hover:text-[#FF3399]"
                }`}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === "overview" && <OverviewPage onNavigate={(tab) => setActiveTab(tab)} />}
            {activeTab === "users" && <UsersPage />}
            {activeTab === "risk-review" && <RiskReviewPage />}
            {activeTab === "campaigns-deals" && <CampaignsDealsPage />}
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
function OverviewPage({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { data: overview, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/admin/overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/overview");
      if (!res.ok) throw new Error("Failed to load admin overview");
      return res.json();
    },
  });

  if (isLoading) return <LoadingSpinner label="Loading platform overview stats..." />;
  if (isError) return <ErrorAlert onRetry={() => refetch()} message="Could not connect to overview backend service" />;

  const needs = overview?.needsAttention || {};
  const escrowCheck = overview?.escrowInvariant || { isOk: true, artistDetails: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Platform Overview</h1>
        <p className="text-xs text-slate-500">Live operational stats, money verification, and needs attention queue links.</p>
      </div>

      {/* Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <StatCard title="Creators (Total)" value={overview?.totalCreators || 0} subtitle={`Nano: ${overview?.creatorsByTier?.Nano || 0}, Micro: ${overview?.creatorsByTier?.Micro || 0}`} />
        <StatCard title="Artists / Sponsors" value={overview?.totalArtists || 0} />
        <StatCard title="Active Campaigns" value={overview?.activeCampaignsCount || 0} />
        <StatCard title="Open Deals" value={overview?.openDealsCount || 0} />
        <StatCard title="Total Escrow Held" value={`₹${(overview?.totalEscrowHeld || 0).toLocaleString()}`} />
        <StatCard title="Wallet Balances Total" value={`₹${(overview?.totalWalletBalances || 0).toLocaleString()}`} />
        <StatCard title="Fees Earned (Month)" value={`₹${(overview?.feesEarned?.total || 0).toLocaleString()}`} subtitle={`Net: ₹${overview?.feesEarned?.net || 0} | GST: ₹${overview?.feesEarned?.gstPortion || 0}`} />
        <StatCard title="Withdrawals Paid (Month)" value={`₹${(overview?.withdrawalsPaidThisMonth || 0).toLocaleString()}`} />
      </div>

      {/* Needs Attention Queue Links */}
      <Card className="border-pink-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-pink-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>🚨 Needs Attention Queues</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">Click any queue counter to navigate directly to the action page.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <QueueBadge count={needs.riskReviewCount} label="Risk Review" onClick={() => onNavigate("risk-review")} />
          <QueueBadge count={needs.manualCheckDealsCount} label="Manual Check Deals" onClick={() => onNavigate("campaigns-deals")} />
          <QueueBadge count={needs.silentArtistDealsCount} label="Silent Artist Deals" onClick={() => onNavigate("campaigns-deals")} />
          <QueueBadge count={needs.disputesCount} label="Open Disputes" onClick={() => onNavigate("disputes")} />
          <QueueBadge count={needs.pendingWithdrawalsCount} label="Withdrawals Pending" onClick={() => onNavigate("withdrawals")} />
          <QueueBadge count={needs.pendingUpiCount} label="Manual UPI Pending" onClick={() => onNavigate("payments")} />
          <QueueBadge count={needs.pendingCityRequestsCount} label="City Changes Pending" onClick={() => onNavigate("cities")} />
        </CardContent>
      </Card>

      {/* Escrow Invariant Check Card */}
      <Card className={`border shadow-sm ${escrowCheck.isOk ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'}`}>
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>🔒 Money Check: Escrow Invariant Verification</span>
            </CardTitle>
            <Badge className={escrowCheck.isOk ? "bg-emerald-600 text-white font-bold" : "bg-red-600 text-white font-bold"}>
              {escrowCheck.isOk ? "OK - Escrow Holds Cleanly" : `DISCREPANCY DETECTED: ₹${escrowCheck.totalDiscrepancy}`}
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-600">
            For every artist: wallet.escrow_held must equal budget_remaining of active campaigns plus unreleased amounts of open deals.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow className="text-xs font-bold text-slate-700 bg-slate-100">
                <TableHead>Artist</TableHead>
                <TableHead>Escrow Held (Wallet)</TableHead>
                <TableHead>Active Campaigns Remaining</TableHead>
                <TableHead>Open Deals Unreleased</TableHead>
                <TableHead>Expected Total Escrow</TableHead>
                <TableHead>Status / Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {escrowCheck.artistDetails?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-slate-400">No artist accounts currently holding escrow.</TableCell>
                </TableRow>
              ) : (
                escrowCheck.artistDetails?.map((a: any) => (
                  <TableRow key={a.artistId}>
                    <TableCell className="font-semibold text-slate-900">{a.artistName} (#{a.artistId})</TableCell>
                    <TableCell className="font-mono">₹{a.escrowHeld.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">₹{a.campaignsBudgetRemaining.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">₹{a.openDealsUnreleased.toLocaleString()}</TableCell>
                    <TableCell className="font-mono font-bold">₹{a.expectedEscrow.toLocaleString()}</TableCell>
                    <TableCell>
                      {a.status === "OK" ? (
                        <span className="text-emerald-600 font-bold">✓ OK</span>
                      ) : (
                        <span className="text-red-600 font-bold">⚠️ Difference: ₹{a.difference}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
  const [actionDialog, setActionDialog] = useState<{ type: "block" | "unblock" | "reset_ig" | "change_city"; userId: number; userName: string } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionCity, setActionCity] = useState("");

  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Users Directory</h1>
          <p className="text-xs text-slate-500">Search and filter creators, artists and admins. Full audit logging enforced.</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Input
            placeholder="Search by name, email, or Instagram handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[130px] text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="creator">Creators</SelectItem>
            <SelectItem value="sponsor">Artists / Sponsors</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
          <RefreshCw /> Filter
        </Button>
      </div>

      {/* Users Table */}
      {isLoading ? <LoadingSpinner label="Loading users list..." /> : isError ? <ErrorAlert onRetry={() => refetch()} /> : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs font-bold text-slate-700">
                <TableHead>User ID</TableHead>
                <TableHead>Name / Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Instagram Status</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {data?.users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-slate-400">No users found matching search criteria.</TableCell>
                </TableRow>
              ) : (
                data?.users?.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono font-bold text-slate-900">#{u.id}</TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize text-[10px]">{u.role}</Badge></TableCell>
                    <TableCell>{u.city}</TableCell>
                    <TableCell>
                      {u.creatorProfile ? (
                        <div>
                          <span className="font-bold text-[#FF3399]">@{u.creatorProfile.username}</span>
                          <span className="block text-[10px] text-slate-400">
                            {u.creatorProfile.followers?.toLocaleString()} followers ({u.creatorProfile.metricsSource})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unlinked</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">₹{u.wallet?.balance?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={u.status === "blocked" ? "bg-red-500" : "bg-emerald-600"}>{u.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" className="text-[11px] h-7 px-2" onClick={() => setSelectedUser(u)}>
                        Detail
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={u.status === "blocked" ? "text-emerald-600 h-7 px-2" : "text-red-600 h-7 px-2"}
                        onClick={() => setActionDialog({ type: u.status === "blocked" ? "unblock" : "block", userId: u.id, userName: u.name })}
                      >
                        {u.status === "blocked" ? "Unblock" : "Block"}
                      </Button>
                      {u.creatorProfile && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-amber-600 h-7 px-2"
                          onClick={() => setActionDialog({ type: "reset_ig", userId: u.id, userName: u.name })}
                        >
                          Reset IG
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-slate-700 h-7 px-2"
                        onClick={() => {
                          setActionDialog({ type: "change_city", userId: u.id, userName: u.name });
                          setActionCity(u.city);
                        }}
                      >
                        City
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <PaginationFooter page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </div>
      )}

      {/* Confirmation & Reason Modal */}
      <Dialog open={Boolean(actionDialog)} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Confirm Action: {actionDialog?.type.toUpperCase()} for {actionDialog?.userName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A typed reason is strictly required. This action will be recorded in the security audit log.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {actionDialog?.type === "change_city" && (
              <div>
                <Label>New City Name</Label>
                <Input value={actionCity} onChange={(e) => setActionCity(e.target.value)} placeholder="e.g. Mumbai, Delhi, Bangalore" />
              </div>
            )}

            <div>
              <Label>Typed Reason (Required for Audit Log)</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Type the mandatory justification here..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              size="sm"
              className="bg-[#FF3399] hover:bg-pink-600 text-white font-bold"
              disabled={!actionReason.trim() || (actionDialog?.type === "change_city" && !actionCity.trim())}
              onClick={() => {
                if (!actionDialog) return;
                if (actionDialog.type === "block" || actionDialog.type === "unblock") {
                  blockMutation.mutate({ userId: actionDialog.userId, block: actionDialog.type === "block", reason: actionReason });
                } else if (actionDialog.type === "reset_ig") {
                  resetIgMutation.mutate({ userId: actionDialog.userId, reason: actionReason });
                } else if (actionDialog.type === "change_city") {
                  cityMutation.mutate({ userId: actionDialog.userId, city: actionCity, reason: actionReason });
                }
              }}
            >
              Submit & Log Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Drawer / Modal */}
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}

function UserDetailModal({ user, onClose }: { user: any; onClose: () => void }) {
  if (!user) return null;
  return (
    <Dialog open={Boolean(user)} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">User Profile Details: #{user.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
            <div><span className="font-bold text-slate-500">Name:</span> {user.name}</div>
            <div><span className="font-bold text-slate-500">Email:</span> {user.email}</div>
            <div><span className="font-bold text-slate-500">Role:</span> {user.role}</div>
            <div><span className="font-bold text-slate-500">City:</span> {user.city}</div>
            <div><span className="font-bold text-slate-500">Masked PAN:</span> {user.maskedPan || "N/A"}</div>
            <div><span className="font-bold text-slate-500">Wallet Balance:</span> ₹{user.wallet?.balance?.toLocaleString()}</div>
          </div>

          {user.creatorProfile && (
            <div className="bg-pink-50/50 p-3 rounded border border-pink-200 space-y-1">
              <h4 className="font-bold text-[#FF3399]">Instagram Profile Status</h4>
              <p>Username: @{user.creatorProfile.username}</p>
              <p>Followers: {user.creatorProfile.followers?.toLocaleString()}</p>
              <p>Metrics Source: <Badge variant="outline" className="bg-white">{user.creatorProfile.metricsSource}</Badge></p>
              <p>Risk Score: <Badge className={user.creatorProfile.riskScore >= 40 ? "bg-red-500" : "bg-emerald-600"}>{user.creatorProfile.riskScore}</Badge></p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
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

  const { data, isLoading, isError, refetch } = useQuery({
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
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Risk Review Queue</h1>
        <p className="text-xs text-slate-500">Creators flagged for follower bursts, elevated risk scores, or manual review.</p>
      </div>

      {isLoading ? <LoadingSpinner label="Loading risk queue..." /> : isError ? <ErrorAlert onRetry={() => refetch()} /> : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs font-bold text-slate-700">
                <TableHead>User ID</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Instagram</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Burst Detection</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {data?.queue?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-slate-400">Risk review queue is clear! No flagged creators.</TableCell>
                </TableRow>
              ) : (
                data?.queue?.map((c: any) => (
                  <TableRow key={c.userId}>
                    <TableCell className="font-mono font-bold">#{c.userId}</TableCell>
                    <TableCell>{c.name} ({c.email})</TableCell>
                    <TableCell className="font-bold text-[#FF3399]">@{c.username || "N/A"}</TableCell>
                    <TableCell className="font-mono">{c.followers?.toLocaleString()}</TableCell>
                    <TableCell><span className="text-amber-600 font-semibold">{c.burstDetection}</span></TableCell>
                    <TableCell><Badge className="bg-red-500 font-bold">{c.riskScore}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="bg-[#FF3399] hover:bg-pink-600 text-white font-bold h-7 text-xs" onClick={() => setSelectedCreator(c)}>
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
            <DialogTitle className="text-base font-bold text-slate-900">Risk Review: {selectedCreator?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded border">
              <p>Risk Score: <span className="font-bold text-red-600">{selectedCreator?.riskScore}</span></p>
              <p>Burst Detection: <span className="font-bold">{selectedCreator?.burstDetection}</span></p>
            </div>

            <div>
              <Label>Decision Note (Required)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="State reasons for approval or rejection..." rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="text-red-600 border-red-200" disabled={!note.trim()} onClick={() => decideMutation.mutate({ userId: selectedCreator.userId, action: "reject", notes: note })}>
              Reject Creator
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" disabled={!note.trim()} onClick={() => decideMutation.mutate({ userId: selectedCreator.userId, action: "approve", notes: note })}>
              Approve (Move Active)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= 4. CAMPAIGNS AND DEALS PAGE ================= */
function CampaignsDealsPage() {
  const [activeSubTab, setActiveSubTab] = useState<"campaigns" | "manual_check" | "artist_silent">("campaigns");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Campaigns & Deals Queues</h1>
        <p className="text-xs text-slate-500">Monitor active campaigns and resolve Instagram API post verification failures or silent artist deals.</p>
      </div>

      <div className="flex border-b border-slate-200 gap-4">
        <button className={`pb-2 text-xs font-bold border-b-2 ${activeSubTab === "campaigns" ? "border-[#FF3399] text-[#FF3399]" : "border-transparent text-slate-500"}`} onClick={() => setActiveSubTab("campaigns")}>
          Campaigns List
        </button>
        <button className={`pb-2 text-xs font-bold border-b-2 ${activeSubTab === "manual_check" ? "border-[#FF3399] text-[#FF3399]" : "border-transparent text-slate-500"}`} onClick={() => setActiveSubTab("manual_check")}>
          Needs Manual Check Queue
        </button>
        <button className={`pb-2 text-xs font-bold border-b-2 ${activeSubTab === "artist_silent" ? "border-[#FF3399] text-[#FF3399]" : "border-transparent text-slate-500"}`} onClick={() => setActiveSubTab("artist_silent")}>
          Artist Silent Queue
        </button>
      </div>

      {activeSubTab === "campaigns" && <CampaignsSubView />}
      {activeSubTab === "manual_check" && <ManualCheckSubView />}
      {activeSubTab === "artist_silent" && <ArtistSilentSubView />}
    </div>
  );
}

function CampaignsSubView() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/admin/campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/admin/campaigns");
      if (!res.ok) throw new Error("Failed to load campaigns");
      return res.json();
    },
  });

  if (isLoading) return <LoadingSpinner label="Loading campaigns list..." />;
  if (isError) return <ErrorAlert onRetry={() => refetch()} />;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 text-xs font-bold text-slate-700">
            <TableHead>Campaign ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Artist</TableHead>
            <TableHead>Total Budget</TableHead>
            <TableHead>Budget Remaining</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs">
          {data?.campaigns?.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400">No campaigns found.</TableCell></TableRow>
          ) : (
            data?.campaigns?.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-bold">#{c.id}</TableCell>
                <TableCell className="font-bold text-slate-900">{c.title}</TableCell>
                <TableCell>{c.artistName}</TableCell>
                <TableCell className="font-mono">₹{c.budget?.toLocaleString()}</TableCell>
                <TableCell className="font-mono font-bold text-emerald-600">₹{c.budgetRemaining?.toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{c.status}</Badge></TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
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
    },
  });

  if (isLoading) return <LoadingSpinner label="Loading manual check queue..." />;
  if (isError) return <ErrorAlert onRetry={() => refetch()} />;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 text-xs font-bold text-slate-700">
            <TableHead>Deal ID</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead>Submitted Post Link</TableHead>
            <TableHead>Price</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs">
          {data?.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400">Queue is clear! All IG posts confirmed.</TableCell></TableRow>
          ) : (
            data?.map((d: any) => (
              <TableRow key={d.dealId}>
                <TableCell className="font-mono font-bold">#{d.dealId}</TableCell>
                <TableCell>{d.campaignTitle}</TableCell>
                <TableCell>{d.creatorName}</TableCell>
                <TableCell><a href={d.postUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-mono">View Post Link</a></TableCell>
                <TableCell className="font-mono">₹{d.price}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => decideMutation.mutate({ dealId: d.dealId, action: "reject", reason: "Post verification failed" })}>Reject</Button>
                  <Button size="sm" className="bg-emerald-600 text-white font-bold" onClick={() => decideMutation.mutate({ dealId: d.dealId, action: "approve", reason: "Admin verified post tags and audio" })}>Approve</Button>
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
    mutationFn: async ({ dealId, action, reason }: { dealId: number; action: "approve" | "send_back"; reason: string }) => {
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
    },
  });

  if (isLoading) return <LoadingSpinner label="Loading silent deals queue..." />;
  if (isError) return <ErrorAlert onRetry={() => refetch()} />;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 text-xs font-bold text-slate-700">
            <TableHead>Deal ID</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Silent Artist</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead>Hours Past Window</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs">
          {data?.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400">No silent artist deals waiting.</TableCell></TableRow>
          ) : (
            data?.map((d: any) => (
              <TableRow key={d.dealId}>
                <TableCell className="font-mono font-bold">#{d.dealId}</TableCell>
                <TableCell>{d.campaignTitle}</TableCell>
                <TableCell>{d.artistName}</TableCell>
                <TableCell>{d.creatorName}</TableCell>
                <TableCell><Badge className="bg-amber-500 font-bold">{d.hoursSilent}h</Badge></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => decideMutation.mutate({ dealId: d.dealId, action: "send_back", reason: "Reminded artist to review" })}>Send Back</Button>
                  <Button size="sm" className="bg-[#FF3399] text-white font-bold" onClick={() => decideMutation.mutate({ dealId: d.dealId, action: "approve", reason: "Auto-approve enforced past 48h review window" })}>Auto Approve & Release Funds</Button>
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/admin/disputes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/disputes");
      if (!res.ok) throw new Error("Failed to load disputes");
      return res.json();
    },
  });

  const settleMutation = useMutation({
    mutationFn: async ({ disputeId, resolution, reason, creatorPercent }: { disputeId: number; resolution: string; reason: string; creatorPercent?: number }) => {
      const idempotencyKey = `settle_${disputeId}_${Date.now()}`;
      const res = await fetch(`/api/admin/disputes/${disputeId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          reason,
          splitParams: resolution === "split" ? { creatorPercent, artistPercent: 100 - (creatorPercent || 50) } : undefined,
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
      toast.success("Dispute settled via single settle() transaction!");
      setSelectedDispute(null);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/disputes"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Disputes Resolution Console</h1>
        <p className="text-xs text-slate-500">Single settle() function with idempotency keys. Money moves only via ledger entries.</p>
      </div>

      {isLoading ? <LoadingSpinner label="Loading disputes list..." /> : isError ? <ErrorAlert onRetry={() => refetch()} /> : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs font-bold text-slate-700">
                <TableHead>Dispute ID</TableHead>
                <TableHead>Deal ID</TableHead>
                <TableHead>Raised By</TableHead>
                <TableHead>Frozen Amount</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {data?.disputes?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-slate-400">No open disputes requiring resolution.</TableCell></TableRow>
              ) : (
                data?.disputes?.map((disp: any) => (
                  <TableRow key={disp.id}>
                    <TableCell className="font-mono font-bold">#{disp.id}</TableCell>
                    <TableCell className="font-mono">Deal #{disp.dealId}</TableCell>
                    <TableCell>{disp.raisedByName}</TableCell>
                    <TableCell className="font-mono font-bold text-[#FF3399]">₹{disp.frozenAmount}</TableCell>
                    <TableCell>{disp.ageHours}h open</TableCell>
                    <TableCell><Badge className={disp.status === "open" ? "bg-amber-500" : "bg-slate-500"}>{disp.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {disp.status === "open" ? (
                        <Button size="sm" className="bg-[#FF3399] text-white font-bold h-7" onClick={() => setSelectedDispute(disp)}>
                          Settle Dispute
                        </Button>
                      ) : (
                        <span className="text-slate-400 italic">Read-Only</span>
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
            <DialogTitle className="text-base font-bold text-slate-900">Settle Dispute #{selectedDispute?.id}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded border">
              <p>Frozen Deal Amount: <span className="font-mono font-bold text-[#FF3399]">₹{selectedDispute?.frozenAmount}</span></p>
              <p>Reason Raised: {selectedDispute?.reason}</p>
            </div>

            <div>
              <Label>Settlement Decision</Label>
              <Select value={resolution} onValueChange={(v: any) => setResolution(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="release_creator">100% Release to Creator</SelectItem>
                  <SelectItem value="refund_artist">100% Refund to Artist</SelectItem>
                  <SelectItem value="split">Split Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {resolution === "split" && (
              <div>
                <Label>Creator Share: {creatorPct}% | Artist Share: {100 - creatorPct}%</Label>
                <Input type="range" min={1} max={99} value={creatorPct} onChange={(e) => setCreatorPct(Number(e.target.value))} />
              </div>
            )}

            <div>
              <Label>Mandatory Typed Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Type justification for financial movement..." rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setSelectedDispute(null)}>Cancel</Button>
            <Button
              size="sm"
              className="bg-[#FF3399] text-white font-bold"
              disabled={!reason.trim()}
              onClick={() => settleMutation.mutate({ disputeId: selectedDispute.id, resolution, reason, creatorPercent: creatorPct })}
            >
              Confirm Settle & Move Money
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

  const { data, isLoading, isError, refetch } = useQuery({
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
      toast.success("Payout approved with UTR!");
      setSelectedWithdrawal(null);
      setUtrRef("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
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
      toast.success("Payout rejected and funds returned to creator balance");
      setSelectedWithdrawal(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Withdrawals Queue</h1>
        <p className="text-xs text-slate-500">Approve creator payouts with bank UTR transfer reference or reject with immediate refund.</p>
      </div>

      {isLoading ? <LoadingSpinner label="Loading withdrawals..." /> : isError ? <ErrorAlert onRetry={() => refetch()} /> : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs font-bold text-slate-700">
                <TableHead>Withdrawal ID</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Requested Amount</TableHead>
                <TableHead>Masked Payout Method</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {data?.withdrawals?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-slate-400">No withdrawal requests found.</TableCell></TableRow>
              ) : (
                data?.withdrawals?.map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono font-bold">#{w.id}</TableCell>
                    <TableCell>{w.userName}</TableCell>
                    <TableCell className="font-mono font-bold">₹{w.amount?.toLocaleString()}</TableCell>
                    <TableCell>{w.maskedPayoutMethod}</TableCell>
                    <TableCell><Badge variant="outline">{w.kycStatus}</Badge></TableCell>
                    <TableCell><Badge className={w.status === "paid" ? "bg-emerald-600" : w.status === "rejected" ? "bg-red-500" : "bg-amber-500"}>{w.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      {w.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" className="text-red-600 h-7" onClick={() => { setSelectedWithdrawal(w); setModalType("reject"); }}>Reject</Button>
                          <Button size="sm" className="bg-emerald-600 text-white font-bold h-7" onClick={() => { setSelectedWithdrawal(w); setModalType("approve"); }}>Approve (UTR)</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal */}
      <Dialog open={Boolean(selectedWithdrawal)} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {modalType === "approve" ? "Approve Payout" : "Reject Payout"} #{selectedWithdrawal?.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {modalType === "approve" ? (
              <div>
                <Label>UTR Transfer Reference Number (Required)</Label>
                <Input value={utrRef} onChange={(e) => setUtrRef(e.target.value)} placeholder="e.g. UTR1234567890" />
              </div>
            ) : (
              <div>
                <Label>Rejection Reason (Required)</Label>
                <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejecting withdrawal request..." rows={3} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setSelectedWithdrawal(null)}>Cancel</Button>
            <Button
              size="sm"
              className={modalType === "approve" ? "bg-emerald-600 text-white font-bold" : "bg-red-600 text-white font-bold"}
              disabled={modalType === "approve" ? !utrRef.trim() : !rejectReason.trim()}
              onClick={() => {
                if (modalType === "approve") approveMutation.mutate({ withdrawalId: selectedWithdrawal.id, utr: utrRef });
                else rejectMutation.mutate({ withdrawalId: selectedWithdrawal.id, reason: rejectReason });
              }}
            >
              Submit Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= 7. PAYMENTS PAGE ================= */
function PaymentsPage() {
  const { data: upiList, isLoading: upiLoading } = useQuery({
    queryKey: ["/api/admin/payments/upi"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payments/upi");
      return res.json();
    },
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
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
      toast.success("Manual UPI topup approved and credited!");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/upi"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Payments & Ledger Explorer</h1>
        <p className="text-xs text-slate-500">Manual UPI approvals and read-only immutable ledger entries.</p>
      </div>

      {/* Manual UPI Section */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader><CardTitle className="text-sm font-bold">Manual UPI Payments Queue</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs font-bold"><TableHead>Payment ID</TableHead><TableHead>UTR</TableHead><TableHead>Payer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {upiList?.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-4 text-slate-400">No UPI payments.</TableCell></TableRow> : (
                upiList?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">#{p.id}</TableCell>
                    <TableCell className="font-mono font-bold text-[#FF3399]">{p.utr}</TableCell>
                    <TableCell>{p.payerName}</TableCell>
                    <TableCell className="font-mono font-bold">₹{p.amount}</TableCell>
                    <TableCell><Badge className={p.status === "approved" ? "bg-emerald-600" : "bg-amber-500"}>{p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {p.status === "pending" && (
                        <Button size="sm" className="bg-emerald-600 text-white font-bold h-7" onClick={() => approveUpi.mutate(p.id)}>Approve Topup</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Immutable Ledger Explorer */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader><CardTitle className="text-sm font-bold">Immutable Ledger Explorer</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs font-bold"><TableHead>Tx ID</TableHead><TableHead>User ID</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Balance After</TableHead><TableHead>Timestamp</TableHead></TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {ledgerData?.entries?.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-4 text-slate-400">Ledger is empty.</TableCell></TableRow> : (
                ledgerData?.entries?.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono font-bold">#{e.id}</TableCell>
                    <TableCell className="font-mono">User #{e.userId}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono">{e.type}</Badge></TableCell>
                    <TableCell className={`font-mono font-bold ${e.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>₹{e.amount}</TableCell>
                    <TableCell className="font-mono">₹{e.balanceAfter}</TableCell>
                    <TableCell className="text-slate-400">{new Date(e.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================= 8. CITIES PAGE ================= */
function CitiesPage() {
  const { data: citiesList, refetch: refetchCities } = useQuery({
    queryKey: ["/api/admin/cities"],
    queryFn: async () => (await fetch("/api/admin/cities")).json(),
  });

  const { data: cityRequests, refetch: refetchRequests } = useQuery({
    queryKey: ["/api/admin/city-change-requests"],
    queryFn: async () => (await fetch("/api/admin/city-change-requests")).json(),
  });

  const queryClient = useQueryClient();

  const decideRequest = useMutation({
    mutationFn: async ({ requestId, action, note }: { requestId: number; action: "approve" | "reject"; note: string }) => {
      const res = await fetch(`/api/admin/city-change-requests/${requestId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (!res.ok) throw new Error("Failed to decide city change request");
      return res.json();
    },
    onSuccess: () => {
      toast.success("City request executed and user city updated");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/city-change-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Cities Management</h1>
        <p className="text-xs text-slate-500">Edit cities table and process creator city change requests.</p>
      </div>

      {/* City Change Requests Queue */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader><CardTitle className="text-sm font-bold">City Change Requests Queue</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs font-bold"><TableHead>Req ID</TableHead><TableHead>Creator</TableHead><TableHead>From City</TableHead><TableHead>To City</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {cityRequests?.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-4 text-slate-400">No pending city requests.</TableCell></TableRow> : (
                cityRequests?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">#{r.id}</TableCell>
                    <TableCell>{r.creatorName}</TableCell>
                    <TableCell>{r.fromCity}</TableCell>
                    <TableCell className="font-bold text-[#FF3399]">{r.toCity}</TableCell>
                    <TableCell>{r.reason}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" className="text-red-600 h-7" onClick={() => decideRequest.mutate({ requestId: r.id, action: "reject", note: "Rejected" })}>Reject</Button>
                          <Button size="sm" className="bg-emerald-600 text-white font-bold h-7" onClick={() => decideRequest.mutate({ requestId: r.id, action: "approve", note: "Approved" })}>Approve</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Cities List */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader><CardTitle className="text-sm font-bold">Cities Table</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs font-bold"><TableHead>City ID</TableHead><TableHead>Name</TableHead><TableHead>State</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {citiesList?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">#{c.id}</TableCell>
                  <TableCell className="font-bold text-slate-900">{c.name}</TableCell>
                  <TableCell>{c.state}</TableCell>
                  <TableCell><Badge className={c.active ? "bg-emerald-600" : "bg-slate-400"}>{c.active ? "Active" : "Inactive"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================= 9. SETTINGS PAGE ================= */
function SettingsPage() {
  const { data: settingsData, refetch } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => (await fetch("/api/admin/settings")).json(),
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
      toast.success("Platform settings updated and audited!");
      setReason("");
      refetch();
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Platform Settings</h1>
        <p className="text-xs text-slate-500">Configurable fees, GST, review window hours, CPM benchmarks. Audited changes required.</p>
      </div>

      <Card className="border border-slate-200 shadow-sm max-w-2xl bg-white p-4 space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Artist Fee Percent (%)</Label>
            <Input type="number" value={settings.feeArtistPercent || 10} onChange={(e) => setSettings({ ...settings, feeArtistPercent: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Creator Fee Percent (%)</Label>
            <Input type="number" value={settings.feeCreatorPercent || 7.5} onChange={(e) => setSettings({ ...settings, feeCreatorPercent: Number(e.target.value) })} />
          </div>
          <div>
            <Label>GST Percent (%)</Label>
            <Input type="number" value={settings.gstPercent || 18} onChange={(e) => setSettings({ ...settings, gstPercent: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Review Window (Hours)</Label>
            <Input type="number" value={settings.reviewWindowHours || 48} onChange={(e) => setSettings({ ...settings, reviewWindowHours: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Min Withdrawal Amount (₹)</Label>
            <Input type="number" value={settings.minWithdrawalAmount || 1000} onChange={(e) => setSettings({ ...settings, minWithdrawalAmount: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Min Followers Threshold</Label>
            <Input type="number" value={settings.minCreatorFollowers || 5000} onChange={(e) => setSettings({ ...settings, minCreatorFollowers: Number(e.target.value) })} />
          </div>
        </div>

        <div>
          <Label>Typed Justification Reason (Required for Audit)</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for modifying platform parameters..." rows={2} />
        </div>

        <Button className="bg-[#FF3399] text-white font-bold w-full" disabled={!reason.trim()} onClick={() => updateMutation.mutate()}>
          Save Settings & Log Audit
        </Button>
      </Card>
    </div>
  );
}

/* ================= 10. PROMO CODES & PRO PAGE ================= */
function PromoCodesProPage() {
  const { data: promoCodes, refetch: refetchPromos } = useQuery({
    queryKey: ["/api/admin/promo-codes"],
    queryFn: async () => (await fetch("/api/admin/promo-codes")).json(),
  });

  const { data: proSubscribers } = useQuery({
    queryKey: ["/api/admin/creator-pro"],
    queryFn: async () => (await fetch("/api/admin/creator-pro")).json(),
  });

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
      toast.success("Promo code created!");
      setCode("");
      refetchPromos();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Promo Codes & Creator Pro</h1>
        <p className="text-xs text-slate-500">Manage promotional discount codes and view active Creator Pro subscribers.</p>
      </div>

      <Card className="border border-slate-200 shadow-sm p-4 space-y-3 max-w-md bg-white text-xs">
        <h3 className="font-bold text-[#FF3399]">Create New Promo Code</h3>
        <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. MINGREE100" /></div>
        <div><Label>Discount Amount (₹)</Label><Input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} /></div>
        <Button className="bg-[#FF3399] text-white font-bold w-full" disabled={!code.trim()} onClick={() => createPromo.mutate()}>Create Promo Code</Button>
      </Card>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader><CardTitle className="text-sm font-bold">Promo Codes List</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow className="bg-slate-50 text-xs font-bold"><TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Used Count</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody className="text-xs">
              {promoCodes?.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-bold">{p.code}</TableCell>
                  <TableCell>₹{p.discountValue}</TableCell>
                  <TableCell>{p.usedCount}</TableCell>
                  <TableCell><Badge className={p.isActive ? "bg-emerald-600" : "bg-slate-400"}>{p.isActive ? "Active" : "Disabled"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================= 11. AUDIT LOG PAGE ================= */
function AuditLogPage() {
  const { data: auditData, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/admin/audit-logs"],
    queryFn: async () => (await fetch("/api/admin/audit-logs")).json(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Security Audit Logs</h1>
        <p className="text-xs text-slate-500">Read-only immutable history of every administrative action, old/new values, and IP addresses.</p>
      </div>

      {isLoading ? <LoadingSpinner label="Loading audit logs..." /> : isError ? <ErrorAlert onRetry={() => refetch()} /> : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs font-bold text-slate-700">
                <TableHead>Log ID</TableHead>
                <TableHead>Admin ID</TableHead>
                <TableHead>Event Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {auditData?.logs?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-slate-400">No audit logs recorded yet.</TableCell></TableRow>
              ) : (
                auditData?.logs?.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono font-bold">#{l.id}</TableCell>
                    <TableCell>{l.adminName} (#{l.adminId})</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono">{l.event}</Badge></TableCell>
                    <TableCell>{l.targetType} #{l.targetId}</TableCell>
                    <TableCell className="italic text-slate-600">{l.reason}</TableCell>
                    <TableCell className="font-mono text-slate-400">{l.ipAddress}</TableCell>
                    <TableCell className="text-slate-400">{new Date(l.createdAt).toLocaleString()}</TableCell>
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

/* Helper UI Components */
function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <Card className="border border-slate-200 shadow-sm bg-white p-3 space-y-1">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-xl font-black text-slate-900">{value}</p>
      {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
    </Card>
  );
}

function QueueBadge({ count, label, onClick }: { count: number; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-pink-50 hover:bg-pink-100 p-2.5 rounded-lg border border-pink-200 text-left transition-all">
      <div className="text-lg font-black text-[#FF3399]">{count || 0}</div>
      <div className="text-[11px] font-bold text-slate-700 truncate">{label}</div>
    </button>
  );
}

function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="p-8 text-center space-y-2 text-xs text-slate-500">
      <div className="inline-block h-6 w-6 border-2 border-[#FF3399] border-t-transparent rounded-full animate-spin" />
      <p>{label || "Loading..."}</p>
    </div>
  );
}

function ErrorAlert({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center space-y-2 text-xs text-red-700">
      <p className="font-bold">{message || "Error loading data from admin server."}</p>
      <Button size="sm" variant="outline" className="border-red-300 text-red-700 h-7" onClick={onRetry}>Retry Request</Button>
    </div>
  );
}

function PaginationFooter({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  return (
    <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/50">
      <span>Page <strong className="text-slate-900">{page}</strong> of {totalPages}</span>
      <div className="space-x-1">
        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export default AdminDashboard;
