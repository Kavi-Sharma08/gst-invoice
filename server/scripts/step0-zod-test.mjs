// Zod test with better error logging
import { z } from 'zod';

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(150),
  gstin: z.string().max(15).optional().default(''),
  customerType: z.enum(['B2B', 'B2C']).optional().default('B2B'),
  address: z.string().max(500).optional().default(''),
  state: z.string().max(100).optional().default(''),
  email: z.string().email('Invalid email').or(z.literal('')).optional().default(''),
  phone: z.string().max(20).optional().default('')
});

const customerUpdateSchema = customerSchema.partial();

function test(label, schema, data) {
  console.log(`\n=== ${label} ===`);
  const result = schema.safeParse(data);
  console.log('success:', result.success);
  if (!result.success) {
    const errs = result.error.issues || result.error.errors;
    console.log('errors:', JSON.stringify(errs, null, 2));
  } else {
    console.log('parsed:', JSON.stringify(result.data));
  }
}

test('POST customerType=registered', customerSchema, { name: 'Test Co', customerType: 'registered' });
test('PATCH customerType=registered', customerUpdateSchema, { customerType: 'registered' });
test('POST customerType=unregistered', customerSchema, { name: 'Test Co', customerType: 'unregistered' });
test('POST no customerType (default)', customerSchema, { name: 'Test Co' });
test('POST customerType=B2B', customerSchema, { name: 'Test Co', customerType: 'B2B' });
test('POST customerType=B2C', customerSchema, { name: 'Test Co', customerType: 'B2C' });
