import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environments';
export interface DreamInterpreterData {
  name: string;
  specialty: string;
  experience: string;
}

export interface ConversationMessage {
  role: 'user' | 'interpreter';
  message: string;
  timestamp: Date  | string;
  id?: string; 
}

export interface DreamChatRequest {
  interpreterData: DreamInterpreterData;
  userMessage: string;
  conversationHistory?: ConversationMessage[];
}

export interface DreamChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  timestamp: string;
}
@Injectable({
  providedIn: 'root',
})
export class InterpretadorSuenosService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  chatWithInterpreter(request: DreamChatRequest): Observable<DreamChatResponse> {
    // ✅ Basándote en tu ruta: router.post('/interpretador-sueno'
    return this.http.post<DreamChatResponse>(
      `${this.apiUrl}interpretador-sueno`,
      request
    );
  }

  getInterpreterInfo(): Observable<any> {
    // ✅ Basándote en tu ruta: router.get('/interpretador-sueno/info'
    return this.http.get(`${this.apiUrl}interpretador-sueno/info`);
  }
}
