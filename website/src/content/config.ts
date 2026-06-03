import { defineCollection, z } from "astro:content";

const releases = defineCollection({
  type: "content",
  schema: z.object({
    version: z.string(),
    date: z.string(),
    summary: z.string(),
    added: z.array(z.string()).default([]),
    improved: z.array(z.string()).default([]),
    fixed: z.array(z.string()).default([]),
    limitations: z.array(z.string()).default([])
  })
});

export const collections = { releases };
