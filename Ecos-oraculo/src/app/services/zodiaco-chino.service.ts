import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';

interface ChineseZodiacData {
  name: string;
  specialty: string;
  experience: string;
}

interface ChatMessage {
  role: 'user' | 'master';
  message: string;
  timestamp?: string;
}

interface ChineseZodiacRequest {
  zodiacData: ChineseZodiacData;
  userMessage: string;
  birthYear?: string;
  birthDate?: string;
  fullName?: string;
  conversationHistory?: ChatMessage[];
  // ✅ NOVOS CAMPOS para o sistema de 3 mensagens grátis
  messageCount?: number;
  isPremiumUser?: boolean;
}

interface ChatResponse {
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

interface MasterInfo {
  success: boolean;
  master: {
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
  providedIn: 'root'
})
export class ZodiacoChinoService {
  private apiUrl = `${environment.apiUrl}api/zodiaco-chino`
  
  constructor(private http: HttpClient) {}

  getMasterInfo(): Observable<MasterInfo> {
    return this.http.get<MasterInfo>(`${this.apiUrl}/info`);
  }

  /**
   * ✅ MÉTODO PRINCIPAL: Enviar mensagem com contador de mensagens
   */
  chatWithMasterWithCount(
    request: ChineseZodiacRequest,
    messageCount: number,
    isPremiumUser: boolean
  ): Observable<ChatResponse> {
    const fullRequest: ChineseZodiacRequest = {
      ...request,
      messageCount,
      isPremiumUser,
    };

    return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, fullRequest);
  }

  /**
   * Método legado para compatibilidade
   */
  chatWithMaster(request: ChineseZodiacRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, request);
  }
}