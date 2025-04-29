
import { Injectable } from '@angular/core';
import * as Plotly from 'plotly.js-dist-min';
import * as _ from 'lodash';
import * as d3 from 'd3';
import { Layout } from 'plotly.js';
import { Config } from 'plotly.js';

@Injectable({
  providedIn: 'root'
})
export class PlotlyService {
  constructor() { }

  // Creates the vertices of a 3D cube at the given position with given dimensions
  private cubeData(position3d: number[], size: number[] = [1, 1, 1]): number[][] {
    // Create a unit cube
    const cube = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1]
    ];

    // Scale the cube to the desired size
    const scaledCube = cube.map(vertex =>
      vertex.map((coord, i) => coord * size[i])
    );

    // Translate the cube to the desired position
    return scaledCube.map(vertex =>
      vertex.map((coord, i) => coord + position3d[i])
    );
  }

  // Triangulates cube faces for Plotly Mesh3d visualization
  private triangulateCubeFaces(positions: number[][], sizes: number[][] | null = null): {
    vertices: number[][],
    I: number[],
    J: number[],
    K: number[]
  } {
    if (!sizes) {
      sizes = Array(positions.length).fill([1, 1, 1]);
    }

    if (sizes.length !== positions.length) {
      throw new Error('Positions and sizes arrays must have the same length');
    }

    // Create cubes for each position and size
    const allCubes = positions.map((pos, idx) =>
      sizes![idx][2] !== 0 ? this.cubeData(pos, sizes![idx]) : null
    ).filter(cube => cube !== null) as number[][][];

    // Flatten all vertices to a single array
    const allVertices = allCubes.flat();

    // Find unique vertices
    const uniqueVerticesMap = new Map();
    let vertexIdx = 0;

    allVertices.forEach(vertex => {
      const key = vertex.join(',');
      if (!uniqueVerticesMap.has(key)) {
        uniqueVerticesMap.set(key, vertexIdx++);
      }
    });

    // Create the unique vertices array
    const vertices: number[][] = Array.from(uniqueVerticesMap.keys()).map(key =>
      key.split(',').map(Number)
    );

    // Create indices arrays for triangulation
    const I: number[] = [];
    const J: number[] = [];
    const K: number[] = [];

    for (let k = 0; k < allCubes.length; k++) {
      const cubeIndices = allCubes[k].map(vertex =>
        uniqueVerticesMap.get(vertex.join(','))
      );

      // Triangulation pattern (same as Python code)
      const indices = [
        [0, 2, 0, 5, 0, 7, 5, 2, 3, 6, 7, 5],
        [1, 3, 4, 1, 3, 4, 1, 6, 7, 2, 4, 6],
        [2, 0, 5, 0, 7, 0, 2, 5, 6, 3, 5, 7]
      ];

      for (let i = 0; i < 12; i++) {
        I.push(cubeIndices[indices[0][i]]);
        J.push(cubeIndices[indices[1][i]]);
        K.push(cubeIndices[indices[2][i]]);
      }
    }

    return { vertices, I, J, K };
  }

  // Renders the 3D visualization of the truck loading solution
  public drawSolution(element: HTMLElement, pieces: any[], truckDimension: number[]): any {
    if (!pieces || pieces.length === 0) {
      console.error('No pieces data provided');
      return;
    }

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

    const positions: number[][] = [];
    const sizes: number[][] = [];
    const sortedSize: Set<string>[] = [];
    const texts: string[] = [];

    // Process each piece
    parsedPieces.forEach((piece: number[]) => {
      positions.push(piece.slice(0, 3));
      sizes.push(piece.slice(3, 6));
      sortedSize.push(new Set(piece.slice(3, 6).map(String)));
      texts.push(`Palet ${piece[6]}<br>Ağırlık: ${piece[7]} kg<br>X: ${piece[3]} <br>Y: ${piece[4]}`);
    });

    // Define colors using Plotly's qualitative color scales
    const colors = [
      ...d3.schemeSet1 || [],
      ...d3.schemeSet2 || [],
      ...d3.schemeSet3 || []
    ];

    // Generate mesh data for 3D visualization
    const { vertices, I, J, K } = this.triangulateCubeFaces(positions, sizes);

    // Prepare colors for each face
    const faceColors: string[] = [];

    for (let i = 0; i < parsedPieces.length; i++) {
      const sizeKey = Array.from(sortedSize[i]).join(',');
      const colorIndex = i % colors.length;

      // Each cube has 12 triangular faces
      for (let j = 0; j < 12; j++) {
        faceColors.push(colors[colorIndex]);
      }
    }

    // Extract X, Y, Z coordinates from vertices
    const X = vertices.map(v => v[0]);
    const Y = vertices.map(v => v[1]);
    const Z = vertices.map(v => v[2]);

    // Prepare hover texts
    const hoverTextsExpanded: string[] = [];
    texts.forEach(text => {
      // Each cube has 12 faces
      for (let i = 0; i < 12; i++) {
        hoverTextsExpanded.push(text);
      }
    });

    // Create the 3D mesh
    const mesh3d = {
      type: 'mesh3d',
      x: X,
      y: Y,
      z: Z,
      i: I,
      j: J,
      k: K,
      facecolor: faceColors,
      flatshading: true,
      opacity: 1,
      hovertext: hoverTextsExpanded,
      hovertemplate: '<b>%{hovertext}</b><br><extra></extra>'
    };

    // Create annotations for each piece
    const annotations: any[] = [];
    positions.forEach((pos, idx) => {
      const size = sizes[idx];
      const text = texts[idx];

      annotations.push({
        type: 'scatter3d',
        x: [pos[0] + size[0] / 2],
        y: [pos[1] + size[1] / 2],
        z: [pos[2] + size[2]],
        mode: 'text',
        text: [text],
        textposition: 'middle center',
        name: text,
        showlegend: false,
        marker: {
          size: 6,
          color: 'black',
          symbol: 'circle'
        }
      });
    });

    // Calculate range for axes
    const xRange = [Math.min(...X), truckDimension[0]];
    const yRange = [Math.min(...Y), truckDimension[1]];
    const zRange = [Math.min(...Z), truckDimension[2]];

    // Calculate aspect ratio
    const maxRange = Math.max(...truckDimension);
    const aspectRatio = {
      x: truckDimension[0] / maxRange,
      y: truckDimension[1] / maxRange,
      z: truckDimension[2] / maxRange
    };

    // Create edge traces for each piece
    const edgeTraces: any[] = [];
    positions.forEach((pos, idx) => {
      const size = sizes[idx];
      const x0 = pos[0];
      const y0 = pos[1];
      const z0 = pos[2];
      const w = size[0];
      const l = size[1];
      const h = size[2];

      // Define edges
      const edges = [
        [[x0, x0 + w], [y0, y0], [z0, z0]],
        [[x0, x0], [y0, y0 + l], [z0, z0]],
        [[x0, x0], [y0, y0], [z0, z0 + h]],
        [[x0 + w, x0 + w], [y0, y0 + l], [z0, z0]],
        [[x0, x0 + w], [y0 + l, y0 + l], [z0, z0]],
        [[x0, x0 + w], [y0, y0], [z0 + h, z0 + h]],
        [[x0, x0], [y0, y0 + l], [z0 + h, z0 + h]],
        [[x0 + w, x0 + w], [y0, y0 + l], [z0 + h, z0 + h]],
        [[x0, x0 + w], [y0 + l, y0 + l], [z0 + h, z0 + h]]
      ];

      edges.forEach(edge => {
        edgeTraces.push({
          type: 'scatter3d',
          x: edge[0],
          y: edge[1],
          z: edge[2],
          mode: 'lines',
          line: {
            color: 'black',
            width: 1
          },
          showlegend: false
        });
      });
    });

    // Layout configuration
    const layout :Partial<Layout> =  {
      autosize: true,
      margin: {
        l: 0,
        r: 0,
        b: 0,
        t: 40
      },
      title: {
        text: 'Truck Loading Solution',
        x: 0.5
      },
      dragmode: false,
      scene: {
        xaxis: {
          title: `X Ekseni ${Math.floor(truckDimension[0])}`,
          range: xRange,
          showticklabels: false,
          showgrid: false,
          zeroline: false
        },
        yaxis: {
          title: `Y Ekseni ${Math.floor(truckDimension[1])}`,
          range: yRange,
          showticklabels: false,
          showgrid: false,
          zeroline: false
        },
        zaxis: {
          range: zRange,
          showticklabels: false,
          showgrid: false,
          zeroline: false
        },
        aspectratio: aspectRatio,
        camera: {
          eye: { x: 0, y: 0, z: 0.6 },
          up: { x: 0, y: 1, z: 0 }
        }
      }
    };

    // Config options for plot
    const config : Partial<Config> = {
      responsive: true,
      displayModeBar: true,
      scrollZoom: false,
      staticPlot: false,
      modeBarButtonsToRemove: [
        'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d',
        'autoScale2d', 'resetScale2d', 'hoverClosestCartesian', 'hoverCompareCartesian',
        'orbitRotation', 'tableRotation', 'resetCameraDefault3d', 'resetCameraLastSave3d'
      ],
      modeBarButtonsToAdd: ['toImage'],
      toImageButtonOptions: {
        format: 'png',
        filename: 'truck_loading_solution'
      }
    };

    // Create and render the plot
    Plotly.newPlot(
      element,
      [mesh3d, ...annotations, ...edgeTraces],
      layout,
      config
    );

    // Return color information for potential future use
    return {
      sortedSize,
      colors
    };
  }

}
