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
    FortuneWheelComponent,
  ],
  templateUrl: './significado-suenos.component.html',
  styleUrl: './significado-suenos.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignificadoSuenosComponent
  implements OnInit, OnDestroy, AfterViewChecked, AfterViewInit
{
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Variables principales del chat
  messageText: string = '';
  messageInput = new FormControl('');
  messages: ConversationMessage[] = [];
  isLoading = false;
  isTyping = false;
  hasStartedConversation = false;

  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  showFortuneWheel: boolean = false;
  wheelPrizes: Prize[] = [
    {
      id: '1',
      name: '3 giros adicionais',
      color: '#4ecdc4',
      icon: '🌙',
    },
    {
      id: '2',
      name: '1 Análise de Sonho Premium',
      color: '#45b7d1',
      icon: '✨',
    },
    // ✅ ELIMINADO: { id: '3', name: '2 Consultas Oníricas Extra', color: '#ffeaa7', icon: '🔮' },
    {
      id: '4',
      name: 'Tente novamente!',
      color: '#ff7675',
      icon: '🔄',
    },
  ];
  private wheelTimer: any;

  //Datos para enviar
  showDataModal: boolean = false;
  userData: any = null;

  // Variables para control de pagos
  showPaymentModal: boolean = false;

  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForDreams: boolean = false;
  firstQuestionAsked: boolean = false;

  // NUEVA PROPIEDAD para controlar mensajes bloqueados
  blockedMessageId: string | null = null;

  textareaHeight: number = 25; // Altura inicial
  private readonly minTextareaHeight = 45;
  private readonly maxTextareaHeight = 120;
  private backendUrl = environment.apiUrl;

  interpreterData: DreamInterpreterData = {
    name: 'Mestra Alma',
    specialty: 'Interpretação de sonhos e simbologia onírica',
    experience: 'Séculos de interpretação de mensagens do inconsciente',
  };

  // Frases de bienvenida aleatorias
  welcomeMessages = [
    'Ah, vejo que você veio para desvendar os mistérios de seu mundo onírico... Os sonhos são janelas para a alma. Conte-me, que visões o visitaram?',
    'As energias cósmicas sussurram para mim que você tem sonhos que precisam ser interpretados. Sou a Mestra Alma, guardiã dos segredos oníricos. Qual mensagem do inconsciente o inquieta?',
    'Bem-vindo, viajante dos sonhos. Os planos astrais me mostraram sua chegada. Deixe-me guiá-lo pelos símbolos e mistérios de suas visões noturnas.',
    'O cristal dos sonhos brilha com sua presença... Sinto que você carrega visões que precisam ser desvendadas. Confie em minha sabedoria ancestral e compartilhe seus sonhos comigo.',
  ];

  constructor(
    private dreamService: InterpretadorSuenosService,
    private http: HttpClient,
    private elRef: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef,
    private paypalService: PaypalService // ← AGREGAR ESTA LÍNEA
  ) {}
  ngAfterViewInit(): void {
    this.setVideosSpeed(0.66); // 0.5 = más lento, 1 = normal
  }
  async ngOnInit(): Promise<void> {
    const paymentStatus = this.paypalService.checkPaymentStatusFromUrl();

    if (paymentStatus && paymentStatus.status === 'COMPLETED') {
      try {
        const verification = await this.paypalService.verifyAndProcessPayment(
          paymentStatus.token
        );

        if (verification.valid && verification.status === 'approved') {
          // ✅ Pago SOLO para este servicio (Traumdeutung)
          this.hasUserPaidForDreams = true;
          sessionStorage.setItem('hasUserPaidForDreams_traumdeutung', 'true');

          // NO usar localStorage global
          localStorage.removeItem('paypal_payment_completed');

          this.blockedMessageId = null;
          sessionStorage.removeItem('dreamBlockedMessageId');

          // Limpiar URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          // Cerrar modal de pago
          this.showPaymentModal = false;
          this.isProcessingPayment = false;
          this.paymentError = null;
          this.cdr.markForCheck();

          // ✅ MENSAJE DE CONFIRMACIÓN (usando messages.push con interfaz correcta)
          setTimeout(() => {
            const successMessage: ConversationMessage = {
              role: 'interpreter',
              message:
                '🎉 Pagamento concluído com sucesso!\n\n' +
                '✨ Obrigado pelo seu pagamento. Você agora tem acesso total à interpretação de sonhos.\n\n' +
                '💭 Vamos descobrir juntos os segredos dos seus sonhos!\n\n' +
                '📌 Nota: Este pagamento é válido apenas para o serviço de interpretação de sonhos. Outros serviços requerem pagamento separado.',
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
              role: 'interpreter',
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
        this.paymentError = 'Erro na verificação do pagamento';

        setTimeout(() => {
          const errorMessage: ConversationMessage = {
            role: 'interpreter',
            message:
              '❌ Infelizmente, ocorreu um erro na verificação do pagamento. Por favor, tente novamente mais tarde.',
            timestamp: new Date(),
          };
          this.messages.push(errorMessage);
          this.saveMessagesToSession();
          this.cdr.detectChanges();
        }, 800);
      }
    }

    // ✅ Verificar pago SOLO de este servicio específico
    this.hasUserPaidForDreams =
      sessionStorage.getItem('hasUserPaidForDreams_traumdeutung') === 'true';

    // ✅ NUEVO: Cargar datos del usuario desde sessionStorage
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

    const savedMessages = sessionStorage.getItem('dreamMessages');
    const savedFirstQuestion = sessionStorage.getItem('firstQuestionAsked');
    const savedBlockedMessageId = sessionStorage.getItem('blockedMessageId');

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.messages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp), // Convertir string a Date
        }));
        this.firstQuestionAsked = savedFirstQuestion === 'true';
        this.blockedMessageId = savedBlockedMessageId || null;
        this.hasStartedConversation = true;
      } catch (error) {
        // Si hay error, limpiar y empezar de nuevo
        this.clearSessionData();
        this.startConversation();
      }
    } else {
      // Si no hay mensajes guardados, iniciar conversación
      this.startConversation();
    }
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
      // ✅ USAR MÉTODO ESTÁTICO DEL COMPONENTE RULETA
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
    // Mostrar mensaje del intérprete sobre el premio
      const prizeMessage: ConversationMessage = {
      role: 'interpreter',
      message: `🌙 As energias cósmicas o abençoaram! Você ganhou: **${prize.name}** ${prize.icon}\n\nEste presente do universo onírico foi ativado para você. Os mistérios dos sonhos se revelam a você com maior clareza. Que a sorte o acompanhe em suas próximas interpretações!`,
      timestamp: new Date(),
    };
    this.messages.push(prizeMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();

    // Procesar el premio
    this.processDreamPrize(prize);
  }
  private processDreamPrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Interpretaciones Gratis
        this.addFreeDreamConsultations(3);
        break;
      case '2': // 1 Análisis Premium - ACCESO COMPLETO
        this.hasUserPaidForDreams = true;
        sessionStorage.setItem('hasUserPaidForDreams', 'true');

        // Desbloquear cualquier mensaje bloqueado
        if (this.blockedMessageId) {
          this.blockedMessageId = null;
          sessionStorage.removeItem('blockedMessageId');
        }

        // Agregar mensaje especial para este premio
        const premiumMessage: ConversationMessage = {
          role: 'interpreter',
          message:
            '✨ **Você desbloqueou o acesso Premium completo!** ✨\n\nOs segredos do mundo dos sonhos sorriram para você de forma extraordinária. Você agora tem acesso ilimitado a toda a sabedoria dos sonhos. Você pode fazer perguntas a qualquer momento sobre interpretações, símbolos oníricos e todos os segredos do inconsciente.\n\n🌙 *Os portais do reino dos sonhos se abriram completamente para você* 🌙',
          timestamp: new Date(),
        };
        this.messages.push(premiumMessage);
        this.shouldAutoScroll = true;
        this.saveMessagesToSession();
        break;
      // ✅ ELIMINADO: case '3' - 2 Consultas Extra
      case '4': // Otra oportunidad
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

    // Si había un mensaje bloqueado, desbloquearlo
    if (this.blockedMessageId && !this.hasUserPaidForDreams) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('blockedMessageId');
    }
  }
  openDataModalForPayment(): void {
    // Cerrar otros modales que puedan estar abiertos
    this.showFortuneWheel = false;
    this.showPaymentModal = false;

    // Guardar el estado antes de proceder
    this.saveStateBeforePayment();

    // Abrir el modal de recolecta de datos
    setTimeout(() => {
      this.showDataModal = true;
      this.cdr.markForCheck();
    }, 100);
  }
  getDreamConsultationsCount(): number {
    const freeDreamConsultations = parseInt(
      sessionStorage.getItem('freeDreamConsultations') || '0'
    );
    const legacyFreeConsultations = parseInt(
      sessionStorage.getItem('freeConsultations') || '0'
    );

    return freeDreamConsultations + legacyFreeConsultations;
  }
  // Cerrar la ruleta
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
    const threshold = 50; // píxeles desde el bottom
    const isNearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <
      threshold;
    this.shouldAutoScroll = isNearBottom;
  }
  ngOnDestroy(): void {
    // Limpiar timer de la ruleta
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
        'Du hast keine Drehungen verfügbar. ' +
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
    // Solo agregar mensaje de bienvenida si no hay mensajes
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

    // ✅ VERIFICACIÓN SIMPLIFICADA
    if (FortuneWheelComponent.canShowWheel()) {
      this.showWheelAfterDelay(3000);
    } else {
    }
  }

  sendMessage(): void {
    if (this.messageText?.trim() && !this.isLoading) {
      const userMessage = this.messageText.trim();

      // ✅ NUEVA LÓGICA: Verificar premios disponibles ANTES de bloquear
      if (!this.hasUserPaidForDreams && this.firstQuestionAsked) {
        // Verificar si tiene consultas gratis disponibles
        if (this.hasFreeConsultationsAvailable()) {
          this.useFreeConsultation();
          // Continuar con el mensaje sin bloquear
        } else {
          // Si no tiene consultas gratis, mostrar modal de datos PRIMERO

          // ✅ Cerrar otros modales primero
          this.showFortuneWheel = false;
          this.showPaymentModal = false;

          // ✅ Guardar el mensaje para procesarlo después del pago
          sessionStorage.setItem('pendingUserMessage', userMessage);

          this.saveStateBeforePayment();

          // ✅ Mostrar modal de datos con timeout para asegurar el cambio
          setTimeout(() => {
            this.showDataModal = true;
            this.cdr.markForCheck();
          }, 100);

          return; // ✅ Salir aquí para no procesar el mensaje aún
        }
      }

      // ✅ ACTIVAR AUTO-SCROLL cuando se envía un mensaje
      this.shouldAutoScroll = true;

      // ✅ Procesar el mensaje normalmente
      this.processUserMessage(userMessage);
    }
  }
  private processUserMessage(userMessage: string): void {
    const userMsg: ConversationMessage = {
      role: 'user',
      message: userMessage,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);

    this.saveMessagesToSession();
    this.messageText = '';
    this.isTyping = true;
    this.isLoading = true;

    const conversationHistory = this.messages.slice(0, -1);

    this.dreamService
      .chatWithInterpreter({
        interpreterData: this.interpreterData,
        userMessage: userMessage,
        conversationHistory: conversationHistory,
      })
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          this.isTyping = false;

          if (response.success && response.response) {
            const messageId = Date.now().toString();

            const interpreterMsg: ConversationMessage = {
              role: 'interpreter',
              message: response.response,
              timestamp: new Date(),
              id: messageId,
            };
            this.messages.push(interpreterMsg);

            this.shouldAutoScroll = true;

            // ✅ ACTUALIZADA: Solo bloquear si no tiene consultas gratis Y no ha pagado
            if (
              this.firstQuestionAsked &&
              !this.hasUserPaidForDreams &&
              !this.hasFreeConsultationsAvailable()
            ) {
              this.blockedMessageId = messageId;
              sessionStorage.setItem('blockedMessageId', messageId);

              // ✅ CAMBIO: Mostrar modal de datos en lugar de ir directo al pago
              setTimeout(() => {
                this.saveStateBeforePayment();

                // Cerrar otros modales
                this.showFortuneWheel = false;
                this.showPaymentModal = false;

                // Mostrar modal de datos
                setTimeout(() => {
                  this.showDataModal = true;
                  this.cdr.markForCheck();
                }, 100);
              }, 2000);
            } else if (!this.firstQuestionAsked) {
              this.firstQuestionAsked = true;
              sessionStorage.setItem('firstQuestionAsked', 'true');
            }

            this.saveMessagesToSession();
            this.cdr.markForCheck();
          } else {
           this.handleError('Erro ao obter resposta do intérprete');
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
  // ✅ NUEVO: Verificar si tiene consultas gratis disponibles
  private hasFreeConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeConsultations') || '0'
    );

    return freeConsultations > 0;
  }

  // ✅ NUEVO: Usar una consulta gratis
  private useFreeConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem('freeConsultations', remaining.toString());
      // Mostrar mensaje informativo
         const prizeMsg: ConversationMessage = {
        role: 'interpreter',
        message: `✨ *Você usou uma consulta gratuita* ✨\n\nVocê ainda tem **${remaining}** consultas gratuitas disponíveis.`,
        timestamp: new Date(),
      };
      this.messages.push(prizeMsg);
      this.shouldAutoScroll = true;
      this.saveMessagesToSession();
    }
  }

  // ✅ NUEVO: Obtener resumen de premios disponibles
  getPrizesAvailable(): string {
    const prizes: string[] = [];

    const freeConsultations = parseInt(
      sessionStorage.getItem('freeConsultations') || '0'
    );
    if (freeConsultations > 0) {
      prizes.push(
        `${freeConsultations} kostenlose${
          freeConsultations > 1 ? ' Beratungen' : ' Beratung'
        }`
      );
    }

    const freeInterpretations = parseInt(
      sessionStorage.getItem('freeInterpretations') || '0'
    );
    if (freeInterpretations > 0) {
      prizes.push(
        `${freeInterpretations} kostenlose${
          freeInterpretations > 1 ? ' Interpretationen' : ' Interpretation'
        }`
      );
    }

    if (sessionStorage.getItem('hasVIPConsultation') === 'true') {
      prizes.push('1 VIP-Beratung');
    }

    if (sessionStorage.getItem('hasPremiumReading') === 'true') {
      prizes.push('1 Premium-Lesung');
    }

    if (sessionStorage.getItem('hasMysticBonus') === 'true') {
      prizes.push('Mystischer Bonus aktiv');
    }

    return prizes.length > 0 ? prizes.join(', ') : 'Keine';
  }

  private saveStateBeforePayment(): void {
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'firstQuestionAsked',
      this.firstQuestionAsked.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem('blockedMessageId', this.blockedMessageId);
    }
  }

  // ✅ ARREGLO: Método para guardar mensajes corregido
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
    } catch (error) {}
  }

  // ✅ NUEVO: Método para limpiar datos de sesión
  private clearSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForDreams');
    sessionStorage.removeItem('dreamMessages');
    sessionStorage.removeItem('firstQuestionAsked');
    sessionStorage.removeItem('blockedMessageId');
  }

  // MÉTODO PARA VERIFICAR SI UN MENSAJE ESTÁ BLOQUEADO
  isMessageBlocked(message: ConversationMessage): boolean {
    return message.id === this.blockedMessageId && !this.hasUserPaidForDreams;
  }

  async promptForPayment(): Promise<void> {
    this.showPaymentModal = true;
    this.cdr.markForCheck();
    this.paymentError = null;
    this.isProcessingPayment = false;

    // Validar datos de usuario
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
        'Nenhum dado do cliente encontrado. Por favor, preencha o formulário primeiro.';
      this.showDataModal = true;
      this.cdr.markForCheck();
      return;
    }


    const email = this.userData.email?.toString().trim();
       if (!email) {
      this.paymentError =
        'Email obrigatório. Por favor, preencha o formulário.';
      this.showDataModal = true;
      this.cdr.markForCheck();
      return;
    }

    // ✅ Guardar mensaje pendiente si existe
    if (this.messageText?.trim()) {
      sessionStorage.setItem('pendingDreamMessage', this.messageText.trim());
    }
  }

  // ✅ MÉTODO MIGRADO A PAYPAL
  async handlePaymentSubmit(): Promise<void> {
    this.isProcessingPayment = true;
    this.paymentError = null;
    this.cdr.markForCheck();

    try {
      // Iniciar el flujo de pago de PayPal (redirige al usuario)
      await this.paypalService.initiatePayment({
        amount: '5.00',
        currency: 'EUR',
        serviceName: 'significado-sonhos',
        returnPath: '/significado-sonhos',
        cancelPath: '/significado-sonhos',
      });

      // El código después de esta línea NO se ejecutará porque
      // el usuario será redirigido a PayPal
    } catch (error: any) {
      this.paymentError =
        error.message || 'Erro ao inicializar o pagamento do PayPal.';
      this.isProcessingPayment = false;
      this.cdr.markForCheck();
    }
  }

  // ✅ MÉTODO SIMPLIFICADO - PayPal no requiere cleanup
  cancelPayment(): void {
    this.showPaymentModal = false;
    this.isProcessingPayment = false;
    this.paymentError = null;
    this.cdr.markForCheck();
  }

  adjustTextareaHeight(event: any): void {
    const textarea = event.target;

    // Resetear altura para obtener scrollHeight correcto
    textarea.style.height = 'auto';

    // Calcular nueva altura basada en el contenido
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, this.minTextareaHeight),
      this.maxTextareaHeight
    );

    // Aplicar nueva altura
    this.textareaHeight = newHeight;
    textarea.style.height = newHeight + 'px';
  }
  // Método para nueva consulta (resetear solo si no ha pagado)
  newConsultation(): void {
    // ✅ RESETEAR CONTROL DE SCROLL
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    if (!this.hasUserPaidForDreams) {
      this.firstQuestionAsked = false;
      this.blockedMessageId = null;
      this.clearSessionData();
    } else {
      sessionStorage.removeItem('dreamMessages');
      sessionStorage.removeItem('firstQuestionAsked');
      sessionStorage.removeItem('blockedMessageId');
      this.firstQuestionAsked = false;
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

    // ✅ ACTIVAR AUTO-SCROLL para mensajes de error
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

  clearConversation(): void {
    this.newConsultation();
  }

  // Actualizar el método onKeyPress
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.messageText?.trim() && !this.isLoading) {
        this.sendMessage();
        // Resetear altura del textarea después del envío
        setTimeout(() => {
          this.textareaHeight = this.minTextareaHeight;
        }, 50);
      }
    }
  }

  getTimeString(timestamp: Date | string): string {
    try {
      // Si es string, convertir a Date
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

      // Verificar que sea una fecha válida
      if (isNaN(date.getTime())) {
        return 'N/A';
      }

      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'N/A';
    }
  }
  formatMessage(content: string): string {
    if (!content) return '';

    let formattedContent = content;

    // Convertir **texto** a <strong>texto</strong> para negrilla
    formattedContent = formattedContent.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    // Convertir saltos de línea a <br> para mejor visualización
    formattedContent = formattedContent.replace(/\n/g, '<br>');

    // Opcional: También puedes manejar *texto* (una sola asterisco) como cursiva
    formattedContent = formattedContent.replace(
      /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
      '<em>$1</em>'
    );

    return formattedContent;
  }
  onUserDataSubmitted(userData: any): void {
    // ✅ VALIDAR CAMPOS CRÍTICOS ANTES DE PROCEDER
    const requiredFields = ['email']; // ❌ QUITADO 'apellido'
    const missingFields = requiredFields.filter(
      (field) => !userData[field] || userData[field].toString().trim() === ''
    );

    if (missingFields.length > 0) {
      alert(
        `Para continuar com o pagamento, você precisa preencher os seguintes campos: ${missingFields.join(
          ', '
        )}`
      );
      this.showDataModal = true; // Modal offen halten
      this.cdr.markForCheck();
      return;
    }

    // ✅ LIMPIAR Y GUARDAR datos INMEDIATAMENTE en memoria Y sessionStorage
    this.userData = {
      ...userData,
      email: userData.email?.toString().trim(),
    };

    // ✅ GUARDAR EN sessionStorage INMEDIATAMENTE
    try {
      sessionStorage.setItem('userData', JSON.stringify(this.userData));

      // Verificar que se guardaron correctamente
      const verificacion = sessionStorage.getItem('userData');
    } catch (error) {}

    this.showDataModal = false;
    this.cdr.markForCheck();

    // Enviar datos al backend (opcional, no bloquea el pago)
    this.sendUserDataToBackend(userData);
  }
  private sendUserDataToBackend(userData: any): void {
    this.http.post(`${this.backendUrl}api/recolecta`, userData).subscribe({
      next: (response) => {
        // ✅ LLAMAR A promptForPayment() PARA INICIALIZAR STRIPE
        this.promptForPayment();
      },
      error: (error) => {
        // ✅ AUN ASÍ PROCEDER AL PAGO
        this.promptForPayment();
      },
    });
  }
  onDataModalClosed(): void {
    this.showDataModal = false;
    this.cdr.markForCheck();
  }
}
