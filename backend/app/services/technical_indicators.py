"""
Technical indicator engine — pure Python over daily closes from the
stock_price_history cache.

All functions take a list of closes (oldest → newest) and return a list of the
same length, with None for warm-up rows where the indicator is not yet defined.

Signal classifiers interpret the LATEST values into
bullish / bearish / neutral states with short human-readable text, so the UI
can render a signal strip without re-implementing the rules.
"""
import math
from typing import Optional


# ── Core indicator math ────────────────────────────────────────────────────────

def sma(closes: list[float], n: int) -> list[Optional[float]]:
    out: list[Optional[float]] = [None] * len(closes)
    if len(closes) < n:
        return out
    window_sum = sum(closes[:n])
    out[n - 1] = window_sum / n
    for i in range(n, len(closes)):
        window_sum += closes[i] - closes[i - n]
        out[i] = window_sum / n
    return out


def ema(closes: list[float], n: int) -> list[Optional[float]]:
    out: list[Optional[float]] = [None] * len(closes)
    if len(closes) < n:
        return out
    alpha = 2.0 / (n + 1)
    prev = sum(closes[:n]) / n          # seed with SMA of the first window
    out[n - 1] = prev
    for i in range(n, len(closes)):
        prev = closes[i] * alpha + prev * (1 - alpha)
        out[i] = prev
    return out


def rsi(closes: list[float], n: int = 14) -> list[Optional[float]]:
    """Wilder's RSI — matches TradingView/broker values."""
    out: list[Optional[float]] = [None] * len(closes)
    if len(closes) <= n:
        return out
    gains = losses = 0.0
    for i in range(1, n + 1):
        change = closes[i] - closes[i - 1]
        if change >= 0:
            gains += change
        else:
            losses -= change
    avg_gain, avg_loss = gains / n, losses / n

    def _rsi(g: float, l: float) -> float:
        if l == 0:
            return 100.0
        rs = g / l
        return 100.0 - 100.0 / (1.0 + rs)

    out[n] = _rsi(avg_gain, avg_loss)
    for i in range(n + 1, len(closes)):
        change = closes[i] - closes[i - 1]
        gain = max(change, 0.0)
        loss = max(-change, 0.0)
        avg_gain = (avg_gain * (n - 1) + gain) / n     # Wilder smoothing
        avg_loss = (avg_loss * (n - 1) + loss) / n
        out[i] = _rsi(avg_gain, avg_loss)
    return out


def macd(
    closes: list[float], fast: int = 12, slow: int = 26, signal_n: int = 9
) -> tuple[list[Optional[float]], list[Optional[float]], list[Optional[float]]]:
    """Returns (macd_line, signal_line, histogram)."""
    ema_fast = ema(closes, fast)
    ema_slow = ema(closes, slow)
    macd_line: list[Optional[float]] = [
        (f - s) if f is not None and s is not None else None
        for f, s in zip(ema_fast, ema_slow)
    ]
    # Signal = EMA(9) of the macd line, seeded once enough values exist
    signal_line: list[Optional[float]] = [None] * len(closes)
    valid_idx = [i for i, v in enumerate(macd_line) if v is not None]
    if len(valid_idx) >= signal_n:
        alpha = 2.0 / (signal_n + 1)
        seed_end = valid_idx[signal_n - 1]
        prev = sum(macd_line[i] for i in valid_idx[:signal_n]) / signal_n
        signal_line[seed_end] = prev
        for i in valid_idx[signal_n:]:
            prev = macd_line[i] * alpha + prev * (1 - alpha)
            signal_line[i] = prev
    hist: list[Optional[float]] = [
        (m - s) if m is not None and s is not None else None
        for m, s in zip(macd_line, signal_line)
    ]
    return macd_line, signal_line, hist


def bollinger(
    closes: list[float], n: int = 20, k: float = 2.0
) -> tuple[list[Optional[float]], list[Optional[float]], list[Optional[float]]]:
    """Returns (upper, mid, lower)."""
    mid = sma(closes, n)
    upper: list[Optional[float]] = [None] * len(closes)
    lower: list[Optional[float]] = [None] * len(closes)
    for i in range(n - 1, len(closes)):
        window = closes[i - n + 1: i + 1]
        m = mid[i]
        var = sum((c - m) ** 2 for c in window) / n
        sd = math.sqrt(var)
        upper[i] = m + k * sd
        lower[i] = m - k * sd
    return upper, mid, lower


# ── Signal classification (latest-point interpretation) ───────────────────────

def _pct(a: float, b: float) -> float:
    return (a / b - 1) * 100 if b else 0.0


def build_signals(
    closes: list[float],
    sma50: list[Optional[float]],
    sma150: list[Optional[float]],
    sma200: list[Optional[float]],
    rsi_series: list[Optional[float]],
    macd_line: list[Optional[float]],
    signal_line: list[Optional[float]],
    bb_upper: list[Optional[float]],
    bb_lower: list[Optional[float]],
    high_52w: Optional[float],
    low_52w: Optional[float],
) -> list[dict]:
    """One entry per indicator: {id, label, state, detail}."""
    i = len(closes) - 1
    price = closes[i]
    signals: list[dict] = []

    def add(sig_id: str, label: str, state: str, detail: str):
        signals.append({"id": sig_id, "label": label, "state": state, "detail": detail})

    # Trend vs SMA150 (the swing-trader trend line)
    if sma150[i] is not None:
        above = price > sma150[i]
        add(
            "sma150", "SMA 150",
            "bullish" if above else "bearish",
            f"Price {_pct(price, sma150[i]):+.1f}% {'above' if above else 'below'} the 150-day average — "
            f"{'uptrend intact' if above else 'trend broken'}",
        )
    else:
        add("sma150", "SMA 150", "neutral", "Not enough history for the 150-day average")

    # Golden / death cross
    if sma50[i] is not None and sma200[i] is not None:
        golden = sma50[i] > sma200[i]
        # Detect recent cross (within ~10 trading days)
        crossed_recently = False
        for j in range(max(0, i - 10), i):
            if sma50[j] is not None and sma200[j] is not None:
                if (sma50[j] > sma200[j]) != golden:
                    crossed_recently = True
                    break
        detail = (
            f"50-day {'above' if golden else 'below'} 200-day"
            + (" — crossed within the last 2 weeks" if crossed_recently else "")
        )
        add("cross", "Golden/Death Cross", "bullish" if golden else "bearish", detail)
    else:
        add("cross", "Golden/Death Cross", "neutral", "Not enough history for the 200-day average")

    # RSI
    r = rsi_series[i]
    if r is not None:
        if r <= 30:
            add("rsi", "RSI (14)", "bullish", f"RSI {r:.0f} — oversold, potential entry zone")
        elif r >= 70:
            add("rsi", "RSI (14)", "bearish", f"RSI {r:.0f} — overbought, stretched")
        else:
            lean = "leaning bullish" if r > 50 else "leaning bearish"
            add("rsi", "RSI (14)", "neutral", f"RSI {r:.0f} — neutral zone, {lean}")
    else:
        add("rsi", "RSI (14)", "neutral", "Not enough history")

    # MACD
    m, s = macd_line[i], signal_line[i]
    if m is not None and s is not None:
        bull = m > s
        crossed_recently = False
        for j in range(max(0, i - 5), i):
            if macd_line[j] is not None and signal_line[j] is not None:
                if (macd_line[j] > signal_line[j]) != bull:
                    crossed_recently = True
                    break
        detail = (
            f"MACD {'above' if bull else 'below'} signal line"
            + (" — fresh crossover this week" if crossed_recently else "")
        )
        add("macd", "MACD", "bullish" if bull else "bearish", detail)
    else:
        add("macd", "MACD", "neutral", "Not enough history")

    # Bollinger position
    u, l = bb_upper[i], bb_lower[i]
    if u is not None and l is not None:
        if price <= l:
            add("bb", "Bollinger", "bullish", "Price at/below the lower band — statistically cheap vs recent range")
        elif price >= u:
            add("bb", "Bollinger", "bearish", "Price at/above the upper band — statistically stretched")
        else:
            pos = (price - l) / (u - l) * 100 if u > l else 50
            add("bb", "Bollinger", "neutral", f"Price at {pos:.0f}% of the band range")
    else:
        add("bb", "Bollinger", "neutral", "Not enough history")

    # 52-week levels
    if high_52w and low_52w:
        from_high = _pct(price, high_52w)
        from_low = _pct(price, low_52w)
        if from_high >= -2:
            add("levels", "52-Week Range", "bullish", f"At the 52-week high ({from_high:+.1f}%) — breakout territory")
        elif from_low <= 5:
            add("levels", "52-Week Range", "bearish", f"Near the 52-week low ({from_low:+.1f}% above)")
        else:
            add("levels", "52-Week Range", "neutral", f"{abs(from_high):.0f}% below 52w high, {from_low:.0f}% above 52w low")
    else:
        add("levels", "52-Week Range", "neutral", "Not enough history")

    return signals


# ── Phase 2: OHLCV-based indicators ───────────────────────────────────────────

def atr(
    highs: list[Optional[float]],
    lows: list[Optional[float]],
    closes: list[float],
    n: int = 14,
) -> list[Optional[float]]:
    """Wilder's Average True Range. Rows with missing high/low yield None
    (falls back to close-to-close range when only one side is missing)."""
    out: list[Optional[float]] = [None] * len(closes)
    trs: list[Optional[float]] = [None] * len(closes)
    for i in range(1, len(closes)):
        h = highs[i] if highs[i] is not None else closes[i]
        l = lows[i] if lows[i] is not None else closes[i]
        prev_c = closes[i - 1]
        trs[i] = max(h - l, abs(h - prev_c), abs(l - prev_c))
    valid = [i for i, v in enumerate(trs) if v is not None]
    if len(valid) < n:
        return out
    seed_idx = valid[n - 1]
    prev = sum(trs[i] for i in valid[:n]) / n
    out[seed_idx] = prev
    for i in valid[n:]:
        prev = (prev * (n - 1) + trs[i]) / n     # Wilder smoothing
        out[i] = prev
    return out


def obv(closes: list[float], volumes: list[Optional[float]]) -> list[Optional[float]]:
    """On-Balance Volume. None until the first row with volume data."""
    out: list[Optional[float]] = [None] * len(closes)
    running: Optional[float] = None
    for i in range(1, len(closes)):
        v = volumes[i]
        if v is None:
            continue
        if running is None:
            running = 0.0
        if closes[i] > closes[i - 1]:
            running += v
        elif closes[i] < closes[i - 1]:
            running -= v
        out[i] = running
    return out


def build_volume_signal(
    closes: list[float],
    volumes: list[Optional[float]],
    obv_series: list[Optional[float]],
) -> dict:
    """Volume confirmation: is the recent price move backed by volume?"""
    i = len(closes) - 1
    recent_vols = [v for v in volumes[-20:] if v is not None]
    if len(recent_vols) < 10 or volumes[i] is None:
        return {"id": "volume", "label": "Volume", "state": "neutral",
                "detail": "No volume data available"}

    avg_vol = sum(recent_vols) / len(recent_vols)
    vol_ratio = volumes[i] / avg_vol if avg_vol > 0 else 1.0

    # OBV trend over ~2 weeks vs price trend
    obv_vals = [(j, v) for j, v in enumerate(obv_series[-10:]) if v is not None]
    price_up = closes[i] > closes[max(0, i - 10)]
    obv_up = len(obv_vals) >= 2 and obv_vals[-1][1] > obv_vals[0][1]

    if price_up and obv_up:
        state, detail = "bullish", f"Rising price confirmed by volume flow (today {vol_ratio:.1f}× avg)"
    elif price_up and not obv_up:
        state, detail = "bearish", f"Price rising but volume flow falling — weak confirmation (today {vol_ratio:.1f}× avg)"
    elif not price_up and obv_up:
        state, detail = "bullish", f"Price falling but volume flow rising — possible accumulation (today {vol_ratio:.1f}× avg)"
    else:
        state, detail = "bearish", f"Falling price with falling volume flow (today {vol_ratio:.1f}× avg)"
    return {"id": "volume", "label": "Volume / OBV", "state": state, "detail": detail}


# ── Signal backtest: how did each signal historically play out on THIS stock ──

_FWD_DAYS = 21          # forward window ≈ one trading month
_MIN_EVENTS = 3         # don't show stats built on 1-2 occurrences


def _forward_stats(event_idx: list[int], closes: list[float]) -> Optional[dict]:
    """Avg forward return + win rate over _FWD_DAYS after each event index."""
    rets = []
    for i in event_idx:
        j = i + _FWD_DAYS
        if j < len(closes) and closes[i] > 0:
            rets.append(closes[j] / closes[i] - 1)
    if len(rets) < _MIN_EVENTS:
        return None
    wins = sum(1 for r in rets if r > 0)
    return {
        "events": len(rets),
        "avg_fwd_pct": round(sum(rets) / len(rets) * 100, 2),
        "win_rate_pct": round(wins / len(rets) * 100, 0),
        "fwd_days": _FWD_DAYS,
    }


def _cross_events(a: list[Optional[float]], b: list[Optional[float]], up: bool) -> list[int]:
    """Indexes where series a crosses above (up) / below (down) series b."""
    out = []
    for i in range(1, len(a)):
        if a[i] is None or b[i] is None or a[i - 1] is None or b[i - 1] is None:
            continue
        if up and a[i - 1] <= b[i - 1] and a[i] > b[i]:
            out.append(i)
        elif not up and a[i - 1] >= b[i - 1] and a[i] < b[i]:
            out.append(i)
    return out


def backtest_signals(
    closes: list[float],
    rsi_series: list[Optional[float]],
    macd_line: list[Optional[float]],
    signal_line: list[Optional[float]],
    sma50: list[Optional[float]],
    sma150: list[Optional[float]],
    sma200: list[Optional[float]],
    bb_lower: list[Optional[float]],
    bb_upper: list[Optional[float]],
) -> dict[str, Optional[dict]]:
    """
    {signal_id: {events, avg_fwd_pct, win_rate_pct, fwd_days} | None}

    Event definitions mirror what each chip *signals*:
      rsi      → RSI crossing DOWN through 30 (the oversold entry the chip flags)
      macd     → MACD crossing UP through its signal line
      cross    → golden cross (SMA50 crossing up through SMA200)
      sma150   → price reclaiming the SMA150 from below
      bb       → close crossing down through the lower band
      levels   → close making a new 52-week high (breakout persistence)
    """
    thirty = [30.0] * len(closes)
    seventy = [70.0] * len(closes)

    results: dict[str, Optional[dict]] = {}
    results["rsi"] = _forward_stats(_cross_events(rsi_series, thirty, up=False), closes)
    results["macd"] = _forward_stats(_cross_events(macd_line, signal_line, up=True), closes)
    results["cross"] = _forward_stats(_cross_events(sma50, sma200, up=True), closes)
    close_list: list[Optional[float]] = list(closes)
    results["sma150"] = _forward_stats(_cross_events(close_list, sma150, up=True), closes)
    results["bb"] = _forward_stats(_cross_events(close_list, bb_lower, up=False), closes)

    # New 52-week highs (rolling), skipping the first year of warm-up
    high_events = []
    for i in range(252, len(closes)):
        if closes[i] > max(closes[i - 252: i]):
            high_events.append(i)
    # De-cluster: keep only the first high of each 10-day run
    decl = [i for k, i in enumerate(high_events) if k == 0 or i - high_events[k - 1] > 10]
    results["levels"] = _forward_stats(decl, closes)

    results["volume"] = None    # no meaningful event definition for OBV state
    return results
