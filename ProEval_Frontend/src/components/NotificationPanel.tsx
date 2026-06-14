"use client";

import React, { useEffect, useState } from "react";
import { notificationService, Notification } from "@/lib/notification-service";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, Trash2 } from "lucide-react";

interface NotificationPanelProps {
  onRefresh?: () => void;
  maxHeight?: string;
}

export function NotificationPanel({ onRefresh, maxHeight = "max-h-96" }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      // Update local state
      const notification = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground text-sm">Loading notifications...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No notifications yet</p>
          <p className="text-muted-foreground/70 text-xs mt-1">Projects sent to you will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        <button
          onClick={fetchNotifications}
          className="text-xs text-muted-foreground hover:text-foreground"
          title="Refresh notifications"
        >
          Refresh
        </button>
      </div>

      <div className={`space-y-2 overflow-y-auto ${maxHeight}`}>
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`p-4 border-l-4 transition-all ${
              !notification.is_read
                ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/10"
                : "border-l-transparent opacity-75 hover:opacity-100"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-medium text-sm leading-tight text-foreground truncate">
                    {notification.title}
                  </h4>
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0 mt-1" />
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {notification.message}
                </p>

                {notification.project_snapshot && (
                  <div className="text-xs bg-secondary/30 rounded p-2 mb-2 space-y-1">
                    <p className="font-medium text-secondary-foreground">
                      Team: {notification.project_snapshot.team_id}
                    </p>
                    <p className="text-secondary-foreground/80">
                      {notification.project_snapshot.phase_1_data?.title || "Untitled Project"}
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground/60">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {!notification.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteNotification(notification.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                  title="Delete notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
