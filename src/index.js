// src/index.js
import { QuantumInterface } from './ui/QuantumInterface';

/**
 * Initialize the Quantum Interface application
 */
function initializeQuantumApp() {
  // Load necessary fonts
  loadFonts();
  
  // Create root element if not already present
  let rootElement = document.getElementById('quantum-app-root');
  
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'quantum-app-root';
    document.body.appendChild(rootElement);
  }
  
  // Create loading overlay
  const loadingOverlay = createLoadingOverlay();
  rootElement.appendChild(loadingOverlay);
  
  // Start initialization sequence
  startInitializationSequence(loadingOverlay)
    .then(() => {
      // Create and initialize the quantum interface
      const quantumInterface = new QuantumInterface(rootElement, {
        dimensions: 2,
        resolution: 128,
        initialState: 'superposition',
        potentialType: 'harmonic',
        boundaryCondition: 'periodic',
        useGPU: hasWebGLSupport()
      });
      
      // Store interface reference for debugging
      window.quantumInterface = quantumInterface;
      
      // Remove loading overlay
      setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
          rootElement.removeChild(loadingOverlay);
        }, 1000);
      }, 500);
    })
    .catch(error => {
      console.error('Quantum interface initialization failed:', error);
      showErrorMessage(loadingOverlay, error.message);
    });
}

/**
 * Load required fonts
 */
function loadFonts() {
  // Create font stylesheet link
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.cdnjs.com/css2?family=Space+Mono:wght@400;700&family=Syncopate:wght@400;700&display=swap';
  document.head.appendChild(fontLink);
}

/**
 * Create loading overlay
 * @returns {HTMLElement} Loading overlay element
 */
function createLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'quantum-loading-overlay';
  
  overlay.innerHTML = `
    <div class="quantum-loading-content">
      <h1 class="quantum-loading-title">AEGNTIC<span class="blink">_</span></h1>
      <div class="quantum-loading-subtitle">Quantum Interface System</div>
      <div class="quantum-loading-progress-container">
        <div class="quantum-loading-progress" id="loading-progress-bar"></div>
      </div>
      <div class="quantum-loading-status" id="loading-status-text">Initializing quantum system...</div>
    </div>
  `;
  
  // Add loading overlay styles
  const style = document.createElement('style');
  style.textContent = `
    .quantum-loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      transition: opacity 1s ease;
    }
    
    .quantum-loading-content {
      width: 80%;
      max-width: 600px;
      text-align: center;
    }
    
    .quantum-loading-title {
      font-family: 'Syncopate', sans-serif;
      font-size: 3rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.5rem;
      letter-spacing: 0.5rem;
    }
    
    .quantum-loading-subtitle {
      font-family: 'Space Mono', monospace;
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 2rem;
    }
    
    .quantum-loading-progress-container {
      width: 100%;
      height: 2px;
      background-color: rgba(255, 255, 255, 0.1);
      margin-bottom: 1rem;
      overflow: hidden;
    }
    
    .quantum-loading-progress {
      height: 100%;
      width: 0;
      background-color: #ff2d55;
      transition: width 0.3s ease;
    }
    
    .quantum-loading-status {
      font-family: 'Space Mono', monospace;
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.5);
      min-height: 2.5rem;
    }
    
    .blink {
      animation: blink-animation 1s steps(2, start) infinite;
    }
    
    @keyframes blink-animation {
      to {
        visibility: hidden;
      }
    }
    
    .quantum-error-message {
      background-color: rgba(255, 45, 85, 0.2);
      border: 1px solid #ff2d55;
      padding: 1rem;
      margin-top: 1rem;
      color: #ff2d55;
      font-family: 'Space Mono', monospace;
      text-align: left;
    }
  `;
  
  document.head.appendChild(style);
  
  return overlay;
}

/**
 * Simulate initialization sequence
 * @param {HTMLElement} overlay - Loading overlay element
 * @returns {Promise} Promise that resolves when initialization is complete
 */
function startInitializationSequence(overlay) {
  const progressBar = overlay.querySelector('#loading-progress-bar');
  const statusText = overlay.querySelector('#loading-status-text');
  
  // Initialization steps
  const steps = [
    { message: 'Initializing quantum system...', progress: 10 },
    { message: 'Loading visualization shaders...', progress: 20 },
    { message: 'Compiling tensor computation kernels...', progress: 35 },
    { message: 'Initializing field memory buffers...', progress: 50 },
    { message: 'Setting up UI components...', progress: 65 },
    { message: 'Configuring audio processor...', progress: 80 },
    { message: 'Establishing quantum field state...', progress: 90 },
    { message: 'System ready.', progress: 100 }
  ];
  
  return new Promise((resolve, reject) => {
    // Check for WebGL support
    if (!hasWebGLSupport()) {
      reject(new Error('WebGL not supported in this browser. Quantum visualization requires WebGL.'));
      return;
    }
    
    let currentStep = 0;
    
    // Process steps with delays
    function processStep() {
      if (currentStep >= steps.length) {
        // All steps complete
        resolve();
        return;
      }
      
      const step = steps[currentStep];
      
      // Update status and progress
      statusText.textContent = step.message;
      progressBar.style.width = `${step.progress}%`;
      
      // Move to next step after delay
      currentStep++;
      
      // Variable delay for more realistic loading
      const delay = 300 + Math.random() * 700;
      setTimeout(processStep, delay);
    }
    
    // Start processing steps
    processStep();
  });
}

/**
 * Show error message in loading overlay
 * @param {HTMLElement} overlay - Loading overlay element
 * @param {string} message - Error message
 */
function showErrorMessage(overlay, message) {
  const statusText = overlay.querySelector('#loading-status-text');
  statusText.textContent = 'Initialization failed.';
  
  const progressBar = overlay.querySelector('#loading-progress-bar');
  progressBar.style.backgroundColor = '#ff2d55';
  
  // Create error message element
  const errorElement = document.createElement('div');
  errorElement.className = 'quantum-error-message';
  errorElement.textContent = message;
  
  // Add reload button
  const reloadButton = document.createElement('button');
  reloadButton.textContent = 'Reload Application';
  reloadButton.style.marginTop = '1rem';
  reloadButton.style.padding = '0.5rem 1rem';
  reloadButton.style.backgroundColor = 'transparent';
  reloadButton.style.border = '1px solid #ff2d55';
  reloadButton.style.color = '#ff2d55';
  reloadButton.style.fontFamily = 'Space Mono, monospace';
  reloadButton.style.cursor = 'pointer';
  
  reloadButton.addEventListener('click', () => {
    window.location.reload();
  });
  
  errorElement.appendChild(document.createElement('br'));
  errorElement.appendChild(reloadButton);
  
  // Add to loading content
  const loadingContent = overlay.querySelector('.quantum-loading-content');
  loadingContent.appendChild(errorElement);
}

/**
 * Check if WebGL is supported
 * @returns {boolean} Whether WebGL is supported
 */
function hasWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

/**
 * Initialize the application when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', initializeQuantumApp);
