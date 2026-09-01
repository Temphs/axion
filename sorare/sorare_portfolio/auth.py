"""Sorare authentication.

Flow, exactly as documented by Sorare:
  1. GET /api/v1/users/<email>  -> bcrypt salt
  2. bcrypt-hash the password locally with that salt
  3. signIn mutation -> JWT (valid 30 days), or an OTP challenge if 2FA is on
  4. cache the JWT so scheduled runs never need the password again

The plaintext password is read from the environment, used once, and never
written to disk. The cached token file is created with owner-only permissions.
"""

from __future__ import annotations

import getpass
import json
import os
import stat
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
import requests

from .paths import TOKEN_FILE, ensure_dirs

API_URL = "https://api.sorare.com/graphql"
SALT_URL = "https://api.sorare.com/api/v1/users/{email}"

SIGN_IN_MUTATION = """
mutation SignInMutation($input: signInInput!, $aud: String!) {
  signIn(input: $input) {
    currentUser { slug }
    jwtToken(aud: $aud) { token expiredAt }
    otpSessionChallenge
    tcuToken
    errors { message }
  }
}
"""


class AuthError(RuntimeError):
    pass


@dataclass
class Credentials:
    token: str
    aud: str
    expires_at: datetime
    user_slug: str
    api_key: str | None = None

    @property
    def is_fresh(self) -> bool:
        # Renew a day early rather than let a scheduled run fail at the edge.
        return self.expires_at - timedelta(days=1) > datetime.now(timezone.utc)

    def headers(self) -> dict[str, str]:
        headers = {
            "content-type": "application/json",
            "Authorization": f"Bearer {self.token}",
            "JWT-AUD": self.aud,
        }
        if self.api_key:
            headers["APIKEY"] = self.api_key
        return headers


def _read_cached(aud: str, api_key: str | None) -> Credentials | None:
    if not TOKEN_FILE.exists():
        return None
    try:
        raw = json.loads(TOKEN_FILE.read_text(encoding="utf-8"))
        creds = Credentials(
            token=raw["token"],
            aud=raw["aud"],
            expires_at=datetime.fromisoformat(raw["expires_at"]),
            user_slug=raw["user_slug"],
            api_key=api_key,
        )
    except (KeyError, ValueError, json.JSONDecodeError):
        return None
    if creds.aud != aud or not creds.is_fresh:
        return None
    return creds


def _write_cached(creds: Credentials) -> None:
    ensure_dirs()
    TOKEN_FILE.write_text(
        json.dumps(
            {
                "token": creds.token,
                "aud": creds.aud,
                "expires_at": creds.expires_at.isoformat(),
                "user_slug": creds.user_slug,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    try:
        TOKEN_FILE.chmod(stat.S_IRUSR | stat.S_IWUSR)
    except OSError:
        # Windows filesystems may refuse; the file still sits in a git-ignored
        # folder, so this is a hardening step, not a correctness one.
        pass


def hashed_password(email: str, password: str, session: requests.Session) -> str:
    response = session.get(SALT_URL.format(email=email), timeout=30)
    response.raise_for_status()
    salt = response.json().get("salt")
    if not salt:
        raise AuthError(
            "Sorare did not return a password salt for that email address. "
            "Check SORARE_EMAIL in your .env file."
        )
    return bcrypt.hashpw(password.encode("utf-8"), salt.encode("utf-8")).decode("utf-8")


def _sign_in(session: requests.Session, variables: dict, api_key: str | None) -> dict:
    headers = {"content-type": "application/json"}
    if api_key:
        headers["APIKEY"] = api_key
    response = session.post(
        API_URL,
        json={"operationName": "SignInMutation", "query": SIGN_IN_MUTATION, "variables": variables},
        headers=headers,
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("errors"):
        raise AuthError(f"signIn failed: {payload['errors']}")
    return payload["data"]["signIn"]


def sign_in(*, interactive: bool = True) -> Credentials:
    """Return valid credentials, from cache when possible."""
    email = os.environ.get("SORARE_EMAIL", "").strip()
    password = os.environ.get("SORARE_PASSWORD", "")
    aud = os.environ.get("SORARE_JWT_AUD", "sorare-portfolio-terminal").strip()
    api_key = os.environ.get("SORARE_API_KEY", "").strip() or None

    cached = _read_cached(aud, api_key)
    if cached:
        return cached

    if not email or not password:
        raise AuthError(
            "No valid cached token and SORARE_EMAIL / SORARE_PASSWORD are not set. "
            "Copy .env.example to .env and fill it in."
        )

    session = requests.Session()
    hashed = hashed_password(email, password, session)
    result = _sign_in(session, {"input": {"email": email, "password": hashed}, "aud": aud}, api_key)

    messages = [error["message"] for error in (result.get("errors") or [])]
    if any("must_accept_tcus" in message for message in messages) or result.get("tcuToken"):
        raise AuthError(
            "Sorare's Terms & Conditions have been updated. Log in at sorare.com once, "
            "accept them, then run the updater again."
        )
    if messages:
        raise AuthError(f"signIn rejected: {'; '.join(messages)}")

    challenge = result.get("otpSessionChallenge")
    if challenge:
        if not interactive:
            raise AuthError(
                "Two-factor authentication is required and this run is unattended. "
                "Run  update_sorare.bat  by hand once to refresh the 30-day token."
            )
        otp = getpass.getpass("Sorare 2FA code (from your app or email): ").strip()
        result = _sign_in(
            session,
            {"input": {"otpSessionChallenge": challenge, "otpAttempt": otp}, "aud": aud},
            api_key,
        )
        messages = [error["message"] for error in (result.get("errors") or [])]
        if messages:
            raise AuthError(f"Two-factor sign-in rejected: {'; '.join(messages)}")

    jwt = result.get("jwtToken") or {}
    user = result.get("currentUser") or {}
    if not jwt.get("token"):
        raise AuthError("Sorare returned no JWT token. Check your credentials and try again.")

    creds = Credentials(
        token=jwt["token"],
        aud=aud,
        expires_at=datetime.fromisoformat(jwt["expiredAt"].replace("Z", "+00:00")),
        user_slug=user.get("slug", ""),
        api_key=api_key,
    )
    _write_cached(creds)
    return creds
