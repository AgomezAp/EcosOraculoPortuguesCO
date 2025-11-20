import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
export interface Prize {
  id: string;
  name: string;
  color: string;
  textColor?: string;
  icon?: string;
}

@Component({
  selector: 'app-fortune-wheel',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './fortune-wheel.component.html',
  styleUrl: './fortune-wheel.component.css',
})
export class FortuneWheelComponent implements OnInit, OnDestroy {
  @Input() isVisible: boolean = false;
  @Input() prizes: Prize[] = [
    { id: '1', name: '3 Tiradas Grátis', color: '#4ecdc4', icon: '🎲' },
    { id: '2', name: '1 Consulta premium', color: '#45b7d1', icon: '🔮' },
    { id: '4', name: 'Tente novamente!', color: '#ff7675', icon: '🔄' },
  ];

  @Output() onPrizeWon = new EventEmitter<Prize>();
  @Output() onWheelClosed = new EventEmitter<void>();

  @ViewChild('wheelElement') wheelElement!: ElementRef;

  // ✅ PROPRIEDADES PARA A ROLETA
  segmentAngle: number = 0;
  currentRotation: number = 0;
  isSpinning: boolean = false;
  selectedPrize: Prize | null = null;
  wheelSpinning: boolean = false;

  // ✅ CONTROLE DE ESTADO MELHORADO
  canSpinWheel: boolean = true;
  isProcessingClick: boolean = false; // ✅ NOVO: Prevenir múltiplos cliques
  hasUsedDailyFreeSpIn: boolean = false;
  nextFreeSpinTime: Date | null = null;
  spinCooldownTimer: any;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.segmentAngle = 360 / this.prizes.length;
    this.checkSpinAvailability();
    this.startSpinCooldownTimer();
  }

  ngOnDestroy(): void {
    if (this.spinCooldownTimer) {
      clearInterval(this.spinCooldownTimer);
    }
  }
  get currentWheelSpins(): number {
    return this.getWheelSpinsCount();
  }
  // ✅ MÉTODO PRINCIPAL PARA VERIFICAR SE PODE MOSTRAR A ROLETA
  static canShowWheel(): boolean {
    const wheelSpins = parseInt(sessionStorage.getItem('wheelSpins') || '0');
    const lastSpinDate = sessionStorage.getItem('lastWheelSpinDate');
    const today = new Date().toDateString();

    // Tem tiradas extra para a roleta
    if (wheelSpins > 0) {
      return true;
    }

    // Usuário novo (não girou nunca)
    if (!lastSpinDate) {
      return true;
    }

    // Já usou seu giro diário gratuito
    if (lastSpinDate === today) {
      return false;
    }

    // Novo dia - pode usar giro gratuito
    return true;
  }

  // ✅ MÉTODO ESTÁTICO PARA VERIFICAR DESDE OUTROS COMPONENTES
  static getSpinStatus(): string {
    const wheelSpins = parseInt(sessionStorage.getItem('wheelSpins') || '0');
    const lastSpinDate = sessionStorage.getItem('lastWheelSpinDate');
    const today = new Date().toDateString();

    if (wheelSpins > 0) {
      return `${wheelSpins} tiradas de roleta disponíveis`;
    }

    if (!lastSpinDate) {
      return 'Tirada gratuita disponível';
    }

    if (lastSpinDate !== today) {
      return 'Tirada diária disponível';
    }

    return 'Sem tiradas disponíveis hoje';
  }

  // ✅ VERIFICAR DISPONIBILIDADE DE TIRADAS
  checkSpinAvailability(): void {
    const lastSpinDate = sessionStorage.getItem('lastWheelSpinDate');
    const today = new Date().toDateString();
    const wheelSpins = this.getWheelSpinsCount();

    if (!lastSpinDate) {
      // Usuário novo - primeira vez
      this.canSpinWheel = true;
      this.hasUsedDailyFreeSpIn = false;
      return;
    }

    // Verificar se já usou tirada diária hoje
    if (lastSpinDate === today) {
      this.hasUsedDailyFreeSpIn = true;
      // Só pode girar se tem tiradas extra
      this.canSpinWheel = wheelSpins > 0;
    } else {
      // Novo dia - pode usar tirada gratuita
      this.hasUsedDailyFreeSpIn = false;
      this.canSpinWheel = true;
    }
  }

  async spinWheel() {
    // ✅ VALIDAÇÕES ESTRITAS
    if (this.isProcessingClick) {
      return;
    }

    if (!this.canSpinWheel || this.wheelSpinning || this.isSpinning) {
      return;
    }

    // ✅ BLOQUEAR IMEDIATAMENTE
    this.isProcessingClick = true;

    // ✅ MOSTRAR ESTADO ANTES DO GIRO
    const wheelSpinsBefore = this.getWheelSpinsCount();
    const dreamConsultationsBefore = this.getDreamConsultationsCount();
    try {
      // ✅ ESTADOS DE BLOQUEIO
      this.wheelSpinning = true;
      this.isSpinning = true;
      this.canSpinWheel = false;
      this.selectedPrize = null;
      this.cdr.markForCheck(); // ✅ Detectar mudanças

      // ✅ USAR TIRADA IMEDIATAMENTE (ISTO DIMINUI O CONTADOR)
      this.handleSpinUsage();

      // ✅ VERIFICAR ESTADO DEPOIS DO USO
      const wheelSpinsAfter = this.getWheelSpinsCount();
      const wonPrize = this.determineWonPrize();

      // ✅ ANIMAÇÃO DE ROTAÇÃO
      const minSpins = 6;
      const maxSpins = 10;
      const randomSpins = Math.random() * (maxSpins - minSpins) + minSpins;
      const finalRotation = randomSpins * 360;

      // Aplicar rotação gradual
      this.currentRotation += finalRotation;
      await this.waitForAnimation(3000);

      // ✅ FINALIZAR ESTADOS DE ANIMAÇÃO
      this.wheelSpinning = false;
      this.isSpinning = false;
      this.selectedPrize = wonPrize;
      this.cdr.markForCheck(); // ✅ Detectar mudanças CRÍTICO

      // ✅ PROCESSAR PRÊMIO (ISTO PODE ADICIONAR MAIS TIRADAS/CONSULTAS)
      await this.processPrizeWon(wonPrize);

      // ✅ ESTADO DEPOIS DE PROCESSAR PRÊMIO
      const finalWheelSpins = this.getWheelSpinsCount();
      const finalDreamConsultations = this.getDreamConsultationsCount();

      // ✅ ATUALIZAR DISPONIBILIDADE BASEADA NO ESTADO FINAL
      this.updateSpinAvailabilityAfterPrize(wonPrize);

      // ✅ EMITIR EVENTO DO PRÊMIO
      this.onPrizeWon.emit(wonPrize);

      this.cdr.markForCheck(); // ✅ Detectar mudanças finais
    } catch (error) {
      // ✅ RESETEAR ESTADOS EM CASO DE ERRO
      this.wheelSpinning = false;
      this.isSpinning = false;
      this.selectedPrize = null;
      this.cdr.markForCheck(); // ✅ Detectar mudanças em erro

      // Restaurar disponibilidade
      this.checkSpinAvailability();
    } finally {
      // ✅ LIBERAR BLOQUEIO DEPOIS DE UM DELAY
      setTimeout(() => {
        this.isProcessingClick = false;

        // ✅ VERIFICAÇÃO FINAL DE DISPONIBILIDADE
        this.checkSpinAvailability();

        this.cdr.markForCheck(); // ✅ Detectar mudanças ao liberar
      }, 1000);
    }
  }
  private updateSpinAvailabilityAfterPrize(wonPrize: Prize): void {
    const wheelSpins = this.getWheelSpinsCount();
    const today = new Date().toDateString();
    const lastSpinDate = sessionStorage.getItem('lastWheelSpinDate');

    // ✅ LÓGICA DE DISPONIBILIDADE
    if (wheelSpins > 0) {
      // Tem tiradas extra disponíveis
      this.canSpinWheel = true;
    } else if (!this.hasUsedDailyFreeSpIn) {
      // Verificar se pode usar tirada diária (não deveria chegar aqui após usar uma)
      this.canSpinWheel = lastSpinDate !== today;
    } else {
      // Já usou sua tirada diária e não tem extra
      this.canSpinWheel = false;
    }
  }
  // ✅ FUNÇÃO AUXILIAR PARA ESPERAR
  private waitForAnimation(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  }

  private handleSpinUsage(): void {
    const wheelSpins = this.getWheelSpinsCount();
    const today = new Date().toDateString();
    const lastSpinDate = sessionStorage.getItem('lastWheelSpinDate');
    if (wheelSpins > 0) {
      // ✅ USAR TIRADA EXTRA DE ROLETA
      const newCount = wheelSpins - 1;
      sessionStorage.setItem('wheelSpins', newCount.toString());

      // ✅ ATUALIZAR IMEDIATAMENTE A DISPONIBILIDADE
      this.checkSpinAvailability();
    } else {
      // ✅ USAR TIRADA DIÁRIA GRATUITA
      sessionStorage.setItem('lastWheelSpinDate', today);
      sessionStorage.setItem('lastWheelSpinTime', Date.now().toString());
      this.hasUsedDailyFreeSpIn = true;
    }
  }

  // ✅ PROCESSAR PRÊMIO GANHO (MELHORADO)
  private async processPrizeWon(prize: Prize): Promise<void> {
    switch (prize.id) {
      case '1': // 3 Tiradas Grátis de Roleta
        this.grantWheelSpins(3);
        break;
      case '2': // 1 Consulta Grátis de Sonhos
        this.grantDreamConsultations(1);
        break;
      case '4': // Tente novamente
        this.grantRetryChance();
        break;
      default:
    }

    this.savePrizeToHistory(prize);
  }

  // ✅ CONCEDER TIRADAS DE ROLETA (SEPARADO)
  private grantWheelSpins(count: number): void {
    const currentSpins = this.getWheelSpinsCount();
    sessionStorage.setItem('wheelSpins', (currentSpins + count).toString());
  }

  // ✅ CONCEDER CONSULTAS DE SONHOS (SEPARADO)
  private grantDreamConsultations(count: number): void {
    const currentConsultations = parseInt(
      sessionStorage.getItem('dreamConsultations') || '0'
    );
    sessionStorage.setItem(
      'dreamConsultations',
      (currentConsultations + count).toString()
    );

    // Desbloquear mensagem se havia uma bloqueada
    const blockedMessageId = sessionStorage.getItem('blockedMessageId');
    const hasUserPaid =
      sessionStorage.getItem('hasUserPaidForDreams') === 'true';

    if (blockedMessageId && !hasUserPaid) {
      sessionStorage.removeItem('blockedMessageId');
    }
  }

  // ✅ CONCEDER OUTRA OPORTUNIDADE (NOVO)
  private grantRetryChance(): void {}
  shouldShowContinueButton(prize: Prize | null): boolean {
    if (!prize) return false;

    // Prêmios que concedem tiradas extra (não fechar modal)
    const spinsGrantingPrizes = ['1', '4']; // Só 3 tiradas e tente novamente
    return spinsGrantingPrizes.includes(prize.id);
  }
  shouldShowCloseButton(prize: Prize | null): boolean {
    if (!prize) return false;
    return prize.id === '2';
  }
  continueSpinning(): void {
    // ✅ RESETEAR ESTADO PARA PERMITIR OUTRA TIRADA
    this.selectedPrize = null;
    this.isProcessingClick = false;
    this.wheelSpinning = false;
    this.isSpinning = false;

    // ✅ VERIFICAR DISPONIBILIDADE ATUALIZADA
    this.checkSpinAvailability();

    this.cdr.markForCheck(); // ✅ Detectar mudanças
  }

  // ✅ MÉTODOS AUXILIARES ATUALIZADOS
  hasFreeSpinsAvailable(): boolean {
    return this.getWheelSpinsCount() > 0;
  }

  getWheelSpinsCount(): number {
    return parseInt(sessionStorage.getItem('wheelSpins') || '0');
  }

  getFreeSpinsCount(): number {
    // Manter compatibilidade com template
    return this.getWheelSpinsCount();
  }

  getDreamConsultationsCount(): number {
    return parseInt(sessionStorage.getItem('dreamConsultations') || '0');
  }

  getTimeUntilNextSpin(): string {
    if (!this.nextFreeSpinTime) return '';

    const now = new Date().getTime();
    const timeLeft = this.nextFreeSpinTime.getTime() - now;

    if (timeLeft <= 0) return '';

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  // ✅ DETERMINAR PRÊMIO (SEM MUDANÇAS)
  private determineWonPrize(): Prize {
    const random = Math.random();

    if (random < 0.2) {
      return this.prizes[0]; // 20% - 3 Tiradas Grátis
    } else if (random < 0.35) {
      return this.prizes[1]; // 15% - 1 Consulta Premium
    } else {
      return this.prizes[2]; // 65% - Tente novamente
    }
  }

  // ✅ SALVAR PRÊMIO NO HISTÓRICO
  private savePrizeToHistory(prize: Prize): void {
    const prizeHistory = JSON.parse(
      sessionStorage.getItem('prizeHistory') || '[]'
    );
    prizeHistory.push({
      prize: prize,
      timestamp: new Date().toISOString(),
      claimed: true,
    });
    sessionStorage.setItem('prizeHistory', JSON.stringify(prizeHistory));
  }

  // ✅ TIMER PARA COOLDOWN
  startSpinCooldownTimer(): void {
    if (this.spinCooldownTimer) {
      clearInterval(this.spinCooldownTimer);
    }

    if (this.nextFreeSpinTime && !this.canSpinWheel) {
      this.spinCooldownTimer = setInterval(() => {
        const now = new Date().getTime();
        const timeLeft = this.nextFreeSpinTime!.getTime() - now;

        if (timeLeft <= 0) {
          this.canSpinWheel = true;
          this.nextFreeSpinTime = null;
          clearInterval(this.spinCooldownTimer);
          this.cdr.markForCheck(); // ✅ Detectar mudanças quando termina cooldown
        }
      }, 1000);
    }
  }

  // ✅ FECHAR ROLETA
  closeWheel() {
    this.onWheelClosed.emit();
    this.resetWheel();
    this.cdr.markForCheck(); // ✅ Detectar mudanças ao fechar
  }

  // ✅ RESET WHEEL
  private resetWheel() {
    this.selectedPrize = null;
    this.wheelSpinning = false;
    this.isSpinning = false;
    this.isProcessingClick = false;
    this.cdr.markForCheck(); // ✅ Detectar mudanças ao resetear
  }

  // ✅ MÉTODO PARA FECHAR DESDE TEMPLATE
  onWheelClosedHandler() {
    this.closeWheel();
  }
}
