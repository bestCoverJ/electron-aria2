import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro:schema";

const releases = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/releases" }),
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
