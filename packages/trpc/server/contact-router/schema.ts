import { zEmail } from '@documenso/lib/utils/zod';
import { z } from 'zod';

export const ZContactSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  teamId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ZFindContactsResponseSchema = z.object({
  contacts: z.array(ZContactSchema),
});

export const ZCreateContactRequestSchema = z.object({
  email: zEmail().toLowerCase().max(254),
  name: z.string().max(255),
  phone: z.string().max(20).nullable().optional(),
});

export const ZCreateContactResponseSchema = ZContactSchema;

export const ZUpdateContactRequestSchema = z.object({
  id: z.number(),
  email: zEmail().toLowerCase().max(254).optional(),
  name: z.string().max(255).optional(),
  phone: z.string().max(20).nullable().optional(),
});

export const ZUpdateContactResponseSchema = ZContactSchema;

export const ZDeleteContactRequestSchema = z.object({
  id: z.number(),
});

export const ZSendContactMessageRequestSchema = z.object({
  id: z.number(),
});

export const ZSendContactMessageResponseSchema = z.object({
  success: z.boolean(),
});
