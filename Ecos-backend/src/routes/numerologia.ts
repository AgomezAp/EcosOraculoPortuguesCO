import { Router } from 'express';
import { ChatController } from '../controllers/numerologia';

const router = Router();
const chatController = new ChatController();

// Ruta principal para chat con numerólogo
router.post('/api/numerology/numerologist', chatController.chatWithNumerologist);

// Ruta para obtener información del numerólogo
router.get('/api/numerology/numerologist/info', chatController.getNumerologyInfo);

// Ruta de prueba para verificar que el servicio funciona
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Servicio de numerología funcionando correctamente',
    timestamp: new Date().toISOString(),
    endpoints: {
      chat: 'POST /api/numerology/numerologist',
      info: 'GET /api/numerology/numerologist/info',
      test: 'GET /api/numerology/test'
    }
  });
});

export default router;