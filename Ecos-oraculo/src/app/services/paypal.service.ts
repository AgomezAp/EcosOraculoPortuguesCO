import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../environments/environments';

export interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface PayPalOrderRequest {
  amount?: string;
  currency?: string;
  serviceName?: string;
  returnPath?: string;  // Ruta del servicio para volver después del pago
  cancelPath?: string;  // Ruta para cancelación
}

export interface PayPalTokenVerification {
  valid: boolean;
  status: string;
  timestamp: number;
  orderId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaypalService {
  private apiUrl = environment.apiUrl || 'http://localhost:3010';

  constructor(private http: HttpClient) {}

  /**
   * Crea una orden de pago en PayPal
   * @param orderData Datos de la orden (monto, servicio, rutas de retorno)
   * @returns Observable con la respuesta de PayPal incluyendo los links de aprobación
   */
  createOrder(orderData?: PayPalOrderRequest): Observable<PayPalOrderResponse> {
    return this.http.post<PayPalOrderResponse>(`${this.apiUrl}api/paypal/create-order`, orderData || {});
  }

  /**
   * Inicia el flujo de pago redirigiendo al usuario a PayPal
   * @param orderData Datos de la orden incluyendo rutas de retorno específicas del servicio
   * @returns Promise que se resuelve cuando se crea la orden y redirige al usuario
   */
  async initiatePayment(orderData?: PayPalOrderRequest): Promise<void> {
    try {
      const response = await firstValueFrom(this.createOrder(orderData));
      
      // Buscar el link de aprobación
      const approveLink = response.links?.find(link => link.rel === 'approve');

      if (approveLink) {
        // Guardar información en localStorage para verificar después
        localStorage.setItem('paypal_pending_order', response.id);
        localStorage.setItem('paypal_payment_initiated', new Date().toISOString());
        
        // Redirigir a PayPal
        window.location.href = approveLink.href;
      } else {
        throw new Error('No se encontró el link de aprobación de PayPal');
      }
    } catch (error) {
      console.error('Error al iniciar pago de PayPal:', error);
      throw error;
    }
  }

  /**
   * Verifica el token JWT del pago
   * @param token Token JWT devuelto después del pago
   * @returns Observable con la verificación del token
   */
  verifyPaymentToken(token: string): Observable<PayPalTokenVerification> {
    return this.http.post<PayPalTokenVerification>(
      `${this.apiUrl}api/paypal/verify-token`, 
      { token }
    );
  }

  /**
   * Verifica si hay un pago completado en los parámetros de URL
   * @returns Información del pago si existe, null si no
   */
  checkPaymentStatusFromUrl(): { status: string; token: string } | null {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const token = urlParams.get('token');

    if (status && token) {
      return { status, token };
    }

    return null;
  }

  /**
   * Verifica y procesa un pago completado
   * ⚠️ NO guarda estado global - cada componente maneja su propio pago
   * @param token Token JWT del pago
   * @returns Promise con el resultado de la verificación
   */
  async verifyAndProcessPayment(token: string): Promise<PayPalTokenVerification> {
    try {
      const verification = await firstValueFrom(this.verifyPaymentToken(token));
      
      if (verification.valid && verification.status === 'approved') {
        // Limpiar solo información temporal de la orden pendiente
        localStorage.removeItem('paypal_pending_order');
        localStorage.removeItem('paypal_payment_initiated');
        
        // ✅ NO GUARDAR ESTADO GLOBAL DE PAGO
        // Cada componente debe guardar su propio estado en sessionStorage
        // Ejemplo: sessionStorage.setItem('hasUserPaidForVocational_berufskarte', 'true');
      }
      
      return verification;
    } catch (error) {
      console.error('Error al verificar pago:', error);
      throw error;
    }
  }

  /**
   * Limpia toda la información de pago almacenada (solo temporal)
   */
  clearPaymentData(): void {
    localStorage.removeItem('paypal_pending_order');
    localStorage.removeItem('paypal_payment_initiated');
  }
}
