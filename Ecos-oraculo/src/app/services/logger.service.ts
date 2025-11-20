import { Injectable } from '@angular/core';

/**
 * Servicio centralizado de logging
 * Solo muestra logs en entorno de desarrollo
 * En producción (echoesoftheoracle.com) los logs están deshabilitados
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private isDevelopment: boolean;

  constructor() {
    // Detectar si estamos en desarrollo
    // En producción: echoesoftheoracle.com
    // En desarrollo: localhost o cualquier otro dominio
    this.isDevelopment = !window.location.hostname.includes('echoesoftheoracle.com');
  }

  /**
   * Log de información general
   * Equivalente a console.log()
   */
  log(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(`[LOG] ${message}`, ...args);
    }
  }

  /**
   * Log de advertencias
   * Equivalente a console.warn()
   */
  warn(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log de errores
   * Equivalente a console.error()
   * Los errores SÍ se muestran en producción por seguridad
   */
  error(message: string, error?: any): void {
    // Los errores se muestran siempre, incluso en producción
    console.error(`[ERROR] ${message}`, error);
  }

  /**
   * Log de información importante
   * Equivalente a console.info()
   */
  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log de debug para análisis profundo
   * Solo visible en desarrollo
   */
  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log de tabla para visualizar objetos/arrays
   * Equivalente a console.table()
   */
  table(data: any, columns?: string[]): void {
    if (this.isDevelopment) {
      if (columns) {
        console.table(data, columns);
      } else {
        console.table(data);
      }
    }
  }

  /**
   * Agrupa logs relacionados
   * Equivalente a console.group()
   */
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(`[GROUP] ${label}`);
    }
  }

  /**
   * Cierra un grupo de logs
   * Equivalente a console.groupEnd()
   */
  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Verifica si estamos en modo desarrollo
   */
  isDevMode(): boolean {
    return this.isDevelopment;
  }
}
