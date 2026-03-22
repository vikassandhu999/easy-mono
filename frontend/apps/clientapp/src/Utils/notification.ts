import type {NotificationData} from '@mantine/notifications';

import {notifications} from '@mantine/notifications';

/**
 * Configuration options for notifications
 */
export interface NotificationOptions {
  autoClose?: false | number;
  id?: string;
  loading?: boolean;
  message: string;
  title?: string;
  withCloseButton?: boolean;
}

/**
 * Shows a success notification
 * @param message - The notification message
 * @param options - Optional configuration
 */
export const notifySuccess = (message: string, options?: Partial<NotificationOptions>) => {
  notifications.show({
    title: options?.title || 'Success',
    message,
    color: 'green',
    autoClose: options?.autoClose ?? 5000,
    withCloseButton: options?.withCloseButton ?? true,
    id: options?.id,
    loading: options?.loading ?? false,
  });
};

/**
 * Shows an error notification
 * @param message - The notification message
 * @param options - Optional configuration
 */
export const notifyError = (message: string, options?: Partial<NotificationOptions>) => {
  notifications.show({
    title: options?.title || 'Error',
    message,
    color: 'red',
    autoClose: options?.autoClose ?? 7000,
    withCloseButton: options?.withCloseButton ?? true,
    id: options?.id,
    loading: options?.loading ?? false,
  });
};

/**
 * Shows a warning notification
 * @param message - The notification message
 * @param options - Optional configuration
 */
export const notifyWarning = (message: string, options?: Partial<NotificationOptions>) => {
  notifications.show({
    title: options?.title || 'Warning',
    message,
    color: 'yellow',
    autoClose: options?.autoClose ?? 6000,
    withCloseButton: options?.withCloseButton ?? true,
    id: options?.id,
    loading: options?.loading ?? false,
  });
};

/**
 * Shows an info notification
 * @param message - The notification message
 * @param options - Optional configuration
 */
export const notifyInfo = (message: string, options?: Partial<NotificationOptions>) => {
  notifications.show({
    title: options?.title || 'Info',
    message,
    color: 'blue',
    autoClose: options?.autoClose ?? 5000,
    withCloseButton: options?.withCloseButton ?? true,
    id: options?.id,
    loading: options?.loading ?? false,
  });
};

/**
 * Shows a loading notification
 * @param message - The notification message
 * @param options - Optional configuration
 */
export const notifyLoading = (message: string, options?: Partial<NotificationOptions>) => {
  const id = options?.id || `loading-${Date.now()}`;
  notifications.show({
    id,
    title: options?.title || 'Loading',
    message,
    color: 'blue',
    loading: true,
    autoClose: false,
    withCloseButton: false,
  });
  return id;
};

/**
 * Updates an existing notification (useful for updating loading notifications)
 * @param id - The notification ID to update
 * @param message - The new notification message
 * @param type - The notification type (success, error, warning, info)
 * @param options - Optional configuration
 */
export const notifyUpdate = (
  id: string,
  message: string,
  type: 'error' | 'info' | 'success' | 'warning' = 'success',
  options?: Partial<NotificationOptions>,
) => {
  const colorMap = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
  };

  const titleMap = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
  };

  notifications.update({
    id,
    title: options?.title || titleMap[type],
    message,
    color: colorMap[type],
    loading: false,
    autoClose: options?.autoClose ?? 5000,
    withCloseButton: options?.withCloseButton ?? true,
  });
};

/**
 * Hides a specific notification
 * @param id - The notification ID to hide
 */
export const notifyHide = (id: string) => {
  notifications.hide(id);
};

/**
 * Clears all notifications
 */
export const notifyClearAll = () => {
  notifications.clean();
};

/**
 * Shows a custom notification with full control
 * @param config - The notification configuration
 */
export const notifyCustom = (config: NotificationData) => {
  notifications.show(config);
};

/**
 * Helper for async operations with loading state
 * @param promise - The promise to track
 * @param messages - Messages for loading, success, and error states
 */
export const notifyAsync = async <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  },
): Promise<T> => {
  const id = notifyLoading(messages.loading);

  try {
    const result = await promise;
    notifyUpdate(id, messages.success, 'success');
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : messages.error;
    notifyUpdate(id, errorMessage, 'error');
    throw error;
  }
};

// Export a default notification helper object
export default {
  success: notifySuccess,
  error: notifyError,
  warning: notifyWarning,
  info: notifyInfo,
  loading: notifyLoading,
  update: notifyUpdate,
  hide: notifyHide,
  clearAll: notifyClearAll,
  custom: notifyCustom,
  async: notifyAsync,
};
