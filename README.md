# AEGNTIC Quantum Interface System

AEGNTIC (Access Ecosystems Growing Naturally Through Intelligent Creativity) is a quantum field visualization system with a tartarian-inspired interface.

## Project Overview

The system combines advanced WebGL rendering with quantum field simulation to create an immersive and interactive interface for exploring quantum phenomena. It features:

- Real-time quantum field simulation with multiple visualization modes
- Interactive control panel for adjusting simulation parameters
- Command-line terminal interface for direct field manipulation
- Audio sonification of quantum states for multisensory experience
- Responsive design with fluid animations and transitions

## Architecture

The project is built on a modular architecture with the following components:

- **Core**: Quantum tensor field simulator with WebGL/WebGPU compute acceleration
- **Visualization**: WebGL-based rendering pipeline with shader-based visualization modes
- **UI**: Control panel and terminal interface for system interaction
- **Audio**: Web Audio API-based sonification system for quantum field states

## Getting Started

### Prerequisites

- Node.js 14+ and npm
- Modern web browser with WebGL support

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/aegntic.dev.git
   cd aegntic.dev
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. The application will be available at `http://localhost:9000`

### Building for Production

To create a production build:

```
npm run build
```

The optimized files will be available in the `dist` directory.

## Components

### Quantum Field Simulation

The core of the system is a quantum field simulator that calculates field evolution based on various quantum mechanical equations, including:

- Schrödinger equation
- Dirac equation
- Klein-Gordon equation
- Heat/diffusion equation

### Visualization Modes

The system supports multiple visualization modes:

- **Field Density**: Visualizes the probability density of the quantum field
- **Probability Distribution**: Shows the statistical distribution of quantum states
- **Information Entropy**: Displays the information content of the quantum field
- **Wavefunction Phase**: Visualizes the phase of the quantum wavefunction
- **3D Tensor Field**: Shows 3D projections of higher-dimensional tensor fields (requires WebGL2)

### Terminal Commands

The quantum terminal provides direct access to field manipulation through commands:

- `help`: Display available commands
- `initialize`: Initialize quantum field with specified parameters
- `reset`: Reset quantum field to initial state
- `evolution`: Control field evolution simulation
- `visualize`: Set visualization mode for quantum field
- `info`: Display information about the quantum field
- `set`: Set parameters for the quantum field
- `export`: Export quantum field data in various formats
- `audio`: Control audio sonification

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The AEGNTIC team for their vision and creativity
- The quantum computing community for inspiration
- All contributors to the project
