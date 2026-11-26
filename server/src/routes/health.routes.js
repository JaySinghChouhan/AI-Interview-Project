import { Router } from 'express';

const router = Router();

router.get('/', (_request, response) => {
  response.status(200).json({
    success: true,
    data: { status: 'ok' },
    message: 'API is healthy',
  });
});

export default router;
