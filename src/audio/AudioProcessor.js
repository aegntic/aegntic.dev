// src/audio/AudioProcessor.js

/**
 * AudioProcessor - Generate audio from quantum field data
 * 
 * Translates quantum field state into an audio representation,
 * with different mapping strategies to sonify field properties.
 */
export class AudioProcessor {
  /**
   * Create a new audio processor
   * @param {QuantumField} field - Quantum field to sonify
   */
  constructor(field) {
    this.field = field;
    
    // Audio context
    this.initializeAudio();
    
    // Default settings
    this.settings = {
      enabled: false,
      volume: 0.5,
      mapping: 'amplitude',
      maxFrequency: 2000,
      minFrequency: 100,
      maxHarmonics: 8,
      reverbLevel: 0.3,
      spatialize: true
    };
    
    // Create analyzer for visualization
    this.analyzer = this.audioContext.createAnalyser();
    this.analyzer.fftSize = 256;
    this.analyzer.connect(this.masterGain);
    
    this.frequencyData = new Uint8Array(this.analyzer.frequencyBinCount);
    
    // Audio processing loop ID
    this.processingInterval = null;
    
    console.info('Audio processor initialized');
  }
  
  /**
   * Initialize Web Audio API components
   */
  initializeAudio() {
    // Create audio context
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    } catch (error) {
      console.error('Web Audio API not supported:', error);
      throw new Error('Web Audio API not supported in this browser');
    }
    
    // Create master gain node for volume control
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.audioContext.destination);
    
    // Create convolver for reverb
    this.convolver = this.audioContext.createConvolver();
    this.generateReverb();
    
    // Create convolver gain for reverb mix
    this.convolverGain = this.audioContext.createGain();
    this.convolverGain.gain.value = this.settings.reverbLevel;
    
    // Create dry/wet mix
    this.dryGain = this.audioContext.createGain();
    this.dryGain.gain.value = 1 - this.settings.reverbLevel;
    
    // Connect reverb chain
    this.convolver.connect(this.convolverGain);
    this.convolverGain.connect(this.masterGain);
    this.dryGain.connect(this.masterGain);
    
    // Create oscillator bank for synthesis
    this.oscillators = [];
    
    // Maximum number of oscillators
    const maxOscillators = 16;
    
    for (let i = 0; i < maxOscillators; i++) {
      // Create oscillator
      const oscillator = this.audioContext.createOscillator();
      oscillator.type = i % 4 === 0 ? 'sine' : (i % 4 === 1 ? 'triangle' : (i % 4 === 2 ? 'square' : 'sawtooth'));
      oscillator.frequency.value = 100 + i * 50; // Different starting frequencies
      
      // Create gain for this oscillator
      const gain = this.audioContext.createGain();
      gain.gain.value = 0;
      
      // Create panner for spatialization
      const panner = this.audioContext.createPanner();
      panner.panningModel = 'equalpower';
      
      // Connect oscillator chain
      oscillator.connect(gain);
      gain.connect(panner);
      panner.connect(this.analyzer);
      panner.connect(this.dryGain);
      panner.connect(this.convolver);
      
      // Store references
      this.oscillators.push({
        oscillator,
        gain,
        panner
      });
      
      // Start oscillator
      oscillator.start();
    }
  }
  
  /**
   * Generate impulse response for reverb
   */
  generateReverb() {
    // Create impulse response (simple exponential decay)
    const duration = 2.0;
    const decay = 0.8;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    const impulseL = impulse.getChannelData(0);
    const impulseR = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
      const n = i / length;
      const t = (1 - n) ** decay;
      
      // Left channel
      impulseL[i] = (Math.random() * 2 - 1) * t;
      
      // Right channel (slightly different for stereo width)
      impulseR[i] = (Math.random() * 2 - 1) * t;
    }
    
    this.convolver.buffer = impulse;
  }
  
  /**
   * Enable audio processing
   */
  enable() {
    if (this.settings.enabled) return;
    
    this.settings.enabled = true;
    
    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Fade in master volume
    this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(
      this.settings.volume,
      this.audioContext.currentTime + 0.5
    );
    
    // Start processing loop
    this.startProcessing();
    
    console.info('Audio processing enabled');
  }
  
  /**
   * Disable audio processing
   */
  disable() {
    if (!this.settings.enabled) return;
    
    this.settings.enabled = false;
    
    // Fade out master volume
    this.masterGain.gain.setValueAtTime(
      this.masterGain.gain.value,
      this.audioContext.currentTime
    );
    this.masterGain.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + 0.5
    );
    
    // Stop processing loop
    this.stopProcessing();
    
    console.info('Audio processing disabled');
  }
  
  /**
   * Set audio volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume) {
    if (volume < 0 || volume > 1) {
      console.warn('Volume should be between 0.0 and 1.0');
      volume = Math.max(0, Math.min(1, volume));
    }
    
    this.settings.volume = volume;
    
    if (this.settings.enabled) {
      this.masterGain.gain.setValueAtTime(
        this.masterGain.gain.value,
        this.audioContext.currentTime
      );
      this.masterGain.gain.linearRampToValueAtTime(
        volume,
        this.audioContext.currentTime + 0.1
      );
    }
  }
  
  /**
   * Set audio mapping strategy
   * @param {string} mapping - Mapping type (amplitude, phase, entropy, spectral)
   */
  setMapping(mapping) {
    const validMappings = ['amplitude', 'phase', 'entropy', 'spectral'];
    
    if (!validMappings.includes(mapping)) {
      console.warn(`Invalid mapping: ${mapping}. Using amplitude.`);
      mapping = 'amplitude';
    }
    
    this.settings.mapping = mapping;
    
    // Restart processing if enabled
    if (this.settings.enabled) {
      this.stopProcessing();
      this.startProcessing();
    }
  }
  
  /**
   * Start the audio processing loop
   */
  startProcessing() {
    if (this.processingInterval) return;
    
    // Process immediately
    this.processField();
    
    // Set up interval for continuous processing
    this.processingInterval = setInterval(() => {
      this.processField();
    }, 100); // 10 updates per second
  }
  
  /**
   * Stop the audio processing loop
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    // Silence all oscillators
    this.oscillators.forEach(osc => {
      osc.gain.gain.setValueAtTime(
        osc.gain.gain.value,
        this.audioContext.currentTime
      );
      osc.gain.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + 0.1
      );
    });
  }
  
  /**
   * Process the field data and update audio parameters
   */
  processField() {
    if (!this.field) return;
    
    const fieldData = this.field.getFieldData();
    if (!fieldData) return;
    
    const { width, height, data } = fieldData;
    
    // Use different processing strategies based on the mapping
    switch (this.settings.mapping) {
      case 'amplitude':
        this.processAmplitudeMapping(width, height, data);
        break;
        
      case 'phase':
        this.processPhaseMapping(width, height, data);
        break;
        
      case 'entropy':
        this.processEntropyMapping(width, height, data);
        break;
        
      case 'spectral':
        this.processSpectralMapping(width, height, data);
        break;
        
      default:
        this.processAmplitudeMapping(width, height, data);
    }
    
    // Update analyzer data for visualization
    this.analyzer.getByteFrequencyData(this.frequencyData);
  }
  
  /**
   * Process field using amplitude mapping
   * Maps field amplitudes to oscillator frequencies and gains
   */
  processAmplitudeMapping(width, height, data) {
    const now = this.audioContext.currentTime;
    const numSamples = Math.min(8, this.oscillators.length); // Number of sample points to use
    
    // Sample points in grid pattern
    const gridSize = Math.ceil(Math.sqrt(numSamples));
    const stepX = width / gridSize;
    const stepY = height / gridSize;
    
    // Collect sample points
    const samples = [];
    
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        if (samples.length >= numSamples) break;
        
        const x = Math.floor(gx * stepX + stepX / 2);
        const y = Math.floor(gy * stepY + stepY / 2);
        const idx = (y * width + x) * 4;
        
        const real = data[idx];
        const imag = data[idx + 1];
        
        // Calculate amplitude and phase
        const amplitude = Math.sqrt(real * real + imag * imag);
        const phase = Math.atan2(imag, real);
        
        samples.push({
          amplitude,
          phase,
          x: (x / width) * 2 - 1, // Normalized to [-1, 1]
          y: (y / height) * 2 - 1 // Normalized to [-1, 1]
        });
      }
    }
    
    // Sort by amplitude (descending)
    samples.sort((a, b) => b.amplitude - a.amplitude);
    
    // Update oscillators
    for (let i = 0; i < this.oscillators.length; i++) {
      const osc = this.oscillators[i];
      
      if (i < numSamples) {
        const sample = samples[i];
        
        // Map amplitude to frequency range
        const freqRange = this.settings.maxFrequency - this.settings.minFrequency;
        const frequency = this.settings.minFrequency + freqRange * (0.1 + sample.amplitude * 0.9);
        
        // Set frequency (with slight randomness for texture)
        const detune = (Math.random() * 20 - 10); // ±10 cents
        osc.oscillator.frequency.setValueAtTime(frequency, now);
        osc.oscillator.detune.setValueAtTime(detune, now);
        
        // Set gain (with quick fade to avoid clicks)
        const targetGain = sample.amplitude * (1 / numSamples) * 0.4; // Reduced volume
        osc.gain.gain.setTargetAtTime(targetGain, now, 0.03);
        
        // Set panner position if spatialization is enabled
        if (this.settings.spatialize) {
          osc.panner.positionX.setValueAtTime(sample.x, now);
          osc.panner.positionZ.setValueAtTime(sample.y, now);
        }
      } else {
        // Silence inactive oscillators
        osc.gain.gain.setTargetAtTime(0, now, 0.05);
      }
    }
  }
  
  /**
   * Process field using phase mapping
   * Maps field phases to oscillator frequencies
   */
  processPhaseMapping(width, height, data) {
    const now = this.audioContext.currentTime;
    const numNotes = Math.min(8, this.oscillators.length);
    
    // Create phase buckets (dividing the circle into segments)
    const numBuckets = 8; // One per note in a scale
    const buckets = Array(numBuckets).fill(0);
    const amplitudes = Array(numBuckets).fill(0);
    
    // Sample the field
    const sampleCount = Math.min(width * height, 1000); // Limit sample points
    const sampleStep = Math.floor(width * height / sampleCount);
    
    for (let i = 0; i < sampleCount; i++) {
      const idx = (i * sampleStep) % (width * height) * 4;
      
      const real = data[idx];
      const imag = data[idx + 1];
      
      // Calculate amplitude and phase
      const amplitude = Math.sqrt(real * real + imag * imag);
      const phase = Math.atan2(imag, real);
      
      // Map phase to bucket (-π to π maps to 0 to numBuckets)
      const bucketIdx = Math.floor((phase + Math.PI) / (2 * Math.PI) * numBuckets) % numBuckets;
      
      // Add amplitude to bucket
      buckets[bucketIdx] += 1;
      amplitudes[bucketIdx] += amplitude;
    }
    
    // Normalize bucket amplitudes
    for (let i = 0; i < numBuckets; i++) {
      if (buckets[i] > 0) {
        amplitudes[i] /= buckets[i];
      }
    }
    
    // Create chord from dominant phase buckets
    const bucketEntries = buckets.map((count, index) => ({ 
      index, 
      count, 
      amplitude: amplitudes[index] 
    }));
    
    // Sort by count (descending)
    bucketEntries.sort((a, b) => b.count - a.count);
    
    // Base note (C3)
    const baseFreq = 130.81;
    
    // Major scale semitones
    const scale = [0, 2, 4, 5, 7, 9, 11, 12]; // C major scale
    
    // Update oscillators
    for (let i = 0; i < this.oscillators.length; i++) {
      const osc = this.oscillators[i];
      
      if (i < numNotes && i < bucketEntries.length && bucketEntries[i].count > 0) {
        const entry = bucketEntries[i];
        
        // Map bucket to note in scale
        const noteIndex = entry.index % scale.length;
        const octave = Math.floor(i / scale.length);
        
        // Calculate frequency using equal temperament
        const frequency = baseFreq * Math.pow(2, (scale[noteIndex] / 12) + octave);
        
        // Set frequency
        osc.oscillator.frequency.setValueAtTime(frequency, now);
        
        // Set gain based on bucket amplitude and count
        const relativeBucketSize = entry.count / Math.max(...buckets);
        const targetGain = entry.amplitude * relativeBucketSize * 0.3; // Reduced volume
        osc.gain.gain.setTargetAtTime(targetGain, now, 0.05);
        
        // Set panner position (spread across stereo field)
        if (this.settings.spatialize) {
          const panPosition = (i / (numNotes - 1)) * 2 - 1; // -1 to 1
          osc.panner.positionX.setValueAtTime(panPosition, now);
          osc.panner.positionZ.setValueAtTime(0, now);
        }
      } else {
        // Silence inactive oscillators
        osc.gain.gain.setTargetAtTime(0, now, 0.05);
      }
    }
  }
  
  /**
   * Process field using entropy mapping
   * Maps local field entropy to sound texture and complexity
   */
  processEntropyMapping(width, height, data) {
    // Simplified entropy mapping - just uses different waveforms based on complexity
    const now = this.audioContext.currentTime;
    
    // Calculate approximate entropy in different regions
    const regions = 4; // Divide field into 4x4 regions
    const entropyMap = Array(regions * regions).fill(0);
    const sampleCounts = Array(regions * regions).fill(0);
    
    // Sample points for entropy calculation
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        // Determine region
        const regionX = Math.floor((x / width) * regions);
        const regionY = Math.floor((y / height) * regions);
        const regionIdx = regionY * regions + regionX;
        
        // Get field values at this point
        const idx = (y * width + x) * 4;
        const real = data[idx];
        const imag = data[idx + 1];
        
        // Calculate amplitude
        const amplitude = Math.sqrt(real * real + imag * imag);
        
        // Simple entropy approximation - variance in local neighborhood
        let variance = 0;
        let neighborCount = 0;
        
        // Sample 3x3 neighborhood
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = (ny * width + nx) * 4;
              const nReal = data[nIdx];
              const nImag = data[nIdx + 1];
              const nAmp = Math.sqrt(nReal * nReal + nImag * nImag);
              
              variance += Math.abs(nAmp - amplitude);
              neighborCount++;
            }
          }
        }
        
        // Add normalized variance (entropy) to region
        if (neighborCount > 0) {
          entropyMap[regionIdx] += variance / neighborCount;
          sampleCounts[regionIdx]++;
        }
      }
    }
    
    // Normalize entropy values
    for (let i = 0; i < entropyMap.length; i++) {
      if (sampleCounts[i] > 0) {
        entropyMap[i] /= sampleCounts[i];
      }
    }
    
    // Sort regions by entropy (descending)
    const regionEntries = entropyMap.map((entropy, index) => ({
      index,
      entropy,
      x: (index % regions) / regions * 2 - 1,
      y: Math.floor(index / regions) / regions * 2 - 1
    }));
    
    regionEntries.sort((a, b) => b.entropy - a.entropy);
    
    // Filter out empty regions
    const activeRegions = regionEntries.filter(entry => sampleCounts[entry.index] > 0);
    
    // Base frequencies for each region (pentatonic scale)
    const baseFreqs = [130.81, 146.83, 164.81, 196.00, 220.00];
    
    // Number of notes to play
    const noteCount = Math.min(this.oscillators.length, activeRegions.length);
    
    // Update oscillators
    for (let i = 0; i < this.oscillators.length; i++) {
      const osc = this.oscillators[i];
      
      if (i < noteCount) {
        const entry = activeRegions[i % activeRegions.length];
        
        // Set oscillator type based on entropy
        // Higher entropy = more complex waveform
        const waveforms = ['sine', 'triangle', 'sawtooth', 'square'];
        const waveformIndex = Math.min(
          waveforms.length - 1,
          Math.floor(entry.entropy * 4)
        );
        osc.oscillator.type = waveforms[waveformIndex];
        
        // Set frequency based on region and entropy
        const baseFreq = baseFreqs[i % baseFreqs.length];
        const octave = Math.floor(i / baseFreqs.length);
        const frequency = baseFreq * Math.pow(2, octave);
        
        // Add slight detuning based on entropy
        const detune = entry.entropy * 30 - 15; // -15 to +15 cents
        
        osc.oscillator.frequency.setValueAtTime(frequency, now);
        osc.oscillator.detune.setValueAtTime(detune, now);
        
        // Set gain based on entropy
        const targetGain = entry.entropy * 0.3; // Reduced volume
        osc.gain.gain.setTargetAtTime(targetGain, now, 0.1);
        
        // Set panner position based on region coordinates
        if (this.settings.spatialize) {
          osc.panner.positionX.setValueAtTime(entry.x, now);
          osc.panner.positionZ.setValueAtTime(entry.y, now);
        }
      } else {
        // Silence inactive oscillators
        osc.gain.gain.setTargetAtTime(0, now, 0.05);
      }
    }
  }
  
  /**
   * Process field using spectral mapping
   * Treats field as a spectral distribution for additive synthesis
   */
  processSpectralMapping(width, height, data) {
    const now = this.audioContext.currentTime;
    
    // Sample the field in concentric rings to create a spectral distribution
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(centerX, centerY);
    
    // Number of frequency bands (one per oscillator)
    const numBands = Math.min(this.oscillators.length, 16);
    const bandAmplitudes = Array(numBands).fill(0);
    const bandSamples = Array(numBands).fill(0);
    
    // Sample along concentric rings
    for (let r = 0; r < maxRadius; r += 2) {
      // Map radius to frequency band
      const bandIndex = Math.floor((r / maxRadius) * numBands);
      if (bandIndex >= numBands) continue;
      
      // Samples along the circumference
      const circumference = 2 * Math.PI * r;
      const numSamples = Math.max(8, Math.floor(circumference / 4));
      
      for (let i = 0; i < numSamples; i++) {
        const angle = (i / numSamples) * 2 * Math.PI;
        const x = Math.floor(centerX + r * Math.cos(angle));
        const y = Math.floor(centerY + r * Math.sin(angle));
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          const real = data[idx];
          const imag = data[idx + 1];
          
          // Calculate amplitude
          const amplitude = Math.sqrt(real * real + imag * imag);
          
          // Add to band
          bandAmplitudes[bandIndex] += amplitude;
          bandSamples[bandIndex]++;
        }
      }
    }
    
    // Normalize band amplitudes
    for (let i = 0; i < numBands; i++) {
      if (bandSamples[i] > 0) {
        bandAmplitudes[i] /= bandSamples[i];
      }
    }
    
    // Base frequency for lowest band
    const baseFreq = 80;
    
    // Set oscillator parameters
    for (let i = 0; i < this.oscillators.length; i++) {
      const osc = this.oscillators[i];
      
      if (i < numBands) {
        // Use sine wave for additive synthesis
        osc.oscillator.type = 'sine';
        
        // Set frequency with exponential scaling
        const freq = baseFreq * Math.pow(2, i / 4); // Octave every 4 bands
        osc.oscillator.frequency.setValueAtTime(freq, now);
        
        // Set gain based on band amplitude
        const amplitude = bandAmplitudes[i];
        
        // Scale down higher frequencies to avoid harshness
        const scaleFactor = 1.0 - (i / numBands) * 0.5;
        const targetGain = amplitude * scaleFactor * 0.25; // Reduced volume
        
        osc.gain.gain.setTargetAtTime(targetGain, now, 0.05);
        
        // Set panner position (spread across stereo field)
        if (this.settings.spatialize) {
          const pan = (i / (numBands - 1)) * 2 - 1; // -1 to 1
          osc.panner.positionX.setValueAtTime(pan, now);
        }
      } else {
        // Silence inactive oscillators
        osc.gain.gain.setTargetAtTime(0, now, 0.05);
      }
    }
  }
  
  /**
   * Get frequency data for visualization
   * @returns {Uint8Array} Frequency data array
   */
  getFrequencyData() {
    if (!this.settings.enabled) return null;
    
    this.analyzer.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }
  
  /**
   * Dispose audio processor and free resources
   */
  dispose() {
    // Stop processing
    this.disable();
    this.stopProcessing();
    
    // Clean up oscillators
    this.oscillators.forEach(osc => {
      try {
        osc.oscillator.stop();
        osc.oscillator.disconnect();
        osc.gain.disconnect();
        osc.panner.disconnect();
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    
    // Clean up other nodes
    try {
      this.analyzer.disconnect();
      this.convolver.disconnect();
      this.convolverGain.disconnect();
      this.dryGain.disconnect();
      this.masterGain.disconnect();
    } catch (error) {
      // Ignore errors during cleanup
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    console.info('Audio processor disposed');
  }
}
