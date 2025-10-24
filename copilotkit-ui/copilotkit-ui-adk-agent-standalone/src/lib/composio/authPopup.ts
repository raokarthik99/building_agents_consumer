import type { MutableRefObject } from "react";

export const AUTH_POPUP_WIDTH = 480;
export const AUTH_POPUP_HEIGHT = 640;
export const AUTH_POPUP_NAME = "composio-auth-window";

export function closeAuthPopup(ref: MutableRefObject<Window | null>) {
  if (ref.current && !ref.current.closed) {
    ref.current.close();
  }
  ref.current = null;
}

export function openAuthPopup(
  ref: MutableRefObject<Window | null>,
  redirectUrl: string
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const trimmedUrl = redirectUrl.trim();

  if (!trimmedUrl) {
    return false;
  }

  if (ref.current && !ref.current.closed) {
    try {
      ref.current.location.href = trimmedUrl;
      ref.current.focus();
      return true;
    } catch {
      closeAuthPopup(ref);
    }
  }

  const dualScreenLeft =
    typeof window.screenLeft === "number" ? window.screenLeft : window.screenX;
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
    dualScreenLeft + (viewportWidth - AUTH_POPUP_WIDTH) / 2
  );
  const popupTop = Math.max(
    0,
    dualScreenTop + (viewportHeight - AUTH_POPUP_HEIGHT) / 2
  );
  const features = [
    `width=${AUTH_POPUP_WIDTH}`,
    `height=${AUTH_POPUP_HEIGHT}`,
    `top=${Math.floor(popupTop)}`,
    `left=${Math.floor(popupLeft)}`,
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");
  const popup = window.open(trimmedUrl, AUTH_POPUP_NAME, features);

  if (!popup) {
    return false;
  }

  ref.current = popup;
  return true;
}
