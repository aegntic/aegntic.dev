// src/ui/terminal/QuantumTerminal.js

/**
 * QuantumTerminal - Command-line interface for quantum field manipulation
 * 
 * Provides a terminal UI with command history, auto-completion,
 * and direct access to quantum field operations.
 */
export class QuantumTerminal {
  /**
   * Create a new quantum terminal
   * @param {HTMLElement} container - Container element for the terminal
   * @param {Object} context - Context objects for command execution
   */
  constructor(container, context = {}) {
    this.container = container;
    this.context = context;
    
    // Command history
    this.history = [];
    this.historyIndex = -1;
    this.currentInput = '';
    
    // Terminal state
    this.lineCount = 0;
    this.maxLines = 1000;
    
    // Create terminal DOM structure
    this.setupTerminalDOM();
    
    // Register command handlers
    this.registerCommands();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Add welcome message
    this.addLine('Quantum Field Terminal v1.0.0', 'system');
    this.addLine('Type `help` for available commands', 'system');
  }
  
  /**
   * Set up the terminal DOM elements
   */
  setupTerminalDOM() {
    // Terminal container
    this.terminalElement = document.createElement('div');
    this.terminalElement.className = 'quantum-terminal';
    this.container.appendChild(this.terminalElement);
    
    // Terminal header
    const header = document.createElement('div');
    header.className = 'terminal-header';
    header.innerHTML = `
      <div class="terminal-title">QUANTUM FIELD TERMINAL</div>
      <div class="terminal-controls">
        <button class="terminal-clear-btn" title="Clear Terminal">⨯</button>
      </div>
    `;
    this.terminalElement.appendChild(header);
    
    // Terminal content (output area)
    this.outputElement = document.createElement('div');
    this.outputElement.className = 'terminal-content';
    this.terminalElement.appendChild(this.outputElement);
    
    // Terminal input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'terminal-input-container';
    
    // Terminal prompt
    const prompt = document.createElement('span');
    prompt.className = 'terminal-prompt';
    prompt.textContent = '>';
    inputContainer.appendChild(prompt);
    
    // Terminal input
    this.inputElement = document.createElement('input');
    this.inputElement.className = 'terminal-input';
    this.inputElement.type = 'text';
    this.inputElement.spellcheck = false;
    this.inputElement.autocomplete = 'off';
    inputContainer.appendChild(this.inputElement);
    
    this.terminalElement.appendChild(inputContainer);
    
    // Apply terminal styles
    this.applyTerminalStyles();
    
    // Initialize clear button
    const clearBtn = header.querySelector('.terminal-clear-btn');
    clearBtn.addEventListener('click', () => this.clear());
  }
  
  /**
   * Apply styles to the terminal
   */
  applyTerminalStyles() {
    // Create a style element if not already in document
    let style = document.getElementById('quantum-terminal-style');
    
    if (!style) {
      style = document.createElement('style');
      style.id = 'quantum-terminal-style';
      document.head.appendChild(style);
    }
    
    style.textContent = `
      .quantum-terminal {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.85);
        color: var(--text-primary, #f0f0f0);
        font-family: var(--font-mono, monospace);
        font-size: 14px;
        border-top: 1px solid var(--accent-primary, #ff2d55);
      }
      
      .terminal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 5px 10px;
        background-color: rgba(0, 0, 0, 0.7);
        border-bottom: 1px solid var(--accent-primary, #ff2d55);
      }
      
      .terminal-title {
        font-size: 12px;
        font-weight: bold;
      }
      
      .terminal-clear-btn {
        background: none;
        border: none;
        color: var(--accent-primary, #ff2d55);
        cursor: pointer;
        font-size: 14px;
        padding: 2px 8px;
      }
      
      .terminal-content {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        word-break: break-word;
      }
      
      .terminal-line {
        margin-bottom: 2px;
        line-height: 1.3;
      }
      
      .terminal-line.system {
        color: var(--accent-secondary, #2fbfa8);
      }
      
      .terminal-line.error {
        color: var(--accent-primary, #ff2d55);
      }
      
      .terminal-line.warning {
        color: orange;
      }
      
      .terminal-line.success {
        color: lightgreen;
      }
      
      .terminal-line.info {
        color: var(--accent-tertiary, #8844ff);
      }
      
      .terminal-line.user {
        color: var(--text-primary, #f0f0f0);
      }
      
      .terminal-input-container {
        display: flex;
        padding: 5px 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .terminal-prompt {
        color: var(--accent-primary, #ff2d55);
        margin-right: 8px;
      }
      
      .terminal-input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-primary, #f0f0f0);
        font-family: var(--font-mono, monospace);
        font-size: 14px;
        outline: none;
        padding: 0;
      }
      
      /* Scrollbar styling */
      .terminal-content::-webkit-scrollbar {
        width: 8px;
      }
      
      .terminal-content::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
      }
      
      .terminal-content::-webkit-scrollbar-thumb {
        background: var(--accent-primary, #ff2d55);
        border-radius: 4px;
      }
    `;
  }
  
  /**
   * Set up event listeners for terminal interaction
   */
  setupEventListeners() {
    // Input keydown event for command processing and history
    this.inputElement.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
          this.processInput();
          break;
        
        case 'ArrowUp':
          e.preventDefault();
          this.navigateHistory(-1);
          break;
        
        case 'ArrowDown':
          e.preventDefault();
          this.navigateHistory(1);
          break;
        
        case 'Tab':
          e.preventDefault();
          this.autoComplete();
          break;
        
        case 'c':
          // Ctrl+C to clear current input
          if (e.ctrlKey) {
            e.preventDefault();
            this.inputElement.value = '';
            this.historyIndex = -1;
          }
          break;
      }
    });
  }
  
  /**
   * Process the current input
   */
  processInput() {
    const input = this.inputElement.value.trim();
    
    if (input) {
      // Add to history only if not the same as the most recent entry
      if (this.history.length === 0 || this.history[this.history.length - 1] !== input) {
        this.history.push(input);
        
        // Limit history size
        if (this.history.length > 100) {
          this.history.shift();
        }
      }
      
      this.historyIndex = -1;
      
      // Display the input
      this.addLine(`> ${input}`, 'user');
      
      // Process the command
      this.executeCommand(input);
      
      // Clear the input
      this.inputElement.value = '';
    }
  }
  
  /**
   * Navigate command history
   * @param {number} direction - Direction to navigate (-1 for up, 1 for down)
   */
  navigateHistory(direction) {
    if (this.history.length === 0) return;
    
    // Save current input if we're starting to navigate
    if (this.historyIndex === -1) {
      this.currentInput = this.inputElement.value;
    }
    
    this.historyIndex += direction;
    
    // Clamp history index
    if (this.historyIndex >= this.history.length) {
      this.historyIndex = this.history.length;
      this.inputElement.value = this.currentInput;
      return;
    } else if (this.historyIndex < 0) {
      this.historyIndex = -1;
      this.inputElement.value = this.currentInput;
      return;
    }
    
    // Set input to historical command
    this.inputElement.value = this.history[this.history.length - 1 - this.historyIndex];
    
    // Move cursor to end
    setTimeout(() => {
      this.inputElement.selectionStart = this.inputElement.selectionEnd = this.inputElement.value.length;
    }, 0);
  }
  
  /**
   * Auto-complete current input
   */
  autoComplete() {
    const input = this.inputElement.value;
    if (!input) return;
    
    // Get all command names and aliases
    const commandNames = [];
    
    for (const [name, command] of Object.entries(this.commands)) {
      commandNames.push(name);
      
      if (command.aliases) {
        commandNames.push(...command.aliases);
      }
    }
    
    // Find matches
    const matches = commandNames.filter(cmd => cmd.startsWith(input));
    
    if (matches.length === 1) {
      // Single match - complete it
      this.inputElement.value = matches[0] + ' ';
    } else if (matches.length > 1) {
      // Multiple matches - display options
      this.addLine(`Matching commands: ${matches.join(', ')}`, 'info');
      
      // Find common prefix
      let commonPrefix = matches[0];
      for (let i = 1; i < matches.length; i++) {
        let j = 0;
        while (j < commonPrefix.length && j < matches[i].length && 
               commonPrefix[j] === matches[i][j]) {
          j++;
        }
        commonPrefix = commonPrefix.substring(0, j);
      }
      
      // Complete to common prefix if longer than current input
      if (commonPrefix.length > input.length) {
        this.inputElement.value = commonPrefix;
      }
    }
  }
  
  /**
   * Add a line to the terminal output
   * @param {string} text - Text content
   * @param {string} type - Line type (user, system, error, warning, success, info)
   */
  addLine(text, type = "system") {
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    line.textContent = text;
    
    this.outputElement.appendChild(line);
    this.outputElement.scrollTop = this.outputElement.scrollHeight;
    
    this.lineCount++;
    
    // Remove old lines if exceeding max
    while (this.lineCount > this.maxLines) {
      this.outputElement.removeChild(this.outputElement.firstChild);
      this.lineCount--;
    }
  }
  
  /**
   * Clear the terminal output
   */
  clear() {
    this.outputElement.innerHTML = '';
    this.lineCount = 0;
    this.addLine('Terminal cleared', 'system');
  }
  
  /**
   * Focus the terminal input
   */
  focus() {
    this.inputElement.focus();
  }
  
  /**
   * Execute a terminal command
   * @param {string} input - Command input string
   */
  executeCommand(input) {
    // Parse the input
    const parts = input.split(' ').filter(part => part.length > 0);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Find the command handler
    let command = this.commands[commandName];
    
    if (!command) {
      // Check for aliases
      for (const [name, cmd] of Object.entries(this.commands)) {
        if (cmd.aliases && cmd.aliases.includes(commandName)) {
          command = cmd;
          break;
        }
      }
    }
    
    if (command) {
      try {
        command.handler(args);
      } catch (error) {
        this.addLine(`Error executing command: ${error.message}`, 'error');
        console.error('Command execution error:', error);
      }
    } else {
      this.addLine(`Unknown command: ${commandName}. Type 'help' for available commands.`, 'error');
    }
  }
  
  /**
   * Register all available terminal commands
   */
  registerCommands() {
    this.commands = {
      // Help command
      help: {
        description: 'Display available commands',
        usage: 'help [command]',
        aliases: ['?', 'commands'],
        handler: (args) => {
          if (args.length > 0) {
            // Show help for specific command
            const commandName = args[0].toLowerCase();
            const command = this.commands[commandName] || 
                           Object.entries(this.commands).find(
                             ([_, cmd]) => cmd.aliases && cmd.aliases.includes(commandName)
                           )?.[1];
            
            if (command) {
              this.addLine(`${commandName} - ${command.description}`, 'info');
              this.addLine(`Usage: ${command.usage || commandName}`, 'info');
              
              if (command.aliases && command.aliases.length > 0) {
                this.addLine(`Aliases: ${command.aliases.join(', ')}`, 'info');
              }
              
              if (command.examples && command.examples.length > 0) {
                this.addLine('Examples:', 'info');
                command.examples.forEach(example => {
                  this.addLine(`  ${example}`, 'info');
                });
              }
            } else {
              this.addLine(`No help available for '${commandName}'`, 'error');
            }
          } else {
            // Show all commands
            this.addLine('Available commands:', 'info');
            
            Object.entries(this.commands).forEach(([name, command]) => {
              this.addLine(`  ${name} - ${command.description}`, 'info');
            });
            
            this.addLine('Type "help <command>" for detailed information about a specific command.', 'info');
          }
        }
      },
      
      // Clear terminal
      clear: {
        description: 'Clear the terminal output',
        usage: 'clear',
        aliases: ['cls'],
        handler: () => {
          this.clear();
        }
      },
      
      // Initialize field
      initialize: {
        description: 'Initialize quantum field with specified parameters',
        usage: 'initialize [--dimensions N] [--resolution N] [--state TYPE] [--potential TYPE]',
        aliases: ['init'],
        examples: [
          'initialize --dimensions 2 --resolution 128 --state superposition --potential harmonic'
        ],
        handler: (args) => {
          const params = this.parseArguments(args, {
            dimensions: { type: 'number', alias: 'd' },
            resolution: { type: 'number', alias: 'r' },
            state: { type: 'string', alias: 's' },
            potential: { type: 'string', alias: 'p' }
          });
          
          const fieldParams = {};
          
          if (params.dimensions) fieldParams.dimensions = params.dimensions;
          if (params.resolution) fieldParams.resolution = params.resolution;
          if (params.state) fieldParams.initialState = params.state;
          if (params.potential) fieldParams.potentialType = params.potential;
          
          if (Object.keys(fieldParams).length === 0) {
            this.addLine('No parameters specified. Using default values.', 'warning');
          }
          
          if (this.context.interface) {
            this.context.interface.initializeField(fieldParams);
            this.addLine(`Field initialized with parameters: ${JSON.stringify(fieldParams)}`, 'success');
          } else {
            this.addLine('Field interface not available', 'error');
          }
        }
      },
      
      // Reset field
      reset: {
        description: 'Reset quantum field to initial state',
        usage: 'reset',
        handler: () => {
          if (this.context.interface) {
            this.context.interface.resetField();
            this.addLine('Field reset to initial state', 'success');
          } else {
            this.addLine('Field interface not available', 'error');
          }
        }
      },
      
      // Start/stop evolution
      evolution: {
        description: 'Control field evolution simulation',
        usage: 'evolution <start|stop|step>',
        aliases: ['evolve', 'sim'],
        examples: [
          'evolution start',
          'evolution stop',
          'evolution step'
        ],
        handler: (args) => {
          if (args.length === 0) {
            this.addLine('Missing argument. Usage: evolution <start|stop|step>', 'error');
            return;
          }
          
          const action = args[0].toLowerCase();
          
          if (!this.context.interface) {
            this.addLine('Field interface not available', 'error');
            return;
          }
          
          switch (action) {
            case 'start':
              this.context.interface.toggleSimulation(true);
              this.addLine('Field evolution started', 'success');
              break;
              
            case 'stop':
              this.context.interface.toggleSimulation(false);
              this.addLine('Field evolution stopped', 'success');
              break;
              
            case 'step':
              this.context.interface.stepSimulation();
              this.addLine('Field evolved by one step', 'success');
              break;
              
            default:
              this.addLine(`Unknown action: ${action}. Use start, stop, or step.`, 'error');
          }
        }
      },
      
      // Set visualization mode
      visualize: {
        description: 'Set visualization mode for quantum field',
        usage: 'visualize <mode>',
        aliases: ['vis', 'view'],
        examples: [
          'visualize field',
          'visualize probability',
          'visualize entropy',
          'visualize wavefunction'
        ],
        handler: (args) => {
          if (args.length === 0) {
            this.addLine('Missing argument. Available modes: field, probability, entropy, wavefunction, tensor3D', 'error');
            return;
          }
          
          const mode = args[0].toLowerCase();
          const validModes = ['field', 'probability', 'entropy', 'wavefunction', 'tensor3d'];
          
          if (!validModes.includes(mode)) {
            this.addLine(`Invalid mode: ${mode}. Available modes: ${validModes.join(', ')}`, 'error');
            return;
          }
          
          if (this.context.renderer) {
            this.context.renderer.setVisualizationMode(mode);
            this.addLine(`Visualization mode set to: ${mode}`, 'success');
          } else {
            this.addLine('Renderer not available', 'error');
          }
        }
      },
      
      // Get field info
      info: {
        description: 'Display information about the quantum field',
        usage: 'info',
        handler: () => {
          if (!this.context.quantum) {
            this.addLine('Quantum field not available', 'error');
            return;
          }
          
          const fieldSize = this.context.quantum.fieldSize;
          const config = this.context.quantum.config;
          
          this.addLine('Quantum Field Information:', 'info');
          this.addLine(`  Dimensions: ${config.dimensions}D`, 'info');
          this.addLine(`  Resolution: ${fieldSize.width}x${fieldSize.height}${config.dimensions > 2 ? 'x' + fieldSize.depth : ''}`, 'info');
          this.addLine(`  Initial State: ${config.initialState}`, 'info');
          this.addLine(`  Potential Type: ${config.potentialType}`, 'info');
          this.addLine(`  Boundary Condition: ${config.boundaryCondition}`, 'info');
          this.addLine(`  Evolution Mode: ${config.evolutionMode}`, 'info');
          this.addLine(`  GPU Acceleration: ${config.useGPU ? 'Enabled' : 'Disabled'}`, 'info');
        }
      },
      
      // Set parameters
      set: {
        description: 'Set parameters for the quantum field',
        usage: 'set <parameter> <value>',
        examples: [
          'set dimensions 3',
          'set initialState gaussian',
          'set evolutionMode schrödinger',
          'set intensity 1.5'
        ],
        handler: (args) => {
          if (args.length < 2) {
            this.addLine('Missing arguments. Usage: set <parameter> <value>', 'error');
            return;
          }
          
          const param = args[0];
          const value = args[1];
          
          if (!this.context.interface) {
            this.addLine('Interface not available', 'error');
            return;
          }
          
          let parsedValue = value;
          
          // Parse numeric values
          if (!isNaN(value)) {
            parsedValue = parseFloat(value);
          }
          
          // Parse boolean values
          if (value.toLowerCase() === 'true') parsedValue = true;
          if (value.toLowerCase() === 'false') parsedValue = false;
          
          // Create parameter update object
          const paramUpdate = { [param]: parsedValue };
          
          this.context.interface.updateParameters(paramUpdate);
          this.addLine(`Parameter updated: ${param} = ${parsedValue}`, 'success');
        }
      },
      
      // Export field
      export: {
        description: 'Export quantum field data',
        usage: 'export <format>',
        examples: [
          'export png',
          'export csv',
          'export json'
        ],
        handler: (args) => {
          if (args.length === 0) {
            this.addLine('Missing format argument. Available formats: png, csv, json, binary', 'error');
            return;
          }
          
          const format = args[0].toLowerCase();
          const validFormats = ['png', 'csv', 'json', 'binary'];
          
          if (!validFormats.includes(format)) {
            this.addLine(`Invalid format: ${format}. Available formats: ${validFormats.join(', ')}`, 'error');
            return;
          }
          
          if (this.context.interface) {
            this.context.interface.exportField(format);
          } else {
            this.addLine('Interface not available', 'error');
          }
        }
      },
      
      // Toggle audio
      audio: {
        description: 'Control audio sonification',
        usage: 'audio <on|off> [--volume N] [--mapping TYPE]',
        examples: [
          'audio on --volume 0.5',
          'audio off',
          'audio on --mapping phase'
        ],
        handler: (args) => {
          if (args.length === 0) {
            this.addLine('Missing argument. Usage: audio <on|off> [options]', 'error');
            return;
          }
          
          const action = args[0].toLowerCase();
          
          if (action !== 'on' && action !== 'off') {
            this.addLine(`Invalid action: ${action}. Use 'on' or 'off'.`, 'error');
            return;
          }
          
          if (!this.context.interface) {
            this.addLine('Interface not available', 'error');
            return;
          }
          
          // Parse remaining arguments
          const params = this.parseArguments(args.slice(1), {
            volume: { type: 'number', alias: 'v' },
            mapping: { type: 'string', alias: 'm' }
          });
          
          // Update audio parameters
          const audioParams = { audioEnabled: action === 'on' };
          
          if (params.volume !== undefined) {
            audioParams.audioVolume = params.volume;
          }
          
          if (params.mapping) {
            audioParams.audioMapping = params.mapping;
          }
          
          this.context.interface.updateParameters(audioParams);
          this.addLine(`Audio ${action === 'on' ? 'enabled' : 'disabled'}${Object.keys(params).length > 0 ? ' with custom parameters' : ''}`, 'success');
        }
      },
      
      // Matrix easter egg
      matrix: {
        description: 'Access the Matrix',
        usage: 'matrix',
        handler: () => {
          this.addLine('Initializing Matrix connection...', 'system');
          
          setTimeout(() => {
            this.addLine('Wake up, Neo...', 'system');
            
            setTimeout(() => {
              this.addLine('The Matrix has you...', 'system');
              
              setTimeout(() => {
                this.addLine('Follow the white rabbit.', 'system');
                
                setTimeout(() => {
                  this.addLine('Knock, knock, Neo.', 'system');
                }, 1500);
              }, 1500);
            }, 1500);
          }, 1500);
        }
      },
      
      // Exit terminal
      exit: {
        description: 'Close the terminal',
        usage: 'exit',
        aliases: ['quit', 'close'],
        handler: () => {
          if (this.context.interface) {
            this.context.interface.toggleTerminal();
          }
        }
      }
    };
  }
  
  /**
   * Parse command arguments
   * @param {string[]} args - Raw argument array
   * @param {Object} spec - Argument specification
   * @returns {Object} Parsed arguments
   */
  parseArguments(args, spec) {
    const result = {};
    
    // Create alias lookup
    const aliasMap = {};
    for (const [name, options] of Object.entries(spec)) {
      if (options.alias) {
        aliasMap[options.alias] = name;
      }
    }
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      // Check if this is a flag/option
      if (arg.startsWith('--') || arg.startsWith('-')) {
        const isLongFlag = arg.startsWith('--');
        const flagName = arg.substring(isLongFlag ? 2 : 1);
        
        // Resolve alias if needed
        const paramName = isLongFlag ? flagName : (aliasMap[flagName] || flagName);
        
        // Check if this is a valid parameter
        if (!spec[paramName]) {
          this.addLine(`Unknown parameter: ${arg}`, 'warning');
          continue;
        }
        
        // For boolean flags with no value
        if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
          result[paramName] = true;
          continue;
        }
        
        // Get the parameter value
        const value = args[i + 1];
        i++; // Skip the value in the next iteration
        
        // Convert value based on type
        if (spec[paramName].type === 'number') {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            this.addLine(`Invalid number for parameter ${paramName}: ${value}`, 'warning');
            continue;
          }
          result[paramName] = numValue;
        } else if (spec[paramName].type === 'boolean') {
          result[paramName] = value.toLowerCase() === 'true';
        } else {
          // String or other types
          result[paramName] = value;
        }
      }
    }
    
    return result;
  }
}
