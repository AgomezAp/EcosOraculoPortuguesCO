import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, timeout } from 'rxjs';
import { environment } from '../environments/environmets.prod';

// ✅ Interface para os dados do conselheiro vocacional
interface VocationalData {
  name: string;
  title?: string;
  specialty: string;
  experience: string;
}

// ✅ Interface do Request - EXPORTADA
export interface VocationalRequest {
  vocationalData: VocationalData;
  userMessage: string;
  personalInfo?: any;
  assessmentAnswers?: any[];
  conversationHistory?: Array<{
    role: 'user' | 'counselor';
    message: string;
  }>;
  // ✅ NOVOS CAMPOS para o sistema de 3 mensagens grátis
  messageCount?: number;
  isPremiumUser?: boolean;
}

// ✅ Interface do Response - EXPORTADA
export interface VocationalResponse {
  success: boolean;
  response?: string;
  error?: string;
  code?: string;
  timestamp?: string;
  // ✅ NOVOS CAMPOS que o backend retorna
  freeMessagesRemaining?: number;
  showPaywall?: boolean;
  paywallMessage?: string;
  isCompleteResponse?: boolean;
}

// ✅ Interface para informações do conselheiro - EXPORTADA
export interface CounselorInfo {
  success: boolean;
  counselor: {
    name: string;
    title: string;
    specialty: string;
    description: string;
    services: string[];
  };
  freeMessagesLimit?: number;
  timestamp: string;
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

interface AssessmentAnswer {
  question: string;
  answer: string;
  category: string;
}

interface VocationalProfile {
  name: string;
  description: string;
  characteristics: string[];
  workEnvironments: string[];
}

@Injectable({
  providedIn: 'root',
})
export class MapaVocacionalService {
  private appUrl: string;
  private apiUrl: string;

  // Dados padrão do conselheiro vocacional
  private defaultVocationalData: VocationalData = {
    name: 'Dra. Valeria',
    title: 'Especialista em Orientação Profissional',
    specialty: 'Orientação profissional e cartas de carreira personalizadas',
    experience:
      'Anos de experiência em orientação vocacional e desenvolvimento de carreira',
  };

  // Perfis vocacionais
  private vocationalProfiles: { [key: string]: VocationalProfile } = {
    realistic: {
      name: 'Realista',
      description:
        'Prefere atividades práticas e trabalhar com ferramentas, máquinas ou animais.',
      characteristics: ['Prático', 'Mecânico', 'Atlético', 'Franco'],
      workEnvironments: [
        'Ar livre',
        'Oficinas',
        'Laboratórios',
        'Construção',
      ],
    },
    investigative: {
      name: 'Investigador',
      description:
        'Gosta de resolver problemas complexos e realizar pesquisas.',
      characteristics: ['Analítico', 'Curioso', 'Independente', 'Reservado'],
      workEnvironments: [
        'Laboratórios',
        'Universidades',
        'Centros de pesquisa',
      ],
    },
    artistic: {
      name: 'Artístico',
      description:
        'Valoriza a autoexpressão, a criatividade e o trabalho não estruturado.',
      characteristics: ['Criativo', 'Original', 'Independente', 'Expressivo'],
      workEnvironments: ['Estúdios', 'Teatros', 'Agências criativas', 'Museus'],
    },
    social: {
      name: 'Social',
      description: 'Prefere trabalhar com pessoas, ajudar e ensinar.',
      characteristics: ['Cooperativo', 'Empático', 'Paciente', 'Generoso'],
      workEnvironments: [
        'Escolas',
        'Hospitais',
        'ONGs',
        'Serviços sociais',
      ],
    },
    enterprising: {
      name: 'Empreendedor',
      description:
        'Gosta de liderar, persuadir e tomar decisões de negócios.',
      characteristics: ['Ambicioso', 'Energético', 'Dominante', 'Otimista'],
      workEnvironments: ['Empresas', 'Vendas', 'Política', 'Startups'],
    },
    conventional: {
      name: 'Convencional',
      description:
        'Prefere atividades ordenadas, seguindo procedimentos estabelecidos.',
      characteristics: ['Organizado', 'Preciso', 'Eficiente', 'Prático'],
      workEnvironments: [
        'Escritórios',
        'Bancos',
        'Contabilidade',
        'Administração',
      ],
    },
  };

  constructor(private http: HttpClient) {
    this.appUrl = environment.apiUrl;
    this.apiUrl = 'api/vocational';
  }

  /**
   * ✅ MÉTODO PRINCIPAL: Enviar mensagem com contador de mensagens
   */
  sendMessageWithCount(
    userMessage: string,
    messageCount: number,
    isPremiumUser: boolean,
    personalInfo?: any,
    assessmentAnswers?: any[],
    conversationHistory?: Array<{ role: 'user' | 'counselor'; message: string }>
  ): Observable<VocationalResponse> {
    const request: VocationalRequest = {
      vocationalData: this.defaultVocationalData,
      userMessage: userMessage.trim(),
      personalInfo,
      assessmentAnswers,
      conversationHistory,
      messageCount,
      isPremiumUser,
    };

    console.log('📤 Enviando mensagem vocacional:', {
      messageCount: request.messageCount,
      isPremiumUser: request.isPremiumUser,
      userMessage: request.userMessage.substring(0, 50) + '...',
    });

    return this.http
      .post<VocationalResponse>(`${this.appUrl}${this.apiUrl}/counselor`, request)
      .pipe(
        timeout(60000),
        map((response: VocationalResponse) => {
          console.log('📥 Resposta vocacional:', {
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
          console.error('Erro na comunicação vocacional:', error);
          return of({
            success: false,
            error: this.getErrorMessage(error),
            timestamp: new Date().toISOString(),
          } as VocationalResponse);
        })
      );
  }

  /**
   * Método legado para compatibilidade
   */
  sendMessage(
    userMessage: string,
    personalInfo?: any,
    assessmentAnswers?: any[],
    conversationHistory?: Array<{ role: 'user' | 'counselor'; message: string }>
  ): Observable<string> {
    const request: VocationalRequest = {
      vocationalData: this.defaultVocationalData,
      userMessage: userMessage.trim(),
      personalInfo,
      assessmentAnswers,
      conversationHistory,
      messageCount: 1,
      isPremiumUser: false,
    };

    return this.http
      .post<VocationalResponse>(`${this.appUrl}${this.apiUrl}/counselor`, request)
      .pipe(
        timeout(30000),
        map((response: VocationalResponse) => {
          if (response.success && response.response) {
            return response.response;
          }
          throw new Error(response.error || 'Resposta inválida do servidor');
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Erro na comunicação vocacional:', error);
          return of(this.getErrorMessage(error));
        })
      );
  }

  /**
   * Obter perguntas do assessment
   */
  getAssessmentQuestions(): Observable<AssessmentQuestion[]> {
    return of(this.getDefaultQuestions());
  }

  /**
   * Analisar respostas do assessment
   */
  analyzeAssessment(answers: AssessmentAnswer[]): Observable<any> {
    const categoryCount: { [key: string]: number } = {};

    answers.forEach((answer) => {
      if (answer.category) {
        categoryCount[answer.category] =
          (categoryCount[answer.category] || 0) + 1;
      }
    });

    const total = answers.length;
    const distribution = Object.entries(categoryCount)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const dominantCategory = distribution[0]?.category || 'social';
    const dominantProfile =
      this.vocationalProfiles[dominantCategory] ||
      this.vocationalProfiles['social'];

    return of({
      profileDistribution: distribution,
      dominantProfile,
      recommendations: this.getRecommendations(dominantCategory),
    });
  }

  /**
   * Obter emoji da categoria
   */
  getCategoryEmoji(category: string): string {
    const emojis: { [key: string]: string } = {
      realistic: '🔧',
      investigative: '🔬',
      artistic: '🎨',
      social: '🤝',
      enterprising: '💼',
      conventional: '📊',
    };
    return emojis[category] || '⭐';
  }

  /**
   * Obter cor da categoria
   */
  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      realistic: '#4CAF50',
      investigative: '#2196F3',
      artistic: '#9C27B0',
      social: '#FF9800',
      enterprising: '#F44336',
      conventional: '#607D8B',
    };
    return colors[category] || '#757575';
  }

  /**
   * Obter perguntas padrão
   */
  private getDefaultQuestions(): AssessmentQuestion[] {
    return [
      {
        id: 1,
        question:
          'Que tipo de atividade você prefere fazer no seu tempo livre?',
        options: [
          {
            value: 'a',
            label: 'Construir ou consertar coisas',
            category: 'realistic',
          },
          {
            value: 'b',
            label: 'Ler e pesquisar novos temas',
            category: 'investigative',
          },
          { value: 'c', label: 'Criar arte ou música', category: 'artistic' },
          { value: 'd', label: 'Ajudar outras pessoas', category: 'social' },
          {
            value: 'e',
            label: 'Organizar eventos ou liderar grupos',
            category: 'enterprising',
          },
          {
            value: 'f',
            label: 'Organizar e classificar informações',
            category: 'conventional',
          },
        ],
      },
      {
        id: 2,
        question:
          'Em que tipo de ambiente de trabalho você se sentiria mais confortável?',
        options: [
          {
            value: 'a',
            label: 'Ao ar livre ou em uma oficina',
            category: 'realistic',
          },
          {
            value: 'b',
            label: 'Em um laboratório ou centro de pesquisa',
            category: 'investigative',
          },
          { value: 'c', label: 'Em um estúdio criativo', category: 'artistic' },
          {
            value: 'd',
            label: 'Em uma escola ou hospital',
            category: 'social',
          },
          {
            value: 'e',
            label: 'Em uma empresa ou startup',
            category: 'enterprising',
          },
          {
            value: 'f',
            label: 'Em um escritório bem organizado',
            category: 'conventional',
          },
        ],
      },
      {
        id: 3,
        question: 'Qual dessas habilidades descreve você melhor?',
        options: [
          {
            value: 'a',
            label: 'Habilidade manual e técnica',
            category: 'realistic',
          },
          {
            value: 'b',
            label: 'Pensamento analítico',
            category: 'investigative',
          },
          {
            value: 'c',
            label: 'Criatividade e imaginação',
            category: 'artistic',
          },
          { value: 'd', label: 'Empatia e comunicação', category: 'social' },
          {
            value: 'e',
            label: 'Liderança e persuasão',
            category: 'enterprising',
          },
          {
            value: 'f',
            label: 'Organização e precisão',
            category: 'conventional',
          },
        ],
      },
      {
        id: 4,
        question: 'Que tipo de problema você preferiria resolver?',
        options: [
          {
            value: 'a',
            label: 'Consertar uma máquina com defeito',
            category: 'realistic',
          },
          {
            value: 'b',
            label: 'Descobrir por que algo funciona de certa maneira',
            category: 'investigative',
          },
          {
            value: 'c',
            label: 'Projetar algo novo e original',
            category: 'artistic',
          },
          {
            value: 'd',
            label: 'Ajudar alguém com um problema pessoal',
            category: 'social',
          },
          {
            value: 'e',
            label: 'Encontrar uma oportunidade de negócio',
            category: 'enterprising',
          },
          {
            value: 'f',
            label: 'Otimizar um processo existente',
            category: 'conventional',
          },
        ],
      },
      {
        id: 5,
        question: 'Qual matéria você mais gostava na escola?',
        options: [
          {
            value: 'a',
            label: 'Educação física ou tecnologia',
            category: 'realistic',
          },
          {
            value: 'b',
            label: 'Ciências ou matemática',
            category: 'investigative',
          },
          { value: 'c', label: 'Arte ou música', category: 'artistic' },
          {
            value: 'd',
            label: 'Ciências sociais ou idiomas',
            category: 'social',
          },
          { value: 'e', label: 'Economia ou debate', category: 'enterprising' },
          {
            value: 'f',
            label: 'Informática ou contabilidade',
            category: 'conventional',
          },
        ],
      },
    ];
  }

  /**
   * Obter recomendações segundo a categoria
   */
  private getRecommendations(category: string): string[] {
    const recommendations: { [key: string]: string[] } = {
      realistic: [
        'Engenharia mecânica ou civil',
        'Técnico em manutenção',
        'Carpintaria ou eletricidade',
        'Agricultura ou veterinária',
      ],
      investigative: [
        'Ciências naturais ou medicina',
        'Pesquisa científica',
        'Análise de dados',
        'Programação e desenvolvimento de software',
      ],
      artistic: [
        'Design gráfico ou industrial',
        'Belas artes ou música',
        'Arquitetura',
        'Produção audiovisual',
      ],
      social: [
        'Psicologia ou serviço social',
        'Educação ou pedagogia',
        'Enfermagem ou medicina',
        'Recursos humanos',
      ],
      enterprising: [
        'Administração de empresas',
        'Marketing e vendas',
        'Direito',
        'Empreendedorismo',
      ],
      conventional: [
        'Contabilidade e finanças',
        'Administração pública',
        'Secretariado executivo',
        'Logística e operações',
      ],
    };
    return recommendations[category] || recommendations['social'];
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
      return 'Não foi possível conectar com o conselheiro vocacional. Tente novamente em alguns minutos.';
    }

    return 'Desculpe, estou enfrentando dificuldades técnicas. Por favor, tente novamente mais tarde.';
  }
}