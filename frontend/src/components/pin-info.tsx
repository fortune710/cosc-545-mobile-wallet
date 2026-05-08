import { Star } from "lucide-react"

export function PinInfo() {
  return (
    <section className="flex flex-col items-center px-2 text-center">
      <div className="relative mt-10 w-full max-w-[320px] rounded-[34px] bg-[linear-gradient(135deg,#8B4DFF_0%,#E5B8FF_52%,#A65BFF_100%)] px-8 py-10 text-white shadow-[0_24px_60px_rgba(126,79,255,0.26)]">
        <div className="absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(81,20,163,0.28),transparent_48%)]" />
        <div className="relative flex items-center justify-center gap-4">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className="grid size-14 place-items-center rounded-2xl border border-white/20 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-sm"
            >
              <Star className="size-8 fill-white text-white drop-shadow-[0_4px_10px_rgba(42,0,90,0.3)]" strokeWidth={1.5} />
            </span>
          ))}
        </div>
      </div>
      <h2 className="mt-14 max-w-[320px] text-[3rem] font-semibold leading-[0.98] tracking-[-0.08em] text-slate-950">
        One pin for all your devices
      </h2>
      <p className="mt-6 max-w-[345px] text-[1.05rem] leading-8 text-slate-500">
        The PIN you set or change will be the same on all your devices. You will use it to sign in and approve transactions, keeping your account secure and easy to access.
      </p>
    </section>
  )
}
