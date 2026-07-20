/**
 * Automatic asset-class detection for world holdings.
 *
 * A position counts as crypto when either:
 *  - the ticker is a known crypto ETF/ETP, or
 *  - its name mentions bitcoin/ethereum/crypto/digital assets
 * so newly-bought crypto ETFs sort themselves without code changes as long as
 * their name is descriptive; the ticker set covers the major US spot ETFs.
 */
export type AssetClass = "equity" | "crypto";

const KNOWN_CRYPTO_TICKERS = new Set([
  // Bitcoin spot ETFs
  "IBIT", "FBTC", "GBTC", "ARKB", "BITB", "HODL", "BTCO", "EZBC", "BRRR", "BTCW",
  // Ethereum spot ETFs
  "ETHA", "ETHE", "ETHW", "FETH", "EZET", "CETH", "QETH",
]);

const CRYPTO_NAME_PATTERN = /\b(bitcoin|ethereum|crypto(currenc(y|ies))?|digital assets?|blockchain etf)\b/i;

export function classifyAsset(ticker?: string | null, name?: string | null): AssetClass {
  if (ticker && KNOWN_CRYPTO_TICKERS.has(ticker.toUpperCase())) return "crypto";
  if (name && CRYPTO_NAME_PATTERN.test(name)) return "crypto";
  return "equity";
}

export function isCrypto(ticker?: string | null, name?: string | null): boolean {
  return classifyAsset(ticker, name) === "crypto";
}
