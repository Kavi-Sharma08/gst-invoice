import { Router } from 'express';
import * as emailController from './invoice-emails.controller.js';
import { validate } from '../../middleware/validate.js';
import { sendEmailSchema } from './invoice-emails.schema.js';

const router = Router({ mergeParams: true });

// POST /api/v1/invoices/:id/email
router.post('/email', validate(sendEmailSchema), emailController.sendEmail);

// GET /api/v1/invoices/:id/email-status
router.get('/email-status', emailController.getEmailStatus);

export const emailRoutes = router;
