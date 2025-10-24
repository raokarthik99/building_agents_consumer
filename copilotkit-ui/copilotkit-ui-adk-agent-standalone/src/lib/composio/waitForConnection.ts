import type { ConnectedAccountRetrieveResponse } from "@composio/core";

type WaitForConnectionResponse = {
  connectedAccount?: ConnectedAccountRetrieveResponse;
  error?: { message?: string };
};

export async function waitForConnectedAccount(
  connectedAccountId: string,
  options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
  }
): Promise<ConnectedAccountRetrieveResponse> {
  const payload: {
    connectedAccountId: string;
    timeoutMs?: number;
  } = { connectedAccountId };

  if (
    typeof options?.timeoutMs === "number" &&
    Number.isFinite(options.timeoutMs)
  ) {
    payload.timeoutMs = options.timeoutMs;
  }

  const response = await fetch("/api/composio/wait-for-connection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: options?.signal,
  });

  const body = (await response.json().catch(() => ({}))) as
    | WaitForConnectionResponse
    | undefined;

  if (!response.ok || !body?.connectedAccount) {
    const message =
      body?.error?.message ??
      `Unable to verify the connection (status ${response.status}).`;
    throw new Error(message);
  }

  return body.connectedAccount;
}
