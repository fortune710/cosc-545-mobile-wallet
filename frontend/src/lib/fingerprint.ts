import { getFingerprint } from '@thumbmarkjs/thumbmarkjs'

let memoizedFingerprint: string | null = null

export async function getDeviceFingerprint(): Promise<string> {
  if (memoizedFingerprint) {
    return memoizedFingerprint
  }

  try {
    const fingerprint = await getFingerprint()
    memoizedFingerprint = String(fingerprint)
    return memoizedFingerprint
  } catch (error) {
    console.error('Failed to get device fingerprint:', error)
    return 'unknown-device'
  }
}
