import { z } from "zod";

export const photoSchema = z.object({
  Key: z.string(),
  LastModified: z.string(),
  url: z.string(),
});

export type Photo = {
  Key: string;
  LastModified: string;
  url: string;
};
