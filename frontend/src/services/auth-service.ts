import api from '@/lib/api'
import logger from '@/lib/logger'
import type {
  AuthUser,
  ChangePasswordValues,
  LoginStartResponse,
  LoginVerifyResponse,
  PinPresenceResponse,
  SignUpValues,
} from '@/lib/types'
import { UnauthorizedError, TokenExpiredError } from '@/lib/errors/auth'
import { getDeviceFingerprint } from '@/lib/fingerprint'

export const authService = {
  async loginStart(credentials: { email: string; password: string }): Promise<LoginStartResponse> {
    logger.info({ email: credentials.email }, 'Starting login step 1')
    try {
      const deviceId = await getDeviceFingerprint()
      const response = await api.post(
        '/api/auth/login/start/',
        { email: credentials.email, password: credentials.password },
        { headers: { 'X-DEVICE-ID': deviceId } },
      )
      return response.data
    } catch (error: any) {
      logger.error({ email: credentials.email, error }, 'Login start failed')
      throw this.handleApiError(error)
    }
  },

  async loginVerifyMfa(payload: { flow_token: string; mfa_code: string }): Promise<LoginVerifyResponse> {
    logger.info('Verifying MFA code')
    try {
      const response = await api.post('/api/auth/login/verify-mfa/', {
        flow_token: payload.flow_token,
        mfa_code: payload.mfa_code,
      })
      const { access, refresh } = response.data
      localStorage.setItem('accessToken', access)
      localStorage.setItem('refreshToken', refresh)
      logger.info('MFA verified, tokens saved')
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'MFA verification failed')
      throw this.handleApiError(error)
    }
  },

  async verifyEmail(token: string): Promise<void> {
    logger.info('Verifying email address')
    try {
      await api.post('/api/auth/verify-email/', { token })
    } catch (error: any) {
      logger.error({ error }, 'Email verification failed')
      throw this.handleApiError(error)
    }
  },

  async resendVerificationEmail(email: string): Promise<{ detail: string }> {
    logger.info({ email }, 'Resending verification email')
    try {
      const response = await api.post('/api/auth/verify-email/resend/', { email })
      return response.data
    } catch (error: any) {
      logger.error({ email, error }, 'Verification resend failed')
      throw this.handleApiError(error)
    }
  },

  async signUp(data: SignUpValues) {
    logger.info({ email: data.email }, 'Attempting registration')
    try {
      const nameParts = data.fullName.trim().split(' ')
      const first_name = nameParts[0]
      const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

      const deviceId = await getDeviceFingerprint()
      const response = await api.post(
        '/api/auth/register/',
        { email: data.email, password: data.password, first_name, last_name, display_name: data.fullName },
        { headers: { 'X-DEVICE-ID': deviceId } },
      )
      logger.info({ email: data.email }, 'Registration request completed')
      return response.data
    } catch (error: any) {
      logger.error({ email: data.email, error }, 'Registration failed')
      throw this.handleApiError(error)
    }
  },

  async getUser(): Promise<AuthUser> {
    logger.info('Fetching current user profile')
    try {
      const response = await api.get('/api/auth/me/')
      const data = response.data
      return {
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        emailVerified: data.email_verified,
      }
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch user profile')
      throw this.handleApiError(error)
    }
  },

  async logout() {
    const refresh = localStorage.getItem('refreshToken')
    logger.info('Attempting logout')
    try {
      if (refresh) {
        await api.post('/api/auth/logout/', { refresh })
      }
    } catch (error) {
      logger.warn({ error }, 'Logout API call failed')
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      logger.info('Local session cleared')
    }
  },

  async checkPin(pin: string) {
    logger.info('Checking current PIN')
    try {
      const response = await api.post('/api/auth/pin/check/', { pin })
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'PIN check failed')
      throw this.handleApiError(error)
    }
  },

  async setPin(pin: string) {
    logger.info('Setting new PIN')
    try {
      const response = await api.post('/api/auth/pin/', { pin })
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'PIN update failed')
      throw this.handleApiError(error)
    }
  },

  async changePassword(data: ChangePasswordValues) {
    logger.info('Attempting password change')
    try {
      const response = await api.post('/api/auth/password/', {
        current_password: data.currentPassword,
        new_password: data.newPassword,
      })
      logger.info('Password changed successfully')
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'Password change failed')
      throw this.handleApiError(error)
    }
  },

  async getPinPresence(): Promise<PinPresenceResponse> {
    logger.info('Fetching PIN presence')
    try {
      const response = await api.get('/api/auth/pin/check/')
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'PIN presence check failed')
      throw this.handleApiError(error)
    }
  },

  async mfaEnroll(token?: string) {
    logger.info('Attempting MFA enrollment')
    const headers = token ? { 'X-MFA-TOKEN': token } : {}
    try {
      const response = await api.post('/api/auth/mfa/enroll/', {}, { headers })
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'MFA enrollment failed')
      throw this.handleApiError(error)
    }
  },

  async mfaVerify(code: string, token?: string) {
    logger.info('Attempting MFA verification')
    const headers = token ? { 'X-MFA-TOKEN': token } : {}
    try {
      const response = await api.post('/api/auth/mfa/verify/', { mfa_code: code }, { headers })
      return response.data
    } catch (error: any) {
      logger.error({ error }, 'MFA verification failed')
      throw this.handleApiError(error)
    }
  },

  handleApiError(error: any): Error {
    if (error.response) {
      const status = error.response.status
      const detail = error.response.data?.detail || ''
      if (status === 401) {
        if (detail.includes('expired')) return new TokenExpiredError()
        return new UnauthorizedError()
      }
    }
    return error
  },

  isAuthenticated() {
    return !!localStorage.getItem('accessToken')
  },
}
