// src/ui/ControlPanel.js
/**
 * ControlPanel - Interactive controls for quantum field visualization
 * 
 * Provides a set of controls for manipulating visualization settings
 * and simulation parameters in real-time.
 */
export class ControlPanel {
  /**
   * Create a new control panel
   * @param {HTMLElement} container - Container element for the panel
   * @param {Object} callbacks - Callback functions for control changes
   */
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    
    // Default settings
    this.settings = {
      visualizationMode: 'field',
      intensity: 1.0,
      threshold: 0.01,
      dimensions: 3,
      resolution: 128,
      evolution: {
        running: false,
        speed: 1.0,
        stepSize: 0.01,
        mode: 'schrödinger'
      },
      slicePosition: 0.5,
      sliceAxis: 2,
      colormap: 'viridis',
      audioEnabled: false,
      fieldParameters: {
        initialState: 'superposition',
        potentialType: 'none',
        boundaryCondition: 'periodic'
      }
    };
    
    // Reference to active sliders for value updates
    this.activeSliders = {};
    
    // Create the control panel UI
    this.createControlPanel();
    
    // Initialize collapsible panels
    this.initCollapsiblePanels();
  }
  
  /**
   * Create the control panel UI
   */
  createControlPanel() {
    // Panel container
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'quantum-control-panel';
    this.container.appendChild(this.panelElement);
    
    // Visualization mode selector
    this.createVisSection();
    
    // Field parameters section
    this.createFieldSection();
    
    // Evolution parameters section
    this.createEvolutionSection();
    
    // Advanced settings section
    this.createAdvancedSection();
    
    // Audio settings
    this.createAudioSection();
    
    // Style the control panel
    this.applyStyles();
  }
  
  /**
   * Create visualization mode section
   */
  createVisSection() {
    const section = this.createSection('Visualization', true);
    
    // Visualization mode selector
    const modeSelector = this.createSelect(
      'visMode',
      'Mode',
      [
        { value: 'field', label: 'Field Density' },
        { value: 'probability', label: 'Probability Distribution' },
        { value: 'entropy', label: 'Information Entropy' },
        { value: 'wavefunction', label: 'Wavefunction Phase' },
        { value: 'tensor3D', label: 'Tensor Field (WebGL2)' }
      ],
      this.settings.visualizationMode
    );
    
    modeSelector.addEventListener('change', (e) => {
      this.settings.visualizationMode = e.target.value;
      if (this.callbacks.onVisualizationChange) {
        this.callbacks.onVisualizationChange(e.target.value);
      }
    });
    
    // Intensity slider
    this.createSlider(
      'intensity',
      'Intensity',
      this.settings.intensity,
      0.1,
      3.0,
      0.1,
      (value) => {
        this.settings.intensity = value;
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ intensity: value });
        }
      }
    );
    
    // Threshold slider (for probability mode)
    this.createSlider(
      'threshold',
      'Threshold',
      this.settings.threshold,
      0.0,
      0.5,
      0.01,
      (value) => {
        this.settings.threshold = value;
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ threshold: value });
        }
      }
    );
    
    // Color map selector
    this.createSelect(
      'colormap',
      'Color Scheme',
      [
        { value: 'viridis', label: 'Viridis (Default)' },
        { value: 'plasma', label: 'Plasma' },
        { value: 'inferno', label: 'Inferno' },
        { value: 'magma', label: 'Magma' },
        { value: 'rainbow', label: 'Rainbow' },
        { value: 'twilight', label: 'Quantum Twilight' }
      ],
      this.settings.colormap,
      (value) => {
        this.settings.colormap = value;
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ colormap: value });
        }
      }
    );
    
    section.appendChild(document.createElement('hr'));
    
    // Full-screen toggle button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'control-button full-width';
    fullscreenBtn.textContent = 'Toggle Fullscreen Visualization';
    fullscreenBtn.addEventListener('click', () => {
      if (this.callbacks.onToggleFullscreen) {
        this.callbacks.onToggleFullscreen();
      }
    });
    section.appendChild(fullscreenBtn);
  }
  
  /**
   * Create field parameters section
   */
  createFieldSection() {
    const section = this.createSection('Field Parameters', false);
    
    // Dimensions selector
    this.createSelect(
      'dimensions',
      'Dimensions',
      [
        { value: '1', label: '1D' },
        { value: '2', label: '2D' },
        { value: '3', label: '3D' },
        { value: '4', label: '4D (Tensor projection)' }
      ],
      this.settings.dimensions.toString(),
      (value) => {
        this.settings.dimensions = parseInt(value, 10);
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ dimensions: parseInt(value, 10) });
        }
      }
    );
    
    // Resolution selector
    this.createSelect(
      'resolution',
      'Resolution',
      [
        { value: '64', label: '64 (Fast)' },
        { value: '128', label: '128 (Standard)' },
        { value: '256', label: '256 (Detailed)' },
        { value: '512', label: '512 (High precision)' }
      ],
      this.settings.resolution.toString(),
      (value) => {
        this.settings.resolution = parseInt(value, 10);
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ resolution: parseInt(value, 10) });
        }
      }
    );
    
    // Initial state
    this.createSelect(
      'initialState',
      'Initial State',
      [
        { value: 'superposition', label: 'Superposition' },
        { value: 'gaussian', label: 'Gaussian Wave Packet' },
        { value: 'excited', label: 'Excited Eigenstate' },
        { value: 'vortex', label: 'Quantum Vortex' },
        { value: 'random', label: 'Random Field' }
      ],
      this.settings.fieldParameters.initialState,
      (value) => {
        this.settings.fieldParameters.initialState = value;
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ initialState: value });
        }
      }
    );
    
    // Potential type
    this.createSelect(
      'potentialType',
      'Potential Field',
      [
        { value: 'none', label: 'None (Free)' },
        { value: 'harmonic', label: 'Harmonic Oscillator' },
        { value: 'barrier', label: 'Quantum Barrier' },
        { value: 'well', label: 'Potential Well' },
        { value: 'custom', label: 'Custom (Draw)' }
      ],
      this.settings.fieldParameters.potentialType,
      (value) => {
        this.settings.fieldParameters.potentialType = value;
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ potentialType: value });
        }
      }
    );
    
    // Boundary conditions
    this.createSelect(
      'boundaryCondition',
      'Boundary',
      [
        { value: 'periodic', label: 'Periodic' },
        { value: 'dirichlet', label: 'Dirichlet (Zero)' },
        { value: 'neumann', label: 'Neumann (Reflective)' },
        { value: 'absorbing', label: 'Absorbing' }
      ],
      this.settings.fieldParameters.boundaryCondition,
      (value) => {
        this.settings.fieldParameters.boundaryCondition = value;
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ boundaryCondition: value });
        }
      }
    );
    
    section.appendChild(document.createElement('hr'));
    
    // Reset field button
    const resetBtn = document.createElement('button');
    resetBtn.className = 'control-button';
    resetBtn.textContent = 'Reset Field';
    resetBtn.addEventListener('click', () => {
      if (this.callbacks.onResetField) {
        this.callbacks.onResetField();
      }
    });
    section.appendChild(resetBtn);
    
    // Initialize field button
    const initBtn = document.createElement('button');
    initBtn.className = 'control-button';
    initBtn.textContent = 'Initialize Field';
    initBtn.addEventListener('click', () => {
      if (this.callbacks.onInitializeField) {
        this.callbacks.onInitializeField(this.settings.fieldParameters);
      }
    });
    section.appendChild(initBtn);
  }
  
  /**
   * Create evolution parameters section
   */
  createEvolutionSection() {
    const section = this.createSection('Evolution', false);
    
    // Evolution mode
    this.createSelect(
      'evolutionMode',
      'Equation',
      [
        { value: 'schrödinger', label: 'Schrödinger' },
        { value: 'dirac', label: 'Dirac' },
        { value: 'klein-gordon', label: 'Klein-Gordon' },
        { value: 'heat', label: 'Heat (Diffusion)' }
      ],
      this.settings.evolution.mode,
      (value) => {
        this.settings.evolution.mode = value;
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ evolutionMode: value });
        }
      }
    );
    
    // Speed slider
    this.createSlider(
      'evolutionSpeed',
      'Speed',
      this.settings.evolution.speed,
      0.1,
      3.0,
      0.1,
      (value) => {
        this.settings.evolution.speed = value;
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ evolutionSpeed: value });
        }
      }
    );
    
    // Step size slider
    this.createSlider(
      'stepSize',
      'Step Size',
      this.settings.evolution.stepSize,
      0.001,
      0.1,
      0.001,
      (value) => {
        this.settings.evolution.stepSize = value;
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ stepSize: value });
        }
      }
    );
    
    section.appendChild(document.createElement('hr'));
    
    // Evolution controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'controls-row';
    
    // Play/Pause button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'control-button';
    playPauseBtn.textContent = this.settings.evolution.running ? 'Pause' : 'Play';
    playPauseBtn.addEventListener('click', () => {
      this.settings.evolution.running = !this.settings.evolution.running;
      playPauseBtn.textContent = this.settings.evolution.running ? 'Pause' : 'Play';
      if (this.callbacks.onEvolutionToggle) {
        this.callbacks.onEvolutionToggle(this.settings.evolution.running);
      }
    });
    controlsDiv.appendChild(playPauseBtn);
    
    // Step button
    const stepBtn = document.createElement('button');
    stepBtn.className = 'control-button';
    stepBtn.textContent = 'Step';
    stepBtn.addEventListener('click', () => {
      if (this.callbacks.onEvolutionStep) {
        this.callbacks.onEvolutionStep();
      }
    });
    controlsDiv.appendChild(stepBtn);
    
    section.appendChild(controlsDiv);
  }
  
  /**
   * Create advanced settings section
   */
  createAdvancedSection() {
    const section = this.createSection('Advanced', false);
    
    // 3D Slice position slider (for tensor3D mode)
    this.createSlider(
      'slicePosition',
      'Slice Position',
      this.settings.slicePosition,
      0.0,
      1.0,
      0.01,
      (value) => {
        this.settings.slicePosition = value;
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ slicePosition: value });
        }
      }
    );
    
    // Slice axis selector
    this.createSelect(
      'sliceAxis',
      'Slice Axis',
      [
        { value: '0', label: 'X Axis' },
        { value: '1', label: 'Y Axis' },
        { value: '2', label: 'Z Axis' }
      ],
      this.settings.sliceAxis.toString(),
      (value) => {
        this.settings.sliceAxis = parseInt(value, 10);
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ sliceAxis: parseInt(value, 10) });
        }
      }
    );
    
    // Export dropdown
    this.createSelect(
      'exportFormat',
      'Export Format',
      [
        { value: 'png', label: 'PNG Image' },
        { value: 'csv', label: 'CSV Data' },
        { value: 'json', label: 'JSON State' },
        { value: 'binary', label: 'Binary Tensor' }
      ],
      'png',
      null
    );
    
    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'control-button full-width';
    exportBtn.textContent = 'Export Current State';
    exportBtn.addEventListener('click', () => {
      const format = document.getElementById('exportFormat').value;
      if (this.callbacks.onExport) {
        this.callbacks.onExport(format);
      }
    });
    section.appendChild(exportBtn);
    
    // GPU acceleration checkbox
    const gpuDiv = document.createElement('div');
    gpuDiv.className = 'control-group';
    
    const gpuCheck = document.createElement('input');
    gpuCheck.type = 'checkbox';
    gpuCheck.id = 'gpuAcceleration';
    gpuCheck.checked = true;
    
    const gpuLabel = document.createElement('label');
    gpuLabel.htmlFor = 'gpuAcceleration';
    gpuLabel.textContent = 'Use GPU Acceleration';
    
    gpuCheck.addEventListener('change', (e) => {
      if (this.callbacks.onParameterChange) {
        this.callbacks.onParameterChange({ useGPU: e.target.checked });
      }
    });
    
    gpuDiv.appendChild(gpuCheck);
    gpuDiv.appendChild(gpuLabel);
    section.appendChild(gpuDiv);
  }
  
  /**
   * Create audio section
   */
  createAudioSection() {
    const section = this.createSection('Audio Output', false);
    
    // Audio enabled checkbox
    const audioDiv = document.createElement('div');
    audioDiv.className = 'control-group';
    
    const audioCheck = document.createElement('input');
    audioCheck.type = 'checkbox';
    audioCheck.id = 'audioEnabled';
    audioCheck.checked = this.settings.audioEnabled;
    
    const audioLabel = document.createElement('label');
    audioLabel.htmlFor = 'audioEnabled';
    audioLabel.textContent = 'Enable Sonification';
    
    audioCheck.addEventListener('change', (e) => {
      this.settings.audioEnabled = e.target.checked;
      if (this.callbacks.onParameterChange) {
        this.callbacks.onParameterChange({ audioEnabled: e.target.checked });
      }
    });
    
    audioDiv.appendChild(audioCheck);
    audioDiv.appendChild(audioLabel);
    section.appendChild(audioDiv);
    
    // Audio volume slider
    this.createSlider(
      'audioVolume',
      'Volume',
      0.5,
      0.0,
      1.0,
      0.05,
      (value) => {
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ audioVolume: value });
        }
      }
    );
    
    // Audio mapping selector
    this.createSelect(
      'audioMapping',
      'Field Mapping',
      [
        { value: 'amplitude', label: 'Amplitude → Tone' },
        { value: 'phase', label: 'Phase → Tone' },
        { value: 'entropy', label: 'Entropy → Texture' },
        { value: 'spectral', label: 'Full Spectral' }
      ],
      'amplitude',
      (value) => {
        if (this.callbacks.onParameterChange) {
          this.callbacks.onParameterChange({ audioMapping: value });
        }
      }
    );
  }
  
  /**
   * Create a collapsible section
   * @param {string} title - Section title
   * @param {boolean} expanded - Initial expanded state
   * @returns {HTMLElement} The created section element
   */
  createSection(title, expanded = false) {
    const section = document.createElement('div');
    section.className = 'control-section';
    
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
      <h3>${title}</h3>
      <span class="section-toggle">${expanded ? '−' : '+'}</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'section-content';
    content.style.display = expanded ? 'block' : 'none';
    
    section.appendChild(header);
    section.appendChild(content);
    
    this.panelElement.appendChild(section);
    
    return content;
  }
  
  /**
   * Create a slider control
   * @param {string} id - Control ID
   * @param {string} label - Control label
   * @param {number} value - Initial value
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} step - Step size
   * @param {Function} onChange - Change callback
   * @returns {HTMLElement} The slider container
   */
  createSlider(id, label, value, min, max, step, onChange) {
    const container = document.createElement('div');
    container.className = 'control-group slider-group';
    
    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label;
    
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'slider-value';
    valueDisplay.textContent = value;
    
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      valueDisplay.textContent = val.toFixed(step < 0.1 ? 3 : 1);
      if (onChange) {
        onChange(val);
      }
    });
    
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(valueDisplay);
    
    container.appendChild(labelEl);
    container.appendChild(sliderContainer);
    
    // Store reference for active sliders that need updates
    this.activeSliders[id] = {
      element: slider,
      valueDisplay
    };
    
    const parentSection = this.panelElement.lastChild.lastChild;
    parentSection.appendChild(container);
    
    return container;
  }
  
  /**
   * Create a select control
   * @param {string} id - Control ID
   * @param {string} label - Control label
   * @param {Array} options - Select options
   * @param {string} value - Initial value
   * @param {Function} onChange - Change callback
   * @returns {HTMLElement} The select element
   */
  createSelect(id, label, options, value, onChange) {
    const container = document.createElement('div');
    container.className = 'control-group';
    
    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label;
    
    const select = document.createElement('select');
    select.id = id;
    
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    });
    
    select.value = value;
    
    select.addEventListener('change', (e) => {
      if (onChange) {
        onChange(e.target.value);
      }
    });
    
    container.appendChild(labelEl);
    container.appendChild(select);
    
    const parentSection = this.panelElement.lastChild.lastChild;
    parentSection.appendChild(container);
    
    return select;
  }
  
  /**
   * Initialize collapsible panel behavior
   */
  initCollapsiblePanels() {
    const headers = this.panelElement.querySelectorAll('.section-header');
    
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        const toggle = header.querySelector('.section-toggle');
        
        // Toggle visibility
        if (content.style.display === 'none') {
          content.style.display = 'block';
          toggle.textContent = '−';
        } else {
          content.style.display = 'none';
          toggle.textContent = '+';
        }
      });
    });
  }
  
  /**
   * Apply styles to the control panel
   */
  applyStyles() {
    // Create a style element
    const style = document.createElement('style');
    style.textContent = `
      .quantum-control-panel {
        background-color: rgba(0, 0, 0, 0.8);
        border: 1px solid var(--accent-primary, #ff2d55);
        color: var(--text-primary, rgba(255, 255, 255, 0.92));
        font-family: var(--font-mono, monospace);
        font-size: 12px;
        padding: 10px;
        width: 100%;
        max-height: 100%;
        overflow-y: auto;
      }
      
      .control-section {
        margin-bottom: 10px;
      }
      
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        padding: 5px 0;
        border-bottom: 1px solid var(--accent-primary, #ff2d55);
      }
      
      .section-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: normal;
      }
      
      .section-toggle {
        color: var(--accent-primary, #ff2d55);
        font-size: 16px;
      }
      
      .section-content {
        padding: 10px 0;
      }
      
      .control-group {
        margin-bottom: 8px;
      }
      
      .control-group label {
        display: block;
        margin-bottom: 4px;
      }
      
      .slider-group {
        margin-bottom: 12px;
      }
      
      .slider-container {
        display: flex;
        align-items: center;
      }
      
      .slider-container input {
        flex: 1;
      }
      
      .slider-value {
        width: 40px;
        text-align: right;
        margin-left: 8px;
      }
      
      .control-button {
        background-color: transparent;
        border: 1px solid var(--accent-primary, #ff2d55);
        color: var(--accent-primary, #ff2d55);
        padding: 5px 10px;
        margin-right: 5px;
        margin-bottom: 5px;
        cursor: pointer;
        font-family: var(--font-mono, monospace);
        transition: background-color 0.3s, color 0.3s;
      }
      
      .control-button:hover {
        background-color: var(--accent-primary, #ff2d55);
        color: #000;
      }
      
      .full-width {
        width: 100%;
        margin-right: 0;
      }
      
      select, input[type="range"] {
        background-color: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        padding: 4px;
        width: 100%;
      }
      
      hr {
        border: none;
        border-top: 1px dashed rgba(255, 255, 255, 0.2);
        margin: 10px 0;
      }
      
      .controls-row {
        display: flex;
        justify-content: space-between;
      }
      
      /* Custom checkbox styling */
      input[type="checkbox"] {
        margin-right: 8px;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Update a specific control value
   * @param {string} id - Control ID
   * @param {any} value - New value
   */
  updateControlValue(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    
    if (element.type === 'range') {
      element.value = value;
      const valueDisplay = this.activeSliders[id]?.valueDisplay;
      if (valueDisplay) {
        valueDisplay.textContent = parseFloat(value).toFixed(
          parseFloat(element.step) < 0.1 ? 3 : 1
        );
      }
    } else if (element.type === 'checkbox') {
      element.checked = value;
    } else if (element.tagName === 'SELECT') {
      element.value = value;
    }
  }
  
  /**
   * Update multiple control values
   * @param {Object} values - Object with control IDs and values
   */
  updateControls(values) {
    Object.entries(values).forEach(([id, value]) => {
      this.updateControlValue(id, value);
    });
  }
  
  /**
   * Get current settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return { ...this.settings };
  }
}
