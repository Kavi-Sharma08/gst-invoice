import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(150),
  gstin: z.string().max(15).optional().default(''),
  customerType: z.enum(['B2B', 'B2C']).optional().default('B2B'),
  address: z.string().max(500).optional().default(''),
  state: z.string().max(100).optional().default(''),
  email: z.string().email('Invalid email').or(z.literal('')).optional().default(''),
  phone: z.string().max(20).optional().default('')
});

export const customerUpdateSchema = customerSchema.partial();
