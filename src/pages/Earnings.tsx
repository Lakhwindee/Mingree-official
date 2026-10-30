import { Sidebar } from "@/components/Sidebar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type ApiCampaign, type ApiReservation, formatINR } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Wallet = __DummyIcon;



export default function Earnings() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");
  const [upiForm, setUpiForm] = useState({
    accountHolderName: "",
    upiId: "",
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.getCurrentUser,
    initialData: () => (authUser && authUser.role === "creator" ? (authUser as any) : undefined),
    refetchInterval: 30000,
  });

  const activeUser = user || (authUser as any);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", activeUser?.id],
    queryFn: () => (activeUser ? api.getTransactions(activeUser.id) : []),
    enabled: !!activeUser,
  });

  const { data: withdrawalRequests = [] } = useQuery({
    queryKey: ["withdrawalRequests", activeUser?.id],
    queryFn: () => (activeUser ? api.getWithdrawalRequests(activeUser.id) : []),
    enabled: !!activeUser,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts", activeUser?.id],
    queryFn: () => (activeUser ? api.getBankAccounts(activeUser.id) : []),
    enabled: !!activeUser,
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", activeUser?.id],
    queryFn: () => (activeUser ? api.getUserReservations(activeUser.id) : []),
    enabled: !!activeUser,
  });

  const rejectedReservations = useMemo(() => {
    return reservations.filter((r: ApiReservation & { campaign?: ApiCampaign }) => r.status === 'rejected' && r.campaign);
  }, [reservations]);

  const requestWithdrawalMutation = useMutation({
    mutationFn: ({ amount, bankAccountId }: { amount: number; bankAccountId: number }) =>
      api.requestWithdrawal(amount, bankAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawalRequests"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setIsWithdrawDialogOpen(false);
      setWithdrawAmount("");
      toast.success("Withdrawal request submitted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit withdrawal request");
    },
  });

  const addBankAccountMutation = useMutation({
    mutationFn: (data: { accountHolderName: string; upiId: string }) =>
      api.addBankAccount({
        ...data,
        accountNumber: "UPI-" + Date.now(),
        ifscCode: "UPI0000000",
        bankName: "UPI",
        accountType: "current",
        isDefault: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      setIsBankDialogOpen(false);
      setUpiForm({ accountHolderName: "", upiId: "" });
      toast.success("UPI ID added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add UPI ID");
    },
  });

  const deleteBankAccountMutation = useMutation({
    mutationFn: (id: number) => api.deleteBankAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast.success("UPI ID removed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete UPI ID");
    },
  });

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (activeUser && amount > parseFloat(activeUser.balance)) {
      toast.error("Insufficient balance");
      return;
    }
    if (!selectedBankAccountId) {
      toast.error("Please select a UPI ID");
      return;
    }
    requestWithdrawalMutation.mutate({
      amount,
      bankAccountId: parseInt(selectedBankAccountId),
    });
  };

  const handleAddUpi = () => {
    if (!upiForm.accountHolderName || !upiForm.upiId) {
      toast.error("Please fill in your name and UPI ID");
      return;
    }
    if (!upiForm.upiId.includes("@")) {
      toast.error("Please enter a valid UPI ID (e.g. name@okhdfcbank)");
      return;
    }
    addBankAccountMutation.mutate(upiForm);
  };

  const MIN_WITHDRAWAL_AMOUNT = 500;
  const WITHDRAWAL_GST_PERCENT = 18;
  const currentBalance = activeUser ? parseFloat(activeUser.balance) : 0;
  const canWithdraw = currentBalance >= MIN_WITHDRAWAL_AMOUNT;

  const pendingWithdrawal = withdrawalRequests.find(
    (w) => w.status === "pending" || w.status === "processing"
  );

  const totalEarnings = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => {
      const val = parseFloat(t.net);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

  const totalTaxes = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => {
      const val = parseFloat(t.tax);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-700 border-yellow-200">Pending</Badge>;
      case "processing":
        return <Badge variant="outline" className="text-blue-700 border-blue-200">Processing</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-green-700 border-green-200">Completed</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!activeUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
          <p className="mt-3 text-xs text-muted-foreground">Loading earnings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      <Sidebar />
      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pt-14 md:pt-0 pb-8">

        <div className="w-full max-w-6xl mx-auto px-4 py-5 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
          {/* Desktop Executive Header Bar */}
          <div className="hidden md:flex mb-6 sm:mb-8 flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Earnings & Wallet</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Track your revenue, taxes, and withdrawals.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="text-xs font-semibold h-9 rounded-lg" data-testid="button-statement">
                Statement
              </Button>
              
              <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-9 rounded-lg shadow-xs" 
                    data-testid="button-withdraw"
                    disabled={!!pendingWithdrawal}
                  >
                    {pendingWithdrawal ? "Withdrawal Pending" : "Withdraw Funds"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-2xl border-border/80">
                  <DialogHeader>
                    <DialogTitle className="text-base font-bold text-foreground">Withdraw Funds</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Transfer cleared funds to your linked UPI address. Processing takes 2-3 business days.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-3">
                    <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Available Balance</Label>
                      <p className="text-2xl font-bold text-foreground tabular-nums mt-1" data-testid="text-available-balance">{formatINR(activeUser.balance)}</p>
                    </div>
                    
                    {bankAccounts.length === 0 && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                        <p>Please add a UPI ID first to withdraw funds.</p>
                        <Button 
                          variant="link" 
                          className="h-auto p-0 text-xs font-semibold text-amber-700 dark:text-amber-400 mt-1" 
                          onClick={() => { setIsWithdrawDialogOpen(false); setIsBankDialogOpen(true); }}
                        >
                          Add UPI Address
                        </Button>
                      </div>
                    )}
                    
                    {!canWithdraw && bankAccounts.length > 0 && currentBalance < MIN_WITHDRAWAL_AMOUNT && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                        Minimum balance of ₹{MIN_WITHDRAWAL_AMOUNT} required. You need ₹{(MIN_WITHDRAWAL_AMOUNT - currentBalance).toFixed(0)} more.
                      </div>
                    )}
                    
                    {canWithdraw && (
                      <>
                        <div className="grid gap-1.5">
                          <Label className="text-xs font-medium">Select UPI Account</Label>
                          <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
                            <SelectTrigger className="h-9 text-xs rounded-xl" data-testid="select-bank-account">
                              <SelectValue placeholder="Choose UPI account" />
                            </SelectTrigger>
                            <SelectContent>
                              {bankAccounts.map(account => (
                                <SelectItem key={account.id} value={account.id.toString()}>
                                  <span>{account.upiId || account.accountHolderName}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid gap-1.5">
                          <Label htmlFor="amount" className="text-xs font-medium">Withdrawal Amount (Min: ₹{MIN_WITHDRAWAL_AMOUNT})</Label>
                          <Input 
                            id="amount" 
                            type="number"
                            placeholder={`Minimum ₹${MIN_WITHDRAWAL_AMOUNT}`}
                            min={MIN_WITHDRAWAL_AMOUNT}
                            max={currentBalance}
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="h-9 text-xs rounded-xl"
                            data-testid="input-withdraw-amount"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handleWithdraw} 
                      disabled={!canWithdraw || requestWithdrawalMutation.isPending || !withdrawAmount || !selectedBankAccountId}
                      className="w-full text-xs font-semibold rounded-xl h-9"
                      data-testid="button-confirm-withdraw"
                    >
                      {requestWithdrawalMutation.isPending ? "Processing..." : "Confirm Withdrawal"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6 sm:mb-8">
            <Card className="rounded-xl border border-border/80 bg-card">
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wallet Balance</p>
                <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground tabular-nums" data-testid="text-balance">{formatINR(activeUser.balance)}</h3>
                <p className="mt-3 text-xs text-muted-foreground">
                  Available for withdrawal (Min: ₹{MIN_WITHDRAWAL_AMOUNT})
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border/80 bg-card">
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GST Deducted (YTD)</p>
                <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground tabular-nums" data-testid="text-taxes">{formatINR(totalTaxes)}</h3>
                <p className="mt-3 text-xs text-muted-foreground">{WITHDRAWAL_GST_PERCENT}% GST on withdrawals</p>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border/80 bg-card">
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Earnings</p>
                <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground tabular-nums" data-testid="text-total-earnings">{formatINR(totalEarnings)}</h3>
                <p className="mt-3 text-xs text-muted-foreground">Net lifetime earned across campaigns</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="transactions" className="space-y-4">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="h-9 p-1 bg-muted/70 rounded-xl border border-border/60 inline-flex">
                <TabsTrigger value="transactions" className="text-xs font-semibold rounded-lg">History</TabsTrigger>
                <TabsTrigger value="withdrawals" className="text-xs font-semibold rounded-lg">Withdrawals</TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs font-semibold rounded-lg">Rejected</TabsTrigger>
                <TabsTrigger value="bank-accounts" className="text-xs font-semibold rounded-lg">UPI & Accounts</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="transactions">
              <Card className="rounded-xl border border-border/80 bg-card">
                <CardContent className="p-4 sm:p-5">
                  {transactions.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm font-semibold text-foreground">No transactions yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Complete campaigns to start earning</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((transaction, i) => (
                        <motion.div
                          key={transaction.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between rounded-lg border p-4"
                          data-testid={`transaction-${transaction.id}`}
                        >
                          <div>
                            <p className="font-medium text-sm text-foreground">{transaction.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
                              {transaction.type === 'credit' && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-amber-600 dark:text-amber-400">Tax: {formatINR(transaction.tax)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold tabular-nums ${transaction.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {transaction.type === 'credit' ? '+' : '-'}{formatINR(transaction.net)}
                            </p>
                            {transaction.type === 'credit' && (
                              <p className="text-xs text-muted-foreground tabular-nums">
                                Gross: {formatINR(transaction.amount)}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="withdrawals">
              <Card>
                <CardContent className="p-6">
                  {withdrawalRequests.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm font-semibold text-foreground">No withdrawal requests yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Withdraw your earnings when you're ready</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {withdrawalRequests.map((request, i) => {
                        const bankAccount = bankAccounts.find(b => b.id === request.bankAccountId);
                        return (
                          <motion.div
                            key={request.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between rounded-lg border p-4"
                            data-testid={`withdrawal-${request.id}`}
                          >
                            <div>
                              <p className="font-medium text-sm text-foreground">Withdrawal Request #{request.id}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>{new Date(request.requestedAt).toLocaleDateString()}</span>
                                {bankAccount && (
                                  <>
                                    <span>&bull;</span>
                                    <span>UPI: {bankAccount.upiId}</span>
                                  </>
                                )}
                              </div>
                              {request.utrNumber && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">UTR: {request.utrNumber}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-foreground tabular-nums">{formatINR(request.amount)}</p>
                              {getStatusBadge(request.status)}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rejected">
              <Card>
                <CardContent className="p-6">
                  {rejectedReservations.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm font-semibold text-foreground">No rejected campaigns</p>
                      <p className="text-xs text-muted-foreground mt-1">Rejected submissions will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rejectedReservations.map((reservation, i) => {
                        const campaign = reservation.campaign!;
                        return (
                          <motion.div
                            key={reservation.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-900/50 p-4 bg-red-50/30 dark:bg-red-950/10"
                            data-testid={`rejected-campaign-${reservation.id}`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{campaign.title}</p>
                                <Badge className="bg-destructive text-xs">
                                  Rejected
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>{campaign.brand}</span>
                                <span>&bull;</span>
                                <Badge variant="outline" className="text-xs">{campaign.tier}</Badge>
                                <span>&bull;</span>
                                <span>{campaign.type}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-muted-foreground line-through tabular-nums">{formatINR(campaign.payAmount)}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(reservation.reservedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bank-accounts">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold">Linked UPI Accounts</CardTitle>
                  <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="text-xs font-semibold rounded-lg" data-testid="button-add-bank">
                        Add UPI
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add UPI Account</DialogTitle>
                        <DialogDescription>
                          Add your Google Pay, PhonePe, Paytm or any UPI ID to receive withdrawals.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="accountHolderName">Your Name *</Label>
                          <Input 
                            id="accountHolderName"
                            placeholder="Enter your full name"
                            value={upiForm.accountHolderName}
                            onChange={(e) => setUpiForm(prev => ({ ...prev, accountHolderName: e.target.value }))}
                            data-testid="input-account-holder"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="upiId">UPI ID *</Label>
                          <Input 
                            id="upiId"
                            placeholder="e.g., 9876543210@paytm, name@okaxis"
                            value={upiForm.upiId}
                            onChange={(e) => setUpiForm(prev => ({ ...prev, upiId: e.target.value }))}
                            data-testid="input-upi"
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter your Google Pay, PhonePe, Paytm, or any UPI ID
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={handleAddUpi}
                          disabled={addBankAccountMutation.isPending}
                          data-testid="button-save-bank"
                        >
                          {addBankAccountMutation.isPending ? "Adding..." : "Add UPI"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {bankAccounts.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm font-semibold text-foreground">No UPI linked</p>
                      <p className="text-xs text-muted-foreground mt-1">Add your Google Pay, PhonePe or Paytm UPI ID to withdraw earnings</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bankAccounts.map((account, i) => (
                        <motion.div
                          key={account.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between rounded-lg border p-4"
                          data-testid={`bank-account-${account.id}`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">UPI</p>
                              {account.isDefault && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {account.accountHolderName} &bull; {account.upiId}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => deleteBankAccountMutation.mutate(account.id)}
                            disabled={deleteBankAccountMutation.isPending}
                            data-testid={`button-delete-bank-${account.id}`}
                          >
                            Remove
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
