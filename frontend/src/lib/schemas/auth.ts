import { z } from "zod"
import { config } from "@/lib/app-config"

export const phoneNumberSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || /^\+[1-9]\d{7,14}$/.test(value.replace(/[\s-]/g, "").replace(/^00/, "+")), {
    message: "Phone number must be in international format, for example +15555550123.",
  })

export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  mfaCode: z.string().optional(),
})

export const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(config.minPasswordLength, "Password must be at least 12 characters."),
})

const weakPins = new Set([
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "1234",
])

export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, "PIN must be exactly 4 digits.")
  .refine((pin) => !weakPins.has(pin), "Choose a less predictable PIN.")

// Types are moved to src/lib/types.ts per product rules
