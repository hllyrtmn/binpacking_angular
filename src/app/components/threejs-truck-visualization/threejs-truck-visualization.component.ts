// threejs-truck-visualization.component.ts - SMOOTH DRAG & NO UI FLICKERING
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
  // FIXED: Remove OnPush to prevent UI flickering
  changeDetection: ChangeDetectionStrategy.Default
})
export class ThreeJSTruckVisualizationComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('threeContainer', { static: true }) threeContainer!: ElementRef;

  @Input() piecesData: any[] | string = [];
  @Input() truckDimension: number[] = [13200, 2200, 2900];
  @Input() showHelp: boolean = true;

  @Output() packageSelected = new EventEmitter<PackageData>();
  @Output() viewChanged = new EventEmitter<string>();
  @Output() dataChanged = new EventEmitter<any[]>();

  // UI State
  isLoading = false;
  dragModeEnabled = false;
  wireframeMode = false;
  currentView = 'isometric';
  showControls = true;
  showStats = true;
  selectedPackage: PackageData | null = null;
  showCollisionWarning = false;

  // Zoom System
  minZoom = 200;
  maxZoom = 300;
  zoomLevel = 100;

  // Performance Stats
  currentFPS = 60;
  triangleCount = 0;
  originalPackageCount = 0;

  // FIXED: Smooth Drag & Drop State
  private isDragging = false;
  private draggedPackage: PackageData | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3();

  // FIXED: Smooth drag variables
  private dragSensitivity = 0.8; // Reduced sensitivity
  private lastDragPosition = new THREE.Vector3();
  private dragTolerance = 5; // Minimum movement before drag starts

  // Three.js Objects
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  // Groups
  private truckGroup!: THREE.Group;
  private packagesGroup!: THREE.Group;

  // FIXED: Separated camera controls
  private isRotatingCamera = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private mouseDownTime = 0;
  private mouseMoved = false;

  // Data
  processedPackages: PackageData[] = [];
  deletedPackages: PackageData[] = [];
  private animationFrameId: number | null = null;
  private isDestroyed = false;
  private frameCount = 0;
  private lastUpdateTime = 0;

  // FIXED: Debounced data emission
  private dataChangeTimeout: any = null;
  private pendingDataChange = false;

  private isPanningCamera = false;
  private lastPanMouseX = 0;
  private lastPanMouseY = 0;

  // Color Palette
  private readonly COLOR_PALETTE = [
    '#006A6A', '#D6BB86', '#004A4A', '#C0A670', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'
  ];

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    console.log('🎬 Smooth ThreeJS Component initialized');
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
    console.log('🗑️ Component destroying...');
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
      100000
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

    // FIXED: Better event setup
    this.setupSmoothMouseEvents();

    // Groups
    this.truckGroup = new THREE.Group();
    this.packagesGroup = new THREE.Group();
    this.scene.add(this.truckGroup);
    this.scene.add(this.packagesGroup);

    // FIXED: Better drag plane setup
    this.dragPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0)
    );

    this.setView('isometric');
    console.log('✅ Smooth Three.js setup complete');
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(200, 200, 100);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }

  // ========================================
  // FIXED: SMOOTH MOUSE EVENTS - NO UI FLICKERING
  // ========================================

  private setupSmoothMouseEvents(): void {
    const canvas = this.renderer.domElement;

    // FIXED: Use passive listeners and proper binding
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this), { passive: false });
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: true });
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this), { passive: false });
    canvas.addEventListener('click', this.handleMouseClick.bind(this), { passive: false });
    canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }, { passive: false });
    console.log('✅ Smooth mouse events setup complete');
  }

  private handleMouseDown(event: MouseEvent): void {
    event.preventDefault();

    this.mouseDownTime = Date.now();
    this.mouseMoved = false;
    this.updateMouseCoordinates(event);

    if (event.button === 0) { // Left click - package dragging
      const intersectedPackage = this.getIntersectedPackage();

      if (intersectedPackage && this.dragModeEnabled) {
        this.initiateDragging(intersectedPackage);
      }
    } else if (event.button === 2) { // Right click
      // ENHANCED: Check if CTRL is pressed
      if (event.ctrlKey) {
        // CTRL + Right click = Camera Pan
        this.startCameraPanning(event);
      } else {
        // Normal Right click = Camera Rotation
        this.startCameraRotation(event);
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mouseMoved = true;
    this.updateMouseCoordinates(event);

    if (this.isDragging && this.draggedPackage) {
      this.updateDraggedPackageSmooth();
    } else if (this.isRotatingCamera) {
      this.updateCameraRotationSmooth(event);
    } else if (this.isPanningCamera) {
      // ENHANCED: Handle camera panning
      this.updateCameraPanning(event);
    } else if (!this.isDragging && !this.isRotatingCamera && !this.isPanningCamera) {
      this.updateHoverEffectsThrottled();
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    event.preventDefault();

    const clickDuration = Date.now() - this.mouseDownTime;

    if (this.isDragging) {
      this.completeDragging();
    }

    if (this.isRotatingCamera) {
      this.stopCameraRotation();
    }

    // ENHANCED: Stop camera panning
    if (this.isPanningCamera) {
      this.stopCameraPanning();
    }

    // Only treat as click if left click, mouse didn't move much and was quick
    if (event.button === 0 && !this.mouseMoved && clickDuration < 200 && !this.isDragging) {
      setTimeout(() => this.handleMouseClick(event), 10);
    }
  }

  private startCameraPanning(event: MouseEvent): void {
    this.isPanningCamera = true;
    this.lastPanMouseX = event.clientX;
    this.lastPanMouseY = event.clientY;
    this.renderer.domElement.style.cursor = 'move';

    console.log('🤚 Started camera panning (CTRL + Right click)');
  }

  private updateCameraPanning(event: MouseEvent): void {
    if (!this.isPanningCamera) return;

    const deltaX = event.clientX - this.lastPanMouseX;
    const deltaY = event.clientY - this.lastPanMouseY;

    // Calculate pan sensitivity based on distance from target
    const target = this.getCameraTarget();
    const distance = this.camera.position.distanceTo(target);
    const panSensitivity = distance * 0.001; // Adjust sensitivity based on zoom level

    // Get camera's right and up vectors for screen-space panning
    const cameraRight = new THREE.Vector3();
    const cameraUp = new THREE.Vector3();

    // Extract right and up vectors from camera matrix
    cameraRight.setFromMatrixColumn(this.camera.matrix, 0); // Right vector
    cameraUp.setFromMatrixColumn(this.camera.matrix, 1);    // Up vector

    // Calculate pan offset in world space
    const panOffset = new THREE.Vector3();
    panOffset.add(cameraRight.multiplyScalar(-deltaX * panSensitivity));
    panOffset.add(cameraUp.multiplyScalar(deltaY * panSensitivity));

    // Apply panning to camera position
    this.camera.position.add(panOffset);

    // Update the last mouse position
    this.lastPanMouseX = event.clientX;
    this.lastPanMouseY = event.clientY;
  }

  private stopCameraPanning(): void {
    this.isPanningCamera = false;
    this.renderer.domElement.style.cursor = this.dragModeEnabled ? 'grab' : 'default';

    console.log('🤚 Stopped camera panning');
  }

  private handleMouseClick(event: MouseEvent): void {
    if (this.isDragging || this.isRotatingCamera || this.mouseMoved) return;

    event.preventDefault();
    this.updateMouseCoordinates(event);

    const intersectedPackage = this.getIntersectedPackage();

    if (intersectedPackage) {
      this.selectPackage(intersectedPackage);
    } else {
      this.clearSelection();
    }
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomSpeed = 1; // Reduced for smoother zoom
    const delta = event.deltaY > 0 ? 1 : -1;
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + delta * zoomSpeed));
    this.setZoomLevel(newZoom);
  }

  private updateMouseCoordinates(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  // ========================================
  // FIXED: SMOOTH DRAG & DROP SYSTEM
  // ========================================

  private initiateDragging(packageData: PackageData): void {
    console.log('🎯 Initiating smooth drag for package:', packageData.id);

    this.isDragging = true;
    this.draggedPackage = packageData;
    packageData.isBeingDragged = true;

    if (packageData.mesh) {
      // FIXED: Better intersection calculation
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const packageY = packageData.mesh.position.y;
      this.dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, packageY, 0)
      );

      const intersectionPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint)) {
        // FIXED: Calculate smooth drag offset
        this.dragOffset.subVectors(packageData.mesh.position, intersectionPoint);
        this.lastDragPosition.copy(packageData.mesh.position);

        this.highlightDraggedPackage();
        this.renderer.domElement.style.cursor = 'grabbing';

        // FIXED: Hide UI panels during drag to prevent flickering
        this.temporarilyHideUIElements();

        console.log('✅ Smooth drag initiated successfully');
      } else {
        this.cancelDragging();
      }
    }
  }

  private updateDraggedPackageSmooth(): void {
    if (!this.isDragging || !this.draggedPackage?.mesh) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersectionPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint)) {

      // FIXED: Smooth movement with reduced sensitivity
      const targetPosition = new THREE.Vector3().addVectors(intersectionPoint, this.dragOffset);
      const currentPosition = this.draggedPackage.mesh.position;

      // FIXED: Lerp for smooth movement
      const smoothPosition = new THREE.Vector3().lerpVectors(
        currentPosition,
        targetPosition,
        this.dragSensitivity
      );

      // Apply constraints
      const pkg = this.draggedPackage;
      smoothPosition.x = Math.max(
        pkg.length / 2,
        Math.min(this.truckDimension[0] - pkg.length / 2, smoothPosition.x)
      );
      smoothPosition.z = Math.max(
        pkg.width / 2,
        Math.min(this.truckDimension[1] - pkg.width / 2, smoothPosition.z)
      );

      // Check if moved enough to warrant position update
      if (this.lastDragPosition.distanceTo(smoothPosition) > this.dragTolerance) {

        const testPosition = {
          x: smoothPosition.x - pkg.length / 2,
          y: smoothPosition.z - pkg.width / 2,
          z: pkg.z
        };

        // FIXED: Only check collision if moved significantly
        if (!this.checkCollision(pkg, testPosition)) {
          // Update mesh position
          pkg.mesh?.position.copy(smoothPosition);

          // Update package data
          pkg.x = testPosition.x;
          pkg.y = testPosition.y;

          this.lastDragPosition.copy(smoothPosition);

          // FIXED: Mark for debounced data emission instead of immediate
          this.pendingDataChange = true;
          this.clearCollisionWarning();
        } else {
          this.showCollisionWarningBriefly();
        }
      }
    }
  }

  private completeDragging(): void {
  if (!this.isDragging || !this.draggedPackage) return;

  console.log('🎯 Completing smooth drag for package:', this.draggedPackage.id);

  // FIXED: Clear drag visual effects
  if (this.draggedPackage.mesh) {
    const material = this.draggedPackage.mesh.material as THREE.MeshLambertMaterial;
    material.wireframe = this.wireframeMode; // Restore original wireframe state
    material.emissive.setHex(0x000000);
  }

  this.draggedPackage.isBeingDragged = false;

  this.packageSelected.emit(this.draggedPackage);

  if (this.pendingDataChange) {
    this.debouncedEmitDataChange();
    this.pendingDataChange = false;
  }

  this.isDragging = false;
  this.draggedPackage = null;

  this.renderer.domElement.style.cursor = this.dragModeEnabled ? 'grab' : 'default';
  this.clearHighlights();

  this.restoreUIElements();

  if (this.selectedPackage) {
    setTimeout(() => this.highlightSelectedPackage(), 100);
  }
}

  private cancelDragging(): void {
    if (this.draggedPackage) {
      this.draggedPackage.isBeingDragged = false;
    }
    this.isDragging = false;
    this.draggedPackage = null;
    this.renderer.domElement.style.cursor = this.dragModeEnabled ? 'grab' : 'default';
    this.restoreUIElements();
  }

  // ========================================
  // FIXED: UI MANAGEMENT - PREVENT FLICKERING
  // ========================================

  private temporarilyHideUIElements(): void {
    // FIXED: Hide potentially interfering UI elements during drag
    this.showControls = false;
    this.showStats = false;
  }

  private restoreUIElements(): void {
    // FIXED: Restore UI elements after drag completion
    this.showControls = true;
    this.showStats = true;

    // FIXED: Only detect changes once after restoring
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.cdr.detectChanges();
      }
    }, 50);
  }

  private showCollisionWarningBriefly(): void {
    if (!this.showCollisionWarning) {
      this.showCollisionWarning = true;

      if (this.draggedPackage?.mesh) {
        const material = this.draggedPackage.mesh.material as THREE.MeshLambertMaterial;
        material.emissive.setHex(0xff0000);
      }

      // FIXED: Clear warning without change detection
      setTimeout(() => {
        this.clearCollisionWarning();
      }, 500);
    }
  }

  private clearCollisionWarning(): void {
    this.showCollisionWarning = false;

    if (this.draggedPackage?.mesh) {
      const material = this.draggedPackage.mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0x666666);
    }
  }

  // ========================================
  // FIXED: DEBOUNCED DATA EMISSION
  // ========================================

  private debouncedEmitDataChange(): void {
    // FIXED: Debounce data changes to prevent excessive emissions
    if (this.dataChangeTimeout) {
      clearTimeout(this.dataChangeTimeout);
    }

    this.dataChangeTimeout = setTimeout(() => {
      this.emitDataChange();
    }, 100); // Wait 100ms after last change
  }

  private emitDataChange(): void {
    const updatedData = this.processedPackages.map(pkg => [
      pkg.x, pkg.y, pkg.z, pkg.length, pkg.width, pkg.height, pkg.id, pkg.weight
    ]);
    this.dataChanged.emit(updatedData);
  }

  // ========================================
  // FIXED: SMOOTH CAMERA CONTROLS
  // ========================================

  private startCameraRotation(event: MouseEvent): void {
    this.isRotatingCamera = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    this.renderer.domElement.style.cursor = 'grabbing';

    console.log('🔄 Started camera rotation (Right click)');
  }

  private updateCameraRotationSmooth(event: MouseEvent): void {
    if (!this.isRotatingCamera) return;

    const deltaX = (event.clientX - this.lastMouseX) * 0.005;
    const deltaY = (event.clientY - this.lastMouseY) * 0.005;

    this.rotateViewSmooth(deltaX, deltaY);

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  private stopCameraRotation(): void {
    this.isRotatingCamera = false;
    this.renderer.domElement.style.cursor = this.dragModeEnabled ? 'grab' : 'default';

    console.log('🔄 Stopped camera rotation');
  }

  private rotateViewSmooth(deltaX: number, deltaY: number): void {
    const spherical = new THREE.Spherical();
    const target = this.getCameraTarget();

    spherical.setFromVector3(this.camera.position.clone().sub(target));
    spherical.theta -= deltaX;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - deltaY));

    this.camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(target));
    this.camera.lookAt(target);
  }

  private getCameraTarget(): THREE.Vector3 {
    return new THREE.Vector3(
      this.truckDimension[0] / 2,
      this.truckDimension[2] / 2,
      this.truckDimension[1] / 2
    );
  }

  // ========================================
  // FIXED: THROTTLED HOVER EFFECTS
  // ========================================

  private hoverThrottleTimeout: any = null;

  private updateHoverEffectsThrottled(): void {
    // FIXED: Throttle hover effects to reduce performance impact
    if (this.hoverThrottleTimeout) return;

    this.hoverThrottleTimeout = setTimeout(() => {
      this.updateHoverEffects();
      this.hoverThrottleTimeout = null;
    }, 50);
  }

  private updateHoverEffects(): void {
  if (this.isDragging) return;

  const hoveredPackage = this.getIntersectedPackage();

  this.processedPackages.forEach(pkg => {
    if (pkg.mesh && pkg !== this.selectedPackage && !pkg.isBeingDragged) {
      const material = pkg.mesh.material as THREE.MeshLambertMaterial;
      if (pkg === hoveredPackage) {
        // FIXED: Light emissive for hover, NO scaling
        material.emissive.setHex(0x333333);
        // REMOVED: pkg.mesh.scale.setScalar(1.02) - was causing collision issues
      } else {
        material.emissive.setHex(0x000000);
        // FIXED: Always keep scale at 1.0
        pkg.mesh.scale.setScalar(1.0);
      }
    }
  });
}

  // ========================================
  // INTERACTION HELPERS
  // ========================================

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
  }

  clearSelection(): void {
    this.selectedPackage = null;
    this.clearHighlights();
  }

  private highlightSelectedPackage(): void {
  this.clearHighlights();

  if (this.selectedPackage?.mesh) {
    const material = this.selectedPackage.mesh.material as THREE.MeshLambertMaterial;
    // FIXED: Use stronger emissive color instead of scaling
    material.emissive.setHex(0x666666); // Stronger highlight
    // REMOVED: mesh.scale.setScalar(1.05) - this was causing collision issues
  }
}

  private highlightDraggedPackage(): void {
  if (this.draggedPackage?.mesh) {
    const material = this.draggedPackage.mesh.material as THREE.MeshLambertMaterial;
    // FIXED: Use even stronger color and add wireframe
    material.emissive.setHex(0x888888);
    material.wireframe = true; // Show wireframe while dragging
    // REMOVED: mesh.scale.setScalar(1.1) - this was causing collision issues
  }
}

  private clearHighlights(): void {
  this.processedPackages.forEach(pkg => {
    if (pkg.mesh && !pkg.isBeingDragged) {
      const material = pkg.mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0x000000);
      material.wireframe = this.wireframeMode; // Restore original wireframe state
      // FIXED: Always keep scale at 1.0 - no more visual scaling
      pkg.mesh.scale.setScalar(1.0);
    }
  });
}

  // ========================================
  // COLLISION DETECTION
  // ========================================

  private checkCollision(packageToCheck: PackageData, newPos: { x: number, y: number, z: number }): boolean {
  for (const otherPackage of this.processedPackages) {
    if (otherPackage.id === packageToCheck.id || !otherPackage.mesh) continue;

    // FIXED: Much smaller tolerance for precise placement
    const tolerance = 0; // Reduced from 15 to 2mm

    if (newPos.x < otherPackage.x + otherPackage.length + tolerance &&
        newPos.x + packageToCheck.length + tolerance > otherPackage.x &&
        newPos.y < otherPackage.y + otherPackage.width + tolerance &&
        newPos.y + packageToCheck.width + tolerance > otherPackage.y &&
        newPos.z < otherPackage.z + otherPackage.height + tolerance &&
        newPos.z + packageToCheck.height + tolerance > otherPackage.z) {
      return true;
    }
  }

  return false;
}

  // ========================================
  // UI CONTROL METHODS
  // ========================================

  toggleDragMode(): void {
    this.dragModeEnabled = !this.dragModeEnabled;
    this.renderer.domElement.style.cursor = this.dragModeEnabled ? 'grab' : 'default';

    if (!this.dragModeEnabled && this.isDragging) {
      this.cancelDragging();
    }

    console.log('🖱️ Drag mode:', this.dragModeEnabled ? 'ON' : 'OFF');
  }

  toggleWireframe(): void {
    this.wireframeMode = !this.wireframeMode;

    this.processedPackages.forEach(pkg => {
      if (pkg.mesh) {
        const material = pkg.mesh.material as THREE.MeshLambertMaterial;
        material.wireframe = this.wireframeMode;
      }
    });
  }

  rotateSelectedPackage(): void {
    if (!this.selectedPackage?.mesh) return;

    const originalLength = this.selectedPackage.length;
    const originalWidth = this.selectedPackage.width;

    this.selectedPackage.length = originalWidth;
    this.selectedPackage.width = originalLength;
    this.selectedPackage.dimensions = `${this.selectedPackage.length}×${this.selectedPackage.width}×${this.selectedPackage.height}mm`;

    if (this.checkCollision(this.selectedPackage, {
      x: this.selectedPackage.x,
      y: this.selectedPackage.y,
      z: this.selectedPackage.z
    })) {
      // Revert
      this.selectedPackage.length = originalLength;
      this.selectedPackage.width = originalWidth;
      this.selectedPackage.dimensions = `${this.selectedPackage.length}×${this.selectedPackage.width}×${this.selectedPackage.height}mm`;
    } else {
      this.selectedPackage.mesh.rotation.y += Math.PI / 2;
      this.createPackageMesh(this.selectedPackage);
      this.highlightSelectedPackage();
      this.packageSelected.emit(this.selectedPackage);
      this.debouncedEmitDataChange();
    }
  }

  deleteSelectedPackage(): void {
    if (!this.selectedPackage) return;

    const index = this.processedPackages.findIndex(pkg => pkg.id === this.selectedPackage!.id);
    if (index > -1) {
      const deletedPackage = this.processedPackages.splice(index, 1)[0];

      if (deletedPackage.mesh) {
        this.packagesGroup.remove(deletedPackage.mesh);
        deletedPackage.mesh.geometry.dispose();
        (deletedPackage.mesh.material as THREE.Material).dispose();
      }

      this.deletedPackages.push(deletedPackage);
      this.selectedPackage = null;

      this.debouncedEmitDataChange();
    }
  }

  // ========================================
  // PACKAGE RESTORE SYSTEM
  // ========================================

  restorePackage(packageData: PackageData): void {
    const index = this.deletedPackages.findIndex(pkg => pkg.id === packageData.id);
    if (index > -1) {
      this.deletedPackages.splice(index, 1);
    }

    const validPosition = this.findValidPosition(packageData);

    if (validPosition) {
      packageData.x = validPosition.x;
      packageData.y = validPosition.y;
      packageData.z = validPosition.z;

      this.createPackageMesh(packageData);
      this.processedPackages.push(packageData);

      this.debouncedEmitDataChange();
    } else {
      this.deletedPackages.push(packageData);
    }
  }

  private findValidPosition(packageData: PackageData): { x: number, y: number, z: number } | null {
    if (!this.checkCollision(packageData, { x: packageData.x, y: packageData.y, z: packageData.z })) {
      return { x: packageData.x, y: packageData.y, z: packageData.z };
    }

    const stepSize = 50;
    for (let x = 0; x <= this.truckDimension[0] - packageData.length; x += stepSize) {
      for (let y = 0; y <= this.truckDimension[1] - packageData.width; y += stepSize) {
        for (let z = 0; z <= this.truckDimension[2] - packageData.height; z += stepSize) {
          const testPosition = { x, y, z };
          if (!this.checkCollision(packageData, testPosition)) {
            return testPosition;
          }
        }
      }
    }

    return null;
  }

  restoreAllPackages(): void {
    const packagesToRestore = [...this.deletedPackages];
    let restoredCount = 0;

    this.deletedPackages = [];

    for (const pkg of packagesToRestore) {
      const position = this.findValidPosition(pkg);
      if (position) {
        pkg.x = position.x;
        pkg.y = position.y;
        pkg.z = position.z;

        this.createPackageMesh(pkg);
        this.processedPackages.push(pkg);
        restoredCount++;
      } else {
        this.deletedPackages.push(pkg);
      }
    }

    if (restoredCount > 0) {
      this.debouncedEmitDataChange();
    }
  }

  clearAllDeleted(): void {
    this.deletedPackages = [];
  }

  // ========================================
  // DATA PROCESSING
  // ========================================

  private safeProcessData(): void {
    if (this.isDestroyed) return;

    this.isLoading = true;

    try {
      this.processData();
      this.createTruckVisualization();
      this.createPackageVisualization();
    } catch (error) {
      console.error('❌ Error processing data:', error);
    } finally {
      this.isLoading = false;
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
      linewidth: 2
    });

    const wireframe = new THREE.LineSegments(edges, material);
    wireframe.position.set(
      this.truckDimension[0] / 2,
      this.truckDimension[2] / 2,
      this.truckDimension[1] / 2
    );

    this.truckGroup.add(wireframe);
  }

  private createPackageVisualization(): void {
    this.packagesGroup.clear();

    this.processedPackages.forEach((packageData) => {
      this.createPackageMesh(packageData);
    });
  }

  private createPackageMesh(packageData: PackageData): void {
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
    mesh.userData = { packageData };

    packageData.mesh = mesh;
    this.packagesGroup.add(mesh);
  }

  // ========================================
  // CAMERA CONTROLS
  // ========================================

  setView(viewType: string): void {
    this.currentView = viewType;
    this.viewChanged.emit(viewType);

    const maxDim = Math.max(...this.truckDimension);
    const distance = maxDim * (this.zoomLevel / 100) * 1.5;
    const target = this.getCameraTarget();

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

    this.camera.lookAt(target);
  }

  resetView(): void {
    this.zoomLevel = 100;
    this.setView('isometric');
  }

  setZoomLevel(value: number): void {
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
  }

  setZoomLevelFromInput(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.setZoomLevel(value);
  }

  zoomIn(): void {
    this.setZoomLevel(Math.min(this.maxZoom, this.zoomLevel + 25));
  }

  zoomOut(): void {
    this.setZoomLevel(Math.max(this.minZoom, this.zoomLevel - 25));
  }

  // ========================================
  // RENDER LOOP
  // ========================================

  private startRenderLoop(): void {
    if (this.isDestroyed) return;

    this.ngZone.runOutsideAngular(() => {
      const animate = (currentTime: number) => {
        if (this.isDestroyed) return;

        this.animationFrameId = requestAnimationFrame(animate);

        if (this.isDragging || this.isRotatingCamera || (currentTime - this.lastUpdateTime) > 16) {
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

  // ========================================
  // UTILITY METHODS
  // ========================================

  trackDeletedPackage(index: number, item: PackageData): any {
    return item.id;
  }

  getFPSClass(): string {
    if (this.currentFPS >= 50) return 'good';
    if (this.currentFPS >= 30) return 'medium';
    return 'poor';
  }

  private cleanup(): void {
    // FIXED: Clean up timeouts
    this.isDragging = false;
    this.isRotatingCamera = false;
    this.isPanningCamera = false; // NEW: Reset pan state

    if (this.dataChangeTimeout) {
      clearTimeout(this.dataChangeTimeout);
      this.dataChangeTimeout = null;
    }

    if (this.hoverThrottleTimeout) {
      clearTimeout(this.hoverThrottleTimeout);
      this.hoverThrottleTimeout = null;
    }

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

    console.log('✅ Smooth cleanup complete');
  }
}
