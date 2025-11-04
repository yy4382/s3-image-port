import { z } from "zod";

export const keyTemplateSchema = z
  .string()
  .min(1, "Key template cannot be empty");
