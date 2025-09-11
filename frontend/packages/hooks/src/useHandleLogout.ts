import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";

/**
 * Hook: useHandleLogout
 * Provides a stable logout handler using TanStack Query mutation.
 * Accepts an async function that performs the actual logout (API call, token clear, etc.).
 */
export interface UseHandleLogoutOptions {
  // Called to perform actual logout side effects (API call / token revoke)
  performLogout?: () => Promise<unknown> | unknown;
  // Where to redirect after logout
  redirectTo?: string;
  // Optional callback after successful logout
  onSuccess?: () => void;
  // Optional callback on error
  onError?: (err: unknown) => void;
}

export function useHandleLogout(options: UseHandleLogoutOptions = {}) {
  const { performLogout, redirectTo = "/signin", onSuccess, onError } = options;
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async () => {
      if (performLogout) await performLogout();
    },
    onSuccess: () => {
      onSuccess?.();
      navigate(redirectTo);
    },
    onError: (err) => {
      onError?.(err);
      navigate(redirectTo);
    },
  });

  const handle = useCallback(() => {
    if (!mutation.isPending) mutation.mutate();
  }, [mutation]);

  return {
    logout: handle,
    isLoggingOut: mutation.isPending,
    error: mutation.error,
  } as const;
}

export default useHandleLogout;
