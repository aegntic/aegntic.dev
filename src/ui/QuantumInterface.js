// src/ui/QuantumInterface.js
import { QuantumField } from '../core/QuantumField';
import { QuantumRenderer } from '../visualization/QuantumRenderer';
import { ControlPanel } from './ControlPanel';
import { QuantumTerminal } from './terminal/QuantumTerminal';
import { AudioProcessor } from '../audio/AudioProcessor';

/**
 * QuantumInterface - Main UI orchestration system
 * 
 * Integrates all quantum interface components into a cohesive system:
 * - Quantum field computation engine
 * - WebGL visualization renderer
 * - Control panel for parameter adjustment
 * - Terminal for command input
 * - Audio processing for field sonification
 */
export class QuantumInterface {
  /**
   * Create a new quantum interface
   * @param {HTMLElement} rootElement - Root DOM element to attach the interface
   * @param {Object} options - Configuration options
   */
  constructor(rootElement, options = {}) {
    this.rootElement = rootElement;
    
    // Default configuration
    this.config = {
      dimensions: options.dimensions || 2,
      resolution: options.resolution || 128,
      initialState: options.initialState || 'superposition',
      potentialType: options.potentialType || 'none',
      boundaryCondition: options.boundaryCondition || 'periodic',
      useGPU: options.useGPU !== undefined ? options.useGPU : true,
      fullscreenVisualization: false,
      showTerminal: false,
      darkTheme: true,
      audioEnabled: false
    };
    
    // Create container with CSS Grid layout
    this.container = document.createElement('div');
    this.container.className = 'quantum-interface';
    this.rootElement.appendChild(this.container);
    
    // Apply global styles and theme
    this.applyGlobalStyles();
    
    // Initialize shared memory for quantum field
    this.quantumCore = new QuantumField({
      dimensions: this.config.dimensions,
      resolution: this.config.resolution,
      initialState: this.config.initialState,
      potentialType: this.config.potentialType,
      boundaryCondition: this.config.boundaryCondition,
      useGPU: this.config.useGPU
    });
    
    // Create UI components and link to core
    this.setupUIComponents();
    
    // Register event listeners for interface interactions
    this.setupEventHandlers();
    
    // Set up simulation loop
    this.simulationRunning = false;
    this.animationFrame = null;
    this.lastFrameTime = 0;
    
    console.info('Quantum Interface initialized');
  }
  
  /**
   * Apply global styles to the interface
   */
  applyGlobalStyles() {
    // Create a style element
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --bg-primary: #000000;
        --bg-secondary: #090909;
        --accent-primary: #ff2d55;
        --accent-secondary: #2fbfa8;
        --accent-tertiary: #8844ff;
        --grid-color: rgba(255, 45, 85, 0.12);
        --text-primary: rgba(255, 255, 255, 0.92);
        --text-secondary: rgba(255, 255, 255, 0.62);
        --font-mono: 'Space Mono', monospace, 'Courier New', Courier, monospace;
      }
      
      /* Core layout styles */
      .quantum-interface {
        position: relative;
        display: grid;
        width: 100%;
        height: 100vh;
        overflow: hidden;
        background-color: var(--bg-primary);
        color: var(--text-primary);
        font-family: var(--font-mono);
        grid-template-columns: 300px 1fr;
        grid-template-rows: 1fr auto;
        grid-template-areas:
          "controls visualization"
          "terminal terminal";
        transition: all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
      }
      
      .quantum-interface.fullscreen-visualization {
        grid-template-columns: 0px 1fr;
      }
      
      .quantum-interface.fullscreen-visualization .control-region {
        transform: translateX(-100%);
      }
      
      .quantum-interface.terminal-visible .terminal-region {
        transform: translateY(0);
      }
      
      /* Region styles */
      .control-region {
        grid-area: controls;
        background-color: var(--bg-secondary);
        border-right: 1px solid var(--accent-primary);
        overflow-y: auto;
        z-index: 10;
        transition: transform 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
      }
      
      .visualization-region {
        grid-area: visualization;
        position: relative;
        overflow: hidden;
      }
      
      .terminal-region {
        grid-area: terminal;
        position: relative;
        height: 250px;
        overflow: hidden;
        transform: translateY(250px);
        transition: transform 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
        z-index: 20;
      }
      
      /* Overlay controls */
      .visualization-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        padding: 10px;
        display: flex;
        justify-content: space-between;
        z-index: 10;
      }
      
      .overlay-button {
        background-color: rgba(0, 0, 0, 0.7);
        border: 1px solid var(--accent-primary);
        color: var(--accent-primary);
        padding: 5px 10px;
        font-family: var(--font-mono);
        font-size: 12px;
        cursor: pointer;
        transition: background-color 0.3s, color 0.3s;
      }
      
      .overlay-button:hover {
        background-color: var(--accent-primary);
        color: var(--bg-primary);
      }
      
      /* Terminal toggle */
      .terminal-toggle {
        position: absolute;
        bottom: 250px;
        left: 50%;
        transform: translateX(-50%) translateY(100%);
        background-color: var(--bg-secondary);
        border: 1px solid var(--accent-primary);
        border-bottom: none;
        color: var(--accent-primary);
        padding: 5px 10px;
        font-family: var(--font-mono);
        font-size: 12px;
        cursor: pointer;
        z-index: 21;
        transition: transform 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
      }
      
      .terminal-visible .terminal-toggle {
        transform: translateX(-50%) translateY(0);
      }
      
      /* Audio visualization */
      .audio-visualization {
        position: absolute;
        bottom: 10px;
        right: 10px;
        width: 150px;
        height: 40px;
        background-color: rgba(0, 0, 0, 0.5);
        border: 1px solid var(--accent-secondary);
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .audio-visualization.active {
        opacity: 1;
      }
      
      .audio-bar {
        width: 3px;
        height: 20px;
        margin: 0 1px;
        background-color: var(--accent-secondary);
        transform-origin: bottom;
        transition: transform 0.1s;
      }
      
      /* Responsive adjustments */
      @media screen and (max-width: 768px) {
        .quantum-interface {
          grid-template-columns: 1fr;
          grid-template-rows: 1fr auto auto;
          grid-template-areas:
            "visualization"
            "controls"
            "terminal";
        }
        
        .control-region {
          border-right: none;
          border-top: 1px solid var(--accent-primary);
          max-height: 30vh;
        }
        
        .quantum-interface.fullscreen-visualization {
          grid-template-columns: 1fr;
          grid-template-rows: 1fr 0px auto;
        }
        
        .quantum-interface.fullscreen-visualization .control-region {
          transform: translateY(100%);
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Create layout regions and initialize UI components
   */
  setupUIComponents() {
    // Create layout regions
    const controlRegion = this.createRegion('control-region');
    const visualizationRegion = this.createRegion('visualization-region');
    const terminalRegion = this.createRegion('terminal-region');
    
    // Add visualization overlay with controls
    this.createVisualizationOverlay(visualizationRegion);
    
    // Add terminal toggle
    this.createTerminalToggle();
    
    // Create audio visualization
    this.createAudioVisualization(visualizationRegion);
    
    // Initialize components
    this.renderer = new QuantumRenderer(visualizationRegion, this.quantumCore);
    
    this.controlPanel = new ControlPanel(controlRegion, {
      onVisualizationChange: (mode) => this.renderer.setVisualizationMode(mode),
      onParameterChange: (params) => this.updateParameters(params),
      onResetField: () => this.resetField(),
      onInitializeField: (params) => this.initializeField(params),
      onEvolutionToggle: (running) => this.toggleSimulation(running),
      onEvolutionStep: () => this.stepSimulation(),
      onExport: (format) => this.exportField(format),
      onToggleFullscreen: () => this.toggleFullscreenVisualization()
    });
    
    this.terminal = new QuantumTerminal(terminalRegion, {
      quantum: this.quantumCore,
      renderer: this.renderer,
      interface: this
    });
    
    // Initialize audio processor if Web Audio API is available
    try {
      this.audioProcessor = new AudioProcessor(this.quantumCore);
      
      // Update audio enabled state
      this.updateParameters({ audioEnabled: this.config.audioEnabled });
    } catch (error) {
      console.warn('Audio processing not available:', error.message);
      
      // Disable audio controls
      const audioElement = document.getElementById('audioEnabled');
      if (audioElement) {
        audioElement.disabled = true;
        audioElement.checked = false;
        
        const label = document.querySelector(`label[for="${audioElement.id}"]`);
        if (label) {
          label.textContent += ' (Not available)';
        }
      }
    }
  }
  
  /**
   * Create a layout region
   * @param {string} className - CSS class for the region
   * @returns {HTMLElement} The created region element
   */
  createRegion(className) {
    const region = document.createElement('div');
    region.className = className;
    this.container.appendChild(region);
    return region;
  }
  
  /**
   * Create visualization overlay with controls
   * @param {HTMLElement} parent - Parent element for the overlay
   */
  createVisualizationOverlay(parent) {
    const overlay = document.createElement('div');
    overlay.className = 'visualization-overlay';
    
    // Fullscreen toggle
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'overlay-button';
    fullscreenBtn.textContent = 'Toggle Controls';
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreenVisualization());
    
    // Play/Pause button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'overlay-button';
    playPauseBtn.textContent = 'Start Evolution';
    playPauseBtn.id = 'playPauseBtn';
    playPauseBtn.addEventListener('click', () => {
      this.toggleSimulation(!this.simulationRunning);
      playPauseBtn.textContent = this.simulationRunning ? 'Pause Evolution' : 'Start Evolution';
    });
    
    // Add buttons to overlay
    overlay.appendChild(fullscreenBtn);
    overlay.appendChild(playPauseBtn);
    
    parent.appendChild(overlay);
  }
  
  /**
   * Create terminal toggle button
   */
  createTerminalToggle() {
    const toggle = document.createElement('button');
    toggle.className = 'terminal-toggle';
    toggle.textContent = 'Terminal';
    toggle.addEventListener('click', () => this.toggleTerminal());
    
    this.container.appendChild(toggle);
  }
  
  /**
   * Create audio visualization
   * @param {HTMLElement} parent - Parent element for the visualization
   */
  createAudioVisualization(parent) {
    const audioViz = document.createElement('div');
    audioViz.className = 'audio-visualization';
    
    // Create audio bars
    for (let i = 0; i < 20; i++) {
      const bar = document.createElement('div');
      bar.className = 'audio-bar';
      audioViz.appendChild(bar);
    }
    
    parent.appendChild(audioViz);
    this.audioVisualization = audioViz;
  }
  
  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.renderer) {
        this.renderer.resize();
      }
    });
    
    // Handle keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Ctrl+Space to toggle terminal
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        this.toggleTerminal();
      }
      
      // Ctrl+B to toggle fullscreen visualization
      if (e.ctrlKey && e.code === 'KeyB') {
        e.preventDefault();
        this.toggleFullscreenVisualization();
      }
      
      // Spacebar to toggle simulation when not in terminal
      if (e.code === 'Space' && !this.config.showTerminal && 
          document.activeElement.tagName !== 'INPUT' && 
          document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.toggleSimulation(!this.simulationRunning);
        
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
          playPauseBtn.textContent = this.simulationRunning ? 'Pause Evolution' : 'Start Evolution';
        }
      }
    });
  }
  
  /**
   * Toggle terminal visibility
   */
  toggleTerminal() {
    this.config.showTerminal = !this.config.showTerminal;
    
    if (this.config.showTerminal) {
      this.container.classList.add('terminal-visible');
      this.terminal.focus();
    } else {
      this.container.classList.remove('terminal-visible');
    }
  }
  
  /**
   * Toggle fullscreen visualization
   */
  toggleFullscreenVisualization() {
    this.config.fullscreenVisualization = !this.config.fullscreenVisualization;
    
    if (this.config.fullscreenVisualization) {
      this.container.classList.add('fullscreen-visualization');
    } else {
      this.container.classList.remove('fullscreen-visualization');
    }
    
    // Resize the renderer to match the new layout
    setTimeout(() => {
      if (this.renderer) {
        this.renderer.resize();
      }
    }, 500); // Wait for transition to complete
  }
  
  /**
   * Update parameters across all components
   * @param {Object} params - Parameter updates
   */
  updateParameters(params) {
    // Update core field parameters
    if (this.quantumCore) {
      this.quantumCore.updateParameters(params);
    }
    
    // Update renderer parameters
    if (this.renderer && params) {
      const rendererParams = {};
      
      if (params.intensity !== undefined) {
        rendererParams.intensity = params.intensity;
      }
      
      if (params.threshold !== undefined) {
        rendererParams.threshold = params.threshold;
      }
      
      if (params.slicePosition !== undefined) {
        rendererParams.slicePosition = params.slicePosition;
      }
      
      if (params.sliceAxis !== undefined) {
        rendererParams.sliceAxis = params.sliceAxis;
      }
      
      this.renderer.updateSettings(rendererParams);
    }
    
    // Update audio processor
    if (this.audioProcessor) {
      if (params.audioEnabled !== undefined) {
        this.config.audioEnabled = params.audioEnabled;
        
        if (params.audioEnabled) {
          this.audioProcessor.enable();
          this.audioVisualization.classList.add('active');
        } else {
          this.audioProcessor.disable();
          this.audioVisualization.classList.remove('active');
        }
      }
      
      if (params.audioVolume !== undefined) {
        this.audioProcessor.setVolume(params.audioVolume);
      }
      
      if (params.audioMapping !== undefined) {
        this.audioProcessor.setMapping(params.audioMapping);
      }
    }
    
    // Store updated parameters in config
    Object.assign(this.config, params);
  }
  
  /**
   * Reset the quantum field
   */
  resetField() {
    if (this.quantumCore) {
      this.quantumCore.resetField();
    }
    
    // Log to terminal
    if (this.terminal) {
      this.terminal.addLine('Field reset to initial state', 'system');
    }
  }
  
  /**
   * Initialize the field with new parameters
   * @param {Object} params - Field parameters
   */
  initializeField(params) {
    if (this.quantumCore) {
      this.quantumCore.updateParameters(params);
      this.quantumCore.resetField();
    }
    
    // Log to terminal
    if (this.terminal) {
      this.terminal.addLine(`Field initialized with: ${JSON.stringify(params)}`, 'system');
    }
  }
  
  /**
   * Toggle simulation running state
   * @param {boolean} running - Whether simulation should be running
   */
  toggleSimulation(running) {
    this.simulationRunning = running;
    
    if (running) {
      this.startSimulation();
    } else {
      this.stopSimulation();
    }
    
    // Log to terminal
    if (this.terminal) {
      this.terminal.addLine(`Field evolution ${running ? 'started' : 'stopped'}`, 'system');
    }
    
    // Update play/pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.textContent = running ? 'Pause Evolution' : 'Start Evolution';
    }
  }
  
  /**
   * Start the simulation loop
   */
  startSimulation() {
    if (this.animationFrame) return;
    
    this.lastFrameTime = performance.now();
    this.simulationLoop();
  }
  
  /**
   * Stop the simulation loop
   */
  stopSimulation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  /**
   * Simulation loop for field evolution
   */
  simulationLoop() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000; // in seconds
    this.lastFrameTime = currentTime;
    
    // Update quantum field
    if (this.quantumCore) {
      this.quantumCore.evolveField(deltaTime);
    }
    
    // Update audio visualization if enabled
    if (this.config.audioEnabled && this.audioProcessor) {
      this.updateAudioVisualization();
    }
    
    // Schedule next frame
    this.animationFrame = requestAnimationFrame(() => this.simulationLoop());
  }
  
  /**
   * Step simulation forward by a single time step
   */
  stepSimulation() {
    if (this.quantumCore) {
      this.quantumCore.evolveField();
    }
    
    // Log to terminal
    if (this.terminal) {
      this.terminal.addLine('Field evolved by one step', 'system');
    }
  }
  
  /**
   * Update audio visualization bars
   */
  updateAudioVisualization() {
    if (!this.audioProcessor || !this.audioVisualization) return;
    
    const frequencyData = this.audioProcessor.getFrequencyData();
    if (!frequencyData) return;
    
    const bars = this.audioVisualization.querySelectorAll('.audio-bar');
    const stepSize = Math.floor(frequencyData.length / bars.length);
    
    for (let i = 0; i < bars.length; i++) {
      const value = frequencyData[i * stepSize] / 255; // Normalize to [0, 1]
      bars[i].style.transform = `scaleY(${value + 0.1})`;
    }
  }
  
  /**
   * Export field data in the requested format
   * @param {string} format - Export format
   */
  exportField(format) {
    if (!this.quantumCore) return;
    
    let exportData, filename, dataUrl, link;
    
    switch (format) {
      case 'png':
        // Export visualization as PNG image
        if (!this.renderer) return;
        
        try {
          const dataUrl = this.renderer.canvas.toDataURL('image/png');
          
          link = document.createElement('a');
          link.href = dataUrl;
          link.download = `quantum-field-${Date.now()}.png`;
          link.click();
          
          // Log to terminal
          if (this.terminal) {
            this.terminal.addLine('Exported visualization as PNG image', 'system');
          }
        } catch (error) {
          console.error('Failed to export PNG:', error);
          
          if (this.terminal) {
            this.terminal.addLine(`Export failed: ${error.message}`, 'error');
          }
        }
        break;
      
      case 'csv':
        // Export field data as CSV
        const fieldData = this.quantumCore.getFieldData();
        if (!fieldData) return;
        
        try {
          let csv = 'x,y,real,imaginary,amplitude,phase\n';
          
          for (let y = 0; y < fieldData.height; y++) {
            for (let x = 0; x < fieldData.width; x++) {
              const idx = (y * fieldData.width + x) * 4;
              const real = fieldData.data[idx];
              const imag = fieldData.data[idx + 1];
              const amplitude = Math.sqrt(real * real + imag * imag);
              const phase = Math.atan2(imag, real);
              
              csv += `${x},${y},${real},${imag},${amplitude},${phase}\n`;
            }
          }
          
          const blob = new Blob([csv], { type: 'text/csv' });
          dataUrl = URL.createObjectURL(blob);
          
          link = document.createElement('a');
          link.href = dataUrl;
          link.download = `quantum-field-${Date.now()}.csv`;
          link.click();
          
          URL.revokeObjectURL(dataUrl);
          
          // Log to terminal
          if (this.terminal) {
            this.terminal.addLine('Exported field data as CSV', 'system');
          }
        } catch (error) {
          console.error('Failed to export CSV:', error);
          
          if (this.terminal) {
            this.terminal.addLine(`Export failed: ${error.message}`, 'error');
          }
        }
        break;
      
      case 'json':
        // Export field state as JSON
        try {
          const state = {
            config: this.config,
            fieldData: this.quantumCore.getFieldData(),
            timestamp: Date.now()
          };
          
          const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
          dataUrl = URL.createObjectURL(blob);
          
          link = document.createElement('a');
          link.href = dataUrl;
          link.download = `quantum-state-${Date.now()}.json`;
          link.click();
          
          URL.revokeObjectURL(dataUrl);
          
          // Log to terminal
          if (this.terminal) {
            this.terminal.addLine('Exported state as JSON', 'system');
          }
        } catch (error) {
          console.error('Failed to export JSON:', error);
          
          if (this.terminal) {
            this.terminal.addLine(`Export failed: ${error.message}`, 'error');
          }
        }
        break;
      
      case 'binary':
        // Export raw tensor data as binary
        try {
          let tensorData;
          
          if (this.config.dimensions > 2) {
            tensorData = this.quantumCore.getTensorData();
            if (!tensorData) throw new Error('Tensor data not available');
            
            const blob = new Blob([tensorData.data.buffer], { type: 'application/octet-stream' });
            dataUrl = URL.createObjectURL(blob);
            
            link = document.createElement('a');
            link.href = dataUrl;
            link.download = `quantum-tensor-${Date.now()}.bin`;
            link.click();
            
            URL.revokeObjectURL(dataUrl);
          } else {
            const fieldData = this.quantumCore.getFieldData();
            if (!fieldData) throw new Error('Field data not available');
            
            const blob = new Blob([fieldData.data.buffer], { type: 'application/octet-stream' });
            dataUrl = URL.createObjectURL(blob);
            
            link = document.createElement('a');
            link.href = dataUrl;
            link.download = `quantum-field-${Date.now()}.bin`;
            link.click();
            
            URL.revokeObjectURL(dataUrl);
          }
          
          // Log to terminal
          if (this.terminal) {
            this.terminal.addLine('Exported raw tensor data as binary', 'system');
          }
        } catch (error) {
          console.error('Failed to export binary data:', error);
          
          if (this.terminal) {
            this.terminal.addLine(`Export failed: ${error.message}`, 'error');
          }
        }
        break;
      
      default:
        console.warn(`Unknown export format: ${format}`);
        
        if (this.terminal) {
          this.terminal.addLine(`Unknown export format: ${format}`, 'error');
        }
    }
  }
  
  /**
   * Clean up resources when interface is destroyed
   */
  dispose() {
    // Stop the simulation
    this.stopSimulation();
    
    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // Dispose audio processor
    if (this.audioProcessor) {
      this.audioProcessor.dispose();
    }
    
    // Remove all event listeners (a more thorough implementation would
    // track and remove specific listeners)
    
    // Remove the container element
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    console.info('Quantum Interface disposed');
  }
}