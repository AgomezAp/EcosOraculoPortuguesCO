import { CommonModule } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  AnimalChatRequest,
  AnimalGuideData,
  AnimalInteriorService,
} from '../../services/animal-interior.service';
import { PaypalService } from '../../services/paypal.service';
import { HttpClient } from '@angular/common/http';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import { environment } from '../../environments/environmets.prod';
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';

interface Message {
  role: 'user' | 'guide';
  content: string;
  timestamp: Date;
}

interface ChatMessage {
  sender: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  id?: string;
}

@Component({
  selector: 'app-animal-interior',
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
  templateUrl: './animal-interior.component.html',
  styleUrl: './animal-interior.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalInteriorComponent
  implements OnInit, OnDestroy, AfterViewChecked, AfterViewInit
{
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  chatMessages: ChatMessage[] = [];
  currentMessage: string = '';
  isLoading: boolean = false;

  // Dados para enviar
  showDataModal: boolean = false;
  userData: any = null;

  // Propriedades para controlar o scroll
  private shouldScrollToBottom: boolean = true;
  private isUserScrolling: boolean = false;
  private lastMessageCount: number = 0;

  // Dados do guia
  private guideData: AnimalGuideData = {
    name: 'Xamã Olivia',
    specialty: 'Guia dos Animais Interiores',
    experience: 'Especialista em conexão espiritual com o reino animal',
  };

  // Propriedades para a roleta
  showFortuneWheel: boolean = false;
  animalPrizes: Prize[] = [
    {
      id: '1',
      name: '3 giros da Roleta Animal',
      color: '#4ecdc4',
      icon: '🦉',
    },
    {
      id: '2',
      name: '1 Guia Premium de Animais',
      color: '#45b7d1',
      icon: '🦋',
    },
    {
      id: '4',
      name: 'Tente novamente!',
      color: '#ff7675',
      icon: '🌙',
    },
  ];
  private wheelTimer: any;

  // ✅ NOVO: Sistema de 3 mensagens grátis
  private readonly FREE_MESSAGES_LIMIT = 3;
  private userMessageCount: number = 0; // Contador de mensagens do usuário

  // Stripe/payment
  showPaymentModal: boolean = false;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForAnimal: boolean = false;
  blockedMessageId: string | null = null;
  private backendUrl = environment.apiUrl;

  constructor(
    private animalService: AnimalInteriorService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private paypalService: PaypalService
  ) {}

  @ViewChild('backgroundVideo') backgroundVideo!: ElementRef<HTMLVideoElement>;

  ngAfterViewInit(): void {
    if (this.backgroundVideo && this.backgroundVideo.nativeElement) {
      this.backgroundVideo.nativeElement.playbackRate = 0.6;
    }
  }

  async ngOnInit(): Promise<void> {
    this.hasUserPaidForAnimal =
      sessionStorage.getItem('hasUserPaidForAnimal_inneresTier') === 'true';

    // ✅ NOVO: Carregar contador de mensagens do sessionStorage
    const savedMessageCount = sessionStorage.getItem(
      'animalInteriorUserMessageCount'
    );
    if (savedMessageCount) {
      this.userMessageCount = parseInt(savedMessageCount, 10) || 0;
    }

    const paymentStatus = this.paypalService.checkPaymentStatusFromUrl();

    if (paymentStatus && paymentStatus.status === 'COMPLETED') {
      try {
        const verification = await this.paypalService.verifyAndProcessPayment(
          paymentStatus.token
        );

        if (verification.valid && verification.status === 'approved') {
          this.hasUserPaidForAnimal = true;
          sessionStorage.setItem('hasUserPaidForAnimal_inneresTier', 'true');
          localStorage.removeItem('paypal_payment_completed');

          this.blockedMessageId = null;
          sessionStorage.removeItem('animalInteriorBlockedMessageId');

          // Limpar URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          this.addMessage({
            sender: this.guideData.name,
            content:
              '✨ Pagamento confirmado! Agora você pode acessar toda minha experiência e sabedoria do reino animal sem limites.',
            timestamp: new Date(),
            isUser: false,
          });

          // ✅ NOVO: Processar mensagem pendente se existir
          const pendingMessage = sessionStorage.getItem('pendingAnimalMessage');
          if (pendingMessage) {
            sessionStorage.removeItem('pendingAnimalMessage');
            setTimeout(() => {
              this.currentMessage = pendingMessage;
              this.sendMessage();
            }, 1000);
          }

          this.cdr.markForCheck();
        }
      } catch (error) {
        console.error('Erro verificando pagamento do PayPal:', error);
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

    const savedMessages = sessionStorage.getItem('animalInteriorMessages');
    const savedBlockedMessageId = sessionStorage.getItem(
      'animalInteriorBlockedMessageId'
    );

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.chatMessages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        this.blockedMessageId = savedBlockedMessageId || null;
        this.lastMessageCount = this.chatMessages.length;
      } catch (error) {
        this.initializeWelcomeMessage();
      }
    }

    if (this.chatMessages.length === 0) {
      this.initializeWelcomeMessage();
    }

    if (this.chatMessages.length > 0 && FortuneWheelComponent.canShowWheel()) {
      this.showAnimalWheelAfterDelay(2000);
    }
  }

  private initializeWelcomeMessage(): void {
    this.addMessage({
      sender: 'Xamã Olivia',
      content: `🦉 Olá, Buscador! Sou Olivia, sua guia espiritual do reino animal. Estou aqui para ajudá-lo a descobrir seu animal interior e conectar-se com ele.

O que você gostaria de explorar sobre seu espírito animal?`,
      timestamp: new Date(),
      isUser: false,
    });

    if (FortuneWheelComponent.canShowWheel()) {
      this.showAnimalWheelAfterDelay(3000);
    }
  }

  ngAfterViewChecked(): void {
    if (
      this.shouldScrollToBottom &&
      !this.isUserScrolling &&
      this.chatMessages.length > this.lastMessageCount
    ) {
      this.scrollToBottom();
      this.lastMessageCount = this.chatMessages.length;
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }
  }

  // ✅ NOVO: Método para verificar se o usuário tem acesso completo
  private hasFullAccess(): boolean {
    // Tem acesso se: pagou, tem consultas grátis da roleta, ou não excedeu o limite
    return (
      this.hasUserPaidForAnimal ||
      this.hasFreeAnimalConsultationsAvailable() ||
      this.userMessageCount < this.FREE_MESSAGES_LIMIT
    );
  }

  // ✅ NOVO: Obter mensagens grátis restantes
  getFreeMessagesRemaining(): number {
    const bonusConsultations = parseInt(
      sessionStorage.getItem('freeAnimalConsultations') || '0'
    );
    const baseRemaining = Math.max(
      0,
      this.FREE_MESSAGES_LIMIT - this.userMessageCount
    );
    return baseRemaining + bonusConsultations;
  }

  // ✅ MÉTODO PRINCIPAL MODIFICADO
  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) return;
    const userMessage = this.currentMessage.trim();

    // ✅ NOVA LÓGICA: Verificar acesso ANTES de enviar mensagem
    if (!this.hasUserPaidForAnimal) {
      // Verificar se tem consultas da roleta disponíveis
      if (this.hasFreeAnimalConsultationsAvailable()) {
        this.useFreeAnimalConsultation();
        // Continuar com a mensagem
      }
      // Verificar se ainda tem mensagens grátis do limite inicial
      else if (this.userMessageCount < this.FREE_MESSAGES_LIMIT) {
        // Incrementar contador (feito depois de enviar)
      }
      // Se excedeu o limite, mostrar modal de dados
      else {
        // Fechar outros modais primeiro
        this.showFortuneWheel = false;
        this.showPaymentModal = false;

        // Guardar a mensagem para processá-la depois do pagamento
        sessionStorage.setItem('pendingAnimalMessage', userMessage);
        this.saveStateBeforePayment();

        // Mostrar modal de dados
        setTimeout(() => {
          this.showDataModal = true;
          this.cdr.markForCheck();
        }, 100);

        return; // Sair sem processar a mensagem
      }
    }

    this.shouldScrollToBottom = true;
    this.processUserMessage(userMessage);
  }

  private processUserMessage(userMessage: string): void {
    this.addMessage({
      sender: 'Você',
      content: userMessage,
      timestamp: new Date(),
      isUser: true,
    });

    this.currentMessage = '';
    this.isLoading = true;

    // ✅ NOVO: Incrementar contador de mensagens do usuário
    if (
      !this.hasUserPaidForAnimal &&
      !this.hasFreeAnimalConsultationsAvailable()
    ) {
      this.userMessageCount++;
      sessionStorage.setItem(
        'animalInteriorUserMessageCount',
        this.userMessageCount.toString()
      );
    }

    // Preparar conversationHistory
    const conversationHistory = this.chatMessages.slice(-10).map((msg) => ({
      role: msg.isUser ? ('user' as const) : ('guide' as const),
      message: msg.content,
    }));

    // ✅ NOVO: Preparar o request com messageCount e isPremiumUser
    const chatRequest: AnimalChatRequest = {
      guideData: this.guideData,
      userMessage: userMessage,
      conversationHistory: conversationHistory,
      messageCount: this.userMessageCount, // ✅ NOVO
      isPremiumUser: this.hasUserPaidForAnimal, // ✅ NOVO
    };

    this.animalService.chatWithGuide(chatRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.shouldScrollToBottom = true;

        if (response.success && response.response) {
          const messageId = Date.now().toString();
          this.addMessage({
            sender: 'Xamã Olivia',
            content: response.response,
            timestamp: new Date(),
            isUser: false,
            id: messageId,
          });

          // ✅ NOVO: Tratar resposta do backend com informação de paywall
          if (response.showPaywall && !this.hasUserPaidForAnimal) {
            this.blockedMessageId = messageId;
            sessionStorage.setItem('animalInteriorBlockedMessageId', messageId);

            // Mostrar modal de dados depois de um breve delay
            setTimeout(() => {
              this.saveStateBeforePayment();
              this.showFortuneWheel = false;
              this.showPaymentModal = false;

              setTimeout(() => {
                this.showDataModal = true;
                this.cdr.markForCheck();
              }, 100);
            }, 2000);
          }

          // ✅ NOVO: Mostrar mensagem de mensagens restantes se aplicável
          if (
            response.freeMessagesRemaining !== undefined &&
            response.freeMessagesRemaining > 0 &&
            !this.hasUserPaidForAnimal
          ) {
            // Opcional: mostrar quantas mensagens grátis restam
            console.log(
              `Mensagens grátis restantes: ${response.freeMessagesRemaining}`
            );
          }
        } else {
          this.addMessage({
            sender: 'Xamã Olivia',
            content:
              '🦉 Desculpe, não consegui me conectar com a sabedoria animal neste momento. Tente novamente.',
            timestamp: new Date(),
            isUser: false,
          });
        }
        this.saveMessagesToSession();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        this.shouldScrollToBottom = true;
        this.addMessage({
          sender: 'Xamã Olivia',
          content: '🦉 Houve um erro na conexão espiritual. Tente novamente.',
          timestamp: new Date(),
          isUser: false,
        });
        this.saveMessagesToSession();
        this.cdr.markForCheck();
      },
    });
  }

  private saveStateBeforePayment(): void {
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'animalInteriorUserMessageCount',
      this.userMessageCount.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'animalInteriorBlockedMessageId',
        this.blockedMessageId
      );
    }
  }

  private saveMessagesToSession(): void {
    try {
      const messagesToSave = this.chatMessages.map((msg) => ({
        ...msg,
        timestamp:
          msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : msg.timestamp,
      }));
      sessionStorage.setItem(
        'animalInteriorMessages',
        JSON.stringify(messagesToSave)
      );
    } catch {}
  }

  isMessageBlocked(message: ChatMessage): boolean {
    return message.id === this.blockedMessageId && !this.hasUserPaidForAnimal;
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

    if (this.currentMessage) {
      sessionStorage.setItem('pendingAnimalMessage', this.currentMessage);
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
        serviceName: 'Animal interior',
        returnPath: '/animal-interior',
        cancelPath: '/animal-interior',
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

  addMessage(message: ChatMessage): void {
    this.chatMessages.push(message);
    this.shouldScrollToBottom = true;
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

  onScroll(event: any): void {
    const element = event.target;
    const isAtBottom =
      element.scrollHeight - element.scrollTop === element.clientHeight;
    this.isUserScrolling = !isAtBottom;
    if (isAtBottom) {
      this.isUserScrolling = false;
    }
  }

  onUserStartScroll(): void {
    this.isUserScrolling = true;
    setTimeout(() => {
      if (this.chatContainer) {
        const element = this.chatContainer.nativeElement;
        const isAtBottom =
          element.scrollHeight - element.scrollTop === element.clientHeight;
        if (isAtBottom) {
          this.isUserScrolling = false;
        }
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

  clearChat(): void {
    this.chatMessages = [];
    this.currentMessage = '';
    this.lastMessageCount = 0;
    this.userMessageCount = 0; // ✅ NOVO: Resetar contador
    this.blockedMessageId = null;
    this.isLoading = false;

    sessionStorage.removeItem('animalInteriorMessages');
    sessionStorage.removeItem('animalInteriorUserMessageCount'); // ✅ NOVO
    sessionStorage.removeItem('animalInteriorBlockedMessageId');

    this.shouldScrollToBottom = true;

    this.addMessage({
      sender: 'Xamã Olivia',
      content: `🦉 Olá, Buscador! Sou Olivia, sua guia espiritual do reino animal. Estou aqui para ajudá-lo a descobrir seu animal interior e conectar-se com ele.

O que você gostaria de explorar sobre seu espírito animal?`,
      timestamp: new Date(),
      isUser: false,
    });

    if (FortuneWheelComponent.canShowWheel()) {
      this.showAnimalWheelAfterDelay(3000);
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
    } catch (error) {}

    this.showDataModal = false;
    this.cdr.markForCheck();

    this.sendUserDataToBackend(userData);
  }

  private sendUserDataToBackend(userData: any): void {
    this.http.post(`${this.backendUrl}api/recolecta`, userData).subscribe({
      next: (response) => {
        this.promptForPayment();
      },
      error: (error) => {
        this.promptForPayment();
      },
    });
  }

  onDataModalClosed(): void {
    this.showDataModal = false;
    this.cdr.markForCheck();
  }

  showAnimalWheelAfterDelay(delayMs: number = 3000): void {
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
    const prizeMessage: ChatMessage = {
      sender: 'Xamã Olivia',
      content: `🦉 Os espíritos animais falaram! Você ganhou: **${prize.name}** ${prize.icon}\n\nOs antigos guardiões do reino animal decidiram abençoá-lo com este presente sagrado. A energia espiritual flui através de você, conectando-o mais profundamente com seu animal interior. Que a sabedoria ancestral o guie!`,
      timestamp: new Date(),
      isUser: false,
    };

    this.chatMessages.push(prizeMessage);
    this.shouldScrollToBottom = true;
    this.saveMessagesToSession();

    this.processAnimalPrize(prize);
  }

  onWheelClosed(): void {
    this.showFortuneWheel = false;
  }

  triggerAnimalWheel(): void {
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

  private processAnimalPrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Conexões Espirituais
        this.addFreeAnimalConsultations(3);
        break;
      case '2': // 1 Guia Premium - ACESSO COMPLETO
        this.hasUserPaidForAnimal = true;
        sessionStorage.setItem('hasUserPaidForAnimal_inneresTier', 'true');

        if (this.blockedMessageId) {
          this.blockedMessageId = null;
          sessionStorage.removeItem('animalInteriorBlockedMessageId');
        }

        const premiumMessage: ChatMessage = {
          sender: 'Xamã Olivia',
          content:
            '🦋 **Você desbloqueou o acesso Premium completo!** 🦋\n\nOs espíritos animais sorriram para você de uma maneira extraordinária. Agora você tem acesso ilimitado a toda a sabedoria do reino animal. Pode consultar sobre seu animal interior, conexões espirituais e todos os mistérios ancestrais quantas vezes desejar.\n\n✨ *Os guardiões do reino animal abriram todas as suas portas para você* ✨',
          timestamp: new Date(),
          isUser: false,
        };
        this.chatMessages.push(premiumMessage);
        this.shouldScrollToBottom = true;
        this.saveMessagesToSession();
        break;
      case '4': // Outra oportunidade
        break;
      default:
    }
  }

  private addFreeAnimalConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeAnimalConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeAnimalConsultations', newTotal.toString());

    if (this.blockedMessageId && !this.hasUserPaidForAnimal) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('animalInteriorBlockedMessageId');
    }
  }

  private hasFreeAnimalConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeAnimalConsultations') || '0'
    );
    return freeConsultations > 0;
  }

  private useFreeAnimalConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeAnimalConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem('freeAnimalConsultations', remaining.toString());

      const prizeMsg: ChatMessage = {
        sender: 'Xamã Olivia',
        content: `✨ *Você utilizou uma conexão espiritual gratuita* ✨\n\nVocê ainda tem **${remaining}** consultas com o reino animal disponíveis.`,
        timestamp: new Date(),
        isUser: false,
      };
      this.chatMessages.push(prizeMsg);
      this.shouldScrollToBottom = true;
      this.saveMessagesToSession();
    }
  }

  debugAnimalWheel(): void {
    this.showFortuneWheel = true;
    this.cdr.markForCheck();
  }
}
