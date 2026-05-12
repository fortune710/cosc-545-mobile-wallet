import { useMemo, useState } from 'react'
import {
    IconAlertTriangle,
    IconCircleCheck,
    IconEye,
    IconEyeOff,
    IconMail,
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from '@/components/auth/auth-layout'
import { authService } from '@/services/auth-service'
import { signUpSchema } from '@/lib/schemas/auth'
import { ApiRequestError } from '@/lib/errors/auth'

export function SignUpPage() {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [registered, setRegistered] = useState(false)

    const validation = useMemo(() => signUpSchema.safeParse({ firstName, lastName, email, password }), [firstName, lastName, email, password])
    const firstNameIsValid = firstName.length > 0 ? signUpSchema.shape.firstName.safeParse(firstName).success : true
    const lastNameIsValid = lastName.length > 0 ? signUpSchema.shape.lastName.safeParse(lastName).success : true
    const emailIsValid = email.length > 0 ? signUpSchema.shape.email.safeParse(email).success : true
    const passwordIsValid = password.length > 0 ? signUpSchema.shape.password.safeParse(password).success : true
    const canSubmit = validation.success && !isSubmitting

    const handleSignUp = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!canSubmit) return

        setIsSubmitting(true)
        setErrorMessage('')

        try {
            await authService.signUp({ firstName, lastName, email, password })
            setRegistered(true)
        } catch (error: any) {
            if (error instanceof ApiRequestError || error instanceof Error) {
                setErrorMessage(error.message || 'Failed to create account. Please try again.')
            } else {
                setErrorMessage('Failed to create account. Please try again.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <AuthLayout>
            <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 md:px-12 lg:px-16 xl:px-20">
                {registered ? (
                    <div className="flex flex-col items-center text-center">
                        <div className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                            <IconMail size={32} strokeWidth={1.5} />
                        </div>
                        <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                            Check your inbox
                        </h1>
                        <p className="mt-3 max-w-xs text-[15px] text-zinc-500 dark:text-zinc-400">
                            We sent a verification link to{' '}
                            <strong className="font-semibold text-zinc-700 dark:text-zinc-200">{email}</strong>.
                        </p>
                        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-[13px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                            <IconCircleCheck size={16} className="mt-0.5 shrink-0" />
                            <span>After verifying, sign in to complete MFA setup.</span>
                        </div>
                        <Link
                            to="/login"
                            className="mt-8 flex h-11 w-full items-center justify-center rounded-xl bg-violet-600 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-violet-700 active:scale-[0.98]"
                        >
                            Go to Sign In
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                                Create account.
                            </h1>
                            <p className="mt-2 text-[15px] text-zinc-500 dark:text-zinc-400">
                                Create your internal wallet and move money faster with verified access from day one.
                            </p>
                        </div>

                        <form onSubmit={handleSignUp} className="space-y-5" noValidate>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="firstName" className="mb-1.5 block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                                        First name
                                    </Label>
                                    <Input
                                        id="firstName"
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        autoComplete="given-name"
                                        className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[15px] text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:focus:border-violet-600 dark:focus:bg-zinc-800"
                                        placeholder="John"
                                    />
                                    {firstName.length > 0 && !firstNameIsValid && (
                                        <p className="mt-1.5 text-[12px] text-red-500">First name is required.</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="lastName" className="mb-1.5 block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                                        Last name
                                    </Label>
                                    <Input
                                        id="lastName"
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        autoComplete="family-name"
                                        className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[15px] text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:focus:border-violet-600 dark:focus:bg-zinc-800"
                                        placeholder="Doe"
                                    />
                                    {lastName.length > 0 && !lastNameIsValid && (
                                        <p className="mt-1.5 text-[12px] text-red-500">Last name is required.</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    Email address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[15px] text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:focus:border-violet-600 dark:focus:bg-zinc-800"
                                    placeholder="name@example.com"
                                />
                                {email.length > 0 && !emailIsValid && (
                                    <p className="mt-1.5 text-[12px] text-red-500">Please enter a valid email address.</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                        className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 pr-11 text-[15px] text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white dark:focus:border-violet-600 dark:focus:bg-zinc-800"
                                        placeholder="Minimum 12 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((p) => !p)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                    </button>
                                </div>
                                {password.length > 0 && !passwordIsValid && (
                                    <p className="mt-1.5 text-[12px] text-red-500">Password must be at least 12 characters.</p>
                                )}
                            </div>

                            {errorMessage && (
                                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                                    <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="flex h-11 w-full items-center justify-center rounded-xl bg-violet-600 text-[15px] font-semibold text-white shadow-sm transition-all enabled:hover:bg-violet-700 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting ? 'Creating account…' : 'Create Account'}
                            </button>
                        </form>

                        <p className="mt-8 text-center text-[14px] text-zinc-500 dark:text-zinc-400">
                            Already have an account?{' '}
                            <Link to="/login" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
                                Sign In
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </AuthLayout>
    )
}
