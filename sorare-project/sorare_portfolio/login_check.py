"""Work out exactly why a sign-in is being rejected.

"invalid" from Sorare means the email and password together were not accepted,
which has several quite different causes. This walks the same three steps the
updater takes and reports which one broke, without ever printing the password.
"""

from __future__ import annotations

import os

import requests

from .auth import SALT_URL, API_URL, SIGN_IN_MUTATION, hashed_password
from .paths import ENV_FILE, TOKEN_FILE


def _describe(value: str) -> str:
    """Say enough about a secret to spot a paste mistake, never enough to leak it."""
    notes = [f"{len(value)} characters"]
    if value != value.strip():
        notes.append("has leading or trailing spaces")
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        notes.append("looks wrapped in quotes")
    if value.startswith("<") or value.endswith(">"):
        notes.append("still looks like a placeholder")
    return ", ".join(notes)


def run_check() -> int:
    print("Sign-in check")
    print("=" * 60)

    if not ENV_FILE.exists():
        print(f"FAIL  No .env file at {ENV_FILE}")
        print("      Double-click edit_settings.bat to create it.")
        return 2
    print(f"OK    Found {ENV_FILE}")

    email = os.environ.get("SORARE_EMAIL", "")
    password = os.environ.get("SORARE_PASSWORD", "")
    if not email or not password:
        print("FAIL  SORARE_EMAIL or SORARE_PASSWORD is empty in .env")
        return 2
    print(f"OK    Email:    {email}")
    print(f"OK    Password: {_describe(password)}")
    if email != email.strip() or " " in email:
        print("WARN  The email has spaces in it, which Sorare will not match.")

    session = requests.Session()
    print()
    print("Step 1 of 2: asking Sorare for this account's password salt ...")
    response = session.get(SALT_URL.format(email=email.strip()), timeout=30)
    if response.status_code != 200:
        print(f"FAIL  Sorare answered {response.status_code} for that email address.")
        print("      That means Sorare has no account under this email, so the address")
        print("      in .env is wrong - check it against the one you log in with.")
        return 2

    salt = (response.json() or {}).get("salt")
    if not salt:
        print("FAIL  Sorare returned no salt for that email.")
        print("      This normally means the account signs in with Google or Apple")
        print("      rather than a Sorare password. See the note at the end.")
        return 2
    print("OK    Sorare knows this email and returned a salt.")

    print()
    print("Step 2 of 2: signing in ...")
    hashed = hashed_password(email.strip(), password, session)
    payload = {
        "operationName": "SignInMutation",
        "query": SIGN_IN_MUTATION,
        "variables": {
            "input": {"email": email.strip(), "password": hashed},
            "aud": os.environ.get("SORARE_JWT_AUD", "sorare-portfolio-terminal"),
        },
    }
    headers = {"content-type": "application/json"}
    api_key = os.environ.get("SORARE_API_KEY", "").strip()
    if api_key:
        headers["APIKEY"] = api_key
        print(f"OK    Using an API key ({len(api_key)} characters).")

    result = session.post(API_URL, json=payload, headers=headers, timeout=60).json()
    sign_in = (result.get("data") or {}).get("signIn") or {}
    errors = [error.get("message") for error in (sign_in.get("errors") or [])]

    if sign_in.get("otpSessionChallenge"):
        print("OK    Password accepted - the account has two-factor authentication on.")
        print("      Run update_sorare.bat and type the code when it asks.")
        return 0
    if sign_in.get("jwtToken"):
        print("OK    Signed in successfully. Run update_sorare.bat.")
        return 0

    print(f"FAIL  Sorare rejected the sign-in: {', '.join(errors) or result}")
    print()
    print("The three things that cause this, in order of likelihood:")
    print("  1. The password in .env is not the one for this account. Retype it")
    print("     rather than pasting - a trailing space or a smart quote is enough.")
    print("  2. The account signs in with Google or Apple, so it has no Sorare")
    print("     password. Fix: log in at sorare.com, go to Settings, and set a")
    print("     password on the account - then put that one in .env.")
    print("  3. The email belongs to a different account than the cards do.")
    print()
    print(f"Nothing was changed. Your token cache is at {TOKEN_FILE}")
    return 2
