import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from '../helpers/OrbitControls';
import * as d3 from 'd3';

@Injectable({
  providedIn: 'root'
})
export class ThreejsService {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private animationFrameId: number | null = null;
  private truck: THREE.Group | null = null;
  private tooltipDiv: HTMLElement | null = null;
  private tooltipActive = false;
  private tooltipMeshes: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor() {}

  // Renders the 3D visualization of the truck loading solution
  public drawSolution(element: HTMLElement, pieces: any[], truckDimension: number[]): void {
    if (!pieces || pieces.length === 0) {
      console.error('No pieces data provided');
      return;
    }

    // Temizle ve yeniden başlat
    this.dispose();

    // Parse pieces data if it's a string
    let parsedPieces = pieces;
    if (typeof pieces === 'string') {
      try {
        parsedPieces = JSON.parse(pieces);
      } catch (e) {
        console.error('Failed to parse pieces data:', e);
        return;
      }
    }

    // Scene ve renderer'ı oluştur
    this.initScene(element);

    // Add light sources
    this.addLighting();

    // Create truck boundaries
    this.createTruckBoundaries(truckDimension);

    // Process each piece and add to the scene
    this.addPieces(parsedPieces);

    // Set up camera position
    this.setupCamera(truckDimension);

    // Add tooltip for hovering
    this.setupTooltip(element);

    // Add event listeners for hovering
    this.setupEventListeners(element);

    // Start animation loop
    this.animate();
  }

  // Initialize the scene, renderer and camera
  private initScene(element: HTMLElement): void {
    // Create the scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Create the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(element.offsetWidth, element.offsetHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Clear any previous renders
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    element.appendChild(this.renderer.domElement);

    // Create the camera
    const aspectRatio = element.offsetWidth / element.offsetHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 50000);

    // Add orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI / 1.5;

    // Create a group for the truck and all its elements
    this.truck = new THREE.Group();
    this.scene.add(this.truck);
  }

  // Add lights to the scene
  private addLighting(): void {
    if (!this.scene) return;

    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    this.scene.add(ambientLight);

    // Directional light for shadows and highlights
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1);
    dirLight1.position.set(1, 1, 1);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight2.position.set(-1, -1, -1);
    this.scene.add(dirLight2);
  }

  // Create the truck boundary wireframe
  private createTruckBoundaries(truckDimension: number[]): void {
    if (!this.truck) return;

    const [truckLength, truckWidth, truckHeight] = truckDimension;

    // Create wireframe for truck boundaries
    const geometry = new THREE.BoxGeometry(truckLength, truckHeight, truckWidth);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
    const wireframe = new THREE.LineSegments(edges, material);

    // Center the wireframe at origin
    wireframe.position.set(truckLength / 2, truckHeight / 2, truckWidth / 2);
    this.truck.add(wireframe);

    // Add floor grid
    const gridHelper = new THREE.GridHelper(Math.max(truckLength, truckWidth), 10);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.set(truckLength / 2, 0, truckWidth / 2);
    this.truck.add(gridHelper);
  }

  // Process each piece and add to the scene
  private addPieces(pieces: any[]): void {
    if (!this.truck) return;

    // Define colors using d3 color scales
    const colors = [
      ...d3.schemeSet1 || [],
      ...d3.schemeSet2 || [],
      ...d3.schemeSet3 || []
    ].map(color => new THREE.Color(color));

    // Process each piece
    pieces.forEach((piece, index) => {
      const [x, y, z, width, length, height, paletId, weight] = piece;

      // Create geometry and material
      const geometry = new THREE.BoxGeometry(width, height, length);
      const boxMaterial = new THREE.MeshPhongMaterial({
        color: colors[index % colors.length],
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });

      // Create mesh and position it
      const boxMesh = new THREE.Mesh(geometry, boxMaterial);
      boxMesh.position.set(x + width / 2, z + height / 2, y + length / 2);

      // Store piece data in userData for tooltip
      boxMesh.userData = {
        paletId,
        weight,
        dimensions: { width, length, height },
        position: { x, y, z }
      };

      // Add to tooltip meshes array for raycasting
      this.tooltipMeshes.push(boxMesh);

      // Add to truck group
      this.truck!.add(boxMesh);

      // Add edges to the box for better visibility
      const edgesGeom = new THREE.EdgesGeometry(geometry);
      const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
      const edges = new THREE.LineSegments(edgesGeom, edgesMaterial);
      boxMesh.add(edges);
    });
  }

  // Set up camera position based on truck dimensions
  private setupCamera(truckDimension: number[]): void {
    if (!this.camera || !this.controls) return;

    const [truckLength, truckWidth, truckHeight] = truckDimension;

    // Calculate appropriate camera position
    const maxDimension = Math.max(truckLength, truckWidth, truckHeight);
    this.camera.position.set(maxDimension * 0.7, maxDimension * 0.7, maxDimension * 0.7);
    this.camera.lookAt(truckLength / 2, truckHeight / 2, truckWidth / 2);

    // Update controls
    this.controls.target.set(truckLength / 2, truckHeight / 2, truckWidth / 2);
    this.controls.update();
  }

  // Create tooltip div for hover information
  private setupTooltip(element: HTMLElement): void {
    this.tooltipDiv = document.createElement('div');
    this.tooltipDiv.className = 'threejs-tooltip';
    this.tooltipDiv.style.position = 'absolute';
    this.tooltipDiv.style.padding = '8px';
    this.tooltipDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.tooltipDiv.style.color = 'white';
    this.tooltipDiv.style.borderRadius = '4px';
    this.tooltipDiv.style.pointerEvents = 'none';
    this.tooltipDiv.style.visibility = 'hidden';
    this.tooltipDiv.style.zIndex = '10001';
    element.appendChild(this.tooltipDiv);
  }

  // Set up event listeners for hover effects
  private setupEventListeners(element: HTMLElement): void {
    if (!this.renderer) return;

    // Mouse move handler for hovering
    element.addEventListener('mousemove', (event) => this.onMouseMove(event, element));

    // Mouse leave handler to hide tooltip
    element.addEventListener('mouseleave', () => {
      if (this.tooltipDiv) {
        this.tooltipDiv.style.visibility = 'hidden';
      }
      this.tooltipActive = false;
    });
  }

  // Handle mouse move for hover effects
  private onMouseMove(event: MouseEvent, element: HTMLElement): void {
    if (!this.camera || !this.scene || !this.tooltipDiv) return;

    // Calculate mouse position in normalized device coordinates
    const rect = element.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update the raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for intersections with pieces
    const intersects = this.raycaster.intersectObjects(this.tooltipMeshes);

    if (intersects.length > 0) {
      // Get the first intersected object
      const intersected = intersects[0].object as THREE.Mesh;
      const userData = intersected.userData;

      // Update tooltip content
      this.tooltipDiv.innerHTML = `
        <strong>Palet ${userData['paletId']}</strong><br>
        Ağırlık: ${userData['weight']} kg<br>
        X: ${userData['dimensions'].width} <br>
        Y: ${userData['dimensions'].length} <br>
        Z: ${userData['dimensions'].height}
      `;

      // Position tooltip next to the cursor
      this.tooltipDiv.style.left = `${event.clientX + 15}px`;
      this.tooltipDiv.style.top = `${event.clientY - 15}px`;
      this.tooltipDiv.style.visibility = 'visible';
      this.tooltipActive = true;
    } else if (this.tooltipActive) {
      // Hide tooltip if not hovering over any piece
      this.tooltipDiv.style.visibility = 'hidden';
      this.tooltipActive = false;
    }
  }

  // Animation loop
  private animate(): void {
    if (!this.scene || !this.camera || !this.renderer || !this.controls) {
      return;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // WeakRef kullanarak memory leak'leri önleyin
    const self = this;
    const renderFrame = function() {
      // Component hala aktif mi kontrol et
      if (!self.scene || !self.camera || !self.renderer) {
        if (self.animationFrameId !== null) {
          cancelAnimationFrame(self.animationFrameId);
          self.animationFrameId = null;
        }
        return;
      }

      if (self.controls) {
        self.controls.update();
      }

      // Render scene
      self.renderer.render(self.scene, self.camera);

      // Sonraki frame için kendini çağır
      self.animationFrameId = requestAnimationFrame(renderFrame);
    };

    // İlk frame'i başlat
    this.animationFrameId = requestAnimationFrame(renderFrame);
  }

  // Handle window resize
  public resize(width: number, height: number): void {
    // Parametreleri kontrol et
    if (!width || !height || width <= 0 || height <= 0) {
      console.warn('ThreejsService: Invalid dimensions for resize', { width, height });
      return;
    }

    if (!this.camera || !this.renderer) {
      console.warn('ThreejsService: Camera or renderer not initialized');
      return;
    }

    try {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    } catch (error) {
      console.error('ThreejsService: Error during resize', error);
    }
  }

  // Clean up resources
  public dispose(): void {
    // Önce animasyon döngüsünü iptal et
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Controls dispose et (eğer varsa)
    if (this.controls) {
      this.controls.dispose();
    }

    // Dispose geometries and materials (eğer scene varsa)
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }

          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => {
                if (material) material.dispose();
              });
            } else if (object.material) {
              object.material.dispose();
            }
          }
        }
      });

      // Clear scene (güvenli bir şekilde)
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
    }

    // Renderer temizle (eğer varsa)
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    // Tooltip temizle (eğer varsa)
    if (this.tooltipDiv && this.tooltipDiv.parentNode) {
      this.tooltipDiv.parentNode.removeChild(this.tooltipDiv);
    }

    // Referansları temizle
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.truck = null;
    this.tooltipDiv = null;
    this.tooltipMeshes = [];
  }

  // Open visualization in a new tab
  public openInNewTab(pieces: any[], truckDimension: number[]): void {
    try {
      // Veri JSON'a dönüştürülür
      const dataStr = JSON.stringify(pieces);
      const dimensionsStr = JSON.stringify(truckDimension);

      // Base64 formatına çevir
      const dataEncoded = btoa(dataStr);
      const dimensionsEncoded = btoa(dimensionsStr);

      // HTML sayfası oluştur
      const htmlContent = `<!DOCTYPE html>
      <html>
      <head>
        <title>Truck Loading Visualization - ThreeJS</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            font-family: Arial, sans-serif;
          }
          #container {
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
          .threejs-tooltip {
            position: absolute;
            padding: 8px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            border-radius: 4px;
            pointer-events: none;
            visibility: hidden;
            z-index: 10001;
          }
        </style>
      </head>
      <body>
        <div id="container">
          <div class="loading">Yükleniyor...</div>
        </div>
        <div id="tooltip" class="threejs-tooltip"></div>
        <button class="close-button" onclick="window.close()">Kapat</button>

        <script type="module">
          // ThreeJS ve modülleri import et
          import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
          import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

          // Veri yükleme
          const dataEncoded = "${dataEncoded}";
          const dimensionsEncoded = "${dimensionsEncoded}";

          // Base64'ten decode et
          const dataStr = atob(dataEncoded);
          const dimensionsStr = atob(dimensionsEncoded);

          // JSON parse et
          const pieces = JSON.parse(dataStr);
          const truckDimension = JSON.parse(dimensionsStr);

          // Yükleniyor mesajını kaldır
          document.querySelector('.loading').style.display = 'none';

          // Scene, camera, renderer oluştur
          const scene = new THREE.Scene();
          scene.background = new THREE.Color(0xf0f0f0);

          const container = document.getElementById('container');
          const renderer = new THREE.WebGLRenderer({ antialias: true });
          renderer.setSize(container.offsetWidth, container.offsetHeight);
          renderer.setPixelRatio(window.devicePixelRatio);
          container.appendChild(renderer.domElement);

          const aspectRatio = container.offsetWidth / container.offsetHeight;
          const camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 50000);

          // Controls
          const controls = new OrbitControls(camera, renderer.domElement);
          controls.enableDamping = true;
          controls.dampingFactor = 0.25;
          controls.screenSpacePanning = false;
          controls.maxPolarAngle = Math.PI / 1.5;

          // Truck group
          const truck = new THREE.Group();
          scene.add(truck);

          // Lighting
          const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
          scene.add(ambientLight);

          const dirLight1 = new THREE.DirectionalLight(0xffffff, 1);
          dirLight1.position.set(1, 1, 1);
          scene.add(dirLight1);

          const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
          dirLight2.position.set(-1, -1, -1);
          scene.add(dirLight2);

          // Truck boundaries
          const [truckLength, truckWidth, truckHeight] = truckDimension;

          const geometry = new THREE.BoxGeometry(truckLength, truckHeight, truckWidth);
          const edges = new THREE.EdgesGeometry(geometry);
          const material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
          const wireframe = new THREE.LineSegments(edges, material);
          wireframe.position.set(truckLength / 2, truckHeight / 2, truckWidth / 2);
          truck.add(wireframe);

          const gridHelper = new THREE.GridHelper(Math.max(truckLength, truckWidth), 10);
          gridHelper.rotation.x = Math.PI / 2;
          gridHelper.position.set(truckLength / 2, 0, truckWidth / 2);
          truck.add(gridHelper);

          // Define colors
          const colors = [
            '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
            '#ffff33', '#a65628', '#f781bf', '#999999', '#66c2a5',
            '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f'
          ].map(color => new THREE.Color(color));

          // Create tooltip
          const tooltipDiv = document.getElementById('tooltip');
          const tooltipMeshes = [];
          let tooltipActive = false;

          // Process pieces
          pieces.forEach((piece, index) => {
            const [x, y, z, width, length, height, paletId, weight] = piece;

            const boxGeometry = new THREE.BoxGeometry(width, height, length);
            const boxMaterial = new THREE.MeshPhongMaterial({
              color: colors[index % colors.length],
              transparent: true,
              opacity: 0.8,
              side: THREE.DoubleSide
            });

            const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
            boxMesh.position.set(x + width / 2, z + height / 2, y + length / 2);

            boxMesh.userData = {
              paletId,
              weight,
              dimensions: { width, length, height },
              position: { x, y, z }
            };

            tooltipMeshes.push(boxMesh);
            truck.add(boxMesh);

            const edgesGeom = new THREE.EdgesGeometry(boxGeometry);
            const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
            const edges = new THREE.LineSegments(edgesGeom, edgesMaterial);
            boxMesh.add(edges);
          });

          // Set up camera position
          const maxDimension = Math.max(truckLength, truckWidth, truckHeight);
          camera.position.set(maxDimension * 0.7, maxDimension * 0.7, maxDimension * 0.7);
          camera.lookAt(truckLength / 2, truckHeight / 2, truckWidth / 2);

          controls.target.set(truckLength / 2, truckHeight / 2, truckWidth / 2);
          controls.update();

          // Raycaster for hovering
          const raycaster = new THREE.Raycaster();
          const mouse = new THREE.Vector2();

          // Event listeners
          container.addEventListener('mousemove', onMouseMove);
          container.addEventListener('mouseleave', onMouseLeave);
          window.addEventListener('resize', onWindowResize);

          function onMouseMove(event) {
            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(tooltipMeshes);

            if (intersects.length > 0) {
              const intersected = intersects[0].object;
              const userData = intersected.userData;

              tooltipDiv.innerHTML = \`
                <strong>Palet \${userData.paletId}</strong><br>
                Ağırlık: \${userData.weight} kg<br>
                X: \${userData.dimensions.width} <br>
                Y: \${userData.dimensions.length} <br>
                Z: \${userData.dimensions.height}
              \`;

              tooltipDiv.style.left = \`\${event.clientX + 15}px\`;
              tooltipDiv.style.top = \`\${event.clientY - 15}px\`;
              tooltipDiv.style.visibility = 'visible';
              tooltipActive = true;
            } else if (tooltipActive) {
              tooltipDiv.style.visibility = 'hidden';
              tooltipActive = false;
            }
          }

          function onMouseLeave() {
            tooltipDiv.style.visibility = 'hidden';
            tooltipActive = false;
          }

          function onWindowResize() {
            camera.aspect = container.offsetWidth / container.offsetHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.offsetWidth, container.offsetHeight);
          }

          // Animation loop
          function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
          }

          animate();
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
}
