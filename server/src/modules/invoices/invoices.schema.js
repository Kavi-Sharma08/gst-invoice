import { z } from 'zod';

export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  hsnSac: z.string().optional().default(''),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: z.string().optional().default('Nos'),
  rate: z.number().min(0, 'Rate cannot be negative'),
  discount: z.number().min(0).max(100).optional().default(0),
  gstRate: z.number().min(0).max(100).default(18)
});

export const invoiceCreateSchema = z.object({
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().optional().default(''),
  status: z.enum(['Draft', 'Issued', 'Paid', 'Cancelled']).optional().default('Issued'),
  currency: z.string().optional().default('INR'),
  customerId: z.union([z.string(), z.number()]).optional().nullable().or(z.literal('')),
  customer: z
    .object({
      name: z.string().min(1, 'Customer name is required'),
      gstin: z.string().optional().default(''),
      address: z.string().optional().default(''),
      state: z.string().optional().default(''),
      phone: z.string().optional().default(''),
      email: z.string().optional().default('')
    })
    .default({ name: 'Walk-in Customer' }),
  placeOfSupply: z.string().optional().default(''),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional().default(''),
  terms: z.string().optional().default(''),
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
    .default({})
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial();
