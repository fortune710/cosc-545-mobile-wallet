import { Star } from "lucide-react";

export function PinInfo() {
    return (
        <section className="flex min-h-[78svh] flex-col items-center text-center">
            <div className="mt-4 rounded-3xl bg-blue-50 p-6 text-blue-600">
                <div className="flex gap-2">
                    <Star /><Star /><Star /><Star />
                </div>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-slate-900">One PIN for all your devices</h2>
            <p className="mt-3 max-w-xs text-sm text-slate-500">The PIN you set or change will be used to sign in and approve important actions across your account.</p>
        </section>
    )
}