import { Request, Response, NextFunction } from 'express';

// Almacenar conteos de requests por IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Configuración
const REQUESTS_PER_MINUTE = 15; // Máximo 15 requests por minuto
const WINDOW_MS = 60 * 1000; // Ventana de 1 minuto

// Limpiar conteos antiguos cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime + (60 * 60 * 1000)) { // 1 hora
      requestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const clientId = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  let clientData = requestCounts.get(clientId);
  
  // Si no existe el cliente o la ventana ha expirado, crear nueva entrada
  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientId, {
      count: 1,
      resetTime: now + WINDOW_MS
    });
    next();
    return;
  }
  
  // Verificar límite por minuto
  if (clientData.count >= REQUESTS_PER_MINUTE) {
    res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes. Intenta en un minuto.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
    return;
  }
  
  // Incrementar contador
  clientData.count++;
  
  // Añadir headers informativos
  res.set({
    'X-RateLimit-Limit': REQUESTS_PER_MINUTE.toString(),
    'X-RateLimit-Remaining': (REQUESTS_PER_MINUTE - clientData.count).toString(),
    'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString()
  });
  
  next();
};