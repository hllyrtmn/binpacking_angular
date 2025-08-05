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
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
  mesh?: THREE.Mesh; // Three.js mesh reference
  originalPosition?: THREE.Vector3; // For collision detection
}

interface LoadingStats {
  totalPackages: number;
  packagesLoaded: number;
  utilizationRate: number;
  cogScore: number;
  totalWeight: number;
}

interface DragState {
  isDragging: boolean;
  draggedPackage: PackageData | null;
  dragPlane: THREE.Plane;
  dragOffset: THREE.Vector3;
  startPosition: THREE.Vector3;
}

@Component({
  selector: 'app-threejs',
  imports: [CommonModule],
  templateUrl: './threejs.component.html',
  styleUrls: ['./threejs.component.scss'], // Use the same styles as plotly component
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThreeJSTruckVisualizationComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('threeContainer', { static: true }) threeContainer!: ElementRef;

  @Input() piecesData: any[] | string = [];
  @Input() truckDimension: number[] = [12000, 2400, 2900];
  @Input() showHelp: boolean = true;

  @Output() packageSelected = new EventEmitter<PackageData>();
  @Output() viewChanged = new EventEmitter<string>();
  @Output() packageMoved = new EventEmitter<{package: PackageData, newPosition: {x: number, y: number, z: number}}>();
  @Output() piecesDataChanged = new EventEmitter<any[]>();

  // UI State
  isFullscreen = false;
  isLoading = false;
  infoPanelCollapsed = false;
  wireframeMode = false;
  dragModeEnabled = false;
  currentView: string = 'isometric';
  highlightedPackage: PackageData | null = null;
  hasResults = false;

  // Three.js Objects
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls: any; // OrbitControls
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;

  // Truck and Packages
  private truckGroup!: THREE.Group;
  private packagesGroup!: THREE.Group;
  private truckWireframe!: THREE.LineSegments;

  // Drag & Drop State
  dragState: DragState = {
    isDragging: false,
    draggedPackage: null,
    dragPlane: new THREE.Plane(),
    dragOffset: new THREE.Vector3(),
    startPosition: new THREE.Vector3()
  };

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
  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number | null = null;

  // **Sonsuz döngü önleme**
  private isRendering = false;
  private isProcessing = false;
  private lastDataHash = '';
  private renderTimeout: any = null;
  private isDestroyed = false;

  // Predefined color palette for packages
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

  // ========================================
  // LIFECYCLE HOOKS
  // ========================================

  ngOnInit(): void {
    console.log('🎬 ThreeJSTruckVisualizationComponent initialized');
    this.setupThreeJS();
    this.setupEventListeners();
    this.setupResizeObserver();

    // Initial render delay
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.safeProcessData();
      }
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isDestroyed || this.isProcessing) return;

    if (changes['piecesData'] || changes['truckDimension']) {
      const currentDataHash = this.generateDataHash();
      if (currentDataHash !== this.lastDataHash) {
        this.lastDataHash = currentDataHash;
        this.safeProcessData();
      }
    }
  }

  ngOnDestroy(): void {
    console.log('🗑️ ThreeJSTruckVisualizationComponent destroying...');
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
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(this.renderer.domElement);

    // Lighting
    this.setupLighting();

    // Controls (OrbitControls would be imported separately)
    this.setupOrbitControls();

    // Raycaster for mouse interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Groups
    this.truckGroup = new THREE.Group();
    this.packagesGroup = new THREE.Group();
    this.scene.add(this.truckGroup);
    this.scene.add(this.packagesGroup);

    // Start render loop
    this.startRenderLoop();

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
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);
  }

  private setupOrbitControls(): void {
    // Note: In a real Angular app, you'd import OrbitControls from 'three/examples/jsm/controls/OrbitControls'
    // For this example, I'll create a basic orbit control simulation
    this.createBasicOrbitControls();
  }

  private createBasicOrbitControls(): void {
    // Basic orbit controls implementation
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let targetDistance = 100;

    // Set initial camera position
    this.camera.position.set(100, 100, 100);
    this.camera.lookAt(0, 0, 0);

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (event) => {
      if (this.dragModeEnabled) return; // Don't orbit in drag mode
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    });

    canvas.addEventListener('mousemove', (event) => {
      if (!isMouseDown || this.dragModeEnabled) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      targetX += deltaX * 0.01;
      targetY += deltaY * 0.01;

      mouseX = event.clientX;
      mouseY = event.clientY;

      this.updateCameraPosition();
    });

    canvas.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    canvas.addEventListener('wheel', (event) => {
      targetDistance += event.deltaY * 0.1;
      targetDistance = Math.max(10, Math.min(500, targetDistance));
      this.updateCameraPosition();
    });

    this.updateCameraPosition = () => {
      const x = targetDistance * Math.sin(targetX) * Math.cos(targetY);
      const y = targetDistance * Math.sin(targetY);
      const z = targetDistance * Math.cos(targetX) * Math.cos(targetY);

      this.camera.position.set(x, y, z);
      this.camera.lookAt(0, 0, 0);
    };
  }

  private updateCameraPosition(): void {
    // Implemented in setupOrbitControls
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    // Mouse events for drag & drop
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('click', this.onMouseClick.bind(this));

    console.log('✅ Event listeners setup complete');
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.isDestroyed) return;

    switch (event.key.toLowerCase()) {
      case 'escape':
        if (this.isFullscreen) {
          this.exitFullscreen();
        } else if (this.dragState.isDragging) {
          this.cancelDrag();
        }
        break;
      case 'r':
        if (this.dragModeEnabled && this.highlightedPackage) {
          this.rotatePackage(this.highlightedPackage);
        }
        break;
    }
  }

  // ========================================
  // MOUSE INTERACTION
  // ========================================

  private onMouseDown(event: MouseEvent): void {
    if (!this.dragModeEnabled) return;

    event.preventDefault();
    this.updateMousePosition(event);

    const intersectedPackage = this.getIntersectedPackage();
    if (intersectedPackage) {
      this.startDrag(intersectedPackage, event);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);

    if (this.dragState.isDragging && this.dragState.draggedPackage) {
      this.updateDrag(event);
    } else if (this.dragModeEnabled) {
      // Hover effects
      const intersectedPackage = this.getIntersectedPackage();
      this.updateHoverState(intersectedPackage);
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (this.dragState.isDragging) {
      this.endDrag();
    }
  }

  private onMouseClick(event: MouseEvent): void {
    if (this.dragModeEnabled) return; // Don't select in drag mode

    this.updateMousePosition(event);
    const intersectedPackage = this.getIntersectedPackage();

    if (intersectedPackage) {
      this.highlightPackage(intersectedPackage);
    }
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
      return this.processedPackages.find(pkg => pkg.mesh === mesh) || null;
    }

    return null;
  }

  // ========================================
  // DRAG & DROP LOGIC
  // ========================================

  private startDrag(packageData: PackageData, event: MouseEvent): void {
    if (!packageData.mesh) return;

    this.dragState.isDragging = true;
    this.dragState.draggedPackage = packageData;
    this.dragState.startPosition.copy(packageData.mesh.position);

    // Create drag plane at package height
    const planeNormal = new THREE.Vector3(0, 0, 1);
    this.dragState.dragPlane.setFromNormalAndCoplanarPoint(
      planeNormal,
      packageData.mesh.position
    );

    // Calculate drag offset
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragState.dragPlane, intersectPoint);

    this.dragState.dragOffset.subVectors(packageData.mesh.position, intersectPoint);

    // Visual feedback
    this.setPackageDragState(packageData, true);

    console.log('🖱️ Started dragging package:', packageData.id);
  }

  private updateDrag(event: MouseEvent): void {
    if (!this.dragState.draggedPackage?.mesh) return;

    // Calculate new position
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectPoint = new THREE.Vector3();

    if (this.raycaster.ray.intersectPlane(this.dragState.dragPlane, intersectPoint)) {
      const newPosition = intersectPoint.add(this.dragState.dragOffset);

      // Apply constraints (keep within truck bounds)
      newPosition.x = Math.max(0, Math.min(this.truckDimension[0], newPosition.x));
      newPosition.y = Math.max(0, Math.min(this.truckDimension[1], newPosition.y));

      // Check for collisions
      if (!this.checkCollision(this.dragState.draggedPackage, newPosition)) {
        this.dragState.draggedPackage.mesh.position.copy(newPosition);

        // Update package data
        this.dragState.draggedPackage.x = newPosition.x;
        this.dragState.draggedPackage.y = newPosition.y;
        this.dragState.draggedPackage.z = newPosition.z;
      }
    }
  }

  private endDrag(): void {
    if (!this.dragState.draggedPackage) return;

    const packageData = this.dragState.draggedPackage;

    // Emit position change event
    this.packageMoved.emit({
      package: packageData,
      newPosition: {
        x: packageData.x,
        y: packageData.y,
        z: packageData.z
      }
    });

    // Update pieces data and emit
    this.updatePiecesData();

    // Visual feedback
    this.setPackageDragState(packageData, false);

    // Reset drag state
    this.dragState.isDragging = false;
    this.dragState.draggedPackage = null;

    // Recalculate stats
    this.calculateStats();
    this.cdr.detectChanges();

    console.log('✅ Finished dragging package:', packageData.id);
  }

  private cancelDrag(): void {
    if (!this.dragState.draggedPackage?.mesh) return;

    // Reset to original position
    this.dragState.draggedPackage.mesh.position.copy(this.dragState.startPosition);
    this.dragState.draggedPackage.x = this.dragState.startPosition.x;
    this.dragState.draggedPackage.y = this.dragState.startPosition.y;
    this.dragState.draggedPackage.z = this.dragState.startPosition.z;

    // Visual feedback
    this.setPackageDragState(this.dragState.draggedPackage, false);

    // Reset drag state
    this.dragState.isDragging = false;
    this.dragState.draggedPackage = null;

    console.log('❌ Cancelled dragging');
  }

  private checkCollision(draggedPackage: PackageData, newPosition: THREE.Vector3): boolean {
    // Create bounding box for the dragged package at new position
    const draggedBox = new THREE.Box3();
    draggedBox.setFromCenterAndSize(
      new THREE.Vector3(
        newPosition.x + draggedPackage.length / 2,
        newPosition.y + draggedPackage.width / 2,
        newPosition.z + draggedPackage.height / 2
      ),
      new THREE.Vector3(draggedPackage.length, draggedPackage.width, draggedPackage.height)
    );

    // Check collision with other packages
    for (const otherPackage of this.processedPackages) {
      if (otherPackage.id === draggedPackage.id) continue;

      const otherBox = new THREE.Box3();
      otherBox.setFromCenterAndSize(
        new THREE.Vector3(
          otherPackage.x + otherPackage.length / 2,
          otherPackage.y + otherPackage.width / 2,
          otherPackage.z + otherPackage.height / 2
        ),
        new THREE.Vector3(otherPackage.length, otherPackage.width, otherPackage.height)
      );

      if (draggedBox.intersectsBox(otherBox)) {
        return true; // Collision detected
      }
    }

    return false; // No collision
  }

  private setPackageDragState(packageData: PackageData, isDragging: boolean): void {
    if (!packageData.mesh) return;

    const material = packageData.mesh.material as THREE.MeshLambertMaterial;
    if (isDragging) {
      material.transparent = true;
      material.opacity = 0.7;
      packageData.mesh.scale.setScalar(1.05);
    } else {
      material.transparent = false;
      material.opacity = 1.0;
      packageData.mesh.scale.setScalar(1.0);
    }
  }

  private updateHoverState(hoveredPackage: PackageData | null): void {
    // Reset all packages to normal state
    this.processedPackages.forEach(pkg => {
      if (pkg.mesh && pkg !== this.highlightedPackage && pkg !== this.dragState.draggedPackage) {
        const material = pkg.mesh.material as THREE.MeshLambertMaterial;
        material.emissive.setHex(0x000000);
        pkg.mesh.scale.setScalar(1.0);
      }
    });

    // Highlight hovered package
    if (hoveredPackage?.mesh && hoveredPackage !== this.highlightedPackage) {
      const material = hoveredPackage.mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0x222222);
      hoveredPackage.mesh.scale.setScalar(1.02);
    }
  }

  private rotatePackage(packageData: PackageData): void {
    if (!packageData.mesh) return;

    // Rotate 90 degrees around Z axis
    packageData.mesh.rotateZ(Math.PI / 2);

    // Swap width and length in data
    const temp = packageData.length;
    packageData.length = packageData.width;
    packageData.width = temp;
    packageData.dimensions = `${packageData.length}×${packageData.width}×${packageData.height}mm`;

    // Update pieces data
    this.updatePiecesData();

    // Recalculate stats
    this.calculateStats();
    this.cdr.detectChanges();

    console.log('🔄 Rotated package:', packageData.id);
  }

  // ========================================
  // DATA PROCESSING (Same as Plotly component)
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
    if (this.isProcessing || this.isDestroyed) return;

    this.isProcessing = true;
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      this.processData();
      this.createTruckVisualization();
      this.createPackageVisualization();
      this.setView(this.currentView);
      this.hasResults = this.processedPackages.length > 0;
    } catch (error) {
      console.error('❌ Error processing data:', error);
    } finally {
      this.isProcessing = false;
      this.isLoading = false;
      this.cdr.detectChanges();
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

    // Process packages data (same as Plotly component)
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
    // Same logic as Plotly component
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

  private updatePiecesData(): void {
    // Convert current package positions back to pieces data format
    const newPiecesData = this.processedPackages.map(pkg => [
      pkg.x, pkg.y, pkg.z, pkg.length, pkg.width, pkg.height, pkg.id, pkg.weight
    ]);

    this.piecesDataChanged.emit(newPiecesData);
  }

  // ========================================
  // THREE.JS VISUALIZATION
  // ========================================

  private createTruckVisualization(): void {
    // Clear existing truck
    this.truckGroup.clear();

    // Create truck wireframe
    const geometry = new THREE.BoxGeometry(
      this.truckDimension[0],
      this.truckDimension[1],
      this.truckDimension[2]
    );

    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0x666666,
      linewidth: 2
    });

    this.truckWireframe = new THREE.LineSegments(edges, material);
    this.truckWireframe.position.set(
      this.truckDimension[0] / 2,
      this.truckDimension[1] / 2,
      this.truckDimension[2] / 2
    );

    this.truckGroup.add(this.truckWireframe);

    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(
      this.truckDimension[0] * 1.5,
      this.truckDimension[1] * 1.5
    );
    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0xf0f0f0,
      transparent: true,
      opacity: 0.5
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    this.truckGroup.add(ground);

    console.log('✅ Truck visualization created');
  }

  private createPackageVisualization(): void {
    // Clear existing packages
    this.packagesGroup.clear();

    // Create each package
    this.processedPackages.forEach((packageData, index) => {
      const geometry = new THREE.BoxGeometry(
        packageData.length,
        packageData.width,
        packageData.height
      );

      const material = new THREE.MeshLambertMaterial({
        color: packageData.color,
        transparent: false,
        opacity: 1.0
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Position the package
      mesh.position.set(
        packageData.x + packageData.length / 2,
        packageData.y + packageData.width / 2,
        packageData.z + packageData.height / 2
      );

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Store mesh reference in package data
      packageData.mesh = mesh;

      this.packagesGroup.add(mesh);
    });

    console.log(`✅ Created ${this.processedPackages.length} package meshes`);
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
      };
      animate();
    });
  }

  // ========================================
  // UI METHODS (Same as Plotly component)
  // ========================================

  toggleFullscreen(): void {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  private enterFullscreen(): void {
    const elem = this.threeContainer.nativeElement.closest('.truck-visualization-container');
    if (elem?.requestFullscreen) {
      elem.requestFullscreen();
    }
  }

  private exitFullscreen(): void {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  toggleInfoPanel(): void {
    this.infoPanelCollapsed = !this.infoPanelCollapsed;
    this.cdr.detectChanges();
  }

  toggleWireframe(): void {
    this.wireframeMode = !this.wireframeMode;

    // Toggle package wireframe mode
    this.processedPackages.forEach(pkg => {
      if (pkg.mesh) {
        const material = pkg.mesh.material as THREE.MeshLambertMaterial;
        material.wireframe = this.wireframeMode;
      }
    });

    this.cdr.detectChanges();
  }

  toggleDragMode(): void {
    this.dragModeEnabled = !this.dragModeEnabled;

    if (!this.dragModeEnabled && this.dragState.isDragging) {
      this.cancelDrag();
    }

    this.cdr.detectChanges();
    console.log('🖱️ Drag mode:', this.dragModeEnabled ? 'ON' : 'OFF');
  }

  resetView(): void {
    this.currentView = 'isometric';
    this.setView('isometric');
  }

  setView(viewType: string): void {
    this.currentView = viewType;
    this.viewChanged.emit(viewType);

    // Camera positions based on truck dimensions
    const maxDim = Math.max(...this.truckDimension);
    const distance = maxDim * 1.5;

    switch (viewType) {
      case 'front':
        this.camera.position.set(distance, 0, this.truckDimension[2] / 2);
        break;
      case 'side':
        this.camera.position.set(0, distance, this.truckDimension[2] / 2);
        break;
      case 'top':
        this.camera.position.set(this.truckDimension[0] / 2, this.truckDimension[1] / 2, distance);
        break;
      case 'isometric':
      default:
        this.camera.position.set(distance * 0.8, distance * 0.8, distance * 0.8);
        break;
    }

    this.camera.lookAt(
      this.truckDimension[0] / 2,
      this.truckDimension[1] / 2,
      this.truckDimension[2] / 2
    );

    this.cdr.detectChanges();
  }

  highlightPackage(packageData: PackageData): void {
    // Reset previous highlight
    if (this.highlightedPackage?.mesh) {
      const prevMaterial = this.highlightedPackage.mesh.material as THREE.MeshLambertMaterial;
      prevMaterial.emissive.setHex(0x000000);
      this.highlightedPackage.mesh.scale.setScalar(1.0);
    }

    this.highlightedPackage = packageData;
    this.packageSelected.emit(packageData);

    // Apply new highlight
    if (packageData.mesh) {
      const material = packageData.mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0x444444);
      packageData.mesh.scale.setScalar(1.05);
    }

    this.cdr.detectChanges();
  }

  closeHelp(): void {
    this.showHelp = false;
    this.cdr.detectChanges();
  }

  // Package List Methods (Same as Plotly component)
  getDisplayedPackages(): PackageData[] {
    return this.processedPackages.slice(0, this.displayedPackagesCount);
  }

  getTotalPackages(): number {
    return this.processedPackages.length;
  }

  showMorePackages(): void {
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
  // RESIZE OBSERVER
  // ========================================

  private setupResizeObserver(): void {
    if (this.resizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (this.isDestroyed) return;
      this.handleResize();
    });

    this.resizeObserver.observe(this.threeContainer.nativeElement);
  }

  private handleResize(): void {
    if (this.isDestroyed) return;

    const container = this.threeContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // ========================================
  // CLEANUP
  // ========================================

  private cleanup(): void {
    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Cleanup timeouts
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }

    // Cleanup resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Cleanup Three.js objects
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

  @HostListener('document:fullscreenchange')
  @HostListener('document:webkitfullscreenchange')
  @HostListener('document:mozfullscreenchange')
  @HostListener('document:MSFullscreenChange')
  fullscreenChangeHandler() {
    if (this.isDestroyed) return;

    this.isFullscreen = !!document.fullscreenElement ||
                       !!(document as any).webkitFullscreenElement ||
                       !!(document as any).mozFullScreenElement ||
                       !!(document as any).msFullscreenElement;

    this.cdr.detectChanges();

    // Resize after fullscreen change
    setTimeout(() => this.handleResize(), 100);
  }
}
