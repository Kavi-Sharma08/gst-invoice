import { z } from 'zod';

export const sendEmailSchema = z.object({
  recipientEmail: z.string().email('A valid recipient email address is required'),
  recipientName: z.string().optional().default('')
});
