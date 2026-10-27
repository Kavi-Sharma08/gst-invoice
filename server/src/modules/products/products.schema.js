import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  type: z.enum(['Product', 'Service']).optional().default('Service'),
  hsnSac: z.string().max(20).optional().default(''),
  gstRate: z.number().min(0).max(100).default(18),
  rate: z.number().min(0).default(0),
  unit: z.string().max(20).optional().default('Nos'),
  description: z.string().max(1000).optional().default('')
});

export const productUpdateSchema = productSchema.partial();
