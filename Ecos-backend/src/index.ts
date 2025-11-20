import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

console.log('==========================================');
console.log('🔧 INICIANDO HAGIOGRAFÍA BACKEND');
console.log('==========================================');
console.log('📋 Configuración:');
console.log('  - Puerto:', process.env.PORT || 3001);
console.log('  - Frontend URL:', process.env.FRONTEND_URL || 'http://localhost:4200');
console.log('  - Gemini API Key:', process.env.GEMINI_API_KEY ? '✅ Configurada' : '❌ No encontrada');
console.log('  - Node ENV:', process.env.NODE_ENV || 'development');
console.log('==========================================');

// Verificar que las dependencias críticas están disponibles
try {
  console.log('📦 Verificando dependencias...');
  
  // Verificar Express
  require('express');
  console.log('  ✅ Express disponible');
  
  // Verificar CORS
  require('cors');
  console.log('  ✅ CORS disponible');
  
  // Verificar Gemini AI
  require('@google/generative-ai');
  console.log('  ✅ Google Generative AI disponible');
  
  console.log('📦 Todas las dependencias verificadas');
  
} catch (error) {
  console.error('❌ Error verificando dependencias:', error);
  process.exit(1);
}

// Función async para manejar la importación del servidor
async function startServer() {
  console.log('🚀 Iniciando servidor Express...');
  try {
    await import('./models/server');
    console.log('✅ Servidor iniciado correctamente');
  } catch (error) {
    console.error('❌ Error al importar server:', error);
    console.error('💡 Revisa las rutas en ./models/server.ts');
    
    if (error instanceof Error && error.message.includes('Missing parameter name')) {
      console.error('💡 Este error es causado por una ruta mal definida. Revisa tus rutas en busca de:');
      console.error('   - Parámetros vacíos: /api/:');
      console.error('   - Dobles dos puntos: /api/::id');
      console.error('   - Caracteres especiales: /api/:id-');
      console.error('   - Espacios después de : en rutas: /api/: id');
    }
    
    process.exit(1);
  }
}

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rechazada no manejada:', reason);
  process.exit(1);
});

// Iniciar el servidor
startServer();