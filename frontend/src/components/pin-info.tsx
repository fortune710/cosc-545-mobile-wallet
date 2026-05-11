export function PinInfo() {
  return (
    <section className="flex flex-col items-center text-center">
      <div className="relative mt-8 w-full">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-32 rounded-full bg-violet-500/20 blur-3xl" />

        {/* PIN card */}
        <div className="relative w-full rounded-[28px] bg-[linear-gradient(135deg,#8B4DFF_0%,#C084FC_52%,#7C3AED_100%)] px-8 py-9 text-white shadow-[0_20px_50px_rgba(124,58,237,0.32)]">
          {/* Glass gloss */}
          <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.40),transparent_40%)]" />

          {/* PIN dot slots */}
          <div className="relative flex items-center justify-center gap-5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="grid size-13 place-items-center rounded-xl border border-white/25 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-sm"
              >
                <span className="size-5 rounded-full bg-white shadow-[0_2px_8px_rgba(42,0,90,0.3)]" />
              </span>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mt-8 max-w-[320px] text-[2.5rem] font-semibold leading-[0.98] tracking-[-0.08em] text-slate-950 dark:text-white">
        One pin for all your devices
      </h2>
      <p className="mt-5 max-w-85 text-[1.02rem] leading-7 text-slate-500 dark:text-slate-400">
        The PIN you set or change will be the same on all your devices. You will use it to sign in and approve transactions, keeping your account secure and easy to access.
      </p>
    </section>
  )
}
