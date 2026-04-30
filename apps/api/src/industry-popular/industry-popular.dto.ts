import { z } from "zod";

export const CreateIndustryPopularItemSchema = z.object({
  platform: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  title: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  notes: z.string().min(1).optional(),
  meta: z.any().optional(),
});
export type CreateIndustryPopularItemDto = z.infer<typeof CreateIndustryPopularItemSchema>;

export const ImportIndustryPopularItemsSchema = z.object({
  items: z.array(CreateIndustryPopularItemSchema).min(1),
});
export type ImportIndustryPopularItemsDto = z.infer<typeof ImportIndustryPopularItemsSchema>;

export const ListIndustryPopularItemsQuerySchema = z.object({
  platform: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type ListIndustryPopularItemsQuery = z.infer<typeof ListIndustryPopularItemsQuerySchema>;

