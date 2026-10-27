import { Router } from 'express';
import * as customerController from './customers.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { customerSchema, customerUpdateSchema } from './customers.schema.js';

const router = Router();

router.use(authenticate);

router.get('/', customerController.list);
router.post('/', validate(customerSchema), customerController.create);
router.get('/:id', customerController.getOne);
router.patch('/:id', validate(customerUpdateSchema), customerController.update);
router.delete('/:id', customerController.remove);

export const customerRoutes = router;
