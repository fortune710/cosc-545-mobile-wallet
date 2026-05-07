import { z } from "zod"

export const signInSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(12, "Password must be at least 12 characters."),
})

export const signUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.email("Please enter a valid email address."),
  password: z.string().min(12, "Password must be at least 12 characters."),
})

// Types are moved to src/lib/types.ts per product rules
