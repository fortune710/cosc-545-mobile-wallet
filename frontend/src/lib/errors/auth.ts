export class AuthError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message: string = 'Session expired') {
    super(message, 'TOKEN_EXPIRED')
    this.name = 'TokenExpiredError'
  }
}

export class InsufficientPermissionsError extends AuthError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'INSUFFICIENT_PERMISSIONS')
    this.name = 'InsufficientPermissionsError'
  }
}
