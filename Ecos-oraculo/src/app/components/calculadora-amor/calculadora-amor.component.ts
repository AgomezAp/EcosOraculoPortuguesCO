import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  CalculadoraAmorService,
  CompatibilityData,
  ConversationMessage,
  LoveCalculatorResponse,
  LoveExpertInfo,
} from '../../services/calculadora-amor.service';
import { Subject, takeUntil } from 'rxjs';
import { PaypalService } from '../../services/paypal.service';

import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import { environment } from '../../environments/environmets.prod';
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';

@Component({
  selector: 'app-calculadora-amor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatNativeDateModule,
    RecolectaDatosComponent,
  ],
  templateUrl: './calculadora-amor.component.html',
  styleUrl: './calculadora-amor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalculadoraAmorComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  textareaHeight: number = 45;
  private readonly minTextareaHeight = 45;
  private readonly maxTextareaHeight = 120;

  // Variáveis principais do chat
  conversationHistory: ConversationMessage[] = [];
  currentMessage: string = '';
  messageInput = new FormControl('');
  isLoading: boolean = false;
  isTyping: boolean = false;
  hasStartedConversation: boolean = false;
  showDataForm: boolean = false;

  showDataModal: boolean = false;
  userData: any = null;

  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  // Variáveis para controle de pagamentos
  showPaymentModal: boolean = false;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForLove: boolean = false;

  // ✅ NOVO: Sistema de 3 mensagens grátis
  private readonly FREE_MESSAGES_LIMIT = 3;
  private userMessageCount: number = 0;

  // Propriedade para controlar mensagens bloqueadas
  blockedMessageId: string | null = null;

  // Propriedades para a roleta
  showFortuneWheel: boolean = false;
  lovePrizes: Prize[] = [
    {
      id: '1',
      name: '3 giros da Roleta do Amor',
      color: '#ff69b4',
      icon: '💕',
    },
    {
      id: '2',
      name: '1 Análise Premium de Compatibilidade',
      color: '#ff1493',
      icon: '💖',
    },
    {
      id: '4',
      name: 'Tente novamente!',
      color: '#dc143c',
      icon: '💘',
    },
  ];
  private wheelTimer: any;
  private backendUrl = environment.apiUrl;

  // Formulário reativo
  compatibilityForm: FormGroup;

  // Estado do componente
  loveExpertInfo: LoveExpertInfo | null = null;
  compatibilityData: CompatibilityData | null = null;

  // Subject para gerenciar unsubscriptions
  private destroy$ = new Subject<void>();

  // Info da especialista em amor
  loveExpertInfo_display = {
    name: 'Mestra Valentina',
    title: 'Guardiã do amor eterno',
    specialty: 'Numerologia do amor e compatibilidade de almas',
  };

  // Frases de boas-vindas aleatórias
  welcomeMessages = [
    'Bem-vindo, alma apaixonada! 💕 Sou a Mestra Paula, e estou aqui para revelar os segredos do verdadeiro amor. As cartas do amor sussurram histórias de corações unidos e paixões eternas. Você está pronto para descobrir a compatibilidade do seu relacionamento?',
    'As energias do amor me sussurram que você veio buscar respostas do coração... Os números do amor revelam a química entre as almas. Que segredo romântico você quer conhecer?',
    'Bem-vindo ao Templo do amor eterno. Os padrões numerológicos do romance anunciaram sua chegada. Permita-me calcular a compatibilidade do seu relacionamento através da numerologia sagrada.',
    'Os números do amor dançam diante de mim e revelam sua presença... Cada cálculo revela um destino romântico. Qual casal você quer que eu analise numerologicamente para você?',
  ];

  constructor(
    private calculadoraAmorService: CalculadoraAmorService,
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private paypalService: PaypalService
  ) {
    this.compatibilityForm = this.createCompatibilityForm();
  }

  async ngOnInit(): Promise<void> {
    // Verificar pagamento deste serviço específico
    this.hasUserPaidForLove =
      sessionStorage.getItem('hasUserPaidForLove_liebesrechner') === 'true';

    // ✅ NOVO: Carregar contador de mensagens do sessionStorage
    const savedMessageCount = sessionStorage.getItem('loveUserMessageCount');
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
          this.hasUserPaidForLove = true;
          sessionStorage.setItem('hasUserPaidForLove_liebesrechner', 'true');
          localStorage.removeItem('paypal_payment_completed');

          this.blockedMessageId = null;
          sessionStorage.removeItem('loveBlockedMessageId');

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
              role: 'love_expert',
              message:
                '🎉 Pagamento concluído com sucesso!\n\n' +
                '✨ Obrigada pelo seu pagamento. Agora você tem acesso completo às calculadoras de amor.\n\n' +
                '💕 Vamos descobrir juntos os segredos do amor!',
              timestamp: new Date(),
            };
            this.conversationHistory.push(successMessage);
            this.saveMessagesToSession();
            this.cdr.detectChanges();

            // ✅ NOVO: Processar mensagem pendente se existir
            const pendingMessage = sessionStorage.getItem('pendingLoveMessage');
            if (pendingMessage) {
              sessionStorage.removeItem('pendingLoveMessage');
              setTimeout(() => {
                this.currentMessage = pendingMessage;
                this.sendMessage();
              }, 1000);
            }

            setTimeout(() => this.scrollToBottom(), 200);
          }, 1000);
        } else {
          this.paymentError = 'Não foi possível verificar o pagamento.';
          setTimeout(() => {
            const errorMessage: ConversationMessage = {
              role: 'love_expert',
              message:
                '⚠️ Houve um problema ao verificar seu pagamento. Por favor, tente novamente.',
              timestamp: new Date(),
            };
            this.conversationHistory.push(errorMessage);
            this.saveMessagesToSession();
            this.cdr.detectChanges();
          }, 800);
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
    }

    this.loadLoveData();
    this.loadLoveExpertInfo();
    this.subscribeToCompatibilityData();

    if (
      this.conversationHistory.length > 0 &&
      FortuneWheelComponent.canShowWheel()
    ) {
      this.showLoveWheelAfterDelay(2000);
    }
  }

  private loadLoveData(): void {
    const savedMessages = sessionStorage.getItem('loveMessages');
    const savedBlockedMessageId = sessionStorage.getItem(
      'loveBlockedMessageId'
    );

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.conversationHistory = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        this.blockedMessageId = savedBlockedMessageId || null;
        this.hasStartedConversation = true;
      } catch (error) {
        this.clearSessionData();
        this.initializeLoveWelcomeMessage();
      }
    } else {
      this.initializeLoveWelcomeMessage();
    }
  }

  private initializeLoveWelcomeMessage(): void {
    const randomWelcome =
      this.welcomeMessages[
        Math.floor(Math.random() * this.welcomeMessages.length)
      ];

    const welcomeMessage: ConversationMessage = {
      role: 'love_expert',
      message: randomWelcome,
      timestamp: new Date(),
    };

    this.conversationHistory.push(welcomeMessage);
    this.hasStartedConversation = true;

    if (FortuneWheelComponent.canShowWheel()) {
      this.showLoveWheelAfterDelay(3000);
    }
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

  ngAfterViewChecked(): void {
    if (
      this.shouldAutoScroll &&
      this.conversationHistory.length > this.lastMessageCount
    ) {
      this.scrollToBottom();
      this.lastMessageCount = this.conversationHistory.length;
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  startConversation(): void {
    if (this.conversationHistory.length === 0) {
      this.initializeLoveWelcomeMessage();
    }
    this.hasStartedConversation = true;
  }

  private createCompatibilityForm(): FormGroup {
    return this.formBuilder.group({
      person1Name: ['', [Validators.required, Validators.minLength(2)]],
      person1BirthDate: ['', Validators.required],
      person2Name: ['', [Validators.required, Validators.minLength(2)]],
      person2BirthDate: ['', Validators.required],
    });
  }

  private loadLoveExpertInfo(): void {
    this.calculadoraAmorService
      .getLoveExpertInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (info) => {
          this.loveExpertInfo = info;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.cdr.markForCheck();
        },
      });
  }

  private subscribeToCompatibilityData(): void {
    this.calculadoraAmorService.compatibilityData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.compatibilityData = data;
        if (data) {
          this.populateFormWithData(data);
        }
      });
  }

  private populateFormWithData(data: CompatibilityData): void {
    this.compatibilityForm.patchValue({
      person1Name: data.person1Name,
      person1BirthDate: new Date(data.person1BirthDate),
      person2Name: data.person2Name,
      person2BirthDate: new Date(data.person2BirthDate),
    });
  }

  calculateCompatibility(): void {
    if (this.compatibilityForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formValues = this.compatibilityForm.value;
    const compatibilityData: CompatibilityData = {
      person1Name: formValues.person1Name.trim(),
      person1BirthDate: this.formatDateForService(formValues.person1BirthDate),
      person2Name: formValues.person2Name.trim(),
      person2BirthDate: this.formatDateForService(formValues.person2BirthDate),
    };

    this.isLoading = true;
    this.calculadoraAmorService
      .calculateCompatibility(compatibilityData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.handleCalculationResponse(response);
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.handleError(error);
          this.cdr.markForCheck();
        },
        complete: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private handleCalculationResponse(response: LoveCalculatorResponse): void {
    if (response.success) {
      this.hasStartedConversation = true;
      this.showDataForm = false;

      const calculationMsg: ConversationMessage = {
        role: 'love_expert',
        message: `✨ Completei a análise numerológica de ${this.compatibilityForm.value.person1Name} e ${this.compatibilityForm.value.person2Name}. Os números do amor revelaram informações fascinantes sobre a compatibilidade de vocês. Quer conhecer os detalhes desta leitura de amor?`,
        timestamp: new Date(),
      };

      this.conversationHistory.push(calculationMsg);
      this.saveMessagesToSession();
      this.shouldAutoScroll = true;
    }
  }

  // ✅ NOVO: Método para verificar se o usuário tem acesso completo
  private hasFullAccess(): boolean {
    return (
      this.hasUserPaidForLove ||
      this.hasFreeLoveConsultationsAvailable() ||
      this.userMessageCount < this.FREE_MESSAGES_LIMIT
    );
  }

  // ✅ NOVO: Obter mensagens grátis restantes
  getFreeMessagesRemaining(): number {
    const bonusConsultations = parseInt(
      sessionStorage.getItem('freeLoveConsultations') || '0'
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
    if (!this.hasUserPaidForLove) {
      // Verificar se tem consultas da roleta disponíveis
      if (this.hasFreeLoveConsultationsAvailable()) {
        this.useFreeLoveConsultation();
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
        sessionStorage.setItem('pendingLoveMessage', userMessage);
        this.saveStateBeforePayment();

        // Mostrar modal de dados
        setTimeout(() => {
          this.showDataModal = true;
          this.cdr.markForCheck();
        }, 100);

        return; // Sair sem processar a mensagem
      }
    }

    this.shouldAutoScroll = true;
    this.processLoveUserMessage(userMessage);
  }

  private processLoveUserMessage(userMessage: string): void {
    // Adicionar mensagem do usuário
    const userMsg: ConversationMessage = {
      role: 'user',
      message: userMessage,
      timestamp: new Date(),
    };
    this.conversationHistory.push(userMsg);

    this.saveMessagesToSession();
    this.currentMessage = '';
    this.isTyping = true;
    this.isLoading = true;

    // ✅ NOVO: Incrementar contador de mensagens do usuário
    if (!this.hasUserPaidForLove && !this.hasFreeLoveConsultationsAvailable()) {
      this.userMessageCount++;
      sessionStorage.setItem(
        'loveUserMessageCount',
        this.userMessageCount.toString()
      );
    }

    const compatibilityData =
      this.calculadoraAmorService.getCompatibilityData();

    // Preparar histórico de conversação
    const conversationHistoryForService = this.conversationHistory
      .slice(-10)
      .map((msg) => ({
        role:
          msg.role === 'user' ? ('user' as const) : ('love_expert' as const),
        message: msg.message,
      }));

    // ✅ MODIFICADO: Enviar ao serviço com messageCount e isPremiumUser
    this.calculadoraAmorService
      .chatWithLoveExpert(
        userMessage,
        compatibilityData?.person1Name,
        compatibilityData?.person1BirthDate,
        compatibilityData?.person2Name,
        compatibilityData?.person2BirthDate,
        conversationHistoryForService,
        this.userMessageCount, // ✅ NOVO
        this.hasUserPaidForLove // ✅ NOVO
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.isTyping = false;

          if (response.success && response.response) {
            const messageId = Date.now().toString();

            const loveExpertMsg: ConversationMessage = {
              role: 'love_expert',
              message: response.response,
              timestamp: new Date(),
              id: messageId,
            };
            this.conversationHistory.push(loveExpertMsg);

            this.shouldAutoScroll = true;

            // ✅ NOVO: Tratar resposta do backend com informação de paywall
            if (response.showPaywall && !this.hasUserPaidForLove) {
              this.blockedMessageId = messageId;
              sessionStorage.setItem('loveBlockedMessageId', messageId);

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

            // ✅ NOVO: Log de mensagens restantes
            if (
              response.freeMessagesRemaining !== undefined &&
              !this.hasUserPaidForLove
            ) {
              console.log(
                `Mensagens grátis restantes: ${response.freeMessagesRemaining}`
              );
            }

            this.saveMessagesToSession();
            this.cdr.markForCheck();
          } else {
            this.handleError(
              'Erro ao obter a resposta da especialista em amor'
            );
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          this.isTyping = false;
          this.handleError('Erro de conexão. Por favor, tente novamente.');
          this.cdr.markForCheck();
        },
      });
  }

  private saveStateBeforePayment(): void {
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'loveUserMessageCount',
      this.userMessageCount.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem('loveBlockedMessageId', this.blockedMessageId);
    }
  }

  private saveMessagesToSession(): void {
    try {
      const messagesToSave = this.conversationHistory.map((msg) => ({
        ...msg,
        timestamp:
          msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : msg.timestamp,
      }));
      sessionStorage.setItem('loveMessages', JSON.stringify(messagesToSave));
    } catch (error) {}
  }

  private clearSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForLove_liebesrechner');
    sessionStorage.removeItem('loveMessages');
    sessionStorage.removeItem('loveUserMessageCount'); // ✅ NOVO
    sessionStorage.removeItem('loveBlockedMessageId');
  }

  isMessageBlocked(message: ConversationMessage): boolean {
    return message.id === this.blockedMessageId && !this.hasUserPaidForLove;
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

    if (this.currentMessage?.trim()) {
      sessionStorage.setItem('pendingLoveMessage', this.currentMessage.trim());
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
        serviceName: 'Calculadora de amor',
        returnPath: '/calculadora-amor',
        cancelPath: '/calculadora-amor',
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

  onEnterPressed(event: KeyboardEvent): void {
    if (event.shiftKey) {
      return;
    }
    event.preventDefault();
    if (this.canSendMessage() && !this.isLoading) {
      this.sendMessage();
      setTimeout(() => {
        this.textareaHeight = this.minTextareaHeight;
      }, 50);
    }
  }

  canSendMessage(): boolean {
    return !!(this.currentMessage && this.currentMessage.trim().length > 0);
  }

  resetChat(): void {
    this.conversationHistory = [];
    this.currentMessage = '';
    this.isLoading = false;
    this.isTyping = false;
    this.addWelcomeMessage();
    this.cdr.markForCheck();
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  private addWelcomeMessage(): void {
    const welcomeMessage = {
      id: Date.now().toString(),
      role: 'love_expert' as const,
      message:
        'Olá! Sou a Mestra Paula, sua guia no mundo do amor e da compatibilidade numerológica. Como posso ajudá-lo hoje? 💕',
      timestamp: new Date(),
      isBlocked: false,
    };
    this.conversationHistory.push(welcomeMessage);
  }

  savePersonalData(): void {
    this.showDataForm = false;
  }

  toggleDataForm(): void {
    this.showDataForm = !this.showDataForm;
  }

  private sendPredefinedMessage(message: string): void {
    this.currentMessage = message;
    this.sendMessage();
  }

  // ✅ MODIFICADO: Resetar contador também
  newConsultation(): void {
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    if (!this.hasUserPaidForLove) {
      this.userMessageCount = 0; // ✅ NOVO: Resetar contador
      this.blockedMessageId = null;
      this.clearSessionData();
    } else {
      sessionStorage.removeItem('loveMessages');
      sessionStorage.removeItem('loveUserMessageCount'); // ✅ NOVO
      sessionStorage.removeItem('loveBlockedMessageId');
      this.userMessageCount = 0; // ✅ NOVO
      this.blockedMessageId = null;
    }

    this.conversationHistory = [];
    this.hasStartedConversation = false;
    this.calculadoraAmorService.resetService();
    this.compatibilityForm.reset();
    this.initializeLoveWelcomeMessage();
    this.cdr.markForCheck();
  }

  trackByMessage(index: number, message: ConversationMessage): string {
    return `${message.role}-${message.timestamp.getTime()}-${index}`;
  }

  formatTime(timestamp: Date | string): string {
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

  private handleError(errorMessage: string): void {
    const errorMsg: ConversationMessage = {
      role: 'love_expert',
      message: `💕 As energias do amor flutuam... ${errorMessage} Tente novamente quando as vibrações românticas se estabilizarem.`,
      timestamp: new Date(),
    };
    this.conversationHistory.push(errorMsg);
    this.shouldAutoScroll = true;
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        const element = this.scrollContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {}
  }

  private formatDateForService(date: Date): string {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.compatibilityForm.controls).forEach((key) => {
      const control = this.compatibilityForm.get(key);
      control?.markAsTouched();
    });
  }

  hasFormError(fieldName: string, errorType: string): boolean {
    const field = this.compatibilityForm.get(fieldName);
    return !!(
      field &&
      field.hasError(errorType) &&
      (field.dirty || field.touched)
    );
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.compatibilityForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'Este campo é obrigatório';
    }
    if (field?.hasError('minlength')) {
      return 'Mínimo 2 caracteres';
    }
    return '';
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

  showLoveWheelAfterDelay(delayMs: number = 3000): void {
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
      role: 'love_expert',
      message: `💕 O verdadeiro amor conspirou a seu favor! Você ganhou: **${prize.name}** ${prize.icon}\n\nAs forças românticas do universo decidiram abençoá-lo com este presente celestial. Que o amor eterno o acompanhe!`,
      timestamp: new Date(),
    };

    this.conversationHistory.push(prizeMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();

    this.processLovePrize(prize);
  }

  private processLovePrize(prize: Prize): void {
    switch (prize.id) {
      case '1':
        this.addFreeLoveConsultations(3);
        break;
      case '2':
        this.addFreeLoveConsultations(1);
        break;
      case '4':
        break;
      default:
    }
  }

  private addFreeLoveConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeLoveConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeLoveConsultations', newTotal.toString());

    if (this.blockedMessageId && !this.hasUserPaidForLove) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('loveBlockedMessageId');
    }
  }

  private hasFreeLoveConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeLoveConsultations') || '0'
    );
    return freeConsultations > 0;
  }

  private useFreeLoveConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeLoveConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem('freeLoveConsultations', remaining.toString());

      const prizeMsg: ConversationMessage = {
        role: 'love_expert',
        message: `✨ *Você utilizou uma consulta de amor gratuita* ✨\n\nVocê ainda tem **${remaining}** consultas de amor gratuitas disponíveis.`,
        timestamp: new Date(),
      };
      this.conversationHistory.push(prizeMsg);
      this.shouldAutoScroll = true;
      this.saveMessagesToSession();
    }
  }

  onWheelClosed(): void {
    this.showFortuneWheel = false;
  }

  triggerLoveWheel(): void {
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
}
