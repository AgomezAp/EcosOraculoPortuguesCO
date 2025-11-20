import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environmets.prod';
import { Observable } from 'rxjs';
import { Datos } from '../interfaces/datos';

@Injectable({
  providedIn: 'root',
})
export class RecolectaService {
  private appUrl: string;
  private apiUrl: string;
  constructor(private http: HttpClient) {
    this.appUrl = environment.apiUrl;
    this.apiUrl = 'api/';
  }
  createProduct(datos: Datos): Observable<Datos> {
    return this.http.post<Datos>(
      `${this.appUrl}${this.apiUrl}recolecta`,
      datos
    );
  }

  getProduct(): Observable<Datos[]> {
    return this.http.get<Datos[]>(`${this.appUrl}${this.apiUrl}/enviar`);
  }
}
