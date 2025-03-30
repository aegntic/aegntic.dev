// src/visualization/QuantumRenderer.js

/**
 * QuantumRenderer - Handles the visualization of quantum field data using WebGL
 * 
 * This class manages shader programs, WebGL contexts, and rendering
 * for different visualization modes of quantum field data.
 */
export class QuantumRenderer {
  /**
   * Create a new QuantumRenderer
   * @param {HTMLElement} container - Container element for the renderer
   * @param {QuantumField} field - Quantum field data source
   */
  constructor(container, field) {
    this.field = field;
    
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'quantum-renderer-canvas';
    container.appendChild(this.canvas);
    
    // Initialize WebGL context
    this.initWebGL();
    
    // Current visualization state
    this.currentMode = 'field';
    this.animationFrame = null;
    this.isRunning = false;
    
    // GPU capabilities
    this.hasWebGL2 = !!this.gl2;
    this.has3DTextures = this.hasWebGL2 && this.gl2.getExtension('OES_texture_float_linear');
    
    // Initialize shader programs
    this.initShaderPrograms();
    
    // Set up buffers and textures
    this.initBuffers();
    this.initTextures();
    
    // Animation properties
    this.lastFrameTime = 0;
    this.animationTime = 0;
    
    // Visualization settings
    this.settings = {
      intensity: 1.0,
      threshold: 0.01,
      slicePosition: 0.5,
      sliceAxis: 2,
      resolution: [this.canvas.width, this.canvas.height]
    };
    
    // Handle resize and begin render loop
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Start render loop
    this.startRenderLoop();
  }
  
  /**
   * Initialize WebGL contexts
   * Will try WebGL2 first and fall back to WebGL1
   */
  initWebGL() {
    // Try to get WebGL2 context first
    this.gl2 = this.canvas.getContext('webgl2');
    
    if (this.gl2) {
      this.gl = this.gl2; // Use WebGL2 context
      console.info('Using WebGL 2.0 context');
    } else {
      // Fall back to WebGL1
      this.gl = this.canvas.getContext('webgl') || 
               this.canvas.getContext('experimental-webgl');
      console.info('Falling back to WebGL 1.0 context');
    }
    
    if (!this.gl) {
      throw new Error('WebGL not supported in this browser!');
    }
    
    // Check for required extensions
    if (!this.gl2) {
      // For WebGL1, we need these extensions for float textures
      const floatTextureExt = this.gl.getExtension('OES_texture_float');
      const floatTextureLinearExt = this.gl.getExtension('OES_texture_float_linear');
      
      if (!floatTextureExt) {
        console.warn('OES_texture_float not supported - visualizations may have reduced precision');
      }
      
      if (!floatTextureLinearExt) {
        console.warn('OES_texture_float_linear not supported - visualizations may have artifacts');
      }
    }
    
    // Set initial parameters
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
  }
  
  /**
   * Compile a shader program from vertex and fragment shaders
   */
  compileShaderProgram(vertexShaderSource, fragmentShaderSource) {
    const gl = this.gl;
    
    // Compile vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    
    // Check vertex shader compilation
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(vertexShader);
      gl.deleteShader(vertexShader);
      throw new Error(`Vertex shader compilation failed: ${error}`);
    }
    
    // Compile fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    
    // Check fragment shader compilation
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(fragmentShader);
      gl.deleteShader(fragmentShader);
      gl.deleteShader(vertexShader);
      throw new Error(`Fragment shader compilation failed: ${error}`);
    }
    
    // Create and link the shader program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    // Check program linking
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error(`Shader program linking failed: ${error}`);
    }
    
    // Return the compiled program
    return program;
  }
  
  /**
   * Initialize all shader programs
   */
  initShaderPrograms() {
    this.shaderPrograms = {};
    
    // Define basic shader programs for visualization
    
    // Field Density Visualization
    const fieldVertexShader = `
      attribute vec4 aVertexPosition;
      attribute vec2 aTextureCoord;
      
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      
      varying highp vec2 vTextureCoord;
      
      void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
      }
    `;
    
    const fieldFragmentShader = `
      precision highp float;
      
      varying highp vec2 vTextureCoord;
      
      uniform sampler2D uFieldTexture;
      uniform float uIntensity;
      uniform float uTime;
      uniform vec2 uResolution;
      
      void main() {
        // Sample the field data
        vec4 fieldData = texture2D(uFieldTexture, vTextureCoord);
        
        // Extract real and imaginary parts
        float real = fieldData.r;
        float imag = fieldData.g;
        
        // Calculate amplitude and phase
        float amplitude = sqrt(real * real + imag * imag);
        float phase = atan(imag, real);
        
        // Apply time-based animation to phase
        float animatedPhase = phase + uTime * 0.5;
        
        // Create a color based on amplitude and phase
        float hue = (animatedPhase / (2.0 * 3.14159) + 0.5);
        float saturation = 0.6 + amplitude * 0.4;
        float value = amplitude * uIntensity;
        
        // HSV to RGB conversion
        vec3 rgb = vec3(0.0);
        float h = hue * 6.0;
        float i = floor(h);
        float f = h - i;
        float p = value * (1.0 - saturation);
        float q = value * (1.0 - f * saturation);
        float t = value * (1.0 - (1.0 - f) * saturation);
        
        if (i == 0.0) rgb = vec3(value, t, p);
        else if (i == 1.0) rgb = vec3(q, value, p);
        else if (i == 2.0) rgb = vec3(p, value, t);
        else if (i == 3.0) rgb = vec3(p, q, value);
        else if (i == 4.0) rgb = vec3(t, p, value);
        else rgb = vec3(value, p, q);
        
        // Output color with alpha based on amplitude
        gl_FragColor = vec4(rgb, 0.7 + 0.3 * amplitude);
      }
    `;
    
    // Probability Visualization
    const probFragmentShader = `
      precision highp float;
      
      varying highp vec2 vTextureCoord;
      
      uniform sampler2D uFieldTexture;
      uniform float uIntensity;
      uniform float uThreshold;
      uniform float uTime;
      uniform vec2 uResolution;
      
      void main() {
        // Sample the field data
        vec4 fieldData = texture2D(uFieldTexture, vTextureCoord);
        
        // Extract real and imaginary parts
        float real = fieldData.r;
        float imag = fieldData.g;
        
        // Calculate probability (squared amplitude)
        float probability = real * real + imag * imag;
        
        // Apply threshold and scaling
        probability = smoothstep(uThreshold, 1.0, probability) * uIntensity;
        
        // Create a blue-white-red color scale
        vec3 color = vec3(0.0);
        if (probability < 0.5) {
          // Blue to white gradient for lower probabilities
          color = mix(vec3(0.0, 0.2, 0.8), vec3(1.0), probability * 2.0);
        } else {
          // White to red gradient for higher probabilities
          color = mix(vec3(1.0), vec3(1.0, 0.0, 0.0), (probability - 0.5) * 2.0);
        }
        
        // Add a subtle pulsing effect
        float pulse = 0.9 + 0.1 * sin(uTime * 2.0);
        color *= pulse;
        
        // Output color with alpha based on probability
        gl_FragColor = vec4(color, probability * 0.8 + 0.2);
      }
    `;
    
    // Wavefunction Visualization
    const waveFragmentShader = `
      precision highp float;
      
      varying highp vec2 vTextureCoord;
      
      uniform sampler2D uFieldTexture;
      uniform float uIntensity;
      uniform float uTime;
      uniform vec2 uResolution;
      
      void main() {
        // Sample the field data
        vec4 fieldData = texture2D(uFieldTexture, vTextureCoord);
        
        // Extract real and imaginary parts
        float real = fieldData.r;
        float imag = fieldData.g;
        
        // Calculate amplitude and phase
        float amplitude = sqrt(real * real + imag * imag);
        float phase = atan(imag, real);
        
        // Normalize phase to [0, 1] range
        float normalizedPhase = (phase + 3.14159) / (2.0 * 3.14159);
        
        // Create color from phase (HSV to RGB)
        vec3 color = vec3(0.0);
        float h = normalizedPhase * 6.0;
        float i = floor(h);
        float f = h - i;
        float p = 0.0;
        float q = 1.0 - f;
        float t = f;
        
        if (i == 0.0) color = vec3(1.0, t, p);
        else if (i == 1.0) color = vec3(q, 1.0, p);
        else if (i == 2.0) color = vec3(p, 1.0, t);
        else if (i == 3.0) color = vec3(p, q, 1.0);
        else if (i == 4.0) color = vec3(t, p, 1.0);
        else color = vec3(1.0, p, q);
        
        // Modulate color by amplitude
        color *= amplitude * uIntensity;
        
        // Add contours showing constant phase
        float contourPhase = mod(phase + uTime, 2.0 * 3.14159) / (2.0 * 3.14159);
        float contourWidth = 0.1;
        float contourStrength = 0.3;
        float contourValue = smoothstep(0.5 - contourWidth, 0.5, contourPhase) - 
                             smoothstep(0.5, 0.5 + contourWidth, contourPhase);
        
        // Add contour to color
        color += vec3(contourValue * contourStrength);
        
        // Output color with amplitude-based alpha
        gl_FragColor = vec4(color, amplitude * 0.7 + 0.3);
      }
    `;
    
    try {
      // Compile shader programs
      this.shaderPrograms.field = this.compileShaderProgram(
        fieldVertexShader, fieldFragmentShader
      );
      
      this.shaderPrograms.probability = this.compileShaderProgram(
        fieldVertexShader, probFragmentShader  // Reuse vertex shader
      );
      
      this.shaderPrograms.wavefunction = this.compileShaderProgram(
        fieldVertexShader, waveFragmentShader  // Reuse vertex shader
      );
      
      console.info('Shader programs compiled successfully');
    } catch (error) {
      console.error('Failed to compile shader programs:', error);
      throw error;
    }
    
    // Store attribute and uniform locations for each program
    this.programInfo = {};
    
    // For each shader program, store its attribute and uniform locations
    for (const [name, program] of Object.entries(this.shaderPrograms)) {
      const gl = this.gl;
      
      // Basic attributes and uniforms for all shaders
      const programInfo = {
        program,
        attribLocations: {
          vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
          textureCoord: gl.getAttribLocation(program, 'aTextureCoord')
        },
        uniformLocations: {
          projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
          modelViewMatrix: gl.getUniformLocation(program, 'uModelViewMatrix'),
          fieldTexture: gl.getUniformLocation(program, 'uFieldTexture'),
          intensity: gl.getUniformLocation(program, 'uIntensity'),
          time: gl.getUniformLocation(program, 'uTime'),
          resolution: gl.getUniformLocation(program, 'uResolution')
        }
      };
      
      // Additional uniforms for specific shaders
      if (name === 'probability') {
        programInfo.uniformLocations.threshold = gl.getUniformLocation(program, 'uThreshold');
      }
      
      this.programInfo[name] = programInfo;
    }
  }
  
  /**
   * Initialize vertex and index buffers for rendering
   */
  initBuffers() {
    const gl = this.gl;
    
    // Create and bind the position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    // Quad positions (2 triangles forming a rectangle)
    const positions = [
      -1.0, -1.0,  // Bottom left
       1.0, -1.0,  // Bottom right
       1.0,  1.0,  // Top right
      -1.0,  1.0,  // Top left
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    // Create and bind texture coordinate buffer
    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    
    // Texture coordinates
    const textureCoordinates = [
      0.0, 0.0,  // Bottom left
      1.0, 0.0,  // Bottom right
      1.0, 1.0,  // Top right
      0.0, 1.0,  // Top left
    ];
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
    
    // Create and bind index buffer
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    
    // Indices for the triangles
    const indices = [
      0, 1, 2,  // First triangle
      0, 2, 3,  // Second triangle
    ];
    
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    // Store the buffers
    this.buffers = {
      position: positionBuffer,
      textureCoord: textureCoordBuffer,
      indices: indexBuffer,
    };
  }
  
  /**
   * Initialize textures for field data
   */
  initTextures() {
    const gl = this.gl;
    
    // Create the field data texture
    this.fieldTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTexture);
    
    // Set default texture data (empty field)
    const width = 128;
    const height = 128;
    const emptyField = new Float32Array(width * height * 4);
    
    // Initialize with empty data
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 
      width, height, 0, 
      gl.RGBA, gl.FLOAT, emptyField
    );
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  
  /**
   * Update the field data texture from the quantum field
   */
  updateFieldTexture() {
    if (!this.field) return;
    
    const gl = this.gl;
    const fieldData = this.field.getFieldData();
    
    if (!fieldData) {
      console.warn('No field data available');
      return;
    }
    
    // Update the 2D field texture
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTexture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 
      fieldData.width, fieldData.height, 0, 
      gl.RGBA, gl.FLOAT, fieldData.data
    );
  }
  
  /**
   * Set the visualization mode
   * @param {string} mode - One of 'field', 'probability', 'wavefunction'
   */
  setVisualizationMode(mode) {
    // Check if mode is supported
    if (!this.shaderPrograms[mode]) {
      console.warn(`Visualization mode '${mode}' not supported`);
      return;
    }
    
    this.currentMode = mode;
    console.info(`Visualization mode set to: ${mode}`);
  }
  
  /**
   * Handle canvas resize
   */
  resize() {
    const parent = this.canvas.parentElement;
    const displayWidth = parent.clientWidth;
    const displayHeight = parent.clientHeight;
    
    // Resize canvas to match container while maintaining pixel density
    const pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = displayWidth * pixelRatio;
    this.canvas.height = displayHeight * pixelRatio;
    
    // Update canvas CSS size
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    
    // Update viewport
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    // Update resolution setting for shaders
    this.settings.resolution = [this.canvas.width, this.canvas.height];
    
    console.info(`Renderer resized: ${this.canvas.width}x${this.canvas.height}`);
  }
  
  /**
   * Start the render loop
   */
  startRenderLoop() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.renderFrame();
    
    console.info('Render loop started');
  }
  
  /**
   * Stop the render loop
   */
  stopRenderLoop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    console.info('Render loop stopped');
  }
  
  /**
   * Render a single frame
   */
  renderFrame() {
    // Calculate time delta
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000.0; // in seconds
    this.lastFrameTime = currentTime;
    
    // Update animation time
    this.animationTime += deltaTime;
    
    // Update field texture with latest data
    this.updateFieldTexture();
    
    // Render the current visualization
    this.render();
    
    // Schedule the next frame if running
    if (this.isRunning) {
      this.animationFrame = requestAnimationFrame(() => this.renderFrame());
    }
  }
  
  /**
   * Main render function
   */
  render() {
    const gl = this.gl;
    
    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Use the appropriate shader program for the current mode
    const programInfo = this.programInfo[this.currentMode];
    gl.useProgram(programInfo.program);
    
    // Set up projection and model-view matrices (identity for full-screen quad)
    const projectionMatrix = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
    
    const modelViewMatrix = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
    
    // Set up vertex positions
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      2,        // 2 components per vertex (x, y)
      gl.FLOAT, // 32-bit floats
      false,    // don't normalize
      0,        // stride (0 = use type and numComponents)
      0         // offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    
    // Set up texture coordinates
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.textureCoord);
    gl.vertexAttribPointer(
      programInfo.attribLocations.textureCoord,
      2,        // 2 components per vertex (s, t)
      gl.FLOAT, // 32-bit floats
      false,    // don't normalize
      0,        // stride
      0         // offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
    
    // Set up indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
    
    // Set common uniforms
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix
    );
    
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix
    );
    
    // Set time and intensity uniforms
    gl.uniform1f(programInfo.uniformLocations.time, this.animationTime);
    gl.uniform1f(programInfo.uniformLocations.intensity, this.settings.intensity);
    
    // Set resolution uniform
    gl.uniform2fv(programInfo.uniformLocations.resolution, this.settings.resolution);
    
    // Activate texture unit 0 for the field texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTexture);
    gl.uniform1i(programInfo.uniformLocations.fieldTexture, 0);
    
    // Set mode-specific uniforms
    if (this.currentMode === 'probability') {
      // Set threshold value
      gl.uniform1f(programInfo.uniformLocations.threshold, this.settings.threshold);
    }
    
    // Draw the quad
    gl.drawElements(
      gl.TRIANGLES,       // primitive type
      6,                  // vertex count
      gl.UNSIGNED_SHORT,  // type of indices
      0                   // offset
    );
  }
  
  /**
   * Update visualization settings
   * @param {Object} newSettings - New settings to apply
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }
  
  /**
   * Dispose renderer resources
   */
  dispose() {
    this.stopRenderLoop();
    
    const gl = this.gl;
    
    // Delete textures
    gl.deleteTexture(this.fieldTexture);
    
    // Delete buffers
    gl.deleteBuffer(this.buffers.position);
    gl.deleteBuffer(this.buffers.textureCoord);
    gl.deleteBuffer(this.buffers.indices);
    
    // Delete shader programs
    for (const program of Object.values(this.shaderPrograms)) {
      gl.deleteProgram(program);
    }
    
    // Remove canvas
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    console.info('Renderer disposed');
  }
}
