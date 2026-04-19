"""
Populate world_stocks with S&P 500 and Nasdaq-100 constituents.

- Fetches both lists from Wikipedia
- Inserts missing stocks
- Updates `indices` array for every constituent
- Crawls logo_url (Phase 1) for any stock in either index without one
- Downloads logo_svg (Phase 2) for any stock with a logo_url but no SVG
"""

import asyncio
import sys
import os
import re
import urllib.request
import aiohttp

# Works when run from repo root (python3 backend/scripts/...) or from backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ─── Wikipedia scrapers ──────────────────────────────────────────────────────

def _fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=15).read().decode("utf-8")


def fetch_sp500() -> list[dict]:
    """Return list of {ticker, company_name, sector} for S&P 500 constituents."""
    html = _fetch_html("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies")
    # The main table starts right after the first wikitable
    tables = re.findall(r'<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>(.*?)</table>', html, re.DOTALL)
    if not tables:
        raise RuntimeError("S&P 500 table not found")
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', tables[0], re.DOTALL)
    stocks = []
    for row in rows[1:]:
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
        if len(cells) < 2:
            continue
        ticker = re.sub(r'<[^>]+>', '', cells[0]).strip().replace('\n', '').replace('\xa0', '')
        company = re.sub(r'<[^>]+>', '', cells[1]).strip().replace('\n', '')
        sector = re.sub(r'<[^>]+>', '', cells[2]).strip() if len(cells) > 2 else ""
        if ticker and re.match(r'^[A-Z]{1,5}(-[A-Z])?$', ticker):
            stocks.append({"ticker": ticker, "company_name": company, "sector": sector})
    return stocks


def fetch_nasdaq100() -> list[dict]:
    """Return list of {ticker, company_name} for Nasdaq-100 constituents."""
    html = _fetch_html("https://en.wikipedia.org/wiki/Nasdaq-100")
    section_idx = html.find('id="Current_components"')
    if section_idx == -1:
        section_idx = html.find('Current components')
    table_start = html.find('<table', section_idx)
    table_end = html.find('</table>', table_start) + 8
    table_html = html[table_start:table_end]
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, re.DOTALL)
    stocks = []
    for row in rows[1:]:
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
        if not cells:
            continue
        ticker = re.sub(r'<[^>]+>', '', cells[0]).strip()
        company = re.sub(r'<[^>]+>', '', cells[1]).strip() if len(cells) > 1 else ""
        if ticker and re.match(r'^[A-Z]{1,5}$', ticker):
            stocks.append({"ticker": ticker, "company_name": company})
    return stocks


# ─── Logo crawl helpers ───────────────────────────────────────────────────────

_TV_EXCHANGE_ORDER = ['NASDAQ', 'NYSE', 'AMEX', 'ARCA']
_TV_BASE = "https://s3-symbol-logo.tradingview.com"


async def try_direct_svg(session: aiohttp.ClientSession, ticker: str) -> str | None:
    """Try common slug patterns directly against the TradingView S3 bucket."""
    name_lower = ticker.lower()
    # Generate candidate slugs
    candidates = [
        name_lower,
        name_lower.replace('.', '-'),
    ]
    for slug in candidates:
        url = f"{_TV_BASE}/{slug}--big.svg"
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    content = await resp.read()
                    if b'<svg' in content[:200] or b'svg' in content[:200]:
                        return url
        except Exception:
            pass
    return None


async def crawl_logo_url(crawler, session: aiohttp.ClientSession, ticker: str) -> str | None:
    """Try crawler exchange fallback, then direct S3 guess."""
    for exchange in _TV_EXCHANGE_ORDER:
        url = await crawler.fetch_tradingview_logo_url(ticker, exchange)
        if url:
            return url
    return await try_direct_svg(session, ticker)


# ─── Main ────────────────────────────────────────────────────────────────────

async def main():
    from app.core.database import engine
    from sqlalchemy import text
    from app.services.world_stock_logo_crawler_service import WorldStockLogoCrawlerService

    print("=== Fetching S&P 500 from Wikipedia ===")
    sp500 = fetch_sp500()
    print(f"  {len(sp500)} stocks")

    print("=== Fetching Nasdaq-100 from Wikipedia ===")
    nasdaq100 = fetch_nasdaq100()
    print(f"  {len(nasdaq100)} stocks")

    # Build lookup maps
    sp500_map = {s["ticker"]: s for s in sp500}
    nasdaq_map = {s["ticker"]: s for s in nasdaq100}
    all_tickers = set(sp500_map) | set(nasdaq_map)

    print(f"\n=== Upserting {len(all_tickers)} stocks into world_stocks ===")

    with engine.connect() as conn:
        for ticker in sorted(all_tickers):
            info = sp500_map.get(ticker) or nasdaq_map.get(ticker)
            company = info.get("company_name", "")
            sector = info.get("sector", "") if ticker in sp500_map else ""

            # Build indices array
            indices = []
            if ticker in sp500_map:
                indices.append("sp500")
            if ticker in nasdaq_map:
                indices.append("nasdaq100")

            # Determine exchange hint
            exchange = "NASDAQ" if ticker in nasdaq_map else "NYSE"

            conn.execute(text("""
                INSERT INTO world_stocks (ticker, company_name, sector, exchange, country, currency, indices)
                VALUES (:ticker, :company_name, :sector, :exchange, 'US', 'USD', :indices)
                ON CONFLICT (ticker, exchange) DO UPDATE
                  SET company_name = COALESCE(EXCLUDED.company_name, world_stocks.company_name),
                      sector       = COALESCE(NULLIF(EXCLUDED.sector, ''), world_stocks.sector),
                      indices      = EXCLUDED.indices
            """), {
                "ticker": ticker,
                "company_name": company,
                "sector": sector,
                "exchange": exchange,
                "indices": indices,
            })

        conn.commit()
    print("  Done.")

    # ── Stats ──────────────────────────────────────────────────────────────
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE 'sp500'    = ANY(indices)) AS sp500_count,
                COUNT(*) FILTER (WHERE 'nasdaq100' = ANY(indices)) AS nasdaq_count,
                COUNT(*) FILTER (WHERE logo_url IS NOT NULL)       AS with_url,
                COUNT(*) FILTER (WHERE logo_svg IS NOT NULL)       AS with_svg,
                COUNT(*)                                           AS total
            FROM world_stocks
            WHERE indices IS NOT NULL AND array_length(indices, 1) > 0
        """)).fetchone()
        print(f"\n=== Index-member stock stats ===")
        print(f"  sp500={row[0]}, nasdaq100={row[1]}, total={row[4]}")
        print(f"  logo_url: {row[2]}/{row[4]} ({100*row[2]//row[4]}%)")
        print(f"  logo_svg: {row[3]}/{row[4]} ({100*row[3]//row[4]}%)")

        # Stocks needing a logo_url
        missing_url = conn.execute(text("""
            SELECT ticker, exchange
            FROM world_stocks
            WHERE (indices IS NOT NULL AND array_length(indices, 1) > 0)
              AND (logo_url IS NULL OR logo_url = '')
            ORDER BY ticker
        """)).fetchall()

    print(f"\n=== Crawling logo URLs for {len(missing_url)} index stocks ===")

    async with WorldStockLogoCrawlerService() as crawler:
        async with aiohttp.ClientSession() as session:
            succeeded = 0
            for i, (ticker, exchange) in enumerate(missing_url):
                url = await crawl_logo_url(crawler, session, ticker)
                if url:
                    with engine.connect() as conn:
                        conn.execute(text(
                            "UPDATE world_stocks SET logo_url = :url WHERE ticker = :ticker"
                        ), {"url": url, "ticker": ticker})
                        conn.commit()
                    succeeded += 1
                    print(f"  [{i+1}/{len(missing_url)}] {ticker}: {url[len(_TV_BASE)+1:50]}")
                else:
                    print(f"  [{i+1}/{len(missing_url)}] {ticker}: NOT FOUND")

            print(f"\n  logo_url crawl: {succeeded}/{len(missing_url)} found")

    # ── Phase 2: download SVGs ────────────────────────────────────────────
    print("\n=== Downloading SVGs (Phase 2) for index stocks ===")
    async with WorldStockLogoCrawlerService() as crawler:
        result = await crawler.populate_logo_svg_from_logo_urls_for_all(
            batch_size=10, only_missing=True
        )
    print(f"  SVG download: {result}")

    # ── Final stats ───────────────────────────────────────────────────────
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE logo_url IS NOT NULL) AS with_url,
                COUNT(*) FILTER (WHERE logo_svg IS NOT NULL) AS with_svg,
                COUNT(*) AS total
            FROM world_stocks
            WHERE indices IS NOT NULL AND array_length(indices, 1) > 0
        """)).fetchone()
        print(f"\n=== Final coverage for index stocks ===")
        print(f"  logo_url: {row[0]}/{row[2]} ({100*row[0]//row[2] if row[2] else 0}%)")
        print(f"  logo_svg: {row[1]}/{row[2]} ({100*row[1]//row[2] if row[2] else 0}%)")


if __name__ == "__main__":
    asyncio.run(main())
