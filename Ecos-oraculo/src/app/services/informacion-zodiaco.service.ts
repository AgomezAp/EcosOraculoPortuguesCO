import { Injectable } from '@angular/core';
import { environment } from '../environments/environments';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ZodiacRequest {
  zodiacData: {  // ✅ Cambiar de 'astrologerData' a 'zodiacData'
    name: string;
    specialty: string;
    experience: string;
  };
  userMessage: string;
  // ✅ CORRECCIÓN: Campos separados como espera el backend
  birthDate?: string;
  fullName?: string;
  birthTime?: string;
  birthPlace?: string;
  conversationHistory?: Array<{
    role: 'user' | 'astrologer';
    message: string;
  }>;
}

export interface ZodiacResponse {
  success: boolean;
  response?: string;
  error?: string;
  code?: string;
  timestamp: string;
}

export interface AstrologerInfo {
  success: boolean;
  astrologer: {  // ✅ El backend devuelve 'astrologer'
    name: string;
    title: string;
    specialty: string;
    description: string;
    services: string[];
  };
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class InformacionZodiacoService {
 private apiUrl = `${environment.apiUrl}api/zodiaco`;

  constructor(private http: HttpClient) {}

  getZodiacInfo(): Observable<AstrologerInfo> {
    return this.http.get<AstrologerInfo>(`${this.apiUrl}/info`);
  }

  chatWithAstrologer(request: ZodiacRequest): Observable<ZodiacResponse> {
    return this.http.post<ZodiacResponse>(`${this.apiUrl}/chat`, request);
  }
}
