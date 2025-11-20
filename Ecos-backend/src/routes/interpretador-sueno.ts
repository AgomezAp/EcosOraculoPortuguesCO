import { Router, Request, Response } from 'express';
import { rateLimiterMiddleware } from '../middleware/rate-limiting';
import {validateDreamChatMiddleware } from '../middleware/validacion';
import { ChatController } from '../controllers/interpretador-sueno';
const router = Router();
const chatController = new ChatController();
router.post('/interpretador-sueno', 
  rateLimiterMiddleware,
  validateDreamChatMiddleware,
  chatController.chatWithDreamInterpreter
);

router.get('/interpretador-sueno/info', 
  rateLimiterMiddleware,
  chatController.getDreamInterpreterInfo
);
export default router;