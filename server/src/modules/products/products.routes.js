import { Router } from 'express';
import * as productController from './products.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { productSchema, productUpdateSchema } from './products.schema.js';

const router = Router();

router.use(authenticate);

router.get('/', productController.list);
router.post('/', validate(productSchema), productController.create);
router.get('/:id', productController.getOne);
router.patch('/:id', validate(productUpdateSchema), productController.update);
router.delete('/:id', productController.remove);

export const productRoutes = router;
