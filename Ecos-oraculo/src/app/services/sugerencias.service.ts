import { Injectable } from '@angular/core';
import { environment } from '../environments/environmets.prod';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
export interface SugerenciaRequest {
  sugerencia: string;
}

export interface SugerenciaResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    fecha: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class SugerenciasService {
  private baseApiUrl = environment.apiUrl + 'api/sugerencias';

  constructor(private http: HttpClient) {}
  enviarSugerencia(sugerencia: string): Observable<SugerenciaResponse> {
    const payload: SugerenciaRequest = { sugerencia: sugerencia.trim() };
    const url = `${this.baseApiUrl}/enviar`;

    return this.http
      .post<SugerenciaResponse>(url, payload)
      .pipe(catchError(this.handleError));
  }
  
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del servidor
      errorMessage =
        error.error?.message || `Error del servidor: ${error.status}`;
    }

    console.error('Error en SugerenciasService:', errorMessage);
    return throwError(() => errorMessage);
  }
}
