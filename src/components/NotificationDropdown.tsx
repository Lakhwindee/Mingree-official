import { useState } from "react";
import { Bell, Check, CheckCheck, Gift, MessageSquare, AlertCircle, Megaphone } from "lucide-react";
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

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "submission_approved":
    case "payment_received":
      return <Gift className="h-4 w-4 text-green-500" />;
    case "submission_rejected":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "submission_received":
    case "campaign_reserved":
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case "new_campaign":
      return <Megaphone className="h-4 w-4 text-purple-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};

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
    // 1. Immediately mark as read optimistically in query cache
    if (!notification.isRead) {
      queryClient.setQueryData(["notifications", userId], (old: ApiNotification[] = []) =>
        old.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      queryClient.setQueryData(["unreadCount", userId], (old: { count: number } | undefined) => ({
        count: Math.max(0, (old?.count || 1) - 1),
      }));
      markAsReadMutation.mutate(notification.id);
    }

    // 2. Close the dropdown menu
    setOpen(false);

    // 3. Navigate directly to the notification destination
    const targetRoute = getNotificationRoute(notification);
    navigate(targetRoute);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative cursor-pointer" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary hover:bg-transparent cursor-pointer"
              onClick={() => {
                queryClient.setQueryData(["notifications", userId], (old: ApiNotification[] = []) =>
                  old.map((n) => ({ ...n, isRead: true }))
                );
                queryClient.setQueryData(["unreadCount", userId], { count: 0 });
                markAllAsReadMutation.mutate();
              }}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification: ApiNotification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer",
                    !notification.isRead && "bg-primary/5 font-medium"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm leading-tight text-foreground", !notification.isRead && "text-primary font-semibold")}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
