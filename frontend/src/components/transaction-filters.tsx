import { type Dispatch, type SetStateAction, type ReactNode } from "react"
import { ListFilter } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import type { TransactionType, Filters } from "@/lib/types"

export function FilterButton({ 
  active, 
  ...props 
}: React.ComponentPropsWithoutRef<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className="relative grid size-11 place-items-center rounded-full text-lime-700 hover:bg-lime-100 transition-colors"
      aria-label="Open filters"
      {...props}
    >
      <ListFilter className="size-6" />
      {active && (
        <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-lime-500 border-2 border-zinc-50" />
      )}
    </button>
  )
}

function FiltersBody({
  draftFilters,
  setDraftFilters,
}: {
  draftFilters: Filters
  setDraftFilters: Dispatch<SetStateAction<Filters>>
}) {
  function toggleType(type: TransactionType) {
    setDraftFilters((current) => {
      const isActive = current.types.includes(type)
      return {
        ...current,
        types: isActive
          ? current.types.filter((value) => value !== type)
          : [...current.types, type],
      }
    })
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-600">
          Date range
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">From</span>
            <Input
              type="date"
              value={draftFilters.dateFrom}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  dateFrom: event.target.value,
                }))
              }
              className="h-10 rounded-xl border-zinc-300 bg-white/80"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">To</span>
            <Input
              type="date"
              value={draftFilters.dateTo}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  dateTo: event.target.value,
                }))
              }
              className="h-10 rounded-xl border-zinc-300 bg-white/80"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-600">
          Type
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["sent", "received", "fee"] as const).map((type) => {
            const active = draftFilters.types.includes(type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={[
                  "rounded-2xl border px-3 py-1.5 text-sm capitalize transition",
                  active
                    ? "border-lime-400 bg-lime-100/80 text-lime-900"
                    : "border-zinc-300 bg-white/70 text-zinc-700 hover:bg-zinc-100",
                ].join(" ")}
              >
                {type}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-600">
          Amount range
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Min (absolute)</span>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={draftFilters.amountMin}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  amountMin: event.target.value,
                }))
              }
              className="h-10 rounded-xl border-zinc-300 bg-white/80"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-zinc-500">Max (absolute)</span>
            <Input
              type="number"
              min="0"
              placeholder="1000"
              value={draftFilters.amountMax}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  amountMax: event.target.value,
                }))
              }
              className="h-10 rounded-xl border-zinc-300 bg-white/80"
            />
          </label>
        </div>
      </section>
    </div>
  )
}

export function FilterPicker({
  children,
  filters,
  draftFilters,
  setDraftFilters,
  applyFilters,
  clearFilters,
}: {
  children: ReactNode
  filters: Filters
  draftFilters: Filters
  setDraftFilters: Dispatch<SetStateAction<Filters>>
  applyFilters: () => void
  clearFilters: () => void
}) {
  const onOpen = () => setDraftFilters(filters)

  return (
    <>
      <div className="md:hidden">
        <Drawer>
          <DrawerTrigger asChild onClick={onOpen}>
            {children}
          </DrawerTrigger>
          <DrawerContent className="rounded-t-3xl border-zinc-200 bg-zinc-50 pb-5">
            <DrawerHeader className="px-5 pt-3 text-left">
              <DrawerTitle className="text-xl font-semibold text-zinc-950">
                Filter Transactions
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-5 pb-2">
              <FiltersBody
                draftFilters={draftFilters}
                setDraftFilters={setDraftFilters}
              />
              <div className="mt-6 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={clearFilters} className="h-10 rounded-xl">
                  Reset
                </Button>
                <Button onClick={applyFilters} className="h-10 rounded-xl">
                  Apply
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="hidden md:block">
        <Dialog>
          <DialogTrigger asChild onClick={onOpen}>
            {children}
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            className="top-0 right-0 left-auto h-svh w-[420px] max-w-[92vw] translate-x-0 translate-y-0 rounded-none border-l border-zinc-200 bg-zinc-50 p-0 ring-0"
          >
            <DialogHeader className="border-b border-zinc-200 px-6 py-5">
              <DialogTitle className="text-xl font-semibold text-zinc-950">
                Filter Transactions
              </DialogTitle>
            </DialogHeader>
            <div className="flex h-[calc(100svh-81px)] flex-col">
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <FiltersBody
                  draftFilters={draftFilters}
                  setDraftFilters={setDraftFilters}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-zinc-200 bg-white/80 px-6 py-4">
                <Button variant="outline" onClick={clearFilters} className="h-10 rounded-xl">
                  Reset
                </Button>
                <Button onClick={applyFilters} className="h-10 rounded-xl">
                  Apply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
