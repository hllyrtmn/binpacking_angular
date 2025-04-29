import { Component, inject, ViewContainerRef } from '@angular/core';
import { LoadingComponent } from '../../../../../../components/loading/loading.component';
import { MatButton } from '@angular/material/button';
import { MatStepperPrevious } from '@angular/material/stepper';
import { RepositoryService } from '../../services/repository.service';
import { StepperStore } from '../../services/stepper.store';
import { SafeHtml } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-result-step',
  imports: [
    LoadingComponent,
    MatButton,
    MatStepperPrevious
  ],
  templateUrl: './result-step.component.html',
  styleUrl: './result-step.component.scss'
})
export class ResultStepComponent {
  // TODO: stepler arasi geciste onceki stepin durumuna gore
  // gecise izin verme kontrolu
  // TODO: progres ekranda gosterilmesi
  // TODO: ciktilarin ve raporlarin gosterilmesi

  // eger package lar backende gidip create edilmisse ve kullanici
  // stepper da geriye gidip package degistirme islemleri yaparsa
  // tekrar backende gidipy yeni bir result isterse
  // ordera ait packagelar silinmeli 

  // result ve package iliskilendirilmeli
  // her farkli result icin farkli packagelar olusur
  // order ve result iliskili olur
  // package ve order iliskili olmaz

  htmlContent!:SafeHtml


  repositoryService= inject(RepositoryService);

  stepperService = inject(StepperStore)
  sanitizer = inject(DomSanitizer)



  calculateBinpacking(){
    this.repositoryService.calculatePacking().subscribe({next: (response) => {
      console.log(response.data.html)
      this.htmlContent = this.sanitizer.bypassSecurityTrustHtml(response.data.html)
    } })

  }


}
