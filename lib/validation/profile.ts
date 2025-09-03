// lib/validation/profile.ts
import { z } from "zod";

export const profileUpdateSchema = z.object({
  bio: z.string().trim().optional(),
  interests: z.array(z.string()).optional(),
  location: z.string().trim().optional(),
  budget: z.number().int().positive().optional(),
  platforms: z.array(z.string()).optional(),
  niches: z.array(z.string()).optional(),
  games: z.array(z.string()).optional(),
  city: z.string().trim().optional(),
  timeZone: z.string().trim().optional(),
}).refine(
  (v) => Object.values(v).some((x) => {
    if (x === undefined) return false;
    if (Array.isArray(x)) return x.length > 0;
    return String(x).trim() !== "";
  }),
  { message: "Please fill at least one field." }
);

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;