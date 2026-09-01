/**
 * AudioPlayerWidget - 3 Mind-Relaxing Focus Coding Ambient Synthesizers
 *
 * Tracks:
 * 1. 'deep-focus' / 'deep' - Deep Focus 432Hz binaural concentration tone
 * 2. 'cosy-rain' / 'rain'  - Cosy Rain & gentle ambient drops
 * 3. 'lofi-beats' / 'lofi' - Lo-Fi chill beats & warm ambient keys
 */
export class AudioPlayerWidget {
  #audioContext;
  #currentTrack;
  #activeNodes;
  #gainNode;
  #volume;

  constructor() {
    this.#audioContext = null;
    this.#currentTrack = null;
    this.#activeNodes = [];
    this.#gainNode = null;
    this.#volume = 0.5;
  }

  #initContext() {
    if (!this.#audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.#audioContext = new AudioContextClass();
        this.#gainNode = this.#audioContext.createGain();
        this.#gainNode.gain.value = this.#volume;
        this.#gainNode.connect(this.#audioContext.destination);
      }
    }

    if (this.#audioContext && this.#audioContext.state === 'suspended') {
      this.#audioContext.resume();
    }
  }

  /**
   * Plays selected ambient track ('deep' | 'rain' | 'lofi').
   * @param {string} trackName
   */
  playTrack(trackName) {
    this.#initContext();

    if (this.#currentTrack === trackName && this.#activeNodes.length > 0) {
      return;
    }

    this.stop();
    this.#currentTrack = trackName;

    if (!this.#audioContext) return;

    if (trackName === 'deep' || trackName === 'deep-focus') {
      this.#activeNodes = this.#createDeepFocusSynthesizer();
    } else if (trackName === 'rain' || trackName === 'cosy-rain') {
      this.#activeNodes = this.#createCosyRainSynthesizer();
    } else if (trackName === 'lofi' || trackName === 'lofi-beats') {
      this.#activeNodes = this.#createLofiBeatsSynthesizer();
    }
  }

  stop() {
    this.#activeNodes.forEach(node => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch (e) {}
    });
    this.#activeNodes = [];
    this.#currentTrack = null;
  }

  setVolume(level) {
    this.#volume = Math.max(0, Math.min(1, level));
    if (this.#gainNode && this.#audioContext) {
      this.#gainNode.gain.setValueAtTime(this.#volume, this.#audioContext.currentTime);
    }
  }

  getCurrentTrack() {
    return this.#currentTrack;
  }

  /* ==========================================
     3 Coding Vibe Synthesizers
     ========================================== */

  // 1. Deep Focus 432Hz Binaural Flow
  #createDeepFocusSynthesizer() {
    const osc1 = this.#audioContext.createOscillator();
    const osc2 = this.#audioContext.createOscillator();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(216, this.#audioContext.currentTime); // 432Hz base harmonic
    osc2.frequency.setValueAtTime(224, this.#audioContext.currentTime); // +8Hz Alpha binaural flow

    const gain = this.#audioContext.createGain();
    gain.gain.value = 0.12;

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.#gainNode);

    osc1.start();
    osc2.start();

    return [osc1, osc2, gain];
  }

  // 2. Cosy Rain Ambient
  #createCosyRainSynthesizer() {
    const bufferSize = this.#audioContext.sampleRate * 2;
    const buffer = this.#audioContext.createBuffer(1, bufferSize, this.#audioContext.sampleRate);
    const output = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 0.10;
    }

    const rainSource = this.#audioContext.createBufferSource();
    rainSource.buffer = buffer;
    rainSource.loop = true;

    const lowpass = this.#audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1000;

    rainSource.connect(lowpass);
    lowpass.connect(this.#gainNode);
    rainSource.start();

    return [rainSource, lowpass];
  }

  // 3. Lo-Fi Chill Beats & Warm Keys
  #createLofiBeatsSynthesizer() {
    const osc = this.#audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130.81, this.#audioContext.currentTime); // C3 warm tone

    const filter = this.#audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, this.#audioContext.currentTime);

    osc.connect(filter);
    filter.connect(this.#gainNode);
    osc.start();

    return [osc, filter];
  }

  destroy() {
    this.stop();
    if (this.#audioContext) {
      try {
        this.#audioContext.close();
      } catch (e) {}
      this.#audioContext = null;
    }
  }
}
