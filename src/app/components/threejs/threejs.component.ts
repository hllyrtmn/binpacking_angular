import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ThreejsService } from '../../services/threejs.service';

@Component({
  selector: 'app-threejs',
  imports: [CommonModule],
  templateUrl: './threejs.component.html',
  styleUrl: './threejs.component.scss'
})
export class ThreejsVisualizationComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('threejsContainer', { static: true }) threejsContainer!: ElementRef;

  @Input() piecesData: any[] | string = [];
  @Input() truckDimension: number[] = [12000, 2400, 2900]; // Default dimensions if not provided

  isFullscreen = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private threejsService: ThreejsService
  ) { }

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
    // Tarayıcının tam ekran durumunu kontrol et
    this.isFullscreen = !!document.fullscreenElement ||
                       !!(document as any).webkitFullscreenElement ||
                       !!(document as any).mozFullScreenElement ||
                       !!(document as any).msFullscreenElement;
  }

  ngOnInit(): void {
    this.renderVisualization();

    // Set up a resize observer to handle responsive behavior
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });

    this.resizeObserver.observe(this.threejsContainer.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-render if input data changes
    if (changes['piecesData'] || changes['truckDimension']) {
      this.renderVisualization();
    }
  }

  ngOnDestroy(): void {
    // Önce animasyon ve olay dinleyicilerini temizle
    try {
      // Tam ekrandan çık
      if (this.isFullscreen) {
        this.exitFullscreen();
      }

      // ResizeObserver'ı kaldır
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }

      // Servisi temizle
      if (this.threejsService) {
        this.threejsService.dispose();
      }
    } catch (error) {
      console.error('ThreejsVisualizationComponent: Error during cleanup', error);
    }
  }

  // Tam ekran modunu aç/kapat
  toggleFullscreen(): void {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

    // Yeni sekmede aç
    openInNewTab(): void {
      if (this.piecesData && this.piecesData.length > 0) {
        const pieces = typeof this.piecesData === 'string'
          ? JSON.parse(this.piecesData)
          : this.piecesData;

        this.threejsService.openInNewTab(pieces, this.truckDimension);
      }
    }

  private enterFullscreen(): void {
    const elem = this.threejsContainer.nativeElement;

    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).mozRequestFullScreen) { // Firefox
      (elem as any).mozRequestFullScreen();
    } else if ((elem as any).webkitRequestFullscreen) { // Chrome, Safari ve Opera
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) { // IE/Edge
      (elem as any).msRequestFullscreen();
    }
  }

  private exitFullscreen(): void {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }

  private renderVisualization(): void {
    try {
      const element = this.threejsContainer?.nativeElement;
      if (!element) {
        console.warn('Container element not found');
        return;
      }

      // Make sure the element exists and has dimensions
      if (!element.offsetWidth || !element.offsetHeight) {
        // Yeniden deneme mekanizması
        setTimeout(() => this.renderVisualization(), 100);
        return;
      }

      // Convert string data to array if needed
      let pieces;
      try {
        pieces = typeof this.piecesData === 'string'
          ? JSON.parse(this.piecesData)
          : this.piecesData;
      } catch (e) {
        console.error('Failed to parse pieces data:', e);
        return;
      }

      // Sadece veri varsa görselleştirmeyi oluştur
      if (pieces && pieces.length > 0 && this.threejsService) {
        this.threejsService.drawSolution(
          element,
          pieces,
          this.truckDimension
        );
      }
    } catch (error) {
      console.error('Error during visualization rendering:', error);
    }
  }

  private handleResize(): void {
    // Element varlığını ve boyutunu kontrol et
    const element = this.threejsContainer?.nativeElement;
    if (!element) {
      console.warn('ThreejsVisualizationComponent: Container element not found');
      return;
    }

    // Boyut kontrolü
    if (!element.offsetWidth || !element.offsetHeight) {
      console.warn('ThreejsVisualizationComponent: Container has zero dimensions');
      return;
    }

    // Servis varlığını kontrol et
    if (!this.threejsService) {
      console.warn('ThreejsVisualizationComponent: Service not available');
      return;
    }

    // Resize çağır
    try {
      this.threejsService.resize(element.offsetWidth, element.offsetHeight);
    } catch (error) {
      console.error('ThreejsVisualizationComponent: Error during resize', error);
    }
  }
}
