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
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { NumerologiaService, NumerologyResponse } from '../../services/numerologia.service';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaypalService } from '../../services/paypal.service';

import { HttpClient } from '@angular/common/http';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import { environment } from '../../environments/environmets.prod';
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';
interface NumerologyMessage {
  sender: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  id?: string;
}
interface ConversationMessage {
  role: 'user' | 'numerologist';
  message: string;
  timestamp: Date;
  id?: string;
  freeMessagesRemaining?: number;
  showPaywall?: boolean;
  isCompleteResponse?: boolean;
  isPrizeAnnouncement?: boolean;
}

@Component({
  selector: 'app-historia-sagrada',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RecolectaDatosComponent,
  ],
  templateUrl: './lectura-numerologia.component.html',
  styleUrl: './lectura-numerologia.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LecturaNumerologiaComponent
  implements OnInit, OnDestroy, AfterViewChecked, AfterViewInit
{
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Variáveis principais do chat
  messages: ConversationMessage[] = [];
  currentMessage: string = '';
  messageInput = new FormControl('');
  isLoading: boolean = false;
  isTyping: boolean = false;
  hasStartedConversation: boolean = false;
  showDataForm: boolean = false;

  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  // Dados para enviar
  showDataModal: boolean = false;
  userData: any = null;

  // Variáveis para controle de pagamentos
  showPaymentModal: boolean = false;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForNumerology: boolean = false;

  // ✅ NOVO: Sistema de 3 mensagens grátis
  private userMessageCount: number = 0;
  private readonly FREE_MESSAGES_LIMIT = 3;

  // Modal de roleta da fortuna
  showFortuneWheel: boolean = false;
  numerologyPrizes: Prize[] = [
    {
      id: '1',
      name: '3 giros da Roleta Numerológica',
      color: '#4ecdc4',
      icon: '🔢',
    },
    {
      id: '2',
      name: '1 Análise Premium Numerológica',
      color: '#45b7d1',
      icon: '✨',
    },
    {
      id: '4',
      name: 'Tente novamente!',
      color: '#ff7675',
      icon: '🔄',
    },
  ];
  private wheelTimer: any;

  // Propriedade para controlar mensagens bloqueadas
  blockedMessageId: string | null = null;

  private backendUrl = environment.apiUrl;

  // Dados pessoais
  fullName: string = '';
  birthDate: string = '';

  // Números calculados
  personalNumbers = {
    lifePath: 0,
    destiny: 0,
  };

  // Info do numerólogo
  numerologistInfo = {
    name: 'Mestra Sofia',
    title: 'Guardiã dos Números Sagrados',
    specialty: 'Numerologia e vibração numérica universal',
  };

  // Frases de boas-vindas aleatórias
  welcomeMessages = [
    'Bem-vindo, buscador da sabedoria numérica... Os números são a linguagem do universo e revelam os segredos do seu destino. O que você quer saber sobre sua vibração numérica?',
    'As energias numéricas me sussurram que você veio buscar respostas... Sou a Mestra Sofia, guardiã dos números sagrados. Que segredo numérico o inquieta?',
    'Bem-vindo ao Templo dos Números Sagrados. Os padrões matemáticos do cosmos anunciaram sua chegada. Permita-me revelar os segredos do seu código numérico.',
    'Os números dançam diante de mim e revelam sua presença... Cada número tem um significado, cada cálculo revela um destino. Quais números você quer que eu interprete para você?',
  ];

  constructor(
    @Optional() public dialogRef: MatDialogRef<LecturaNumerologiaComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private numerologyService: NumerologiaService,
    private http: HttpClient,
    private elRef: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef,
    private paypalService: PaypalService
  ) {}

  ngAfterViewInit(): void {
    this.setVideosSpeed(0.67);
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
    // Verificar pagamento deste serviço específico
    this.hasUserPaidForNumerology =
      sessionStorage.getItem('hasUserPaidForNumerology_numerologie') === 'true';

    // ✅ NOVO: Carregar contador de mensagens
    const savedMessageCount = sessionStorage.getItem(
      'numerologyUserMessageCount'
    );
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
          this.hasUserPaidForNumerology = true;
          sessionStorage.setItem(
            'hasUserPaidForNumerology_numerologie',
            'true'
          );
          localStorage.removeItem('paypal_payment_completed');

          this.blockedMessageId = null;
          sessionStorage.removeItem('numerologyBlockedMessageId');

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          this.showPaymentModal = false;
          this.isProcessingPayment = false;
          this.paymentError = null;
          this.cdr.markForCheck();

          setTimeout(() => {
            const successMessage: ConversationMessage = {
              role: 'numerologist',
              message:
                '🎉 Pagamento concluído com sucesso!\n\n' +
                '✨ Obrigada pelo seu pagamento. Agora você tem acesso completo à leitura de Numerologia.\n\n' +
                '🔢 Vamos descobrir juntos os segredos dos números!\n\n' +
                '📌 Nota: Este pagamento é válido apenas para o serviço de Numerologia.',
              timestamp: new Date(),
            };
            this.messages.push(successMessage);
            this.saveMessagesToSession();
            this.cdr.detectChanges();
            setTimeout(() => this.scrollToBottom(), 200);
          }, 1000);
        } else {
          this.paymentError = 'O pagamento não pôde ser verificado.';

          setTimeout(() => {
            const errorMessage: ConversationMessage = {
              role: 'numerologist',
              message:
                '⚠️ Houve um problema ao verificar seu pagamento. Por favor, tente novamente ou entre em contato com nosso suporte.',
              timestamp: new Date(),
            };
            this.messages.push(errorMessage);
            this.saveMessagesToSession();
            this.cdr.detectChanges();
          }, 800);
        }
      } catch (error) {
        console.error('Erro verificando pagamento do PayPal:', error);
        this.paymentError = 'Erro na verificação do pagamento';

        setTimeout(() => {
          const errorMessage: ConversationMessage = {
            role: 'numerologist',
            message:
              '❌ Infelizmente, ocorreu um erro ao verificar seu pagamento. Por favor, tente novamente mais tarde.',
            timestamp: new Date(),
          };
          this.messages.push(errorMessage);
          this.saveMessagesToSession();
          this.cdr.detectChanges();
        }, 800);
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
    const savedMessages = sessionStorage.getItem('numerologyMessages');
    const savedBlockedMessageId = sessionStorage.getItem(
      'numerologyBlockedMessageId'
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

    // Testar conexão
    this.numerologyService.testConnection().subscribe({
      next: (response) => {},
      error: (error) => {},
    });

    // Mostrar roleta se corresponder
    if (this.hasStartedConversation && FortuneWheelComponent.canShowWheel()) {
      this.showWheelAfterDelay(2000);
    }
  }

  // ✅ NOVO: Obter mensagens grátis restantes
  getFreeMessagesRemaining(): number {
    if (this.hasUserPaidForNumerology) {
      return -1; // Ilimitado
    }
    return Math.max(0, this.FREE_MESSAGES_LIMIT - this.userMessageCount);
  }

  // ✅ NOVO: Verificar se tem acesso
  private hasAccess(): boolean {
    if (this.hasUserPaidForNumerology) {
      return true;
    }
    if (this.hasFreeNumerologyConsultationsAvailable()) {
      return true;
    }
    if (this.userMessageCount < this.FREE_MESSAGES_LIMIT) {
      return true;
    }
    return false;
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

  private processNumerologyPrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Leituras Grátis
        this.addFreeNumerologyConsultations(3);
        break;
      case '2': // 1 Análise Premium - ACESSO COMPLETO
        this.hasUserPaidForNumerology = true;
        sessionStorage.setItem(
          'hasUserPaidForNumerology_numerologie',
          'true'
        );

        if (this.blockedMessageId) {
          this.blockedMessageId = null;
          sessionStorage.removeItem('numerologyBlockedMessageId');
        }

        const premiumMessage: ConversationMessage = {
          role: 'numerologist',
          message:
            '✨ **Você desbloqueou o acesso Premium completo!** ✨\n\nOs números sagrados se alinharam de maneira extraordinária para ajudá-lo. Agora você tem acesso ilimitado a todo o conhecimento numerológico. Pode consultar sobre seu caminho de vida, números do destino, compatibilidades numéricas e todos os segredos da numerologia quantas vezes desejar.\n\n🔢 *O universo numérico revelou todos os seus segredos para você* 🔢',
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

  private addFreeNumerologyConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeNumerologyConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeNumerologyConsultations', newTotal.toString());

    if (this.blockedMessageId && !this.hasUserPaidForNumerology) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('numerologyBlockedMessageId');
    }

    // Mensagem informativa
    const infoMessage: ConversationMessage = {
      role: 'numerologist',
      message: `✨ *Você recebeu ${count} consultas numerológicas gratuitas* ✨\n\nAgora você tem **${newTotal}** consultas disponíveis para explorar os mistérios dos números.`,
      timestamp: new Date(),
    };
    this.messages.push(infoMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();
  }

  private hasFreeNumerologyConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeNumerologyConsultations') || '0'
    );
    return freeConsultations > 0;
  }

  private useFreeNumerologyConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeNumerologyConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem(
        'freeNumerologyConsultations',
        remaining.toString()
      );

      const prizeMsg: ConversationMessage = {
        role: 'numerologist',
        message: `✨ *Você utilizou uma consulta numerológica gratuita* ✨\n\nVocê ainda tem **${remaining}** consultas numerológicas gratuitas.`,
        timestamp: new Date(),
      };
      this.messages.push(prizeMsg);
      this.shouldAutoScroll = true;
      this.saveMessagesToSession();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll && this.messages.length > this.lastMessageCount) {
      this.scrollToBottom();
      this.lastMessageCount = this.messages.length;
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

  ngOnDestroy(): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }
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

      const welcomeMessage: ConversationMessage = {
        role: 'numerologist',
        message: randomWelcome,
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
    if (!this.currentMessage.trim() || this.isLoading) return;

    const userMessage = this.currentMessage.trim();

    // Calcular o próximo número de mensagem
    const nextMessageCount = this.userMessageCount + 1;

    console.log(
      `📊 Numerologia - Mensagem #${nextMessageCount}, Premium: ${this.hasUserPaidForNumerology}, Limite: ${this.FREE_MESSAGES_LIMIT}`
    );

    // ✅ Verificar acesso
    const canSendMessage =
      this.hasUserPaidForNumerology ||
      this.hasFreeNumerologyConsultationsAvailable() ||
      nextMessageCount <= this.FREE_MESSAGES_LIMIT;

    if (!canSendMessage) {
      console.log('❌ Sem acesso - mostrando modal de pagamento');

      // Fechar outros modais
      this.showFortuneWheel = false;
      this.showPaymentModal = false;

      // Guardar mensagem pendente
      sessionStorage.setItem('pendingNumerologyMessage', userMessage);
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
      !this.hasUserPaidForNumerology &&
      nextMessageCount > this.FREE_MESSAGES_LIMIT &&
      this.hasFreeNumerologyConsultationsAvailable()
    ) {
      this.useFreeNumerologyConsultation();
    }

    this.shouldAutoScroll = true;
    this.processUserMessage(userMessage, nextMessageCount);
  }

  // ✅ NOVO: Método separado para processar mensagens
  private processUserMessage(userMessage: string, messageCount: number): void {
    // Adicionar mensagem do usuário
    const userMsg: ConversationMessage = {
      role: 'user',
      message: userMessage,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);

    // ✅ Atualizar contador
    this.userMessageCount = messageCount;
    sessionStorage.setItem(
      'numerologyUserMessageCount',
      this.userMessageCount.toString()
    );

    this.saveMessagesToSession();
    this.currentMessage = '';
    this.isTyping = true;
    this.isLoading = true;
    this.cdr.markForCheck();

    // Preparar histórico de conversação
    const conversationHistory = this.messages
      .filter((msg) => msg.message && !msg.isPrizeAnnouncement)
      .slice(-10)
      .map((msg) => ({
        role: msg.role === 'user' ? ('user' as const) : ('numerologist' as const),
        message: msg.message,
      }));

    // ✅ Usar o novo método com messageCount
    this.numerologyService
      .sendMessageWithCount(
        userMessage,
        messageCount,
        this.hasUserPaidForNumerology,
        this.birthDate || undefined,
        this.fullName || undefined,
        conversationHistory
      )
      .subscribe({
        next: (response: NumerologyResponse) => {
          this.isLoading = false;
          this.isTyping = false;

          if (response.success && response.response) {
            const messageId = Date.now().toString();

            const numerologistMsg: ConversationMessage = {
              role: 'numerologist',
              message: response.response,
              timestamp: new Date(),
              id: messageId,
              freeMessagesRemaining: response.freeMessagesRemaining,
              showPaywall: response.showPaywall,
              isCompleteResponse: response.isCompleteResponse,
            };
            this.messages.push(numerologistMsg);

            this.shouldAutoScroll = true;

            console.log(
              `📊 Resposta - Mensagens restantes: ${response.freeMessagesRemaining}, Paywall: ${response.showPaywall}, Completa: ${response.isCompleteResponse}`
            );

            // ✅ Mostrar paywall se o backend indicar
            if (response.showPaywall && !this.hasUserPaidForNumerology) {
              this.blockedMessageId = messageId;
              sessionStorage.setItem('numerologyBlockedMessageId', messageId);

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
          } else {
            this.handleError(
              response.error || 'Erro ao obter resposta do numerólogo'
            );
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          this.isTyping = false;
          console.error('Erro na resposta:', error);
          this.handleError('Erro de conexão. Por favor, tente novamente.');
          this.cdr.markForCheck();
        },
      });
  }

  private saveStateBeforePayment(): void {
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'numerologyUserMessageCount',
      this.userMessageCount.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'numerologyBlockedMessageId',
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
        'numerologyMessages',
        JSON.stringify(messagesToSave)
      );
    } catch (error) {
      console.error('Erro salvando mensagens:', error);
    }
  }

  // ✅ MODIFICADO: clearSessionData() incluindo contador
  private clearSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForNumerology_numerologie');
    sessionStorage.removeItem('numerologyMessages');
    sessionStorage.removeItem('numerologyBlockedMessageId');
    sessionStorage.removeItem('numerologyUserMessageCount');
    sessionStorage.removeItem('freeNumerologyConsultations');
    sessionStorage.removeItem('pendingNumerologyMessage');
  }

  isMessageBlocked(message: ConversationMessage): boolean {
    return (
      message.id === this.blockedMessageId && !this.hasUserPaidForNumerology
    );
  }

  async promptForPayment(): Promise<void> {
    this.showPaymentModal = true;
    this.cdr.markForCheck();
    this.paymentError = null;
    this.isProcessingPayment = false;

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

    if (this.currentMessage?.trim()) {
      sessionStorage.setItem(
        'pendingNumerologyMessage',
        this.currentMessage.trim()
      );
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
        serviceName: 'Leitura de Numerologia',
        returnPath: '/leitura-numerologia',
        cancelPath: '/leitura-numerologia',
      });
    } catch (error: any) {
      this.paymentError =
        error.message || 'Erro ao inicializar o pagamento com PayPal.';
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

  savePersonalData(): void {
    if (this.fullName) {
      this.personalNumbers.destiny =
        this.numerologyService.calculateDestinyNumber(this.fullName);
    }

    if (this.birthDate) {
      this.personalNumbers.lifePath =
        this.numerologyService.calculateLifePath(this.birthDate);
    }

    this.showDataForm = false;

    if (this.personalNumbers.lifePath || this.personalNumbers.destiny) {
      let numbersMessage = 'Calculei seus números sagrados:\n\n';

      if (this.personalNumbers.lifePath) {
        numbersMessage += `🔹 Caminho de Vida: ${
          this.personalNumbers.lifePath
        } - ${this.numerologyService.getNumberMeaning(
          this.personalNumbers.lifePath
        )}\n\n`;
      }

      if (this.personalNumbers.destiny) {
        numbersMessage += `🔹 Número do Destino: ${
          this.personalNumbers.destiny
        } - ${this.numerologyService.getNumberMeaning(
          this.personalNumbers.destiny
        )}\n\n`;
      }

      numbersMessage +=
        'Quer que eu aprofunde na interpretação de algum desses números?';

      const numbersMsg: ConversationMessage = {
        role: 'numerologist',
        message: numbersMessage,
        timestamp: new Date(),
      };
      this.messages.push(numbersMsg);
      this.saveMessagesToSession();
    }
  }

  toggleDataForm(): void {
    this.showDataForm = !this.showDataForm;
  }

  // ✅ MODIFICADO: newConsultation() resetando contador
  newConsultation(): void {
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    if (!this.hasUserPaidForNumerology) {
      this.userMessageCount = 0;
      this.blockedMessageId = null;
      this.clearSessionData();
    } else {
      sessionStorage.removeItem('numerologyMessages');
      sessionStorage.removeItem('numerologyBlockedMessageId');
      sessionStorage.removeItem('numerologyUserMessageCount');
      this.userMessageCount = 0;
      this.blockedMessageId = null;
    }

    this.messages = [];
    this.hasStartedConversation = false;
    this.startConversation();
    this.cdr.markForCheck();
  }

  private handleError(errorMessage: string): void {
    const errorMsg: ConversationMessage = {
      role: 'numerologist',
      message: `🔢 Os números cósmicos estão em flutuação... ${errorMessage} Tente novamente quando as vibrações numéricas tiverem se estabilizado.`,
      timestamp: new Date(),
    };
    this.messages.push(errorMsg);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();
    this.cdr.markForCheck();
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        const element = this.scrollContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {}
  }

  clearConversation(): void {
    this.newConsultation();
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
      if (isNaN(date.getTime())) {
        return 'N/D';
      }
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'N/D';
    }
  }

  formatMessage(content: string): string {
    if (!content) return '';

    let formattedContent = content;

    formattedContent = formattedContent.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    formattedContent = formattedContent.replace(/\n/g, '<br>');

    formattedContent = formattedContent.replace(
      /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
      '<em>$1</em>'
    );

    return formattedContent;
  }

  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
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

  onPrizeWon(prize: Prize): void {
    const prizeMessage: ConversationMessage = {
      role: 'numerologist',
      message: `🔢 Os números sagrados o abençoaram! Você ganhou: **${prize.name}** ${prize.icon}\n\nAs vibrações numéricas do universo decidiram favorecê-lo com este presente cósmico. A energia dos números antigos flui através de você, revelando segredos mais profundos do seu destino numerológico. Que a sabedoria dos números o guie!`,
      timestamp: new Date(),
      isPrizeAnnouncement: true,
    };

    this.messages.push(prizeMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();

    this.processNumerologyPrize(prize);
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
}