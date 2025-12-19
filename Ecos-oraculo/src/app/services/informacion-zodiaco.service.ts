import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../environments/environmets.prod';

// ✅ Interfaces atualizadas para o backend
export interface AstrologerData {
  name: string;
  title: string;
  specialty: string;
  experience: string;
}

export interface ZodiacRequest {
  zodiacData: AstrologerData;
  userMessage: string;
  birthDate?: string;
  zodiacSign?: string;
  conversationHistory?: Array<{
    role: 'user' | 'astrologer';
    message: string;
  }>;
  messageCount?: number;
  isPremiumUser?: boolean;
}

export interface ZodiacResponse {
  success: boolean;
  response?: string;
  error?: string;
  code?: string;
  timestamp: string;
  freeMessagesRemaining?: number;
  showPaywall?: boolean;
  paywallMessage?: string;
  isCompleteResponse?: boolean;
}

export interface AstrologerInfoResponse {
  success: boolean;
  astrologer: {
    name: string;
    title: string;
    specialty: string;
    description: string;
    services: string[];
  };
  freeMessagesLimit: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class InformacionZodiacoService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Envia uma mensagem ao astrólogo e recebe uma resposta
   */
  chatWithAstrologer(request: ZodiacRequest): Observable<ZodiacResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http
      .post<ZodiacResponse>(`${this.apiUrl}api/zodiaco/chat`, request, {
        headers,
      })
      .pipe(
        timeout(60000), // 60 segundos de timeout
        catchError((error) => {
          console.error('Erro em chatWithAstrologer:', error);

          let errorMessage =
            'Erro ao se comunicar com o astrólogo. Por favor, tente novamente.';
          let errorCode = 'NETWORK_ERROR';

          if (error.status === 429) {
            errorMessage =
              'Muitas consultas. Por favor, aguarde um momento antes de continuar.';
            errorCode = 'RATE_LIMIT';
          } else if (error.status === 503) {
            errorMessage =
              'O serviço está temporariamente indisponível. Tente novamente em alguns minutos.';
            errorCode = 'SERVICE_UNAVAILABLE';
          } else if (error.status === 400) {
            errorMessage =
              error.error?.error || 'Solicitação inválida. Verifique sua mensagem.';
            errorCode = error.error?.code || 'BAD_REQUEST';
          } else if (error.status === 401) {
            errorMessage = 'Erro de autenticação com o serviço.';
            errorCode = 'AUTH_ERROR';
          } else if (error.name === 'TimeoutError') {
            errorMessage =
              'A consulta demorou muito. Por favor, tente novamente.';
            errorCode = 'TIMEOUT';
          }

          return throwError(() => ({
            success: false,
            error: errorMessage,
            code: errorCode,
            timestamp: new Date().toISOString(),
          }));
        })
      );
  }

  /**
   * Obtém informações do astrólogo
   */
  getAstrologerInfo(): Observable<AstrologerInfoResponse> {
    return this.http
      .get<AstrologerInfoResponse>(`${this.apiUrl}api/zodiac/info`)
      .pipe(
        timeout(10000),
        catchError((error) => {
          console.error('Erro em getAstrologerInfo:', error);
          return throwError(() => ({
            success: false,
            error: 'Erro ao obter informações do astrólogo',
            timestamp: new Date().toISOString(),
          }));
        })
      );
  }

  /**
   * Calcula o signo zodiacal com base na data de nascimento
   */
  calculateZodiacSign(birthDate: string): string {
    try {
      const date = new Date(birthDate);
      const month = date.getMonth() + 1;
      const day = date.getDate();

      if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
        return 'Áries ♈';
      if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
        return 'Touro ♉';
      if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
        return 'Gêmeos ♊';
      if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
        return 'Câncer ♋';
      if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
        return 'Leão ♌';
      if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
        return 'Virgem ♍';
      if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
        return 'Libra ♎';
      if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
        return 'Escorpião ♏';
      if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
        return 'Sagitário ♐';
      if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
        return 'Capricórnio ♑';
      if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
        return 'Aquário ♒';
      if ((month === 2 && day >= 19) || (month === 3 && day <= 20))
        return 'Peixes ♓';

      return 'Signo desconhecido';
    } catch {
      return 'Data inválida';
    }
  }
}