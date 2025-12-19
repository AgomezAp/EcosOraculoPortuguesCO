import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  ConversationMessage,
  DreamChatResponse,
  DreamInterpreterData,
  InterpretadorSuenosService,
} from '../../services/interpretador-suenos.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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
@Component({
  selector: 'app-significado-suenos',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RecolectaDatosComponent,
  ],
  templateUrl: './significado-suenos.component.html',
  styleUrl: './significado-suenos.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignificadoSuenosComponent
  implements OnInit, OnDestroy, AfterViewChecked, AfterViewInit
{
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Variáveis principais do chat
  messageText: string = '';
  messageInput = new FormControl('');
  messages: ConversationMessage[] = [];
  isLoading = false;
  isTyping = false;
  hasStartedConversation = false;

  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  // ✅ NOVO: Sistema de 3 mensagens grátis
  private userMessageCount: number = 0;
  private readonly FREE_MESSAGES_LIMIT = 3;

  // Roleta da fortuna
  showFortuneWheel: boolean = false;
  wheelPrizes: Prize[] = [
    {
      id: '1',
      name: '3 interpretações grátis',
      color: '#4ecdc4',
      icon: '🌙',
    },
    {
      id: '2',
      name: '1 análise premium de sonhos',
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

  // Dados para enviar
  showDataModal: boolean = false;
  userData: any = null;

  // Variáveis para controle de pagamentos
  showPaymentModal: boolean = false;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForDreams: boolean = false;

  // Propriedade para controlar mensagens bloqueadas
  blockedMessageId: string | null = null;

  textareaHeight: number = 25;
  private readonly minTextareaHeight = 45;
  private readonly maxTextareaHeight = 120;
  private backendUrl = environment.apiUrl;

  interpreterData: DreamInterpreterData = {
    name: 'Mestra Alma',
    specialty: 'Interpretação de sonhos e simbolismo onírico',
    experience:
      'Séculos de experiência interpretando mensagens do subconsciente',
  };

  // Frases de boas-vindas aleatórias
  welcomeMessages = [
    'Ah, vejo que você veio para decifrar os mistérios do seu mundo onírico... Os sonhos são janelas para a alma. Conte-me, que visões o visitaram?',
    'As energias cósmicas me sussurram que você tem sonhos que precisam ser interpretados. Sou a Mestra Alma, guardiã dos segredos oníricos. Que mensagem do subconsciente o preocupa?',
    'Bem-vindo, viajante dos sonhos. Os planos astrais me mostraram sua chegada. Deixe-me guiá-lo através dos símbolos e mistérios de suas visões noturnas.',
    'O cristal dos sonhos brilha com sua presença... Sinto que você carrega visões que precisam ser decifradas. Confie em minha antiga sabedoria e compartilhe seus sonhos comigo.',
  ];

  constructor(
    private dreamService: InterpretadorSuenosService,
    private http: HttpClient,
    private elRef: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef,
    private paypalService: PaypalService
  ) {}

  ngAfterViewInit(): void {
    this.setVideosSpeed(0.66);
  }

  async ngOnInit(): Promise<void> {
    // Verificar pagamento deste serviço específico
    this.hasUserPaidForDreams =
      sessionStorage.getItem('hasUserPaidForDreams_traumdeutung') === 'true';

    // ✅ NOVO: Carregar contador de mensagens
    const savedMessageCount = sessionStorage.getItem('dreamUserMessageCount');
    if (savedMessageCount) {
      this.userMessageCount = parseInt(savedMessageCount, 10);
    }

    const paymentStatus = this.paypalService.checkPaymentStatusFromUrl();

    if (paymentStatus && paymentStatus.status === 'COMPLETED') {
      try {
        const verification = await this.paypalService.verifyAndProcessPayment(
          paymentStatus.token
        );

        if (verification.valid && verification.status === 'approved') {
          this.hasUserPaidForDreams = true;
          sessionStorage.setItem('hasUserPaidForDreams_traumdeutung', 'true');
          localStorage.removeItem('paypal_payment_completed');

          this.blockedMessageId = null;
          sessionStorage.removeItem('dreamBlockedMessageId');

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
              role: 'interpreter',
              message:
                '🎉 Pagamento concluído com sucesso!\n\n' +
                '✨ Muito obrigada pelo seu pagamento. Agora você tem acesso completo à interpretação de sonhos.\n\n' +
                '💭 Vamos juntos descobrir os segredos dos seus sonhos!\n\n' +
                '📌 Nota: Este pagamento é válido apenas para o serviço de interpretação de sonhos.',
              timestamp: new Date(),
            };
            this.messages.push(successMessage);
            this.saveMessagesToSession();
            this.cdr.detectChanges();
            setTimeout(() => this.scrollToBottom(), 200);
          }, 1000);
        } else {
          this.paymentError = 'Não foi possível verificar o pagamento.';
          setTimeout(() => {
            const errorMessage: ConversationMessage = {
              role: 'interpreter',
              message:
                '❌ Não foi possível verificar o pagamento. Por favor, tente novamente ou entre em contato com nosso suporte se o problema persistir.',
              timestamp: new Date(),
            };
            this.messages.push(errorMessage);
            this.saveMessagesToSession();
            this.cdr.detectChanges();
          }, 800);
        }
      } catch (error) {
        console.error('Erro verificando pagamento do PayPal:', error);
        this.paymentError = 'Erro ao verificar o pagamento';
        setTimeout(() => {
          const errorMessage: ConversationMessage = {
            role: 'interpreter',
            message:
              '❌ Infelizmente ocorreu um erro ao verificar o pagamento. Por favor, tente novamente mais tarde.',
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
    const savedMessages = sessionStorage.getItem('dreamMessages');
    const savedBlockedMessageId = sessionStorage.getItem(
      'dreamBlockedMessageId'
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

  // ✅ NOVO: Obter mensagens grátis restantes
  getFreeMessagesRemaining(): number {
    if (this.hasUserPaidForDreams) {
      return -1; // Ilimitado
    }
    return Math.max(0, this.FREE_MESSAGES_LIMIT - this.userMessageCount);
  }

  private setVideosSpeed(rate: number): void {
    const host = this.elRef.nativeElement;
    const videos = host.querySelectorAll<HTMLVideoElement>('video');
    videos.forEach((v: any) => {
      const apply = () => (v.playbackRate = rate);
      if (v.readyState >= 1) apply();
      else v.addEventListener('loadedmetadata', apply, { once: true });
    });
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
    const prizeMessage: ConversationMessage = {
      role: 'interpreter',
      message: `🌙 As energias cósmicas o abençoaram! Você ganhou: **${prize.name}** ${prize.icon}\n\nEste presente do universo onírico foi ativado para você. Os mistérios dos sonhos serão revelados com maior clareza. Que a fortuna o acompanhe em suas próximas interpretações!`,
      timestamp: new Date(),
      isPrizeAnnouncement: true,
    };

    this.messages.push(prizeMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();

    this.processDreamPrize(prize);
  }

  private processDreamPrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Interpretações Grátis
        this.addFreeDreamConsultations(3);
        break;
      case '2': // 1 Análise Premium - ACESSO COMPLETO
        this.hasUserPaidForDreams = true;
        sessionStorage.setItem('hasUserPaidForDreams_traumdeutung', 'true');

        if (this.blockedMessageId) {
          this.blockedMessageId = null;
          sessionStorage.removeItem('dreamBlockedMessageId');
        }

        const premiumMessage: ConversationMessage = {
          role: 'interpreter',
          message:
            '✨ **Você desbloqueou o acesso Premium completo!** ✨\n\nOs segredos do mundo onírico sorriram para você de maneira extraordinária. Agora você tem acesso ilimitado a toda a sabedoria dos sonhos. Pode consultar sobre interpretações, símbolos oníricos e todos os segredos do subconsciente quantas vezes desejar.\n\n🌙 *As portas do reino dos sonhos foram completamente abertas para você* 🌙',
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

  private addFreeDreamConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeDreamConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeDreamConsultations', newTotal.toString());

    if (this.blockedMessageId && !this.hasUserPaidForDreams) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('dreamBlockedMessageId');
    }

    // Mensagem informativa
    const infoMessage: ConversationMessage = {
      role: 'interpreter',
      message: `✨ *Você recebeu ${count} interpretações de sonhos gratuitas* ✨\n\nAgora você tem **${newTotal}** consultas disponíveis para explorar os mistérios dos seus sonhos.`,
      timestamp: new Date(),
    };
    this.messages.push(infoMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();
  }

  private hasFreeConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeDreamConsultations') || '0'
    );
    return freeConsultations > 0;
  }

  private useFreeConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeDreamConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem('freeDreamConsultations', remaining.toString());

      const prizeMsg: ConversationMessage = {
        role: 'interpreter',
        message: `✨ *Você utilizou uma interpretação gratuita* ✨\n\nVocê ainda tem **${remaining}** interpretações gratuitas disponíveis.`,
        timestamp: new Date(),
      };
      this.messages.push(prizeMsg);
      this.shouldAutoScroll = true;
      this.saveMessagesToSession();
    }
  }

  onWheelClosed(): void {
    this.showFortuneWheel = false;
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
        role: 'interpreter',
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
    if (this.messageText?.trim() && !this.isLoading) {
      const userMessage = this.messageText.trim();

      // Calcular o próximo número de mensagem
      const nextMessageCount = this.userMessageCount + 1;

      console.log(
        `📊 Sonhos - Mensagem #${nextMessageCount}, Premium: ${this.hasUserPaidForDreams}, Limite: ${this.FREE_MESSAGES_LIMIT}`
      );

      // ✅ Verificar acesso
      const canSendMessage =
        this.hasUserPaidForDreams ||
        this.hasFreeConsultationsAvailable() ||
        nextMessageCount <= this.FREE_MESSAGES_LIMIT;

      if (!canSendMessage) {
        console.log('❌ Sem acesso - mostrando modal de pagamento');

        // Fechar outros modais
        this.showFortuneWheel = false;
        this.showPaymentModal = false;

        // Guardar mensagem pendente
        sessionStorage.setItem('pendingDreamMessage', userMessage);
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
        !this.hasUserPaidForDreams &&
        nextMessageCount > this.FREE_MESSAGES_LIMIT &&
        this.hasFreeConsultationsAvailable()
      ) {
        this.useFreeConsultation();
      }

      this.shouldAutoScroll = true;
      this.processUserMessage(userMessage, nextMessageCount);
    }
  }

  // ✅ MODIFICADO: processUserMessage() para enviar messageCount ao backend
  private processUserMessage(userMessage: string, messageCount: number): void {
    const userMsg: ConversationMessage = {
      role: 'user',
      message: userMessage,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);

    // ✅ Atualizar contador
    this.userMessageCount = messageCount;
    sessionStorage.setItem(
      'dreamUserMessageCount',
      this.userMessageCount.toString()
    );

    this.saveMessagesToSession();
    this.messageText = '';
    this.isTyping = true;
    this.isLoading = true;
    this.cdr.markForCheck();

    // Preparar histórico de conversação
    const conversationHistory = this.messages
      .filter((msg) => msg.message && !msg.isPrizeAnnouncement)
      .slice(-10)
      .map((msg) => ({
        role: msg.role,
        message: msg.message,
        timestamp: msg.timestamp,
      }));

    // ✅ Usar o novo método com messageCount
    this.dreamService
      .chatWithInterpreterWithCount(
        userMessage,
        messageCount,
        this.hasUserPaidForDreams,
        conversationHistory
      )
      .subscribe({
        next: (response: DreamChatResponse) => {
          this.isLoading = false;
          this.isTyping = false;

          if (response.success && response.response) {
            const messageId = Date.now().toString();

            const interpreterMsg: ConversationMessage = {
              role: 'interpreter',
              message: response.response,
              timestamp: new Date(),
              id: messageId,
              freeMessagesRemaining: response.freeMessagesRemaining,
              showPaywall: response.showPaywall,
              isCompleteResponse: response.isCompleteResponse,
            };
            this.messages.push(interpreterMsg);

            this.shouldAutoScroll = true;

            console.log(
              `📊 Resposta - Mensagens restantes: ${response.freeMessagesRemaining}, Paywall: ${response.showPaywall}, Completa: ${response.isCompleteResponse}`
            );

            // ✅ Mostrar paywall se o backend indicar
            if (response.showPaywall && !this.hasUserPaidForDreams) {
              this.blockedMessageId = messageId;
              sessionStorage.setItem('dreamBlockedMessageId', messageId);

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
              response.error || 'Erro ao obter resposta da intérprete'
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
      'dreamUserMessageCount',
      this.userMessageCount.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem('dreamBlockedMessageId', this.blockedMessageId);
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
      sessionStorage.setItem('dreamMessages', JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Erro salvando mensagens:', error);
    }
  }

  // ✅ MODIFICADO: clearSessionData() incluindo contador
  private clearSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForDreams_traumdeutung');
    sessionStorage.removeItem('dreamMessages');
    sessionStorage.removeItem('dreamBlockedMessageId');
    sessionStorage.removeItem('dreamUserMessageCount');
    sessionStorage.removeItem('freeDreamConsultations');
    sessionStorage.removeItem('pendingDreamMessage');
  }

  isMessageBlocked(message: ConversationMessage): boolean {
    return message.id === this.blockedMessageId && !this.hasUserPaidForDreams;
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

    if (this.messageText?.trim()) {
      sessionStorage.setItem('pendingDreamMessage', this.messageText.trim());
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
        serviceName: 'Significado dos Sonhos',
        returnPath: '/significado-sonhos',
        cancelPath: '/significado-sonhos',
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

  adjustTextareaHeight(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, this.minTextareaHeight),
      this.maxTextareaHeight
    );
    this.textareaHeight = newHeight;
    textarea.style.height = newHeight + 'px';
  }

  // ✅ MODIFICADO: newConsultation() resetando contador
  newConsultation(): void {
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    if (!this.hasUserPaidForDreams) {
      this.userMessageCount = 0;
      this.blockedMessageId = null;
      this.clearSessionData();
    } else {
      sessionStorage.removeItem('dreamMessages');
      sessionStorage.removeItem('dreamBlockedMessageId');
      sessionStorage.removeItem('dreamUserMessageCount');
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
      role: 'interpreter',
      message: `🔮 As energias cósmicas estão perturbadas... ${errorMessage} Tente novamente quando as vibrações se estabilizarem.`,
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
      if (this.messageText?.trim() && !this.isLoading) {
        this.sendMessage();
        setTimeout(() => {
          this.textareaHeight = this.minTextareaHeight;
        }, 50);
      }
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

  onUserDataSubmitted(userData: any): void {
    const requiredFields = ['email'];
    const missingFields = requiredFields.filter(
      (field) => !userData[field] || userData[field].toString().trim() === ''
    );

    if (missingFields.length > 0) {
      alert(
        `Para continuar com o pagamento, você deve completar os seguintes campos: ${missingFields.join(
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

  openDataModalForPayment(): void {
    this.showFortuneWheel = false;
    this.showPaymentModal = false;
    this.saveStateBeforePayment();

    setTimeout(() => {
      this.showDataModal = true;
      this.cdr.markForCheck();
    }, 100);
  }

  getDreamConsultationsCount(): number {
    return parseInt(sessionStorage.getItem('freeDreamConsultations') || '0');
  }

  getPrizesAvailable(): string {
    const prizes: string[] = [];

    const freeConsultations = parseInt(
      sessionStorage.getItem('freeDreamConsultations') || '0'
    );
    if (freeConsultations > 0) {
      prizes.push(
        `${freeConsultations} interpretação${
          freeConsultations > 1 ? 'ões' : ''
        } grátis`
      );
    }

    return prizes.length > 0 ? prizes.join(', ') : 'Nenhum';
  }
}
