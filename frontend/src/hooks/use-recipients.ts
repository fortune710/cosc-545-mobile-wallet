import { useState, useEffect } from "react"
import { mockRecipients } from "@/lib/recipients"
import type { Recipient } from "@/lib/types"

export function useRecipients() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setRecipients(mockRecipients)
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return { recipients, isLoading }
}
