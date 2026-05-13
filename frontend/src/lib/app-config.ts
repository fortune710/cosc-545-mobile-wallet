export const config = {
  appName: 'AuraPay',
  maxPaymentAmount: 50,
  minPasswordLength: 12,
  pinLength: 4,
  sessionInactivityMs: Number(import.meta.env.VITE_SESSION_INACTIVITY_MS || 8 * 60 * 60 * 1000),
  sessionRefreshThresholdMs: Number(import.meta.env.VITE_SESSION_REFRESH_THRESHOLD_MS || 2 * 60 * 1000),
  sessionRefreshCheckIntervalMs: Number(import.meta.env.VITE_SESSION_REFRESH_CHECK_INTERVAL_MS || 60 * 1000),
  apiUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
  wsUrl:
    import.meta.env.VITE_WS_BACKEND_URL ||
    (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000')
      .replace(/^http:\/\//, 'ws://')
      .replace(/^https:\/\//, 'wss://'),
}
