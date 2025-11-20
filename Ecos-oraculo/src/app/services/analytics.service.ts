import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environmets.prod';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';
export interface AnalyticsData {
  visitCount: number;
  visitedServices: string[];
  userZodiacSign: string | null;
  sessionDuration: number;
  deviceInfo: any;
  timestamp: string;
  userId: string;
  serviceStats: any;
  lastVisit: string;
  browserInfo: any;
}
@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private cookieService: CookieService) {}

  // ✅ MÉTODOS DE API BÁSICOS
  sendUserAnalytics(data: AnalyticsData): Observable<any> {
    return this.http.post(`${this.apiUrl}analytics/user-interaction`, data);
  }

  sendPageAnalytics(pageData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}analytics/page-view`, pageData);
  }

  sendAnalyticsBatch(data: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}analytics/batch`, { data });
  }

  getAnalyticsDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}analytics/dashboard`);
  }

  getPopularServices(): Observable<any> {
    return this.http.get(`${this.apiUrl}analytics/popular-services`);
  }

  getUserAnalytics(period: string): Observable<any> {
    return this.http.get(`${this.apiUrl}analytics/users/${period}`);
  }

  // ✅ MÉTODOS PRINCIPALES PARA EL COMPONENTE

  /**
   * Recolectar y enviar analytics completos del usuario
   */
  async collectAndSendUserAnalytics(sessionStartTime: Date): Promise<any> {
    const analyticsData: AnalyticsData = {
      visitCount: parseInt(this.cookieService.get('visitCount') || '0'),
      visitedServices: JSON.parse(this.cookieService.get('visitedServices') || '[]'),
      userZodiacSign: this.cookieService.get('userZodiacSign'),
      sessionDuration: this.calculateSessionDuration(sessionStartTime),
      deviceInfo: this.getDeviceInfo(),
      timestamp: new Date().toISOString(),
      userId: this.generateAnonymousId(),
      serviceStats: JSON.parse(this.cookieService.get('serviceStats') || '{}'),
      lastVisit: this.cookieService.get('lastVisit') || new Date().toISOString(),
      browserInfo: this.getBrowserInfo(),
    };

    try {
      const response = await this.sendUserAnalytics(analyticsData).toPromise();
      console.log('📊 Analytics enviados a BD:', analyticsData);
      return response;
    } catch (error) {
      console.error('❌ Error enviando analytics:', error);
      this.saveAnalyticsLocally(analyticsData);
      throw error;
    }
  }

  /**
   * Enviar page view analytics
   */
  async sendPageViewAnalytics(route: string, sessionStartTime: Date): Promise<any> {
    const pageData = {
      page: route,
      userId: this.generateAnonymousId(),
      timestamp: new Date().toISOString(),
      referrer: document.referrer,
      sessionDuration: this.calculateSessionDuration(sessionStartTime),
    };

    try {
      const response = await this.sendPageAnalytics(pageData).toPromise();
      console.log('📄 Page view analytics enviados:', pageData);
      return response;
    } catch (error) {
      console.error('Error enviando page analytics:', error);
      throw error;
    }
  }

  /**
   * Enviar analytics pendientes del localStorage
   */
  async sendPendingAnalytics(): Promise<any> {
    try {
      const pendingAnalytics = JSON.parse(
        localStorage.getItem('pendingAnalytics') || '[]'
      );

      if (pendingAnalytics.length > 0) {
        const response = await this.sendAnalyticsBatch(pendingAnalytics).toPromise();
        localStorage.removeItem('pendingAnalytics');
        console.log('📤 Analytics pendientes enviados');
        return response;
      }
    } catch (error) {
      console.error('Error enviando analytics pendientes:', error);
      throw error;
    }
  }

  // ✅ MÉTODOS AUXILIARES (MOVIDOS DEL COMPONENTE)

  /**
   * Calcular duración de sesión
   */
  calculateSessionDuration(sessionStartTime: Date): number {
    const now = new Date();
    return Math.round((now.getTime() - sessionStartTime.getTime()) / 1000); // en segundos
  }

  /**
   * Obtener información del dispositivo
   */
  getDeviceInfo(): any {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: navigator.cookieEnabled,
    };
  }

  /**
   * Obtener información del navegador
   */
  getBrowserInfo(): any {
    const ua = navigator.userAgent;
    let browser = 'Unknown';

    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    return {
      name: browser,
      version: this.getBrowserVersion(ua),
      mobile: /Mobi|Android/i.test(ua),
    };
  }

  /**
   * Obtener versión del navegador
   */
  private getBrowserVersion(ua: string): string {
    const match = ua.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  /**
   * Generar o obtener ID anónimo del usuario
   */
  generateAnonymousId(): string {
    let userId = this.cookieService.get('anonymousUserId');

    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      this.cookieService.set('anonymousUserId', userId, 365);
    }

    return userId;
  }

  /**
   * Trackear popularidad de servicio
   */
  trackServicePopularity(serviceName: string): void {
    let serviceStats = JSON.parse(this.cookieService.get('serviceStats') || '{}');
    serviceStats[serviceName] = (serviceStats[serviceName] || 0) + 1;
    this.cookieService.set('serviceStats', JSON.stringify(serviceStats), 30);

    console.log(`📈 Servicio ${serviceName} visitado. Total: ${serviceStats[serviceName]}`);
  }

  /**
   * Trackear visita a servicio específico
   */
  trackServiceVisit(service: string): void {
    let visitedServices = JSON.parse(this.cookieService.get('visitedServices') || '[]');

    if (!visitedServices.includes(service)) {
      visitedServices.push(service);
      this.cookieService.set('visitedServices', JSON.stringify(visitedServices), 30);
    }

    // Incrementar contador del servicio específico
    const serviceKey = `service_${service.replace('/', '')}`;
    const currentCount = parseInt(this.cookieService.get(serviceKey) || '0');
    this.cookieService.set(serviceKey, (currentCount + 1).toString(), 30);
  }

  /**
   * Verificar si hay consentimiento de cookies
   */
  hasConsent(): boolean {
    return this.cookieService.get('cookieConsent') === 'accepted';
  }

  /**
   * Guardar analytics localmente como backup
   */
  private saveAnalyticsLocally(data: any): void {
    try {
      let localAnalytics = JSON.parse(localStorage.getItem('pendingAnalytics') || '[]');
      localAnalytics.push(data);
      localStorage.setItem('pendingAnalytics', JSON.stringify(localAnalytics));
      console.log('💾 Analytics guardados localmente como backup');
    } catch (error) {
      console.error('Error guardando analytics localmente:', error);
    }
  }

  // ✅ MÉTODOS ADICIONALES ÚTILES

  /**
   * Obtener estadísticas locales del usuario
   */
  getLocalUserStats(): any {
    return {
      visitCount: parseInt(this.cookieService.get('visitCount') || '0'),
      visitedServices: JSON.parse(this.cookieService.get('visitedServices') || '[]'),
      serviceStats: JSON.parse(this.cookieService.get('serviceStats') || '{}'),
      userZodiacSign: this.cookieService.get('userZodiacSign'),
      lastVisit: this.cookieService.get('lastVisit'),
      userId: this.cookieService.get('anonymousUserId'),
      isReturningUser: parseInt(this.cookieService.get('visitCount') || '0') > 1
    };
  }

  /**
   * Limpiar todas las cookies de analytics
   */
  clearAllAnalytics(): void {
    const cookieKeys = [
      'cookieConsent', 'visitCount', 'anonymousUserId', 
      'visitedServices', 'serviceStats', 'lastVisit', 'userZodiacSign'
    ];
    
    cookieKeys.forEach(key => {
      this.cookieService.delete(key);
    });
    
    localStorage.removeItem('pendingAnalytics');
    console.log('🧹 Todos los datos de analytics limpiados');
  }

  /**
   * Obtener resumen de actividad del usuario
   */
  getUserActivitySummary(): any {
    const stats = this.getLocalUserStats();
    const serviceStats = stats.serviceStats;
    
    // Servicio más usado
    let mostUsedService = 'ninguno';
    let maxCount = 0;
    
    for (const [service, count] of Object.entries(serviceStats)) {
      if ((count as number) > maxCount) {
        maxCount = count as number;
        mostUsedService = service;
      }
    }

    return {
      totalVisits: stats.visitCount,
      totalServicesUsed: stats.visitedServices.length,
      mostUsedService: mostUsedService,
      mostUsedServiceCount: maxCount,
      isReturningUser: stats.isReturningUser,
      zodiacSign: stats.userZodiacSign,
      lastVisit: stats.lastVisit,
      userId: stats.userId
    };
  }

  /**
   * Debug: Mostrar toda la información de analytics
   */
  debugAnalytics(): void {
    console.log('🔍 === DEBUG ANALYTICS ===');
    console.log('Consentimiento:', this.cookieService.get('cookieConsent'));
    console.log('Stats locales:', this.getLocalUserStats());
    console.log('Resumen actividad:', this.getUserActivitySummary());
    console.log('Analytics pendientes:', localStorage.getItem('pendingAnalytics'));
    console.log('Todas las cookies:', this.cookieService.getAll());
    console.log('🔍 === FIN DEBUG ===');
  }

  /**
   * Verificar si hay analytics pendientes
   */
  hasPendingAnalytics(): boolean {
    const pending = localStorage.getItem('pendingAnalytics');
    return pending ? JSON.parse(pending).length > 0 : false;
  }

  /**
   * Obtener configuración de environment
   */
  getApiConfig(): any {
    return {
      apiUrl: this.apiUrl,
      hasValidUrl: !!this.apiUrl && this.apiUrl !== '',
      environment: environment
    };
  }

  /**
   * Test de conectividad con la API
   */
  async testApiConnection(): Promise<boolean> {
    try {
      await this.getAnalyticsDashboard().toPromise();
      console.log('✅ Conexión con API exitosa');
      return true;
    } catch (error) {
      console.error('❌ Error de conexión con API:', error);
      return false;
    }
  }
}