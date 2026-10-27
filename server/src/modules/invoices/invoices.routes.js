import { Router } from 'express';
import * as invoiceController from './invoices.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { invoiceCreateSchema, invoiceUpdateSchema } from './invoices.schema.js';
import { emailRoutes } from '../invoice-emails/invoice-emails.routes.js';

const router = Router();

router.use(authenticate);

router.get('/', invoiceController.list);
router.post('/', validate(invoiceCreateSchema), invoiceController.create);
router.get('/:id', invoiceController.getOne);
router.patch('/:id', validate(invoiceUpdateSchema), invoiceController.update);
router.delete('/:id', invoiceController.remove);
router.post('/:id/duplicate', invoiceController.duplicate);

// Nested email routes: /api/v1/invoices/:id/email and /api/v1/invoices/:id/email-status
router.use('/:id', emailRoutes);

export const invoiceRoutes = router;
