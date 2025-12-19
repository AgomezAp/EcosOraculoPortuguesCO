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
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ZodiacoChinoService } from '../../services/zodiaco-chino.service';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaypalService } from '../../services/paypal.service';

import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environmets.prod';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';

interface ChatMessage {
  role: 'user' | 'master';
  message: string;
  timestamp?: string;
  id?: string;
}

interface MasterInfo {
  success: boolean;
  master: {
    name: string;
    title: string;
    specialty: string;
    description: string;
    services: string[];
  };
  timestamp: string;
}

interface ZodiacAnimal {
  animal?: string;
  symbol?: string;
  year?: number;
  element?: string;
  traits?: string[];
}
@Component({
  selector: 'app-zodiaco-chino',
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
  templateUrl: './zodiaco-chino.component.html',
  styleUrl: './zodiaco-chino.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZodiacoChinoComponent
  implements OnInit, AfterViewChecked, OnDestroy, AfterViewInit
{
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  // Propriedades principais
  masterInfo: MasterInfo | null = null;
  userForm: FormGroup;
  isFormCompleted = false;
  isLoading = false;
  currentMessage = '';
  conversationHistory: ChatMessage[] = [];
  zodiacAnimal: ZodiacAnimal = {};
  showDataForm = true;
  isTyping: boolean = false;
  private shouldScrollToBottom = false;
  private shouldAutoScroll = true;
  private lastMessageCount = 0;
  // Variáveis para controle de fortuna
  showFortuneWheel: boolean = false;
  horoscopePrizes: Prize[] = [
    {
      id: '1',
      name: '3 giros da Roleta do Signo do Zodíaco',
      color: '#4ecdc4',
      icon: '🔮',
    },
    {
      id: '2',
      name: '1 Análise Premium do Signo do Zodíaco',
      color: '#45b7d1',
      icon: '✨',
    },
    {
      id: '4',
      name: 'Tente novamente!',
      color: '#ff7675',
      icon: '🌙',
    },
  ];
  private wheelTimer: any;
  // Variáveis para controle de pagamentos
  showPaymentModal: boolean = false;

  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForHoroscope: boolean = false;
  blockedMessageId: string | null = null;

  // ✅ NOVO: Sistema de 3 mensagens grátis
  private userMessageCount: number = 0;
  private readonly FREE_MESSAGES_LIMIT = 3;

  // Dados para enviar
  showDataModal: boolean = false;
  userData: any = null;
  private backendUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private zodiacoChinoService: ZodiacoChinoService,
    private http: HttpClient,
    private elRef: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef,
    private paypalService: PaypalService
  ) {
    // Configuração do formulário para horóscopo
    this.userForm = this.fb.group({
      fullName: [''],
      birthYear: [
        '',
        [Validators.required, Validators.min(1900), Validators.max(2024)],
      ],
      birthDate: [''],
      initialQuestion: [
        'O que você pode me dizer sobre meu signo zodiacal e horóscopo?',
      ],
    });
  }
  ngAfterViewInit(): void {
    this.setVideosSpeed(0.7); // 0.5 = mais lento, 1 = normal
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
    // ✅ Verificar se viemos do PayPal depois de um pagamento
    this.hasUserPaidForHoroscope =
      sessionStorage.getItem('hasUserPaidForHoroscope_horoskop') === 'true';

    const paymentStatus = this.paypalService.checkPaymentStatusFromUrl();

    if (paymentStatus && paymentStatus.status === 'COMPLETED') {
      try {
        const verification = await this.paypalService.verifyAndProcessPayment(
          paymentStatus.token
        );

        if (verification.valid && verification.status === 'approved') {
          // ✅ Pagamento APENAS para este serviço (Horóscopo)
          this.hasUserPaidForHoroscope = true;
          sessionStorage.setItem('hasUserPaidForHoroscope_horoskop', 'true');

          // NÃO usar localStorage global
          localStorage.removeItem('paypal_payment_completed');

          this.blockedMessageId = null;
          sessionStorage.removeItem('horoscopeBlockedMessageId');

          // Limpar URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          // Fechar modal de pagamento
          this.showPaymentModal = false;
          this.isProcessingPayment = false;
          this.paymentError = null;
          this.cdr.markForCheck();

          // ✅ MENSAGEM DE CONFIRMAÇÃO (usando assinatura correta de addMessage)
          setTimeout(() => {
            this.addMessage(
              'master',
              '🎉 Pagamento concluído com sucesso!\n\n' +
                '✨ Obrigada pelo seu pagamento. Agora você tem acesso completo ao Horóscopo Chinês.\n\n' +
                '🐉 Vamos descobrir juntos seu futuro astrológico!\n\n' +
                '📌 Nota: Este pagamento é válido apenas para o serviço de Horóscopo. Para outros serviços é necessário um pagamento separado.'
            );
            this.cdr.detectChanges();
            setTimeout(() => this.scrollToBottom(), 200);
          }, 1000);
        } else {
          this.paymentError = 'Não foi possível verificar o pagamento.';

          setTimeout(() => {
            this.addMessage(
              'master',
              '⚠️ Houve um problema ao verificar seu pagamento. Por favor, tente novamente ou entre em contato com nosso suporte.'
            );
            this.cdr.detectChanges();
          }, 800);
        }
      } catch (error) {
        console.error('Erro verificando pagamento do PayPal:', error);
        this.paymentError = 'Erro na verificação do pagamento';

        setTimeout(() => {
          this.addMessage(
            'master',
            '❌ Infelizmente, ocorreu um erro ao verificar seu pagamento. Por favor, tente novamente mais tarde.'
          );
          this.cdr.detectChanges();
        }, 800);
      }
    }

    // ✅ NOVO: Carregar contador de mensagens
    const savedMessageCount = sessionStorage.getItem(
      'horoscopeUserMessageCount'
    );
    if (savedMessageCount) {
      this.userMessageCount = parseInt(savedMessageCount, 10);
    }

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

    // Carregar dados salvos específicos do horóscopo
    this.loadHoroscopeData();

    // ✅ PayPal verifica em ngOnInit() acima - já não precisamos de checkHoroscopePaymentStatus()

    this.loadMasterInfo();

    // Só adicionar mensagem de boas-vindas se não houver mensagens salvas
    if (this.conversationHistory.length === 0) {
      this.initializeHoroscopeWelcomeMessage();
    }

    // ✅ TAMBÉM VERIFICAR PARA MENSAGENS RESTAURADAS
    if (
      this.conversationHistory.length > 0 &&
      FortuneWheelComponent.canShowWheel()
    ) {
      this.showHoroscopeWheelAfterDelay(2000);
    }
  }
  private loadHoroscopeData(): void {
    const savedMessages = sessionStorage.getItem('horoscopeMessages');
    const savedBlockedMessageId = sessionStorage.getItem(
      'horoscopeBlockedMessageId'
    );

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.conversationHistory = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp,
        }));
        this.blockedMessageId = savedBlockedMessageId || null;
      } catch (error) {
        this.clearHoroscopeSessionData();
        this.initializeHoroscopeWelcomeMessage();
      }
    }
  }
  private initializeHoroscopeWelcomeMessage(): void {
    const welcomeMessage = `Bem-vindo ao Reino das Estrelas! 🔮✨

Sou a Astróloga Maria, guia celestial dos signos do zodíaco. Durante décadas estudei as influências dos planetas e constelações que guiam nosso destino.

Cada pessoa nasce sob a proteção de um signo zodiacal que influencia sua personalidade, seu destino e seu caminho de vida. Para revelar os segredos do seu horóscopo e as influências celestiais, preciso da sua data de nascimento.

Os doze signos (Áries, Touro, Gêmeos, Câncer, Leão, Virgem, Libra, Escorpião, Sagitário, Capricórnio, Aquário e Peixes) têm sabedoria ancestral para compartilhar.

Você está pronto para descobrir o que as estrelas revelam sobre seu destino? 🌙`;

    this.addMessage('master', welcomeMessage);

    // ✅ VERIFICAÇÃO DE ROLETA HOROSCÓPICA
    if (FortuneWheelComponent.canShowWheel()) {
      this.showHoroscopeWheelAfterDelay(3000);
    } else {
    }
  }
  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }

    if (
      this.shouldAutoScroll &&
      this.conversationHistory.length > this.lastMessageCount
    ) {
      this.scrollToBottom();
      this.lastMessageCount = this.conversationHistory.length;
    }
  }

  ngOnDestroy(): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }
    // ✅ PayPal não requer limpeza de elementos
  }

  // ✅ Método eliminado - PayPal gerencia verificação em ngOnInit()

  private saveHoroscopeMessagesToSession(): void {
    try {
      const messagesToSave = this.conversationHistory.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp,
      }));
      sessionStorage.setItem(
        'horoscopeMessages',
        JSON.stringify(messagesToSave)
      );
    } catch (error) {}
  }

  private clearHoroscopeSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForHoroscope');
    sessionStorage.removeItem('horoscopeMessages');
    sessionStorage.removeItem('horoscopeBlockedMessageId');
    sessionStorage.removeItem('horoscopeUserMessageCount');
    sessionStorage.removeItem('freeHoroscopeConsultations');
    sessionStorage.removeItem('pendingHoroscopeMessage');
  }

  private saveHoroscopeStateBeforePayment(): void {
    this.saveHoroscopeMessagesToSession();
    sessionStorage.setItem(
      'horoscopeUserMessageCount',
      this.userMessageCount.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'horoscopeBlockedMessageId',
        this.blockedMessageId
      );
    }
  }

  isMessageBlocked(message: ChatMessage): boolean {
    return (
      message.id === this.blockedMessageId && !this.hasUserPaidForHoroscope
    );
  }

  // ✅ MÉTODO MIGRADO PARA PAYPAL
  async promptForHoroscopePayment(): Promise<void> {
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
      sessionStorage.setItem('pendingHoroscopeMessage', this.currentMessage);
    }
  }

  // ✅ MÉTODO MIGRADO PARA PAYPAL
  async handleHoroscopePaymentSubmit(): Promise<void> {
    this.isProcessingPayment = true;
    this.paymentError = null;
    this.cdr.markForCheck();

    try {
      // Iniciar o fluxo de pagamento do PayPal (redireciona o usuário)
      await this.paypalService.initiatePayment({
        amount: '4.00',
        currency: 'EUR',
        serviceName: 'Horóscopo',
        returnPath: '/horoscopo',
        cancelPath: '/horoscopo',
      });

      // O código após esta linha NÃO será executado porque
      // o usuário será redirecionado para o PayPal
    } catch (error: any) {
      this.paymentError =
        error.message || 'Erro ao iniciar o pagamento do PayPal.';
      this.isProcessingPayment = false;
      this.cdr.markForCheck();
    }
  }

  // ✅ MÉTODO SIMPLIFICADO - PayPal não requer cleanup
  cancelHoroscopePayment(): void {
    this.showPaymentModal = false;
    this.isProcessingPayment = false;
    this.paymentError = null;
    this.cdr.markForCheck();
  }

  startChatWithoutForm(): void {
    this.showDataForm = false;
  }

  // Carregar informação da mestra
  loadMasterInfo(): void {
    this.zodiacoChinoService.getMasterInfo().subscribe({
      next: (info) => {
        this.masterInfo = info;
      },
      error: (error) => {
        // Informação padrão em caso de erro
        this.masterInfo = {
          success: true,
          master: {
            name: 'Astróloga Maria',
            title: 'Guia Celestial dos Signos',
            specialty: 'Astrologia Ocidental e Horóscopo Personalizado',
            description:
              'Astróloga sábia, especializada na interpretação de influências celestiais e na sabedoria dos doze signos do zodíaco',
            services: [
              'Interpretação de signos zodiacais',
              'Análise de mapas astrais',
              'Previsões de horóscopo',
              'Compatibilidade entre signos',
              'Conselhos baseados em astrologia',
            ],
          },
          timestamp: new Date().toISOString(),
        };
      },
    });
  }

  // Iniciar consulta do horóscopo
  startConsultation(): void {
    if (this.userForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.cdr.markForCheck(); // ✅ Detectar mudança de loading

      const formData = this.userForm.value;

      // Calcular animal do zodíaco

      const initialMessage =
        formData.initialQuestion ||
        'Olá! Gostaria de saber mais sobre meu signo zodiacal e horóscopo.';

      // Adicionar mensagem do usuário
      this.addMessage('user', initialMessage);

      // Preparar dados para enviar ao backend
      const consultationData = {
        zodiacData: {
          name: 'Astróloga Maria',
          specialty: 'Astrologia Ocidental e Horóscopo Personalizado',
          experience: 'Décadas de experiência em interpretação astrológica',
        },
        userMessage: initialMessage,
        fullName: formData.fullName,
        birthYear: formData.birthYear?.toString(),
        birthDate: formData.birthDate,
        conversationHistory: this.conversationHistory,
      };

      // ✅ Chamar o serviço com contador de mensagens (mensagem inicial = 1)
      this.zodiacoChinoService
        .chatWithMasterWithCount(
          consultationData,
          1,
          this.hasUserPaidForHoroscope
        )
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success && response.response) {
              this.addMessage('master', response.response);
              this.isFormCompleted = true;
              this.showDataForm = false;
              this.saveHoroscopeMessagesToSession();
              this.cdr.markForCheck();
            } else {
              this.handleError('Erro na resposta da astróloga');
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.handleError(
              'Erro ao conectar com a astróloga: ' +
                (error.error?.error || error.message)
            );
            this.cdr.markForCheck();
          },
        });
    }
  }

  // ✅ NOVO: Obter mensagens grátis restantes
  getFreeMessagesRemaining(): number {
    if (this.hasUserPaidForHoroscope) {
      return -1; // Ilimitado
    }
    return Math.max(0, this.FREE_MESSAGES_LIMIT - this.userMessageCount);
  }

  sendMessage(): void {
    if (this.currentMessage.trim() && !this.isLoading) {
      const message = this.currentMessage.trim();

      // Calcular o próximo número de mensagem
      const nextMessageCount = this.userMessageCount + 1;

      console.log(
        `📊 Horóscopo - Mensagem #${nextMessageCount}, Premium: ${this.hasUserPaidForHoroscope}, Limite: ${this.FREE_MESSAGES_LIMIT}`
      );

      // ✅ Verificar acesso
      const canSendMessage =
        this.hasUserPaidForHoroscope ||
        this.hasFreeHoroscopeConsultationsAvailable() ||
        nextMessageCount <= this.FREE_MESSAGES_LIMIT;

      if (!canSendMessage) {
        console.log('❌ Sem acesso - mostrando modal de pagamento');

        // Fechar outros modais
        this.showFortuneWheel = false;
        this.showPaymentModal = false;

        // Guardar mensagem pendente
        sessionStorage.setItem('pendingHoroscopeMessage', message);
        this.saveHoroscopeStateBeforePayment();

        // Mostrar modal de dados
        setTimeout(() => {
          this.showDataModal = true;
          this.cdr.markForCheck();
        }, 100);

        return;
      }

      // ✅ Se usa consulta grátis da roleta (depois das 3 grátis)
      if (
        !this.hasUserPaidForHoroscope &&
        nextMessageCount > this.FREE_MESSAGES_LIMIT &&
        this.hasFreeHoroscopeConsultationsAvailable()
      ) {
        this.useFreeHoroscopeConsultation();
      }

      // Processar mensagem normalmente
      this.processHoroscopeUserMessage(message, nextMessageCount);
    }
  }
  private processHoroscopeUserMessage(
    message: string,
    messageCount: number
  ): void {
    this.currentMessage = '';
    this.isLoading = true;
    this.isTyping = true;
    this.cdr.markForCheck(); // ✅ Detectar mudanças de estado

    // Adicionar mensagem do usuário
    this.addMessage('user', message);

    // ✅ Atualizar contador
    this.userMessageCount = messageCount;
    sessionStorage.setItem(
      'horoscopeUserMessageCount',
      this.userMessageCount.toString()
    );

    const formData = this.userForm.value;
    const consultationData = {
      zodiacData: {
        name: 'Astróloga Maria',
        specialty: 'Astrologia Ocidental e Horóscopo Personalizado',
        experience: 'Décadas de experiência em interpretação astrológica',
      },
      userMessage: message,
      fullName: formData.fullName,
      birthYear: formData.birthYear?.toString(),
      birthDate: formData.birthDate,
      conversationHistory: this.conversationHistory,
    };

    // ✅ Chamar o serviço com contador de mensagens
    this.zodiacoChinoService
      .chatWithMasterWithCount(
        consultationData,
        messageCount,
        this.hasUserPaidForHoroscope
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.isTyping = false;
          this.cdr.markForCheck(); // ✅ Detectar fim de loading

          if (response.success && response.response) {
            const messageId = Date.now().toString();

            this.addMessage('master', response.response, messageId);

            // ✅ Mostrar paywall se superou o limite gratuito E não tem consultas da roleta
            const shouldShowPaywall =
              !this.hasUserPaidForHoroscope &&
              messageCount > this.FREE_MESSAGES_LIMIT &&
              !this.hasFreeHoroscopeConsultationsAvailable();

            if (shouldShowPaywall) {
              this.blockedMessageId = messageId;
              sessionStorage.setItem('horoscopeBlockedMessageId', messageId);

              setTimeout(() => {
                this.saveHoroscopeStateBeforePayment();

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

            this.saveHoroscopeMessagesToSession();
            this.cdr.markForCheck();
          } else {
            this.handleError('Erro na resposta da astróloga');
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.isTyping = false;
          this.handleError(
            'Erro ao conectar com a astróloga: ' +
              (error.error?.error || error.message)
          );
          this.cdr.markForCheck();
        },
      });
  }

  // Gerenciar tecla Enter
  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Alternar formulário
  toggleDataForm(): void {
    this.showDataForm = !this.showDataForm;
  }

  // Reiniciar consulta
  resetConsultation(): void {
    this.conversationHistory = [];
    this.isFormCompleted = false;
    this.showDataForm = true;
    this.currentMessage = '';
    this.zodiacAnimal = {};
    this.blockedMessageId = null;

    // ✅ Resetar contador
    if (!this.hasUserPaidForHoroscope) {
      this.userMessageCount = 0;
      this.clearHoroscopeSessionData();
    } else {
      sessionStorage.removeItem('horoscopeMessages');
      sessionStorage.removeItem('horoscopeBlockedMessageId');
      sessionStorage.removeItem('horoscopeUserMessageCount');
      this.userMessageCount = 0;
    }

    this.userForm.reset({
      fullName: '',
      birthYear: '',
      birthDate: '',
      initialQuestion:
        'O que você pode me dizer sobre meu signo zodiacal e horóscopo?',
    });
    this.initializeHoroscopeWelcomeMessage();
  }

  // Explorar compatibilidade
  exploreCompatibility(): void {
    const message =
      'Você poderia falar sobre a compatibilidade do meu signo zodiacal com outros signos?';
    this.currentMessage = message;
    this.sendMessage();
  }

  // Explorar elementos
  exploreElements(): void {
    const message =
      'Como os planetas influenciam minha personalidade e destino?';
    this.currentMessage = message;
    this.sendMessage();
  }

  // Métodos auxiliares
  private addMessage(
    role: 'user' | 'master',
    message: string,
    id?: string
  ): void {
    const newMessage: ChatMessage = {
      role,
      message,
      timestamp: new Date().toISOString(),
      id: id || undefined,
    };
    this.conversationHistory.push(newMessage);
    this.shouldScrollToBottom = true;
    this.saveHoroscopeMessagesToSession();
    this.cdr.markForCheck(); // ✅ CRÍTICO: Detectar mudanças nas mensagens
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      try {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      } catch (err) {}
    }
  }

  private handleError(message: string): void {
    this.addMessage(
      'master',
      `Desculpe, ${message}. Por favor, tente novamente.`
    );
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

  formatTime(timestamp?: string): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return `${message.role}-${message.timestamp}-${index}`;
  }

  // Auto-resize do textarea
  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  // Gerenciar tecla Enter
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Limpar chat
  clearChat(): void {
    this.conversationHistory = [];
    this.currentMessage = '';
    this.blockedMessageId = null;
    this.isLoading = false;

    // ✅ Resetar contador
    if (!this.hasUserPaidForHoroscope) {
      this.userMessageCount = 0;
      sessionStorage.removeItem('horoscopeMessages');
      sessionStorage.removeItem('horoscopeBlockedMessageId');
      sessionStorage.removeItem('horoscopeUserMessageCount');
      sessionStorage.removeItem('freeHoroscopeConsultations');
      sessionStorage.removeItem('pendingHoroscopeMessage');
    } else {
      sessionStorage.removeItem('horoscopeMessages');
      sessionStorage.removeItem('horoscopeBlockedMessageId');
      sessionStorage.removeItem('horoscopeUserMessageCount');
      this.userMessageCount = 0;
    }

    this.shouldScrollToBottom = true;
    this.initializeHoroscopeWelcomeMessage();
  }
  resetChat(): void {
    // 1. Reset de arrays e mensagens
    this.conversationHistory = [];
    this.currentMessage = '';

    // 2. Reset de estados de carregamento e typing
    this.isLoading = false;
    this.isTyping = false;

    // 3. Reset de estados de formulário
    this.isFormCompleted = false;
    this.showDataForm = true;

    // 4. Reset de estados de pagamento e bloqueio
    this.blockedMessageId = null;

    // 5. Reset de modais
    this.showPaymentModal = false;
    this.showDataModal = false;
    this.showFortuneWheel = false;

    // 6. Reset de variáveis de scroll e contadores
    this.shouldScrollToBottom = false;
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    // 7. Reset do zodiac animal
    this.zodiacAnimal = {};

    // 8. ✅ PayPal não requer cleanup de elementos
    this.isProcessingPayment = false;
    this.paymentError = null;

    // 9. Limpar timers
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }

    // 10. ✅ Resetar contador e limpar sessionStorage
    if (!this.hasUserPaidForHoroscope) {
      this.userMessageCount = 0;
      sessionStorage.removeItem('horoscopeMessages');
      sessionStorage.removeItem('horoscopeBlockedMessageId');
      sessionStorage.removeItem('horoscopeUserMessageCount');
      sessionStorage.removeItem('freeHoroscopeConsultations');
      sessionStorage.removeItem('pendingHoroscopeMessage');
    } else {
      sessionStorage.removeItem('horoscopeMessages');
      sessionStorage.removeItem('horoscopeBlockedMessageId');
      sessionStorage.removeItem('horoscopeUserMessageCount');
      this.userMessageCount = 0;
    }
    // NÃO limpar 'userData' nem 'hasUserPaidForHoroscope'

    // 11. Reset do formulário
    this.userForm.reset({
      fullName: '',
      birthYear: '',
      birthDate: '',
      initialQuestion:
        'O que você pode me dizer sobre meu signo zodiacal e horóscopo?',
    });

    // 12. Reinicializar mensagem de boas-vindas
    this.initializeHoroscopeWelcomeMessage();
    this.cdr.markForCheck();
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
        this.promptForHoroscopePayment();
      },
      error: (error) => {
        this.promptForHoroscopePayment();
      },
    });
  }
  onDataModalClosed(): void {
    this.showDataModal = false;
    this.cdr.markForCheck();
  }
  showHoroscopeWheelAfterDelay(delayMs: number = 3000): void {
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
        this.cdr.markForCheck(); // ✅ Forçar detecção de mudanças
      } else {
      }
    }, delayMs);
  }

  onPrizeWon(prize: Prize): void {
    const prizeMessage: ChatMessage = {
      role: 'master',
      message: `🔮 As estrelas conspiraram a seu favor! Você ganhou: **${prize.name}** ${prize.icon}\n\nAs forças celestiais decidiram abençoá-lo com este presente sagrado. A energia do signo zodiacal flui através de você, revelando segredos mais profundos do seu horóscopo pessoal. Que a sabedoria astrológica o ilumine!`,
      timestamp: new Date().toISOString(),
    };

    this.conversationHistory.push(prizeMessage);
    this.shouldScrollToBottom = true;
    this.saveHoroscopeMessagesToSession();

    this.processHoroscopePrize(prize);
  }

  onWheelClosed(): void {
    this.showFortuneWheel = false;
  }

  triggerHoroscopeWheel(): void {
    if (this.showPaymentModal || this.showDataModal) {
      return;
    }

    if (FortuneWheelComponent.canShowWheel()) {
      this.showFortuneWheel = true;
      this.cdr.markForCheck(); // ✅ Forçar detecção de mudanças
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

  private processHoroscopePrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Leituras Horoscópicas
        this.addFreeHoroscopeConsultations(3);
        break;
      case '2': // 1 Análise Premium - ACESSO COMPLETO
        this.hasUserPaidForHoroscope = true;
        sessionStorage.setItem('hasUserPaidForHoroscope', 'true');

        // Desbloquear qualquer mensagem bloqueada
        if (this.blockedMessageId) {
          this.blockedMessageId = null;
          sessionStorage.removeItem('horoscopeBlockedMessageId');
        }

        // Adicionar mensagem especial para este prêmio
        const premiumMessage: ChatMessage = {
          role: 'master',
          message:
            '🌟 **Você desbloqueou o acesso Premium completo!** 🌟\n\nAs estrelas sorriram excepcionalmente para você. Agora você tem acesso ilimitado a toda minha sabedoria astrológica. Pode consultar seu horóscopo, compatibilidade, previsões e todos os segredos celestiais quantas vezes desejar.\n\n✨ *O universo abriu todas as portas para você* ✨',
          timestamp: new Date().toISOString(),
        };
        this.conversationHistory.push(premiumMessage);
        this.shouldScrollToBottom = true;
        this.saveHoroscopeMessagesToSession();
        break;
      case '4': // Outra oportunidade
        break;
      default:
    }
  }

  private addFreeHoroscopeConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeHoroscopeConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeHoroscopeConsultations', newTotal.toString());

    if (this.blockedMessageId && !this.hasUserPaidForHoroscope) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('horoscopeBlockedMessageId');
    }
  }

  private hasFreeHoroscopeConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeHoroscopeConsultations') || '0'
    );
    return freeConsultations > 0;
  }

  private useFreeHoroscopeConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeHoroscopeConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem(
        'freeHoroscopeConsultations',
        remaining.toString()
      );

      const prizeMsg: ChatMessage = {
        role: 'master',
        message: `✨ *Você utilizou uma leitura astrológica gratuita* ✨\n\nVocê ainda tem **${remaining}** consultas astrológicas disponíveis.`,
        timestamp: new Date().toISOString(),
      };
      this.conversationHistory.push(prizeMsg);
      this.shouldScrollToBottom = true;
      this.saveHoroscopeMessagesToSession();
    }
  }

  debugHoroscopeWheel(): void {
    this.showFortuneWheel = true;
    this.cdr.markForCheck(); // ✅ Forçar detecção de mudanças
  }

  // ✅ MÉTODO AUXILIAR para o template
  getHoroscopeConsultationsCount(): number {
    return parseInt(
      sessionStorage.getItem('freeHoroscopeConsultations') || '0'
    );
  }
}
