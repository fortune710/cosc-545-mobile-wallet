import { useMemo, useState } from 'react'
import {
    ArrowLeft,
    Banknote,
    ChevronLeft,
    Clock3,
    Eye,
    EyeOff,
    Lock,
    Pencil,
    Shield,
    Star,
    X,
} from 'lucide-react'

type Screen =
    | 'menu'
    | 'pinInfo'
    | 'enterPin'
    | 'newPin'
    | 'changePassword'
    | 'profile'

const APP_NAME = 'AuraPay'
const MOCK_CURRENT_PIN = '1234'
const LOCKOUT_MS = 6000

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

const isWeakPin = (pin: string) => {
    const blocked = new Set(['0000', '1111', '1234', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'])
    return blocked.has(pin)
}

function App() {
    const [screen, setScreen] = useState<Screen>('menu')
    const [history, setHistory] = useState<Screen[]>([])

    const [currentPin, setCurrentPin] = useState('')
    const [newPin, setNewPin] = useState('')
    const [pinError, setPinError] = useState('')
    const [newPinError, setNewPinError] = useState('')
    const [pinAttempts, setPinAttempts] = useState(0)
    const [pinLockedUntil, setPinLockedUntil] = useState<number | null>(null)

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [passwordError, setPasswordError] = useState('')

    const [userTag, setUserTag] = useState('@jordanpay')
    const [editingTag, setEditingTag] = useState(false)
    const [draftTag, setDraftTag] = useState('@jordanpay')
    const [tagError, setTagError] = useState('')
    const [showCloseModal, setShowCloseModal] = useState(false)

    const isPinLocked = Boolean(pinLockedUntil && Date.now() < pinLockedUntil)

    const goTo = (next: Screen) => {
        setHistory((prev) => [...prev, screen])
        setScreen(next)
    }

    const goBack = () => {
        const previous = history[history.length - 1]
        if (!previous) return
        setHistory((prev) => prev.slice(0, -1))
        setScreen(previous)
    }

    const addPinDigit = (value: string, target: 'current' | 'new') => {
        if (isPinLocked && target === 'current') return
        if (target === 'current') {
            if (currentPin.length >= 4) return
            setCurrentPin((prev) => prev + value)
            setPinError('')
            return
        }
        if (newPin.length >= 4) return
        setNewPin((prev) => prev + value)
        setNewPinError('')
    }

    const removePinDigit = (target: 'current' | 'new') => {
        if (target === 'current') {
            setCurrentPin((prev) => prev.slice(0, -1))
            return
        }
        setNewPin((prev) => prev.slice(0, -1))
    }

    const submitCurrentPin = () => {
        if (currentPin.length !== 4 || isPinLocked) return
        if (currentPin === MOCK_CURRENT_PIN) {
            setCurrentPin('')
            setPinAttempts(0)
            setPinError('')
            goTo('newPin')
            return
        }

        const attempts = pinAttempts + 1
        setPinAttempts(attempts)
        setCurrentPin('')
        if (attempts >= 3) {
            setPinLockedUntil(Date.now() + LOCKOUT_MS)
            setPinError('Too many attempts. Please wait before trying again.')
            window.setTimeout(() => {
                setPinAttempts(0)
                setPinLockedUntil(null)
                setPinError('')
            }, LOCKOUT_MS)
            return
        }

        setPinError('Invalid PIN. Please try again.')
    }

    const submitNewPin = () => {
        if (newPin.length !== 4) return
        if (isWeakPin(newPin)) {
            setNewPinError('Choose a stronger PIN.')
            return
        }

        setNewPin('')
        setNewPinError('')
        alert('PIN updated successfully.')
        setScreen('menu')
        setHistory([])
    }

    const passwordStrong = useMemo(() => passwordRegex.test(newPassword), [newPassword])

    const submitPassword = () => {
        if (!currentPassword.trim()) {
            setPasswordError('Please enter your current password.')
            return
        }
        if (!passwordStrong) {
            setPasswordError('Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.')
            return
        }
        setPasswordError('')
        setCurrentPassword('')
        setNewPassword('')
        alert('Password changed successfully.')
    }

    const validateUserTag = (value: string) => /^@[\S]{3,}$/.test(value)

    const saveUserTag = () => {
        if (!validateUserTag(draftTag)) {
            setTagError('Usertag must start with @, contain no spaces, and be at least 4 characters.')
            return
        }
        setUserTag(draftTag)
        setTagError('')
        setEditingTag(false)
    }

    return (
        <main className="min-h-screen bg-slate-100 px-3 py-6">
            <div className="mx-auto w-full max-w-sm rounded-[2.2rem] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.45)]">
                <StatusBar />
                {screen !== 'menu' ? <BackButton onClick={goBack} /> : null}

                {screen === 'menu' ? (
                    <section className="pt-4">
                        <p className="text-sm font-medium text-blue-600">{APP_NAME}</p>
                        <h1 className="mt-2 text-3xl font-bold text-slate-900">Security & Profile Demo</h1>
                        <p className="mt-2 text-sm text-slate-500">Choose a screen to test secure UI flows.</p>
                        <div className="mt-6 space-y-3">
                            <MenuButton label="Profile" icon={<ChevronLeft className="rotate-180" />} onClick={() => goTo('profile')} />
                            <MenuButton label="PIN Info" icon={<Lock />} onClick={() => goTo('pinInfo')} />
                            <MenuButton label="Change Password" icon={<Shield />} onClick={() => goTo('changePassword')} />
                        </div>
                    </section>
                ) : null}

                {screen === 'pinInfo' ? <PinInfo onContinue={() => goTo('enterPin')} /> : null}
                {screen === 'enterPin' ? <PinEntry title="Enter your current PIN" subtitle="Enter your existing 4-digit code." pin={currentPin} error={pinError} locked={isPinLocked} onDigit={(v) => addPinDigit(v, 'current')} onDelete={() => removePinDigit('current')} onSubmit={submitCurrentPin} /> : null}
                {screen === 'newPin' ? <PinEntry title="Create a new PIN" subtitle="Enter a 4-digit code you won’t forget." pin={newPin} error={newPinError} locked={false} onDigit={(v) => addPinDigit(v, 'new')} onDelete={() => removePinDigit('new')} onSubmit={submitNewPin} /> : null}
                {screen === 'changePassword' ? (
                    <section className="pt-3">
                        <h2 className="text-3xl font-bold text-slate-900">Change Password</h2>
                        <p className="mt-2 text-sm text-slate-500">Change your password to a new one.</p>
                        <div className="mt-6 space-y-4">
                            <PasswordField label="Current Password" value={currentPassword} setValue={setCurrentPassword} shown={showCurrentPassword} setShown={setShowCurrentPassword} />
                            <PasswordField label="New Password" value={newPassword} setValue={setNewPassword} shown={showNewPassword} setShown={setShowNewPassword} />
                        </div>
                        <p className="mt-4 text-xs text-slate-500">Use 8+ characters with uppercase, lowercase, number, and symbol.</p>
                        {passwordError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{passwordError}</p> : null}
                        <button onClick={submitPassword} disabled={!currentPassword || !newPassword || !passwordStrong} className="mt-8 w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition enabled:hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300">
                            Change Password
                        </button>
                    </section>
                ) : null}

                {screen === 'profile' ? (
                    <section className="pt-3">
                        <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 font-bold text-white">JM</div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Jordan Miles</h2>
                                    <p className="text-sm text-slate-500">jordan.miles@example.com</p>
                                </div>
                            </div>
                        </div>
                        <SectionTitle text="PERSONAL DETAILS" />
                        <CardRow label="First name" value="Jordan" />
                        <CardRow label="Middle Name" value="-" />
                        <CardRow label="Last name" value="Miles" />
                        <CardRow label="Phone Number" value="5551234567" />
                        <CardRow label="Date of birth" value="Aug 02, 2003" />
                        <SectionTitle text="USERTAG" />
                        <div className="rounded-2xl border border-slate-200 p-4">
                            {!editingTag ? (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400">Usertag</p>
                                        <p className="mt-1 font-semibold text-slate-900">{userTag}</p>
                                    </div>
                                    <button onClick={() => setEditingTag(true)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
                                </div>
                            ) : (
                                <div>
                                    <input value={draftTag} onChange={(e) => setDraftTag(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                                    {tagError ? <p className="mt-2 text-xs text-red-600">{tagError}</p> : null}
                                    <div className="mt-3 flex gap-2">
                                        <button onClick={saveUserTag} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Save</button>
                                        <button onClick={() => { setEditingTag(false); setDraftTag(userTag); setTagError('') }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setShowCloseModal(true)} className="mt-6 text-sm font-semibold text-red-600">Close Account</button>
                    </section>
                ) : null}
            </div>

            {showCloseModal ? (
                <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5">
                        <h3 className="text-lg font-bold text-slate-900">Close account?</h3>
                        <p className="mt-2 text-sm text-slate-500">Are you sure you want to close your account? This action cannot be undone in a real app.</p>
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => setShowCloseModal(false)} className="flex-1 rounded-xl border border-slate-300 px-3 py-2">Cancel</button>
                            <button onClick={() => { setShowCloseModal(false); alert('Account closure requested (demo only).') }} className="flex-1 rounded-xl bg-red-600 px-3 py-2 font-semibold text-white">Confirm</button>
                        </div>
                    </div>
                </div>
            ) : null}
        </main>
    )
}

function StatusBar() {
    return <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-400"><span>9:41</span><span>🔋</span></div>
}

function BackButton({ onClick }: { onClick: () => void }) {
    return <button onClick={onClick} className="mb-2 rounded-full border border-slate-200 p-2 text-slate-700"><ArrowLeft size={16} /></button>
}

function MenuButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
    return <button onClick={onClick} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-900">{label}<span className="text-slate-500">{icon}</span></button>
}

function PinInfo({ onContinue }: { onContinue: () => void }) {
    return <section className="flex min-h-[78svh] flex-col items-center text-center"><div className="mt-4 rounded-3xl bg-blue-50 p-6 text-blue-600"><div className="flex gap-2"><Star /><Star /><Star /><Star /></div></div><h2 className="mt-6 text-3xl font-bold text-slate-900">One PIN for all your devices</h2><p className="mt-3 max-w-xs text-sm text-slate-500">The PIN you set or change will be used to sign in and approve important actions across your account.</p><button onClick={onContinue} className="mt-auto mb-4 w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white">Proceed to change your PIN</button></section>
}

function PinEntry({ title, subtitle, pin, error, locked, onDigit, onDelete, onSubmit }: { title: string; subtitle: string; pin: string; error: string; locked: boolean; onDigit: (value: string) => void; onDelete: () => void; onSubmit: () => void }) {
    const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']
    return <section className="pt-2"><div className="mb-4 inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600"><Banknote size={20} /></div><h2 className="text-3xl font-bold text-slate-900">{title}</h2><p className="mt-2 text-sm text-slate-500">{subtitle}</p>{locked ? <p className="mt-3 flex items-center gap-1 text-xs text-amber-600"><Clock3 size={14} /> Too many attempts. Please wait before trying again.</p> : null}<div className="mt-5 flex justify-between gap-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 text-xl font-bold text-slate-900">{pin[i] ? '*' : ''}</div>)}</div>{error && !locked ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}<div className="mt-6 grid grid-cols-3 gap-3">{keypad.map((key, i) => key === '' ? <div key={i} /> : key === 'back' ? <button key={i} onClick={onDelete} className="rounded-2xl border border-slate-200 py-3 text-red-600"><X className="mx-auto" /></button> : <button key={i} onClick={() => onDigit(key)} disabled={locked} className="rounded-2xl border border-slate-200 py-3 text-lg font-semibold text-slate-900 disabled:text-slate-300">{key}</button>)}</div><button onClick={onSubmit} disabled={pin.length !== 4 || locked} className="mt-6 w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Continue</button></section>
}

function PasswordField({ label, value, setValue, shown, setShown }: { label: string; value: string; setValue: (v: string) => void; shown: boolean; setShown: (v: boolean) => void }) {
    return <div><label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label><div className="relative"><input type={shown ? 'text' : 'password'} value={value} onChange={(e) => setValue(e.target.value)} placeholder={label} className="w-full rounded-2xl border border-slate-300 px-4 py-3 pr-12 text-sm outline-none focus:border-blue-500" /><button type="button" onClick={() => setShown(!shown)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{shown ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
}

function SectionTitle({ text }: { text: string }) { return <p className="mb-2 mt-5 text-xs font-bold tracking-wider text-slate-400">{text}</p> }

function CardRow({ label, value }: { label: string; value: string }) { return <div className="mb-2 rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><p className="text-sm text-slate-400">{label}</p><p className="text-sm font-semibold text-slate-900">{value}</p></div></div> }

export default App