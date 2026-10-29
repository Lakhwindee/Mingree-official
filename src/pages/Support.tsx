import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { SponsorSidebar } from "@/components/SponsorSidebar";
import { useAuth } from "@/lib/auth-context";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import type { ApiUser } from "@/lib/api";

// Dummy icon fallbacks for removed icons
const __DummyIcon = () => null;
const Ticket = __DummyIcon;
const Send = __DummyIcon;
const Help = __DummyIcon;



interface SupportTicket {
  id: number;
  userId: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketMessage {
  id: number;
  ticketId: number;
  senderId: number;
  message: string;
  isAdminReply: boolean;
  createdAt: string;
  senderName: string;
  senderRole: string;
}

interface TicketDetails extends SupportTicket {
  messages: TicketMessage[];
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export default function Support() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user: authUser } = useAuth();
  const { data: user } = useQuery<ApiUser>({
    queryKey: ["currentUser"],
  });

  const activeUser = user || (authUser as any);
  const isSponsor = activeUser?.role === "sponsor";

  const { data: tickets, isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: [`/api/users/${activeUser?.id}/support-tickets`],
    enabled: !!activeUser?.id,
  });

  const { data: ticketDetails, isLoading: detailsLoading } = useQuery<TicketDetails>({
    queryKey: [`/api/support-tickets/${selectedTicketId}`],
    enabled: !!selectedTicketId,
  });

  const handleCreateTicket = async () => {
    if (!user?.id || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          subject,
          category,
          priority,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create ticket");
      }

      toast.success("Support ticket created successfully");
      setSubject("");
      setMessage("");
      setCategory("general");
      setPriority("normal");
      setView("list");
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/support-tickets`] });
    } catch (error) {
      toast.error("Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!user?.id || !selectedTicketId || !replyText.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/support-tickets/${selectedTicketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.id,
          message: replyText,
          isAdminReply: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send reply");
      }

      toast.success("Reply sent");
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: [`/api/support-tickets/${selectedTicketId}`] });
    } catch (error) {
      toast.error("Failed to send reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      resolved: "bg-green-500/20 text-green-400 border-green-500/30",
      closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
    return variants[status] || variants.open;
  };

  const openTicket = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setView("detail");
  };

  if (view === "new") {
    return (
      <div className="min-h-screen bg-background p-4 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setView("list")}
            className="mb-6 text-xs text-muted-foreground"
            data-testid="button-back-to-list"
          >
            Back to Tickets
          </Button>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">
                Create Support Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  data-testid="input-ticket-subject"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="campaign">Campaign</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className="min-h-[150px]"
                  data-testid="input-ticket-message"
                />
              </div>

              <Button
                onClick={handleCreateTicket}
                disabled={isSubmitting || !subject.trim() || !message.trim()}
                className="w-full text-xs font-semibold"
                data-testid="button-submit-ticket"
              >
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (view === "detail" && selectedTicketId) {
    return (
      <div className="min-h-screen bg-background p-4 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => {
              setView("list");
              setSelectedTicketId(null);
            }}
            className="mb-6 text-xs text-muted-foreground"
            data-testid="button-back-from-detail"
          >
            Back to Tickets
          </Button>

          {detailsLoading ? (
            <div className="text-center text-muted-foreground py-8 text-xs">Loading...</div>
          ) : ticketDetails ? (
            <Card className="border-border">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-foreground text-base">{ticketDetails.subject}</CardTitle>
                  <Badge className={getStatusBadge(ticketDetails.status)}>
                    {ticketDetails.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                  <Badge variant="secondary">{ticketDetails.category}</Badge>
                  <span>
                    {new Date(ticketDetails.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {ticketDetails.messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg border ${
                          msg.isAdminReply
                            ? "bg-muted/40 border-border ml-4"
                            : "bg-card border-border mr-4"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-foreground text-xs">
                            {msg.isAdminReply ? "Support Team" : "You"}
                          </span>
                          {msg.isAdminReply && (
                            <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{msg.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {ticketDetails.status !== "closed" && (
                  <div className="flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 text-xs"
                      data-testid="input-user-reply"
                    />
                    <Button
                      onClick={handleReply}
                      disabled={isSubmitting || !replyText.trim()}
                      className="text-xs"
                      data-testid="button-send-user-reply"
                    >
                      Send
                    </Button>
                  </div>
                )}

                {ticketDetails.status === "closed" && (
                  <div className="text-center text-xs text-muted-foreground py-4">
                    This ticket is closed and cannot receive new replies.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center text-xs text-muted-foreground py-8">Ticket not found</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      {isSponsor ? <SponsorSidebar /> : <Sidebar />}

      {/* Mobile Sticky Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 border-b border-border md:hidden w-full max-w-full">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">Help & Support</h1>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-foreground whitespace-nowrap">Tickets</span>
        </div>
        {activeUser && <NotificationDropdown userId={activeUser.id} />}
      </header>

      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="w-full max-w-4xl mx-auto px-3.5 py-4 sm:px-6 sm:py-6 overflow-x-hidden box-border">
          <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">Help & Support</h1>
              <p className="text-xs text-muted-foreground">Get help with your account, campaigns, and earnings</p>
            </div>
            <Button size="sm" onClick={() => setView("new")} className="text-xs" data-testid="button-new-ticket">
              New Ticket
            </Button>
          </div>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground text-base">
                Your Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="text-center text-xs text-muted-foreground py-8">Loading tickets...</div>
              ) : tickets && tickets.length > 0 ? (
                <div className="space-y-2.5">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="bg-card rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted/40 border border-border"
                      onClick={() => openTicket(ticket.id)}
                      data-testid={`user-ticket-${ticket.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-foreground text-sm">{ticket.subject}</h4>
                        <Badge className={getStatusBadge(ticket.status)}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">{ticket.category}</Badge>
                        <span className="text-muted-foreground">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-base font-semibold text-foreground mb-1">No tickets yet</h3>
                  <p className="text-xs text-muted-foreground mb-4">Create a ticket to get help from our support team</p>
                  <Button size="sm" onClick={() => setView("new")} className="text-xs" data-testid="button-create-first-ticket">
                    Create Your First Ticket
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
