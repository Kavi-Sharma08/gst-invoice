import { Router } from 'express';
import { isDBConnected } from '../../infrastructure/database/mongodb.js';

const router = Router();

router.get('/', (req, res) => {
  const dbStatus = isDBConnected();
  const statusCode = dbStatus ? 200 : 503;

  res.status(statusCode).json({
    status: dbStatus ? 'healthy' : 'degraded',
    api: true,
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

export const healthRoutes = router;
