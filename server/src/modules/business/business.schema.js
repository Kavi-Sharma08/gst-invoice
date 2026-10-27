import { z } from 'zod';

export const businessProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(200),
  gstin: z.string().max(15).optional().default(''),
  pan: z.string().max(10).optional().default(''),
  address: z.string().max(500).optional().default(''),
  state: z.string().max(100).optional().default(''),
  email: z.string().email('Invalid email').or(z.literal('')).optional().default(''),
  phone: z.string().max(20).optional().default(''),
  bankDetails: z
    .object({
      accountName: z.string().optional().default(''),
      accountNumber: z.string().optional().default(''),
      bankName: z.string().optional().default(''),
      ifscCode: z.string().optional().default(''),
      branch: z.string().optional().default(''),
      upiId: z.string().optional().default('')
    })
    .optional()
    .default({}),
  invoiceSettings: z
    .object({
      invoicePrefix: z.string().optional().default('INV/'),
      startingNumber: z.number().int().min(1).optional().default(1),
      defaultNotes: z.string().optional().default(''),
      defaultTerms: z.string().optional().default('')
    })
    .optional()
    .default({})
});
