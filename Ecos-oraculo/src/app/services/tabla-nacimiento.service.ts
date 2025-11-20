import { Injectable } from '@angular/core';
import { environment } from '../environments/environments';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BirthChartRequest {
  chartData: {
    name: string;
    specialty: string;
    experience: string;
  };
  userMessage: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  fullName?: string;
  conversationHistory?: Array<{
    role: 'user' | 'astrologer';
    message: string;
  }>;
}

export interface BirthChartResponse {
  success: boolean;
  response?: string;
  error?: string;
  code?: string;
  timestamp: string;
}

export interface AstrologerInfo {
  success: boolean;
  astrologer: {
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
export class TablaNacimientoService {
  private apiUrl = `${environment.apiUrl}api/tabla-nacimiento`;

  constructor(private http: HttpClient) {}

  chatWithAstrologer(request: BirthChartRequest): Observable<BirthChartResponse> {
    return this.http.post<BirthChartResponse>(`${this.apiUrl}/chat`, request);
  }

  getBirthChartInfo(): Observable<AstrologerInfo> {
    return this.http.get<AstrologerInfo>(`${this.apiUrl}/info`);
  }
}