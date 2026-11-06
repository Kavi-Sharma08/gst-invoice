import { Router } from 'express';
import * as invoiceController from './invoices.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate, validateObjectId } from '../../middleware/validate.js';
import {
  invoiceCreateSchema,
  invoiceUpdateSchema,
  invoiceListQuerySchema
} from './invoices.schema.js';
import { emailRoutes } from '../invoice-emails/invoice-emails.routes.js';

const router = Router();

router.use(authenticate);

// Specific collection routes (must precede /:id)
router.get('/', validate(invoiceListQuerySchema, 'query'), invoiceController.list);
router.get('/counts', invoiceController.getCounts);
router.get('/summary', invoiceController.getSummary);
router.get('/next-number', invoiceController.getNextNumber);
router.post('/', validate(invoiceCreateSchema), invoiceController.create);

// Parameterized item routes
router.param('id', validateObjectId('id'));

router.get('/:id', invoiceController.getOne);
router.put('/:id', validate(invoiceUpdateSchema), invoiceController.update);
router.delete('/:id', invoiceController.remove);
router.post('/:id/issue', invoiceController.issue);
router.post('/:id/cancel', invoiceController.cancel);
router.post('/:id/mark-paid', invoiceController.markPaid);
router.post('/:id/mark-unpaid', invoiceController.markUnpaid);
router.post('/:id/duplicate', invoiceController.duplicate);

// Nested email routes: /api/v1/invoices/:id/email and /api/v1/invoices/:id/email-status
router.use('/:id', emailRoutes);

export const invoiceRoutes = router;
