import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlotlyService } from '../../services/plotly.service';

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

interface LoadingStats {
  totalPackages: number;
  packagesLoaded: number;
  utilizationRate: number;
  cogScore: number;
  totalWeight: number;
}

@Component({
  selector: 'app-plotly',
  imports: [CommonModule],
  templateUrl: './plotly.component.html',
  styleUrl: './plotly.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlotlyVisualizationComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('plotlyContainer', { static: true }) plotlyContainer!: ElementRef;

  @Input() piecesData: any[] | string = [];
  @Input() truckDimension: number[] = [12000, 2400, 2900];
  @Input() showHelp: boolean = true;

  @Output() packageSelected = new EventEmitter<PackageData>();
  @Output() viewChanged = new EventEmitter<string>();

  // UI State
  isFullscreen = false;
  isLoading = false;
  infoPanelCollapsed = false;
  wireframeMode = false;
  currentView: string = 'isometric';
  highlightedPackage: PackageData | null = null;

  // Data
  loadingStats: LoadingStats = {
    totalPackages: 0,
    packagesLoaded: 0,
    utilizationRate: 0,
    cogScore: 0,
    totalWeight: 0
  };

  displayedPackagesCount = 10;
  private processedPackages: PackageData[] = [];
  private colorIndex: any;
  private resizeObserver: ResizeObserver | null = null;
  private plotlyInstance: any = null;

  // **ÖNEMLİ: Sonsuz döngüyü önlemek için flag'ler**
  private isRendering = false;
  private isProcessing = false;
  private lastDataHash = '';
  private renderTimeout: any = null;
  private resizeTimeout: any = null;
  private isDestroyed = false;

  // Predefined color palette for packages
  private readonly COLOR_PALETTE = [
    '#006A6A', '#D6BB86', '#004A4A', '#C0A670', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#fbbf24', '#8b5cf6', '#f87171', '#34d399',
    '#60a5fa', '#a78bfa', '#fb7185', '#fde047', '#67e8f9'
  ];

  constructor(
    private plotlyService: PlotlyService,
    private cdr: ChangeDetectorRef
  ) {}

  @HostListener('document:keydown.escape', ['$event'])
  handleEscKey(event: KeyboardEvent) {
    if (this.isFullscreen) {
      this.exitFullscreen();
    }
  }

  @HostListener('document:fullscreenchange', ['$event'])
  @HostListener('document:webkitfullscreenchange', ['$event'])
  @HostListener('document:mozfullscreenchange', ['$event'])
  @HostListener('document:MSFullscreenChange', ['$event'])
  fullscreenChangeHandler() {
    if (this.isDestroyed) return;

    this.isFullscreen = !!document.fullscreenElement ||
                       !!(document as any).webkitFullscreenElement ||
                       !!(document as any).mozFullScreenElement ||
                       !!(document as any).msFullscreenElement;

    // Manual change detection çünkü OnPush kullanıyoruz
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    console.log('🎬 PlotlyVisualizationComponent initialized');

    // İlk render'ı biraz geciktir
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.setupResizeObserver();
        this.safeProcessData();
      }
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isDestroyed || this.isProcessing) return;

    console.log('🔄 ngOnChanges triggered:', Object.keys(changes));

    // Sadece gerçekten değişiklik varsa işle
    if (changes['piecesData'] || changes['truckDimension']) {
      const currentDataHash = this.generateDataHash();

      if (currentDataHash !== this.lastDataHash) {
        console.log('📊 Data actually changed, processing...');
        this.lastDataHash = currentDataHash;
        this.safeProcessData();
      } else {
        console.log('📊 Data hash same, skipping processing');
      }
    }
  }

  ngOnDestroy(): void {
    console.log('🗑️ PlotlyVisualizationComponent destroying...');

    this.isDestroyed = true;
    this.isRendering = false;
    this.isProcessing = false;

    // Cleanup timeouts
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }

    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }

    // Cleanup fullscreen
    if (this.isFullscreen) {
      this.exitFullscreen();
    }

    // Cleanup resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Cleanup plotly
    if (this.plotlyInstance && this.plotlyContainer?.nativeElement) {
      try {
        this.plotlyService.purge(this.plotlyContainer.nativeElement);
        this.plotlyInstance = null;
      } catch (error) {
        console.warn('Error purging Plotly:', error);
      }
    }
  }

  // ========================================
  // SAFE DATA PROCESSING (Sonsuz döngü koruması)
  // ========================================

  private generateDataHash(): string {
    try {
      const dataStr = typeof this.piecesData === 'string'
        ? this.piecesData
        : JSON.stringify(this.piecesData);
      const dimensionStr = JSON.stringify(this.truckDimension);
      return btoa(dataStr + dimensionStr).substring(0, 16);
    } catch {
      return Math.random().toString(36).substring(7);
    }
  }

  private safeProcessData(): void {
    if (this.isProcessing || this.isDestroyed) {
      console.log('⚠️ Already processing or destroyed, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('📊 Safe processing data...');
      this.processData();
      this.safeRenderVisualization();
    } catch (error) {
      console.error('❌ Error in safe process data:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private processData(): void {
    const pieces = typeof this.piecesData === 'string'
      ? JSON.parse(this.piecesData)
      : this.piecesData;

    if (!pieces || pieces.length === 0) {
      this.resetStats();
      this.processedPackages = [];
      return;
    }

    // Process packages data
    this.processedPackages = pieces.map((piece: any, index: number) => ({
      id: piece[6] || index,
      x: piece[0] || 0,
      y: piece[1] || 0,
      z: piece[2] || 0,
      length: piece[3] || 0,
      width: piece[4] || 0,
      height: piece[5] || 0,
      weight: piece[7] || 0,
      color: this.COLOR_PALETTE[index % this.COLOR_PALETTE.length],
      dimensions: `${piece[3] || 0}×${piece[4] || 0}×${piece[5] || 0}mm`
    }));

    // Calculate statistics
    this.calculateStats();

    console.log(`✅ Processed ${this.processedPackages.length} packages`);
  }

  private calculateStats(): void {
    if (this.processedPackages.length === 0) {
      this.resetStats();
      return;
    }

    const totalVolume = this.truckDimension[0] * this.truckDimension[1] * this.truckDimension[2];
    const usedVolume = this.processedPackages.reduce((sum, pkg) =>
      sum + (pkg.length * pkg.width * pkg.height), 0);

    this.loadingStats = {
      totalPackages: this.processedPackages.length,
      packagesLoaded: this.processedPackages.length,
      utilizationRate: Math.round((usedVolume / totalVolume) * 100),
      cogScore: this.calculateCOGScore(),
      totalWeight: Math.round(this.processedPackages.reduce((sum, pkg) => sum + pkg.weight, 0))
    };
  }

  private calculateCOGScore(): number {
    if (this.processedPackages.length === 0) return 0;

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

    // Calculate ideal COG (center and lower part of truck)
    const idealX = this.truckDimension[0] / 2;
    const idealY = this.truckDimension[1] / 2;
    const idealZ = this.truckDimension[2] * 0.4;

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
  }

  private resetStats(): void {
    this.loadingStats = {
      totalPackages: 0,
      packagesLoaded: 0,
      utilizationRate: 0,
      cogScore: 0,
      totalWeight: 0
    };
  }

  // ========================================
  // SAFE VISUALIZATION RENDERING
  // ========================================

  private safeRenderVisualization(): void {
    if (this.isRendering || this.isDestroyed) {
      console.log('⚠️ Already rendering or destroyed, skipping render...');
      return;
    }

    const element = this.plotlyContainer?.nativeElement;
    if (!element) {
      console.log('⚠️ No plotly container element');
      return;
    }

    // Element boyutunu kontrol et
    if (!element.offsetWidth || !element.offsetHeight) {
      console.log('⚠️ Element not ready, retrying...');

      // Maximum 5 retry
      if (!this.renderTimeout) {
        let retryCount = 0;
        const checkElement = () => {
          retryCount++;
          if (retryCount > 5 || this.isDestroyed) {
            console.log('❌ Element never became ready or component destroyed');
            return;
          }

          if (element.offsetWidth && element.offsetHeight) {
            this.safeRenderVisualization();
          } else {
            this.renderTimeout = setTimeout(checkElement, 200);
          }
        };
        checkElement();
      }
      return;
    }

    this.isRendering = true;
    this.isLoading = true;

    // Manual change detection
    this.cdr.detectChanges();

    console.log('🎨 Starting safe visualization render...');

    // Clear previous timeout
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }

    // Render with a small delay to prevent blocking
    this.renderTimeout = setTimeout(() => {
      if (this.isDestroyed) {
        this.isRendering = false;
        return;
      }

      try {
        if (this.processedPackages && this.processedPackages.length > 0) {
          // Convert back to the format expected by PlotlyService
          const pieces = this.processedPackages.map(pkg => [
            pkg.x, pkg.y, pkg.z, pkg.length, pkg.width, pkg.height, pkg.id, pkg.weight
          ]);

          console.log(`🎨 Rendering ${pieces.length} pieces...`);

          this.colorIndex = this.plotlyService.drawSolution(
            element,
            pieces,
            this.truckDimension
          );

          this.plotlyInstance = element;
          this.setupPlotlyInteractions();

          console.log('✅ Visualization rendered successfully');
        } else {
          // Clear the plot if no data
          this.plotlyService.clearPlot(element);
          console.log('🧹 Plot cleared - no data');
        }
      } catch (error) {
        console.error('❌ Error rendering visualization:', error);
      } finally {
        this.isLoading = false;
        this.isRendering = false;
        this.renderTimeout = null;

        // Manual change detection
        if (!this.isDestroyed) {
          this.cdr.detectChanges();
        }
      }
    }, 150);
  }

  private setupPlotlyInteractions(): void {
    if (!this.plotlyInstance || this.isDestroyed) return;

    try {
      // Remove existing listeners first to prevent duplicates
      this.plotlyInstance.removeAllListeners?.();

      // Setup click events for package selection
      this.plotlyInstance.on('plotly_click', (data: any) => {
        if (this.isDestroyed) return;

        if (data.points && data.points.length > 0) {
          const point = data.points[0];
          const packageIndex = this.getPackageIndexFromPoint(point);
          if (packageIndex >= 0 && this.processedPackages[packageIndex]) {
            this.highlightPackage(this.processedPackages[packageIndex]);
          }
        }
      });

      // Add hover effects with throttling
      let hoverTimeout: any = null;
      this.plotlyInstance.on('plotly_hover', (data: any) => {
        if (this.isDestroyed) return;

        if (hoverTimeout) clearTimeout(hoverTimeout);

        hoverTimeout = setTimeout(() => {
          if (data.points && data.points.length > 0) {
            const point = data.points[0];
            if (point.data.type === 'mesh3d') {
              this.showPackageTooltip(point);
            }
          }
        }, 100);
      });

      console.log('✅ Plotly interactions setup complete');
    } catch (error) {
      console.error('❌ Error setting up plotly interactions:', error);
    }
  }

  private getPackageIndexFromPoint(point: any): number {
    try {
      const traceName = point.data.name;
      if (traceName && traceName.includes('Palet')) {
        const match = traceName.match(/Palet (\d+)/);
        if (match) {
          const paletId = parseInt(match[1]);
          return this.processedPackages.findIndex(pkg => pkg.id === paletId);
        }
      }
    } catch (error) {
      console.warn('Error getting package index:', error);
    }
    return -1;
  }

  private showPackageTooltip(point: any): void {
    try {
      console.log('Package hover:', point.data.name);
    } catch (error) {
      console.warn('Error showing tooltip:', error);
    }
  }

  // ========================================
  // SAFE RESIZE OBSERVER
  // ========================================

  private setupResizeObserver(): void {
    if (this.isDestroyed || this.resizeObserver) return;

    try {
      this.resizeObserver = new ResizeObserver((entries) => {
        if (this.isDestroyed) return;

        // Debounce resize events aggressively
        if (this.resizeTimeout) {
          clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
          if (this.isDestroyed) return;

          try {
            this.handleResize();
          } catch (error) {
            console.warn('Error in resize handler:', error);
          }
        }, 300); // Increased debounce time
      });

      const element = this.plotlyContainer?.nativeElement;
      if (element) {
        this.resizeObserver.observe(element);
        console.log('✅ Resize observer setup complete');
      }
    } catch (error) {
      console.error('❌ Error setting up resize observer:', error);
    }
  }

  private handleResize(): void {
    if (this.isDestroyed || !this.plotlyInstance) return;

    try {
      if (this.plotlyService.resize) {
        this.plotlyService.resize(this.plotlyInstance);
        console.log('📏 Plot resized');
      }
    } catch (error) {
      console.warn('Error resizing plot:', error);
    }
  }

  // ========================================
  // UI INTERACTION METHODS (Güvenli)
  // ========================================

  toggleFullscreen(): void {
    if (this.isDestroyed) return;

    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  private enterFullscreen(): void {
    if (this.isDestroyed) return;

    try {
      const elem = this.plotlyContainer.nativeElement.closest('.truck-visualization-container');

      if (elem?.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any)?.mozRequestFullScreen) {
        (elem as any).mozRequestFullScreen();
      } else if ((elem as any)?.webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any)?.msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
    } catch (error) {
      console.warn('Error entering fullscreen:', error);
    }
  }

  private exitFullscreen(): void {
    if (this.isDestroyed) return;

    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.warn('Error exiting fullscreen:', error);
    }
  }

  toggleInfoPanel(): void {
    if (this.isDestroyed) return;

    this.infoPanelCollapsed = !this.infoPanelCollapsed;
    this.cdr.detectChanges();
  }

  toggleWireframe(): void {
    if (this.isDestroyed || !this.plotlyInstance) return;

    try {
      this.wireframeMode = !this.wireframeMode;
      if (this.plotlyService.toggleWireframe) {
        this.plotlyService.toggleWireframe(this.plotlyContainer.nativeElement, this.wireframeMode);
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.warn('Error toggling wireframe:', error);
    }
  }

  resetView(): void {
    if (this.isDestroyed) return;

    this.currentView = 'isometric';
    this.setView('isometric');
  }

  setView(viewType: string): void {
    if (this.isDestroyed || !this.plotlyInstance) return;

    try {
      this.currentView = viewType;
      this.viewChanged.emit(viewType);

      // Define camera positions for different views
      const cameraConfigs = {
        front: { eye: { x: 2, y: 0, z: 0.5 } },
        side: { eye: { x: 0, y: 2, z: 0.5 } },
        top: { eye: { x: 0, y: 0, z: 2 } },
        isometric: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
      };

      const config = cameraConfigs[viewType as keyof typeof cameraConfigs];
      if (config && this.plotlyService.updateCamera) {
        this.plotlyService.updateCamera(this.plotlyInstance, config);
      }

      this.cdr.detectChanges();
    } catch (error) {
      console.warn('Error setting view:', error);
    }
  }

  highlightPackage(packageData: PackageData): void {
    if (this.isDestroyed) return;

    try {
      this.highlightedPackage = packageData;
      this.packageSelected.emit(packageData);

      // Highlight in 3D visualization if PlotlyService supports it
      if (this.plotlyService.highlightPackage && this.plotlyInstance) {
        this.plotlyService.highlightPackage(this.plotlyInstance, packageData.id);
      }

      console.log('Package selected:', packageData);
      this.cdr.detectChanges();
    } catch (error) {
      console.warn('Error highlighting package:', error);
    }
  }

  closeHelp(): void {
    if (this.isDestroyed) return;

    this.showHelp = false;
    this.cdr.detectChanges();
  }

  // ========================================
  // Package List Methods
  // ========================================

  getDisplayedPackages(): PackageData[] {
    return this.processedPackages.slice(0, this.displayedPackagesCount);
  }

  getTotalPackages(): number {
    return this.processedPackages.length;
  }

  showMorePackages(): void {
    if (this.isDestroyed) return;

    this.displayedPackagesCount = Math.min(
      this.displayedPackagesCount + 10,
      this.processedPackages.length
    );
    this.cdr.detectChanges();
  }

  trackByPackage(index: number, pkg: PackageData): number {
    return pkg.id;
  }

  getCogScoreClass(): string {
    const score = this.loadingStats.cogScore;
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  }

  // ========================================
  // Utility Methods
  // ========================================

  getPerformanceInfo(): any {
    return {
      packageCount: this.processedPackages.length,
      isFullscreen: this.isFullscreen,
      currentView: this.currentView,
      utilizationRate: this.loadingStats.utilizationRate,
      cogScore: this.loadingStats.cogScore,
      isRendering: this.isRendering,
      isProcessing: this.isProcessing
    };
  }
}
