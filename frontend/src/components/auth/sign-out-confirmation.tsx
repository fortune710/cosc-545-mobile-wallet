import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { authService } from "@/services/auth-service"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { SignOutConfirmationProps } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"



export function SignOutConfirmation({ children }: SignOutConfirmationProps) {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSignOut = async () => {
    await authService.logout()
    queryClient.removeQueries() // Clear all queries
    navigate("/login")
  }

  if (isDesktop) {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign back in to access your wallet and transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl border-zinc-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white border-none"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="p-4 rounded-t-[32px]">
        <div className="mx-auto flex h-full w-full max-w-sm flex-col">
          <DrawerHeader className="px-0 pb-6 pt-2 text-center sm:text-left">
            <DrawerTitle className="text-[22px] font-bold text-zinc-900 tracking-tight">Sign Out</DrawerTitle>
            <DrawerDescription className="text-zinc-500 text-[15px] pt-1">
              Are you sure you want to sign out of your account?
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-3 pb-8">
            <Button
              onClick={handleSignOut}
              className="h-14 w-full rounded-2xl bg-red-600 hover:bg-red-700 text-white text-[16px] font-semibold"
            >
              Sign Out
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="h-14 w-full rounded-2xl border-zinc-200 text-zinc-600 text-[16px] font-medium">
                Cancel
              </Button>
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
