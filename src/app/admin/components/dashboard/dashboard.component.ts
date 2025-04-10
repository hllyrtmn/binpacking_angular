import {Component} from '@angular/core';
import { StepperComponent } from "./stepper/stepper.component";

@Component({
  selector: 'app-dashboard',
  imports: [StepperComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

}
