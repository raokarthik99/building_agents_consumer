"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRenderToolCall } from "@copilotkit/react-core";
import type { CatchAllActionRenderProps } from "@copilotkit/react-core";
import type { ConnectedAccountRetrieveResponse } from "@composio/core";

const STATUS_STYLES = {
  SUCCESS: "bg-emerald-100 text-emerald-600",
  FAILED: "bg-rose-100 text-rose-600",
  ACTIVE: "bg-emerald-100 text-emerald-600",
  INACTIVE: "bg-amber-100 text-amber-600",
  INITIATED: "bg-indigo-100 text-indigo-600",
  INITIALIZING: "bg-indigo-100 text-indigo-600",
  PENDING: "bg-indigo-100 text-indigo-600",
  EXPIRED: "bg-rose-100 text-rose-600",
  default: "bg-indigo-100 text-indigo-600",
} as const;

function getConnectedAccountId(response: unknown): string | undefined {
  if (!response || typeof response !== "object") {
    return undefined;
  }

  const data = response as Record<string, unknown>;
  const candidate =
    data.connected_account_id ??
    data.connectedAccountId ??
    data.connected_account ??
    data.connectedAccount ??
    data.connection_id ??
    data.connectionId ??
    data.id;

  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate;
  }

  const nested =
    (typeof data.connected_account === "object" &&
      data.connected_account !== null &&
      (data.connected_account as { id?: unknown }).id) ||
    (typeof data.connectedAccount === "object" &&
      data.connectedAccount !== null &&
      (data.connectedAccount as { id?: unknown }).id);

  return typeof nested === "string" && nested.trim().length > 0
    ? nested
    : undefined;
}

function formatStatus(status?: string) {
  return status
    ?.toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type WaitForConnectionResponse = {
  connectedAccount?: ConnectedAccountRetrieveResponse;
  error?: { message?: string };
};

type ComposioRenderProps = Pick<
  CatchAllActionRenderProps,
  "args" | "result" | "status"
>;

const POPUP_WIDTH = 480;
const POPUP_HEIGHT = 640;
const POPUP_NAME = "composio-auth-window";

export function ComposioConnectionContent(props: ComposioRenderProps) {
  const { args, result, status } = props;

  const response = result?.data?.response_data;
  const error = result?.error;

  const [connectedAccount, setConnectedAccount] =
    useState<ConnectedAccountRetrieveResponse | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitError, setWaitError] = useState<string | null>(null);
  const [hasLaunchedAuth, setHasLaunchedAuth] = useState(false);
  const [waitController, setWaitController] = useState<AbortController | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const authWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    setConnectedAccount(null);
    setIsWaiting(false);
    setWaitError(null);
    setHasLaunchedAuth(false);
    setIsRefreshing(false);
    setIsDeleting(false);
    setOverrideStatus(null);
    setSuccessMessage(null);
    setIsDeleted(false);
    if (authWindowRef.current && !authWindowRef.current.closed) {
      authWindowRef.current.close();
    }
    authWindowRef.current = null;
    setWaitController((previous) => {
      if (previous) {
        previous.abort();
      }
      return null;
    });
  }, [result]);

  const connectedAccountId = useMemo(
    () => getConnectedAccountId(response),
    [response]
  );

  const displayStatus =
    overrideStatus ?? connectedAccount?.status ?? response?.status;
  const statusBadgeClass =
    STATUS_STYLES[displayStatus as keyof typeof STATUS_STYLES] ??
    STATUS_STYLES.default;
  const humanReadableStatus = formatStatus(displayStatus);
  const defaultMessage =
    response?.message ??
    "Everything is set on our side. Follow the next step to wrap things up.";
  const statusMessage =
    successMessage ??
    (connectedAccount
      ? connectedAccount.statusReason ??
        (connectedAccount.status === "ACTIVE"
          ? "Connection verified. You're all set!"
          : defaultMessage)
      : defaultMessage);
  const hasActiveConnection =
    !isDeleted &&
    (overrideStatus ?? connectedAccount?.status ?? response?.status) ===
      "ACTIVE";

  const launchAuthWindow = useCallback((redirectUrl: string) => {
    if (typeof window === "undefined") {
      return false;
    }

    if (authWindowRef.current && !authWindowRef.current.closed) {
      try {
        authWindowRef.current.location.href = redirectUrl;
        authWindowRef.current.focus();
        return true;
      } catch {
        authWindowRef.current.close();
        authWindowRef.current = null;
      }
    }

    const dualScreenLeft =
      typeof window.screenLeft === "number"
        ? window.screenLeft
        : window.screenX;
    const dualScreenTop =
      typeof window.screenTop === "number" ? window.screenTop : window.screenY;
    const viewportWidth =
      window.innerWidth ??
      document.documentElement.clientWidth ??
      window.screen.width;
    const viewportHeight =
      window.innerHeight ??
      document.documentElement.clientHeight ??
      window.screen.height;
    const popupLeft = Math.max(
      0,
      dualScreenLeft + (viewportWidth - POPUP_WIDTH) / 2
    );
    const popupTop = Math.max(
      0,
      dualScreenTop + (viewportHeight - POPUP_HEIGHT) / 2
    );
    const features = [
      `width=${POPUP_WIDTH}`,
      `height=${POPUP_HEIGHT}`,
      `top=${Math.floor(popupTop)}`,
      `left=${Math.floor(popupLeft)}`,
      "resizable=yes",
      "scrollbars=yes",
    ].join(",");
    const popup = window.open(redirectUrl, POPUP_NAME, features);

    if (!popup) {
      return false;
    }

    authWindowRef.current = popup;
    return true;
  }, []);

  const handleWaitForConnection = useCallback(async () => {
    if (!connectedAccountId) {
      return;
    }

    setIsDeleted(false);
    setConnectedAccount(null);
    setIsWaiting(true);
    setWaitError(null);
    setSuccessMessage(null);

    const controller = new AbortController();
    setWaitController(controller);

    try {
      const response = await fetch("/api/composio/wait-for-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ connectedAccountId }),
        signal: controller.signal,
      });

      const body = (await response
        .json()
        .catch(() => ({}))) as WaitForConnectionResponse;

      if (!response.ok || !body.connectedAccount) {
        const message =
          body?.error?.message ??
          `Unable to verify the connection (status ${response.status}).`;
        throw new Error(message);
      }

      setConnectedAccount(body.connectedAccount);
      setOverrideStatus(null);
    } catch (err) {
      setWaitError(
        err instanceof Error
          ? err.name === "AbortError"
            ? "Verification cancelled."
            : err.message
          : "Unable to verify the connection."
      );
    } finally {
      setIsWaiting(false);
      setWaitController(null);
    }
  }, [connectedAccountId]);

  const handleRefresh = useCallback(async () => {
    if (!connectedAccountId || isWaiting || isRefreshing || isDeleting) {
      return;
    }

    setWaitError(null);
    setSuccessMessage(null);
    setIsDeleted(false);
    setIsRefreshing(true);

    try {
      const response = await fetch(
        `/api/composio/connected-account/${connectedAccountId}/refresh`,
        { method: "POST" }
      );

      const body = (await response.json().catch(() => ({}))) as {
        response?: Record<string, unknown>;
        error?: { message?: string };
      };

      if (!response.ok) {
        const message =
          body?.error?.message ??
          `Unable to refresh the connection (status ${response.status}).`;
        throw new Error(message);
      }

      const refreshed = body?.response ?? {};
      const refreshedStatusValue = (refreshed as Record<string, unknown>)
        .status;
      const refreshedStatus =
        typeof refreshedStatusValue === "string"
          ? refreshedStatusValue
          : undefined;
      const redirectValue = (refreshed as Record<string, unknown>)
        .redirect_url;
      const redirectUrl =
        typeof redirectValue === "string" && redirectValue.trim().length > 0
          ? redirectValue
          : undefined;

      if (refreshedStatus) {
        setOverrideStatus(refreshedStatus);
      }

      if (redirectUrl) {
        const launched = launchAuthWindow(redirectUrl);
        if (!launched) {
          setWaitError(
            "We couldn't open the authorization window. Please disable your popup blocker and try again."
          );
          return;
        }
        setHasLaunchedAuth(true);
      }

      setSuccessMessage(
        "Refresh initiated. We'll verify the connection to confirm the latest status."
      );
      void handleWaitForConnection();
    } catch (err) {
      setWaitError(
        err instanceof Error
          ? err.message
          : "Unable to refresh the connection."
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [
    connectedAccountId,
    handleWaitForConnection,
    isDeleting,
    isRefreshing,
    isWaiting,
    launchAuthWindow,
  ]);

  const closeAuthWindow = useCallback(() => {
    if (authWindowRef.current && !authWindowRef.current.closed) {
      authWindowRef.current.close();
    }
    authWindowRef.current = null;
  }, []);

  const handleDelete = useCallback(async () => {
    if (!connectedAccountId || isDeleting || isRefreshing || isWaiting) {
      return;
    }

    setWaitError(null);
    setSuccessMessage(null);
    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/composio/connected-account/${connectedAccountId}`,
        { method: "DELETE" }
      );

      const body = (await response.json().catch(() => ({}))) as {
        response?: Record<string, unknown>;
        error?: { message?: string };
      };

      if (!response.ok) {
        const message =
          body?.error?.message ??
          `Unable to disconnect the account (status ${response.status}).`;
        throw new Error(message);
      }

      setConnectedAccount(null);
      setOverrideStatus("INACTIVE");
      setSuccessMessage(
        "This connection has been disconnected. Ask the agent to initiate a new connection if you need access again."
      );
      setIsDeleted(true);
      setHasLaunchedAuth(false);
      closeAuthWindow();
      if (waitController) {
        waitController.abort();
      }
    } catch (err) {
      setWaitError(
        err instanceof Error
          ? err.message
          : "Unable to disconnect the account."
      );
    } finally {
      setIsDeleting(false);
    }
  }, [
    closeAuthWindow,
    connectedAccountId,
    isDeleting,
    isRefreshing,
    isWaiting,
    waitController,
  ]);

  const handlePrimaryAction = useCallback(() => {
    if (isDeleted) {
      setWaitError(
        "This connection has been disconnected. Ask the agent to initiate a new connection to continue."
      );
      return;
    }

    if (isWaiting || isRefreshing || isDeleting) {
      return;
    }

    setWaitError(null);
    setSuccessMessage(null);

    if (hasActiveConnection) {
      void handleRefresh();
      return;
    }

    if (response?.redirect_url && !hasActiveConnection) {
      const launched = launchAuthWindow(response.redirect_url);
      if (!launched) {
        setWaitError(
          "We couldn't open the authorization window. Please disable your popup blocker and try again."
        );
        return;
      }
      setHasLaunchedAuth(true);
    }

    if (!connectedAccountId) {
      setWaitError(
        "We don't have the connection details yet. Try again in a moment."
      );
      return;
    }

    void handleWaitForConnection();
  }, [
    connectedAccountId,
    hasActiveConnection,
    handleWaitForConnection,
    handleRefresh,
    isDeleting,
    isDeleted,
    isWaiting,
    isRefreshing,
    launchAuthWindow,
    response?.redirect_url,
  ]);

  const handleCancelWait = useCallback(() => {
    if (waitController) {
      waitController.abort();
    }
  }, [waitController]);

  useEffect(() => {
    if (hasActiveConnection) {
      closeAuthWindow();
    }
  }, [hasActiveConnection, closeAuthWindow]);

  useEffect(
    () => () => {
      closeAuthWindow();
    },
    [closeAuthWindow]
  );

  const primaryLabel = isWaiting
    ? "Waiting for connection…"
    : isRefreshing
    ? "Refreshing connection…"
    : hasActiveConnection
    ? "Refresh connection"
    : hasLaunchedAuth
    ? "Check connection"
    : "Connect & Verify";
  const primaryDisabled = isWaiting || isRefreshing || isDeleting;
  const showPrimaryActions =
    !isDeleted && Boolean(connectedAccountId);
  const showAuthInstructions = showPrimaryActions && !hasActiveConnection;
  const showActiveInstructions = showPrimaryActions && hasActiveConnection;
  let instructionMessage: string | null = null;

  if (showActiveInstructions) {
    instructionMessage =
      'Everything looks connected. If the integration stops responding, click "Refresh connection" to check the latest status.';
  } else if (showAuthInstructions) {
    if (isWaiting) {
      instructionMessage =
        "We're verifying the connection. If you've already finished authorizing, this usually takes just a moment.";
    } else if (waitError) {
      instructionMessage =
        'We could not confirm the connection. Make sure you completed the authorization and then try "Check connection" again. If it still fails, ask the agent to restart the flow so you get a fresh connection link.';
    } else if (hasLaunchedAuth) {
      instructionMessage =
        'Once you finish authorizing, click "Check connection" so we can confirm everything worked.';
    } else {
      instructionMessage =
        'Click the button to open the authorization flow. After you approve access, come back and send a message to the agent like "Continue".';
    }
  }

  if (status !== "complete") {
    return (
      <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 text-slate-600">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            ⚙️
          </span>
          <div>
            <p className="text-sm font-medium">
              We&apos;re getting things ready…
            </p>
            <p className="text-xs text-slate-500">
              Sit tight while we prepare your Composio connection.
            </p>
          </div>
          <span className="ml-auto animate-spin text-slate-400">⏳</span>
        </div>
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="w-full rounded-xl border border-rose-200 bg-white p-4 text-rose-600 shadow-sm">
        <p className="font-semibold">We couldn&apos;t start the connection.</p>
        <p className="text-sm text-rose-500">
          {error?.message ??
            "Try again in a moment, or reach out to support if this keeps happening."}{" "}
          If the problem persists, ask the agent to retry the connection so you receive a fresh authorization link.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-lg text-indigo-600">
          🔗
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">
              {(args as { provider?: string })?.provider ??
                "Connect your account"}
            </h3>
            {response?.status ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass}`}
              >
                {humanReadableStatus}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-600">{statusMessage}</p>
          {waitError ? (
            <p className="mt-2 text-xs text-rose-500">{waitError}</p>
          ) : null}
        </div>
      </div>

      {isDeleted ? (
        <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          This connection has been disconnected. Ask the agent to initiate a new
          connection so you receive a fresh authorization link.
        </div>
      ) : null}

      {showPrimaryActions && response?.redirect_url && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={primaryDisabled}
            className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-75 sm:flex-1"
          >
            {isWaiting ? (
              <span
                aria-hidden="true"
                className="mr-2 text-base leading-none text-indigo-100"
              >
                ⏳
              </span>
            ) : null}
            {primaryLabel}
          </button>
          {isWaiting ? (
            <button
              type="button"
              onClick={handleCancelWait}
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 sm:flex-1"
            >
              Cancel
            </button>
          ) : null}
          {hasActiveConnection ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isRefreshing || isWaiting}
              className="inline-flex w-full items-center justify-center rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-75 sm:flex-1"
            >
              {isDeleting ? (
                <span
                  aria-hidden="true"
                  className="mr-2 text-base leading-none text-rose-300"
                >
                  ⏳
                </span>
              ) : null}
              Disconnect
            </button>
          ) : null}
        </div>
      )}
      {instructionMessage ? (
        <p className="mt-3 text-xs text-slate-500">{instructionMessage}</p>
      ) : null}
    </div>
  );
}

export function ComposioConnectionRenderer() {
  useRenderToolCall({
    name: "COMPOSIO_INITIATE_CONNECTION",
    render: (props) => <ComposioConnectionContent {...props} />,
  });

  return null;
}
