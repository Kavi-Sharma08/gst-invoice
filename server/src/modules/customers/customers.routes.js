import { Router } from 'express';
import * as customerController from './customers.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate, validateObjectId } from '../../middleware/validate.js';
import {
  customerSchema,
  customerUpdateSchema,
  customerListQuerySchema,
  customerSearchQuerySchema
} from './customers.schema.js';

const router = Router();

router.use(authenticate);

// ── Collection routes (must precede /:id to avoid being caught by validateObjectId) ──
router.get('/', validate(customerListQuerySchema, 'query'), customerController.list);
router.get('/search', validate(customerSearchQuerySchema, 'query'), customerController.search);
router.post('/', validate(customerSchema), customerController.create);

// ── Parameterised routes ──────────────────────────────────────────────────────
router.param('id', validateObjectId('id'));

router.get('/:id', customerController.getOne);
router.patch('/:id', validate(customerUpdateSchema), customerController.update);
router.delete('/:id', customerController.remove);
router.post('/:id/archive', customerController.archive);
router.post('/:id/unarchive', customerController.unarchive);

export const customerRoutes = router;
