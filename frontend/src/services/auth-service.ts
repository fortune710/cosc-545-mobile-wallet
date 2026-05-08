import api from '@/lib/api'
import logger from '@/lib/logger'
import type {
  AuthUser,
  ChangePasswordValues,
  LoginResponse,
  PinPresenceResponse,
  SignInValues,
  SignUpValues,
} from '@/lib/types'
import { UnauthorizedError, TokenExpiredError } from '@/lib/errors/auth'

export const authService = {
  async login(credentials: SignInValues): Promise<LoginResponse> {
    logger.info({ email: credentials.email }, 'Attempting login')
    try {
      const response = await api.post('/api/auth/login/', {
        email: credentials.email,
        password: credentials.password,
      })
      
      const { access, refresh, user } = response.data
      
      localStorage.setItem('accessToken', access)
      localStorage.setItem('refreshToken', refresh)

      logger.info({ userId: user.email }, 'Login successful')
      return response.data
    } catch (error: any) {
      logger.error({ email: credentials.email, error }, 'Login failed')
      throw this.handleApiError(error)
    }
  },

  async signUp(data: SignUpValues) {
    logger.info({ email: data.email }, 'Attempting registration')
    try {
      const nameParts = data.fullName.trim().split(' ')
      const first_name = nameParts[0]
      const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

      const response = await api.post('/api/auth/register/', {
        email: data.email,
        password: data.password,
        first_name,
        last_name,
        display_name: data.fullName,
      })

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

  handleApiError(error: any): Error {
    if (error.response) {
      const status = error.response.status
      const detail = error.response.data?.detail || ''

      if (status === 401) {
        if (detail.includes('expired')) {
          return new TokenExpiredError()
        }
        return new UnauthorizedError()
      }
    }
    return error
  },

  isAuthenticated() {
    return !!localStorage.getItem('accessToken')
  }
}
