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

  @ViewChild('palletControlComponent') palletControlComponent!: PalletControlComponent;
  private sessionService = inject(SessionStorageService);
  order_id: string = '';

  stepperService = inject(StepperStore);

  selectedIndex: number = 0;

  logger = (item: any) => console.log(item);

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
