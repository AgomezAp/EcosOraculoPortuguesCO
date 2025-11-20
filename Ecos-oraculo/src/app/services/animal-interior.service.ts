import { Injectable } from '@angular/core';
import { environment } from '../environments/environments';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AnimalGuideData {
  name: string;
  specialty: string;
  experience: string;
}

export interface AnimalChatRequest {
  guideData: AnimalGuideData;
  userMessage: string;
  conversationHistory?: Array<{
    role: 'user' | 'guide';
    message: string;
  }>;
}

export interface AnimalChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  code?: string;
  timestamp: string;
}

export interface AnimalGuideInfo {
  success: boolean;
  guide: {
    name: string;
    title: string;
    specialty: string;
    description: string;
  };
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class AnimalInteriorService {
  private appUrl: string;
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.appUrl = environment.apiUrl;
    this.apiUrl = 'api/animal-interior';
  }
  getGuideInfo(): Observable<AnimalGuideInfo> {
    return this.http.get<AnimalGuideInfo>(`${this.appUrl}${this.apiUrl}/guide-info`);
  }

  chatWithGuide(request: AnimalChatRequest): Observable<AnimalChatResponse> {
    return this.http.post<AnimalChatResponse>(`${this.appUrl}${this.apiUrl}/chat`, request);
  }
}
