import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, timeout } from 'rxjs';
import { environment } from '../environments/environmets.prod';

// ✅ Interface para os dados do numerólogo
interface NumerologyData {
  name: string;
  title?: string;
  specialty: string;
  experience: string;
}

// ✅ Interface do Request - EXPORTADA
export interface NumerologyRequest {
  numerologyData: NumerologyData;
  userMessage: string;
  birthDate?: string;
  fullName?: string;
  conversationHistory?: Array<{
    role: 'user' | 'numerologist';
    message: string;
  }>;
  messageCount?: number;
  isPremiumUser?: boolean;
}

// ✅ Interface do Response - EXPORTADA
export interface NumerologyResponse {
  success: boolean;
  response?: string;
  error?: string;
  code?: string;
  timestamp?: string;
  freeMessagesRemaining?: number;
  showPaywall?: boolean;
  paywallMessage?: string;
  isCompleteResponse?: boolean;
}

// ✅ Interface para informações do numerólogo - EXPORTADA
export interface NumerologyInfo {
  success: boolean;
  numerologist: {
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
export class NumerologiaService {
  private appUrl: string;
  private apiUrl: string;

  // Dados padrão do numerólogo
  private defaultNumerologyData: NumerologyData = {
    name: 'Mestra Sofia',
    title: 'Guardiã dos Números Sagrados',
    specialty: 'Numerologia pitagórica',
    experience: 'Décadas de experiência nas vibrações numéricas do universo',
  };

  constructor(private http: HttpClient) {
    this.appUrl = environment.apiUrl;
    this.apiUrl = 'api/numerology';
  }

  /**
   * ✅ MÉTODO PRINCIPAL: Enviar mensagem com contador de mensagens
   */
  sendMessageWithCount(
    userMessage: string,
    messageCount: number,
    isPremiumUser: boolean,
    birthDate?: string,
    fullName?: string,
    conversationHistory?: Array<{
      role: 'user' | 'numerologist';
      message: string;
    }>
  ): Observable<NumerologyResponse> {
    const request: NumerologyRequest = {
      numerologyData: this.defaultNumerologyData,
      userMessage: userMessage.trim(),
      birthDate,
      fullName,
      conversationHistory,
      messageCount,
      isPremiumUser,
    };

    console.log('📤 Enviando mensagem ao numerólogo:', {
      messageCount: request.messageCount,
      isPremiumUser: request.isPremiumUser,
      userMessage: request.userMessage.substring(0, 50) + '...',
    });

    return this.http
      .post<NumerologyResponse>(
        `${this.appUrl}${this.apiUrl}/numerologist`,
        request
      )
      .pipe(
        timeout(60000),
        map((response: NumerologyResponse) => {
          console.log('📥 Resposta do numerólogo:', {
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
          console.error('Erro na comunicação com numerólogo:', error);
          return of({
            success: false,
            error: this.getErrorMessage(error),
            timestamp: new Date().toISOString(),
          } as NumerologyResponse);
        })
      );
  }

  /**
   * Método legado para compatibilidade
   */
  sendMessage(
    userMessage: string,
    birthDate?: string,
    fullName?: string,
    conversationHistory?: Array<{
      role: 'user' | 'numerologist';
      message: string;
    }>
  ): Observable<string> {
    const request: NumerologyRequest = {
      numerologyData: this.defaultNumerologyData,
      userMessage: userMessage.trim(),
      birthDate,
      fullName,
      conversationHistory,
      messageCount: 1,
      isPremiumUser: false,
    };

    console.log(
      'Enviando mensagem ao numerólogo (legado):',
      this.apiUrl + '/numerologist'
    );

    return this.http
      .post<NumerologyResponse>(
        `${this.appUrl}${this.apiUrl}/numerologist`,
        request
      )
      .pipe(
        timeout(30000),
        map((response: NumerologyResponse) => {
          console.log('Resposta do numerólogo:', response);
          if (response.success && response.response) {
            return response.response;
          }
          throw new Error(response.error || 'Resposta inválida do servidor');
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Erro na comunicação com numerólogo:', error);
          return of(this.getErrorMessage(error));
        })
      );
  }

  /**
   * Obter informações do numerólogo
   */
  getNumerologyInfo(): Observable<NumerologyInfo> {
    return this.http
      .get<NumerologyInfo>(`${this.appUrl}${this.apiUrl}/numerologist/info`)
      .pipe(
        timeout(10000),
        catchError((error: HttpErrorResponse) => {
          console.error('Erro obtendo info do numerólogo:', error);
          return of({
            success: false,
            numerologist: {
              name: 'Mestra Sofia',
              title: 'Guardiã dos Números Sagrados',
              specialty: 'Numerologia pitagórica',
              description: 'Erro ao conectar com o numerólogo',
              services: [],
            },
            freeMessagesLimit: 3,
            timestamp: new Date().toISOString(),
          } as NumerologyInfo);
        })
      );
  }

  /**
   * Testar conexão com o backend
   */
  testConnection(): Observable<any> {
    return this.http.get(`${this.appUrl}api/health`).pipe(
      timeout(5000),
      catchError((error: HttpErrorResponse) => {
        console.error('Erro de conexão:', error);
        return of({
          success: false,
          error: 'Não foi possível conectar com o serviço de numerologia',
        });
      })
    );
  }

  /**
   * Calcular número do caminho de vida
   */
  calculateLifePath(birthDate: string): number {
    try {
      const numbers = birthDate.replace(/\D/g, '');
      const sum = numbers
        .split('')
        .reduce((acc, digit) => acc + parseInt(digit), 0);
      return this.reduceToSingleDigit(sum);
    } catch {
      return 0;
    }
  }

  /**
   * Calcular número do destino baseado no nome
   */
  calculateDestinyNumber(name: string): number {
    const letterValues: { [key: string]: number } = {
      A: 1,
      B: 2,
      C: 3,
      D: 4,
      E: 5,
      F: 6,
      G: 7,
      H: 8,
      I: 9,
      J: 1,
      K: 2,
      L: 3,
      M: 4,
      N: 5,
      O: 6,
      P: 7,
      Q: 8,
      R: 9,
      S: 1,
      T: 2,
      U: 3,
      V: 4,
      W: 5,
      X: 6,
      Y: 7,
      Z: 8,
    };

    const sum = name
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .split('')
      .reduce((acc, letter) => {
        return acc + (letterValues[letter] || 0);
      }, 0);

    return this.reduceToSingleDigit(sum);
  }

  /**
   * Obter interpretação básica de um número
   */
  getNumberMeaning(number: number): string {
    const meanings: { [key: number]: string } = {
      1: 'Liderança, independência, pioneiro',
      2: 'Cooperação, diplomacia, sensibilidade',
      3: 'Criatividade, comunicação, expressão',
      4: 'Estabilidade, trabalho duro, organização',
      5: 'Liberdade, aventura, mudança',
      6: 'Responsabilidade, cuidado, harmonia',
      7: 'Espiritualidade, introspecção, análise',
      8: 'Poder material, ambição, conquistas',
      9: 'Humanitarismo, compaixão, sabedoria',
      11: 'Inspiração, intuição, iluminação (Número Mestre)',
      22: 'Construtor mestre, visão prática (Número Mestre)',
      33: 'Mestre curador, serviço à humanidade (Número Mestre)',
    };

    return meanings[number] || 'Número não reconhecido';
  }

  /**
   * Método auxiliar para reduzir a dígito único
   */
  private reduceToSingleDigit(num: number): number {
    while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
      num = num
        .toString()
        .split('')
        .reduce((acc, digit) => acc + parseInt(digit), 0);
    }
    return num;
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
      return 'Não foi possível conectar com a mestra de numerologia. Tente novamente em alguns minutos.';
    }

    if (error.error?.code === 'RATE_LIMIT_EXCEEDED') {
      return 'Muitas solicitações. Por favor, aguarde um momento.';
    }

    if (error.error?.code === 'MISSING_NUMEROLOGY_DATA') {
      return 'Erro nos dados do numerólogo. Por favor, tente novamente.';
    }

    if (error.error?.code === 'ALL_MODELS_UNAVAILABLE') {
      return 'Todos os modelos de IA estão temporariamente indisponíveis. Tente novamente em alguns minutos.';
    }

    return 'Desculpe, as energias numerológicas estão bloqueadas neste momento. Convido você a meditar e tentar novamente mais tarde.';
  }
}
