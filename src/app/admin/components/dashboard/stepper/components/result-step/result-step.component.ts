import { Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { LoadingComponent } from '../../../../../../components/loading/loading.component';
import { MatButton } from '@angular/material/button';
import { MatStepperPrevious } from '@angular/material/stepper';
import { RepositoryService } from '../../services/repository.service';
import { StepperStore } from '../../services/stepper.store';
import { SafeHtml } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { PlotlyVisualizationComponent } from "../../../../../../components/plotly/plotly.component";
import { PlotlyService } from '../../../../../../services/plotly.service';
import { ThreejsService } from '../../../../../../services/threejs.service';
import { ThreejsVisualizationComponent } from '../../../../../../components/threejs/threejs.component';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-result-step',
  standalone: true,
  imports: [
    CommonModule,
    LoadingComponent,
    MatButton,
    MatStepperPrevious,
    PlotlyVisualizationComponent,
    MatIconModule
],
  templateUrl: './result-step.component.html',
  styleUrl: './result-step.component.scss'
})
export class ResultStepComponent implements OnDestroy {
  // @ViewChild('threejsComponent') threejsComponent!: ThreejsVisualizationComponent;

  // piecesData: any[] = [];
  // truckDimension: number[] = [12000, 2400, 2900]; // Default dimensions

  // // TODO: stepler arasi geciste onceki stepin durumuna gore
  // // gecise izin verme kontrolu
  // // TODO: progres ekranda gosterilmesi
  // // TODO: ciktilarin ve raporlarin gosterilmesi

  // htmlContent!: SafeHtml;
  // private popupWindow: Window | null = null;

  // repositoryService = inject(RepositoryService);
  // stepperService = inject(StepperStore);
  // sanitizer = inject(DomSanitizer);
  // threejsService = inject(ThreejsService);

  // calculateBinpacking(): void {
  //   // İşlem başladığında loading göster
  //   // this.isLoading = true;

  //   this.repositoryService.calculatePacking().subscribe({
  //     next: (response) => {
  //       console.log('Paketleme verisi alındı:', response);

  //       // String ise parse et
  //       if (typeof response.data === 'string') {
  //         try {
  //           this.piecesData = JSON.parse(response.data);
  //         } catch (e) {
  //           console.error('Yanıt verisi parse edilemedi:', e);
  //           this.piecesData = [];
  //         }
  //       } else {
  //         this.piecesData = response.data;
  //       }

  //       // Eğer popup penceresi açıksa, oradaki görselleştirmeyi de güncelle
  //       if (this.popupWindow && !this.popupWindow.closed) {
  //         this.updatePopupVisualization();
  //       }

  //       // İşlem tamamlandığında loading gizle
  //       // this.isLoading = false;
  //     },
  //     error: (error) => {
  //       console.error('Paketleme hesaplanırken hata oluştu:', error);
  //       // İşlem hata verdiğinde loading gizle
  //       // this.isLoading = false;

  //       // Hata mesajı göster
  //       // this.showErrorMessage('Paketleme hesaplanırken bir hata oluştu. Lütfen tekrar deneyin.');
  //     }
  //   });
  // }

  // openInNewTab(): void {
  //   // Direk ThreejsVisualizationComponent'deki openInNewTab metodunu kullan
  //   if (this.threejsComponent) {
  //     this.threejsComponent.openInNewTab();
  //   } else {
  //     // Component yüklü değilse, servis üzerinden yap
  //     const pieces = typeof this.piecesData === 'string'
  //       ? JSON.parse(this.piecesData)
  //       : this.piecesData;

  //     this.threejsService.openInNewTab(pieces, this.truckDimension);
  //   }
  // }

  // // Popup penceresindeki görselleştirmeyi güncelle
  // private updatePopupVisualization(): void {
  //   if (!this.popupWindow || this.popupWindow.closed) return;

  //   try {
  //     // Veriyi kontrol et
  //     if (this.piecesData && this.piecesData.length > 0) {
  //       // Popup için veri hazırla
  //       const pieces = typeof this.piecesData === 'string'
  //         ? JSON.parse(this.piecesData)
  //         : this.piecesData;

  //       // Dinamik olarak popup içeriğini güncelle - ThreeJS için
  //       // Bu kısım ThreeJS kullanarak tamamen farklı bir yaklaşım gerektirir
  //       // Yeni sekme yaklaşımı daha iyi bir çözüm sunduğundan,
  //       // eski güncellenebilir popup yerine yeni sekme kullanacağız
  //       this.popupWindow.close();
  //       this.threejsService.openInNewTab(pieces, this.truckDimension);
  //     }
  //   } catch (error) {
  //     console.error('Popup görselleştirmesi güncellenirken hata:', error);
  //   }
  // }

  // ngOnDestroy(): void {
  //   // Component yok edildiğinde popup penceresini kapat
  //   if (this.popupWindow && !this.popupWindow.closed) {
  //     this.popupWindow.close();
  //   }
  // }



























  @ViewChild('plotlyComponent') plotlyComponent!: PlotlyVisualizationComponent;

  piecesData: any[] = [];
  truckDimension: number[] = [12000, 2400, 2900]; // Default dimensions

  // TODO: stepler arasi geciste onceki stepin durumuna gore
  // gecise izin verme kontrolu
  // TODO: progres ekranda gosterilmesi
  // TODO: ciktilarin ve raporlarin gosterilmesi

  htmlContent!: SafeHtml;
  private popupWindow: Window | null = null;

  repositoryService = inject(RepositoryService);
  stepperService = inject(StepperStore);
  sanitizer = inject(DomSanitizer);
  plotlyService = inject(PlotlyService);
  threejsService = inject(ThreejsService);
  isLoading: boolean = false; // Yükleme sırasında true yapın
  hasResults: boolean = false; // Sonuçlar hazır olduğunda true yapın

  getUtilizationRate(): number {
    // Doluluk oranı hesaplama mantığınıza göre
    // Örnek: Kullanılan hacim / toplam hacim
    return 78; // Örnek değer
  }

  calculateBinpacking(): void {
    // İşlem başladığında loading göster
    this.isLoading = true;
    this.hasResults = false;

    this.repositoryService.calculatePacking().subscribe({
      next: (response) => {
        console.log('Paketleme verisi alındı:', response);

        // String ise parse et
        if (typeof response.data.data === 'string') {
          try {
            this.piecesData = JSON.parse(response.data);
          } catch (e) {
            console.error('Yanıt verisi parse edilemedi:', e);
            this.piecesData = [];
          }
        } else {
          this.piecesData = response.data.data;
        }

        // Eğer popup penceresi açıksa, oradaki görselleştirmeyi de güncelle
        if (this.popupWindow && !this.popupWindow.closed) {
          this.updatePopupVisualization();
        }

        // İşlem tamamlandığında loading gizle ve sonuçları göster
        this.isLoading = false;
        this.hasResults = true;
      },
      error: (error) => {
        console.error('Paketleme hesaplanırken hata oluştu:', error);

        // İşlem hata verdiğinde loading gizle
        this.isLoading = false;
        this.hasResults = false;

        // Hata mesajı göster - ileride bir hata bildirim sistemi eklenebilir
        // this.showErrorMessage('Paketleme hesaplanırken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    });
  }

  openInNewTab(): void {
    try {
      // Veri JSON'a dönüştürülür
      const dataStr = JSON.stringify(this.piecesData);
      const dimensionsStr = JSON.stringify(this.truckDimension);

      // Base64 formatına çevir
      const dataEncoded = btoa(dataStr);
      const dimensionsEncoded = btoa(dimensionsStr);

    } catch (error) {
      console.error('Yeni sekme açılırken hata oluştu:', error);
    }
  }

  // Popup penceresindeki görselleştirmeyi güncelle
  private updatePopupVisualization(): void {
    if (!this.popupWindow || this.popupWindow.closed) return;

    // Popup penceresindeki Plotly container'ı al
    const plotlyContainer = this.popupWindow.document.getElementById('plotly-container');
    if (!plotlyContainer) return;

    // Veriyi kontrol et
    if (this.piecesData && this.piecesData.length > 0) {
      try {
        // Plotly.js nesnesine erişmek için popup penceresindeki Plotly nesnesini kullan
        const Plotly = (this.popupWindow as any).Plotly;
        if (Plotly) {
          // PlotlyService'i kullanarak görselleştirmeyi oluştur
          this.plotlyService.drawSolution(
            plotlyContainer,
            this.piecesData,
            this.truckDimension
          );
        }
      } catch (error) {
        console.error('Yeni sekmede görselleştirme oluşturulurken hata:', error);
      }
    }
  }

  ngOnDestroy(): void {
    // URL.revokeObjectURL(); // Blob URL'ini temizle (gerekirse)

    // Component yok edildiğinde popup penceresini kapat
    if (this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.close();
    }
  }
}
