import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
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
  InformacionZodiacoService,
  ZodiacRequest,
  ZodiacResponse,
  AstrologerData,
} from '../../services/informacion-zodiaco.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { PaypalService } from '../../services/paypal.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environmets.prod';
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';

interface ZodiacMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
  sender?: string;
  id?: string;
  freeMessagesRemaining?: number;
  showPaywall?: boolean;
  isCompleteResponse?: boolean;
  isPrizeAnnouncement?: boolean;
}

@Component({
  selector: 'app-informacion-zodiaco',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RecolectaDatosComponent,
  ],
  templateUrl: './informacion-zodiaco.component.html',
  styleUrl: './informacion-zodiaco.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformacionZodiacoComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Variáveis principais do chat
  currentMessage: string = '';
  messages: ZodiacMessage[] = [];
  isLoading = false;
  hasStartedConversation = false;

  // Variáveis de controle de scroll
  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  // Variáveis para modal de dados
  showDataModal: boolean = false;
  userData: any = null;

  // Variáveis para controle de pagamentos
  showPaymentModal: boolean = false;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForAstrology: boolean = false;

  // ✅ NOVO: Sistema de 3 mensagens grátis
  private userMessageCount: number = 0;
  private readonly FREE_MESSAGES_LIMIT = 3;

  // Configuração da roleta da fortuna
  showFortuneWheel: boolean = false;
  astralPrizes: Prize[] = [
    {
      id: '1',
      name: '3 giros da Roleta Astral',
      color: '#4ecdc4',
      icon: '🔮',
    },
    { id: '2', name: '1 Leitura Premium Astral', color: '#45b7d1', icon: '✨' },
    {
      id: '4',
      name: 'Tente novamente!',
      color: '#ff7675',
      icon: '🌙',
    },
  ];

  private wheelTimer: any;
  blockedMessageId: string | null = null;
  private backendUrl = environment.apiUrl;

  astrologerInfo = {
    name: 'Mestra Carla',
    title: 'Guardiã das Estrelas',
    specialty: 'Especialista em Astrologia e Signos do Zodíaco',
  };

  // Frases de boas-vindas aleatórias
  welcomeMessages = [
    'Bem-vindo, alma cósmica. As estrelas me sussurraram sua chegada... Que segredos do zodíaco você quer decifrar hoje?',
    'Os planetas se alinham para recebê-lo. Sou a Mestra Carla, intérprete dos destinos celestiais. Sobre o que você quer consultar em relação ao seu signo zodiacal ou aspecto celestial?',
    'O universo vibra com sua presença... As constelações dançam e esperam suas perguntas. Permita-me guiá-lo através dos caminhos do zodíaco.',
    'Ah, vejo que as estrelas o guiaram até mim. Os segredos dos signos do zodíaco aguardam ser revelados. O que o inquieta no firmamento?',
  ];

  constructor(
    private http: HttpClient,
    private zodiacoService: InformacionZodiacoService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    @Optional() public dialogRef: MatDialogRef<InformacionZodiacoComponent>,
    private cdr: ChangeDetectorRef,
    private paypalService: PaypalService
  ) {}

  async ngOnInit(): Promise<void> {
    // Carregar estado de pagamento
    this.hasUserPaidForAstrology =
      sessionStorage.getItem('hasUserPaidForZodiacInfo_zodiacInfo') === 'true';

    // ✅ NOVO: Carregar contador de mensagens
    const savedMessageCount = sessionStorage.getItem('zodiacUserMessageCount');
    if (savedMessageCount) {
      this.userMessageCount = parseInt(savedMessageCount, 10);
    }

    // Verificar pagamento do PayPal
    const paymentStatus = this.paypalService.checkPaymentStatusFromUrl();

    if (paymentStatus && paymentStatus.status === 'COMPLETED') {
      try {
        const verification = await this.paypalService.verifyAndProcessPayment(
          paymentStatus.token
        );

        if (verification.valid && verification.status === 'approved') {
          this.hasUserPaidForAstrology = true;
          sessionStorage.setItem('hasUserPaidForZodiacInfo_zodiacInfo', 'true');
          localStorage.removeItem('paypal_payment_completed');

          this.blockedMessageId = null;
          sessionStorage.removeItem('astrologyBlockedMessageId');

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          this.messages.push({
            sender: this.astrologerInfo.name,
            content:
              '✨ Pagamento confirmado! Agora você pode acessar toda minha experiência e sabedoria celestial sem limites.',
            timestamp: new Date(),
            isUser: false,
          });

          this.cdr.markForCheck();
        }
      } catch (error) {
        this.paymentError = 'Erro na verificação do pagamento';
      }
    }

    // Carregar dados do usuário do sessionStorage
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

    // Carregar mensagens salvas
    const savedMessages = sessionStorage.getItem('astrologyMessages');
    const savedBlockedMessageId = sessionStorage.getItem(
      'astrologyBlockedMessageId'
    );

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.messages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        this.blockedMessageId = savedBlockedMessageId || null;
        this.hasStartedConversation = true;
      } catch (error) {
        this.clearSessionData();
        this.startConversation();
      }
    } else {
      this.startConversation();
    }

    // Mostrar roleta se corresponder
    if (this.hasStartedConversation && FortuneWheelComponent.canShowWheel()) {
      this.showWheelAfterDelay(2000);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll && this.messages.length > this.lastMessageCount) {
      this.scrollToBottom();
      this.lastMessageCount = this.messages.length;
    }
  }

  ngOnDestroy(): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }
  }

  // ✅ NOVO: Obter mensagens grátis restantes
  getFreeMessagesRemaining(): number {
    if (this.hasUserPaidForAstrology) {
      return -1; // Ilimitado
    }
    return Math.max(0, this.FREE_MESSAGES_LIMIT - this.userMessageCount);
  }

  // ✅ NOVO: Verificar se tem acesso
  private hasAccess(): boolean {
    // Premium = acesso ilimitado
    if (this.hasUserPaidForAstrology) {
      return true;
    }

    // Tem consultas grátis da roleta
    if (this.hasFreeAstrologyConsultationsAvailable()) {
      return true;
    }

    // Dentro do limite de mensagens grátis
    if (this.userMessageCount < this.FREE_MESSAGES_LIMIT) {
      return true;
    }

    return false;
  }

  showWheelAfterDelay(delayMs: number = 3000): void {
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
      }
    }, delayMs);
  }

  onPrizeWon(prize: Prize): void {
    const prizeMessage: ZodiacMessage = {
      isUser: false,
      content: `🌟 As energias cósmicas o abençoaram! Você ganhou: **${prize.name}** ${prize.icon}\n\nEste presente do universo foi ativado para você. Os segredos do zodíaco serão revelados com maior clareza. Que a fortuna astral o acompanhe em suas próximas consultas!`,
      timestamp: new Date(),
      isPrizeAnnouncement: true,
    };

    this.messages.push(prizeMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();

    this.processAstralPrize(prize);
  }

  onWheelClosed(): void {
    this.showFortuneWheel = false;
  }

  triggerFortuneWheel(): void {
    if (this.showPaymentModal || this.showDataModal) {
      return;
    }

    if (FortuneWheelComponent.canShowWheel()) {
      this.showFortuneWheel = true;
      this.cdr.markForCheck();
    } else {
      alert(
        'Você não tem giros disponíveis. ' +
          FortuneWheelComponent.getSpinStatus()
      );
    }
  }

  getSpinStatus(): string {
    return FortuneWheelComponent.getSpinStatus();
  }

  private processAstralPrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Consultas Grátis
        this.addFreeAstrologyConsultations(3);
        break;
      case '2': // 1 Leitura Premium - ACESSO COMPLETO
        this.hasUserPaidForAstrology = true;
        sessionStorage.setItem('hasUserPaidForZodiacInfo_zodiacInfo', 'true');

        if (this.blockedMessageId) {
          this.blockedMessageId = null;
          sessionStorage.removeItem('astrologyBlockedMessageId');
        }

        const premiumMessage: ZodiacMessage = {
          isUser: false,
          content:
            '✨ **Você desbloqueou o acesso Premium completo!** ✨\n\nAs estrelas se alinharam de maneira extraordinária para ajudá-lo. Agora você tem acesso ilimitado a todo o conhecimento astral. Pode consultar signos do zodíaco, compatibilidades, previsões astrológicas e todos os segredos celestiais quantas vezes desejar.\n\n🌟 *As estrelas abriram todas as suas portas cósmicas para você* 🌟',
          timestamp: new Date(),
        };
        this.messages.push(premiumMessage);
        this.shouldAutoScroll = true;
        this.saveMessagesToSession();
        break;
      case '4': // Outra oportunidade
        break;
      default:
    }
  }

  private addFreeAstrologyConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeAstrologyConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeAstrologyConsultations', newTotal.toString());

    if (this.blockedMessageId && !this.hasUserPaidForAstrology) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('astrologyBlockedMessageId');
    }

    // Mensagem informativa
    const infoMessage: ZodiacMessage = {
      isUser: false,
      content: `✨ *Você recebeu ${count} consultas astrais gratuitas* ✨\n\nAgora você tem **${newTotal}** consultas disponíveis para explorar os mistérios do zodíaco.`,
      timestamp: new Date(),
    };
    this.messages.push(infoMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();
  }

  private hasFreeAstrologyConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeAstrologyConsultations') || '0'
    );
    return freeConsultations > 0;
  }

  private useFreeAstrologyConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeAstrologyConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem(
        'freeAstrologyConsultations',
        remaining.toString()
      );

      const prizeMsg: ZodiacMessage = {
        isUser: false,
        content: `✨ *Você utilizou uma consulta astral gratuita* ✨\n\nVocê ainda tem **${remaining}** consultas astrais gratuitas.`,
        timestamp: new Date(),
      };
      this.messages.push(prizeMsg);
      this.shouldAutoScroll = true;
      this.saveMessagesToSession();
    }
  }

  onScroll(event: any): void {
    const element = event.target;
    const threshold = 50;
    const isNearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <
      threshold;
    this.shouldAutoScroll = isNearBottom;
  }

  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  startConversation(): void {
    if (this.messages.length === 0) {
      const randomWelcome =
        this.welcomeMessages[
          Math.floor(Math.random() * this.welcomeMessages.length)
        ];

      const welcomeMessage: ZodiacMessage = {
        isUser: false,
        content: randomWelcome,
        timestamp: new Date(),
      };

      this.messages.push(welcomeMessage);
    }
    this.hasStartedConversation = true;

    if (FortuneWheelComponent.canShowWheel()) {
      this.showWheelAfterDelay(3000);
    }
  }

  // ✅ MODIFICADO: sendMessage() com sistema de 3 mensagens grátis
  sendMessage(): void {
    if (this.currentMessage?.trim() && !this.isLoading) {
      const userMessage = this.currentMessage.trim();

      // Calcular o próximo número de mensagem
      const nextMessageCount = this.userMessageCount + 1;

      console.log(
        `📊 Mensagem #${nextMessageCount}, Premium: ${this.hasUserPaidForAstrology}, Limite: ${this.FREE_MESSAGES_LIMIT}`
      );

      // ✅ Verificar acesso
      const canSendMessage =
        this.hasUserPaidForAstrology ||
        this.hasFreeAstrologyConsultationsAvailable() ||
        nextMessageCount <= this.FREE_MESSAGES_LIMIT;

      if (!canSendMessage) {
        console.log('❌ Sem acesso - mostrando modal de pagamento');

        // Fechar outros modais
        this.showFortuneWheel = false;
        this.showPaymentModal = false;

        // Guardar mensagem pendente
        sessionStorage.setItem('pendingAstrologyMessage', userMessage);
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
        !this.hasUserPaidForAstrology &&
        nextMessageCount > this.FREE_MESSAGES_LIMIT &&
        this.hasFreeAstrologyConsultationsAvailable()
      ) {
        this.useFreeAstrologyConsultation();
      }

      this.shouldAutoScroll = true;
      this.processUserMessage(userMessage, nextMessageCount);
    }
  }

  // ✅ MODIFICADO: processUserMessage() para enviar messageCount ao backend
  private processUserMessage(userMessage: string, messageCount: number): void {
    // Adicionar mensagem do usuário
    const userMsg: ZodiacMessage = {
      isUser: true,
      content: userMessage,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);

    // ✅ Atualizar contador
    this.userMessageCount = messageCount;
    sessionStorage.setItem(
      'zodiacUserMessageCount',
      this.userMessageCount.toString()
    );

    this.saveMessagesToSession();
    this.currentMessage = '';
    this.isLoading = true;
    this.cdr.markForCheck();

    // ✅ Gerar resposta com messageCount
    this.generateAstrologyResponse(userMessage, messageCount).subscribe({
      next: (response: ZodiacResponse) => {
        this.isLoading = false;

        const messageId = Date.now().toString();
        const astrologerMsg: ZodiacMessage = {
          isUser: false,
          content: response.response || '',
          timestamp: new Date(),
          id: messageId,
          freeMessagesRemaining: response.freeMessagesRemaining,
          showPaywall: response.showPaywall,
          isCompleteResponse: response.isCompleteResponse,
        };
        this.messages.push(astrologerMsg);

        this.shouldAutoScroll = true;

        console.log(
          `📊 Resposta - Mensagens restantes: ${response.freeMessagesRemaining}, Paywall: ${response.showPaywall}, Completa: ${response.isCompleteResponse}`
        );

        // ✅ Mostrar paywall se o backend indicar
        if (response.showPaywall && !this.hasUserPaidForAstrology) {
          this.blockedMessageId = messageId;
          sessionStorage.setItem('astrologyBlockedMessageId', messageId);

          setTimeout(() => {
            this.saveStateBeforePayment();

            this.showFortuneWheel = false;
            this.showPaymentModal = false;

            setTimeout(() => {
              this.showDataModal = true;
              this.cdr.markForCheck();
            }, 100);
          }, 2500);
        }

        this.saveMessagesToSession();
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Erro na resposta:', error);

        const errorMsg: ZodiacMessage = {
          isUser: false,
          content:
            '🌟 Desculpe, as energias cósmicas estão temporariamente perturbadas. Por favor, tente novamente em alguns momentos.',
          timestamp: new Date(),
        };
        this.messages.push(errorMsg);
        this.saveMessagesToSession();
        this.cdr.markForCheck();
      },
    });
  }

  // ✅ MODIFICADO: generateAstrologyResponse() para incluir messageCount e isPremiumUser
  private generateAstrologyResponse(
    userMessage: string,
    messageCount: number
  ): Observable<ZodiacResponse> {
    // Criar histórico de conversação
    const conversationHistory = this.messages
      .filter(
        (msg) =>
          msg.content && msg.content.trim() !== '' && !msg.isPrizeAnnouncement
      )
      .slice(-10) // Últimas 10 mensagens para contexto
      .map((msg) => ({
        role: msg.isUser ? ('user' as const) : ('astrologer' as const),
        message: msg.content,
      }));

    // Dados do astrólogo
    const astrologerData: AstrologerData = {
      name: this.astrologerInfo.name,
      title: this.astrologerInfo.title,
      specialty: this.astrologerInfo.specialty,
      experience:
        'Séculos de experiência na interpretação de destinos celestiais e influências das estrelas',
    };

    // ✅ Request com messageCount e isPremiumUser
    const request: ZodiacRequest = {
      zodiacData: astrologerData,
      userMessage,
      conversationHistory,
      messageCount: messageCount,
      isPremiumUser: this.hasUserPaidForAstrology,
    };

    console.log('📤 Enviando request:', {
      messageCount: request.messageCount,
      isPremiumUser: request.isPremiumUser,
      userMessage: request.userMessage.substring(0, 50) + '...',
    });

    return this.zodiacoService.chatWithAstrologer(request).pipe(
      map((response: ZodiacResponse) => {
        console.log('📥 Resposta recebida:', {
          success: response.success,
          freeMessagesRemaining: response.freeMessagesRemaining,
          showPaywall: response.showPaywall,
          isCompleteResponse: response.isCompleteResponse,
        });

        if (response.success) {
          return response;
        } else {
          throw new Error(response.error || 'Erro desconhecido do serviço');
        }
      }),
      catchError((error: any) => {
        console.error('Erro em generateAstrologyResponse:', error);
        return of({
          success: true,
          response:
            '🌟 As estrelas estão temporariamente nubladas. Por favor, tente novamente em alguns momentos.',
          timestamp: new Date().toISOString(),
          freeMessagesRemaining: this.getFreeMessagesRemaining(),
          showPaywall: false,
          isCompleteResponse: true,
        });
      })
    );
  }

  private saveStateBeforePayment(): void {
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'zodiacUserMessageCount',
      this.userMessageCount.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'astrologyBlockedMessageId',
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
        'astrologyMessages',
        JSON.stringify(messagesToSave)
      );
    } catch (error) {
      console.error('Erro salvando mensagens:', error);
    }
  }

  // ✅ MODIFICADO: clearSessionData() incluindo contador
  private clearSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForZodiacInfo_zodiacInfo');
    sessionStorage.removeItem('astrologyMessages');
    sessionStorage.removeItem('astrologyBlockedMessageId');
    sessionStorage.removeItem('zodiacUserMessageCount');
    sessionStorage.removeItem('freeAstrologyConsultations');
    sessionStorage.removeItem('pendingAstrologyMessage');
  }

  isMessageBlocked(message: any): boolean {
    return (
      message.id === this.blockedMessageId && !this.hasUserPaidForAstrology
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
      this.showPaymentModal = false;
      this.showDataModal = true;
      this.cdr.markForCheck();
      return;
    }

    const email = this.userData.email?.toString().trim();
    if (!email) {
      this.paymentError =
        'E-mail obrigatório. Por favor, complete o formulário.';
      this.showPaymentModal = false;
      this.showDataModal = true;
      this.cdr.markForCheck();
      return;
    }

    if (this.currentMessage) {
      sessionStorage.setItem('pendingZodiacInfoMessage', this.currentMessage);
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
        serviceName: 'Informação Zodiacal Premium',
        returnPath: '/informacao-zodiaco',
        cancelPath: '/informacao-zodiaco',
      });
    } catch (error: any) {
      this.paymentError =
        error.message || 'Erro ao iniciar o pagamento do PayPal.';
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

  // ✅ MODIFICADO: clearConversation() resetando contador
  clearConversation(): void {
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    if (!this.hasUserPaidForAstrology) {
      this.userMessageCount = 0;
      this.blockedMessageId = null;
      this.clearSessionData();
    } else {
      sessionStorage.removeItem('astrologyMessages');
      sessionStorage.removeItem('astrologyBlockedMessageId');
      sessionStorage.removeItem('zodiacUserMessageCount');
      this.userMessageCount = 0;
      this.blockedMessageId = null;
    }

    this.messages = [];
    this.hasStartedConversation = false;
    this.startConversation();
    this.cdr.markForCheck();
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        const element = this.scrollContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {}
  }

  formatMessage(content: string): string {
    if (!content) return '';

    let formattedContent = content;

    // Converter **texto** para <strong>texto</strong>
    formattedContent = formattedContent.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    // Converter quebras de linha para <br>
    formattedContent = formattedContent.replace(/\n/g, '<br>');

    // Converter *texto* para itálico
    formattedContent = formattedContent.replace(
      /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
      '<em>$1</em>'
    );

    return formattedContent;
  }

  onUserDataSubmitted(userData: any): void {
    const requiredFields = ['email'];
    const missingFields = requiredFields.filter(
      (field) => !userData[field] || userData[field].toString().trim() === ''
    );

    if (missingFields.length > 0) {
      alert(
        `Para continuar com o pagamento, você deve completar o seguinte: ${missingFields.join(
          ', '
        )}`
      );
      this.showDataModal = true;
      this.cdr.markForCheck();
      return;
    }

    this.userData = {
      ...userData,
      email: userData.email?.toString().trim(),
    };

    try {
      sessionStorage.setItem('userData', JSON.stringify(this.userData));
    } catch (error) {
      console.error('Erro salvando userData:', error);
    }

    this.showDataModal = false;
    this.cdr.markForCheck();

    this.sendUserDataToBackend(userData);
  }

  private sendUserDataToBackend(userData: any): void {
    this.http.post(`${this.backendUrl}api/recolecta`, userData).subscribe({
      next: (response) => {
        console.log('Dados enviados ao backend:', response);
        this.promptForPayment();
      },
      error: (error) => {
        console.error('Erro enviando dados:', error);
        this.promptForPayment();
      },
    });
  }

  onDataModalClosed(): void {
    this.showDataModal = false;
    this.cdr.markForCheck();
  }
}
