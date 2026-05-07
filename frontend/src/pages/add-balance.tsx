import { useMemo, useState } from "react"
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  CreditCard,
  Plus,
  X,
} from "lucide-react"
import { Link } from "react-router-dom"

import { config } from "@/lib/app-config"
import type { FundingOption } from "@/lib/types"
import { AmountDisplay } from "@/components/amount-display"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"



const fundingOptions: FundingOption[] = [
  {
    id: "new-card",
    label: "Add new debit card",
    speedLabel: "In seconds",
    icon: "card",
  },
  {
    id: "grey-finance",
    label: "Grey Finance",
    detail: "Checking ••••6162",
    speedLabel: "In 3 to 5 days",
    icon: "bank",
  },
  {
    id: "lead-bank",
    label: "LEAD BANK",
    detail: "Checking ••••7714",
    speedLabel: "In 3 to 5 days",
    icon: "bank",
  },
  {
    id: "add-bank",
    label: "Add new bank",
    speedLabel: "In 3 to 5 days",
    icon: "add-bank",
  },
]



function fundingIcon(icon: FundingOption["icon"]) {
  if (icon === "card") return <CreditCard className="size-6 text-zinc-900" aria-hidden="true" />
  if (icon === "add-bank") return <Plus className="size-6 text-zinc-900" aria-hidden="true" />
  return <Building2 className="size-6 text-sky-500" aria-hidden="true" />
}



function FundingPickerContent({
  onSelect,
}: {
  onSelect: (option: FundingOption) => void
}) {
  const instant = fundingOptions.filter((option) => option.speedLabel === "In seconds")
  const delayed = fundingOptions.filter((option) => option.speedLabel === "In 3 to 5 days")

  function OptionRow({ option }: { option: FundingOption }) {
    return (
      <button
        type="button"
        onClick={() => onSelect(option)}
        className="flex w-full items-center gap-4 rounded-2xl px-2 py-3 text-left transition hover:bg-zinc-100"
      >
        <span
          className={[
            "grid size-14 shrink-0 place-items-center rounded-xl",
            option.icon === "bank" ? "bg-sky-100" : "bg-zinc-100",
          ].join(" ")}
        >
          {fundingIcon(option.icon)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-medium text-zinc-900">
            {option.label}
          </span>
          {option.detail ? (
            <span className="block truncate text-[14px] text-zinc-500">{option.detail}</span>
          ) : null}
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-zinc-950">In seconds</h3>
        <div className="mt-3 space-y-1">
          {instant.map((option) => (
            <OptionRow key={option.id} option={option} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-zinc-950">
          In 3 to 5 days
        </h3>
        <div className="mt-3 space-y-1">
          {delayed.map((option) => (
            <OptionRow key={option.id} option={option} />
          ))}
        </div>
      </section>

      <button type="button" className="text-[15px] font-medium text-blue-600 underline underline-offset-2">
        Don&apos;t see all of your payment methods?
      </button>
    </div>
  )
}

/**
 * Page component for users to add balance to their wallet, capped at the configured max per transaction.
 */
export function AddBalancePage() {
  const MAX_AMOUNT = config.maxPaymentAmount
  const [amount, setAmount] = useState(MAX_AMOUNT)
  const [selectedSource, setSelectedSource] = useState<FundingOption | null>(null)
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false)
  const [desktopPickerOpen, setDesktopPickerOpen] = useState(false)

  const handleAmountChange = (value: number) => {
    setAmount(Math.min(value, MAX_AMOUNT))
  }

  const ctaLabel = useMemo(
    () =>
      `Add ${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(Math.min(amount, MAX_AMOUNT))} USD Now`,
    [amount]
  )



  function selectSource(option: FundingOption) {
    setSelectedSource(option)
    setMobilePickerOpen(false)
    setDesktopPickerOpen(false)
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[920px] flex-col box-border bg-zinc-50 px-4 pt-8 pb-7 sm:px-5 md:px-8 md:pt-10">
      <header className="grid grid-cols-[44px_1fr_44px] items-center">
        <Link
          to="/home"
          className="grid size-11 place-items-center rounded-full text-zinc-900 hover:bg-zinc-200/70"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-8" />
        </Link>
        <h1 className="text-center text-[44px] font-medium tracking-[-0.03em] text-zinc-950 md:text-[48px]">
          Add money
        </h1>
        <span />
      </header>

      <AmountDisplay 
        amount={amount} 
        onAmountChange={handleAmountChange} 
      />

      <section className="mt-9">
        <div className="md:hidden">
          <Drawer open={mobilePickerOpen} onOpenChange={setMobilePickerOpen}>
            <DrawerTrigger asChild>
              <button
                type="button"
                className="flex h-28 w-full items-center gap-5 rounded-3xl border border-zinc-300 bg-transparent px-5 text-left transition hover:bg-zinc-100/70"
              >
                <span className="text-[19px] text-zinc-700">From</span>
                <span className="min-w-0 flex-1 text-[20px] font-medium text-zinc-900">
                  {selectedSource?.label ?? "Choose a way to add money"}
                </span>
                <ChevronRight className="size-8 text-zinc-500" />
              </button>
            </DrawerTrigger>
            <DrawerContent className="rounded-t-[30px] border-zinc-200 bg-white pb-6">
              <DrawerHeader className="relative px-5 pb-2 text-center">
                <DrawerTitle className="text-[28px] font-semibold tracking-[-0.03em] text-zinc-950">
                  Choose a way to add money
                </DrawerTitle>
                <DrawerClose asChild>
                  <button
                    type="button"
                    className="absolute top-2 right-4 rounded-full p-2 text-zinc-700 hover:bg-zinc-100"
                  >
                    <X className="size-6" />
                  </button>
                </DrawerClose>
              </DrawerHeader>
              <div className="px-5">
                <FundingPickerContent onSelect={selectSource} />
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        <div className="hidden md:block">
          <Dialog open={desktopPickerOpen} onOpenChange={setDesktopPickerOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex h-28 w-full items-center gap-5 rounded-3xl border border-zinc-300 bg-transparent px-6 text-left transition hover:bg-zinc-100/70"
              >
                <span className="text-[19px] text-zinc-700">From</span>
                <span className="min-w-0 flex-1 text-[20px] font-medium text-zinc-900">
                  {selectedSource?.label ?? "Choose a way to add money"}
                </span>
                <ChevronRight className="size-8 text-zinc-500" />
              </button>
            </DialogTrigger>
            <DialogContent
              showCloseButton={false}
              className="top-0 right-0 left-auto h-svh w-[500px] max-w-[92vw] translate-x-0 translate-y-0 rounded-none border-l border-zinc-200 bg-white p-0 ring-0"
            >
              <DialogHeader className="relative border-b border-zinc-200 px-6 py-5">
                <DialogTitle className="text-[28px] font-semibold tracking-[-0.03em] text-zinc-950">
                  Choose a way to add money
                </DialogTitle>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="absolute top-4 right-5 rounded-full p-2 text-zinc-700 hover:bg-zinc-100"
                  >
                    <X className="size-6" />
                  </button>
                </DialogClose>
              </DialogHeader>
              <div className="h-[calc(100svh-90px)] overflow-y-auto px-6 py-5">
                <FundingPickerContent onSelect={selectSource} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <div className="mt-auto pt-8">
        <Button className="h-16 w-full rounded-full bg-zinc-950 text-[18px] font-semibold tracking-[-0.02em] text-white hover:bg-zinc-900">
          {ctaLabel}
        </Button>
      </div>
    </main>
  )
}
