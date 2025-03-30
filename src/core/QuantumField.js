// src/core/QuantumField.js
/**
 * QuantumField - Core quantum field simulation engine
 * 
 * Simulates a quantum tensor field with various evolution equations
 * and provides data for visualization.
 */
export class QuantumField {
  /**
   * Create a new quantum field
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Default configuration
    this.config = {
      dimensions: options.dimensions || 2,
      resolution: options.resolution || 128,
      evolutionMode: options.evolutionMode || 'schrödinger',
      useGPU: options.useGPU !== undefined ? options.useGPU : true,
      initialState: options.initialState || 'superposition',
      potentialType: options.potentialType || 'none',
      boundaryCondition: options.boundaryCondition || 'periodic'
    };
    
    // Compute field size based on dimensions
    this.fieldSize = {
      width: this.config.resolution,
      height: this.config.resolution,
      depth: this.config.dimensions > 2 ? this.config.resolution : 1
    };
    
    // Create field data as complex values (real, imaginary pairs)
    this.fieldData = new Float32Array(
      this.fieldSize.width * this.fieldSize.height * 4
    );
    
    // For 3D/4D fields, create tensor data
    if (this.config.dimensions > 2) {
      this.tensorData = new Float32Array(
        this.fieldSize.width * this.fieldSize.height * this.fieldSize.depth * 4
      );
    }
    
    // Potential field for simulation
    this.potentialField = new Float32Array(
      this.fieldSize.width * this.fieldSize.height * 4
    );
    
    // Parameters for field evolution
    this.evolutionParams = {
      dt: 0.01,              // Time step size
      hbar: 1.0,             // Reduced Planck constant
      mass: 1.0,             // Particle mass
      damping: 0.0,          // Damping coefficient
      coupling: 0.0,         // Self-interaction coupling
      potentialStrength: 1.0 // Potential strength scaling
    };
    
    // Initialize with selected state
    this.initializeField(this.config.initialState);
    
    // Set up potential field
    this.setupPotential(this.config.potentialType);
    
    // For WebGL compute, we'll need to set up compute shaders
    this.gpuCompute = null;
    if (this.config.useGPU) {
      // This will be initialized when needed and available
      // Depends on WebGL2 and appropriate extensions
      this.initializeGPUCompute();
    }
    
    console.info(`Quantum field initialized: ${this.config.dimensions}D at ${this.config.resolution} resolution`);
  }
  
  /**
   * Initialize the field with a specific state
   * @param {string} stateType - Type of initial state
   */
  initializeField(stateType) {
    const { width, height } = this.fieldSize;
    
    // Helper to set a complex value at x,y
    const setComplex = (x, y, real, imag) => {
      const idx = (y * width + x) * 4;
      this.fieldData[idx] = real;
      this.fieldData[idx + 1] = imag;
      // Zero out the other components which are unused in 2D
      this.fieldData[idx + 2] = 0;
      this.fieldData[idx + 3] = 0;
    };
    
    // Clear the field first
    this.fieldData.fill(0);
    
    switch (stateType) {
      case 'superposition': {
        // Superposition of eigenstates
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            // Normalized coordinates [-1, 1]
            const nx = (x / width) * 2 - 1;
            const ny = (y / height) * 2 - 1;
            
            // Distance from center
            const r = Math.sqrt(nx * nx + ny * ny);
            const theta = Math.atan2(ny, nx);
            
            // Superposition of different modes
            const amp = Math.exp(-r * 5);
            const phase1 = 3 * theta;
            const phase2 = 5 * theta;
            
            // Add two rotational modes with opposite directions
            const real = amp * (Math.cos(phase1) + Math.cos(phase2)) * 0.5;
            const imag = amp * (Math.sin(phase1) - Math.sin(phase2)) * 0.5;
            
            setComplex(x, y, real, imag);
          }
        }
        break;
      }
      
      case 'gaussian': {
        // Gaussian wave packet
        const packetWidth = 0.1;
        const k0x = 20; // Initial momentum in x direction
        const k0y = 0;  // Initial momentum in y direction
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            // Normalized coordinates [-1, 1]
            const nx = (x / width) * 2 - 1;
            const ny = (y / height) * 2 - 1;
            
            // Gaussian envelope
            const r2 = nx * nx + ny * ny;
            const envelope = Math.exp(-r2 / (2 * packetWidth * packetWidth));
            
            // Phase from initial momentum
            const phase = k0x * nx + k0y * ny;
            
            const real = envelope * Math.cos(phase);
            const imag = envelope * Math.sin(phase);
            
            setComplex(x, y, real, imag);
          }
        }
        break;
      }
      
      case 'excited': {
        // Higher energy eigenstate (n=2, m=1)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            // Normalized coordinates [-1, 1]
            const nx = (x / width) * 2 - 1;
            const ny = (y / height) * 2 - 1;
            
            // Distance from center and angle
            const r = Math.sqrt(nx * nx + ny * ny);
            const theta = Math.atan2(ny, nx);
            
            // nth excited state with angular momentum m
            const n = 2;
            const m = 1;
            
            // Simplified approximation of excited state
            const radial = Math.pow(r, m) * Math.exp(-r * n);
            
            const real = radial * Math.cos(m * theta);
            const imag = radial * Math.sin(m * theta);
            
            setComplex(x, y, real, imag);
          }
        }
        break;
      }
      
      case 'vortex': {
        // Quantum vortex
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            // Normalized coordinates [-1, 1]
            const nx = (x / width) * 2 - 1;
            const ny = (y / height) * 2 - 1;
            
            // Distance from center and angle
            const r = Math.sqrt(nx * nx + ny * ny);
            const theta = Math.atan2(ny, nx);
            
            // Vortex envelope (zero at center, growing then decaying)
            const envelope = r * Math.exp(-r * 3);
            
            // Phase wraps around vortex core
            const vortexCharge = 1; // Topological charge
            
            const real = envelope * Math.cos(vortexCharge * theta);
            const imag = envelope * Math.sin(vortexCharge * theta);
            
            setComplex(x, y, real, imag);
          }
        }
        break;
      }
      
      case 'random': {
        // Random field
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const real = (Math.random() * 2 - 1) * 0.1;
            const imag = (Math.random() * 2 - 1) * 0.1;
            
            setComplex(x, y, real, imag);
          }
        }
        break;
      }
      
      default:
        console.warn(`Unknown state type: ${stateType}, using superposition`);
        this.initializeField('superposition');
        return;
    }
    
    // Normalize the field
    this.normalizeField();
    
    // For 3D/4D fields, initialize tensor data as well
    if (this.config.dimensions > 2 && this.tensorData) {
      this.initializeTensorField(stateType);
    }
    
    console.info(`Field initialized with state: ${stateType}`);
  }
  
  /**
   * Initialize tensor field for 3D/4D simulations
   * @param {string} stateType - Type of initial state
   */
  initializeTensorField(stateType) {
    const { width, height, depth } = this.fieldSize;
    
    // Clear tensor data
    this.tensorData.fill(0);
    
    // Helper to set a tensor value at x,y,z
    const setTensor = (x, y, z, r1, i1, r2, i2) => {
      const idx = (z * width * height + y * width + x) * 4;
      this.tensorData[idx] = r1;
      this.tensorData[idx + 1] = i1;
      this.tensorData[idx + 2] = r2;
      this.tensorData[idx + 3] = i2;
    };
    
    switch (stateType) {
      case 'superposition': {
        // 3D superposition of eigenstates
        for (let z = 0; z < depth; z++) {
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              // Normalized coordinates [-1, 1]
              const nx = (x / width) * 2 - 1;
              const ny = (y / height) * 2 - 1;
              const nz = (z / depth) * 2 - 1;
              
              // Distance from center
              const r = Math.sqrt(nx * nx + ny * ny + nz * nz);
              const theta = Math.atan2(ny, nx);
              const phi = Math.acos(nz / (r || 1));
              
              // 3D spherical harmonic approximation
              const amp = Math.exp(-r * 3);
              const phase1 = 2 * theta + phi;
              const phase2 = 3 * theta - phi;
              
              const r1 = amp * Math.cos(phase1);
              const i1 = amp * Math.sin(phase1);
              const r2 = amp * 0.5 * Math.cos(phase2);
              const i2 = amp * 0.5 * Math.sin(phase2);
              
              setTensor(x, y, z, r1, i1, r2, i2);
            }
          }
        }
        break;
      }
      
      // Additional 3D state initializations would go here
      
      default:
        // For other states, initialize with a simpler pattern
        for (let z = 0; z < depth; z++) {
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              // Normalized coordinates [-1, 1]
              const nx = (x / width) * 2 - 1;
              const ny = (y / height) * 2 - 1;
              const nz = (z / depth) * 2 - 1;
              
              // Distance from center
              const r = Math.sqrt(nx * nx + ny * ny + nz * nz);
              
              // Simple 3D gaussian
              const amp = Math.exp(-r * 3);
              const phase = r * 10;
              
              const r1 = amp * Math.cos(phase);
              const i1 = amp * Math.sin(phase);
              const r2 = amp * 0.5;
              const i2 = 0;
              
              setTensor(x, y, z, r1, i1, r2, i2);
            }
          }
        }
    }
    
    // Normalize the tensor field
    this.normalizeTensorField();
  }
  
  /**
   * Set up potential field
   * @param {string} potentialType - Type of potential
   */
  setupPotential(potentialType) {
    const { width, height } = this.fieldSize;
    
    // Clear potential field
    this.potentialField.fill(0);
    
    // Helper to set a potential value at x,y
    const setPotential = (x, y, value) => {
      const idx = (y * width + x) * 4;
      this.potentialField[idx] = value;
      this.potentialField[idx + 1] = 0;
      this.potentialField[idx + 2] = 0;
      this.potentialField[idx + 3] = 0;
    };
    
    switch (potentialType) {
      case 'none': {
        // No potential (free particle)
        break;
      }
      
      case 'harmonic': {
        // Harmonic oscillator potential (r^2)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            // Normalized coordinates [-1, 1]
            const nx = (x / width) * 2 - 1;
            const ny = (y / height) * 2 - 1;
            
            // Quadratic potential
            const potential = (nx * nx + ny * ny) * 5;
            
            setPotential(x, y, potential);
          }
        }
        break;
      }
      
      case 'barrier': {
        // Quantum barrier (wall in the middle)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            // Normalized coordinates [-1, 1]
            const nx = (x / width) * 2 - 1;
            
            // Central barrier
            const barrierWidth = 0.05;
            const barrierHeight = 10;
            
            const potential = (Math.abs(nx) < barrierWidth) ? barrierHeight : 0;
            
            setPotential(x, y, potential);
          }
        }
        break;
      }
      
      case 'well': {
        // Potential well (box)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            // Normalized coordinates [-1, 1]
            const nx = (x / width) * 2 - 1;
            const ny = (y / height) * 2 - 1;
            
            // Square well
            const boxSize = 0.5;
            const wellDepth = -3;
            const outsidePotential = 0;
            
            const inBox = Math.abs(nx) < boxSize && Math.abs(ny) < boxSize;
            const potential = inBox ? wellDepth : outsidePotential;
            
            setPotential(x, y, potential);
          }
        }
        break;
      }
      
      case 'custom': {
        // Custom potential is initialized empty and drawn by user
        break;
      }
      
      default:
        console.warn(`Unknown potential type: ${potentialType}, using none`);
        return;
    }
    
    console.info(`Potential field setup: ${potentialType}`);
  }
  
  /**
   * Normalize the field to ensure probability conservation
   */
  normalizeField() {
    const { width, height } = this.fieldSize;
    
    // Calculate total probability
    let totalProbability = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const real = this.fieldData[idx];
        const imag = this.fieldData[idx + 1];
        
        // Add squared magnitude to total probability
        totalProbability += real * real + imag * imag;
      }
    }
    
    // Skip if total is close to zero
    if (totalProbability < 1e-10) return;
    
    // Normalize by dividing by sqrt of total probability
    const normalizationFactor = 1.0 / Math.sqrt(totalProbability);
    
    for (let i = 0; i < this.fieldData.length; i++) {
      this.fieldData[i] *= normalizationFactor;
    }
  }
  
  /**
   * Normalize the tensor field
   */
  normalizeTensorField() {
    if (!this.tensorData) return;
    
    const { width, height, depth } = this.fieldSize;
    
    // Calculate total probability
    let totalProbability = 0;
    
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (z * width * height + y * width + x) * 4;
          const r1 = this.tensorData[idx];
          const i1 = this.tensorData[idx + 1];
          const r2 = this.tensorData[idx + 2];
          const i2 = this.tensorData[idx + 3];
          
          // Add squared magnitude of all components
          totalProbability += r1 * r1 + i1 * i1 + r2 * r2 + i2 * i2;
        }
      }
    }
    
    // Skip if total is close to zero
    if (totalProbability < 1e-10) return;
    
    // Normalize by dividing by sqrt of total probability
    const normalizationFactor = 1.0 / Math.sqrt(totalProbability);
    
    for (let i = 0; i < this.tensorData.length; i++) {
      this.tensorData[i] *= normalizationFactor;
    }
  }
  
  /**
   * Initialize GPU compute capabilities if WebGL2 is available
   */
  initializeGPUCompute() {
    // This is a stub - in a real implementation, this would
    // set up WebGL2 compute shaders for field evolution
    
    // Check for WebGL2 support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
      console.warn('WebGL2 not supported, falling back to CPU computation');
      this.config.useGPU = false;
      return;
    }
    
    // Check for necessary extensions
    const exts = {
      floatTexture: gl.getExtension('EXT_color_buffer_float'),
      textureFloat: gl.getExtension('OES_texture_float'),
      linearFloatFiltering: gl.getExtension('OES_texture_float_linear')
    };
    
    if (!exts.floatTexture) {
      console.warn('EXT_color_buffer_float not supported, falling back to CPU computation');
      this.config.useGPU = false;
      return;
    }
    
    // In a real implementation, we would set up compute shaders here
    // This is just a placeholder indicating support
    this.gpuCompute = {
      gl,
      supported: true,
      extensions: exts
    };
    
    console.info('GPU compute initialized successfully');
  }
  
  /**
   * Evolve the field forward in time by one step
   * @param {number} dt - Time step size (optional, uses internal step size if not provided)
   */
  evolveField(dt = null) {
    // Use provided dt or default
    const timeStep = dt || this.evolutionParams.dt;
    
    if (this.config.useGPU && this.gpuCompute?.supported) {
      // Use GPU computation
      this.evolveFieldGPU(timeStep);
    } else {
      // Use CPU computation
      this.evolveFieldCPU(timeStep);
    }
  }
  
  /**
   * Evolve the field using CPU computation
   * @param {number} dt - Time step size
   */
  evolveFieldCPU(dt) {
    const { width, height } = this.fieldSize;
    const { hbar, mass, damping, coupling } = this.evolutionParams;
    
    // Create temporary buffer for next state
    const nextState = new Float32Array(this.fieldData.length);
    
    // Apply evolution equation based on selected mode
    switch (this.config.evolutionMode) {
      case 'schrödinger': {
        // Schrödinger equation evolution
        // i*ħ*∂ψ/∂t = -ħ²/(2m)*∇²ψ + V*ψ
        
        // Factor for second derivative term
        const hbar2_2m = hbar * hbar / (2 * mass);
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            // Current state
            const real = this.fieldData[idx];
            const imag = this.fieldData[idx + 1];
            
            // Calculate Laplacian (∇²ψ) using finite difference
            let laplacianReal = 0;
            let laplacianImag = 0;
            
            // Neighboring cells with periodic boundary conditions
            const xp1 = (x + 1) % width;
            const xm1 = (x - 1 + width) % width;
            const yp1 = (y + 1) % height;
            const ym1 = (y - 1 + height) % height;
            
            // Center cell (multiplied by -4)
            laplacianReal -= 4 * real;
            laplacianImag -= 4 * imag;
            
            // Adjacent cells
            laplacianReal += this.fieldData[(y * width + xp1) * 4];
            laplacianImag += this.fieldData[(y * width + xp1) * 4 + 1];
            
            laplacianReal += this.fieldData[(y * width + xm1) * 4];
            laplacianImag += this.fieldData[(y * width + xm1) * 4 + 1];
            
            laplacianReal += this.fieldData[(yp1 * width + x) * 4];
            laplacianImag += this.fieldData[(yp1 * width + x) * 4 + 1];
            
            laplacianReal += this.fieldData[(ym1 * width + x) * 4];
            laplacianImag += this.fieldData[(ym1 * width + x) * 4 + 1];
            
            // Get potential at this location
            const potential = this.potentialField[idx];
            
            // Nonlinear term (for coupling/self-interaction)
            const nonlinearTerm = coupling * (real * real + imag * imag);
            
            // Time evolution
            // Real part gets contribution from imaginary part of Hamiltonian
            // Imaginary part gets contribution from real part of Hamiltonian (with sign flip)
            nextState[idx] = real + dt * (
              hbar2_2m * laplacianImag - // Kinetic energy
              (potential + nonlinearTerm) * imag - // Potential energy
              damping * real // Damping term
            );
            
            nextState[idx + 1] = imag - dt * (
              hbar2_2m * laplacianReal - // Kinetic energy
              (potential + nonlinearTerm) * real - // Potential energy
              damping * imag // Damping term
            );
            
            // Zero out unused components
            nextState[idx + 2] = 0;
            nextState[idx + 3] = 0;
          }
        }
        break;
      }
      
      case 'heat': {
        // Heat/diffusion equation
        // ∂ψ/∂t = D*∇²ψ
        const diffusionConstant = 0.5;
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            // Current state
            const real = this.fieldData[idx];
            const imag = this.fieldData[idx + 1];
            
            // Calculate Laplacian (∇²ψ) using finite difference
            let laplacianReal = 0;
            let laplacianImag = 0;
            
            // Neighboring cells with periodic boundary conditions
            const xp1 = (x + 1) % width;
            const xm1 = (x - 1 + width) % width;
            const yp1 = (y + 1) % height;
            const ym1 = (y - 1 + height) % height;
            
            // Center cell (multiplied by -4)
            laplacianReal -= 4 * real;
            laplacianImag -= 4 * imag;
            
            // Adjacent cells
            laplacianReal += this.fieldData[(y * width + xp1) * 4];
            laplacianImag += this.fieldData[(y * width + xp1) * 4 + 1];
            
            laplacianReal += this.fieldData[(y * width + xm1) * 4];
            laplacianImag += this.fieldData[(y * width + xm1) * 4 + 1];
            
            laplacianReal += this.fieldData[(yp1 * width + x) * 4];
            laplacianImag += this.fieldData[(yp1 * width + x) * 4 + 1];
            
            laplacianReal += this.fieldData[(ym1 * width + x) * 4];
            laplacianImag += this.fieldData[(ym1 * width + x) * 4 + 1];
            
            // Simple diffusion
            nextState[idx] = real + dt * diffusionConstant * laplacianReal;
            nextState[idx + 1] = imag + dt * diffusionConstant * laplacianImag;
            
            // Zero out unused components
            nextState[idx + 2] = 0;
            nextState[idx + 3] = 0;
          }
        }
        break;
      }
      
      case 'dirac':
      case 'klein-gordon':
        // These would implement more complex relativistic wave equations
        // Simplified versions that just spread the wave packet
        this.evolveFieldCPU(dt);
        return;
      
      default:
        console.warn(`Unknown evolution mode: ${this.config.evolutionMode}, using Schrödinger`);
        this.config.evolutionMode = 'schrödinger';
        this.evolveFieldCPU(dt);
        return;
    }
    
    // Swap buffers: update field data with next state
    this.fieldData = nextState;
    
    // Periodically renormalize to counter numerical errors
    this.normalizeField();
    
    // For 3D/4D fields, evolve tensor data as well
    if (this.config.dimensions > 2 && this.tensorData) {
      this.evolveTensorField(dt);
    }
  }
  
  /**
   * Evolve the tensor field for 3D/4D simulations
   * @param {number} dt - Time step size
   */
  evolveTensorField(dt) {
    // This is a simplified placeholder for tensor field evolution
    // In a real implementation, this would handle higher-dimensional evolution
    
    // For now, just apply a simple phase rotation to demonstrate evolution
    const { width, height, depth } = this.fieldSize;
    const rotationAngle = dt * 2; // Phase rotation speed
    
    const cos = Math.cos(rotationAngle);
    const sin = Math.sin(rotationAngle);
    
    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (z * width * height + y * width + x) * 4;
          
          // Apply rotation to each complex component
          const r1 = this.tensorData[idx];
          const i1 = this.tensorData[idx + 1];
          const r2 = this.tensorData[idx + 2];
          const i2 = this.tensorData[idx + 3];
          
          // Complex number rotation
          this.tensorData[idx] = r1 * cos - i1 * sin;
          this.tensorData[idx + 1] = r1 * sin + i1 * cos;
          this.tensorData[idx + 2] = r2 * cos - i2 * sin;
          this.tensorData[idx + 3] = r2 * sin + i2 * cos;
        }
      }
    }
  }
  
  /**
   * Evolve the field using GPU computation
   * @param {number} dt - Time step size
   */
  evolveFieldGPU(dt) {
    // This is a stub - in a real implementation, this would
    // use WebGL2 compute shaders for field evolution
    
    if (!this.gpuCompute?.supported) {
      console.warn('GPU compute not supported, falling back to CPU');
      this.evolveFieldCPU(dt);
      return;
    }
    
    // In a real implementation, we would:
    // 1. Update uniform values (dt, parameters)
    // 2. Bind field textures
    // 3. Execute compute shader
    // 4. Swap textures
    
    // For now, simulate with CPU evolution
    this.evolveFieldCPU(dt);
    
    console.debug('Field evolved using GPU compute (simulated)');
  }
  
  /**
   * Handle user interaction with the field
   * @param {number} x - Normalized x coordinate [0, 1]
   * @param {number} y - Normalized y coordinate [0, 1]
   */
  handleInteraction(x, y) {
    const { width, height } = this.fieldSize;
    
    // Convert normalized coordinates to field indices
    const fieldX = Math.floor(x * width);
    const fieldY = Math.floor(y * height);
    
    // Check boundaries
    if (fieldX < 0 || fieldX >= width || fieldY < 0 || fieldY >= height) {
      return;
    }
    
    // For custom potential field, allow drawing
    if (this.config.potentialType === 'custom') {
      this.drawPotential(fieldX, fieldY);
    }
  }
  
  /**
   * Draw potential at a specific location (for custom potential)
   * @param {number} x - Field x coordinate
   * @param {number} y - Field y coordinate
   */
  drawPotential(x, y) {
    const { width, height } = this.fieldSize;
    const radius = Math.max(5, Math.floor(width / 25));
    const potentialStrength = 5.0;
    
    // Draw a circular potential well or barrier
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= radius) {
          // Apply falloff from center
          const intensity = (1 - dist / radius) * potentialStrength;
          
          // Calculate field position with wrapping
          const fx = (x + dx + width) % width;
          const fy = (y + dy + height) % height;
          
          // Set potential value
          const idx = (fy * width + fx) * 4;
          this.potentialField[idx] = intensity;
        }
      }
    }
  }
  
  /**
   * Get field data for visualization
   * @returns {Object} Field data object
   */
  getFieldData() {
    return {
      data: this.fieldData,
      width: this.fieldSize.width,
      height: this.fieldSize.height
    };
  }
  
  /**
   * Get tensor data for 3D visualization
   * @returns {Object|null} Tensor data object or null if not available
   */
  getTensorData() {
    if (!this.tensorData || this.config.dimensions <= 2) {
      return null;
    }
    
    return {
      data: this.tensorData,
      width: this.fieldSize.width,
      height: this.fieldSize.height,
      depth: this.fieldSize.depth
    };
  }
  
  /**
   * Update field parameters
   * @param {Object} params - New parameters
   */
  updateParameters(params) {
    // Update evolution parameters
    if (params.evolutionMode) {
      this.config.evolutionMode = params.evolutionMode;
    }
    
    if (params.stepSize !== undefined) {
      this.evolutionParams.dt = params.stepSize;
    }
    
    if (params.evolutionSpeed !== undefined) {
      // Adjust other time-dependent parameters
      // For example, damping might scale with speed
    }
    
    // Update field configuration
    if (params.dimensions !== undefined && 
        params.dimensions !== this.config.dimensions) {
      this.config.dimensions = params.dimensions;
      
      // Resize field if dimensions changed
      if (params.dimensions > 2 && !this.tensorData) {
        this.fieldSize.depth = this.config.resolution;
        this.tensorData = new Float32Array(
          this.fieldSize.width * this.fieldSize.height * this.fieldSize.depth * 4
        );
        this.initializeTensorField(this.config.initialState);
      }
    }
    
    if (params.resolution !== undefined && 
        params.resolution !== this.config.resolution) {
      this.config.resolution = params.resolution;
      
      // Resize all data structures
      this.fieldSize = {
        width: this.config.resolution,
        height: this.config.resolution,
        depth: this.config.dimensions > 2 ? this.config.resolution : 1
      };
      
      this.fieldData = new Float32Array(
        this.fieldSize.width * this.fieldSize.height * 4
      );
      
      this.potentialField = new Float32Array(
        this.fieldSize.width * this.fieldSize.height * 4
      );
      
      if (this.config.dimensions > 2) {
        this.tensorData = new Float32Array(
          this.fieldSize.width * this.fieldSize.height * this.fieldSize.depth * 4
        );
      }
      
      // Reinitialize field and potential
      this.initializeField(this.config.initialState);
      this.setupPotential(this.config.potentialType);
    }
    
    // Update field parameters
    if (params.initialState) {
      this.config.initialState = params.initialState;
      this.initializeField(params.initialState);
    }
    
    if (params.potentialType) {
      this.config.potentialType = params.potentialType;
      this.setupPotential(params.potentialType);
    }
    
    if (params.boundaryCondition) {
      this.config.boundaryCondition = params.boundaryCondition;
      // This would update how boundary conditions are handled
    }
    
    // Update GPU usage
    if (params.useGPU !== undefined) {
      const wasUsingGPU = this.config.useGPU;
      this.config.useGPU = params.useGPU;
      
      // Initialize GPU compute if switching to GPU
      if (!wasUsingGPU && params.useGPU && !this.gpuCompute) {
        this.initializeGPUCompute();
      }
    }
  }
  
  /**
   * Reset the field to its initial state
   */
  resetField() {
    this.initializeField(this.config.initialState);
    this.setupPotential(this.config.potentialType);
  }
}
