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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatStepperModule } from '@angular/material/stepper';
import {
  MapaVocacionalService,
  VocationalResponse,
} from '../../services/mapa-vocacional.service';
import { PaypalService } from '../../services/paypal.service';
import { HttpClient } from '@angular/common/http';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import { environment } from '../../environments/environmets.prod';
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';

interface ChatMessage {
  sender: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  id?: string;
  freeMessagesRemaining?: number;
  showPaywall?: boolean;
  isCompleteResponse?: boolean;
  isPrizeAnnouncement?: boolean;
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

interface PersonalInfo {
  age?: number;
  currentEducation?: string;
  workExperience?: string;
  interests?: string[];
}

interface VocationalProfile {
  name: string;
  description: string;
  characteristics: string[];
  workEnvironments: string[];
}

@Component({
  selector: 'app-mapa-vocacional',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatRadioModule,
    MatStepperModule,
    MatProgressBarModule,
    RecolectaDatosComponent,
  ],
  templateUrl: './mapa-vocacional.component.html',
  styleUrl: './mapa-vocacional.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapaVocacionalComponent
  implements OnInit, OnDestroy, AfterViewChecked, AfterViewInit
{
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  // Info da conselheira
  counselorInfo = {
    name: 'Dra. Valeria',
    title: 'Especialista em Orientação Profissional',
    specialty: 'Orientação profissional e mapa de carreira personalizado',
  };

  // Dados para enviar
  showDataModal: boolean = false;
  userData: any = null;

  // Estado de abas
  currentTab: 'chat' | 'assessment' | 'results' = 'chat';

  // Chat
  chatMessages: ChatMessage[] = [];
  currentMessage: string = '';
  isLoading: boolean = false;

  // Variáveis para auto-scroll
  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  // Variáveis para controle de pagamentos com PayPal
  showPaymentModal: boolean = false;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForVocational: boolean = false;
  blockedMessageId: string | null = null;

  // ✅ NOVO: Sistema de 3 mensagens grátis
  private userMessageCount: number = 0;
  private readonly FREE_MESSAGES_LIMIT = 3;

  // Variáveis para a roleta
  showFortuneWheel: boolean = false;
  vocationalPrizes: Prize[] = [
    {
      id: '1',
      name: '3 consultas gratuitas',
      color: '#4ecdc4',
      icon: '🎯',
    },
    {
      id: '2',
      name: '1 Análise Premium de Carreira',
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

  // Dados pessoais
  showPersonalForm: boolean = false;
  personalInfo: PersonalInfo = {};

  // Assessment
  assessmentQuestions: AssessmentQuestion[] = [];
  currentQuestionIndex: number = 0;
  selectedOption: string = '';
  assessmentAnswers: AssessmentAnswer[] = [];
  assessmentProgress: number = 0;
  hasAssessmentResults: boolean = false;
  assessmentResults: any = null;

  constructor(
    private vocationalService: MapaVocacionalService,
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
    this.hasUserPaidForVocational =
      sessionStorage.getItem('hasUserPaidForVocational_berufskarte') === 'true';

    // ✅ NOVO: Carregar contador de mensagens
    const savedMessageCount = sessionStorage.getItem(
      'vocationalUserMessageCount'
    );
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
          this.hasUserPaidForVocational = true;
          sessionStorage.setItem(
            'hasUserPaidForVocational_berufskarte',
            'true'
          );
          localStorage.removeItem('paypal_payment_completed');

          this.blockedMessageId = null;
          sessionStorage.removeItem('vocationalBlockedMessageId');

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
            this.addMessage({
              sender: this.counselorInfo.name,
              content:
                '🎉 Pagamento concluído com sucesso!\n\n' +
                '✨ Obrigada pelo seu pagamento. Agora você tem acesso completo ao Mapa de Carreira.\n\n' +
                '💼 Vamos descobrir juntos o seu futuro profissional!\n\n' +
                '📌 Nota: Este pagamento é válido apenas para o serviço de Mapa de Carreira.',
              timestamp: new Date(),
              isUser: false,
            });
            this.cdr.detectChanges();
            setTimeout(() => {
              this.scrollToBottom();
              this.cdr.markForCheck();
            }, 200);
          }, 1000);
        } else {
          this.paymentError = 'Não foi possível verificar o pagamento.';
          setTimeout(() => {
            this.addMessage({
              sender: this.counselorInfo.name,
              content:
                '⚠️ Houve um problema ao verificar seu pagamento. Por favor, tente novamente ou entre em contato com nosso suporte.',
              timestamp: new Date(),
              isUser: false,
            });
            this.cdr.detectChanges();
          }, 800);
        }
      } catch (error) {
        console.error('Erro verificando pagamento do PayPal:', error);
        this.paymentError = 'Erro na verificação do pagamento';
        setTimeout(() => {
          this.addMessage({
            sender: this.counselorInfo.name,
            content:
              '❌ Infelizmente, ocorreu um erro ao verificar seu pagamento. Por favor, tente novamente mais tarde.',
            timestamp: new Date(),
            isUser: false,
          });
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
    const savedMessages = sessionStorage.getItem('vocationalMessages');
    const savedBlockedMessageId = sessionStorage.getItem(
      'vocationalBlockedMessageId'
    );

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.chatMessages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        this.blockedMessageId = savedBlockedMessageId || null;
      } catch (error) {
        console.error('Erro parseando mensagens:', error);
      }
    }

    // Só adicionar mensagem de boas-vindas se não houver mensagens salvas
    if (this.chatMessages.length === 0) {
      this.initializeWelcomeMessage();
    }

    this.loadAssessmentQuestions();

    if (this.chatMessages.length > 0 && FortuneWheelComponent.canShowWheel()) {
      this.showWheelAfterDelay(2000);
    }
  }

  // ✅ NOVO: Obter mensagens grátis restantes
  getFreeMessagesRemaining(): number {
    if (this.hasUserPaidForVocational) {
      return -1; // Ilimitado
    }
    return Math.max(0, this.FREE_MESSAGES_LIMIT - this.userMessageCount);
  }

  ngAfterViewChecked(): void {
    if (
      this.shouldAutoScroll &&
      this.chatMessages.length > this.lastMessageCount
    ) {
      this.scrollToBottom();
      this.lastMessageCount = this.chatMessages.length;
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

  initializeWelcomeMessage(): void {
    this.addMessage({
      sender: this.counselorInfo.name,
      content: `Olá! Sou ${this.counselorInfo.name}, sua especialista em Orientação Profissional. Estou aqui para ajudá-lo a descobrir sua verdadeira vocação e criar um mapa de carreira personalizado para você.`,
      timestamp: new Date(),
      isUser: false,
    });
    if (FortuneWheelComponent.canShowWheel()) {
      this.showWheelAfterDelay(3000);
    }
  }

  switchTab(tab: 'chat' | 'assessment' | 'results'): void {
    this.currentTab = tab;
  }

  // ✅ MODIFICADO: sendMessage() com sistema de 3 mensagens grátis
  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) return;

    const userMessage = this.currentMessage.trim();

    // Calcular o próximo número de mensagem
    const nextMessageCount = this.userMessageCount + 1;

    console.log(
      `📊 Vocacional - Mensagem #${nextMessageCount}, Premium: ${this.hasUserPaidForVocational}, Limite: ${this.FREE_MESSAGES_LIMIT}`
    );

    // ✅ Verificar acesso
    const canSendMessage =
      this.hasUserPaidForVocational ||
      this.hasFreeVocationalConsultationsAvailable() ||
      nextMessageCount <= this.FREE_MESSAGES_LIMIT;

    if (!canSendMessage) {
      console.log('❌ Sem acesso - mostrando modal de pagamento');

      // Fechar outros modais
      this.showFortuneWheel = false;
      this.showPaymentModal = false;

      // Guardar mensagem pendente
      sessionStorage.setItem('pendingVocationalMessage', userMessage);
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
      !this.hasUserPaidForVocational &&
      nextMessageCount > this.FREE_MESSAGES_LIMIT &&
      this.hasFreeVocationalConsultationsAvailable()
    ) {
      this.useFreeVocationalConsultation();
    }

    this.shouldAutoScroll = true;
    this.processUserMessage(userMessage, nextMessageCount);
  }

  private saveStateBeforePayment(): void {
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'vocationalUserMessageCount',
      this.userMessageCount.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'vocationalBlockedMessageId',
        this.blockedMessageId
      );
    }
  }

  // ✅ MODIFICADO: processUserMessage() para enviar messageCount ao backend
  private processUserMessage(userMessage: string, messageCount: number): void {
    this.addMessage({
      sender: 'Você',
      content: userMessage,
      timestamp: new Date(),
      isUser: true,
    });

    // ✅ Atualizar contador
    this.userMessageCount = messageCount;
    sessionStorage.setItem(
      'vocationalUserMessageCount',
      this.userMessageCount.toString()
    );

    this.currentMessage = '';
    this.isLoading = true;
    this.cdr.markForCheck();

    // Preparar histórico de conversação
    const conversationHistory = this.chatMessages
      .filter((msg) => msg.content && !msg.isPrizeAnnouncement)
      .slice(-10)
      .map((msg) => ({
        role: msg.isUser ? ('user' as const) : ('counselor' as const),
        message: msg.content,
      }));

    // ✅ Usar o novo método com messageCount
    this.vocationalService
      .sendMessageWithCount(
        userMessage,
        messageCount,
        this.hasUserPaidForVocational,
        this.personalInfo,
        this.assessmentAnswers,
        conversationHistory
      )
      .subscribe({
        next: (response: VocationalResponse) => {
          this.isLoading = false;

          if (response.success && response.response) {
            const messageId = Date.now().toString();

            this.addMessage({
              sender: this.counselorInfo.name,
              content: response.response,
              timestamp: new Date(),
              isUser: false,
              id: messageId,
              freeMessagesRemaining: response.freeMessagesRemaining,
              showPaywall: response.showPaywall,
              isCompleteResponse: response.isCompleteResponse,
            });

            console.log(
              `📊 Resposta - Mensagens restantes: ${response.freeMessagesRemaining}, Paywall: ${response.showPaywall}, Completa: ${response.isCompleteResponse}`
            );

            // ✅ Mostrar paywall se o backend indicar
            if (response.showPaywall && !this.hasUserPaidForVocational) {
              this.blockedMessageId = messageId;
              sessionStorage.setItem('vocationalBlockedMessageId', messageId);

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
            this.addMessage({
              sender: this.counselorInfo.name,
              content:
                response.error ||
                'Desculpe, estou passando por dificuldades técnicas. Poderia reformular sua pergunta?',
              timestamp: new Date(),
              isUser: false,
            });
            this.saveMessagesToSession();
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Erro na resposta:', error);
          this.addMessage({
            sender: this.counselorInfo.name,
            content:
              'Desculpe, estou passando por dificuldades técnicas. Poderia reformular sua pergunta?',
            timestamp: new Date(),
            isUser: false,
          });
          this.saveMessagesToSession();
          this.cdr.markForCheck();
        },
      });
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
        'vocationalMessages',
        JSON.stringify(messagesToSave)
      );
    } catch (error) {
      console.error('Erro salvando mensagens:', error);
    }
  }

  isMessageBlocked(message: ChatMessage): boolean {
    return (
      message.id === this.blockedMessageId && !this.hasUserPaidForVocational
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

    if (this.currentMessage) {
      sessionStorage.setItem('pendingVocationalMessage', this.currentMessage);
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
      }
    }, delayMs);
  }

  onPrizeWon(prize: Prize): void {
    const prizeMessage: ChatMessage = {
      sender: this.counselorInfo.name,
      content: `🎯 Excelente! O destino profissional o abençoou. Você ganhou: **${prize.name}** ${prize.icon}\n\nEste presente do universo profissional foi ativado para você. As oportunidades de carreira se alinham a seu favor. Que esta fortuna o guie para sua verdadeira vocação!`,
      timestamp: new Date(),
      isUser: false,
      isPrizeAnnouncement: true,
    };

    this.chatMessages.push(prizeMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();

    this.processVocationalPrize(prize);
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

  private processVocationalPrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Sessões Grátis
        this.addFreeVocationalConsultations(3);
        break;
      case '2': // 1 Análise Premium - ACESSO COMPLETO
        this.hasUserPaidForVocational = true;
        sessionStorage.setItem('hasUserPaidForVocational_berufskarte', 'true');

        if (this.blockedMessageId) {
          this.blockedMessageId = null;
          sessionStorage.removeItem('vocationalBlockedMessageId');
        }

        const premiumMessage: ChatMessage = {
          sender: this.counselorInfo.name,
          content:
            '✨ **Você desbloqueou o acesso Premium completo!** ✨\n\nO destino profissional sorriu para você de maneira extraordinária. Agora você tem acesso ilimitado a toda minha experiência em orientação profissional. Pode consultar sobre sua vocação, avaliações de carreira e todos os aspectos do seu futuro profissional quantas vezes desejar.\n\n🎯 *As portas do seu caminho profissional foram completamente abertas* 🎯',
          timestamp: new Date(),
          isUser: false,
        };
        this.chatMessages.push(premiumMessage);
        this.shouldAutoScroll = true;
        this.saveMessagesToSession();
        break;
      case '4': // Outra oportunidade
        break;
      default:
    }
  }

  private addFreeVocationalConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeVocationalConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeVocationalConsultations', newTotal.toString());

    if (this.blockedMessageId && !this.hasUserPaidForVocational) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('vocationalBlockedMessageId');
    }

    // Mensagem informativa
    const infoMessage: ChatMessage = {
      sender: this.counselorInfo.name,
      content: `✨ *Você recebeu ${count} consultas vocacionais gratuitas* ✨\n\nAgora você tem **${newTotal}** consultas disponíveis para explorar seu futuro profissional.`,
      timestamp: new Date(),
      isUser: false,
    };
    this.chatMessages.push(infoMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();
  }

  private hasFreeVocationalConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeVocationalConsultations') || '0'
    );
    return freeConsultations > 0;
  }

  private useFreeVocationalConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeVocationalConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem(
        'freeVocationalConsultations',
        remaining.toString()
      );

      const prizeMsg: ChatMessage = {
        sender: this.counselorInfo.name,
        content: `✨ *Você utilizou uma consulta gratuita* ✨\n\nVocê ainda tem **${remaining}** consultas gratuitas disponíveis.`,
        timestamp: new Date(),
        isUser: false,
      };
      this.chatMessages.push(prizeMsg);
      this.shouldAutoScroll = true;
      this.saveMessagesToSession();
    }
  }

  async handlePaymentSubmit(): Promise<void> {
    this.isProcessingPayment = true;
    this.paymentError = null;
    this.cdr.markForCheck();

    try {
      const orderData = {
        amount: '4.00',
        currency: 'EUR',
        serviceName: 'Mapa Vocacional',
        returnPath: '/mapa-vocacional',
        cancelPath: '/mapa-vocacional',
      };

      await this.paypalService.initiatePayment(orderData);
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

  addMessage(message: ChatMessage): void {
    this.chatMessages.push(message);
    this.shouldAutoScroll = true;
    setTimeout(() => this.scrollToBottom(), 100);
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

  togglePersonalForm(): void {
    this.showPersonalForm = !this.showPersonalForm;
  }

  savePersonalInfo(): void {
    this.showPersonalForm = false;

    if (Object.keys(this.personalInfo).length > 0) {
      this.addMessage({
        sender: this.counselorInfo.name,
        content: `Perfeito, registrei suas informações pessoais. Isso me ajudará a fornecer uma orientação mais precisa e personalizada. Há algo específico sobre seu futuro profissional que o preocupa ou entusiasma?`,
        timestamp: new Date(),
        isUser: false,
      });
    }
  }

  loadAssessmentQuestions(): void {
    this.vocationalService.getAssessmentQuestions().subscribe({
      next: (questions) => {
        this.assessmentQuestions = questions;
        this.updateProgress();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erro carregando perguntas:', error);
        this.cdr.markForCheck();
      },
    });
  }

  get currentQuestion(): AssessmentQuestion | null {
    return this.assessmentQuestions[this.currentQuestionIndex] || null;
  }

  selectOption(option: any): void {
    this.selectedOption = option.value;
  }

  nextQuestion(): void {
    if (this.selectedOption && this.currentQuestion) {
      this.assessmentAnswers[this.currentQuestionIndex] = {
        question: this.currentQuestion.question,
        answer: this.selectedOption,
        category:
          this.currentQuestion.options.find(
            (o: any) => o.value === this.selectedOption
          )?.category || '',
      };

      this.currentQuestionIndex++;
      this.selectedOption = '';
      this.updateProgress();
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      const savedAnswer = this.assessmentAnswers[this.currentQuestionIndex];
      this.selectedOption = savedAnswer ? savedAnswer.answer : '';
      this.updateProgress();
    }
  }

  updateProgress(): void {
    if (this.assessmentQuestions.length > 0) {
      this.assessmentProgress =
        ((this.currentQuestionIndex + 1) / this.assessmentQuestions.length) *
        100;
    }
  }

  finishAssessment(): void {
    if (this.selectedOption && this.currentQuestion) {
      this.assessmentAnswers[this.currentQuestionIndex] = {
        question: this.currentQuestion.question,
        answer: this.selectedOption,
        category:
          this.currentQuestion.options.find(
            (o: any) => o.value === this.selectedOption
          )?.category || '',
      };

      this.analyzeResults();
    }
  }

  analyzeResults(): void {
    this.vocationalService.analyzeAssessment(this.assessmentAnswers).subscribe({
      next: (results) => {
        this.assessmentResults = results;
        this.hasAssessmentResults = true;
        this.switchTab('results');
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erro analisando resultados:', error);
        this.cdr.markForCheck();
      },
    });
  }

  startNewAssessment(): void {
    this.currentQuestionIndex = 0;
    this.selectedOption = '';
    this.assessmentAnswers = [];
    this.assessmentProgress = 0;
    this.assessmentResults = null;
    this.hasAssessmentResults = false;
    this.updateProgress();
    this.switchTab('assessment');
  }

  getCategoryEmoji(category: string): string {
    return this.vocationalService.getCategoryEmoji(category);
  }

  getCategoryColor(category: string): string {
    return this.vocationalService.getCategoryColor(category);
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        const element = this.chatContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {}
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
    this.http.post(`${environment.apiUrl}api/recolecta`, userData).subscribe({
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

  // ✅ MODIFICADO: resetChat() incluindo contador
  resetChat(): void {
    this.chatMessages = [];
    this.currentMessage = '';
    this.isLoading = false;
    this.blockedMessageId = null;

    // ✅ Resetar contador de mensagens
    this.userMessageCount = 0;

    this.showPaymentModal = false;
    this.showDataModal = false;
    this.showFortuneWheel = false;
    this.showPersonalForm = false;

    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    this.currentQuestionIndex = 0;
    this.selectedOption = '';
    this.assessmentAnswers = [];
    this.assessmentProgress = 0;
    this.assessmentResults = null;
    this.hasAssessmentResults = false;

    this.personalInfo = {};

    this.isProcessingPayment = false;
    this.paymentError = null;

    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }

    // ✅ Limpar sessionStorage incluindo contador
    sessionStorage.removeItem('vocationalMessages');
    sessionStorage.removeItem('vocationalBlockedMessageId');
    sessionStorage.removeItem('vocationalUserMessageCount');
    sessionStorage.removeItem('pendingVocationalMessage');
    sessionStorage.removeItem('freeVocationalConsultations');

    this.currentTab = 'chat';

    this.initializeWelcomeMessage();
    this.cdr.markForCheck();
  }
}
