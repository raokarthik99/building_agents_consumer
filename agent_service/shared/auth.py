import logging
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any, Iterable, Mapping, Optional, Sequence, Set

import httpx
from fastapi import Request, status
from fastapi.responses import JSONResponse
from jwt import InvalidTokenError, decode as jwt_decode, get_unverified_header
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SupabaseAuthContext:
    user: Mapping[str, Any]
    claims: Mapping[str, Any]


_auth_context_var: ContextVar[Optional[SupabaseAuthContext]] = ContextVar(
    "supabase_auth_context",
    default=None,
)


def get_supabase_auth_context() -> Optional[SupabaseAuthContext]:
    """
    Return the current request's Supabase auth context, if any.
    """
    return _auth_context_var.get()


def get_supabase_user_id() -> Optional[str]:
    """
    Convenience helper to extract the Supabase user id from the request auth context.
    """
    context = get_supabase_auth_context()
    if context is None:
        return None

    user_id = context.user.get("id")
    if isinstance(user_id, str) and user_id.strip():
        return user_id
    return None


class SupabaseAuthMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware that enforces Supabase JWT authentication.

    The middleware validates bearer tokens using the supplied Supabase JWT secret and
    checks whether the user still exists by hitting the `/auth/v1/user` endpoint.
    A validated user payload is attached to `request.state.supabase_user`.
    """

    def __init__(
        self,
        app,
        *,
        supabase_url: str,
        supabase_api_key: Optional[str] = None,
        supabase_jwt_secret: Optional[str] = None,
        required_audiences: Optional[Sequence[str]] = None,
        issuer: Optional[str] = None,
        http_timeout: float = 3.0,
        exclude_paths: Optional[Iterable[str]] = None,
    ) -> None:
        super().__init__(app)
        if supabase_url.endswith("/"):
            supabase_url = supabase_url[:-1]
        self.supabase_url = supabase_url
        self.supabase_api_key = supabase_api_key
        self.supabase_jwt_secret = supabase_jwt_secret
        self.required_audiences: Optional[Set[str]] = (
            set(required_audiences) if required_audiences else None
        )
        self.issuer = issuer or f"{self.supabase_url}/auth/v1"
        self.http_timeout = http_timeout
        self.exclude_paths = set(exclude_paths or [])

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in self.exclude_paths:
            logger.debug("Skipping auth for excluded path %s", request.url.path)
            return await call_next(request)

        token = self._extract_bearer_token(request)
        if not token:
            logger.info(
                "Auth failure: missing bearer token for request %s %s",
                request.method,
                request.url.path,
            )
            return self._unauthorized("Missing bearer token")

        payload = await self._validate_jwt(token)
        if payload is None:
            logger.warning(
                "Auth failure: JWT validation failed for request %s %s (token preview=%s)",
                request.method,
                request.url.path,
                self._safe_token_preview(token),
            )
            return self._unauthorized("Invalid authentication token")

        user_profile = await self._fetch_supabase_user(token)
        if user_profile is None:
            logger.warning(
                "Auth failure: Supabase user lookup failed for request %s %s (token preview=%s)",
                request.method,
                request.url.path,
                self._safe_token_preview(token),
            )
            return self._unauthorized("Supabase user not found or inactive")

        logger.debug(
            "Auth success: user %s authenticated for request %s %s",
            user_profile.get("id"),
            request.method,
            request.url.path,
        )
        request.state.supabase_user = user_profile
        request.state.supabase_claims = payload
        context_token = _auth_context_var.set(
            SupabaseAuthContext(user=user_profile, claims=payload)
        )
        try:
            return await call_next(request)
        finally:
            _auth_context_var.reset(context_token)

    async def _validate_jwt(self, token: str) -> Optional[dict]:
        try:
            header = get_unverified_header(token)
        except InvalidTokenError as exc:
            logger.warning(
                "Auth failure: unable to parse JWT header (token preview=%s, error=%s)",
                self._safe_token_preview(token),
                exc,
            )
            return None

        algorithm = header.get("alg")
        if not algorithm:
            logger.warning(
                "Auth failure: JWT missing algorithm (token preview=%s)",
                self._safe_token_preview(token),
            )
            return None

        if not algorithm.startswith("HS"):
            logger.error(
                "Auth failure: unsupported JWT algorithm %s (token preview=%s)",
                algorithm,
                self._safe_token_preview(token),
            )
            return None

        return self._decode_hs_token(token, algorithm)

    def _decode_hs_token(self, token: str, algorithm: str) -> Optional[dict]:
        if not self.supabase_jwt_secret:
            logger.error(
                "Auth failure: JWT uses %s but SUPABASE_JWT_SECRET is not configured",
                algorithm,
            )
            return None

        try:
            return jwt_decode(
                token,
                self.supabase_jwt_secret,
                algorithms=[algorithm],
                audience=list(self.required_audiences) if self.required_audiences else None,
                issuer=self.issuer,
                options={"verify_aud": self.required_audiences is not None},
            )
        except InvalidTokenError as exc:
            logger.warning(
                "Auth failure: JWT decode error '%s' for HMAC key (token preview=%s)",
                exc,
                self._safe_token_preview(token),
            )
            return None

    async def _fetch_supabase_user(self, token: str) -> Optional[dict]:
        url = f"{self.supabase_url}/auth/v1/user"
        headers = {"Authorization": f"Bearer {token}"}
        if self.supabase_api_key:
            headers["apikey"] = self.supabase_api_key
        try:
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                response = await client.get(url, headers=headers)
        except httpx.HTTPError as exc:
            logger.error(
                "Auth failure: HTTP error when fetching user %s",
                exc,
                exc_info=True,
            )
            return None

        if response.status_code != status.HTTP_200_OK:
            logger.warning(
                "Auth failure: Supabase /user returned status %s (token preview=%s, body=%s)",
                response.status_code,
                self._safe_token_preview(token),
                response.text,
            )
            return None

        user_payload = response.json()
        if not user_payload or "id" not in user_payload:
            logger.warning(
                "Auth failure: Supabase /user response missing id (token preview=%s, body=%s)",
                self._safe_token_preview(token),
                response.text,
            )
            return None

        logger.debug(
            "Supabase user lookup succeeded for user %s", user_payload.get("id")
        )
        return user_payload

    @staticmethod
    def _extract_bearer_token(request: Request) -> Optional[str]:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        token = auth_header.split(" ", 1)[1].strip()
        return token or None

    @staticmethod
    def _unauthorized(detail: str) -> Response:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": detail},
            headers={"WWW-Authenticate": "Bearer"},
        )

    @staticmethod
    def _safe_token_preview(token: str) -> str:
        if not token:
            return "<empty>"
        visible = token[:8]
        hidden_length = max(len(token) - len(visible), 0)
        return f"{visible}...(+{hidden_length} chars)"
