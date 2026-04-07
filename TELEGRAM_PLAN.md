# Telegram News Feed — Implementation Plan

## Feature Overview

Scrape messages from public Telegram financial news channels and surface them inside the app as a
reusable `TelegramNewsFeed` component.

The component appears in **two contexts with different filters**:

| Location | Filter | Title |
|----------|--------|-------|
| Dashboard | All subscribed channels, latest posts | "Market News" |
| Stock detail page (`/stock/[ticker]`, `/stock/il/[symbol]`) | Messages that mention the ticker symbol | "News & Mentions" |

Users choose which channels to follow. Admins manage which channels exist.

---

## Architecture

**Approach: Backend polling via Telethon (MTProto client)**
- Telethon authenticates as a Telegram *user* (not a bot), reads any public channel
- A background job polls channels every 15 minutes, stores posts in DB
- Frontend calls our own API — no Telegram calls from the browser
- Session is pre-generated once as a string, stored in `.env` — no interactive login at runtime

---

## Database Schema

### `telegram_channels`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| username | String(100) unique | without @ |
| title | String(255) | fetched from Telegram |
| description | Text nullable | |
| logo_url | String nullable | channel photo |
| language | String(5) | `"he"` / `"en"` |
| category | String(50) | `"general"` / `"crypto"` / `"forex"` / `"stocks"` / `"analysis"` |
| is_active | Boolean default True | |
| subscriber_count | Integer nullable | |
| last_synced_at | DateTime nullable | |
| created_at | DateTime | |

### `user_telegram_subscriptions`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | String FK → users.id | |
| channel_id | Integer FK → telegram_channels.id | |
| created_at | DateTime | |
| UNIQUE(user_id, channel_id) | | |

### `telegram_messages`
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| channel_id | Integer FK → telegram_channels.id | |
| message_id | Integer | Telegram's internal id |
| text | Text nullable | |
| media_url | String nullable | image URL if present (Telegram CDN) |
| posted_at | DateTime | original timestamp |
| created_at | DateTime | |
| UNIQUE(channel_id, message_id) | | |

Retention: 30 days. Nightly cleanup job removes older rows.

---

## Backend Work — Claude owns

### Step 1 — Models + Migration
- `backend/app/models/telegram_models.py` — all three SQLAlchemy models
- `backend/alembic/versions/YYYY-add_telegram_tables.py` — migration

### Step 2 — Telegram Service (Telethon)
**`backend/app/services/telegram_service.py`**

```python
# Env vars needed:
# TELEGRAM_API_ID=<number from my.telegram.org>
# TELEGRAM_API_HASH=<string from my.telegram.org>
# TELEGRAM_SESSION_STRING=<generated once via generate_session.py>
```

Functions:
- `get_client()` → authenticated Telethon `TelegramClient` (using StringSession)
- `fetch_channel_meta(username)` → title, description, subscriber_count, logo_url
- `fetch_recent_messages(username, limit=100)` → list of `{message_id, text, media_url, posted_at}`
- `sync_channel(channel_id, db)` → upsert messages (INSERT OR IGNORE on unique)
- `sync_all_active_channels(db)` → loop active channels with ≥1 subscriber

**`backend/scripts/generate_session.py`** — one-time interactive script to produce `TELEGRAM_SESSION_STRING`

### Step 3 — Background Sync Task
**`backend/app/tasks/fetch_telegram.py`**
- Runs every 15 minutes
- Only syncs channels where at least one user is subscribed
- Prunes messages older than 30 days
- Wired into app startup scheduler (same pattern as `fetch_stock_prices.py`)

### Step 4 — API Endpoints
**`backend/app/api/v1/endpoints/telegram.py`**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/telegram/channels` | user | All active channels + `is_subscribed` flag |
| POST | `/telegram/subscriptions/{channel_id}` | user | Subscribe |
| DELETE | `/telegram/subscriptions/{channel_id}` | user | Unsubscribe |
| GET | `/telegram/feed` | user | Paginated feed from subscribed channels |
| GET | `/telegram/feed?ticker=AAPL` | user | Feed filtered to messages mentioning ticker |
| GET | `/telegram/feed?channel_id=X` | user | Feed filtered to one channel |
| POST | `/admin/telegram/channels` | admin | Add channel (triggers meta fetch) |
| PATCH | `/admin/telegram/channels/{id}` | admin | Edit channel (active, category, language) |
| POST | `/admin/telegram/channels/{id}/sync` | admin | Force sync now |

**Feed query logic for `?ticker=AAPL`:**
```sql
WHERE LOWER(text) LIKE '%aapl%'
   OR LOWER(text) LIKE '%apple%'
```
(backend accepts optional `search_terms` list for richer matching later)

**Feed response:**
```json
{
  "items": [
    {
      "id": 1,
      "channel": { "id": 3, "username": "financialnewsil", "title": "פיננסי IL", "logo_url": "...", "category": "general" },
      "text": "Apple beats earnings...",
      "media_url": "https://cdn4.telegram.org/...",
      "posted_at": "2026-04-06T10:32:00Z"
    }
  ],
  "total": 120,
  "page": 1,
  "page_size": 20
}
```

### Step 5 — Register router + env vars

**`backend/app/api/v1/api.py`** — add `telegram.router`

**`.env` additions:**
```
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_SESSION_STRING=
```

### Step 6 — Pre-seed channels
Initial channels in the migration (or a seed script) — to be replaced with real ones:
- `financialmindset` (en, general)
- `investing_il` (he, general)
- `cryptonews_il` (he, crypto)

---

## Frontend Work — Gemini owns

### Reusable component: `src/components/telegram/TelegramNewsFeed.tsx`

**Props:**
```typescript
interface TelegramNewsFeedProps {
  ticker?: string;        // if provided → filters feed to messages mentioning this symbol
  compact?: boolean;      // true = show max 3 items, no channel management sidebar
  showChannelManager?: boolean;  // true = show subscribe/unsubscribe sidebar (Dashboard only)
}
```

**Full mode** (Dashboard — `showChannelManager=true`):
```
┌─────────────────────────────────────────────────────┐
│  Market News                  [All ▾] [Category ▾]  │
├──────────────────────────────┬──────────────────────┤
│  Feed (posts)                │  Channels sidebar    │
│  ┌──────────────────────┐   │  ┌──────────────────┐│
│  │ 🖼 Channel · 2h ago  │   │  │ Channel name     ││
│  │ Post text (3 lines)  │   │  │ language · cat   ││
│  │ [image if present]   │   │  │ [Following ✓]    ││
│  └──────────────────────┘   │  └──────────────────┘│
│  [Load more]                 │  × N channels        │
└──────────────────────────────┴──────────────────────┘
```

**Compact mode** (Stock page — `ticker="AAPL"`):
```
┌────────────────────────────────────────┐
│  News & Mentions for AAPL              │
│  ┌──────────────────────────────────┐ │
│  │ 🖼 Channel · 2h ago              │ │
│  │ "Apple beats earnings..."        │ │
│  └──────────────────────────────────┘ │
│  (3 items, no sidebar, no filters)     │
│  [See all news →]                      │
└────────────────────────────────────────┘
```

### Sub-components:
- `src/components/telegram/NewsFeedCard.tsx` — single post: channel logo (circle) + name + relative time + text (3-line clamp, "Read more" toggle) + image if `media_url`
- `src/components/telegram/ChannelCard.tsx` — channel in sidebar: logo + title + language badge + "Follow" / "Following" button
- `src/components/telegram/ChannelFilterBar.tsx` — "All channels" dropdown + category filter (shown in full mode only)

### Placement:

**Dashboard (`src/app/page.tsx` or Dashboard component):**
```tsx
<TelegramNewsFeed showChannelManager={true} />
```
Place below the existing metrics/holdings section.

**Stock pages (`src/app/stock/[ticker]/page.tsx` and `src/app/stock/il/[symbol]/page.tsx`):**
```tsx
<TelegramNewsFeed ticker={ticker} compact={true} />
```
Place below the bottom 3-column grid (below transactions/dividends).

### `src/services/api.ts` additions (Gemini):
```typescript
export const telegramAPI = {
  getChannels: () => api.get('/telegram/channels'),
  subscribe: (channelId: number) => api.post(`/telegram/subscriptions/${channelId}`),
  unsubscribe: (channelId: number) => api.delete(`/telegram/subscriptions/${channelId}`),
  getFeed: (params?: { ticker?: string; channel_id?: number; page?: number; page_size?: number }) =>
    api.get('/telegram/feed', { params }),
};
```

### Navigation additions (Gemini):
- `Sidebar.tsx` — NOT a separate nav item (it's embedded in Dashboard/Stock)
- No new page needed — the component lives inside existing pages

---

## Parallel Work Split

### Claude does first:
1. Models + migration (need user's Telegram credentials to complete Step 2)
2. API endpoints (can build without credentials, just mocked sync)
3. Background task skeleton
4. Session generation script + instructions

### Gemini does after:
1. `TelegramNewsFeed` component + sub-components
2. Wire into Dashboard and both stock pages
3. `telegramAPI` in `api.ts`

---

## Pending: Credentials

Once you get `api_id` and `api_hash` from my.telegram.org:
1. Share them with me
2. I'll run the one-time `generate_session.py` script to produce `TELEGRAM_SESSION_STRING`
3. Add all three to `.env`
4. Background sync becomes live

---

## File Ownership

| File | Owner |
|------|-------|
| `backend/app/models/telegram_models.py` | Claude |
| `backend/alembic/versions/*telegram*` | Claude |
| `backend/app/services/telegram_service.py` | Claude |
| `backend/app/tasks/fetch_telegram.py` | Claude |
| `backend/app/api/v1/endpoints/telegram.py` | Claude |
| `backend/scripts/generate_session.py` | Claude |
| `frontend/src/components/telegram/*.tsx` | Gemini |
| `frontend/src/services/api.ts` (telegramAPI) | Gemini |
| Dashboard page / Stock pages wiring | Gemini |

---

## Status

- [ ] User provides: Telegram API credentials (api_id + api_hash)
- [ ] Claude: Models + migration
- [ ] Claude: API endpoints (channels, subscriptions, feed)
- [ ] Claude: telegram_service.py skeleton + generate_session.py
- [ ] Claude: Background sync task
- [ ] User: run generate_session.py, add session string to .env
- [ ] Gemini: TelegramNewsFeed component + sub-components
- [ ] Gemini: Wire into Dashboard + stock pages
- [ ] Gemini: telegramAPI in api.ts
