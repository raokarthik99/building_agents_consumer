"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import type {
  ConnectedAccountListResponseItem,
  ToolkitRetrieveResponse,
} from "@composio/core";
import { ConnectedAccountStatuses } from "@composio/core";

import { Button } from "@/components/Button";
import {
  CONNECTED_ACCOUNT_STATUS_STYLES,
  formatStatus,
  formatToolkitNameFromSlug,
  getAccountDisplayName,
  getAccountUpdatedAt,
  getConnectedAccountId,
  shortenIdentifier,
} from "@/lib/composio/connectedAccount";

type ConnectedAccountsResponse = {
  connectedAccounts?: {
    items: ConnectedAccountListResponseItem[];
    nextCursor?: string | null;
    totalPages?: number | null;
  };
  toolkits?: Record<string, ToolkitRetrieveResponse>;
  error?: { message?: string };
};

type BannerState = {
  type: "success" | "error";
  message: string;
};

type AccountAction = "refresh" | "delete";

type AccountActionState = Record<
  string,
  {
    type: AccountAction;
  }
>;

type QueryState = {
  statuses: Set<string>;
  orderBy: "updated_at" | "created_at";
  cursor: string | null;
  cursorStack: string[];
};

const DEFAULT_QUERY: QueryState = {
  statuses: new Set(),
  orderBy: "updated_at",
  cursor: null,
  cursorStack: [],
};

const PAGE_SIZE = 10;
const ORDER_OPTIONS: Array<{ value: QueryState["orderBy"]; label: string }> = [
  { value: "updated_at", label: "Last updated" },
  { value: "created_at", label: "Date added" },
];

const STATUS_FILTERS = Object.values(ConnectedAccountStatuses).map((value) => ({
  value,
  label:
    value === "INACTIVE"
      ? "Inactive"
      : formatStatus(value) ?? value.toLowerCase(),
}));

export function ManageConnectionsView() {
  const [query, setQuery] = useState<QueryState>({
    ...DEFAULT_QUERY,
    statuses: new Set(DEFAULT_QUERY.statuses),
  });
  const [status, setStatus] = useState<"idle" | "loading" | "refreshing">(
    "loading"
  );
  const [connections, setConnections] = useState<
    ConnectedAccountListResponseItem[]
  >([]);
  const [toolkits, setToolkits] = useState<
    Record<string, ToolkitRetrieveResponse>
  >({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedConnections, setHasLoadedConnections] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [pendingActions, setPendingActions] = useState<AccountActionState>({});
  const [isRefreshingList, startRefreshTransition] = useTransition();
  const hasLoadedRef = useRef(false);

  const loadConnections = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      setStatus(mode === "initial" ? "loading" : "refreshing");
      setError(null);
      setHasLoadedConnections(false);

      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("orderBy", query.orderBy);

      if (query.cursor) {
        params.set("cursor", query.cursor);
      }

      for (const statusValue of query.statuses) {
        params.append("statuses", statusValue);
      }

      try {
        const response = await fetch(
          `/api/composio/connected-accounts?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          }
        );

        const body = (await response
          .json()
          .catch(() => ({}))) as ConnectedAccountsResponse;

        if (!response.ok) {
          const message =
            body?.error?.message ??
            `Unable to load connected accounts (status ${response.status}).`;
          throw new Error(message);
        }

        setConnections(body.connectedAccounts?.items ?? []);
        setNextCursor(body.connectedAccounts?.nextCursor ?? null);
        setToolkits(body.toolkits ?? {});
        setHasLoadedConnections(true);
      } catch (err) {
        setConnections([]);
        setNextCursor(null);
        setToolkits({});
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't load your connections. Please try again."
        );
        setHasLoadedConnections(true);
      } finally {
        setStatus("idle");
      }
    },
    [query.cursor, query.orderBy, query.statuses]
  );

  useEffect(() => {
    const mode = hasLoadedRef.current ? "refresh" : "initial";
    hasLoadedRef.current = true;
    void loadConnections(mode);
  }, [loadConnections]);

  useEffect(() => {
    if (!banner) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setBanner(null);
    }, 6000);
    return () => window.clearTimeout(timeoutId);
  }, [banner]);

  const toggleStatus = useCallback((value: string) => {
    setQuery((previous) => {
      const nextStatuses = new Set(previous.statuses);
      if (nextStatuses.has(value)) {
        nextStatuses.delete(value);
      } else {
        nextStatuses.add(value);
      }
      return {
        ...previous,
        statuses: nextStatuses,
        cursor: null,
        cursorStack: [],
      };
    });
  }, []);

  const updateOrderBy = useCallback((value: QueryState["orderBy"]) => {
    setQuery((previous) => ({
      ...previous,
      orderBy: value,
      cursor: null,
      cursorStack: [],
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setQuery({
      ...DEFAULT_QUERY,
      statuses: new Set(),
    });
  }, []);

  const goToNextPage = useCallback(() => {
    if (!nextCursor) {
      return;
    }
    setQuery((previous) => ({
      ...previous,
      cursor: nextCursor,
      cursorStack: previous.cursor
        ? [...previous.cursorStack, previous.cursor]
        : previous.cursorStack,
    }));
  }, [nextCursor]);

  const goToPreviousPage = useCallback(() => {
    setQuery((previous) => {
      if (previous.cursorStack.length === 0) {
        return previous;
      }
      const nextStack = [...previous.cursorStack];
      const newCursor = nextStack.pop() ?? null;
      return {
        ...previous,
        cursor: newCursor,
        cursorStack: nextStack,
      };
    });
  }, []);

  const triggerAction = useCallback(
    async (accountId: string, action: AccountAction) => {
      setPendingActions((previous) => ({
        ...previous,
        [accountId]: { type: action },
      }));
      setBanner(null);
      try {
        const endpoint =
          action === "refresh"
            ? `/api/composio/connected-account/${accountId}/refresh`
            : `/api/composio/connected-account/${accountId}`;
        const method = action === "refresh" ? "POST" : "DELETE";

        const response = await fetch(endpoint, { method });
        const body = await response
          .json()
          .catch(() => ({} as { error?: { message?: string } }));

        if (!response.ok) {
          const message =
            body?.error?.message ??
            `Unable to ${
              action === "refresh" ? "refresh" : "disconnect"
            } the connection (status ${response.status}).`;
          throw new Error(message);
        }

        const successMessage =
          action === "refresh"
            ? "Refresh initiated. We'll check back in a moment."
            : "Connection removed. You can always reconnect by chatting with the agent.";

        setBanner({ type: "success", message: successMessage });

        startRefreshTransition(() => {
          void loadConnections("refresh");
        });
      } catch (err) {
        setBanner({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "We couldn't complete that request. Please try again.",
        });
      } finally {
        setPendingActions((previous) => {
          const updated = { ...previous };
          delete updated[accountId];
          return updated;
        });
      }
    },
    [loadConnections, startRefreshTransition]
  );

  const hasFiltersApplied = query.statuses.size > 0;
  const showEmptyState = hasLoadedConnections && connections.length === 0;

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-hidden px-5 py-6 md:px-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Manage Connections
            </h1>
          </div>
          <Button
            onClick={() => {
              setBanner(null);
              startRefreshTransition(() => {
                void loadConnections("refresh");
              });
            }}
            disabled={status === "loading" || isRefreshingList}
            variant="secondary"
            size="sm"
          >
            {status === "loading" || isRefreshingList ? (
              <>
                <span className="size-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
                Loading
              </>
            ) : (
              "Refresh list"
            )}
          </Button>
        </div>
        <FiltersBar
          query={query}
          onToggleStatus={toggleStatus}
          onOrderByChange={updateOrderBy}
          onReset={resetFilters}
          statuses={STATUS_FILTERS}
          hasFiltersApplied={hasFiltersApplied}
        />
        {banner && (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
              banner.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <span className="font-medium">
              {banner.type === "success" ? "Success" : "Something went wrong"}
            </span>
            <span>{banner.message}</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex-shrink-0 border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Connected accounts
            </h2>
          </div>
          <div className="flex-1 overflow-auto px-6 py-4">
            {!hasLoadedConnections ? (
              <LoadingState />
            ) : error ? (
              <ErrorState
                message={error}
                onRetry={() => {
                  setBanner(null);
                  startRefreshTransition(() => {
                    void loadConnections("refresh");
                  });
                }}
              />
            ) : showEmptyState ? (
              <EmptyState hasFiltersApplied={hasFiltersApplied} />
            ) : (
              <ConnectedAccountsTable
                connections={connections}
                toolkits={toolkits}
                pendingActions={pendingActions}
                onAction={triggerAction}
              />
            )}
          </div>
          <PaginationBar
            disablePrev={query.cursorStack.length === 0 || status === "loading"}
            disableNext={!nextCursor || status === "loading"}
            onPrev={goToPreviousPage}
            onNext={goToNextPage}
          />
        </div>
      </div>
    </div>
  );
}

function FiltersBar({
  query,
  onToggleStatus,
  onOrderByChange,
  onReset,
  statuses,
  hasFiltersApplied,
}: {
  query: QueryState;
  onToggleStatus: (value: string) => void;
  onOrderByChange: (value: QueryState["orderBy"]) => void;
  onReset: () => void;
  statuses: Array<{ value: string; label: string }>;
  hasFiltersApplied: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Status
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {statuses.map(({ value, label }) => {
              const isActive = query.statuses.has(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onToggleStatus(value)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Sort
            </span>
            <select
              value={query.orderBy}
              onChange={(event) =>
                onOrderByChange(event.target.value as QueryState["orderBy"])
              }
              className="min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            >
              {ORDER_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={onReset}
            variant="ghost"
            size="sm"
            disabled={!hasFiltersApplied}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="grid animate-pulse grid-cols-[auto,1fr,auto] items-center gap-4 rounded-xl border border-slate-200 bg-slate-100/60 px-4 py-3"
        >
          <div className="h-10 w-10 rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-1/3 rounded-full bg-slate-200" />
            <div className="h-3 w-1/5 rounded-full bg-slate-200" />
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-20 rounded-full bg-slate-200" />
            <div className="h-7 w-20 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
      <div className="text-sm font-medium">{message}</div>
      <Button onClick={onRetry} variant="destructive">
        Try again
      </Button>
    </div>
  );
}

function EmptyState({ hasFiltersApplied }: { hasFiltersApplied: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
      <div className="text-base font-semibold text-slate-700">
        {hasFiltersApplied
          ? "No matches for your filters"
          : "No connections yet"}
      </div>
      <p className="max-w-sm">
        {hasFiltersApplied
          ? "Adjust your filters to see more connections."
          : "Ask the agent to connect a tool to see it listed here. Once connected, you can refresh or disconnect it at any time."}
      </p>
    </div>
  );
}

function ConnectedAccountsTable({
  connections,
  toolkits,
  pendingActions,
  onAction,
}: {
  connections: ConnectedAccountListResponseItem[];
  toolkits: Record<string, ToolkitRetrieveResponse>;
  pendingActions: AccountActionState;
  onAction: (accountId: string, action: AccountAction) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="w-1/4 px-3 py-2 font-semibold">Toolkit</th>
            <th className="w-1/4 px-3 py-2 font-semibold">Account</th>
            <th className="w-1/6 px-3 py-2 font-semibold">Status</th>
            <th className="w-1/4 px-3 py-2 font-semibold">Updated</th>
            <th className="w-[140px] px-3 py-2 font-semibold text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {connections.map((connection, index) => {
            const accountId =
              getConnectedAccountId(connection) ?? connection.id ?? null;
            const slug =
              connection.toolkit?.slug ??
              ((connection as Record<string, unknown>).toolkitSlug as
                | string
                | undefined) ??
              null;
            const resolvedToolkit = slug
              ? toolkits[slug] ?? connection.toolkit ?? null
              : connection.toolkit ?? null;
            const resolvedToolkitName = isToolkitLike(resolvedToolkit)
              ? asNonEmptyString(resolvedToolkit.name)
              : null;
            const toolkitName =
              resolvedToolkitName ??
              formatToolkitNameFromSlug(slug) ??
              "Unknown toolkit";
            const logoUrl = isToolkitLike(resolvedToolkit)
              ? getToolkitLogo(resolvedToolkit.meta?.logo)
              : null;
            const initials = toolkitName
              .split(" ")
              .map((segment: string) => segment[0] ?? "")
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const slugMatchesName =
              slug &&
              toolkitName &&
              slug.replace(/[-_]/g, " ").toLowerCase() ===
                toolkitName.toLowerCase();
            const showSlug = Boolean(slug && !slugMatchesName);
            const fallbackName = toolkitName
              ? `${toolkitName} account`
              : undefined;
            const accountName = getAccountDisplayName(connection, fallbackName);
            const userId = asNonEmptyString(
              (connection as { userId?: unknown }).userId
            );
            const shortUserId = userId ? shortenIdentifier(userId) : null;
            const shortAccountId = accountId
              ? shortenIdentifier(accountId)
              : null;
            const accountType = asNonEmptyString(
              ((connection as { authConfig?: { type?: unknown } }).authConfig
                ?.type ?? null) as string | null
            );
            const secondaryLabel = shortUserId
              ? `User ${shortUserId}`
              : shortAccountId
              ? `ID ${shortAccountId}`
              : accountType
              ? humanizeEnumeration(accountType)
              : null;
            const statusClass =
              CONNECTED_ACCOUNT_STATUS_STYLES[
                connection.status as keyof typeof CONNECTED_ACCOUNT_STATUS_STYLES
              ] ?? CONNECTED_ACCOUNT_STATUS_STYLES.default;
            const statusLabel = formatStatus(connection.status) ?? "Unknown";
            const updatedAt = formatUpdatedMetadata(
              getAccountUpdatedAt(connection)
            );
            const isDisabled = connection.isDisabled;
            const pendingAction = accountId
              ? pendingActions[accountId]
              : undefined;

            return (
              <tr
                key={accountId ?? `connection-${index}`}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt={toolkitName}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
                          {initials || "TK"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">
                        {toolkitName}
                      </div>
                      {showSlug && (
                        <div className="truncate text-[11px] uppercase tracking-wide text-slate-400">
                          {slug}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col">
                    <span className="truncate font-medium text-slate-700">
                      {accountName}
                    </span>
                    {secondaryLabel && (
                      <span className="truncate text-xs text-slate-400">
                        {secondaryLabel}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`${statusClass} inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide`}
                  >
                    {statusLabel}
                  </span>
                  {isDisabled && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                      Disabled
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {updatedAt ? (
                    <div className="flex flex-col text-xs text-slate-500">
                      <span>{updatedAt.absolute}</span>
                      <span>{updatedAt.relative}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() =>
                        accountId && onAction(accountId, "refresh")
                      }
                      disabled={!accountId || Boolean(pendingAction)}
                      size="sm"
                    >
                      {pendingAction?.type === "refresh"
                        ? "Refreshing…"
                        : "Refresh"}
                    </Button>
                    <Button
                      onClick={() => {
                        if (!accountId) {
                          return;
                        }
                        const shouldDelete =
                          window.confirm(
                            "Disconnect this account? This action cannot be undone."
                          ) ?? false;
                        if (!shouldDelete) {
                          return;
                        }
                        void onAction(accountId, "delete");
                      }}
                      disabled={!accountId || Boolean(pendingAction)}
                      variant="destructive"
                      size="sm"
                    >
                      {pendingAction?.type === "delete"
                        ? "Disconnecting…"
                        : "Disconnect"}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PaginationBar({
  disablePrev,
  disableNext,
  onPrev,
  onNext,
}: {
  disablePrev: boolean;
  disableNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={onPrev}
          disabled={disablePrev}
          variant="secondary"
          size="sm"
        >
          Previous
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={disableNext}
          variant="secondary"
          size="sm"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

type ToolkitLike = {
  name?: unknown;
  meta?: { logo?: unknown } | null;
};

function isToolkitLike(value: unknown): value is ToolkitLike {
  return typeof value === "object" && value !== null;
}

function getToolkitLogo(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function humanizeEnumeration(value: string): string {
  return value
    .replace(/[_\s]+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatUpdatedMetadata(updatedAt: string | null) {
  if (!updatedAt) {
    return null;
  }

  const parsed = Date.parse(updatedAt);

  if (Number.isNaN(parsed)) {
    return null;
  }

  const date = new Date(parsed);
  const absolute = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
  const relative = formatRelativeTime(date);

  return { absolute, relative };
}

function formatRelativeTime(date: Date) {
  const now = Date.now();
  const diffInSeconds = Math.round((date.getTime() - now) / 1000);

  const divisors: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.34524],
    ["month", 12],
    ["year", Infinity],
  ];

  let unit: Intl.RelativeTimeFormatUnit = "second";
  let value = diffInSeconds;

  for (const [candidateUnit, divisor] of divisors) {
    if (Math.abs(value) < divisor) {
      unit = candidateUnit;
      break;
    }
    value /= divisor;
  }

  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });

  return formatter.format(Math.round(value), unit);
}
