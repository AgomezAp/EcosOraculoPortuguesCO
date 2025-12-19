import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, timeout } from 'rxjs';
import { environment } from '../environments/environments';

export interface DreamInterpreterData {
  name: string;
  title?: string;
  specialty: string;
  experience: string;
}

export interface ConversationMessage {
  role: 'user' | 'interpreter';
  message: string;
  timestamp: Date | string;
  id?: string;
  freeMessagesRemaining?: number;
  showPaywall?: boolean;
  isCompleteResponse?: boolean;
  isPrizeAnnouncement?: boolean;
}

export interface DreamChatRequest {
  interpreterData: DreamInterpreterData;
  userMessage: string;
  conversationHistory?: ConversationMessage[];
  // ✅ NOVOS CAMPOS para o sistema de 3 mensagens grátis
  messageCount?: number;
  isPremiumUser?: boolean;
}

export interface DreamChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  code?: string;
  timestamp: string;
  // ✅ NOVOS CAMPOS que o backend retorna
  freeMessagesRemaining?: number;
  showPaywall?: boolean;
  paywallMessage?: string;
  isCompleteResponse?: boolean;
}

export interface InterpreterInfo {
  success: boolean;
  interpreter: {
    name: string;
    title: string;
    specialty: string;
    description: string;
    services: string[];
  };
  freeMessagesLimit?: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class InterpretadorSuenosService {
  private apiUrl = `${environment.apiUrl}`;

  // Dados padrão do intérprete
  private defaultInterpreterData: DreamInterpreterData = {
    name: 'Mestra Alma',
    title: 'Guardiã dos Sonhos',
    specialty: 'Interpretação de sonhos e simbolismo onírico',
    experience: 'Séculos de experiência interpretando mensagens do subconsciente',
  };

  constructor(private http: HttpClient) {}

  /**
   * ✅ MÉTODO PRINCIPAL: Enviar mensagem com contador de mensagens
   */
  chatWithInterpreterWithCount(
    userMessage: string,
    messageCount: number,
    isPremiumUser: boolean,
    conversationHistory?: ConversationMessage[]
  ): Observable<DreamChatResponse> {
    const request: DreamChatRequest = {
      interpreterData: this.defaultInterpreterData,
      userMessage: userMessage.trim(),
      conversationHistory,
      messageCount,
      isPremiumUser,
    };

    console.log('📤 Enviando mensagem de sonhos:', {
      messageCount: request.messageCount,
      isPremiumUser: request.isPremiumUser,
      userMessage: request.userMessage.substring(0, 50) + '...',
    });

    return this.http
      .post<DreamChatResponse>(`${this.apiUrl}interpretador-sueno`, request)
      .pipe(
        timeout(60000),
        map((response: DreamChatResponse) => {
          console.log('📥 Resposta de sonhos:', {
            success: response.success,
            freeMessagesRemaining: response.freeMessagesRemaining,
            showPaywall: response.showPaywall,
            isCompleteResponse: response.isCompleteResponse,
          });

          if (response.success) {
            return response;
          }
          throw new Error(response.error || 'Resposta inválida do servidor');
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Erro na comunicação com intérprete:', error);
          return of({
            success: false,
            error: this.getErrorMessage(error),
            timestamp: new Date().toISOString(),
          } as DreamChatResponse);
        })
      );
  }

  /**
   * Método legado para compatibilidade
   */
  chatWithInterpreter(request: DreamChatRequest): Observable<DreamChatResponse> {
    const fullRequest: DreamChatRequest = {
      ...request,
      interpreterData: request.interpreterData || this.defaultInterpreterData,
      messageCount: request.messageCount || 1,
      isPremiumUser: request.isPremiumUser || false,
    };

    return this.http
      .post<DreamChatResponse>(`${this.apiUrl}interpretador-sueno`, fullRequest)
      .pipe(
        timeout(30000),
        catchError((error: HttpErrorResponse) => {
          console.error('Erro em chatWithInterpreter:', error);
          return of({
            success: false,
            error: this.getErrorMessage(error),
            timestamp: new Date().toISOString(),
          } as DreamChatResponse);
        })
      );
  }

  /**
   * Obter informações do intérprete
   */
  getInterpreterInfo(): Observable<InterpreterInfo> {
    return this.http
      .get<InterpreterInfo>(`${this.apiUrl}interpretador-sueno/info`)
      .pipe(
        timeout(10000),
        catchError((error: HttpErrorResponse) => {
          console.error('Erro obtendo info do intérprete:', error);
          return of({
            success: false,
            interpreter: {
              name: 'Mestra Alma',
              title: 'Guardiã dos Sonhos',
              specialty: 'Interpretação de sonhos e simbolismo onírico',
              description: 'Erro ao conectar com o intérprete',
              services: [],
            },
            freeMessagesLimit: 3,
            timestamp: new Date().toISOString(),
          } as InterpreterInfo);
        })
      );
  }

  /**
   * Tratamento de erros HTTP
   */
  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 429) {
      return 'Você fez muitas consultas. Por favor, aguarde um momento antes de continuar.';
    }

    if (error.status === 503) {
      return 'O serviço está temporariamente indisponível. Tente novamente em alguns minutos.';
    }

    if (error.status === 0) {
      return 'Não foi possível conectar com o intérprete de sonhos. Tente novamente em alguns minutos.';
    }

    if (error.error?.code === 'RATE_LIMIT_EXCEEDED') {
      return 'Muitas solicitações. Por favor, aguarde um momento.';
    }

    if (error.error?.code === 'ALL_MODELS_UNAVAILABLE') {
      return 'Todos os modelos de IA estão temporariamente indisponíveis. Tente novamente em alguns minutos.';
    }

    return 'Desculpe, as energias oníricas estão perturbadas neste momento. Tente novamente mais tarde.';
  }
}