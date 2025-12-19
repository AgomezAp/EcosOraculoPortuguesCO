import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../environments/environmets.prod';

export interface LoveExpert {
  name: string;
  title: string;
  specialty: string;
  description: string;
  services: string[];
}

export interface LoveExpertInfo {
  success: boolean;
  loveExpert: LoveExpert;
  timestamp: string;
}

export interface LoveCalculatorData {
  name: string;
  specialty: string;
  experience: string;
}

export interface LoveCalculatorRequest {
  loveCalculatorData: LoveCalculatorData;
  userMessage: string;
  person1Name?: string;
  person1BirthDate?: string;
  person2Name?: string;
  person2BirthDate?: string;
  conversationHistory?: ConversationMessage[];
}

export interface ConversationMessage {
  role: 'user' | 'love_expert';
  message: string;
  timestamp: Date;
  id?: string;
}

export interface LoveCalculatorResponse {
  success: boolean;
  response?: string;
  error?: string;
  code?: string;
  timestamp?: string;
  freeMessagesRemaining?: number; // ✅ NOVO
  showPaywall?: boolean; // ✅ NOVO
  paywallMessage?: string; // ✅ NOVO
  isCompleteResponse?: boolean; // ✅ NOVO
}

export interface CompatibilityData {
  person1Name: string;
  person1BirthDate: string;
  person2Name: string;
  person2BirthDate: string;
}

@Injectable({
  providedIn: 'root',
})
export class CalculadoraAmorService {
  private readonly apiUrl = `${environment.apiUrl}`;
  private conversationHistorySubject = new BehaviorSubject<
    ConversationMessage[]
  >([]);
  private compatibilityDataSubject =
    new BehaviorSubject<CompatibilityData | null>(null);

  public conversationHistory$ = this.conversationHistorySubject.asObservable();
  public compatibilityData$ = this.compatibilityDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Obtém informações do especialista em amor
   */
  getLoveExpertInfo(): Observable<LoveExpertInfo> {
    return this.http
      .get<LoveExpertInfo>(`${this.apiUrl}info`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Envia uma mensagem ao especialista em amor
   */
  chatWithLoveExpert(
    userMessage: string,
    person1Name?: string,
    person1BirthDate?: string,
    person2Name?: string,
    person2BirthDate?: string,
    conversationHistory?: Array<{
      role: 'user' | 'love_expert';
      message: string;
    }>,
    messageCount?: number, // ✅ NOVO
    isPremiumUser?: boolean // ✅ NOVO
  ): Observable<LoveCalculatorResponse> {
    const currentHistory = this.conversationHistorySubject.value;

    const requestData: LoveCalculatorRequest = {
      loveCalculatorData: {
        name: 'Mestra Valentina',
        specialty: 'Compatibilidade numerológica e análise de relacionamentos',
        experience:
          'Décadas analisando a compatibilidade através dos números do amor',
      },
      userMessage,
      person1Name,
      person1BirthDate,
      person2Name,
      person2BirthDate,
      conversationHistory: currentHistory,
    };

    return this.http
      .post<LoveCalculatorResponse>(`${this.apiUrl}chat`, requestData)
      .pipe(
        map((response: any) => {
          if (response.success && response.response) {
            // Adicionar mensagens à conversa
            this.addMessageToHistory('user', userMessage);
            this.addMessageToHistory('love_expert', response.response);
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Calcula a compatibilidade entre duas pessoas
   */
  calculateCompatibility(
    compatibilityData: CompatibilityData
  ): Observable<LoveCalculatorResponse> {
    // Salvar os dados de compatibilidade
    this.setCompatibilityData(compatibilityData);

    const message = `Quero conhecer a compatibilidade entre ${compatibilityData.person1Name} e ${compatibilityData.person2Name}. Por favor, analise nossa compatibilidade numerológica.`;

    return this.chatWithLoveExpert(
      message,
      compatibilityData.person1Name,
      compatibilityData.person1BirthDate,
      compatibilityData.person2Name,
      compatibilityData.person2BirthDate
    );
  }

  /**
   * Obtém conselhos de relacionamento
   */
  getRelationshipAdvice(question: string): Observable<LoveCalculatorResponse> {
    const compatibilityData = this.compatibilityDataSubject.value;

    return this.chatWithLoveExpert(
      question,
      compatibilityData?.person1Name,
      compatibilityData?.person1BirthDate,
      compatibilityData?.person2Name,
      compatibilityData?.person2BirthDate
    );
  }

  /**
   * Adiciona uma mensagem ao histórico de conversa
   */
  private addMessageToHistory(
    role: 'user' | 'love_expert',
    message: string
  ): void {
    const currentHistory = this.conversationHistorySubject.value;
    const newMessage: ConversationMessage = {
      role,
      message,
      timestamp: new Date(),
    };

    const updatedHistory = [...currentHistory, newMessage];
    this.conversationHistorySubject.next(updatedHistory);
  }

  /**
   * Define os dados de compatibilidade
   */
  setCompatibilityData(data: CompatibilityData): void {
    this.compatibilityDataSubject.next(data);
  }

  /**
   * Obtém os dados de compatibilidade atuais
   */
  getCompatibilityData(): CompatibilityData | null {
    return this.compatibilityDataSubject.value;
  }

  /**
   * Limpa o histórico de conversa
   */
  clearConversationHistory(): void {
    this.conversationHistorySubject.next([]);
  }

  /**
   * Limpa os dados de compatibilidade
   */
  clearCompatibilityData(): void {
    this.compatibilityDataSubject.next(null);
  }

  /**
   * Reinicia todo o serviço
   */
  resetService(): void {
    this.clearConversationHistory();
    this.clearCompatibilityData();
  }

  /**
   * Obtém o histórico atual de conversa
   */
  getCurrentHistory(): ConversationMessage[] {
    return this.conversationHistorySubject.value;
  }

  /**
   * Verifica se há dados de compatibilidade completos
   */
  hasCompleteCompatibilityData(): boolean {
    const data = this.compatibilityDataSubject.value;
    return !!(
      data?.person1Name &&
      data?.person1BirthDate &&
      data?.person2Name &&
      data?.person2BirthDate
    );
  }

  /**
   * Formata uma data para o backend
   */
  formatDateForBackend(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Valida os dados de compatibilidade
   */
  validateCompatibilityData(data: Partial<CompatibilityData>): string[] {
    const errors: string[] = [];

    if (!data.person1Name?.trim()) {
      errors.push('O nome da primeira pessoa é obrigatório');
    }

    if (!data.person1BirthDate?.trim()) {
      errors.push('A data de nascimento da primeira pessoa é obrigatória');
    }

    if (!data.person2Name?.trim()) {
      errors.push('O nome da segunda pessoa é obrigatório');
    }

    if (!data.person2BirthDate?.trim()) {
      errors.push('A data de nascimento da segunda pessoa é obrigatória');
    }

    // Validar formato de datas
    if (data.person1BirthDate && !this.isValidDate(data.person1BirthDate)) {
      errors.push('A data de nascimento da primeira pessoa não é válida');
    }

    if (data.person2BirthDate && !this.isValidDate(data.person2BirthDate)) {
      errors.push('A data de nascimento da segunda pessoa não é válida');
    }

    return errors;
  }

  /**
   * Verifica se uma data é válida
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Trata erros HTTP
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    console.error('Erro em CalculadoraAmorService:', error);

    let errorMessage = 'Erro desconhecido';
    let errorCode = 'UNKNOWN_ERROR';

    if (error.error?.error) {
      errorMessage = error.error.error;
      errorCode = error.error.code || 'API_ERROR';
    } else if (error.status === 0) {
      errorMessage =
        'Não foi possível conectar com o servidor. Verifique sua conexão com a internet.';
      errorCode = 'CONNECTION_ERROR';
    } else if (error.status >= 400 && error.status < 500) {
      errorMessage =
        'Erro na solicitação. Por favor, verifique os dados enviados.';
      errorCode = 'CLIENT_ERROR';
    } else if (error.status >= 500) {
      errorMessage = 'Erro do servidor. Por favor, tente mais tarde.';
      errorCode = 'SERVER_ERROR';
    }

    return throwError(() => ({
      message: errorMessage,
      code: errorCode,
      status: error.status,
    }));
  };
}
