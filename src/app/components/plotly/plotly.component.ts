// truck-loading.component.ts
import { Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlotlyService } from '../../services/plotly.service';


@Component({
  selector: 'app-plotly',
  imports: [CommonModule],
  templateUrl: './plotly.component.html',
  styleUrl: './plotly.component.scss'
})

export class PlotlyVisualizationComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('plotlyContainer', { static: true }) plotlyContainer!: ElementRef;

  @Input() piecesData: any[] | string = [];
  @Input() truckDimension: number[] = [12000, 2400, 2900]; // Default dimensions if not provided

  isFullscreen = false;
  private colorIndex: any;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private plotlyService: PlotlyService
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

    this.resizeObserver.observe(this.plotlyContainer.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-render if input data changes
    if (changes['piecesData'] || changes['truckDimension']) {
      this.renderVisualization();
    }
  }

  ngOnDestroy(): void {
    // Tam ekrandan çık
    if (this.isFullscreen) {
      this.exitFullscreen();
    }

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
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

  private enterFullscreen(): void {
    const elem = this.plotlyContainer.nativeElement;

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
    const element = this.plotlyContainer.nativeElement;

    // Make sure the element exists and has dimensions
    if (!element || !element.offsetWidth) {
      setTimeout(() => this.renderVisualization(), 100);
      return;
    }

    // Convert string data to array if needed
    const pieces = typeof this.piecesData === 'string'
      ? JSON.parse(this.piecesData)
      : this.piecesData;

    // Sadece veri varsa görselleştirmeyi oluştur
    if (pieces && pieces.length > 0) {
      this.colorIndex = this.plotlyService.drawSolution(
        element,
        pieces,
        this.truckDimension
      );
    }
  }

  private handleResize(): void {
    // Re-render on container resize to maintain responsive behavior
    this.renderVisualization();
  }
}
