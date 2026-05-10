import { useMemo, useState } from 'react'
import {
    IconAlertTriangle,
    IconEye,
    IconEyeOff,
} from '@tabler/icons-react'
import { Navigate, Link } from 'react-router-dom'
import { config } from '@/lib/app-config'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { authService } from '@/services/auth-service'
import { signUpSchema } from '@/lib/schemas/auth'

export function SignUpPage() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [enrollmentToken, setEnrollmentToken] = useState<string | null>(null)

    const validation = useMemo(() => {
        return signUpSchema.safeParse({ fullName, email, password })
    }, [fullName, email, password])

    const fullNameIsValid = fullName.length > 0 ? signUpSchema.shape.fullName.safeParse(fullName).success : true
    const emailIsValid = email.length > 0 ? signUpSchema.shape.email.safeParse(email).success : true
    const passwordIsValid = password.length > 0 ? signUpSchema.shape.password.safeParse(password).success : true
    
    const formIsValid = validation.success
    const canSubmit = formIsValid && !isSubmitting

    const handleSignUp = async (event: React.FormEvent) => {
        event.preventDefault()

        if (!canSubmit) {
            return
        }

        setIsSubmitting(true)
        setErrorMessage('')

        try {
            const response = await authService.signUp({ fullName, email, password })
            setEnrollmentToken(response.mfa_enrollment_token)
        } catch (error: any) {
            const apiError = error.response?.data?.detail || error.response?.data?.email?.[0] || error.response?.data?.non_field_errors?.[0]
            setErrorMessage(apiError || 'Failed to create account. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (enrollmentToken) return <Navigate to={`/mfa?token=${enrollmentToken}`} replace />

    return (
        <main className="min-h-svh bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white transition-colors duration-300">
            <div className="mx-auto flex min-h-svh w-full max-w-md flex-col px-6 pt-20 pb-12 sm:px-8">
                <div className="flex flex-1 flex-col">
                    <div className="mb-10 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                        <p className="text-xs font-bold tracking-[0.2em] uppercase">{config.appName}</p>
                    </div>

                    <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Create account.
                    </h1>
                    <p className="mt-3 text-[16px] text-zinc-500 dark:text-zinc-400">
                        Join {config.appName} to start sending micro-payments.
                    </p>

                    <form onSubmit={handleSignUp} className="mt-10 space-y-5" noValidate>
                        <div>
                            <Label htmlFor="fullName" className="mb-2 block text-[14px] font-medium text-zinc-700 dark:text-zinc-300">
                                Full Name
                            </Label>
                            <Input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                autoComplete="name"
                                className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800/50"
                                placeholder="John Doe"
                            />
                            {fullName.length > 0 && !fullNameIsValid ? (
                                <p className="mt-2 text-xs text-red-500">Full name must be at least 2 characters.</p>
                            ) : null}
                        </div>

                        <div>
                            <Label htmlFor="email" className="mb-2 block text-[14px] font-medium text-zinc-700 dark:text-zinc-300">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition-all focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800/50"
                                placeholder="name@example.com"
                            />
                            {email.length > 0 && !emailIsValid ? (
                                <p className="mt-2 text-xs text-red-500">Please enter a valid email address.</p>
                            ) : null}
                        </div>

                        <div>
                            <Label htmlFor="password" className="mb-2 block text-[14px] font-medium text-zinc-700 dark:text-zinc-300">
                                Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-12 text-sm outline-none transition-all focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800/50"
                                    placeholder="Minimum 12 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                                </button>
                            </div>
                            {password.length > 0 && !passwordIsValid ? (
                                <p className="mt-2 text-xs text-red-500">Password must be at least 12 characters.</p>
                            ) : null}
                        </div>

                        {errorMessage ? (
                            <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                                <IconAlertTriangle size={18} />
                                <span>{errorMessage}</span>
                            </div>
                        ) : null}

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-[15px] font-semibold text-white transition-all enabled:hover:bg-zinc-800 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-white dark:text-zinc-950 dark:enabled:hover:bg-zinc-200 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
                        >
                            {isSubmitting ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <footer className='mt-auto pt-10'>
                        <p className="text-center text-[15px] text-zinc-500 dark:text-zinc-400">
                            Already have an account?{' '}
                            <Link to="/login" className="font-semibold text-zinc-900 hover:underline dark:text-white">
                                Sign In
                            </Link>
                        </p>
                    </footer>
                </div>
            </div>
        </main>
    )
}
