import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Users, 
  Clock, 
  RefreshCw, 
  Filter, 
  Search, 
  Lock, 
  Unlock, 
  Activity,
  Layers,
  CheckCircle2,
  XCircle,
  FileText
} from "lucide-react";
import { toast } from "sonner";

interface SecurityLog {
  id: string;
  timestamp: string;
  event: string;
  mingreeUserId: number;
  instagramUsername: string;
  instagramUserId?: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskFactors: string[];
  followers: number;
  mediaCount: number;
  ipAddress: string;
  userAgent: string;
  decision: "ALLOW" | "BLOCK" | "MONITOR";
  details: string;
}

interface IdentityRecord {
  instagramUserId: string;
  instagramUsername: string;
  boundMingreeUserId: number;
  firstBoundAt: string;
  lastBoundAt: string;
  lastFollowersCount: number;
  lastMediaCount: number;
  isLocked: boolean;
  lockoutUntil: number | null;
  lockoutReason: string | null;
  historicalMingreeUserIds: number[];
  linkCount: number;
  disconnectCount: number;
  lastDisconnectedAt: string | null;
  suspiciousFlags: string[];
  lastRiskScore: number;
}

interface SecurityStats {
  totalIdentities: number;
  activeBound: number;
  lockedIdentities: number;
  blockedAttempts: number;
  highRiskEvents: number;
  mediumRiskEvents: number;
  totalAuditsRecorded: number;
}

export function SecurityAuditPanel() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEvent, setFilterEvent] = useState<string>("ALL");
  const [selectedIdentity, setSelectedIdentity] = useState<IdentityRecord | null>(null);
  const [transferUserId, setTransferUserId] = useState<string>("");
  const [unlockReason, setUnlockReason] = useState<string>("");
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  // Fetch security stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<SecurityStats>({
    queryKey: ["admin-security-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/security/stats");
      if (!res.ok) throw new Error("Failed to load security stats");
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Fetch security logs
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery<{ logs: SecurityLog[] }>({
    queryKey: ["admin-security-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/security/logs?limit=150");
      if (!res.ok) throw new Error("Failed to load security logs");
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Fetch identities
  const { data: identitiesData, isLoading: identitiesLoading, refetch: refetchIdentities } = useQuery<{ identities: IdentityRecord[] }>({
    queryKey: ["admin-security-identities"],
    queryFn: async () => {
      const res = await fetch("/api/admin/security/identities");
      if (!res.ok) throw new Error("Failed to load identity registry");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const unlockMutation = useMutation({
    mutationFn: async ({ instagramUserId, newMingreeUserId, reason }: { instagramUserId: string; newMingreeUserId?: number; reason: string }) => {
      const res = await fetch("/api/admin/security/unlock-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramUserId, newMingreeUserId, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update identity");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Identity updated successfully");
      setShowUnlockDialog(false);
      setSelectedIdentity(null);
      queryClient.invalidateQueries({ queryKey: ["admin-security-identities"] });
      queryClient.invalidateQueries({ queryKey: ["admin-security-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-security-stats"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update identity");
    }
  });

  const handleRefreshAll = () => {
    refetchStats();
    refetchLogs();
    refetchIdentities();
    toast.success("Security dashboard refreshed");
  };

  const filteredLogs = (logsData?.logs || []).filter((log) => {
    const matchesSearch =
      log.instagramUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(log.mingreeUserId).includes(searchTerm) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.ipAddress && log.ipAddress.includes(searchTerm));

    if (!matchesSearch) return false;

    if (filterEvent === "BLOCK") return log.decision === "BLOCK";
    if (filterEvent === "ALLOW") return log.decision === "ALLOW";
    if (filterEvent === "MONITOR") return log.decision === "MONITOR";
    if (filterEvent === "BOT_RISK") return log.event.includes("BOT_RISK");
    if (filterEvent === "RATE_LIMIT") return log.event.includes("RATE_LIMIT");
    if (filterEvent === "DUPLICATE") return log.event.includes("DUPLICATE") || log.event.includes("RECLAIM");

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-400" />
            Instagram OAuth Security &amp; Anti-Abuse
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time enforcement of one-to-one bindings, bot risk scoring, account farming lockouts, and ownership protection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Logs
          </Button>
        </div>
      </div>

      {/* Security Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800/80 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">Bound Identities</span>
              <Layers className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {stats?.activeBound ?? 0}
              <span className="text-xs font-normal text-gray-500 ml-1.5">/ {stats?.totalIdentities ?? 0} total</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">1:1 verified Instagram links</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/80 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">Blocked Attacks</span>
              <ShieldAlert className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400">
              {stats?.blockedAttempts ?? 0}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Bots, farms &amp; duplicate attempts</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/80 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">High-Risk Detections</span>
              <AlertTriangle className="h-4 w-4 text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-orange-400">
              {stats?.highRiskEvents ?? 0}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Score ≥ 70/100 automated flags</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/80 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">Audits Recorded</span>
              <Activity className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {stats?.totalAuditsRecorded ?? 0}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Immutable security trail</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Policies Info Box */}
      <Card className="bg-gray-900/60 border-gray-800">
        <CardContent className="p-4 text-xs space-y-2 text-gray-300">
          <div className="font-semibold text-white flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-green-400" />
            Active Anti-Abuse Protections &amp; Thresholds
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-700/60">
              <span className="font-semibold text-purple-400 block mb-1">1:1 Identity Uniqueness</span>
              One Instagram Meta User ID maps to exactly 1 Mingree account. Unlinking preserves binding history to stop reclaim hijacking by other users.
            </div>
            <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-700/60">
              <span className="font-semibold text-blue-400 block mb-1">Anti-Farming Rate Limits</span>
              Max 6 OAuth link attempts per 15 min per IP/User. 3-minute cooldown on disconnect churn; 10-min lockout after 3 consecutive failures.
            </div>
            <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-700/60">
              <span className="font-semibold text-amber-400 block mb-1">Heuristic Bot Scoring</span>
              Evaluates zero-media shell profiles, high-entropy usernames &amp; sudden burst spikes. Low-follower genuine users (500–2k) are never blocked.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instagram Identity Registry */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3 border-b border-gray-700/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                Verified Instagram Identity Registry
              </CardTitle>
              <CardDescription className="text-xs text-gray-400 mt-0.5">
                Tracks global unique bindings, reclaim histories, and disconnect counts.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-gray-600 text-gray-300">
              {identitiesData?.identities?.length || 0} Registered
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {identitiesLoading ? (
            <div className="p-8 text-center text-gray-400">Loading identity registry...</div>
          ) : (identitiesData?.identities?.length || 0) === 0 ? (
            <div className="p-8 text-center text-gray-400">No Instagram accounts registered yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900/60 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-700">
                  <tr>
                    <th className="py-3 px-4">Instagram Handle</th>
                    <th className="py-3 px-4">Meta User ID</th>
                    <th className="py-3 px-4">Bound Mingree User</th>
                    <th className="py-3 px-4">Followers / Media</th>
                    <th className="py-3 px-4">Risk Score</th>
                    <th className="py-3 px-4">Churn / Reclaims</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60 text-gray-200">
                  {identitiesData?.identities.map((identity) => (
                    <tr key={identity.instagramUserId} className="hover:bg-gray-700/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        @{identity.instagramUsername}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-400">
                        {identity.instagramUserId}
                      </td>
                      <td className="py-3 px-4">
                        {identity.boundMingreeUserId > 0 ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                            User #{identity.boundMingreeUserId}
                          </span>
                        ) : (
                          <span className="text-gray-500 italic">Unlinked (Protected)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span>{identity.lastFollowersCount.toLocaleString()} followers</span>
                        <span className="text-gray-500 block text-[11px]">{identity.lastMediaCount} posts</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={`text-[10px] font-semibold ${
                            identity.lastRiskScore >= 70
                              ? "bg-red-900/60 text-red-300 border-red-700"
                              : identity.lastRiskScore >= 40
                              ? "bg-amber-900/60 text-amber-300 border-amber-700"
                              : "bg-green-900/60 text-green-300 border-green-700"
                          }`}
                        >
                          {identity.lastRiskScore}/100
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {identity.disconnectCount} unlinks ({identity.historicalMingreeUserIds.length} users)
                      </td>
                      <td className="py-3 px-4">
                        {identity.isLocked ? (
                          <Badge variant="destructive" className="text-[10px]">LOCKED</Badge>
                        ) : identity.boundMingreeUserId > 0 ? (
                          <Badge className="bg-green-600 text-white text-[10px]">ACTIVE</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">UNLINKED</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedIdentity(identity);
                            setTransferUserId(identity.boundMingreeUserId ? String(identity.boundMingreeUserId) : "");
                            setShowUnlockDialog(true);
                          }}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 h-7 text-xs"
                        >
                          Manage Binding
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Security Audit Log Stream */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3 border-b border-gray-700/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                Security Audit Trail &amp; Risk Evaluations
              </CardTitle>
              <CardDescription className="text-xs text-gray-400 mt-0.5">
                Every OAuth attempt, risk score computation, and enforcement decision is immutably logged.
              </CardDescription>
            </div>
            {/* Filter & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search user, @handle, IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs bg-gray-900 border-gray-700 text-white w-48"
                />
              </div>
              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="h-8 text-xs bg-gray-900 border border-gray-700 text-gray-300 rounded px-2.5 outline-none"
              >
                <option value="ALL">All Events</option>
                <option value="BLOCK">Blocked Only</option>
                <option value="ALLOW">Allowed Only</option>
                <option value="MONITOR">Monitored Only</option>
                <option value="BOT_RISK">Bot Risk Detections</option>
                <option value="RATE_LIMIT">Rate Limits / Farming</option>
                <option value="DUPLICATE">Duplicate / Reclaim</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logsLoading ? (
            <div className="p-8 text-center text-gray-400">Loading audit trail...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No security events found matching criteria.</div>
          ) : (
            <div className="divide-y divide-gray-700/60 max-h-[500px] overflow-y-auto">
              {filteredLogs.map((log) => {
                const isBlocked = log.decision === "BLOCK";
                const isMonitor = log.decision === "MONITOR";
                return (
                  <div
                    key={log.id}
                    className={`p-4 hover:bg-gray-750/30 transition-colors ${
                      isBlocked ? "bg-red-950/10" : ""
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isBlocked ? (
                          <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                        ) : isMonitor ? (
                          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-white text-xs">
                          {log.event}
                        </span>
                        <Badge
                          className={`text-[10px] uppercase font-bold ${
                            isBlocked
                              ? "bg-red-900/70 text-red-200 border-red-700"
                              : isMonitor
                              ? "bg-amber-900/70 text-amber-200 border-amber-700"
                              : "bg-emerald-900/70 text-emerald-200 border-emerald-700"
                          }`}
                        >
                          {log.decision}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            log.riskScore >= 70
                              ? "text-red-400 border-red-800"
                              : log.riskScore >= 40
                              ? "text-amber-400 border-amber-800"
                              : "text-green-400 border-green-800"
                          }`}
                        >
                          Risk: {log.riskScore}/100 ({log.riskLevel})
                        </Badge>
                      </div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-2">
                        <Clock className="h-3 w-3 text-gray-500" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-300">
                      <span className="text-gray-400 font-medium">Mingree User #{log.mingreeUserId}</span>
                      {" • "}
                      <span className="text-purple-300 font-medium">@{log.instagramUsername}</span>
                      {log.followers > 0 && (
                        <>
                          {" • "}
                          <span>{log.followers.toLocaleString()} followers</span>
                        </>
                      )}
                      {log.mediaCount > 0 && (
                        <>
                          {" • "}
                          <span>{log.mediaCount} media posts</span>
                        </>
                      )}
                    </div>

                    <div className="mt-1 text-xs text-gray-400 bg-gray-900/50 p-2 rounded border border-gray-800">
                      {log.details}
                    </div>

                    {log.riskFactors && log.riskFactors.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-gray-500 font-medium">Risk Flags:</span>
                        {log.riskFactors.map((factor, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-red-950/50 text-red-300 border border-red-900/60 px-1.5 py-0.5 rounded"
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-1.5 text-[10px] text-gray-500 font-mono">
                      IP: {log.ipAddress} • Client: {log.userAgent.slice(0, 40)}...
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlock / Transfer Identity Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent className="bg-gray-800 text-white border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Unlock className="h-5 w-5 text-purple-400" />
              Manage Instagram Identity Binding
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Transfer @{selectedIdentity?.instagramUsername} to a different Mingree user or clear restrictions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-gray-300">Instagram Handle</Label>
              <Input
                disabled
                value={`@${selectedIdentity?.instagramUsername || ""}`}
                className="bg-gray-900 border-gray-700 text-white text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-300">Meta Instagram User ID</Label>
              <Input
                disabled
                value={selectedIdentity?.instagramUserId || ""}
                className="bg-gray-900 border-gray-700 font-mono text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-300">Target Mingree User ID</Label>
              <Input
                type="number"
                placeholder="Enter Mingree User ID (e.g. 1)"
                value={transferUserId}
                onChange={(e) => setTransferUserId(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white text-xs mt-1"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Assigns this Instagram identity directly to the specified user account.
              </p>
            </div>

            <div>
              <Label className="text-xs text-gray-300">Reason / Resolution Note *</Label>
              <Input
                placeholder="e.g. Creator changed their Mingree login email"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnlockDialog(false)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={unlockMutation.isPending || !unlockReason.trim()}
              onClick={() => {
                if (selectedIdentity) {
                  unlockMutation.mutate({
                    instagramUserId: selectedIdentity.instagramUserId,
                    newMingreeUserId: transferUserId ? Number(transferUserId) : undefined,
                    reason: unlockReason,
                  });
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {unlockMutation.isPending ? "Saving..." : "Update Identity Binding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
