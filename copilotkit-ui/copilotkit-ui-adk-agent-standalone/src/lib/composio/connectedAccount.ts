import type {
  ConnectedAccountRetrieveResponse,
  ConnectedAccountListResponseItem,
} from "@composio/core";

export const CONNECTED_ACCOUNT_STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-600",
  FAILED: "bg-rose-100 text-rose-600",
  ACTIVE: "bg-emerald-100 text-emerald-600",
  INACTIVE: "bg-amber-100 text-amber-600",
  INITIATED: "bg-indigo-100 text-indigo-600",
  INITIALIZING: "bg-indigo-100 text-indigo-600",
  PENDING: "bg-indigo-100 text-indigo-600",
  EXPIRED: "bg-rose-100 text-rose-600",
  default: "bg-indigo-100 text-indigo-600",
};

export function getConnectedAccountId(response: unknown): string | undefined {
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

const ACCOUNT_NAME_CANDIDATE_KEYS = [
  "account_email",
  "account_name",
  "account_username",
  "account_display_name",
  "email",
  "name",
  "username",
  "login",
  "user",
  "user_name",
] as const;

export function extractAccountFriendlyName(
  account: Pick<ConnectedAccountRetrieveResponse, "state"> | null | undefined
): string | null {
  const stateObject =
    account && typeof account === "object"
      ? (account as { state?: unknown }).state
      : null;

  if (!stateObject || typeof stateObject !== "object") {
    return null;
  }

  const candidate =
    "val" in stateObject &&
    stateObject.val &&
    typeof stateObject.val === "object"
      ? (stateObject.val as Record<string, unknown>)
      : null;

  if (!candidate) {
    return null;
  }

  for (const key of ACCOUNT_NAME_CANDIDATE_KEYS) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

export function getAccountUpdatedAt(
  account:
    | Pick<ConnectedAccountRetrieveResponse, "updatedAt">
    | null
    | undefined
): string | null {
  if (!account) {
    return null;
  }

  if (typeof account.updatedAt === "string" && account.updatedAt.trim()) {
    return account.updatedAt;
  }

  const legacyValue = (account as Record<string, unknown>)["updated_at"];

  return typeof legacyValue === "string" && legacyValue.trim().length > 0
    ? legacyValue
    : null;
}

export function formatToolkitNameFromSlug(slug?: string | null) {
  if (!slug) {
    return undefined;
  }

  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatStatus(status?: string) {
  return status
    ?.toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type AccountLike =
  | Partial<
      Pick<ConnectedAccountRetrieveResponse, "id" | "authConfig" | "state">
    >
  | Partial<
      Pick<ConnectedAccountListResponseItem, "id" | "authConfig" | "state">
    >;

export function getAccountDisplayName(
  account: AccountLike | null | undefined,
  fallback?: string
): string {
  const fallbackLabel = getNonEmptyString(fallback);
  const friendly = extractAccountFriendlyName(
    account as Pick<ConnectedAccountRetrieveResponse, "state">
  );
  if (friendly) {
    return friendly;
  }

  const authName = getNonEmptyString(
    account?.authConfig &&
      typeof account.authConfig === "object" &&
      "name" in account.authConfig
      ? (account.authConfig as { name?: unknown }).name
      : undefined
  );
  if (authName) {
    return authName;
  }

  if (fallbackLabel) {
    return fallbackLabel;
  }

  const userId = getNonEmptyString(
    account && typeof account === "object" && "userId" in account
      ? (account as { userId?: unknown }).userId
      : undefined
  );
  if (userId) {
    return `User ${shortenIdentifier(userId)}`;
  }

  const accountId = getNonEmptyString((account as { id?: unknown })?.id);
  if (accountId) {
    return `Account ${shortenIdentifier(accountId)}`;
  }

  return fallbackLabel ?? "Connected account";
}

export function shortenIdentifier(value: string, maxLength = 12) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const segmentLength = Math.max(2, Math.floor((maxLength - 1) / 2));
  const start = trimmed.slice(0, segmentLength);
  const end = trimmed.slice(-segmentLength);
  return `${start}…${end}`;
}

function getNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
