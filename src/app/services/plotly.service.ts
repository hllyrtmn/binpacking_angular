import { Injectable } from '@angular/core';

declare var Plotly: any;

@Injectable({
  providedIn: 'root'
})
export class PlotlyService {

  private readonly COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#fbbf24', '#8b5cf6', '#f87171', '#34d399',
    '#60a5fa', '#a78bfa', '#fb7185', '#fde047', '#67e8f9'
  ];

  // Keep track of plot instances for cleanup
  private plotInstances = new Map<HTMLElement, any>();

  constructor() {}

  /**
   * Main method to draw the truck loading solution
   */
  drawSolution(element: HTMLElement, pieces: any[], truckDimension: number[]): any {
    if (!pieces || pieces.length === 0) {
      this.clearPlot(element);
      return null;
    }

    try {
      console.log(`🎨 Rendering ${pieces.length} packages in 3D...`);

      // Process package data for 3D visualization
      const { traces, layout } = this.createVisualizationData(pieces, truckDimension);

      // Enhanced configuration for better UX
      const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: [
          'pan2d', 'select2d', 'lasso2d', 'zoom2d', 'zoomIn2d', 'zoomOut2d',
          'autoScale2d', 'resetScale2d', 'hoverClosestCartesian', 'hoverCompareCartesian',
          'toggleHover', 'resetViews', 'sendDataToCloud', 'hoverClosest3d'
        ],
        modeBarButtonsToAdd: [
          {
            name: 'Görünümü Sıfırla',
            icon: Plotly.Icons.home,
            click: () => this.resetCamera(element)
          },
          {
            name: 'Resim İndir',
            icon: Plotly.Icons.camera,
            click: () => this.exportAsImage(element)
          }
        ]
      };

      // Create the plot
      Plotly.newPlot(element, traces, layout, config).then(() => {
        console.log('✅ 3D visualization rendered successfully');
        this.plotInstances.set(element, { traces, layout, config });
      });

      // Setup interactions
      this.setupInteractions(element);

      return { traces, layout, config };

    } catch (error) {
      console.error('❌ Error creating Plotly visualization:', error);
      this.showError(element, 'Görselleştirme oluşturulurken bir hata oluştu.');
      return null;
    }
  }

  /**
   * Create visualization data for Plotly
   */
  private createVisualizationData(pieces: any[], truckDimension: number[]): { traces: any[], layout: any } {
    const traces: any[] = [];

    // 1. Create truck container outline
    traces.push(this.createTruckOutline(truckDimension));

    // 2. Create package meshes
    const packageTraces = this.createPackageMeshes(pieces);
    traces.push(...packageTraces);

    // 3. Create package edges for better visibility
    const edgeTraces = this.createPackageEdges(pieces);
    traces.push(...edgeTraces);

    // 4. Create layout
    const layout = this.createLayout(truckDimension);

    return { traces, layout };
  }

  /**
   * Create truck container outline
   */
  private createTruckOutline(truckDimension: number[]): any {
    const [L, W, H] = truckDimension;

    // Truck container edges - more comprehensive wireframe
    const x = [
      // Bottom rectangle
      0, L, L, 0, 0, null,
      // Top rectangle
      0, L, L, 0, 0, null,
      // Vertical edges
      0, 0, null, L, L, null, L, L, null, 0, 0, null
    ];

    const y = [
      // Bottom rectangle
      0, 0, W, W, 0, null,
      // Top rectangle
      0, 0, W, W, 0, null,
      // Vertical edges
      0, 0, null, 0, 0, null, W, W, null, W, W, null
    ];

    const z = [
      // Bottom rectangle
      0, 0, 0, 0, 0, null,
      // Top rectangle
      H, H, H, H, H, null,
      // Vertical edges
      0, H, null, 0, H, null, 0, H, null, 0, H, null
    ];

    return {
      type: 'scatter3d',
      mode: 'lines',
      x: x,
      y: y,
      z: z,
      line: {
        color: '#64748b',
        width: 3
      },
      name: 'Tır Konteyneri',
      showlegend: false,
      hoverinfo: 'skip'
    };
  }

  /**
   * Create 3D meshes for packages
   */
  private createPackageMeshes(pieces: any[]): any[] {
    const traces: any[] = [];

    pieces.forEach((piece, index) => {
      const [x, y, z, l, w, h, packageId, weight] = piece;

      // Create vertices for the box
      const vertices = this.createBoxVertices(x, y, z, l, w, h);

      // Create mesh3d trace
      const trace = {
        type: 'mesh3d',
        x: vertices.x,
        y: vertices.y,
        z: vertices.z,
        i: vertices.i,
        j: vertices.j,
        k: vertices.k,
        color: this.COLORS[index % this.COLORS.length],
        opacity: 0.8,
        name: `Palet ${packageId}`,
        hovertemplate:
          `<b>Palet ${packageId}</b><br>` +
          `Boyutlar: ${l}×${w}×${h} mm<br>` +
          `Ağırlık: ${weight} kg<br>` +
          `Pozisyon: (${x}, ${y}, ${z})<br>` +
          `Hacim: ${(l * w * h / 1000000).toFixed(2)} m³<br>` +
          '<extra></extra>',
        showlegend: false,
        // Add custom data for later reference
        customdata: [packageId, weight, l * w * h]
      };

      traces.push(trace);
    });

    return traces;
  }

  /**
   * Create package edges for better visibility
   */
  private createPackageEdges(pieces: any[]): any[] {
    const traces: any[] = [];

    pieces.forEach((piece, index) => {
      const [x, y, z, l, w, h, packageId] = piece;

      // Create edge lines for the box
      const edges = this.createBoxEdges(x, y, z, l, w, h);

      const trace = {
        type: 'scatter3d',
        mode: 'lines',
        x: edges.x,
        y: edges.y,
        z: edges.z,
        line: {
          color: '#1f2937',
          width: 1.5
        },
        name: `Kenar ${packageId}`,
        showlegend: false,
        hoverinfo: 'skip'
      };

      traces.push(trace);
    });

    return traces;
  }

  /**
   * Create box vertices for mesh3d
   */
  private createBoxVertices(x: number, y: number, z: number, l: number, w: number, h: number) {
    // 8 vertices of a box
    const vertices = {
      x: [x, x+l, x+l, x, x, x+l, x+l, x],
      y: [y, y, y+w, y+w, y, y, y+w, y+w],
      z: [z, z, z, z, z+h, z+h, z+h, z+h]
    };

    // Triangulation for 12 faces (2 per box face)
    const faces = {
      i: [0, 0, 0, 1, 1, 2, 2, 3, 4, 4, 4, 5, 5, 6, 6, 7],
      j: [1, 2, 3, 2, 3, 3, 0, 0, 5, 6, 7, 6, 7, 7, 4, 4],
      k: [2, 3, 0, 3, 0, 0, 1, 1, 6, 7, 4, 7, 4, 4, 5, 5]
    };

    return { ...vertices, ...faces };
  }

  /**
   * Create box edges
   */
  private createBoxEdges(x: number, y: number, z: number, l: number, w: number, h: number) {
    const edges = {
      x: [
        // Bottom face
        x, x+l, x+l, x, x, null,
        // Top face
        x, x+l, x+l, x, x, null,
        // Vertical edges
        x, x, null, x+l, x+l, null, x+l, x+l, null, x, x, null
      ],
      y: [
        // Bottom face
        y, y, y+w, y+w, y, null,
        // Top face
        y, y, y+w, y+w, y, null,
        // Vertical edges
        y, y, null, y, y, null, y+w, y+w, null, y+w, y+w, null
      ],
      z: [
        // Bottom face
        z, z, z, z, z, null,
        // Top face
        z+h, z+h, z+h, z+h, z+h, null,
        // Vertical edges
        z, z+h, null, z, z+h, null, z, z+h, null, z, z+h, null
      ]
    };

    return edges;
  }

  /**
   * Create enhanced layout
   */
  private createLayout(truckDimension: number[]): any {
    const [L, W, H] = truckDimension;
    const maxDim = Math.max(L, W, H);

    return {
      title: {
        text: '',
        font: { size: 16, color: '#1f2937' }
      },
      scene: {
        xaxis: {
          title: `Uzunluk (${L} mm)`,
          range: [0, L],
          showgrid: true,
          gridcolor: '#e5e7eb',
          showline: true,
          linecolor: '#9ca3af',
          tickfont: { size: 10, color: '#6b7280' },
          showspikes: false
        },
        yaxis: {
          title: `Genişlik (${W} mm)`,
          range: [0, W],
          showgrid: true,
          gridcolor: '#e5e7eb',
          showline: true,
          linecolor: '#9ca3af',
          tickfont: { size: 10, color: '#6b7280' },
          showspikes: false
        },
        zaxis: {
          title: `Yükseklik (${H} mm)`,
          range: [0, H],
          showgrid: true,
          gridcolor: '#e5e7eb',
          showline: true,
          linecolor: '#9ca3af',
          tickfont: { size: 10, color: '#6b7280' },
          showspikes: false
        },
        aspectratio: {
          x: L / maxDim,
          y: W / maxDim,
          z: H / maxDim
        },
        camera: {
          eye: { x: 1.5, y: 1.5, z: 1.2 },
          up: { x: 0, y: 0, z: 1 },
          center: { x: 0, y: 0, z: 0 }
        },
        bgcolor: '#f8fafc',
        dragmode: 'orbit'
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 0, r: 0, b: 0, t: 0 },
      showlegend: false,
      hovermode: 'closest'
    };
  }

  /**
   * Setup plot interactions
   */
  private setupInteractions(element: HTMLElement): void {
    // Add hover effects
    (element as any).on('plotly_hover', (data: any) => {
      if (data.points && data.points.length > 0) {
        const point = data.points[0];
        if (point.data.type === 'mesh3d') {
          // Increase opacity on hover
          const update = { opacity: 1.0 };
          Plotly.restyle(element, update, point.curveNumber);
        }
      }
    });

    (element as any).on('plotly_unhover', (data: any) => {
      if (data.points && data.points.length > 0) {
        const point = data.points[0];
        if (point.data.type === 'mesh3d') {
          // Reset opacity
          const update = { opacity: 0.8 };
          Plotly.restyle(element, update, point.curveNumber);
        }
      }
    });

    // Add double-click to reset view
    (element as any).on('plotly_doubleclick', () => {
      this.resetCamera(element);
    });

    // Add relayout event for view changes
    (element as any).on('plotly_relayout', (eventData: any) => {
      if (eventData['scene.camera']) {
        console.log('📹 Camera view changed:', eventData['scene.camera']);
      }
    });
  }

  /**
   * Update camera position
   */
  updateCamera(element: HTMLElement, cameraConfig: any): void {
    const update = {
      'scene.camera': cameraConfig
    };
    Plotly.relayout(element, update).then(() => {
      console.log('📹 Camera updated:', cameraConfig);
    }).catch((error: any) => {
      console.warn('Camera update failed:', error);
    });
  }

  /**
   * Reset camera to default position
   */
  resetCamera(element: HTMLElement): void {
    const cameraConfig = {
      eye: { x: 1.5, y: 1.5, z: 1.2 },
      up: { x: 0, y: 0, z: 1 },
      center: { x: 0, y: 0, z: 0 }
    };
    this.updateCamera(element, cameraConfig);
  }

  /**
   * Highlight specific package
   */
  highlightPackage(element: HTMLElement, packageId: number): void {
    try {
      const gd = element as any;
      const data = gd.data || [];

      // Find the trace that corresponds to the package
      let targetTraceIndex = -1;
      for (let i = 0; i < data.length; i++) {
        const trace = data[i];
        if (trace.name === `Palet ${packageId}`) {
          targetTraceIndex = i;
          break;
        }
      }

      if (targetTraceIndex >= 0) {
        // Highlight the specific package
        const updates = data.map((_: any, index: number) => {
          if (index === targetTraceIndex) {
            return { opacity: 1.0, 'line.width': 3 };
          } else if (data[index].type === 'mesh3d') {
            return { opacity: 0.4 };
          }
          return {};
        });

        Plotly.restyle(element, updates).then(() => {
          console.log(`📦 Package ${packageId} highlighted`);

          // Reset after 3 seconds
          setTimeout(() => {
            const resetUpdates = data.map((_: any, index: number) => {
              if (data[index].type === 'mesh3d') {
                return { opacity: 0.8, 'line.width': 1.5 };
              }
              return {};
            });
            Plotly.restyle(element, resetUpdates);
          }, 3000);
        });
      }
    } catch (error) {
      console.warn('Package highlighting failed:', error);
    }
  }

  /**
   * Toggle wireframe mode
   */
  toggleWireframe(element: HTMLElement, enabled: boolean): void {
    try {
      const gd = element as any;
      const data = gd.data || [];
      const updates: any[] = [];

      data.forEach((trace: any, index: number) => {
        if (trace.type === 'mesh3d') {
          updates[index] = {
            opacity: enabled ? 0.2 : 0.8,
            'line.width': enabled ? 2 : 1.5
          };
        }
      });

      if (updates.length > 0) {
        Plotly.restyle(element, updates).then(() => {
          console.log(`🔳 Wireframe mode: ${enabled ? 'ON' : 'OFF'}`);
        });
      }
    } catch (error) {
      console.warn('Wireframe toggle failed:', error);
    }
  }

  /**
   * Update plot data without full re-render
   */
  updateData(element: HTMLElement, newPieces: any[]): void {
    try {
      if (!newPieces || newPieces.length === 0) {
        this.clearPlot(element);
        return;
      }

      // Get current truck dimensions from existing plot
      const gd = element as any;
      if (!gd.layout || !gd.layout.scene) {
        console.warn('Cannot update data: missing layout information');
        return;
      }

      const xRange = gd.layout.scene.xaxis.range;
      const yRange = gd.layout.scene.yaxis.range;
      const zRange = gd.layout.scene.zaxis.range;
      const truckDimension = [xRange[1], yRange[1], zRange[1]];

      // Create new visualization data
      const { traces } = this.createVisualizationData(newPieces, truckDimension);

      // Update the plot
      Plotly.react(element, traces, gd.layout).then(() => {
        console.log('📊 Plot data updated successfully');
      });

    } catch (error) {
      console.error('Data update failed:', error);
    }
  }

  /**
   * Resize plot
   */
  resize(element: HTMLElement): void {
    if (Plotly && element) {
      Plotly.Plots.resize(element);
    }
  }

  /**
   * Clear plot
   */
  clearPlot(element: HTMLElement): void {
    try {
      this.plotInstances.delete(element);
      Plotly.purge(element);
    } catch (error) {
      console.warn('Plot clear failed:', error);
    }
  }

  /**
   * Purge plot
   */
  purge(element: HTMLElement): void {
    try {
      this.plotInstances.delete(element);
      Plotly.purge(element);
    } catch (error) {
      console.warn('Plot purge failed:', error);
    }
  }

  /**
   * Export plot as image
   */
  exportAsImage(element: HTMLElement, filename: string = 'truck-loading', format: string = 'png'): void {
    const options = {
      format: format,
      width: 1920,
      height: 1080,
      filename: filename,
      scale: 1
    };

    Plotly.downloadImage(element, options).then(() => {
      console.log(`📷 Image exported: ${filename}.${format}`);
    }).catch((error: any) => {
      console.error('Image export failed:', error);
    });
  }

  /**
   * Show error message
   */
  private showError(element: HTMLElement, message: string): void {
    element.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ef4444; font-size: 14px; font-family: Arial, sans-serif;">
        <div style="text-align: center; padding: 2rem; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <div style="font-weight: 600; margin-bottom: 8px;">Görselleştirme Hatası</div>
          <div style="font-size: 12px; color: #991b1b;">${message}</div>
          <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Sayfayı Yenile
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Get plot statistics
   */
  getPlotStats(element: HTMLElement): any {
    try {
      const gd = element as any;
      const data = gd.data || [];

      const packageCount = data.filter((trace: any) => trace.type === 'mesh3d').length;
      const totalTraces = data.length;

      return {
        packageCount,
        totalTraces,
        isFullscreen: !!document.fullscreenElement,
        plotDimensions: {
          width: element.offsetWidth,
          height: element.offsetHeight
        }
      };
    } catch (error) {
      console.warn('Failed to get plot stats:', error);
      return null;
    }
  }

  /**
   * Take screenshot of current view
   */
  async takeScreenshot(element: HTMLElement): Promise<string | null> {
    try {
      const imgData = await Plotly.toImage(element, {
        format: 'png',
        width: element.offsetWidth,
        height: element.offsetHeight,
        scale: 1
      });

      console.log('📸 Screenshot taken successfully');
      return imgData;
    } catch (error) {
      console.error('Screenshot failed:', error);
      return null;
    }
  }

  /**
   * Animate camera movement
   */
  animateCameraTo(element: HTMLElement, targetCamera: any, duration: number = 1000): void {
    const steps = 30;
    const stepDuration = duration / steps;

    try {
      const gd = element as any;
      const currentCamera = gd.layout.scene.camera;

      let step = 0;
      const animate = () => {
        if (step >= steps) return;

        step++;
        const progress = step / steps;

        // Linear interpolation
        const interpolatedCamera = {
          eye: {
            x: currentCamera.eye.x + (targetCamera.eye.x - currentCamera.eye.x) * progress,
            y: currentCamera.eye.y + (targetCamera.eye.y - currentCamera.eye.y) * progress,
            z: currentCamera.eye.z + (targetCamera.eye.z - currentCamera.eye.z) * progress
          },
          center: targetCamera.center || currentCamera.center,
          up: targetCamera.up || currentCamera.up
        };

        Plotly.relayout(element, { 'scene.camera': interpolatedCamera });

        if (step < steps) {
          setTimeout(animate, stepDuration);
        }
      };

      animate();
    } catch (error) {
      console.warn('Camera animation failed:', error);
      // Fallback to direct camera update
      this.updateCamera(element, targetCamera);
    }
  }

  /**
   * Check if Plotly is loaded and ready
   */
  isPlotlyReady(): boolean {
    return typeof Plotly !== 'undefined' && Plotly.newPlot;
  }

  /**
   * Get Plotly version info
   */
  getPlotlyInfo(): any {
    if (this.isPlotlyReady()) {
      return {
        version: Plotly.version || 'unknown',
        build: Plotly.BUILD || 'unknown',
        ready: true
      };
    }
    return { ready: false };
  }

  /**
   * Cleanup all plot instances
   */
  cleanup(): void {
    this.plotInstances.forEach((_, element) => {
      try {
        this.purge(element);
      } catch (error) {
        console.warn('Cleanup failed for element:', error);
      }
    });
    this.plotInstances.clear();
    console.log('🧹 PlotlyService cleanup completed');
  }
}
