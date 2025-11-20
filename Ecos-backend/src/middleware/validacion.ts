import { Request, Response, NextFunction } from 'express';
import { ChatRequest } from '../interfaces/helpers';

export const validateChatMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { saintData, userMessage }: ChatRequest = req.body;

    // Validar que existan los datos requeridos
    if (!saintData || !userMessage) {
      res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos: saintData y userMessage son obligatorios',
        code: 'MISSING_REQUIRED_DATA'
      });
      return;
    }

    // Validar datos del santo
    if (!saintData.name || typeof saintData.name !== 'string' || saintData.name.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El santo debe tener un nombre válido',
        code: 'INVALID_SAINT_NAME'
      });
      return;
    }

    // Validar mensaje del usuario
    if (typeof userMessage !== 'string' || userMessage.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El mensaje del usuario debe ser una cadena no vacía',
        code: 'INVALID_USER_MESSAGE'
      });
      return;
    }

    // Validar longitud del mensaje
    if (userMessage.length > 1000) {
      res.status(400).json({
        success: false,
        error: 'El mensaje es demasiado largo (máximo 1000 caracteres)',
        code: 'MESSAGE_TOO_LONG'
      });
      return;
    }

    // Validar caracteres peligrosos o contenido inapropiado básico
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(userMessage)) {
        res.status(400).json({
          success: false,
          error: 'El mensaje contiene contenido no permitido',
          code: 'INVALID_CONTENT'
        });
        return;
      }
    }

    // Si todo está bien, continuar
    next();

  } catch (error) {
    console.error('Error en validación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno en la validación',
      code: 'VALIDATION_ERROR'
    });
  }
  
};

// NUEVO MIDDLEWARE PARA EL INTÉRPRETE DE SUEÑOS
export const validateDreamChatMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { interpreterData, userMessage, conversationHistory } = req.body;

    console.log('🔮 Validando request de sueños:', { 
      interpreterData: interpreterData ? 'presente' : 'ausente', 
      userMessage: userMessage ? 'presente' : 'ausente' 
    });

    // Validar que existan los datos requeridos
    if (!interpreterData || !userMessage) {
      res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos: interpreterData y userMessage son obligatorios',
        code: 'MISSING_REQUIRED_DATA'
      });
      return;
    }

    // Validar datos del intérprete
    if (!interpreterData.name || typeof interpreterData.name !== 'string' || interpreterData.name.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El intérprete debe tener un nombre válido',
        code: 'INVALID_INTERPRETER_NAME'
      });
      return;
    }

    // Validar mensaje del usuario
    if (typeof userMessage !== 'string' || userMessage.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'El mensaje del usuario debe ser una cadena no vacía',
        code: 'INVALID_USER_MESSAGE'
      });
      return;
    }

    // Validar longitud del mensaje (más permisivo para sueños)
    if (userMessage.length > 1500) {
      res.status(400).json({
        success: false,
        error: 'El mensaje es demasiado largo (máximo 1500 caracteres)',
        code: 'MESSAGE_TOO_LONG'
      });
      return;
    }

    // Validar historial de conversación si existe
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (!msg.role || !msg.message || !['user', 'interpreter'].includes(msg.role)) {
          res.status(400).json({
            success: false,
            error: 'Formato de historial de conversación inválido',
            code: 'INVALID_CONVERSATION_HISTORY'
          });
          return;
        }
      }
    }

    // Validar caracteres peligrosos
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(userMessage)) {
        res.status(400).json({
          success: false,
          error: 'El mensaje contiene contenido no permitido',
          code: 'INVALID_CONTENT'
        });
        return;
      }
    }

    console.log('✅ Validación de sueños exitosa');
    next();

  } catch (error) {
    console.error('❌ Error en validación de sueños:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno en la validación',
      code: 'VALIDATION_ERROR'
    });
  }
};