import { useCallback } from "react";

export interface DisconnectConfirmationOptions {
  /** Custom confirmation message. Defaults to a standard message. */
  message?: string;
  /** Whether to show confirmation dialog. Defaults to true. */
  requireConfirmation?: boolean;
}

export interface DisconnectConfirmationResult {
  /** Whether the user confirmed the disconnect action */
  confirmed: boolean;
  /** The confirmation message that was shown (if any) */
  message?: string;
}

/**
 * Hook for handling disconnect confirmation logic.
 * Provides a consistent confirmation flow across the application.
 */
export function useDisconnectConfirmation() {
  const confirmDisconnect = useCallback(
    (
      options: DisconnectConfirmationOptions = {}
    ): DisconnectConfirmationResult => {
      const {
        message = "Disconnect this account? This action cannot be undone.",
        requireConfirmation = true,
      } = options;

      if (!requireConfirmation) {
        return { confirmed: true, message };
      }

      const confirmed = window.confirm(message) ?? false;
      return { confirmed, message };
    },
    []
  );

  return { confirmDisconnect };
}
