// Config Defaults from Project Brief (overridable by environment variables)

function getEnvNumber(key: string, defaultValue: number): number {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    const parsed = Number(process.env[key]);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

export const CONFIG = {
  FEE_ARTIST_PERCENT: getEnvNumber("FEE_ARTIST_PERCENT", 7.5),
  FEE_CREATOR_PERCENT: getEnvNumber("FEE_CREATOR_PERCENT", 7.5),
  FEE_CREATOR_PERCENT_PRO: getEnvNumber("FEE_CREATOR_PERCENT_PRO", 4),
  CREATOR_PRO_PRICE: getEnvNumber("CREATOR_PRO_PRICE", 399),
  GST_PERCENT: getEnvNumber("GST_PERCENT", 18),
  MIN_CREATOR_FOLLOWERS: getEnvNumber("MIN_CREATOR_FOLLOWERS", 500),
  MIN_CREATOR_WITHDRAWAL: getEnvNumber("MIN_CREATOR_WITHDRAWAL", 500),
  MIN_ARTIST_WITHDRAWAL: getEnvNumber("MIN_ARTIST_WITHDRAWAL", 1000),
  REVIEW_WINDOW_HOURS: getEnvNumber("REVIEW_WINDOW_HOURS", 72),
  LIVE_HOLD_DAYS: getEnvNumber("LIVE_HOLD_DAYS", 7),
  RELEASE_FIRST_PERCENT: getEnvNumber("RELEASE_FIRST_PERCENT", 50),
  RATE_CHANGE_COOLDOWN_DAYS: getEnvNumber("RATE_CHANGE_COOLDOWN_DAYS", 7),
  AUTOPILOT_HIDE_MULTIPLIER: getEnvNumber("AUTOPILOT_HIDE_MULTIPLIER", 3),
  MAX_BUDGET_SHARE_PER_CREATOR: getEnvNumber("MAX_BUDGET_SHARE_PER_CREATOR", 30),
  MIN_DEAL_AMOUNT: getEnvNumber("MIN_DEAL_AMOUNT", 300),
  BENCHMARK_CPM_MIN: getEnvNumber("BENCHMARK_CPM_MIN", 50),
  BENCHMARK_CPM_MAX: getEnvNumber("BENCHMARK_CPM_MAX", 300),
};

export type AppConfig = typeof CONFIG;
