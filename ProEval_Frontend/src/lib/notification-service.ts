import { apiClient } from "./api";

export interface NotificationSnapshot {
  id: string;
  team_id: string;
  title: string;
  phase: string;
  admin_status: string;
  academic_year: string;
  semester: number;
  phase_1_data?: Record<string, any>;
  members_count: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  project_snapshot?: NotificationSnapshot;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unread_count: number;
}

export interface NotificationDetailResponse {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  project_snapshot?: NotificationSnapshot;
}

class NotificationService {
  /**
   * Get all notifications for the current faculty member
   */
  async getNotifications(unreadOnly: boolean = false): Promise<NotificationListResponse> {
    const endpoint = unreadOnly ? "/api/v1/faculty/notifications?unread_only=true" : "/api/v1/faculty/notifications";
    const { data } = await apiClient.request<NotificationListResponse>(endpoint);
    return data;
  }

  /**
   * Get the count of unread notifications
   */
  async getUnreadCount(): Promise<number> {
    const { data } = await apiClient.request<{ unread_count: number }>("/api/v1/faculty/notifications/unread-count");
    return data.unread_count;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<{ status: string; notification_id: string; is_read: boolean }> {
    const { data } = await apiClient.request<{ status: string; notification_id: string; is_read: boolean }>(
      `/api/v1/faculty/notifications/${notificationId}/read`,
      {
        method: "PATCH",
      }
    );
    return data;
  }

  /**
   * Get detailed information about a specific notification
   */
  async getNotificationDetail(notificationId: string): Promise<NotificationDetailResponse> {
    const { data } = await apiClient.request<NotificationDetailResponse>(`/api/v1/faculty/notifications/${notificationId}`);
    return data;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<{ status: string; message: string }> {
    const { data } = await apiClient.request<{ status: string; message: string }>(
      `/api/v1/faculty/notifications/${notificationId}`,
      {
        method: "DELETE",
      }
    );
    return data;
  }
}

export const notificationService = new NotificationService();
