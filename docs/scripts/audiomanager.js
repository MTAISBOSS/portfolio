class AudioManager {
  constructor() {
    this.sounds = {};
    this.masterVolume = 1;
    this.enabled = true;
  }

  loadSound(name, url, volume = 1, loop = false) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = url;
      audio.volume = volume * this.masterVolume;
      audio.loop = loop;

      audio.addEventListener("canplaythrough", () => {
        this.sounds[name] = audio;
        resolve(audio);
      });

      audio.addEventListener("error", (e) => {
        console.error(`Error loading sound ${name}:`, e);
        reject(e);
      });

      audio.load();
    });
  }

  async loadSounds(soundMap) {
    const promises = [];
    for (const [name, config] of Object.entries(soundMap)) {
      promises.push(
        this.loadSound(name, config.url, config.volume, config.loop),
      );
    }
    await Promise.all(promises);
  }

  play(name, allowOverlap = false) {
    if (!this.enabled) return null;

    const sound = this.sounds[name];
    if (!sound) {
      console.warn(`Sound "${name}" not found`);
      return null;
    }

    if (!allowOverlap) {
      sound.pause();
      sound.currentTime = 0;
    } else {
      const clone = new Audio();
      clone.src = sound.src;
      clone.volume = sound.volume;
      clone.loop = sound.loop;
      clone.play().catch((e) => console.warn("Audio play failed:", e));
      return clone;
    }

    sound.play().catch((e) => console.warn("Audio play failed:", e));
    return sound;
  }

  stop(name) {
    const sound = this.sounds[name];
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  stopAll() {
    Object.values(this.sounds).forEach((sound) => {
      sound.pause();
      sound.currentTime = 0;
    });
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach((sound) => {
      const originalVolume = sound._originalVolume || sound.volume;
      sound._originalVolume = originalVolume;
      sound.volume = originalVolume * this.masterVolume;
    });
  }

  toggleMute() {
    this.enabled = !this.enabled;
    if (this.enabled) {
    } else {
      this.stopAll();
    }
    return this.enabled;
  }

  isPlaying(name) {
    const sound = this.sounds[name];
    return sound && !sound.paused && sound.currentTime > 0;
  }
}
