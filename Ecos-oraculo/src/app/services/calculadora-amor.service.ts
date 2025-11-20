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
  timestamp: string;
}

export interface CompatibilityData {
  person1Name: string;
  person1BirthDate: string;
  person2Name: string;
  person2BirthDate: string;
}
@Injectable({
  providedIn: 'root'
})
export class CalculadoraAmorService {
 private readonly apiUrl = `${environment.apiUrl}`;
  private conversationHistorySubject = new BehaviorSubject<ConversationMessage[]>([]);
  private compatibilityDataSubject = new BehaviorSubject<CompatibilityData | null>(null);

  public conversationHistory$ = this.conversationHistorySubject.asObservable();
  public compatibilityData$ = this.compatibilityDataSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Obtiene información del experto en amor
   */
  getLoveExpertInfo(): Observable<LoveExpertInfo> {
    return this.http.get<LoveExpertInfo>(`${this.apiUrl}info`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Envía un mensaje al experto en amor
   */
  chatWithLoveExpert(
    userMessage: string,
    person1Name?: string,
    person1BirthDate?: string,
    person2Name?: string,
    person2BirthDate?: string
  ): Observable<LoveCalculatorResponse> {
    const currentHistory = this.conversationHistorySubject.value;
    
    const requestData: LoveCalculatorRequest = {
      loveCalculatorData: {
        name: "Maestra Valentina",
        specialty: "Compatibilidad numerológica y análisis de relaciones",
        experience: "Décadas analizando la compatibilidad a través de los números del amor"
      },
      userMessage,
      person1Name,
      person1BirthDate,
      person2Name,
      person2BirthDate,
      conversationHistory: currentHistory
    };

    return this.http.post<LoveCalculatorResponse>(`${this.apiUrl}chat`, requestData)
      .pipe(
        map((response:any) => {
          if (response.success && response.response) {
            // Agregar mensajes a la conversación
            this.addMessageToHistory('user', userMessage);
            this.addMessageToHistory('love_expert', response.response);
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Calcula la compatibilidad entre dos personas
   */
  calculateCompatibility(compatibilityData: CompatibilityData): Observable<LoveCalculatorResponse> {
    // Guardar los datos de compatibilidad
    this.setCompatibilityData(compatibilityData);
    
    const message = `Quiero conocer la compatibilidad entre ${compatibilityData.person1Name} y ${compatibilityData.person2Name}. Por favor, analiza nuestra compatibilidad numerológica.`;
    
    return this.chatWithLoveExpert(
      message,
      compatibilityData.person1Name,
      compatibilityData.person1BirthDate,
      compatibilityData.person2Name,
      compatibilityData.person2BirthDate
    );
  }

  /**
   * Obtiene consejos de relación
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
   * Agrega un mensaje al historial de conversación
   */
  private addMessageToHistory(role: 'user' | 'love_expert', message: string): void {
    const currentHistory = this.conversationHistorySubject.value;
    const newMessage: ConversationMessage = {
      role,
      message,
      timestamp: new Date()
    };
    
    const updatedHistory = [...currentHistory, newMessage];
    this.conversationHistorySubject.next(updatedHistory);
  }

  /**
   * Establece los datos de compatibilidad
   */
  setCompatibilityData(data: CompatibilityData): void {
    this.compatibilityDataSubject.next(data);
  }

  /**
   * Obtiene los datos de compatibilidad actuales
   */
  getCompatibilityData(): CompatibilityData | null {
    return this.compatibilityDataSubject.value;
  }

  /**
   * Limpia el historial de conversación
   */
  clearConversationHistory(): void {
    this.conversationHistorySubject.next([]);
  }

  /**
   * Limpia los datos de compatibilidad
   */
  clearCompatibilityData(): void {
    this.compatibilityDataSubject.next(null);
  }

  /**
   * Reinicia todo el servicio
   */
  resetService(): void {
    this.clearConversationHistory();
    this.clearCompatibilityData();
  }

  /**
   * Obtiene el historial actual de conversación
   */
  getCurrentHistory(): ConversationMessage[] {
    return this.conversationHistorySubject.value;
  }

  /**
   * Verifica si hay datos de compatibilidad completos
   */
  hasCompleteCompatibilityData(): boolean {
    const data = this.compatibilityDataSubject.value;
    return !!(data?.person1Name && data?.person1BirthDate && 
              data?.person2Name && data?.person2BirthDate);
  }

  /**
   * Formatea una fecha para el backend
   */
  formatDateForBackend(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Valida los datos de compatibilidad
   */
  validateCompatibilityData(data: Partial<CompatibilityData>): string[] {
    const errors: string[] = [];

    if (!data.person1Name?.trim()) {
      errors.push('El nombre de la primera persona es requerido');
    }

    if (!data.person1BirthDate?.trim()) {
      errors.push('La fecha de nacimiento de la primera persona es requerida');
    }

    if (!data.person2Name?.trim()) {
      errors.push('El nombre de la segunda persona es requerido');
    }

    if (!data.person2BirthDate?.trim()) {
      errors.push('La fecha de nacimiento de la segunda persona es requerida');
    }

    // Validar formato de fechas
    if (data.person1BirthDate && !this.isValidDate(data.person1BirthDate)) {
      errors.push('La fecha de nacimiento de la primera persona no es válida');
    }

    if (data.person2BirthDate && !this.isValidDate(data.person2BirthDate)) {
      errors.push('La fecha de nacimiento de la segunda persona no es válida');
    }

    return errors;
  }

  /**
   * Verifica si una fecha es válida
   */
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Maneja errores HTTP
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    console.error('Error en CalculadoraAmorService:', error);

    let errorMessage = 'Error desconocido';
    let errorCode = 'UNKNOWN_ERROR';

    if (error.error?.error) {
      errorMessage = error.error.error;
      errorCode = error.error.code || 'API_ERROR';
    } else if (error.status === 0) {
      errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
      errorCode = 'CONNECTION_ERROR';
    } else if (error.status >= 400 && error.status < 500) {
      errorMessage = 'Error en la solicitud. Por favor, verifica los datos enviados.';
      errorCode = 'CLIENT_ERROR';
    } else if (error.status >= 500) {
      errorMessage = 'Error del servidor. Por favor, intenta más tarde.';
      errorCode = 'SERVER_ERROR';
    }

    return throwError(() => ({
      message: errorMessage,
      code: errorCode,
      status: error.status
    }));
  };
}
