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
import { StepperStore } from './services/stepper.store';


@Component({
  selector: 'app-stepper',
  imports: [MatStepperModule,
    FormsModule,
    LoadingComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AsyncPipe, InvoiceUploadComponent, PalletControlComponent, LoadingComponent,ResultStepComponent],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss'
})
export class StepperComponent {

  @ViewChild('palletControlComponent') palletControlComponent!: PalletControlComponent;

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
  }
}
