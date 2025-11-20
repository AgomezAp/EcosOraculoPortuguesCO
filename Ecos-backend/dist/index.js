"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Cargar variables de entorno
dotenv_1.default.config();
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
}
catch (error) {
    console.error('❌ Error verificando dependencias:', error);
    process.exit(1);
}
// Función async para manejar la importación del servidor
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Iniciando servidor Express...');
        try {
            yield Promise.resolve().then(() => __importStar(require('./models/server')));
            console.log('✅ Servidor iniciado correctamente');
        }
        catch (error) {
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
    });
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
