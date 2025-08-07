// threejs-truck-visualization.component.ts - ENHANCED VERSION
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
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';

// Enhanced package interface
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
  originalPosition?: THREE.Vector3;
  isBeingDragged?: boolean;
}

@Component({
  selector: 'app-threejs-truck-visualization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './threejs-truck-visualization.component.html',
  styleUrl: './threejs-truck-visualization.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThreeJSTruckVisualizationComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('threeContainer', { static: true }) threeContainer!: ElementRef;

  @Input() piecesData: any[] | string = [];
  @Input() truckDimension: number[] = [13200, 2200, 2900];
  @Input() showHelp: boolean = true;

  @Output() packageSelected = new EventEmitter<PackageData>();
  @Output() viewChanged = new EventEmitter<string>();
  @Output() dataChanged = new EventEmitter<any[]>(); // NEW: Emit updated data

  // Enhanced UI State (Grid removed)
  isLoading = false;
  dragModeEnabled = false;
  wireframeMode = false;
  currentView = 'isometric';
  showControls = true;
  showStats = true;
  selectedPackage: PackageData | null = null;
  showCollisionWarning = false;

  // Enhanced Zoom System
  minZoom = 25;
  maxZoom = 300;
  zoomLevel = 100;

  // Enhanced Performance Stats
  currentFPS = 60;
  triangleCount = 0;
  originalPackageCount = 0;

  // Enhanced Drag & Drop State (Simplified)
  private isDragging = false;
  private draggedPackage: PackageData | null = null;
  private dragPlane!: THREE.Plane;
  private dragIntersectionPoint = new THREE.Vector3();
  private dragOffset = new THREE.Vector3();
  private lastValidPosition = new THREE.Vector3();

  // Three.js Objects
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;

  // Enhanced Groups
  private truckGroup!: THREE.Group;
  private packagesGroup!: THREE.Group;
  private truckWireframe!: THREE.LineSegments;

  // Enhanced Data
  processedPackages: PackageData[] = [];
  deletedPackages: PackageData[] = [];
  private animationFrameId: number | null = null;
  private isDestroyed = false;
  private lastUpdateTime = 0;
  private frameCount = 0;

  // Updated Color Palette (Theme-based)
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
    console.log('🎬 Enhanced ThreeJS Truck Visualization initialized');
    this.setupThreeJS();
    this.startRenderLoop();

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
    console.log('🗑️ Enhanced ThreeJS Truck Visualization destroying...');
    this.isDestroyed = true;
    this.cleanup();
  }

  // ========================================
  // ENHANCED THREE.JS SETUP
  // ========================================

  private setupThreeJS(): void {
    const container = this.threeContainer.nativeElement;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8fafc);

    // Enhanced Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      100000
    );

    // Enhanced Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Enhanced Lighting
    this.setupEnhancedLighting();

    // Enhanced Controls
    this.setupEnhancedControls();

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

    console.log('✅ Enhanced Three.js setup complete');
  }

  private setupEnhancedLighting(): void {
    // Enhanced ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // Enhanced directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(200, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; // Reduced for performance
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Additional fill lights
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight1.position.set(-100, 100, -100);
    this.scene.add(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
    fillLight2.position.set(100, -50, 100);
    this.scene.add(fillLight2);
  }

  // ========================================
  // ENHANCED DRAG & DROP (Simplified)
  // ========================================

  private setupEnhancedControls(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('click', this.onMouseClick.bind(this));

    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.handleWheelZoom(event.deltaY * 0.001);
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }

  private continueDragging(event: MouseEvent): void {
    if (!this.isDragging || !this.draggedPackage?.mesh) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersectionPoint);

    const newPosition = new THREE.Vector3().addVectors(this.dragIntersectionPoint, this.dragOffset);

    // Apply truck bounds constraints
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

    // Enhanced: Collision detection
    const tempPosition = {
      x: newPosition.x - this.draggedPackage.length / 2,
      y: newPosition.z - this.draggedPackage.width / 2,
      z: newPosition.y - this.draggedPackage.height / 2
    };

    if (this.checkEnhancedCollision(this.draggedPackage, tempPosition)) {
      this.showCollisionFeedback();
      return;
    } else {
      this.clearCollisionFeedback();
      this.lastValidPosition.copy(newPosition);
    }

    // Update mesh position
    this.draggedPackage.mesh.position.copy(newPosition);

    // Update package data coordinates
    this.draggedPackage.x = tempPosition.x;
    this.draggedPackage.y = tempPosition.y;
    this.draggedPackage.z = tempPosition.z;

    // NEW: Emit data change
    this.emitDataChange();
  }

  // NEW: Emit updated data
  private emitDataChange(): void {
    const updatedData = this.processedPackages.map(pkg => [
      pkg.x, pkg.y, pkg.z, pkg.length, pkg.width, pkg.height, pkg.id, pkg.weight
    ]);
    this.dataChanged.emit(updatedData);
  }

  // Enhanced: Better collision detection (Fixed for multiple deletions)
  private checkEnhancedCollision(packageToCheck: PackageData, newPos: { x: number, y: number, z: number }): boolean {
    const tolerance = 1;

    for (const otherPackage of this.processedPackages) {
      if (otherPackage.id === packageToCheck.id || !otherPackage.mesh) continue;

      const collision = this.aabbCollisionWithTolerance(
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
        },
        tolerance
      );

      if (collision) {
        console.log('🚫 Enhanced collision detected with package:', otherPackage.id);
        return true;
      }
    }

    return false;
  }

  private aabbCollisionWithTolerance(box1: any, box2: any, tolerance: number = 0): boolean {
    return (
      box1.x < box2.x + box2.width + tolerance &&
      box1.x + box1.width + tolerance > box2.x &&
      box1.y < box2.y + box2.height + tolerance &&
      box1.y + box1.height + tolerance > box2.y &&
      box1.z < box2.z + box2.depth + tolerance &&
      box1.z + box1.depth + tolerance > box2.z
    );
  }

  // ========================================
  // ENHANCED ZOOM CONTROLS
  // ========================================

  private handleWheelZoom(delta: number): void {
    const zoomSpeed = 15;
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel - delta * zoomSpeed));
    this.setZoomLevel(newZoom);
  }

  setZoomLevel(value: number): void {
    try {
      this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, Math.round(value)));

      const maxDim = Math.max(...this.truckDimension);
      const baseDistance = maxDim * 1.5;
      const scaleFactor = (100 / this.zoomLevel);
      const distance = baseDistance * scaleFactor;

      const direction = new THREE.Vector3();
      direction.subVectors(this.camera.position, this.getCameraTarget()).normalize();

      const newPosition = new THREE.Vector3().addVectors(
        this.getCameraTarget(),
        direction.multiplyScalar(distance)
      );

      this.camera.position.copy(newPosition);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Zoom error:', error);
    }
  }

  setZoomLevelFromInput(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.setZoomLevel(value);
  }

  private getCameraTarget(): THREE.Vector3 {
    return new THREE.Vector3(
      this.truckDimension[0] / 2,
      this.truckDimension[2] / 2,
      this.truckDimension[1] / 2
    );
  }

  zoomIn(): void {
    this.setZoomLevel(Math.min(this.maxZoom, this.zoomLevel + 25));
  }

  zoomOut(): void {
    this.setZoomLevel(Math.max(this.minZoom, this.zoomLevel - 25));
  }

  // ========================================
  // ENHANCED PACKAGE RESTORE SYSTEM (Fixed)
  // ========================================

  restorePackage(packageData: PackageData): void {
    console.log('➕ Enhanced restore for package:', packageData.id);

    const index = this.deletedPackages.findIndex(pkg => pkg.id === packageData.id);
    if (index > -1) {
      this.deletedPackages.splice(index, 1);
    }

    // Find valid position with better algorithm
    const validPosition = this.findBetterValidPosition(packageData);

    if (validPosition) {
      packageData.x = validPosition.x;
      packageData.y = validPosition.y;
      packageData.z = validPosition.z;

      this.recreateEnhancedPackageMesh(packageData);
      this.processedPackages.push(packageData);

      console.log(`✅ Package ${packageData.id} restored at position (${validPosition.x}, ${validPosition.y}, ${validPosition.z})`);
      this.showSuccessMessage('Paket başarıyla geri eklendi!');

      // NEW: Emit data change
      this.emitDataChange();
    } else {
      this.deletedPackages.push(packageData);
      this.showErrorMessage('Paket için uygun pozisyon bulunamadı. Daha fazla alan yaratmayı deneyin.');
    }

    this.cdr.detectChanges();
  }

  // Fixed: Better position finding algorithm
  private findBetterValidPosition(packageData: PackageData): { x: number, y: number, z: number } | null {
    // Strategy 1: Try original position first
    const originalPos = { x: packageData.x, y: packageData.y, z: packageData.z };
    if (!this.checkEnhancedCollision(packageData, originalPos)) {
      return originalPos;
    }

    // Strategy 2: Systematic search with smaller steps
    const stepSize = 10; // Smaller step size
    const maxAttempts = 5000;
    let attempts = 0;

    for (let x = 0; x <= this.truckDimension[0] - packageData.length; x += stepSize) {
      for (let y = 0; y <= this.truckDimension[1] - packageData.width; y += stepSize) {
        for (let z = 0; z <= this.truckDimension[2] - packageData.height; z += stepSize) {
          attempts++;
          if (attempts > maxAttempts) break;

          const testPosition = { x, y, z };
          if (!this.checkEnhancedCollision(packageData, testPosition)) {
            return testPosition;
          }
        }
      }
    }

    // Strategy 3: Try stacking positions
    return this.findStackingPosition(packageData);
  }

  private findStackingPosition(packageData: PackageData): { x: number, y: number, z: number } | null {
    for (const existingPkg of this.processedPackages) {
      if (!existingPkg.mesh) continue;

      const stackX = existingPkg.x;
      const stackY = existingPkg.y;
      const stackZ = existingPkg.z + existingPkg.height + 5; // Small gap

      if (stackZ + packageData.height <= this.truckDimension[2]) {
        const testPosition = { x: stackX, y: stackY, z: stackZ };

        if (!this.checkEnhancedCollision(packageData, testPosition)) {
          return testPosition;
        }
      }
    }

    return null;
  }

  private recreateEnhancedPackageMesh(packageData: PackageData): void {
    if (packageData.mesh) {
      this.packagesGroup.remove(packageData.mesh);
      packageData.mesh.geometry.dispose();
      (packageData.mesh.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BoxGeometry(
      packageData.length,
      packageData.height,
      packageData.width
    );

    const material = new THREE.MeshLambertMaterial({
      color: packageData.color,
      transparent: false,
      opacity: 1.0
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(
      packageData.x + packageData.length / 2,
      packageData.z + packageData.height / 2,
      packageData.y + packageData.width / 2
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { packageData, originalPosition: mesh.position.clone() };

    packageData.mesh = mesh;
    this.packagesGroup.add(mesh);
  }

  // ========================================
  // ENHANCED UI METHODS
  // ========================================

  restoreAllPackages(): void {
    const packagesToRestore = [...this.deletedPackages];
    let restoredCount = 0;

    // Clear deleted packages first to avoid conflicts
    this.deletedPackages = [];

    for (const pkg of packagesToRestore) {
      const position = this.findBetterValidPosition(pkg);
      if (position) {
        pkg.x = position.x;
        pkg.y = position.y;
        pkg.z = position.z;

        this.recreateEnhancedPackageMesh(pkg);
        this.processedPackages.push(pkg);
        restoredCount++;
      } else {
        // Re-add to deleted if can't restore
        this.deletedPackages.push(pkg);
      }
    }

    if (restoredCount > 0) {
      this.showSuccessMessage(`${restoredCount} paket başarıyla geri eklendi!`);
      this.emitDataChange();
    } else {
      this.showErrorMessage('Hiçbir paket için uygun pozisyon bulunamadı.');
    }

    this.cdr.detectChanges();
  }

  clearAllDeleted(): void {
    const count = this.deletedPackages.length;
    this.deletedPackages = [];
    this.showSuccessMessage(`${count} silinen paket temizlendi.`);
    this.cdr.detectChanges();
  }

  // ========================================
  // ENHANCED FEEDBACK SYSTEM
  // ========================================

  private showCollisionFeedback(): void {
    this.showCollisionWarning = true;

    if (this.draggedPackage?.mesh) {
      const material = this.draggedPackage.mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0xff0000);
    }

    setTimeout(() => {
      this.showCollisionWarning = false;
      this.cdr.detectChanges();
    }, 2000);
  }

  private clearCollisionFeedback(): void {
    this.showCollisionWarning = false;

    if (this.draggedPackage?.mesh) {
      const material = this.draggedPackage.mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0x666666);
    }
  }

  private showSuccessMessage(message: string): void {
    console.log('✅', message);
  }

  private showErrorMessage(message: string): void {
    console.log('❌', message);
  }

  // ========================================
  // DATA PROCESSING
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
    const pieces = typeof this.piecesData === 'string'
      ? JSON.parse(this.piecesData)
      : this.piecesData;

    if (!pieces || pieces.length === 0) {
      this.processedPackages = [];
      this.originalPackageCount = 0;
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
      dimensions: `${piece[3] || 0}×${piece[4] || 0}×${piece[5] || 0}mm`,
      isBeingDragged: false
    }));

    this.originalPackageCount = this.processedPackages.length;
    console.log(`✅ Processed ${this.processedPackages.length} packages`);
  }

  private createTruckVisualization(): void {
    this.truckGroup.clear();

    const geometry = new THREE.BoxGeometry(
      this.truckDimension[0],
      this.truckDimension[2],
      this.truckDimension[1]
    );

    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0x666666,
      linewidth: 3
    });

    this.truckWireframe = new THREE.LineSegments(edges, material);
    this.truckWireframe.position.set(
      this.truckDimension[0] / 2,
      this.truckDimension[2] / 2,
      this.truckDimension[1] / 2
    );

    this.truckGroup.add(this.truckWireframe);

    console.log('✅ Enhanced truck visualization created');
  }

  private createPackageVisualization(): void {
    this.packagesGroup.clear();

    this.processedPackages.forEach((packageData) => {
      this.recreateEnhancedPackageMesh(packageData);
    });

    console.log(`✅ Created ${this.processedPackages.length} enhanced package meshes`);
  }

  // ========================================
  // MOUSE INTERACTION HANDLERS
  // ========================================

  private cameraInteraction = {
    active: false,
    lastX: 0,
    lastY: 0
  };

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.updateMousePosition(event);
    const intersectedPackage = this.getIntersectedPackage();

    if (intersectedPackage && this.dragModeEnabled) {
      this.startDragging(intersectedPackage, event);
    } else if (!this.dragModeEnabled) {
      this.startCameraInteraction(event);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);

    if (this.isDragging && this.draggedPackage) {
      this.continueDragging(event);
    } else if (this.cameraInteraction.active) {
      this.continueCameraInteraction(event);
    } else if (!this.dragModeEnabled) {
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
    if (this.isDragging) return;

    this.updateMousePosition(event);
    const intersectedPackage = this.getIntersectedPackage();

    if (intersectedPackage) {
      this.selectPackage(intersectedPackage);
    } else {
      this.clearSelection();
    }
  }

  private startDragging(packageData: PackageData, event: MouseEvent): void {
    this.isDragging = true;
    this.draggedPackage = packageData;
    packageData.isBeingDragged = true;

    if (!packageData.mesh) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersectionPoint);

    this.dragOffset.subVectors(packageData.mesh.position, this.dragIntersectionPoint);
    this.lastValidPosition.copy(packageData.mesh.position);

    this.highlightDraggedPackage();
    this.renderer.domElement.style.cursor = 'grabbing';

    console.log('🎯 Started enhanced dragging package:', packageData.id);
  }

  private stopDragging(): void {
    if (!this.isDragging || !this.draggedPackage) return;

    console.log('🎯 Stopped enhanced dragging package:', this.draggedPackage.id);

    this.draggedPackage.isBeingDragged = false;
    this.packageSelected.emit(this.draggedPackage);

    this.isDragging = false;
    this.draggedPackage = null;
    this.renderer.domElement.style.cursor = this.dragModeEnabled ? 'grab' : 'default';

    this.clearHighlights();
    this.clearCollisionFeedback();

    if (this.selectedPackage) {
      this.highlightSelectedPackage();
    }
  }

  private highlightDraggedPackage(): void {
    if (this.draggedPackage?.mesh) {
      const material = this.draggedPackage.mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0x666666);
      this.draggedPackage.mesh.scale.setScalar(1.1);
    }
  }

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
      if (pkg.mesh && !pkg.isBeingDragged) {
        const material = pkg.mesh.material as THREE.MeshLambertMaterial;
        material.emissive.setHex(0x000000);
        pkg.mesh.scale.setScalar(1.0);
      }
    });
  }

  private updateHoverState(hoveredPackage: PackageData | null): void {
    this.processedPackages.forEach(pkg => {
      if (pkg.mesh && pkg !== this.selectedPackage && !pkg.isBeingDragged) {
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
    const distance = maxDim * (this.zoomLevel / 100) * 1.5;

    switch (viewType) {
      case 'front':
        this.camera.position.set(distance, this.truckDimension[2] / 2, this.truckDimension[1] / 2);
        break;
      case 'side':
        this.camera.position.set(this.truckDimension[0] / 2, this.truckDimension[2] / 2, distance);
        break;
      case 'top':
        this.camera.position.set(this.truckDimension[0] / 2, distance, this.truckDimension[1] / 2);
        break;
      case 'isometric':
      default:
        this.camera.position.set(distance * 0.4, distance * 0.4, distance * 0.4);
        break;
    }

    this.camera.lookAt(this.getCameraTarget());
    this.cdr.detectChanges();
  }

  private rotateView(deltaX: number, deltaY: number): void {
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(this.camera.position.clone().sub(this.getCameraTarget()));
    spherical.theta -= deltaX;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - deltaY));

    this.camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(this.getCameraTarget()));
    this.camera.lookAt(this.getCameraTarget());
  }

  resetView(): void {
    this.zoomLevel = 100;
    this.setView('isometric');
  }

  // ========================================
  // UI CONTROL METHODS
  // ========================================

  toggleDragMode(): void {
    this.dragModeEnabled = !this.dragModeEnabled;

    if (this.dragModeEnabled) {
      this.renderer.domElement.style.cursor = 'grab';
    } else {
      this.renderer.domElement.style.cursor = 'default';
      if (this.isDragging) {
        this.stopDragging();
      }
    }

    console.log('🖱️ Enhanced drag mode:', this.dragModeEnabled ? 'ON' : 'OFF');
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

  rotateSelectedPackage(): void {
    if (!this.selectedPackage?.mesh) return;

    console.log('🔄 Enhanced rotating package:', this.selectedPackage.id);

    this.selectedPackage.mesh.rotation.y += Math.PI / 2;

    const tempLength = this.selectedPackage.length;
    this.selectedPackage.length = this.selectedPackage.width;
    this.selectedPackage.width = tempLength;

    this.selectedPackage.dimensions = `${this.selectedPackage.length}×${this.selectedPackage.width}×${this.selectedPackage.height}mm`;

    if (this.checkEnhancedCollision(this.selectedPackage, {
      x: this.selectedPackage.x,
      y: this.selectedPackage.y,
      z: this.selectedPackage.z
    })) {
      console.log('🚫 Enhanced rotation would cause collision, undoing...');
      this.selectedPackage.mesh.rotation.y -= Math.PI / 2;

      const tempLength2 = this.selectedPackage.length;
      this.selectedPackage.length = this.selectedPackage.width;
      this.selectedPackage.width = tempLength2;
      this.selectedPackage.dimensions = `${this.selectedPackage.length}×${this.selectedPackage.width}×${this.selectedPackage.height}mm`;

      this.showErrorMessage('Döndürme işlemi çarpışma yaratacağı için iptal edildi.');
    } else {
      this.packageSelected.emit(this.selectedPackage);
      this.emitDataChange(); // NEW: Emit data change
      this.showSuccessMessage('Paket başarıyla döndürüldü.');
      this.cdr.detectChanges();
    }
  }

  deleteSelectedPackage(): void {
    if (!this.selectedPackage) return;

    console.log('🗑️ Enhanced deleting package:', this.selectedPackage.id);

    const index = this.processedPackages.findIndex(pkg => pkg.id === this.selectedPackage!.id);
    if (index > -1) {
      const deletedPackage = this.processedPackages.splice(index, 1)[0];

      if (deletedPackage.mesh) {
        this.packagesGroup.remove(deletedPackage.mesh);
      }

      this.deletedPackages.push(deletedPackage);
      this.selectedPackage = null;

      console.log(`✅ Package ${deletedPackage.id} deleted. ${this.deletedPackages.length} packages in trash.`);
      this.showSuccessMessage('Paket silinen paketler listesine eklendi.');
      this.emitDataChange(); // NEW: Emit data change
      this.cdr.detectChanges();
    }
  }

  // ========================================
  // PERFORMANCE OPTIMIZED RENDER LOOP
  // ========================================

  private startRenderLoop(): void {
    if (this.isDestroyed) return;

    this.ngZone.runOutsideAngular(() => {
      const animate = (currentTime: number) => {
        if (this.isDestroyed) return;

        this.animationFrameId = requestAnimationFrame(animate);

        // Performance optimization: Only render when needed
        if (this.isDragging || this.cameraInteraction.active || (currentTime - this.lastUpdateTime) > 16) {
          this.renderer.render(this.scene, this.camera);
          this.updatePerformanceStats(currentTime);
          this.lastUpdateTime = currentTime;
        }
      };
      animate(0);
    });
  }

  private updatePerformanceStats(currentTime: number): void {
    this.frameCount++;
    if (this.frameCount % 60 === 0) {
      this.currentFPS = Math.round(1000 / (currentTime / this.frameCount));
      this.frameCount = 0;
    }
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

    this.processedPackages.forEach(pkg => {
      if (pkg.mesh) {
        pkg.mesh.geometry.dispose();
        (pkg.mesh.material as THREE.Material).dispose();
      }
    });

    console.log('✅ Enhanced Three.js cleanup complete');
  }

  private safeUpdateUI(): void {
    if (this.isDestroyed) return;

    try {
      this.cdr.detectChanges();
    } catch (error) {
      console.warn('UI update error:', error);
    }
  }
}
