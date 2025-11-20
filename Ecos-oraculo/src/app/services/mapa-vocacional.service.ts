import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../environments/environments';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface VocationalData {
  name: string;
  specialty: string;
  experience: string;
}

interface VocationalRequest {
  vocationalData: VocationalData;
  userMessage: string;
  personalInfo?: {
    age?: number;
    currentEducation?: string;
    workExperience?: string;
    interests?: string[];
  };
  assessmentAnswers?: Array<{
    question: string;
    answer: string;
    category: string;
  }>;
  conversationHistory?: Array<{
    role: 'user' | 'counselor';
    message: string;
  }>;
}

interface VocationalResponse {
  success: boolean;
  response?: string;
  error?: string;
  code?: string;
  timestamp?: string;
}

interface AssessmentQuestion {
  id: number;
  question: string;
  options: Array<{
    value: string;
    label: string;
    category: string;
  }>;
}

interface AssessmentQuestionsResponse {
  success: boolean;
  questions: AssessmentQuestion[];
  instructions: string;
  timestamp: string;
}

interface CategoryAnalysis {
  category: string;
  count: number;
  percentage: number;
}

interface VocationalProfile {
  name: string;
  description: string;
  characteristics: string[];
  workEnvironments: string[];
}

interface AnalysisResult {
  profileDistribution: CategoryAnalysis[];
  dominantProfile: VocationalProfile;
  recommendations: string[];
}

interface AnalysisResponse {
  success: boolean;
  analysis: AnalysisResult;
  timestamp: string;
}

interface CounselorInfo {
  name: string;
  title: string;
  specialty: string;
  description: string;
  services: string[];
  methodology: string[];
}

interface CounselorInfoResponse {
  success: boolean;
  counselor: CounselorInfo;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapaVocacionalService {
  // ✅ CORREGIR: Usar solo la URL base
  private readonly API_URL = environment.apiUrl;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Envía un mensaje al consejero vocacional
   */
  sendMessage(
    userMessage: string,
    personalInfo?: any,
    assessmentAnswers?: any[],
    conversationHistory?: Array<{role: 'user' | 'counselor', message: string}>
  ): Observable<string> {
    const counselorData: VocationalData = {
      name: "Dr. Mentor Vocationis",
      specialty: "Orientación profesional y mapas vocacionales personalizados",
      experience: "Décadas de experiencia en psicología vocacional"
    };

    const requestBody: VocationalRequest = {
      vocationalData: counselorData,
      userMessage,
      personalInfo,
      assessmentAnswers,
      conversationHistory
    };

    // ✅ CORREGIR: URL exacta según backend
    return this.http.post<VocationalResponse>(
      `${this.API_URL}api/vocational/counselor`,
      requestBody,
      this.httpOptions
    ).pipe(
      map((response:any) => {
        if (response.success && response.response) {
          return response.response;
        } else {
          throw new Error(response.error || 'Error desconocido del consejero vocacional');
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene información del consejero vocacional
   */
  getCounselorInfo(): Observable<CounselorInfo> {
    // ✅ CORREGIR: URL exacta según backend
    return this.http.get<CounselorInfoResponse>(
      `${this.API_URL}/api/vocational/counselor/info`,
      this.httpOptions
    ).pipe(
      map((response:any) => {
        if (response.success && response.counselor) {
          return response.counselor;
        } else {
          throw new Error('Error al obtener información del consejero');
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene las preguntas del assessment vocacional
   */
  getAssessmentQuestions(): Observable<AssessmentQuestion[]> {
    // ✅ CORREGIR: URL exacta según backend
    return this.http.get<AssessmentQuestionsResponse>(
      `${this.API_URL}api/vocational/assessment/questions`,
      this.httpOptions
    ).pipe(
      map((response:any) => {
        if (response.success && response.questions) {
          return response.questions;
        } else {
          throw new Error('Error al obtener preguntas del assessment');
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Analiza las respuestas del assessment vocacional
   */
  analyzeAssessment(answers: Array<{question: string, answer: string, category: string}>): Observable<AnalysisResult> {
    const requestBody = { answers };

    // ✅ CORREGIR: URL exacta según backend
    return this.http.post<AnalysisResponse>(
      `${this.API_URL}api/vocational/assessment/analyze`,
      requestBody,
      this.httpOptions
    ).pipe(
      map((response:any) => {
        if (response.success && response.analysis) {
          return response.analysis;
        } else {
          throw new Error('Error al analizar el assessment');
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Prueba la conexión con el servicio vocacional
   */
  testConnection(): Observable<any> {
    // ✅ CORREGIR: URL exacta según backend
    return this.http.get(`${this.API_URL}api/vocational/test`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene recomendaciones de carrera basadas en una categoría
   */
  getCareerRecommendations(category: string): string[] {
    const recommendations: Record<string, string[]> = {
      social: [
        "Psicología y Terapia",
        "Educación y Docencia",
        "Trabajo Social",
        "Recursos Humanos",
        "Enfermería y Salud",
        "Orientación Vocacional"
      ],
      investigativo: [
        "Ingeniería en sus diversas ramas",
        "Medicina e Investigación Médica",
        "Ciencias de la Computación",
        "Investigación Científica",
        "Análisis de Datos",
        "Arquitectura"
      ],
      artístico: [
        "Diseño Gráfico y Web",
        "Arquitectura y Diseño de Interiores",
        "Comunicación Social y Periodismo",
        "Artes Visuales y Escénicas",
        "Marketing Creativo",
        "Producción Audiovisual"
      ],
      emprendedor: [
        "Administración de Empresas",
        "Marketing y Ventas",
        "Finanzas y Banca",
        "Derecho Empresarial",
        "Comercio Internacional",
        "Consultoría"
      ],
      convencional: [
        "Contabilidad y Auditoría",
        "Administración Pública",
        "Gestión de Operaciones",
        "Sistemas de Información",
        "Logística y Cadena de Suministro",
        "Finanzas"
      ],
      realista: [
        "Ingeniería Mecánica y Civil",
        "Arquitectura",
        "Agricultura y Veterinaria",
        "Tecnología Industrial",
        "Oficios Especializados",
        "Ciencias Ambientales"
      ]
    };

    return recommendations[category] || recommendations['social'];
  }

  /**
   * Obtiene la descripción de un perfil vocacional
   */
  getProfileDescription(category: string): VocationalProfile {
    const profiles: Record<string, VocationalProfile> = {
      social: {
        name: "Perfil Social",
        description: "Te motiva ayudar, enseñar y trabajar con personas",
        characteristics: ["Empático", "Comunicativo", "Colaborativo", "Orientado al servicio"],
        workEnvironments: ["Educación", "Salud", "Servicios sociales", "Recursos humanos"]
      },
      investigativo: {
        name: "Perfil Investigativo",
        description: "Te atrae resolver problemas, investigar y analizar",
        characteristics: ["Analítico", "Curioso", "Metódico", "Orientado a datos"],
        workEnvironments: ["Ciencia", "Tecnología", "Investigación", "Ingeniería"]
      },
      artístico: {
        name: "Perfil Artístico",
        description: "Te motiva crear, diseñar y expresarte creativamente",
        characteristics: ["Creativo", "Original", "Expresivo", "Innovador"],
        workEnvironments: ["Artes", "Diseño", "Medios", "Entretenimiento"]
      },
      emprendedor: {
        name: "Perfil Emprendedor",
        description: "Te atrae liderar, persuadir y dirigir proyectos",
        characteristics: ["Líder", "Ambicioso", "Persuasivo", "Orientado a resultados"],
        workEnvironments: ["Negocios", "Ventas", "Gerencia", "Emprendimiento"]
      },
      convencional: {
        name: "Perfil Convencional",
        description: "Te motiva organizar, administrar y trabajar con datos",
        characteristics: ["Organizado", "Detallista", "Eficiente", "Confiable"],
        workEnvironments: ["Administración", "Finanzas", "Contabilidad", "Operaciones"]
      },
      realista: {
        name: "Perfil Realista",
        description: "Te atrae trabajar con herramientas, máquinas y objetos",
        characteristics: ["Práctico", "Técnico", "Independiente", "Orientado a resultados"],
        workEnvironments: ["Ingeniería", "Construcción", "Agricultura", "Oficios especializados"]
      }
    };

    return profiles[category] || profiles['social'];
  }

  /**
   * Obtiene el emoji asociado a cada categoría vocacional
   */
  getCategoryEmoji(category: string): string {
    const emojis: Record<string, string> = {
      social: "👥",
      investigativo: "🔬",
      artístico: "🎨",
      emprendedor: "💼",
      convencional: "📊",
      realista: "🔧"
    };

    return emojis[category] || "🎯";
  }

  /**
   * Obtiene el color asociado a cada categoría vocacional
   */
  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      social: "#4CAF50",      // Verde
      investigativo: "#2196F3", // Azul
      artístico: "#E91E63",    // Rosa
      emprendedor: "#FF9800",  // Naranja
      convencional: "#9C27B0", // Púrpura
      realista: "#795548"      // Marrón
    };

    return colors[category] || "#607D8B";
  }

  /**
   * Valida las respuestas del assessment
   */
  validateAssessmentAnswers(answers: any[]): boolean {
    if (!answers || !Array.isArray(answers)) {
      return false;
    }

    if (answers.length === 0) {
      return false;
    }

    return answers.every(answer => 
      answer.question && 
      answer.answer && 
      answer.category
    );
  }

  /**
   * Calcula el porcentaje de completitud del assessment
   */
  calculateAssessmentProgress(answeredQuestions: number, totalQuestions: number): number {
    if (totalQuestions === 0) return 0;
    return Math.round((answeredQuestions / totalQuestions) * 100);
  }

  /**
   * Genera recomendaciones de desarrollo personal
   */
  getPersonalDevelopmentRecommendations(dominantProfile: string): string[] {
    const recommendations: Record<string, string[]> = {
      social: [
        "Desarrolla habilidades de comunicación interpersonal",
        "Practica la escucha activa y empática",
        "Participa en actividades de voluntariado",
        "Toma cursos de psicología o trabajo social"
      ],
      investigativo: [
        "Fortalece habilidades analíticas y de investigación",
        "Aprende nuevas metodologías científicas",
        "Participa en proyectos de investigación",
        "Desarrolla competencias en análisis de datos"
      ],
      artístico: [
        "Explora diferentes formas de expresión creativa",
        "Practica técnicas artísticas diversas",
        "Participa en comunidades creativas",
        "Desarrolla tu portfolio artístico"
      ],
      emprendedor: [
        "Desarrolla habilidades de liderazgo",
        "Aprende sobre gestión de negocios",
        "Practica la toma de decisiones",
        "Fortalece tu red de contactos profesionales"
      ],
      convencional: [
        "Mejora habilidades organizacionales",
        "Aprende herramientas de gestión",
        "Desarrolla atención al detalle",
        "Fortalece competencias administrativas"
      ],
      realista: [
        "Desarrolla habilidades técnicas especializadas",
        "Practica con herramientas y tecnologías",
        "Participa en proyectos prácticos",
        "Aprende oficios especializados"
      ]
    };

    return recommendations[dominantProfile] || recommendations['social'];
  }

  /**
   * Manejo de errores HTTP
   */
  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'Error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del servidor
      errorMessage = error.error?.error || error.message || `Error HTTP: ${error.status}`;
    }
    
    console.error('Error en MapaVocacionalService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  };
}