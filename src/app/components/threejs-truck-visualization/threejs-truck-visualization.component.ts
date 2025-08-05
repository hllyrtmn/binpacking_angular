// threejs-truck-visualization.component.ts
import {
  Component,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

// Plotly component ile aynı interface'leri kullan
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
  mesh?: THREE.Mesh;
}

@Component({
  selector: 'app-threejs-truck-visualization',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="threejs-visualization-container" [class.loading]="isLoading">
      <!-- Three.js Canvas Container -->
      <div #threeContainer
           class="threejs-canvas-container"
           [class.drag-mode]="dragModeEnabled"
           (contextmenu)="$event.preventDefault()">
      </div>

      <!-- Loading Overlay (plotly ile aynı) -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>3D Görselleştirme Hazırlanıyor...</p>
        </div>
      </div>

      <!-- No Data Message (plotly ile aynı) -->
      <div class="no-data-message" *ngIf="!isLoading && (!piecesData || piecesData.length === 0)">
        <div class="no-data-content">
          <div class="empty-icon">🚛</div>
          <h4>Henüz Yükleme Verisi Yok</h4>
          <p>Tır yükleme algoritması çalıştırıldıktan sonra 3D görselleştirme burada görünecek.</p>
        </div>
      </div>

      <!-- Three.js Controls Overlay -->
      <div class="threejs-controls-overlay" *ngIf="showControls && !isLoading && piecesData && piecesData.length > 0">
        <div class="controls-panel">
          <h4>🎮 3D Kontroller</h4>
          <div class="control-buttons">
            <button class="control-btn" [class.active]="dragModeEnabled" (click)="toggleDragMode()">
              {{ dragModeEnabled ? '🤏' : '🖱️' }} {{ dragModeEnabled ? 'Sürükle: AÇIK' : 'Sürükle: KAPALI' }}
            </button>
            <button class="control-btn" [class.active]="wireframeMode" (click)="toggleWireframe()">
              🔳 Wireframe
            </button>
            <button class="control-btn" (click)="resetView()">
              🎯 Reset View
            </button>
            <button class="control-btn" (click)="toggleFullscreen()">
              ⛶ Fullscreen
            </button>
          </div>

          <div class="view-buttons">
            <button class="view-btn" [class.active]="currentView === 'front'" (click)="setView('front')">Ön</button>
            <button class="view-btn" [class.active]="currentView === 'side'" (click)="setView('side')">Yan</button>
            <button class="view-btn" [class.active]="currentView === 'top'" (click)="setView('top')">Üst</button>
            <button class="view-btn" [class.active]="currentView === 'isometric'" (click)="setView('isometric')">3D</button>
          </div>

          <!-- Drag Mode Instructions -->
          <div class="drag-instructions" *ngIf="dragModeEnabled">
            <div class="instruction-text">
              🎯 <strong>Sürükleme Modu Aktif</strong><br>
              <small>Paketleri tıklayıp sürükleyerek hareket ettirin</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Package Info Panel -->
      <div class="package-info-panel" *ngIf="selectedPackage && !isLoading">
        <div class="info-content">
          <h4>📦 Seçili Paket</h4>
          <div class="package-details">
            <div class="detail-row">
              <span class="label">ID:</span>
              <span class="value">{{ selectedPackage.id }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Boyutlar:</span>
              <span class="value">{{ selectedPackage.dimensions }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Ağırlık:</span>
              <span class="value">{{ selectedPackage.weight }} kg</span>
            </div>
            <div class="detail-row">
              <span class="label">Pozisyon:</span>
              <span class="value">({{ selectedPackage.x | number:'1.0-0' }}, {{ selectedPackage.y | number:'1.0-0' }}, {{ selectedPackage.z | number:'1.0-0' }})</span>
            </div>
          </div>

          <!-- Package Actions -->
          <div class="package-actions">
            <button class="action-btn rotate-btn" (click)="rotateSelectedPackage()" title="90° Döndür">
              🔄 Döndür
            </button>
            <button class="action-btn delete-btn" (click)="deleteSelectedPackage()" title="Paketi Sil">
              🗑️ Sil
            </button>
          </div>

          <button class="close-btn" (click)="clearSelection()">✖</button>
        </div>
      </div>

      <!-- Deleted Packages Panel -->
      <div class="deleted-packages-panel" *ngIf="deletedPackages.length > 0 && !isLoading">
        <div class="deleted-content">
          <h4>🗑️ Silinen Paketler ({{ deletedPackages.length }})</h4>
          <div class="deleted-list">
            <div class="deleted-item" *ngFor="let pkg of deletedPackages; trackBy: trackDeletedPackage">
              <div class="deleted-info">
                <span class="deleted-id">#{{ pkg.id }}</span>
                <span class="deleted-dims">{{ pkg.dimensions }}</span>
              </div>
              <button class="restore-btn" (click)="restorePackage(pkg)" title="Paketi Geri Ekle">
                ➕ Ekle
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Overlay -->
      <div class="stats-overlay" *ngIf="showStats && !isLoading && piecesData && piecesData.length > 0">
        <div class="stats-content">
          <div class="stat-item">
            <span class="stat-label">Paketler:</span>
            <span class="stat-value">{{ processedPackages.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">FPS:</span>
            <span class="stat-value" [class]="getFPSClass()">{{ currentFPS }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Triangles:</span>
            <span class="stat-value">{{ triangleCount | number }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .threejs-visualization-container {
      position: relative;
      width: 100%;
      height: 1000px;
      background: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .threejs-canvas-container {
      width: 100%;
      height: 100%;
      position: relative;

      canvas {
        display: block;
        width: 100%;
        height: 100%;
        cursor: default;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }

      &.drag-mode canvas {
        cursor: grab;
      }

      &.drag-mode canvas:active {
        cursor: grabbing;
      }
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;

      .loading-spinner {
        text-align: center;

        .spinner {
          width: 3rem;
          height: 3rem;
          border: 3px solid #e2e8f0;
          border-top-color: #006A6A;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        p {
          color: #666;
          font-weight: 500;
        }
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .no-data-message {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;

      .no-data-content {
        text-align: center;
        color: #666;

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        h4 {
          margin-bottom: 0.5rem;
          color: #006A6A;
        }

        p {
          max-width: 300px;
          line-height: 1.5;
        }
      }
    }

    .threejs-controls-overlay {
      position: absolute;
      top: 1rem;
      left: 1rem;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      padding: 1rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 5;

      h4 {
        margin: 0 0 0.75rem;
        color: #006A6A;
        font-size: 0.875rem;
      }

      .control-buttons {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 0.75rem;

        .control-btn {
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 0.75rem;
          transition: all 0.2s;

          &:hover {
            border-color: #006A6A;
            color: #006A6A;
          }

          &.active {
            background: #006A6A;
            color: white;
            border-color: #006A6A;
          }
        }
      }

      .view-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.25rem;

        .view-btn {
          padding: 0.375rem 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 0.7rem;
          transition: all 0.2s;

          &:hover {
            border-color: #006A6A;
            color: #006A6A;
          }

          &.active {
            background: #006A6A;
            color: white;
            border-color: #006A6A;
          }
        }
      }

      .drag-instructions {
        margin-top: 0.75rem;
        padding: 0.5rem;
        background: rgba(0, 106, 106, 0.1);
        border-radius: 4px;
        border-left: 3px solid #006A6A;

        .instruction-text {
          color: #006A6A;
          font-size: 0.7rem;
          line-height: 1.3;

          strong {
            display: block;
            margin-bottom: 0.25rem;
          }

          small {
            opacity: 0.8;
          }
        }
      }
    }

    .package-info-panel {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      padding: 1rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 5;
      min-width: 200px;

      .info-content {
        position: relative;

        h4 {
          margin: 0 0 0.75rem;
          color: #006A6A;
          font-size: 0.875rem;
        }

        .package-details {
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
            font-size: 0.75rem;

            .label {
              color: #666;
              font-weight: 500;
            }

            .value {
              color: #333;
              font-family: monospace;
            }
          }
        }

        .package-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e2e8f0;

          .action-btn {
            flex: 1;
            padding: 0.5rem;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 0.7rem;
            transition: all 0.2s;

            &.rotate-btn {
              color: #006A6A;
              border-color: #006A6A;

              &:hover {
                background: #006A6A;
                color: white;
              }
            }

            &.delete-btn {
              color: #ef4444;
              border-color: #ef4444;

              &:hover {
                background: #ef4444;
                color: white;
              }
            }
          }
        }

        .close-btn {
          position: absolute;
          top: -0.5rem;
          right: -0.5rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 1.5rem;
          height: 1.5rem;
          cursor: pointer;
          font-size: 0.75rem;
        }
      }
    }

    .deleted-packages-panel {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      padding: 1rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 5;
      min-width: 200px;
      max-width: 250px;

      .deleted-content {
        h4 {
          margin: 0 0 0.75rem;
          color: #ef4444;
          font-size: 0.875rem;
        }

        .deleted-list {
          max-height: 200px;
          overflow-y: auto;

          .deleted-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.5rem;
            margin-bottom: 0.5rem;
            background: #f8f9fa;
            border-radius: 4px;
            border: 1px solid #e2e8f0;

            .deleted-info {
              display: flex;
              flex-direction: column;
              flex: 1;

              .deleted-id {
                font-weight: 600;
                color: #333;
                font-size: 0.75rem;
              }

              .deleted-dims {
                font-size: 0.65rem;
                color: #666;
                font-family: monospace;
              }
            }

            .restore-btn {
              padding: 0.25rem 0.5rem;
              background: #10b981;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 0.65rem;
              transition: all 0.2s;

              &:hover {
                background: #059669;
              }
            }
          }
        }
      }
    }

    .stats-overlay {
      position: absolute;
      bottom: 1rem;
      left: 1rem;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border-radius: 8px;
      padding: 0.75rem;
      z-index: 5;

      .stats-content {
        display: flex;
        gap: 1rem;

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 0.75rem;

          .stat-label {
            opacity: 0.8;
            margin-bottom: 0.25rem;
          }

          .stat-value {
            font-weight: 600;
            font-family: monospace;

            &.good { color: #10b981; }
            &.medium { color: #f59e0b; }
            &.poor { color: #ef4444; }
          }
        }
      }
    }

    @media (max-width: 768px) {
      .threejs-controls-overlay {
        left: 0.5rem;
        right: 0.5rem;
        top: 0.5rem;
        left: 0.5rem;
        width: auto;
      }

      .package-info-panel {
        right: 0.5rem;
        top: auto;
        bottom: 0.5rem;
        left: 0.5rem;
        right: 0.5rem;

        .package-actions {
          .action-btn {
            font-size: 0.65rem;
            padding: 0.4rem;
          }
        }
      }

      .deleted-packages-panel {
        right: 0.5rem;
        bottom: 0.5rem;
        left: 0.5rem;
        max-width: none;

        .deleted-content {
          .deleted-list {
            max-height: 150px;

            .deleted-item {
              padding: 0.4rem;

              .deleted-info {
                .deleted-id {
                  font-size: 0.7rem;
                }

                .deleted-dims {
                  font-size: 0.6rem;
                }
              }

              .restore-btn {
                font-size: 0.6rem;
                padding: 0.2rem 0.4rem;
              }
            }
          }
        }
      }

      .stats-overlay {
        .stats-content {
          flex-direction: column;
          gap: 0.5rem;
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThreeJSTruckVisualizationComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('threeContainer', { static: true }) threeContainer!: ElementRef;

  // Plotly component ile aynı Input/Output interface
  @Input() piecesData: any[] | string = [];
  @Input() truckDimension: number[] = [13200, 2200, 2900];
  @Input() showHelp: boolean = true;

  @Output() packageSelected = new EventEmitter<PackageData>();
  @Output() viewChanged = new EventEmitter<string>();

  // UI State
  isLoading = false;
  dragModeEnabled = false;
  wireframeMode = false;
  currentView = 'isometric';
  showControls = true;
  showStats = true;
  selectedPackage: PackageData | null = null;

  // Performance Stats
  currentFPS = 60;
  triangleCount = 0;

  // Drag & Drop State
  private isDragging = false;
  private draggedPackage: PackageData | null = null;
  private dragPlane!: THREE.Plane;
  private dragIntersectionPoint = new THREE.Vector3();
  private dragOffset = new THREE.Vector3();

  // Three.js Objects
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;

  // Truck and Packages
  private truckGroup!: THREE.Group;
  private packagesGroup!: THREE.Group;
  private truckWireframe!: THREE.LineSegments;

  // Data
  processedPackages: PackageData[] = [];
  deletedPackages: PackageData[] = [];
  private animationFrameId: number | null = null;
  private isDestroyed = false;

  // Color Palette (plotly ile aynı)
  private readonly COLOR_PALETTE = [
    '#006A6A', '#D6BB86', '#004A4A', '#C0A670', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#fbbf24', '#8b5cf6', '#f87171', '#34d399',
    '#60a5fa', '#a78bfa', '#fb7185', '#fde047', '#67e8f9'
  ];

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    console.log('🎬 ThreeJS Truck Visualization initialized');
    this.setupThreeJS();
    this.startRenderLoop();

    // Initial data processing
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.safeProcessData();
      }
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isDestroyed) return;

    if (changes['piecesData'] || changes['truckDimension']) {
      console.log('📊 Data changed, reprocessing...');
      this.safeProcessData();
    }
  }

  ngOnDestroy(): void {
    console.log('🗑️ ThreeJS Truck Visualization destroying...');
    this.isDestroyed = true;
    this.cleanup();
  }

  // ========================================
  // THREE.JS SETUP
  // ========================================

  private setupThreeJS(): void {
    const container = this.threeContainer.nativeElement;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8fafc);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      50000
    );

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Lighting
    this.setupLighting();

    // Controls
    this.setupControls();

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Groups
    this.truckGroup = new THREE.Group();
    this.packagesGroup = new THREE.Group();
    this.scene.add(this.truckGroup);
    this.scene.add(this.packagesGroup);

    // Set initial camera position
    this.setView('isometric');

    console.log('✅ Three.js setup complete');
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);
  }

  private setupControls(): void {
    const canvas = this.renderer.domElement;

    // Mouse events for package interaction and drag&drop
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('click', this.onMouseClick.bind(this));

    // Mouse wheel for zooming
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.zoomCamera(event.deltaY * 0.001);
    });

    // Context menu prevention
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Drag plane for drag&drop operations (horizontal plane at truck floor level)
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }

  // ========================================
  // DATA PROCESSING (Plotly ile aynı format)
  // ========================================

  private safeProcessData(): void {
    if (this.isDestroyed) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      this.processData();
      this.createTruckVisualization();
      this.createPackageVisualization();
      this.updateTriangleCount();
    } catch (error) {
      console.error('❌ Error processing data:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private processData(): void {
    // Plotly ile aynı data processing logic
    const pieces = typeof this.piecesData === 'string'
      ? JSON.parse(this.piecesData)
      : this.piecesData;

    if (!pieces || pieces.length === 0) {
      this.processedPackages = [];
      return;
    }

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

    console.log(`✅ Processed ${this.processedPackages.length} packages`);
  }

  private createTruckVisualization(): void {
    // Clear existing
    this.truckGroup.clear();

    // Create truck wireframe - FIX: Correct coordinate system (Z = height, Y = depth)
    const geometry = new THREE.BoxGeometry(
      this.truckDimension[0], // Length (X)
      this.truckDimension[2], // Height (Y) <- swapped
      this.truckDimension[1]  // Width (Z) <- swapped
    );

    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0x666666,
      linewidth: 2
    });

    this.truckWireframe = new THREE.LineSegments(edges, material);
    this.truckWireframe.position.set(
      this.truckDimension[0] / 2,
      this.truckDimension[2] / 2, // Height <- corrected
      this.truckDimension[1] / 2  // Width <- corrected
    );

    this.truckGroup.add(this.truckWireframe);

    console.log('✅ Truck visualization created with corrected frame');
  }

  private createPackageVisualization(): void {
    // Clear existing
    this.packagesGroup.clear();

    // Create each package with corrected coordinate system
    this.processedPackages.forEach((packageData, index) => {
      const geometry = new THREE.BoxGeometry(
        packageData.length, // X = length
        packageData.height, // Y = height (swapped)
        packageData.width   // Z = width (swapped)
      );

      const material = new THREE.MeshLambertMaterial({
        color: packageData.color,
        transparent: false,
        opacity: 1.0
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Position the package with corrected coordinates
      mesh.position.set(
        packageData.x + packageData.length / 2,
        packageData.z + packageData.height / 2, // Z becomes Y (height)
        packageData.y + packageData.width / 2   // Y becomes Z (depth)
      );

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { packageData, originalPosition: mesh.position.clone() };

      // Store mesh reference
      packageData.mesh = mesh;

      this.packagesGroup.add(mesh);
    });

    console.log(`✅ Created ${this.processedPackages.length} package meshes with corrected coordinates`);
  }

  // ========================================
  // MOUSE INTERACTION & DRAG DROP
  // ========================================

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return; // Only left mouse button

    this.updateMousePosition(event);
    const intersectedPackage = this.getIntersectedPackage();

    if (intersectedPackage && this.dragModeEnabled) {
      // Start dragging
      this.startDragging(intersectedPackage, event);
    } else if (!this.dragModeEnabled) {
      // Start camera rotation
      this.startCameraInteraction(event);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);

    if (this.isDragging && this.draggedPackage) {
      // Continue dragging
      this.continueDragging(event);
    } else if (this.cameraInteraction.active) {
      // Continue camera rotation
      this.continueCameraInteraction(event);
    } else if (!this.dragModeEnabled) {
      // Hover effects
      const intersectedPackage = this.getIntersectedPackage();
      this.updateHoverState(intersectedPackage);
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (this.isDragging) {
      this.stopDragging();
    }
    this.stopCameraInteraction();
  }

  private onMouseClick(event: MouseEvent): void {
    if (this.isDragging) return; // Don't select if we were dragging

    this.updateMousePosition(event);
    const intersectedPackage = this.getIntersectedPackage();

    if (intersectedPackage) {
      this.selectPackage(intersectedPackage);
    } else {
      this.clearSelection();
    }
  }

  // ========================================
  // DRAG & DROP IMPLEMENTATION
  // ========================================

  private startDragging(packageData: PackageData, event: MouseEvent): void {
    this.isDragging = true;
    this.draggedPackage = packageData;

    if (!packageData.mesh) return;

    // Calculate intersection point on drag plane
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersectionPoint);

    // Calculate offset from package center to intersection point
    this.dragOffset.subVectors(packageData.mesh.position, this.dragIntersectionPoint);

    // Visual feedback
    this.highlightDraggedPackage();
    this.renderer.domElement.style.cursor = 'grabbing';

    console.log('🎯 Started dragging package:', packageData.id);
  }

  private continueDragging(event: MouseEvent): void {
    if (!this.isDragging || !this.draggedPackage?.mesh) return;

    // Get intersection point on drag plane
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersectionPoint);

    // Calculate new position with offset
    const newPosition = new THREE.Vector3().addVectors(this.dragIntersectionPoint, this.dragOffset);

    // Apply constraints (keep within truck bounds)
    newPosition.x = Math.max(
      this.draggedPackage.length / 2,
      Math.min(this.truckDimension[0] - this.draggedPackage.length / 2, newPosition.x)
    );
    newPosition.y = Math.max(
      this.draggedPackage.height / 2,
      Math.min(this.truckDimension[2] - this.draggedPackage.height / 2, newPosition.y)
    );
    newPosition.z = Math.max(
      this.draggedPackage.width / 2,
      Math.min(this.truckDimension[1] - this.draggedPackage.width / 2, newPosition.z)
    );

    // NEW: Collision Detection - Check if new position collides with other packages
    const tempPosition = {
      x: newPosition.x - this.draggedPackage.length / 2,
      y: newPosition.z - this.draggedPackage.width / 2,  // Z becomes Y
      z: newPosition.y - this.draggedPackage.height / 2  // Y becomes Z
    };

    if (this.checkCollisionAtPosition(this.draggedPackage, tempPosition)) {
      // Collision detected - don't update position, add visual feedback
      this.showCollisionFeedback();
      return;
    } else {
      this.clearCollisionFeedback();
    }

    // Update mesh position
    this.draggedPackage.mesh.position.copy(newPosition);

    // Update package data coordinates (convert back to original coordinate system)
    this.draggedPackage.x = tempPosition.x;
    this.draggedPackage.y = tempPosition.y;
    this.draggedPackage.z = tempPosition.z;
  }

  private stopDragging(): void {
    if (!this.isDragging || !this.draggedPackage) return;

    console.log('🎯 Stopped dragging package:', this.draggedPackage.id,
               'New position:', this.draggedPackage.x, this.draggedPackage.y, this.draggedPackage.z);

    // Emit position change event
    this.packageSelected.emit(this.draggedPackage);

    // Reset drag state
    this.isDragging = false;
    this.draggedPackage = null;
    this.renderer.domElement.style.cursor = this.dragModeEnabled ? 'grab' : 'default';

    // Clear visual feedback including collision feedback
    this.clearHighlights();
    this.clearCollisionFeedback();

    if (this.selectedPackage) {
      this.highlightSelectedPackage();
    }
  }

  private highlightDraggedPackage(): void {
    if (this.draggedPackage?.mesh) {
      const material = this.draggedPackage.mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0x666666); // Stronger highlight for dragging
      this.draggedPackage.mesh.scale.setScalar(1.1);
    }
  }

  // ========================================
  // CAMERA INTERACTION
  // ========================================

  private cameraInteraction = {
    active: false,
    lastX: 0,
    lastY: 0
  };

  private startCameraInteraction(event: MouseEvent): void {
    this.cameraInteraction.active = true;
    this.cameraInteraction.lastX = event.clientX;
    this.cameraInteraction.lastY = event.clientY;
    this.renderer.domElement.style.cursor = 'grab';
  }

  private continueCameraInteraction(event: MouseEvent): void {
    if (!this.cameraInteraction.active) return;

    const deltaX = event.clientX - this.cameraInteraction.lastX;
    const deltaY = event.clientY - this.cameraInteraction.lastY;

    this.rotateView(deltaX * 0.01, deltaY * 0.01);

    this.cameraInteraction.lastX = event.clientX;
    this.cameraInteraction.lastY = event.clientY;
  }

  private stopCameraInteraction(): void {
    this.cameraInteraction.active = false;
    this.renderer.domElement.style.cursor = this.dragModeEnabled ? 'grab' : 'default';
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectedPackage(): PackageData | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.packagesGroup.children);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      return mesh.userData['packageData'] || null;
    }

    return null;
  }

  private selectPackage(packageData: PackageData): void {
    this.selectedPackage = packageData;
    this.packageSelected.emit(packageData);

    // Visual feedback
    this.highlightSelectedPackage();
    this.cdr.detectChanges();
  }

  clearSelection(): void {
    this.selectedPackage = null;
    this.clearHighlights();
    this.cdr.detectChanges();
  }

  private highlightSelectedPackage(): void {
    this.clearHighlights();

    if (this.selectedPackage?.mesh) {
      const material = this.selectedPackage.mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0x444444);
      this.selectedPackage.mesh.scale.setScalar(1.05);
    }
  }

  private clearHighlights(): void {
    this.processedPackages.forEach(pkg => {
      if (pkg.mesh) {
        const material = pkg.mesh.material as THREE.MeshLambertMaterial;
        material.emissive.setHex(0x000000);
        pkg.mesh.scale.setScalar(1.0);
      }
    });
  }

  private updateHoverState(hoveredPackage: PackageData | null): void {
    this.processedPackages.forEach(pkg => {
      if (pkg.mesh && pkg !== this.selectedPackage) {
        const material = pkg.mesh.material as THREE.MeshLambertMaterial;
        if (pkg === hoveredPackage) {
          material.emissive.setHex(0x222222);
          pkg.mesh.scale.setScalar(1.02);
        } else {
          material.emissive.setHex(0x000000);
          pkg.mesh.scale.setScalar(1.0);
        }
      }
    });
  }

  // ========================================
  // CAMERA CONTROLS
  // ========================================

  setView(viewType: string): void {
    this.currentView = viewType;
    this.viewChanged.emit(viewType);

    const maxDim = Math.max(...this.truckDimension);
    const distance = maxDim * 1.5;

    // Corrected camera positions for proper frame orientation
    switch (viewType) {
      case 'front':
        // Look at front of truck
        this.camera.position.set(distance, this.truckDimension[2] / 2, this.truckDimension[1] / 2);
        break;
      case 'side':
        // Look at side of truck
        this.camera.position.set(this.truckDimension[0] / 2, this.truckDimension[2] / 2, distance);
        break;
      case 'top':
        // Look at top of truck
        this.camera.position.set(this.truckDimension[0] / 2, distance, this.truckDimension[1] / 2);
        break;
      case 'isometric':
      default:
        // 3D isometric view
        this.camera.position.set(distance * 0.4, distance * 0.4, distance * 0.4);
        break;
    }

    // Look at center of truck (corrected coordinates)
    this.camera.lookAt(
      this.truckDimension[0] / 2,
      this.truckDimension[2] / 2, // Height
      this.truckDimension[1] / 2  // Width
    );

    this.cdr.detectChanges();
  }

  private rotateView(deltaX: number, deltaY: number): void {
    // Simple orbit rotation
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(this.camera.position);
    spherical.theta -= deltaX;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - deltaY));

    this.camera.position.setFromSpherical(spherical);
    this.camera.lookAt(
      this.truckDimension[0] / 2,
      this.truckDimension[2] / 2, // Height
      this.truckDimension[1] / 2  // Width
    );
  }

  private zoomCamera(delta: number): void {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.multiplyScalar(delta * 1000);
    this.camera.position.add(direction);
  }

  resetView(): void {
    this.setView('isometric');
  }

  // ========================================
  // UI CONTROLS
  // ========================================

  toggleDragMode(): void {
    this.dragModeEnabled = !this.dragModeEnabled;

    // Update cursor based on drag mode
    if (this.dragModeEnabled) {
      this.renderer.domElement.style.cursor = 'grab';
    } else {
      this.renderer.domElement.style.cursor = 'default';
      // Stop any ongoing drag operation
      if (this.isDragging) {
        this.stopDragging();
      }
    }

    console.log('🖱️ Drag mode:', this.dragModeEnabled ? 'ON' : 'OFF');
    this.cdr.detectChanges();
  }

  toggleWireframe(): void {
    this.wireframeMode = !this.wireframeMode;

    this.processedPackages.forEach(pkg => {
      if (pkg.mesh) {
        const material = pkg.mesh.material as THREE.MeshLambertMaterial;
        material.wireframe = this.wireframeMode;
      }
    });

    this.cdr.detectChanges();
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.threeContainer.nativeElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // ========================================
  // RENDER LOOP
  // ========================================

  private startRenderLoop(): void {
    if (this.isDestroyed) return;

    this.ngZone.runOutsideAngular(() => {
      const animate = () => {
        if (this.isDestroyed) return;

        this.animationFrameId = requestAnimationFrame(animate);
        this.renderer.render(this.scene, this.camera);

        // Update FPS counter
        this.updatePerformanceStats();
      };
      animate();
    });
  }

  private updatePerformanceStats(): void {
    // Simple FPS calculation
    // Bu gerçek bir implementasyon olacak
    this.currentFPS = Math.round(60); // Placeholder
  }

  private updateTriangleCount(): void {
    let count = 0;
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        count += object.geometry.attributes.position.count / 3;
      }
    });
    this.triangleCount = count;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  // ========================================
  // COLLISION DETECTION
  // ========================================

  private checkCollisionAtPosition(packageToCheck: PackageData, newPos: { x: number, y: number, z: number }): boolean {
    // Check collision with all other packages (excluding the one being dragged)
    for (const otherPackage of this.processedPackages) {
      if (otherPackage.id === packageToCheck.id) continue; // Skip self

      // AABB (Axis-Aligned Bounding Box) collision detection
      const collision = this.aabbCollision(
        {
          x: newPos.x,
          y: newPos.y,
          z: newPos.z,
          width: packageToCheck.length,
          height: packageToCheck.width,
          depth: packageToCheck.height
        },
        {
          x: otherPackage.x,
          y: otherPackage.y,
          z: otherPackage.z,
          width: otherPackage.length,
          height: otherPackage.width,
          depth: otherPackage.height
        }
      );

      if (collision) {
        console.log('🚫 Collision detected with package:', otherPackage.id);
        return true;
      }
    }

    return false;
  }

  private aabbCollision(box1: any, box2: any): boolean {
    return (
      box1.x < box2.x + box2.width &&
      box1.x + box1.width > box2.x &&
      box1.y < box2.y + box2.height &&
      box1.y + box1.height > box2.y &&
      box1.z < box2.z + box2.depth &&
      box1.z + box1.depth > box2.z
    );
  }

  private showCollisionFeedback(): void {
    if (this.draggedPackage?.mesh) {
      const material = this.draggedPackage.mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0xff0000); // Red collision feedback
    }
  }

  private clearCollisionFeedback(): void {
    if (this.draggedPackage?.mesh) {
      const material = this.draggedPackage.mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0x666666); // Back to drag highlight
    }
  }

  // ========================================
  // PACKAGE ROTATION
  // ========================================

  rotateSelectedPackage(): void {
    if (!this.selectedPackage?.mesh) return;

    console.log('🔄 Rotating package:', this.selectedPackage.id);

    // Rotate mesh 90 degrees around Y axis
    this.selectedPackage.mesh.rotation.y += Math.PI / 2;

    // Swap dimensions in package data (length <-> width)
    const tempLength = this.selectedPackage.length;
    this.selectedPackage.length = this.selectedPackage.width;
    this.selectedPackage.width = tempLength;

    // Update dimensions string
    this.selectedPackage.dimensions = `${this.selectedPackage.length}×${this.selectedPackage.width}×${this.selectedPackage.height}mm`;

    // Check if rotation causes collision
    if (this.checkCollisionAtPosition(this.selectedPackage, {
      x: this.selectedPackage.x,
      y: this.selectedPackage.y,
      z: this.selectedPackage.z
    })) {
      // Undo rotation if collision
      console.log('🚫 Rotation would cause collision, undoing...');
      this.selectedPackage.mesh.rotation.y -= Math.PI / 2;

      // Swap back dimensions
      const tempLength2 = this.selectedPackage.length;
      this.selectedPackage.length = this.selectedPackage.width;
      this.selectedPackage.width = tempLength2;
      this.selectedPackage.dimensions = `${this.selectedPackage.length}×${this.selectedPackage.width}×${this.selectedPackage.height}mm`;

      // Show user feedback
      this.showRotationError();
    } else {
      // Successful rotation
      this.packageSelected.emit(this.selectedPackage);
      this.cdr.detectChanges();
    }
  }

  private showRotationError(): void {
    // Temporary red highlight to show rotation failed
    if (this.selectedPackage?.mesh) {
      const material = this.selectedPackage.mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0xff0000);

      setTimeout(() => {
        if (this.selectedPackage?.mesh) {
          material.emissive.setHex(0x444444); // Back to selection highlight
        }
      }, 500);
    }
  }

  // ========================================
  // PACKAGE DELETE/RESTORE SYSTEM
  // ========================================

  deleteSelectedPackage(): void {
    if (!this.selectedPackage) return;

    console.log('🗑️ Deleting package:', this.selectedPackage.id);

    // Remove from active packages
    const index = this.processedPackages.findIndex(pkg => pkg.id === this.selectedPackage!.id);
    if (index > -1) {
      const deletedPackage = this.processedPackages.splice(index, 1)[0];

      // Remove mesh from scene
      if (deletedPackage.mesh) {
        this.packagesGroup.remove(deletedPackage.mesh);
      }

      // Add to deleted packages
      this.deletedPackages.push(deletedPackage);

      // Clear selection
      this.selectedPackage = null;

      console.log(`✅ Package ${deletedPackage.id} deleted. ${this.deletedPackages.length} packages in trash.`);
      this.cdr.detectChanges();
    }
  }

  restorePackage(packageData: PackageData): void {
    console.log('➕ Restoring package:', packageData.id);

    // Remove from deleted packages
    const index = this.deletedPackages.findIndex(pkg => pkg.id === packageData.id);
    if (index > -1) {
      this.deletedPackages.splice(index, 1);
    }

    // Find a valid position for the restored package
    const validPosition = this.findValidPosition(packageData);

    if (validPosition) {
      // Update package position
      packageData.x = validPosition.x;
      packageData.y = validPosition.y;
      packageData.z = validPosition.z;

      // Recreate mesh with new position
      this.recreatePackageMesh(packageData);

      // Add back to active packages
      this.processedPackages.push(packageData);

      console.log(`✅ Package ${packageData.id} restored at position (${validPosition.x}, ${validPosition.y}, ${validPosition.z})`);
    } else {
      // No valid position found, keep in deleted list
      this.deletedPackages.push(packageData);
      console.log('🚫 No valid position found for package restoration');
    }

    this.cdr.detectChanges();
  }

  private findValidPosition(packageData: PackageData): { x: number, y: number, z: number } | null {
    // Try to find a valid position starting from truck corner
    const stepSize = 100; // mm steps
    const maxAttempts = 1000;
    let attempts = 0;

    for (let x = 0; x <= this.truckDimension[0] - packageData.length; x += stepSize) {
      for (let y = 0; y <= this.truckDimension[1] - packageData.width; y += stepSize) {
        for (let z = 0; z <= this.truckDimension[2] - packageData.height; z += stepSize) {
          attempts++;
          if (attempts > maxAttempts) break;

          const testPosition = { x, y, z };

          if (!this.checkCollisionAtPosition(packageData, testPosition)) {
            return testPosition;
          }
        }
        if (attempts > maxAttempts) break;
      }
      if (attempts > maxAttempts) break;
    }

    return null; // No valid position found
  }

  private recreatePackageMesh(packageData: PackageData): void {
    // Create new geometry
    const geometry = new THREE.BoxGeometry(
      packageData.length, // X = length
      packageData.height, // Y = height (swapped)
      packageData.width   // Z = width (swapped)
    );

    const material = new THREE.MeshLambertMaterial({
      color: packageData.color,
      transparent: false,
      opacity: 1.0
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Position the package with corrected coordinates
    mesh.position.set(
      packageData.x + packageData.length / 2,
      packageData.z + packageData.height / 2, // Z becomes Y (height)
      packageData.y + packageData.width / 2   // Y becomes Z (depth)
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { packageData, originalPosition: mesh.position.clone() };

    // Store mesh reference
    packageData.mesh = mesh;

    // Add to scene
    this.packagesGroup.add(mesh);
  }

  trackDeletedPackage(index: number, item: PackageData): any {
    return item.id;
  }

  getFPSClass(): string {
    if (this.currentFPS >= 50) return 'good';
    if (this.currentFPS >= 30) return 'medium';
    return 'poor';
  }

  private cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      const canvas = this.renderer.domElement;
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }

    // Dispose geometries and materials
    this.processedPackages.forEach(pkg => {
      if (pkg.mesh) {
        pkg.mesh.geometry.dispose();
        (pkg.mesh.material as THREE.Material).dispose();
      }
    });

    console.log('✅ Three.js cleanup complete');
  }
}
