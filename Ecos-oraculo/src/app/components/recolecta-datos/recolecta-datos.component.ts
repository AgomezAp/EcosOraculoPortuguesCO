import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RecolectaService } from '../../services/recolecta.service';
import { Datos } from '../../interfaces/datos';

@Component({
  selector: 'app-recolecta-datos',
  imports: [CommonModule, FormsModule],
  templateUrl: './recolecta-datos.component.html',
  styleUrl: './recolecta-datos.component.css',
})
export class RecolectaDatosComponent {
  // ✅ Eventos de saída
  @Output() onDataSubmitted = new EventEmitter<any>();
  @Output() onModalClosed = new EventEmitter<void>();
  constructor(private recolecta: RecolectaService) {}
  // ✅ Propriedades de dados
  userData: any = {
    email: '',
  };
  aceptaTerminos = false;
  showTerminosError = false;
  datosVeridicos = false;
  showDatosVeridicosError = false;
  emailNotifications = false;
  // ✅ Controle de formulário
  dataFormErrors: { [key: string]: string } = {};
  isValidatingData: boolean = false;
  attemptedDataSubmission: boolean = false;

  // ✅ Método para validar dados
  validateUserData(): boolean {
    this.dataFormErrors = {};
    let isValid = true;

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.userData.email || !this.userData.email.toString().trim()) {
      this.dataFormErrors['email'] = 'O email é obrigatório';
      isValid = false;
    } else if (!emailRegex.test(this.userData.email.toString().trim())) {
      this.dataFormErrors['email'] = 'Insira um email válido';
      isValid = false;
    }

    return isValid;
  }

  // ✅ Método para verificar erros
  hasError(field: string): boolean {
    return this.attemptedDataSubmission && !!this.dataFormErrors[field];
  }

  async submitUserData(): Promise<void> {
    this.attemptedDataSubmission = true;

    // Validar formulário
    if (!this.validateUserData()) {
      return;
    }

    // Validar termos e condições
    this.showTerminosError = false;
    this.showDatosVeridicosError = false;

    if (!this.aceptaTerminos) {
      this.showTerminosError = true;
      return;
    }

    if (!this.datosVeridicos) {
      this.showDatosVeridicosError = true;
      return;
    }

    this.isValidatingData = true;
    try {
      // ✅ LIMPAR E NORMALIZAR DADOS ANTES DE ENVIAR
      const datosToSend: Datos = {
        email: (this.userData.email || '').toString().trim(),
      };

      // ✅ VALIDAR UMA VEZ MAIS OS CAMPOS CRÍTICOS
      const camposCriticos = [
        'email',
      ];
      const faltantes = camposCriticos.filter(
        (campo) => !datosToSend[campo as keyof Datos]
      );

      if (faltantes.length > 0) {
        this.dataFormErrors[
          'general'
        ] = `Faltam campos obrigatórios: ${faltantes.join(', ')}`;
        this.isValidatingData = false;
        return;
      }

      // Salvar no sessionStorage
      sessionStorage.setItem('userData', JSON.stringify(datosToSend));

      // Verificar que foram salvos corretamente
      const verificacion = sessionStorage.getItem('userData');
      const datosGuardados = verificacion ? JSON.parse(verificacion) : null;

      // Chamar ao serviço
      this.recolecta.createProduct(datosToSend).subscribe({
        next: (response: Datos) => {
          this.isValidatingData = false;
          this.onDataSubmitted.emit(datosToSend); // ✅ EMITIR datosToSend em vez de response
        },
        error: (error: any) => {
          this.isValidatingData = false;
          this.onDataSubmitted.emit(datosToSend); // ✅ EMITIR dados locais
        },
      });
    } catch (error) {
      this.dataFormErrors['general'] =
        'Erro inesperado. Por favor, tente novamente.';
      this.isValidatingData = false;
    }
  }
  cancelDataModal(): void {
    this.onModalClosed.emit();
  }
}
