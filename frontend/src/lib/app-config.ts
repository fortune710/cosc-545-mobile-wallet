export const config = {
  appName: 'SecureWallet',
  maxPaymentAmount: 50,
  minPasswordLength: 12,
  pinLength: 4,
  apiUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
  wsUrl:
    import.meta.env.VITE_WS_BACKEND_URL ||
    (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000')
      .replace(/^http:\/\//, 'ws://')
      .replace(/^https:\/\//, 'wss://'),
}
