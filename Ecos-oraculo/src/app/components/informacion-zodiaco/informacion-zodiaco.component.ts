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
import { InformacionZodiacoService } from '../../services/informacion-zodiaco.service';
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
  sender: string;
}

// ✅ Definir AstrologerData según tu servicio
interface AstrologerData {
  name: string;
  title: string;
  specialty: string;
  experience: string;
}
interface ZodiacRequest {
  zodiacData: AstrologerData;
  userMessage: string;
  conversationHistory?: Array<{
    role: 'user' | 'astrologer';
    message: string;
  }>;
}

interface ZodiacResponse {
  success: boolean;
  response?: string;
  error?: string;
  timestamp: string;
}

interface AstrologerInfo {
  success: boolean;
  astrologer: {
    name: string;
    title: string;
    specialty: string;
    description: string;
  };
  timestamp: string;
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
    FortuneWheelComponent,
  ],
  templateUrl: './informacion-zodiaco.component.html',
  styleUrl: './informacion-zodiaco.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformacionZodiacoComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Variables principales del chat
  currentMessage: string = '';
  messages: any[] = [];
  isLoading = false;
  hasStartedConversation = false;

  // Variables de control de scroll
  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  showDataModal: boolean = false;
  userData: any = null;

  // Variables para control de pagos
  showPaymentModal: boolean = false;

  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForAstrology: boolean = false;
  firstQuestionAsked: boolean = false;
  //Configuración de la rueda de la fortuna
  showFortuneWheel: boolean = false;
  astralPrizes: Prize[] = [
    {
      id: '1',
      name: '3 Giros da Roda Astral',
      color: '#4ecdc4',
      icon: '🔮',
    },
    { id: '2', name: '1 Leitura Astral Premium', color: '#45b7d1', icon: '✨' },

    {
      id: '4',
      name: 'Tente novamente!',
      color: '#ff7675',
      icon: '🌙',
    },
  ];
  private wheelTimer: any;
  // NUEVA PROPIEDAD para controlar mensajes bloqueados
  blockedMessageId: string | null = null;
  private backendUrl = environment.apiUrl;

  astrologerInfo = {
    name: 'Mestra Carla',
    title: 'Guardiã das Estrelas',
    specialty: 'Especialista em Astrologia e Signos do Zodíaco',
  };

  // Frases de bienvenida aleatorias
  welcomeMessages = [
    'Bem-vindo, alma cósmica. As estrelas sussurraram para mim sua chegada... Quais segredos do zodíaco você deseja desvendar hoje?',
    'Os planetas se alinham para recebê-lo. Sou a Mestra Carla, intérprete dos destinos celestiais. Sobre o que você gostaria de consultar sobre seu signo ou aspecto celestial?',
    'O universo vibra com sua presença... As constelações dançam e aguardam suas perguntas. Deixe-me guiá-lo pelos caminhos do zodíaco.',
    'Ah, vejo que as estrelas o conduziram até mim. Os segredos dos signos astrologicos aguardam para serem revelados. O que o inquieta no firmamento?',
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
    this.hasUserPaidForAstrology =
      sessionStorage.getItem('hasUserPaidForZodiacInfo_zodiacInfo') === 'true';

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

          // Clear URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          this.messages.push({
            sender: this.astrologerInfo.name,
            content:
              '✨ Pagamento confirmado! Agora você pode acessar toda a minha experiência.',
            timestamp: new Date(),
            isUser: false,
          });

          this.cdr.markForCheck();
        }
      } catch (error) {
        console.error('Error verificando pago de PayPal:', error);

        this.paymentError = 'Erro na verificação do pagamento';
      }
    }

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

    const savedMessages = sessionStorage.getItem('astrologyMessages');
    const savedFirstQuestion = sessionStorage.getItem(
      'firstAstrologyQuestionAsked'
    );
    const savedBlockedMessageId = sessionStorage.getItem(
      'blockedAstrologyMessageId'
    );

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.messages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        this.firstQuestionAsked = savedFirstQuestion === 'true';
        this.blockedMessageId = savedBlockedMessageId || null;
        this.hasStartedConversation = true;
      } catch (error) {
        this.clearSessionData();
        this.startConversation();
      }
    } else {
      this.startConversation();
    }

    // ✅ AGREGAR: Mostrar ruleta si ya hay conversación iniciada
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
      } else {
      }
    }, delayMs);
  }
  onPrizeWon(prize: Prize): void {
    // Mostrar mensaje del astrólogo sobre el premio
    const prizeMessage = {
      isUser: false,
      content: `🌟 As energias cósmicas o abençoaram! Você ganhou: **${prize.name}** ${prize.icon}\n\nEste presente do universo foi ativado para você. Os segredos do zodíaco serão revelados a você com maior clareza. Que a sorte astral o acompanhe em suas próximas consultas!`,
      timestamp: new Date(),
      isPrizeAnnouncement: true,
    };

    this.messages.push(prizeMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();

    // Procesar el premio
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
      case '1': // 3 Consultas Gratis
        this.addFreeAstrologyConsultations(3);
        break;
      case '2': // 1 Lectura Premium - ACCESO COMPLETO
        this.hasUserPaidForAstrology = true;
        sessionStorage.setItem('hasUserPaidForAstrology', 'true');

        // Desbloquear cualquier mensaje bloqueado
        if (this.blockedMessageId) {
          this.blockedMessageId = null;
          sessionStorage.removeItem('blockedAstrologyMessageId');
        }

        // Agregar mensaje especial para este premio
        const premiumMessage = {
          isUser: false,
          content:
            '✨ **Você desbloqueou o acesso Premium completo!** ✨\n\nAs estrelas conspiraram de forma extraordinária para ajudá-lo. Agora você tem acesso ilimitado a todo o conhecimento astral. Você pode consultar sobre signos, compatibilidades, previsões astrológicas e todos os segredos celestiais quantas vezes desejar.\n\n🌟 *As estrelas abriram todas as suas portas cósmicas para você* 🌟',
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
  private addFreeAstrologyConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeAstrologyConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeAstrologyConsultations', newTotal.toString());

    // Si había un mensaje bloqueado, desbloquearlo
    if (this.blockedMessageId && !this.hasUserPaidForAstrology) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('blockedAstrologyMessageId');
    }
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
      // Mostrar mensaje informativo
      const prizeMsg = {
        isUser: false,
        content: `✨ *Você usou uma consulta astral gratuita* ✨\n\nVocê ainda tem **${remaining}** consultas astrais gratuitas disponíveis.`,
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

      const welcomeMessage = {
        isUser: false,
        content: randomWelcome,
        timestamp: new Date(),
      };

      this.messages.push(welcomeMessage);
    }
    this.hasStartedConversation = true;

    // ✅ AGREGAR VERIFICACIÓN DE RULETA
    if (FortuneWheelComponent.canShowWheel()) {
      this.showWheelAfterDelay(3000);
    } else {
    }
  }

  sendMessage(): void {
    if (this.currentMessage?.trim() && !this.isLoading) {
      const userMessage = this.currentMessage.trim();

      // ✅ NUEVA LÓGICA: Verificar consultas gratuitas ANTES de verificar pago
      if (!this.hasUserPaidForAstrology && this.firstQuestionAsked) {
        // Verificar si tiene consultas astrales gratis disponibles
        if (this.hasFreeAstrologyConsultationsAvailable()) {
          this.useFreeAstrologyConsultation();
          // Continuar con el mensaje sin bloquear
        } else {
          // Si no tiene consultas gratis, mostrar modal de datos

          // Cerrar otros modales primero
          this.showFortuneWheel = false;
          this.showPaymentModal = false;

          // Guardar el mensaje para procesarlo después del pago
          sessionStorage.setItem('pendingAstrologyMessage', userMessage);

          this.saveStateBeforePayment();

          // Mostrar modal de datos con timeout
          setTimeout(() => {
            this.showDataModal = true;
            this.cdr.markForCheck();
          }, 100);

          return; // Salir aquí para no procesar el mensaje aún
        }
      }

      this.shouldAutoScroll = true;

      // Procesar mensaje normalmente
      this.processUserMessage(userMessage);
    }
  }

  // ✅ NUEVO: Separar lógica de procesamiento de mensajes
  private processUserMessage(userMessage: string): void {
    const userMsg = {
      isUser: true,
      content: userMessage,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);

    this.saveMessagesToSession();
    this.currentMessage = '';
    this.isLoading = true;

    this.generateAstrologyResponse(userMessage).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        const messageId = Date.now().toString();
        const astrologerMsg = {
          isUser: false,
          content: response,
          timestamp: new Date(),
          id: messageId,
        };
        this.messages.push(astrologerMsg);

        this.shouldAutoScroll = true;

        // ✅ LÓGICA MODIFICADA: Solo bloquear si no tiene consultas gratis Y no ha pagado
        if (
          this.firstQuestionAsked &&
          !this.hasUserPaidForAstrology &&
          !this.hasFreeAstrologyConsultationsAvailable()
        ) {
          this.blockedMessageId = messageId;
          sessionStorage.setItem('blockedAstrologyMessageId', messageId);

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
          sessionStorage.setItem('firstAstrologyQuestionAsked', 'true');
        }

        this.saveMessagesToSession();
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.isLoading = false;
        const errorMsg = {
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
  private generateAstrologyResponse(userMessage: string): Observable<string> {
    // Crear el historial de conversación para el contexto
    const conversationHistory = this.messages
      .filter((msg) => msg.content && msg.content.trim() !== '')
      .map((msg) => ({
        role: msg.isUser ? ('user' as const) : ('astrologer' as const),
        message: msg.content,
      }));

    // Datos del astrólogo
    const astrologerData: AstrologerData = {
      name: this.astrologerInfo.name,
      title: this.astrologerInfo.title,
      specialty: this.astrologerInfo.specialty,
      experience:
        'Séculos de experiência na interpretação dos destinos celestiais e da influência das estrelas',
    };

    // ✅ Crear la solicitud con 'zodiacData' en lugar de 'astrologerData'
    const request: ZodiacRequest = {
      zodiacData: astrologerData, // ✅ Cambiar aquí
      userMessage,
      conversationHistory,
    };

    // Llamar al servicio y transformar la respuesta
    return this.zodiacoService.chatWithAstrologer(request).pipe(
      map((response: ZodiacResponse) => {
        if (response.success && response.response) {
          return response.response;
        } else {
          throw new Error(response.error || 'Erro desconhecido do serviço');
        }
      }),
      catchError((error: any) => {
        return of(
          '🌟 As estrelas estão temporariamente encobertas. As estrelas sussurram para mim que preciso recarregar minha energia cósmica. Por favor, tente novamente em alguns momentos.'
        );
      })
    );
  }

  private saveStateBeforePayment(): void {
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'firstAstrologyQuestionAsked',
      this.firstQuestionAsked.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'blockedAstrologyMessageId',
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
    } catch (error) {}
  }

  private clearSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForAstrology');
    sessionStorage.removeItem('astrologyMessages');
    sessionStorage.removeItem('firstAstrologyQuestionAsked');
    sessionStorage.removeItem('blockedAstrologyMessageId');
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

    // Guardar mensaje pendiente si existe
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
        amount: '5.00',
        currency: 'EUR',
        serviceName: 'informacao zodiaco',
        returnPath: '/informacao-zodiaco',
        cancelPath: '/informacao-zodiaco',
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

  clearConversation(): void {
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    if (!this.hasUserPaidForAstrology) {
      this.firstQuestionAsked = false;
      this.blockedMessageId = null;
      this.clearSessionData();
    } else {
      sessionStorage.removeItem('astrologyMessages');
      sessionStorage.removeItem('firstAstrologyQuestionAsked');
      sessionStorage.removeItem('blockedAstrologyMessageId');
      this.firstQuestionAsked = false;
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
        `Para prosseguir com o pagamento, você deve preencher o seguinte: ${missingFields.join(
          ', '
        )}`
      );
      this.showDataModal = true; // Mantener modal abierto
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

    // ✅ NUEVO: Enviar datos al backend como en otros componentes
    this.sendUserDataToBackend(userData);
  }
  private sendUserDataToBackend(userData: any): void {
    this.http.post(`${this.backendUrl}api/recolecta`, userData).subscribe({
      next: (response) => {
        // ✅ LLAMAR A promptForPayment QUE INICIALIZA STRIPE
        this.promptForPayment();
      },
      error: (error) => {
        // ✅ AUN ASÍ ABRIR EL MODAL DE PAGO
        this.promptForPayment();
      },
    });
  }
  onDataModalClosed(): void {
    this.showDataModal = false;
    this.cdr.markForCheck();
  }
}
