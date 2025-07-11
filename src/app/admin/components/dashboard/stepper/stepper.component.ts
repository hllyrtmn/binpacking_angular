import { Component, inject, ViewChild } from '@angular/core';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { StepperOrientation, MatStepperModule, MatStepper } from '@angular/material/stepper';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AsyncPipe } from '@angular/common';
import { InvoiceUploadComponent } from './components/invoice-upload/invoice-upload.component';
import { PalletControlComponent } from './components/pallet-control/pallet-control.component';
import { LoadingComponent } from "../../../../components/loading/loading.component";
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { ResultStepComponent } from './components/result-step/result-step.component';
import { StepperStore, STATUSES } from './services/stepper.store';
import { SessionStorageService } from './services/session-storage.service';

@Component({
  selector: 'app-stepper',
  imports: [MatStepperModule,
    FormsModule,
    LoadingComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AsyncPipe, InvoiceUploadComponent, PalletControlComponent, LoadingComponent, ResultStepComponent],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss'
})
export class StepperComponent {
  @ViewChild('stepper') stepper!: MatStepper;
  @ViewChild('invoiceUploadComponent') invoiceUploadComponent!: InvoiceUploadComponent;
  @ViewChild('palletControlComponent') palletControlComponent!: PalletControlComponent;
  @ViewChild('resultStepComponent') resultStepComponent!: ResultStepComponent;
  private sessionService = inject(SessionStorageService);
  order_id: string = '';

  stepperService = inject(StepperStore);

  selectedIndex: number = 0;

  ngOnInit() {
    // Mevcut kodunuz...

    // Session ile sync yap
    this.stepperService.syncWithSession();
  }

  logger = (item: any) => console.log(item);

   onShipmentCompleted(): void {
    console.log('🔄 Shipment completed, starting full reset process...');

    try {
      // 1. Tüm component'leri reset et
      this.resetAllComponents();

      // 2. Stepper navigation
      if (this.stepper) {
        console.log('🎯 Navigating to Step 1...');

        // Linear mode'u kapat
        this.stepper.linear = false;

        // Step 1'e git
        this.stepper.selectedIndex = 0;

        // 1 saniye sonra linear mode'u tekrar aç
        setTimeout(() => {
          if (this.stepper) {
            this.stepper.linear = true;
            this.resetStepEditableStates();
            console.log('✅ Full reset completed - ready for new workflow');
          }
        }, 1000);

      } else {
        console.error('❌ Stepper reference bulunamadı!');
      }

    } catch (error) {
      console.error('❌ Full reset hatası:', error);
    }
  }

  private resetAllComponents(): void {
    console.log('🔄 Tüm componentler reset ediliyor...');

    try {
      // Invoice Upload reset
      if (this.invoiceUploadComponent) {
        this.invoiceUploadComponent.resetComponentState();
      } else {
        console.warn('⚠️ Invoice Upload component reference bulunamadı');
      }

      // Pallet Control reset
      if (this.palletControlComponent) {
        this.palletControlComponent.resetComponentState();
      } else {
        console.warn('⚠️ Pallet Control component reference bulunamadı');
      }

      // Result Step zaten kendi reset'ini yapıyor

      console.log('✅ Tüm componentler reset edildi');

    } catch (error) {
      console.error('❌ Component reset hatası:', error);
    }
  }

  private resetStepEditableStates(): void {
    try {
      console.log('⚙️ Step editable states reset ediliyor...');

      // Step 1'i editable yap, diğerlerini kapat
      this.stepperService.setStepStatus(1, STATUSES.editable, true);
      this.stepperService.setStepStatus(2, STATUSES.editable, false);
      this.stepperService.setStepStatus(3, STATUSES.editable, false);

      // Completion durumlarını da reset et
      this.stepperService.setStepStatus(1, STATUSES.completed, false);
      this.stepperService.setStepStatus(2, STATUSES.completed, false);
      this.stepperService.setStepStatus(3, STATUSES.completed, false);

      console.log('✅ Step states reset edildi');

    } catch (error) {
      console.error('❌ Step states reset hatası:', error);
    }
  }

  orderIdComeOn(id: string) {
    this.order_id = id;
    console.log('Order ID geldi:', this.order_id);
    this.selectedIndex = 1;
  }

  configurePalletComponent() {
    this.palletControlComponent.configureComponent();
  }

  onStepChange(event: StepperSelectionEvent) {
    console.log(event);
  }
  stepperOrientation: Observable<StepperOrientation>;

  constructor() {
    const breakpointObserver = inject(BreakpointObserver);

    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({ matches }) => matches ? 'horizontal' : 'vertical'));

    // YENİ: User activity listener ekleyin
    this.setupActivityRefresh();
  }

  private setupActivityRefresh(): void {
    // Her 5 dakikada bir session'ı refresh et (user aktifse)
    setInterval(() => {
      if (this.sessionService.hasExistingSession()) {
        this.sessionService.refreshSession();
      }
    }, 5 * 60 * 1000); // 5 dakika

    // User activity olduğunda refresh et
    ['click', 'keypress', 'scroll'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        if (this.sessionService.hasExistingSession()) {
          this.sessionService.refreshSession();
        }
      }, { passive: true });
    });
  }

  invoiceUploaded() {
    this.palletControlComponent.configureComponent();
    this.stepperService.setStepStatus(1, STATUSES.completed, true);
  }
}
