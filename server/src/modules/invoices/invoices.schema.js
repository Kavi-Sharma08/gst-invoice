import { z } from 'zod';

export const invoiceItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Item description is required')
    .max(200, 'Description cannot exceed 200 characters'),
  hsnSac: z.string().trim().max(20, 'HSN/SAC cannot exceed 20 characters').optional().default(''),
  quantity: z
    .number()
    .min(0.001, 'Quantity must be greater than zero')
    .max(1000000, 'Quantity exceeds maximum limit'),
  unit: z.string().trim().max(20, 'Unit cannot exceed 20 characters').optional().default('Nos'),
  rate: z
    .number()
    .min(0, 'Rate cannot be negative')
    .max(100000000, 'Rate exceeds maximum allowable limit'),
  discount: z.number().min(0).max(100, 'Discount must be between 0% and 100%').optional().default(0),
  gstRate: z.number().min(0).max(100, 'GST rate must be between 0% and 100%').default(18)
});

export const invoiceCustomerSchema = z.object({
  id: z.string().optional().default(''),
  name: z.string().trim().min(1, 'Customer name is required').max(150, 'Name cannot exceed 150 characters'),
  gstin: z.string().trim().max(15, 'GSTIN cannot exceed 15 characters').optional().default(''),
  address: z.string().trim().max(300, 'Address cannot exceed 300 characters').optional().default(''),
  state: z.string().trim().max(100, 'State cannot exceed 100 characters').optional().default(''),
  phone: z.string().trim().max(25, 'Phone cannot exceed 25 characters').optional().default(''),
  email: z.string().trim().max(100, 'Email cannot exceed 100 characters').optional().default('')
});

export const invoiceCreateSchema = z.object({
  invoiceDate: z.string().trim().optional(),
  dueDate: z.string().trim().max(50).optional().default(''),
  currency: z.string().trim().max(10).optional().default('INR'),
  customerId: z.union([z.string(), z.number()]).optional().nullable().or(z.literal('')),
  customer: invoiceCustomerSchema.optional().default({ name: 'Walk-in Customer' }),
  placeOfSupply: z.string().trim().max(100, 'Place of supply cannot exceed 100 characters').optional().default(''),
  items: z
    .array(invoiceItemSchema)
    .min(1, 'At least one line item is required')
    .max(100, 'Invoice cannot contain more than 100 line items'),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().default(''),
  terms: z.string().trim().max(500, 'Terms cannot exceed 500 characters').optional().default(''),
  bankDetails: z
    .object({
      accountName: z.string().trim().max(100).optional().default(''),
      accountNumber: z.string().trim().max(50).optional().default(''),
      bankName: z.string().trim().max(100).optional().default(''),
      ifscCode: z.string().trim().max(20).optional().default(''),
      branch: z.string().trim().max(100).optional().default(''),
      upiId: z.string().trim().max(100).optional().default('')
    })
    .optional()
    .default({})
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial();

export const invoiceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(10),
  status: z.string().trim().optional(),
  q: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(), // Backwards compatibility with old search param
  customerId: z.string().trim().optional(),
  sort: z.string().trim().optional().default('-invoiceDate'),
  expand: z.union([z.string(), z.boolean()]).optional()
});
