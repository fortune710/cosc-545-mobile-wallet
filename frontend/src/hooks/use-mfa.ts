import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services/auth-service'
import logger from '@/lib/logger'

export const useMfa = () => {
  const enrollMutation = useMutation({
    mutationFn: (token?: string) => authService.mfaEnroll(token),
    onError: (err: any) => {
      logger.error({ err }, 'MFA enroll mutation error')
    }
  })

  const verifyMutation = useMutation({
    mutationFn: ({ code, token }: { code: string; token?: string }) => 
      authService.mfaVerify(code, token),
    onError: (err: any) => {
      logger.error({ err }, 'MFA verify mutation error')
    }
  })

  return {
    enroll: enrollMutation.mutateAsync,
    enrollData: enrollMutation.data,
    isEnrolling: enrollMutation.isPending,
    enrollError: enrollMutation.error,
    
    verify: verifyMutation.mutateAsync,
    isVerifying: verifyMutation.isPending,
    verifyError: verifyMutation.error,
    
    // Convenience aliases
    provisioningUrl: enrollMutation.data?.provisioning_url,
    isMfaEnabled: enrollMutation.data?.mfa_enabled
  }
}
