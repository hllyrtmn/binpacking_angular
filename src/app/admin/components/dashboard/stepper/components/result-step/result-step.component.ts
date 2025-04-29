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
@Component({
  selector: 'app-result-step',
  standalone: true,
  imports: [
    LoadingComponent,
    MatButton,
    MatStepperPrevious,
    PlotlyVisualizationComponent
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

  calculateBinpacking(): void {
    // İşlem başladığında loading göster
    // this.isLoading = true;

    this.repositoryService.calculatePacking().subscribe({
      next: (response) => {
        console.log('Paketleme verisi alındı:', response);

        // String ise parse et
        if (typeof response.data === 'string') {
          try {
            this.piecesData = JSON.parse(response.data);
          } catch (e) {
            console.error('Yanıt verisi parse edilemedi:', e);
            this.piecesData = [];
          }
        } else {
          this.piecesData = response.data;
        }

        // Eğer popup penceresi açıksa, oradaki görselleştirmeyi de güncelle
        if (this.popupWindow && !this.popupWindow.closed) {
          this.updatePopupVisualization();
        }

        // İşlem tamamlandığında loading gizle
        // this.isLoading = false;
      },
      error: (error) => {
        console.error('Paketleme hesaplanırken hata oluştu:', error);
        // İşlem hata verdiğinde loading gizle
        // this.isLoading = false;

        // Hata mesajı göster
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

      // Statik HTML sayfası oluştur
      const htmlContent =
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Truck Loading Visualization</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            font-family: Arial, sans-serif;
          }
          #plotly-container {
            width: 100%;
            height: 100%;
          }
          .close-button {
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 1000;
            padding: 8px 16px;
            background-color: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          }
          .close-button:hover {
            background-color: #c0392b;
          }
          .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 20px;
          }
        </style>
      </head>
      <body>
        <div id="plotly-container">
          <div class="loading">Yükleniyor...</div>
        </div>
        <button class="close-button" onclick="window.close()">Kapat</button>

        <script>
          // Veri yükleme
          const dataEncoded = "${dataEncoded}";
          const dimensionsEncoded = "${dimensionsEncoded}";

          // Base64'ten decode et
          const dataStr = atob(dataEncoded);
          const dimensionsStr = atob(dimensionsEncoded);

          // JSON parse et
          const data = JSON.parse(dataStr);
          const dimensions = JSON.parse(dimensionsStr);

          // Plotly'i dinamik olarak yükle
          function loadScript(url, callback) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = url;
            script.onload = callback;
            document.head.appendChild(script);
          }

          // Plotly'i CDN'den yükle
          loadScript('https://cdn.plot.ly/plotly-2.26.0.min.js', function() {
            // Plotly yüklendikten sonra görselleştirmeyi oluştur
            createVisualization();
          });

          function createVisualization() {
            const container = document.getElementById('plotly-container');

            // Temel mesh3d verisi oluştur
            let x = [];
            let y = [];
            let z = [];
            let i = [];
            let j = [];
            let k = [];
            let faceColor = [];

            // Kutu verileri işle
            data.forEach((box, boxIndex) => {
              const [x0, y0, z0, width, height, depth, palletId, weight] = box;

              // Kutu köşeleri
              const corners = [
                [x0, y0, z0],
                [x0 + width, y0, z0],
                [x0 + width, y0 + height, z0],
                [x0, y0 + height, z0],
                [x0, y0, z0 + depth],
                [x0 + width, y0, z0 + depth],
                [x0 + width, y0 + height, z0 + depth],
                [x0, y0 + height, z0 + depth],
              ];

              // Kutu koordinatlarını ekle
              const startIndex = x.length;
              corners.forEach(corner => {
                x.push(corner[0]);
                y.push(corner[1]);
                z.push(corner[2]);
              });

              // Kutu yüzeyleri için üçgenler
              const faces = [
                [0, 1, 2], [0, 2, 3], // alt
                [4, 5, 6], [4, 6, 7], // üst
                [0, 1, 5], [0, 5, 4], // ön
                [2, 3, 7], [2, 7, 6], // arka
                [0, 3, 7], [0, 7, 4], // sol
                [1, 2, 6], [1, 6, 5], // sağ
              ];

              // Yüzey indisleri ekle
              faces.forEach(face => {
                i.push(startIndex + face[0]);
                j.push(startIndex + face[1]);
                k.push(startIndex + face[2]);

                // Her kutu için farklı renk
                const colorIndex = boxIndex % 10;
                const colors = [
                  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
                  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
                ];
                faceColor.push(colors[colorIndex]);
              });
            });

            // Görselleştirmeyi oluştur
            const layout = {
              scene: {
                aspectratio: {
                  x: dimensions[0] / Math.max(...dimensions),
                  y: dimensions[1] / Math.max(...dimensions),
                  z: dimensions[2] / Math.max(...dimensions)
                },
                xaxis: {
                  title: 'X Ekseni ' + Math.floor(dimensions[0])
                },
                yaxis: {
                  title: 'Y Ekseni ' + Math.floor(dimensions[1])
                },
                zaxis: {
                  title: 'Z Ekseni ' + Math.floor(dimensions[2])
                },
                camera: {
                  eye: { x: 1.5, y: 1.5, z: 1.5 }
                }
              },
              margin: { l: 0, r: 0, b: 0, t: 0 },
              title: 'Truck Loading Visualization'
            };

            const config = {
              responsive: true,
              displayModeBar: true,
              scrollZoom: true,
              modeBarButtonsToAdd: ['toImage'],
              toImageButtonOptions: {
                format: 'png',
                filename: 'truck_loading_solution'
              }
            };

            // Mesh3d görselleştirmesi oluştur
            const mesh3d = {
              type: 'mesh3d',
              x: x,
              y: y,
              z: z,
              i: i,
              j: j,
              k: k,
              facecolor: faceColor,
              flatshading: true,
              opacity: 0.8
            };

            // Plotly ile görselleştir
            Plotly.newPlot(container, [mesh3d], layout, config);
          }
        </script>
      </body>
      </html>`;

      // Yeni blob oluştur
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);

      // Yeni sekmede aç
      window.open(blobUrl, '_blank');
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
