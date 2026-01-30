import { z } from "zod";

export const createNotesSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});
