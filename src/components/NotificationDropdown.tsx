import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type ApiNotification } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface NotificationDropdownProps {
  userId: number;
}

const getNotificationRoute = (notification: ApiNotification) => {
  if (notification.link) return notification.link;
  switch (notification.type) {
    case "submission_approved":
    case "payment_received":
    case "earnings":
      return "/earnings";
    case "submission_rejected":
    case "campaign_reserved":
    case "submission_received":
      return "/my-campaigns";
    case "new_campaign":
    case "campaign":
      return "/campaigns";
    case "subscription_reward":
    case "promo_code_generated":
      return "/offers";
    case "tier_upgrade":
      return "/profile";
    default:
      return "/campaigns";
  }
};

function safeDistanceToNow(dateStr: string | Date | undefined | null) {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recently";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "Recently";
  }
}

export function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => api.getNotifications(userId),
    refetchInterval: 30000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ["unreadCount", userId],
    queryFn: () => api.getUnreadCount(userId),
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => api.markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount", userId] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsAsRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount", userId] });
    },
  });

  const unreadCount = unreadData?.count || 0;

  const handleNotificationClick = (notification: ApiNotification) => {
    if (!notification.isRead) {
      queryClient.setQueryData(["notifications", userId], (old: ApiNotification[] = []) =>
        old.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      queryClient.setQueryData(["unreadCount", userId], (old: { count: number } | undefined) => ({
        count: Math.max(0, (old?.count || 1) - 1),
      }));
      markAsReadMutation.mutate(notification.id);
    }

    setOpen(false);
    const targetRoute = getNotificationRoute(notification);
    navigate(targetRoute);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 px-2 text-[11px] font-medium cursor-pointer relative border-border/80" 
          data-testid="button-notifications"
        >
          <span>Alerts</span>
          {unreadCount > 0 && (
            <span className="ml-1 px-1 rounded-full bg-red-600 text-[10px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 shadow-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <span className="font-semibold text-xs tracking-tight">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
              onClick={() => {
                queryClient.setQueryData(["notifications", userId], (old: ApiNotification[] = []) =>
                  old.map((n) => ({ ...n, isRead: true }))
                );
                queryClient.setQueryData(["unreadCount", userId], { count: 0 });
                markAllAsReadMutation.mutate();
              }}
              data-testid="button-mark-all-read"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="h-[280px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {notifications.map((notification: ApiNotification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "px-3.5 py-2.5 transition-colors hover:bg-muted/50 cursor-pointer",
                    !notification.isRead && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-xs leading-tight text-foreground", !notification.isRead && "text-primary font-semibold")}>
                      {notification.title}
                    </p>
                    {!notification.isRead && (
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {safeDistanceToNow(notification.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
