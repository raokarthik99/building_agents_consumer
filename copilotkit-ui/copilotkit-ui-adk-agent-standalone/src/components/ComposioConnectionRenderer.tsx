"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRenderToolCall } from "@copilotkit/react-core";
import type { CatchAllActionRenderProps } from "@copilotkit/react-core";
import type {
  ConnectedAccountRetrieveResponse,
  ToolkitRetrieveResponse,
} from "@composio/core";

import { Button } from "@/components/Button";
import {
  CONNECTED_ACCOUNT_STATUS_STYLES,
  extractAccountFriendlyName,
  formatStatus,
  formatToolkitNameFromSlug,
  getAccountUpdatedAt,
  getConnectedAccountId,
} from "@/lib/composio/connectedAccount";

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
  const [toolkit, setToolkit] = useState<ToolkitRetrieveResponse | null>(null);
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
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const authWindowRef = useRef<Window | null>(null);
  const connectionKeyRef = useRef<string | null>(null);

  const closeAuthWindow = useCallback(() => {
    if (authWindowRef.current && !authWindowRef.current.closed) {
      authWindowRef.current.close();
    }
    authWindowRef.current = null;
  }, []);

  const resetState = useCallback(() => {
    setConnectedAccount(null);
    setToolkit(null);
    setIsWaiting(false);
    setWaitError(null);
    setHasLaunchedAuth(false);
    setIsRefreshing(false);
    setIsDeleting(false);
    setOverrideStatus(null);
    setSuccessMessage(null);
    setIsDeleted(false);
    setIsDetailsLoading(false);
    setDetailsError(null);
    closeAuthWindow();
    setWaitController((previous) => {
      if (previous) {
        previous.abort();
      }
      return null;
    });
  }, [closeAuthWindow]);

  const connectedAccountId = useMemo(
    () => getConnectedAccountId(response),
    [response]
  );

  useEffect(() => {
    if (status !== "complete") {
      if (connectionKeyRef.current !== null) {
        resetState();
        connectionKeyRef.current = null;
      }
      return;
    }

    const key = connectedAccountId ?? "__no_connection__";

    if (connectionKeyRef.current === key) {
      return;
    }

    resetState();
    connectionKeyRef.current = key;
  }, [connectedAccountId, resetState, status]);

  const loadConnectionDetails = useCallback(async () => {
    if (!connectedAccountId) {
      setToolkit(null);
      setDetailsError(null);
      return;
    }

    setIsDetailsLoading(true);
    setDetailsError(null);

    try {
      const response = await fetch(
        `/api/composio/connected-account/${connectedAccountId}`
      );

      const body = (await response.json().catch(() => ({}))) as {
        connectedAccount?: ConnectedAccountRetrieveResponse;
        toolkit?: ToolkitRetrieveResponse | null;
        error?: { message?: string };
      };

      if (!response.ok) {
        const message =
          body?.error?.message ??
          `Unable to load the connection details (status ${response.status}).`;
        throw new Error(message);
      }

      if (body.connectedAccount) {
        setConnectedAccount(body.connectedAccount);
      }

      setToolkit(body.toolkit ?? null);
    } catch (err) {
      setDetailsError(
        err instanceof Error
          ? err.message
          : "We couldn't load the connection details."
      );
    } finally {
      setIsDetailsLoading(false);
    }
  }, [connectedAccountId]);

  useEffect(() => {
    void loadConnectionDetails();
  }, [loadConnectionDetails]);

  const providerName = (args as { provider?: string })?.provider;
  const accountDisplayName = useMemo(
    () => extractAccountFriendlyName(connectedAccount),
    [connectedAccount]
  );
  const toolkitSlug = connectedAccount?.toolkit?.slug ?? toolkit?.slug ?? null;
  const integrationName =
    toolkit?.name ??
    formatToolkitNameFromSlug(toolkitSlug) ??
    providerName ??
    "Connect your account";
  const accountUpdatedAt = useMemo(
    () => getAccountUpdatedAt(connectedAccount),
    [connectedAccount]
  );
  const formattedUpdatedAt = useMemo(() => {
    if (!accountUpdatedAt) {
      return null;
    }
    const timestamp = Date.parse(accountUpdatedAt);
    if (Number.isNaN(timestamp)) {
      return null;
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  }, [accountUpdatedAt]);
  const logoUrl = useMemo(() => {
    const candidate = toolkit?.meta?.logo;
    return typeof candidate === "string" && candidate.trim().length > 0
      ? candidate
      : null;
  }, [toolkit]);
  const toolkitDescription = useMemo(() => {
    const description = toolkit?.meta?.description;
    if (typeof description !== "string" || !description.trim()) {
      return null;
    }
    const trimmed = description.trim();
    return trimmed.length > 160 ? `${trimmed.slice(0, 157)}…` : trimmed;
  }, [toolkit]);

  const displayStatus =
    overrideStatus ?? connectedAccount?.status ?? response?.status;
  const statusBadgeClass =
    CONNECTED_ACCOUNT_STATUS_STYLES[
      displayStatus as keyof typeof CONNECTED_ACCOUNT_STATUS_STYLES
    ] ?? CONNECTED_ACCOUNT_STATUS_STYLES.default;
  const humanReadableStatus = formatStatus(displayStatus);
  const hasActiveConnection =
    !isDeleted &&
    (overrideStatus ?? connectedAccount?.status ?? response?.status) ===
      "ACTIVE";
  const baseIntegrationLabel =
    integrationName === "Connect your account"
      ? "your account"
      : integrationName;
  const connectionTitle = hasActiveConnection
    ? integrationName
    : integrationName === "Connect your account"
    ? "Connect your account"
    : `Connect to your ${integrationName} account`;
  const defaultMessage =
    response?.message ??
    `Everything is set on our side for ${baseIntegrationLabel}. Follow the next step to wrap things up.`;
  const statusMessage =
    successMessage ??
    (connectedAccount
      ? connectedAccount.statusReason ??
        (connectedAccount.status === "ACTIVE"
          ? accountDisplayName
            ? `Connection verified. You're signed in as ${accountDisplayName}.`
            : "Connection verified. You're all set!"
          : defaultMessage)
      : defaultMessage);

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
      void loadConnectionDetails();
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
  }, [connectedAccountId, loadConnectionDetails]);

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

      setToolkit(null);
      setDetailsError(null);
      setIsDetailsLoading(false);
      setConnectedAccount(null);
      setOverrideStatus("INACTIVE");
      setSuccessMessage(
        "This connection has been disconnected. Ask me to initiate a new connection if you need access again."
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
        "This connection has been disconnected. Ask me to initiate a new connection to continue."
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
    instructionMessage = `Everything with ${baseIntegrationLabel} looks connected. If it stops responding, click "Refresh connection" to check the latest status. When you return to the chat, send me a quick message like "Continue" so I resume the original task.`;
  } else if (showAuthInstructions) {
    if (isWaiting) {
      instructionMessage = `We're verifying the ${baseIntegrationLabel} connection. If you've already finished authorizing, this usually takes just a moment.`;
    } else if (waitError) {
      instructionMessage =
        'We could not confirm the connection. Make sure you completed the authorization and then try "Check connection" again. If it still fails, ask me to restart the flow so you get a fresh authorization link.';
    } else if (hasLaunchedAuth) {
      instructionMessage = `Once you finish authorizing ${baseIntegrationLabel}, click "Check connection" so we can confirm everything worked.`;
    } else {
      instructionMessage = `Click the button to open the ${baseIntegrationLabel} authorization flow. After you approve access, come back and send me a message like "Continue".`;
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
          If the problem persists, ask me to retry the connection so you receive a fresh authorization link.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-lg font-semibold text-indigo-600">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${integrationName} logo`}
              width={40}
              height={40}
              sizes="40px"
              unoptimized
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <span aria-hidden="true">🔗</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 text-slate-800">
            <h3 className="text-base font-semibold">{connectionTitle}</h3>
            {displayStatus ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass}`}
              >
                {humanReadableStatus}
              </span>
            ) : null}
            {isDetailsLoading ? (
              <span className="text-xs text-slate-400">Refreshing details…</span>
            ) : null}
          </div>
          {toolkitDescription ? (
            <p className="mt-1 text-xs text-slate-500">{toolkitDescription}</p>
          ) : null}
          <p className="mt-1 text-sm text-slate-600">{statusMessage}</p>
          {detailsError && !toolkit ? (
            <p className="mt-2 text-xs text-amber-600">{detailsError}</p>
          ) : null}
          {waitError ? (
            <p className="mt-2 text-xs text-rose-500">{waitError}</p>
          ) : null}
          {(accountDisplayName || formattedUpdatedAt) && !isDeleted ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              {accountDisplayName ? (
                <span className="flex items-center gap-1">
                  <span className="text-slate-400">Signed in as</span>
                  <span className="font-medium text-slate-600">
                    {accountDisplayName}
                  </span>
                </span>
              ) : null}
              {formattedUpdatedAt ? (
                <span className="flex items-center gap-1">
                  <span className="text-slate-400">Last checked</span>
                  <span className="font-medium text-slate-600">
                    {formattedUpdatedAt}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {isDeleted ? (
        <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          This connection has been disconnected. Ask me to initiate a new
          connection so you receive a fresh authorization link.
        </div>
      ) : null}

      {showPrimaryActions && response?.redirect_url && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={handlePrimaryAction}
            disabled={primaryDisabled}
            fullWidth
            shape="rounded"
            className="sm:flex-1"
          >
            {isWaiting ? <span aria-hidden>⏳</span> : null}
            {primaryLabel}
          </Button>
          {isWaiting ? (
            <Button
              onClick={handleCancelWait}
              variant="secondary"
              fullWidth
              shape="rounded"
              className="sm:flex-1"
            >
              Cancel
            </Button>
          ) : null}
          {hasActiveConnection ? (
            <Button
              onClick={handleDelete}
              disabled={isDeleting || isRefreshing || isWaiting}
              variant="destructive"
              fullWidth
              shape="rounded"
              className="sm:flex-1"
            >
              {isDeleting ? <span aria-hidden>⏳</span> : null}
              Disconnect
            </Button>
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
