import { Router } from 'express';
import * as businessController from './business.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { businessProfileSchema } from './business.schema.js';

const router = Router();

router.use(authenticate);

router.get('/', businessController.getProfile);
router.post('/', validate(businessProfileSchema), businessController.saveProfile);
router.patch('/', validate(businessProfileSchema), businessController.saveProfile);

export const businessRoutes = router;
