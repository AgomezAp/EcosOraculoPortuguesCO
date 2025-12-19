import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  Optional,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  BirthChartRequest,
  BirthChartResponse,
  TablaNacimientoService,
} from '../../services/tabla-nacimiento.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PaypalService } from '../../services/paypal.service';

import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import { environment } from '../../environments/environmets.prod';
import { Observable, map, catchError, of } from 'rxjs';
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';
interface BirthChartMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
  sender: string;
}

interface Message {
  sender: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  id?: string;
}
interface ChartData {
  sunSign?: string;
  moonSign?: string;
  ascendant?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  fullName?: string;
}

interface AstrologerInfo {
  name: string;
  title: string;
  specialty: string;
}
@Component({
  selector: 'app-tabla-nacimiento',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RecolectaDatosComponent,
  ],
  templateUrl: './tabla-nacimiento.component.html',
  styleUrl: './tabla-nacimiento.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TablaNacimientoComponent
  implements OnInit, AfterViewChecked, OnDestroy, AfterViewInit
{
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  // Chat e mensagens
  messages: Message[] = [];
  currentMessage: string = '';
  isLoading: boolean = false;

  // Controle de scroll
  private shouldScrollToBottom: boolean = true;
  private isUserScrolling: boolean = false;
  private lastMessageCount: number = 0;

  // Dados pessoais e mapa
  chartData: ChartData = {};
  fullName: string = '';
  birthDate: string = '';
  birthTime: string = '';
  birthPlace: string = '';
  showDataForm: boolean = false;

  // Informação da astróloga
  astrologerInfo: AstrologerInfo = {
    name: 'Mestra Emma',
    title: 'Guardiã das Configurações Celestiais',
    specialty: 'Especialista em Mapas Natais e Astrologia Transpessoal',
  };
  // Dados para enviar
  showDataModal: boolean = false;
  userData: any = null;
  // Variáveis para a roleta
  showFortuneWheel: boolean = false;
  birthChartPrizes: Prize[] = [
    {
      id: '1',
      name: '3 giros da Roleta Natal',
      color: '#4ecdc4',
      icon: '🌟',
    },
    {
      id: '2',
      name: '1 Análise Premium de Mapa Natal',
      color: '#45b7d1',
      icon: '✨',
    },
    {
      id: '4',
      name: 'Tente novamente!',
      color: '#ff7675',
      icon: '🔮',
    },
  ];
  private wheelTimer: any;
  // Sistema de pagamentos
  showPaymentModal: boolean = false;

  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForBirthTable: boolean = false;
  blockedMessageId: string | null = null;

  // ✅ NOVO: Sistema de 3 mensagens grátis
  private userMessageCount: number = 0;
  private readonly FREE_MESSAGES_LIMIT = 3;

  private backendUrl = environment.apiUrl;

  constructor(
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    @Optional() public dialogRef: MatDialogRef<TablaNacimientoComponent>,
    private http: HttpClient,
    private tablaNacimientoService: TablaNacimientoService,
    private elRef: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef,
    private paypalService: PaypalService
  ) {}
  ngAfterViewInit(): void {
    this.setVideosSpeed(0.6); // 0.5 = mais lento, 1 = normal
  }

  private setVideosSpeed(rate: number): void {
    const host = this.elRef.nativeElement;
    const videos = host.querySelectorAll<HTMLVideoElement>('video');
    videos.forEach((v) => {
      const apply = () => (v.playbackRate = rate);
      if (v.readyState >= 1) apply();
      else v.addEventListener('loadedmetadata', apply, { once: true });
    });
  }
  async ngOnInit(): Promise<void> {
    this.hasUserPaidForBirthTable =
      sessionStorage.getItem('hasUserPaidForBirthTable_geburtstabelle') ===
      'true';

    const paymentStatus = this.paypalService.checkPaymentStatusFromUrl();

    if (paymentStatus && paymentStatus.status === 'COMPLETED') {
      try {
        const verification = await this.paypalService.verifyAndProcessPayment(
          paymentStatus.token
        );

        if (verification.valid && verification.status === 'approved') {
          this.hasUserPaidForBirthTable = true;
          sessionStorage.setItem(
            'hasUserPaidForBirthTable_geburtstabelle',
            'true'
          );
          localStorage.removeItem('paypal_payment_completed');

          this.blockedMessageId = null;
          sessionStorage.removeItem('vocationalBlockedMessageId');

          // Limpar URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          this.messages.push({
            sender: 'Mestra Emma',
            content:
              '✨ Pagamento confirmado! Agora você pode acessar toda minha experiência.',
            timestamp: new Date(),
            isUser: false,
          });

          this.saveMessagesToSession();

          this.cdr.markForCheck();
        }
      } catch (error) {
        console.error('Erro verificando pagamento do PayPal:', error);
        this.paymentError = 'Erro na verificação do pagamento';
      }
    }

    // ✅ NOVO: Carregar contador de mensagens
    const savedMessageCount = sessionStorage.getItem(
      'birthChartUserMessageCount'
    );
    if (savedMessageCount) {
      this.userMessageCount = parseInt(savedMessageCount, 10);
    }

    // ✅ NOVO: Carregar dados do usuário do sessionStorage
    const savedUserData = sessionStorage.getItem('userData');
    if (savedUserData) {
      try {
        this.userData = JSON.parse(savedUserData);
      } catch (error) {
        this.userData = null;
      }
    } else {
      this.userData = null;
    }

    // Carregar dados salvos
    this.loadSavedData();

    // Mensagem de boas-vindas
    if (this.messages.length === 0) {
      this.initializeBirthChartWelcomeMessage();
    }

    // ✅ TAMBÉM VERIFICAR PARA MENSAGENS RESTAURADAS
    if (this.messages.length > 0 && FortuneWheelComponent.canShowWheel()) {
      this.showBirthChartWheelAfterDelay(2000);
    }
  }
  private initializeBirthChartWelcomeMessage(): void {
    this.addMessage({
      sender: 'Mestra Emma',
      content: `🌟 Olá, buscador dos segredos celestiais! Sou Emma, sua guia no cosmos das configurações astrais. 

Estou aqui para decifrar os segredos ocultos no seu mapa natal. As estrelas esperaram este momento para revelar sua sabedoria.

Que aspecto do seu mapa natal você deseja explorar primeiro?`,
      timestamp: new Date(),
      isUser: false,
    });

    // ✅ VERIFICAÇÃO DE ROLETA NATAL
    if (FortuneWheelComponent.canShowWheel()) {
      this.showBirthChartWheelAfterDelay(3000);
    } else {
    }
  }
  ngAfterViewChecked(): void {
    if (
      this.shouldScrollToBottom &&
      !this.isUserScrolling &&
      this.messages.length > this.lastMessageCount
    ) {
      this.scrollToBottom();
      this.lastMessageCount = this.messages.length;
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }
  }

  private loadSavedData(): void {
    const savedMessages = sessionStorage.getItem('birthChartMessages');
    const savedBlockedMessageId = sessionStorage.getItem(
      'birthChartBlockedMessageId'
    );
    const savedChartData = sessionStorage.getItem('birthChartData');

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.messages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        this.blockedMessageId = savedBlockedMessageId || null;
        this.lastMessageCount = this.messages.length;
      } catch (error) {
        // Limpar dados corrompidos
        this.initializeBirthChartWelcomeMessage();
      }
    }

    if (savedChartData) {
      try {
        this.chartData = JSON.parse(savedChartData);
        this.fullName = this.chartData.fullName || '';
        this.birthDate = this.chartData.birthDate || '';
        this.birthTime = this.chartData.birthTime || '';
        this.birthPlace = this.chartData.birthPlace || '';
      } catch (error) {}
    }
  }

  // ✅ NOVO: Obter mensagens grátis restantes
  getFreeMessagesRemaining(): number {
    if (this.hasUserPaidForBirthTable) {
      return -1; // Ilimitado
    }
    return Math.max(0, this.FREE_MESSAGES_LIMIT - this.userMessageCount);
  }

  sendMessage(): void {
    if (this.currentMessage?.trim() && !this.isLoading) {
      const userMessage = this.currentMessage.trim();

      // Calcular o próximo número de mensagem
      const nextMessageCount = this.userMessageCount + 1;

      console.log(
        `📊 Mapa Natal - Mensagem #${nextMessageCount}, Premium: ${this.hasUserPaidForBirthTable}, Limite: ${this.FREE_MESSAGES_LIMIT}`
      );

      // ✅ Verificar acesso
      const canSendMessage =
        this.hasUserPaidForBirthTable ||
        this.hasFreeBirthChartConsultationsAvailable() ||
        nextMessageCount <= this.FREE_MESSAGES_LIMIT;

      if (!canSendMessage) {
        console.log('❌ Sem acesso - mostrando modal de pagamento');

        // Fechar outros modais
        this.showFortuneWheel = false;
        this.showPaymentModal = false;

        // Guardar mensagem pendente
        sessionStorage.setItem('pendingBirthChartMessage', userMessage);
        this.saveStateBeforePayment();

        // Mostrar modal de dados
        setTimeout(() => {
          this.showDataModal = true;
          this.cdr.markForCheck();
        }, 100);

        return;
      }

      // ✅ Se usa consulta grátis da roleta (depois das 3 grátis)
      if (
        !this.hasUserPaidForBirthTable &&
        nextMessageCount > this.FREE_MESSAGES_LIMIT &&
        this.hasFreeBirthChartConsultationsAvailable()
      ) {
        this.useFreeBirthChartConsultation();
      }

      this.shouldScrollToBottom = true;

      // Processar mensagem normalmente
      this.processBirthChartUserMessage(userMessage, nextMessageCount);
    }
  }
  private processBirthChartUserMessage(
    userMessage: string,
    messageCount: number
  ): void {
    // Adicionar mensagem do usuário
    const userMsg = {
      sender: 'Você',
      content: userMessage,
      timestamp: new Date(),
      isUser: true,
    };
    this.messages.push(userMsg);

    // ✅ Atualizar contador
    this.userMessageCount = messageCount;
    sessionStorage.setItem(
      'birthChartUserMessageCount',
      this.userMessageCount.toString()
    );

    this.saveMessagesToSession();
    this.currentMessage = '';
    this.isLoading = true;

    // ✅ Usar o serviço real de mapa natal com contador
    this.generateAstrologicalResponse(userMessage, messageCount).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        const messageId = Date.now().toString();
        const astrologerMsg = {
          sender: 'Mestra Emma',
          content: response,
          timestamp: new Date(),
          isUser: false,
          id: messageId,
        };
        this.messages.push(astrologerMsg);

        this.shouldScrollToBottom = true;

        // ✅ Mostrar paywall se superou o limite gratuito E não tem consultas da roleta
        const shouldShowPaywall =
          !this.hasUserPaidForBirthTable &&
          messageCount > this.FREE_MESSAGES_LIMIT &&
          !this.hasFreeBirthChartConsultationsAvailable();

        if (shouldShowPaywall) {
          this.blockedMessageId = messageId;
          sessionStorage.setItem('birthChartBlockedMessageId', messageId);

          setTimeout(() => {
            this.saveStateBeforePayment();

            // Fechar outros modais
            this.showFortuneWheel = false;
            this.showPaymentModal = false;

            // Mostrar modal de dados
            setTimeout(() => {
              this.showDataModal = true;
              this.cdr.markForCheck();
            }, 100);
          }, 2000);
        }

        this.saveMessagesToSession();
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.isLoading = false;

        const errorMsg = {
          sender: 'Mestra Emma',
          content:
            '🌟 Desculpe, as configurações celestiais estão temporariamente perturbadas. Por favor, tente novamente em alguns momentos.',
          timestamp: new Date(),
          isUser: false,
        };
        this.messages.push(errorMsg);
        this.saveMessagesToSession();
        this.cdr.markForCheck();
      },
    });
  }
  private generateAstrologicalResponse(
    userMessage: string,
    messageCount: number
  ): Observable<string> {
    // Criar o histórico de conversação para o contexto
    const conversationHistory = this.messages
      .filter((msg) => msg.content && msg.content.trim() !== '')
      .map((msg) => ({
        role: msg.isUser ? ('user' as const) : ('astrologer' as const),
        message: msg.content,
      }));

    // Criar a solicitação com a estrutura correta
    const request: BirthChartRequest = {
      chartData: {
        name: this.astrologerInfo.name,
        specialty: this.astrologerInfo.specialty,
        experience:
          'Séculos de experiência interpretando configurações celestiais e segredos dos mapas natais',
      },
      userMessage,
      birthDate: this.birthDate,
      birthTime: this.birthTime,
      birthPlace: this.birthPlace,
      fullName: this.fullName,
      conversationHistory,
    };

    // ✅ Chamar o serviço com contador de mensagens
    return this.tablaNacimientoService
      .chatWithAstrologerWithCount(
        request,
        messageCount,
        this.hasUserPaidForBirthTable
      )
      .pipe(
        map((response: BirthChartResponse) => {
          if (response.success && response.response) {
            return response.response;
          } else {
            throw new Error(response.error || 'Erro desconhecido do serviço');
          }
        }),
        catchError((error: any) => {
          return of(
            '🌟 As configurações celestiais estão temporariamente nubladas. As estrelas me sussurram que devo recarregar minhas energias cósmicas. Por favor, tente novamente em alguns momentos.'
          );
        })
      );
  }

  private saveStateBeforePayment(): void {
    this.saveMessagesToSession();
    this.saveChartData();
    sessionStorage.setItem(
      'birthChartUserMessageCount',
      this.userMessageCount.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'birthChartBlockedMessageId',
        this.blockedMessageId
      );
    }
  }

  private saveMessagesToSession(): void {
    try {
      const messagesToSave = this.messages.map((msg) => ({
        ...msg,
        timestamp:
          msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : msg.timestamp,
      }));
      sessionStorage.setItem(
        'birthChartMessages',
        JSON.stringify(messagesToSave)
      );
    } catch {}
  }

  private saveChartData(): void {
    try {
      const dataToSave = {
        ...this.chartData,
        fullName: this.fullName,
        birthDate: this.birthDate,
        birthTime: this.birthTime,
        birthPlace: this.birthPlace,
      };
      sessionStorage.setItem('birthChartData', JSON.stringify(dataToSave));
    } catch {}
  }

  isMessageBlocked(message: Message): boolean {
    return (
      message.id === this.blockedMessageId && !this.hasUserPaidForBirthTable
    );
  }

  async promptForPayment(): Promise<void> {
    this.showPaymentModal = true;
    this.cdr.markForCheck();
    this.paymentError = null;
    this.isProcessingPayment = false;

    // Validar dados do usuário
    if (!this.userData) {
      const savedUserData = sessionStorage.getItem('userData');
      if (savedUserData) {
        try {
          this.userData = JSON.parse(savedUserData);
        } catch (error) {
          this.userData = null;
        }
      }
    }

    if (!this.userData) {
      this.paymentError =
        'Não foram encontrados dados do cliente. Por favor, complete o formulário primeiro.';
      this.showDataModal = true;
      this.cdr.markForCheck();
      return;
    }

    const email = this.userData.email?.toString().trim();
    if (!email) {
      this.paymentError =
        'E-mail obrigatório. Por favor, complete o formulário.';
      this.showDataModal = true;
      this.cdr.markForCheck();
      return;
    }

    // Guardar mensagem pendente se existir
    if (this.currentMessage) {
      sessionStorage.setItem('pendingBirthTableMessage', this.currentMessage);
    }
  }

  async handlePaymentSubmit(): Promise<void> {
    this.isProcessingPayment = true;
    this.paymentError = null;
    this.cdr.markForCheck();

    try {
      await this.paypalService.initiatePayment({
        amount: '4.00',
        currency: 'EUR',
        serviceName: 'Mapa de Nascimento',
        returnPath: '/tabela-nascimento',
        cancelPath: '/tabela-nascimento',
      });
    } catch (error: any) {
      this.paymentError =
        error.message || 'Erro ao inicializar o pagamento do PayPal.';
      this.isProcessingPayment = false;
      this.cdr.markForCheck();
    }
  }

  cancelPayment(): void {
    this.showPaymentModal = false;
    this.isProcessingPayment = false;
    this.paymentError = null;
    this.cdr.markForCheck();
  }

  // Métodos de tratamento de dados pessoais
  savePersonalData(): void {
    this.chartData = {
      ...this.chartData,
      fullName: this.fullName,
      birthDate: this.birthDate,
      birthTime: this.birthTime,
      birthPlace: this.birthPlace,
    };

    // Gerar signos de exemplo baseados nos dados
    if (this.birthDate) {
      this.generateSampleChartData();
    }

    this.saveChartData();
    this.showDataForm = false;

    this.shouldScrollToBottom = true;
    this.addMessage({
      sender: 'Mestra Emma',
      content: `🌟 Perfeito, ${this.fullName}. Registrei seus dados celestiais. As configurações do seu nascimento em ${this.birthPlace} no dia ${this.birthDate} revelam padrões únicos no cosmos. Em qual aspecto específico do seu mapa natal você quer se concentrar?`,
      timestamp: new Date(),
      isUser: false,
    });
  }

  private generateSampleChartData(): void {
    // Gerar dados de exemplo baseados na data de nascimento
    const date = new Date(this.birthDate);
    const month = date.getMonth() + 1;

    const zodiacSigns = [
      'Capricórnio',
      'Aquário',
      'Peixes',
      'Áries',
      'Touro',
      'Gêmeos',
      'Câncer',
      'Leão',
      'Virgem',
      'Libra',
      'Escorpião',
      'Sagitário',
    ];
    const signIndex = Math.floor((month - 1) / 1) % 12;
    this.chartData.sunSign = zodiacSigns[signIndex];
    this.chartData.moonSign = zodiacSigns[(signIndex + 4) % 12];
    this.chartData.ascendant = zodiacSigns[(signIndex + 8) % 12];
  }

  toggleDataForm(): void {
    this.showDataForm = !this.showDataForm;
  }

  // Métodos de utilidade
  addMessage(message: Message): void {
    this.messages.push(message);
    this.shouldScrollToBottom = true;
  }

  formatMessage(content: string): string {
    if (!content) return '';

    let formattedContent = content;

    // Converter **texto** para <strong>texto</strong> para negrito
    formattedContent = formattedContent.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    // Converter quebras de linha para <br> para melhor visualização
    formattedContent = formattedContent.replace(/\n/g, '<br>');

    // Opcional: Também pode tratar *texto* (um único asterisco) como itálico
    formattedContent = formattedContent.replace(
      /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
      '<em>$1</em>'
    );

    return formattedContent;
  }

  onScroll(event: any): void {
    const element = event.target;
    const isAtBottom =
      element.scrollHeight - element.scrollTop === element.clientHeight;
    this.isUserScrolling = !isAtBottom;
    if (isAtBottom) this.isUserScrolling = false;
  }

  onUserStartScroll(): void {
    this.isUserScrolling = true;
    setTimeout(() => {
      if (this.chatContainer) {
        const element = this.chatContainer.nativeElement;
        const isAtBottom =
          element.scrollHeight - element.scrollTop === element.clientHeight;
        if (isAtBottom) this.isUserScrolling = false;
      }
    }, 3000);
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        const element = this.chatContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch {}
  }
  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  getTimeString(timestamp: Date | string): string {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(date.getTime())) return 'N/D';
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/D';
    }
  }
  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
  clearChat(): void {
    // Limpar mensagens do chat
    this.messages = [];
    this.currentMessage = '';
    this.lastMessageCount = 0;

    // ✅ Resetar contador e estados
    if (!this.hasUserPaidForBirthTable) {
      this.userMessageCount = 0;
      this.blockedMessageId = null;
      sessionStorage.removeItem('birthChartMessages');
      sessionStorage.removeItem('birthChartBlockedMessageId');
      sessionStorage.removeItem('birthChartData');
      sessionStorage.removeItem('birthChartUserMessageCount');
      sessionStorage.removeItem('freeBirthChartConsultations');
      sessionStorage.removeItem('pendingBirthChartMessage');
    } else {
      sessionStorage.removeItem('birthChartMessages');
      sessionStorage.removeItem('birthChartBlockedMessageId');
      sessionStorage.removeItem('birthChartData');
      sessionStorage.removeItem('birthChartUserMessageCount');
      this.userMessageCount = 0;
      this.blockedMessageId = null;
    }

    this.isLoading = false;

    // Indicar que deve fazer scroll porque há uma nova mensagem
    this.shouldScrollToBottom = true;

    // Usar o método separado para inicializar
    this.initializeBirthChartWelcomeMessage();
  }
  onUserDataSubmitted(userData: any): void {
    // ✅ VALIDAR CAMPOS CRÍTICOS ANTES DE PROSSEGUIR
    const requiredFields = ['email'];
    const missingFields = requiredFields.filter(
      (field) => !userData[field] || userData[field].toString().trim() === ''
    );

    if (missingFields.length > 0) {
      alert(
        `Para continuar, você deve completar o seguinte: ${missingFields.join(
          ', '
        )}`
      );
      this.showDataModal = true; // Manter modal aberto
      this.cdr.markForCheck();
      return;
    }

    // ✅ LIMPAR E SALVAR dados IMEDIATAMENTE na memória E sessionStorage
    this.userData = {
      ...userData,
      email: userData.email?.toString().trim(),
    };

    // ✅ SALVAR NO sessionStorage IMEDIATAMENTE
    try {
      sessionStorage.setItem('userData', JSON.stringify(this.userData));

      // Verificar se foi salvo corretamente
      const verificacao = sessionStorage.getItem('userData');
    } catch (error) {}

    this.showDataModal = false;
    this.cdr.markForCheck();

    // ✅ NOVO: Enviar dados ao backend como nos outros componentes
    this.sendUserDataToBackend(userData);
  }
  private sendUserDataToBackend(userData: any): void {
    this.http.post(`${this.backendUrl}api/recolecta`, userData).subscribe({
      next: (response) => {
        // ✅ CHAMAR promptForPayment QUE INICIALIZA O PAGAMENTO
        this.promptForPayment();
      },
      error: (error) => {
        // ✅ AINDA ASSIM ABRIR O MODAL DE PAGAMENTO
        this.promptForPayment();
      },
    });
  }
  onDataModalClosed(): void {
    this.showDataModal = false;
    this.cdr.markForCheck();
  }
  showBirthChartWheelAfterDelay(delayMs: number = 3000): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }

    this.wheelTimer = setTimeout(() => {
      if (
        FortuneWheelComponent.canShowWheel() &&
        !this.showPaymentModal &&
        !this.showDataModal
      ) {
        this.showFortuneWheel = true;
        this.cdr.markForCheck();
      } else {
      }
    }, delayMs);
  }

  onPrizeWon(prize: Prize): void {
    const prizeMessage: Message = {
      sender: 'Mestra Emma',
      content: `🌟 As configurações celestiais conspiraram a seu favor! Você ganhou: **${prize.name}** ${prize.icon}\n\nOs antigos guardiões das estrelas decidiram abençoá-lo com este presente sagrado. A energia cósmica flui através de você, revelando segredos mais profundos do seu mapa natal. Que a sabedoria celestial o ilumine!`,
      timestamp: new Date(),
      isUser: false,
    };

    this.messages.push(prizeMessage);
    this.shouldScrollToBottom = true;
    this.saveMessagesToSession();

    this.processBirthChartPrize(prize);
  }

  onWheelClosed(): void {
    this.showFortuneWheel = false;
  }

  triggerBirthChartWheel(): void {
    if (this.showPaymentModal || this.showDataModal) {
      return;
    }

    if (FortuneWheelComponent.canShowWheel()) {
      this.showFortuneWheel = true;
      this.cdr.markForCheck();
    } else {
      alert(
        'Você não tem mais giros disponíveis. ' +
          FortuneWheelComponent.getSpinStatus()
      );
    }
  }

  getSpinStatus(): string {
    return FortuneWheelComponent.getSpinStatus();
  }
  private processBirthChartPrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Leituras Astrais
        this.addFreeBirthChartConsultations(3);
        break;
      case '2': // 1 Análise Premium - ACESSO COMPLETO
        this.hasUserPaidForBirthTable = true;
        sessionStorage.setItem('hasUserPaidBirthChart', 'true');

        // Desbloquear qualquer mensagem bloqueada
        if (this.blockedMessageId) {
          this.blockedMessageId = null;
          sessionStorage.removeItem('birthChartBlockedMessageId');
        }

        // Adicionar mensagem especial para este prêmio
        const premiumMessage: Message = {
          sender: 'Mestra Emma',
          content:
            '🌟 **Você desbloqueou o acesso Premium completo!** 🌟\n\nAs configurações celestiais sorriram para você de maneira extraordinária. Agora você tem acesso ilimitado a toda minha sabedoria sobre mapas natais. Pode consultar sobre sua configuração astral, planetas, casas e todos os segredos celestiais quantas vezes desejar.\n\n✨ *O universo abriu todas as suas portas para você* ✨',
          timestamp: new Date(),
          isUser: false,
        };
        this.messages.push(premiumMessage);
        this.shouldScrollToBottom = true;
        this.saveMessagesToSession();
        break;
      case '4': // Outra oportunidade
        break;
      default:
    }
  }
  private addFreeBirthChartConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeBirthChartConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeBirthChartConsultations', newTotal.toString());

    if (this.blockedMessageId && !this.hasUserPaidForBirthTable) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('birthChartBlockedMessageId');
    }
  }

  private hasFreeBirthChartConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeBirthChartConsultations') || '0'
    );
    return freeConsultations > 0;
  }

  private useFreeBirthChartConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeBirthChartConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem(
        'freeBirthChartConsultations',
        remaining.toString()
      );

      const prizeMsg: Message = {
        sender: 'Mestra Emma',
        content: `✨ *Você utilizou uma leitura astral gratuita* ✨\n\nVocê ainda tem **${remaining}** consultas celestiais disponíveis.`,
        timestamp: new Date(),
        isUser: false,
      };

      this.messages.push(prizeMsg);
      this.shouldScrollToBottom = true;
      this.saveMessagesToSession();
    }
  }

  debugBirthChartWheel(): void {
    this.showFortuneWheel = true;
    this.cdr.markForCheck();
  }

  // ✅ MÉTODO AUXILIAR para o template
  getBirthChartConsultationsCount(): number {
    return parseInt(
      sessionStorage.getItem('freeBirthChartConsultations') || '0'
    );
  }

  // ✅ MÉTODO AUXILIAR para parsing no template
  parseInt(value: string): number {
    return parseInt(value);
  }
}
