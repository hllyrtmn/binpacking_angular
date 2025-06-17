import { Component, OnDestroy, ViewChild, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { LoadingComponent } from '../../../../../../components/loading/loading.component';
import { MatButton } from '@angular/material/button';
import { MatStepperPrevious } from '@angular/material/stepper';
import { RepositoryService } from '../../services/repository.service';
import { StepperStore } from '../../services/stepper.store';
import { SafeHtml } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { PlotlyVisualizationComponent } from "../../../../../../components/plotly/plotly.component";
import { PlotlyService } from '../../../../../../services/plotly.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../../../../services/toast.service';
import { switchMap, takeUntil, catchError, finalize } from 'rxjs/operators';
import { Subject, EMPTY } from 'rxjs';

// Package interface for type safety
interface PackageData {
  id: number;
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  color?: string;
  dimensions?: string;
}

// Loading statistics interface
interface LoadingStats {
  totalPackages: number;
  packagesLoaded: number;
  utilizationRate: number;
  cogScore: number;
  totalWeight: number;
  efficiency: number;
}

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
export class ResultStepComponent implements OnInit, OnDestroy {
  @ViewChild('plotlyComponent') plotlyComponent!: PlotlyVisualizationComponent;

  // **ÖNEMLİ: Component lifecycle ve cleanup için**
  private destroy$ = new Subject<void>();
  private isDestroyed = false;
  private processingLock = false;

  // Data properties
  piecesData: any[] = [];
  truckDimension: number[] = [12000, 2400, 2900];

  // Enhanced loading statistics
  loadingStats: LoadingStats = {
    totalPackages: 0,
    packagesLoaded: 0,
    utilizationRate: 0,
    cogScore: 0,
    totalWeight: 0,
    efficiency: 0
  };

  // UI state
  isLoading: boolean = false;
  hasResults: boolean = false;
  showVisualization: boolean = false;
  optimizationProgress: number = 0;

  // Results data
  reportFiles: any[] = [];
  processedPackages: PackageData[] = [];
  algorithmStats = {
    executionTime: 0,
    generations: 0,
    bestFitness: 0
  };

  // Popup window reference
  private popupWindow: Window | null = null;
  private progressInterval: any = null;

  // Services
  repositoryService = inject(RepositoryService);
  stepperService = inject(StepperStore);
  sanitizer = inject(DomSanitizer);
  toastService = inject(ToastService);
  plotlyService = inject(PlotlyService);
  cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    console.log('🎬 ResultStepComponent initialized');
  }

  ngOnDestroy(): void {
    console.log('🗑️ ResultStepComponent destroying...');

    this.isDestroyed = true;
    this.processingLock = false;

    // Signal destruction to all observables
    this.destroy$.next();
    this.destroy$.complete();

    // Clear progress interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    // Close popup if open
    if (this.popupWindow && !this.popupWindow.closed) {
      try {
        this.popupWindow.close();
      } catch (error) {
        console.warn('Error closing popup window:', error);
      }
      this.popupWindow = null;
    }
  }

  // ========================================
  // SAFE BUSINESS LOGIC (Sonsuz döngü koruması)
  // ========================================

  calculateBinpacking(): void {
    // Prevent multiple simultaneous requests
    if (this.processingLock || this.isDestroyed) {
      console.log('⚠️ Already processing or component destroyed');
      return;
    }

    console.log('🚀 Bin packing optimizasyonu başlatılıyor...');

    this.processingLock = true;

    // Reset state safely
    this.safeResetState();

    // Start progress simulation
    this.startProgressSimulation();

    this.repositoryService.calculatePacking()
      .pipe(
        takeUntil(this.destroy$), // Important: Auto cleanup on destroy
        switchMap(response => {
          if (this.isDestroyed) {
            throw new Error('Component destroyed');
          }

          console.log('📦 Paketleme verisi alındı:', response);

          // Process the response data safely
          this.safeProcessOptimizationResult(response);

          // Update progress
          this.optimizationProgress = Math.min(80, this.optimizationProgress);
          this.safeUpdateUI();

          // Create report after successful packing
          return this.repositoryService.createReport();
        }),
        catchError(error => {
          console.error('❌ İşlem sırasında hata oluştu:', error);
          this.handleError(error);
          return EMPTY; // Return empty observable to complete the stream
        }),
        finalize(() => {
          // Always cleanup, regardless of success or error
          this.processingLock = false;
          this.stopProgressSimulation();
        })
      )
      .subscribe({
        next: (reportResponse) => {
          if (this.isDestroyed) return;

          console.log('📊 Rapor başarıyla oluşturuldu:', reportResponse);

          this.reportFiles = Array.isArray(reportResponse?.files) ? reportResponse.files : [];
          this.optimizationProgress = 100;

          // Finalize the process safely
          setTimeout(() => {
            if (!this.isDestroyed) {
              this.safeFinalize();
            }
          }, 500);
        },
        error: (error) => {
          if (!this.isDestroyed) {
            this.handleError(error);
          }
        }
      });
  }

  private safeResetState(): void {
    if (this.isDestroyed) return;

    this.isLoading = true;
    this.hasResults = false;
    this.showVisualization = false;
    this.optimizationProgress = 0;
    this.piecesData = [];
    this.processedPackages = [];
    this.reportFiles = [];
    this.resetStats();

    this.safeUpdateUI();
  }

  private safeProcessOptimizationResult(response: any): void {
    if (this.isDestroyed) return;

    try {
      // Handle different response formats
      let packingData = null;

      if (response?.data) {
        if (typeof response.data === 'string') {
          try {
            packingData = JSON.parse(response.data);
          } catch (parseError) {
            console.warn('⚠️ Failed to parse response data string:', parseError);
            packingData = null;
          }
        } else if (response.data.data) {
          packingData = response.data.data;
        } else {
          packingData = response.data;
        }
      }

      if (packingData && Array.isArray(packingData) && packingData.length > 0) {
        // **ÖNEMLİ: Yeni array oluştur, referansı değiştir**
        this.piecesData = [...packingData];
        this.safeProcessPackageData();
        this.calculateStats();

        console.log(`✅ ${this.piecesData.length} paket başarıyla işlendi`);
      } else {
        console.warn('⚠️ Geçersiz paketleme verisi formatı');
        this.piecesData = [];
        this.processedPackages = [];
      }

      // Extract algorithm stats if available
      if (response?.stats) {
        this.algorithmStats = {
          executionTime: response.stats.execution_time || 0,
          generations: response.stats.generations || 0,
          bestFitness: response.stats.best_fitness || 0
        };
      }

    } catch (error) {
      console.error('❌ Veri işleme hatası:', error);
      this.piecesData = [];
      this.processedPackages = [];
    }
  }

  private safeProcessPackageData(): void {
    if (this.isDestroyed || !Array.isArray(this.piecesData)) return;

    try {
      this.processedPackages = this.piecesData.map((piece: any, index: number) => ({
        id: piece[6] || index,
        x: piece[0] || 0,
        y: piece[1] || 0,
        z: piece[2] || 0,
        length: piece[3] || 0,
        width: piece[4] || 0,
        height: piece[5] || 0,
        weight: piece[7] || 0,
        color: this.getPackageColor(index),
        dimensions: `${piece[3] || 0}×${piece[4] || 0}×${piece[5] || 0}mm`
      }));

      console.log(`📊 ${this.processedPackages.length} packages processed`);
    } catch (error) {
      console.error('❌ Package processing error:', error);
      this.processedPackages = [];
    }
  }

  private calculateStats(): void {
    if (this.isDestroyed || this.processedPackages.length === 0) {
      this.resetStats();
      return;
    }

    try {
      const totalVolume = this.truckDimension[0] * this.truckDimension[1] * this.truckDimension[2];
      const usedVolume = this.processedPackages.reduce((sum, pkg) =>
        sum + (pkg.length * pkg.width * pkg.height), 0);

      const totalWeight = this.processedPackages.reduce((sum, pkg) => sum + pkg.weight, 0);
      const cogScore = this.calculateCOGScore();
      const utilizationRate = Math.round((usedVolume / totalVolume) * 100);

      this.loadingStats = {
        totalPackages: this.processedPackages.length,
        packagesLoaded: this.processedPackages.length,
        utilizationRate: utilizationRate,
        cogScore: cogScore,
        totalWeight: Math.round(totalWeight),
        efficiency: Math.round((utilizationRate + cogScore) / 2)
      };
    } catch (error) {
      console.error('❌ Stats calculation error:', error);
      this.resetStats();
    }
  }

  private calculateCOGScore(): number {
    if (this.isDestroyed || this.processedPackages.length === 0) return 0;

    try {
      let totalWeight = 0;
      let weightedX = 0;
      let weightedY = 0;
      let weightedZ = 0;

      this.processedPackages.forEach(pkg => {
        const centerX = pkg.x + pkg.length / 2;
        const centerY = pkg.y + pkg.width / 2;
        const centerZ = pkg.z + pkg.height / 2;

        totalWeight += pkg.weight;
        weightedX += centerX * pkg.weight;
        weightedY += centerY * pkg.weight;
        weightedZ += centerZ * pkg.weight;
      });

      if (totalWeight === 0) return 0;

      const cogX = weightedX / totalWeight;
      const cogY = weightedY / totalWeight;
      const cogZ = weightedZ / totalWeight;

      // Ideal COG (center and lower part of truck)
      const idealX = this.truckDimension[0] / 2;
      const idealY = this.truckDimension[1] / 2;
      const idealZ = this.truckDimension[2] * 0.4; // 40% height

      const distance = Math.sqrt(
        Math.pow(cogX - idealX, 2) +
        Math.pow(cogY - idealY, 2) +
        Math.pow(cogZ - idealZ, 2)
      );

      const maxDistance = Math.sqrt(
        Math.pow(this.truckDimension[0] / 2, 2) +
        Math.pow(this.truckDimension[1] / 2, 2) +
        Math.pow(this.truckDimension[2] * 0.6, 2)
      );

      return Math.round(Math.max(0, 100 - (distance / maxDistance) * 100));
    } catch (error) {
      console.error('❌ COG calculation error:', error);
      return 0;
    }
  }

  private safeFinalize(): void {
    if (this.isDestroyed) return;

    this.isLoading = false;
    this.hasResults = true;
    this.showVisualization = true;

    this.safeUpdateUI();
    this.toastService.success('Paketleme ve rapor başarıyla oluşturuldu.');
  }

  private handleError(error: any): void {
    if (this.isDestroyed) return;

    this.isLoading = false;
    this.hasResults = false;
    this.optimizationProgress = 0;

    this.safeUpdateUI();

    const errorMessage = this.getErrorMessage(error);
    this.toastService.error(errorMessage);
  }

  private safeUpdateUI(): void {
    if (this.isDestroyed) return;

    try {
      this.cdr.detectChanges();
    } catch (error) {
      console.warn('UI update error:', error);
    }
  }

  // ========================================
  // SAFE PROGRESS SIMULATION
  // ========================================

  private startProgressSimulation(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(() => {
      if (this.isDestroyed || !this.isLoading) {
        this.stopProgressSimulation();
        return;
      }

      if (this.optimizationProgress < 70) {
        this.optimizationProgress += Math.random() * 8; // Slower progress
        this.safeUpdateUI();
      }
    }, 500); // Less frequent updates
  }

  private stopProgressSimulation(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  // ========================================
  // UI Helper Methods
  // ========================================

  getUtilizationRate(): number {
    return this.loadingStats.utilizationRate;
  }

  getCogScore(): number {
    return this.loadingStats.cogScore;
  }

  getCogScoreClass(): string {
    const score = this.loadingStats.cogScore;
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'warning';
    return 'poor';
  }

  getEfficiencyClass(): string {
    const efficiency = this.loadingStats.efficiency;
    if (efficiency >= 85) return 'excellent';
    if (efficiency >= 70) return 'good';
    if (efficiency >= 50) return 'warning';
    return 'poor';
  }

  getFileIcon(fileType: string | null): string {
    if (!fileType) return 'insert_drive_file';

    const type = fileType.toLowerCase();

    if (type.includes('pdf')) {
      return 'picture_as_pdf';
    } else if (type.includes('image') || type.includes('jpg') || type.includes('jpeg') || type.includes('png')) {
      return 'image';
    } else if (type.includes('excel') || type.includes('sheet') || type.includes('xlsx') || type.includes('xls')) {
      return 'table_chart';
    } else if (type.includes('word') || type.includes('doc')) {
      return 'description';
    } else if (type.includes('zip') || type.includes('rar') || type.includes('archive')) {
      return 'folder_zip';
    } else if (type.includes('text') || type.includes('txt')) {
      return 'article';
    } else if (type.includes('video')) {
      return 'videocam';
    } else if (type.includes('audio')) {
      return 'audiotrack';
    }

    return 'insert_drive_file';
  }

  // ========================================
  // SAFE Visualization Methods
  // ========================================

  openInNewTab(): void {
    if (!this.hasResults || !this.piecesData || this.piecesData.length === 0 || this.isDestroyed) {
      this.toastService.warning('Önce optimizasyonu çalıştırın.');
      return;
    }

    try {
      const dataStr = JSON.stringify(this.piecesData);
      const dimensionsStr = JSON.stringify(this.truckDimension);

      // Create a new window with 3D visualization
      const newWindow = window.open('', '_blank',
        'width=1200,height=800,scrollbars=yes,resizable=yes');

      if (newWindow) {
        newWindow.document.write(this.createPopupHTML(dataStr, dimensionsStr));
        newWindow.document.close();
        this.popupWindow = newWindow;
      }
    } catch (error) {
      console.error('❌ Yeni sekme açılırken hata oluştu:', error);
      this.toastService.error('3D görünüm açılamadı.');
    }
  }

  private createPopupHTML(dataStr: string, dimensionsStr: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>3D Tır Yükleme Görselleştirmesi</title>
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f8f9fa; }
          #plotly-container { width: 100%; height: 700px; border: 1px solid #ddd; background: white; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 20px; color: #006A6A; }
          .stats { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; }
          .stat-item { text-align: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .stat-value { font-weight: 600; color: #006A6A; font-size: 18px; }
          .stat-label { font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚛 Tır Yükleme Optimizasyonu - 3D Görünüm</h1>
        </div>
        <div class="stats">
          <div class="stat-item">
            <div class="stat-value">${this.loadingStats.packagesLoaded}</div>
            <div class="stat-label">Yüklenen Paket</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.loadingStats.utilizationRate}%</div>
            <div class="stat-label">Doluluk Oranı</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.loadingStats.cogScore}/100</div>
            <div class="stat-label">COG Skoru</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.loadingStats.totalWeight} kg</div>
            <div class="stat-label">Toplam Ağırlık</div>
          </div>
        </div>
        <div id="plotly-container"></div>
        <script>
          try {
            const piecesData = JSON.parse('${dataStr}');
            const truckDimension = JSON.parse('${dimensionsStr}');

            // Create basic 3D visualization
            const traces = [];
            const colors = ['#006A6A', '#D6BB86', '#004A4A', '#C0A670', '#8b5cf6'];

            // Truck outline
            const L = truckDimension[0], W = truckDimension[1], H = truckDimension[2];
            traces.push({
              type: 'scatter3d',
              mode: 'lines',
              x: [0, L, L, 0, 0, 0, L, L, 0, 0, L, L, L, L, 0, 0],
              y: [0, 0, W, W, 0, 0, 0, W, W, 0, 0, W, W, 0, 0, W],
              z: [0, 0, 0, 0, 0, H, H, H, H, H, 0, 0, H, H, H, H],
              line: { color: '#666', width: 3 },
              name: 'Tır Konteyneri',
              showlegend: false
            });

            // Add packages
            piecesData.forEach((piece, index) => {
              const [x, y, z, l, w, h, id, weight] = piece;

              traces.push({
                type: 'mesh3d',
                x: [x, x+l, x+l, x, x, x+l, x+l, x],
                y: [y, y, y+w, y+w, y, y, y+w, y+w],
                z: [z, z, z, z, z+h, z+h, z+h, z+h],
                i: [0, 0, 0, 1, 1, 2, 2, 3, 4, 4, 4, 5, 5, 6, 6, 7],
                j: [1, 2, 3, 2, 3, 3, 0, 0, 5, 6, 7, 6, 7, 7, 4, 4],
                k: [2, 3, 0, 3, 0, 0, 1, 1, 6, 7, 4, 7, 4, 4, 5, 5],
                color: colors[index % colors.length],
                opacity: 0.8,
                name: 'Palet ' + id,
                showlegend: false
              });
            });

            const layout = {
              scene: {
                xaxis: { title: 'Uzunluk (mm)', showgrid: true },
                yaxis: { title: 'Genişlik (mm)', showgrid: true },
                zaxis: { title: 'Yükseklik (mm)', showgrid: true },
                camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } },
                bgcolor: '#f8fafc'
              },
              margin: { l: 0, r: 0, b: 0, t: 0 },
              paper_bgcolor: 'white'
            };

            Plotly.newPlot('plotly-container', traces, layout, {responsive: true, displayModeBar: true});

          } catch (error) {
            console.error('Popup visualization error:', error);
            document.getElementById('plotly-container').innerHTML =
              '<div style="text-align: center; padding: 50px; color: #F44336;">Görselleştirme hatası: ' + error.message + '</div>';
          }
        </script>
      </body>
      </html>
    `;
  }

  // ========================================
  // Event Handlers
  // ========================================

  onPackageSelected(packageData: PackageData): void {
    if (this.isDestroyed) return;

    console.log('📦 Paket seçildi:', packageData);
    // Handle package selection (could show details modal, etc.)
  }

  onViewChanged(viewType: string): void {
    if (this.isDestroyed) return;

    console.log('👁️ Görünüm değiştirildi:', viewType);
  }

  // ========================================
  // Utility Methods
  // ========================================

  private resetStats(): void {
    this.loadingStats = {
      totalPackages: 0,
      packagesLoaded: 0,
      utilizationRate: 0,
      cogScore: 0,
      totalWeight: 0,
      efficiency: 0
    };
  }

  private getPackageColor(index: number): string {
    const colors = [
      '#006A6A', '#D6BB86', '#004A4A', '#C0A670', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    return colors[index % colors.length];
  }

  private getErrorMessage(error: any): string {
    if (error?.status === 0) {
      return 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.';
    } else if (error?.status >= 400 && error?.status < 500) {
      return 'İstek hatası. Lütfen parametreleri kontrol edin.';
    } else if (error?.status >= 500) {
      return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
    } else {
      return error?.message || 'Beklenmeyen bir hata oluştu.';
    }
  }

  // ========================================
  // Additional Helper Methods (for template)
  // ========================================

  saveResults(): void {
    if (!this.hasResults || this.isDestroyed) {
      this.toastService.warning('Kaydetmek için önce optimizasyonu çalıştırın.');
      return;
    }

    try {
      const results = {
        timestamp: new Date().toISOString(),
        truckDimensions: this.truckDimension,
        packagesData: this.piecesData,
        statistics: this.loadingStats,
        algorithmStats: this.algorithmStats,
        reportFiles: this.reportFiles
      };

      const dataStr = JSON.stringify(results, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `truck-loading-results-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.toastService.success('Sonuçlar başarıyla kaydedildi.');
    } catch (error) {
      console.error('❌ Sonuçları kaydetme hatası:', error);
      this.toastService.error('Sonuçlar kaydedilemedi.');
    }
  }

  trackByFileId(index: number, file: any): any {
    return file?.id || file?.name || index;
  }

  formatFileSize(bytes: number): string {
    if (!bytes || isNaN(bytes)) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
