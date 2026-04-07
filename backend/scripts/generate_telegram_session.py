#!/opt/homebrew/bin/python3.11
"""
One-time script to generate a Telethon StringSession.

Run this ONCE locally:
    python backend/scripts/generate_telegram_session.py

It will prompt you for your phone number and Telegram login code,
then print the session string. Copy it into:
  - backend/.env  →  TELEGRAM_SESSION_STRING=<paste here>
  - Railway environment variables  →  TELEGRAM_SESSION_STRING=<paste here>

The session string is a base64-encoded auth token. Treat it like a password.
"""

import asyncio
import os
import sys

# Allow running from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from telethon import TelegramClient
from telethon.sessions import StringSession

API_ID = 32374996
API_HASH = "d3b72daccfa00089902b6f69037b3f2f"


async def main():
    print("=" * 60)
    print("Telegram Session Generator for Investracker")
    print("=" * 60)
    print()
    print("This will log into your personal Telegram account.")
    print("A session string will be printed — keep it secret.\n")

    client = TelegramClient(StringSession(), API_ID, API_HASH)

    await client.start()

    session_string = client.session.save()

    print("\n" + "=" * 60)
    print("SESSION STRING (copy this into .env and Railway):")
    print("=" * 60)
    print(f"\nTELEGRAM_SESSION_STRING={session_string}\n")
    print("=" * 60)

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
