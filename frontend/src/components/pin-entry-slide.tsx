import type { ReactNode } from "react"
import { Delete } from "lucide-react"

import { cn } from "@/lib/utils"

const PIN_LENGTH = 4
const KEYPAD_VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"] as const

type PinEntrySlideProps = {
  icon: ReactNode
  title: string
  description: string
  value: string
  onChange: (value: string) => void
  error: string
}

function PinSlots({ value }: { value: string }) {
  return (
    <div className="mt-12 flex items-center justify-center gap-4">
      {Array.from({ length: PIN_LENGTH }).map((_, index) => (
        <div
          key={index}
          className="grid size-[4.8rem] place-items-center rounded-[1.15rem] border border-slate-200 bg-white text-[2rem] font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
        >
          {value[index] ? "*" : ""}
        </div>
      ))}
    </div>
  )
}

export function PinEntrySlide({
  icon,
  title,
  description,
  value,
  onChange,
  error,
}: PinEntrySlideProps) {
  const handleDigitClick = (digit: string) => {
    if (value.length >= PIN_LENGTH) {
      return
    }
    onChange(`${value}${digit}`)
  }

  const handleBackspace = () => {
    if (value.length === 0) {
      return
    }
    onChange(value.slice(0, -1))
  }

  return (
    <section className="flex flex-col items-center px-2 text-center">
      <div className="mt-10 grid size-28 place-items-center rounded-[28px] bg-[linear-gradient(180deg,#EEF4FF_0%,#E8EEFF_100%)] text-[#2F6AE8] shadow-[0_20px_40px_rgba(47,106,232,0.12)]">
        {icon}
      </div>
      <h1 className="mt-10 max-w-[340px] text-[3rem] font-semibold leading-[0.98] tracking-[-0.08em] text-slate-950">
        {title}
      </h1>
      <p className="mt-4 max-w-[340px] text-[1rem] leading-7 text-slate-500">
        {description}
      </p>

      <PinSlots value={value} />

      <div className="mt-5 min-h-6">
        {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}
      </div>

      <div className="mt-6 grid w-full grid-cols-3 gap-y-8">
        {KEYPAD_VALUES.map((keyValue, index) => {
          if (!keyValue) {
            return <div key={`empty-${index}`} />
          }

          if (keyValue === "backspace") {
            return (
              <button
                key={keyValue}
                type="button"
                onClick={handleBackspace}
                aria-label="Delete last digit"
                className="mx-auto grid size-16 place-items-center rounded-full text-red-500 transition-colors hover:bg-red-50 active:scale-[0.98]"
              >
                <Delete className="size-8" strokeWidth={2.2} />
              </button>
            )
          }

          return (
            <button
              key={keyValue}
              type="button"
              onClick={() => handleDigitClick(keyValue)}
              className={cn(
                "mx-auto grid size-16 place-items-center rounded-full text-[3rem] font-medium leading-none text-slate-800 transition-colors active:scale-[0.98]",
                value.length >= PIN_LENGTH ? "opacity-50" : "hover:bg-slate-100"
              )}
            >
              {keyValue}
            </button>
          )
        })}
      </div>
    </section>
  )
}

