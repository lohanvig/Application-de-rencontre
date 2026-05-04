import { Audio } from "expo-av";

// Sons libres de droit — remplaçables par des fichiers locaux dans assets/sounds/
const SOUND_URLS = {
  like:    "https://assets.mixkit.co/sfx/preview/mixkit-quick-win-video-game-notification-269.mp3",
  nope:    "https://assets.mixkit.co/sfx/preview/mixkit-retro-game-notification-212.mp3",
  match:   "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3",
  send:    "https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3",
  receive: "https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3",
};

const cache = {};

export async function initAudio() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  } catch (e) {}
}

export async function playSound(name) {
  try {
    const url = SOUND_URLS[name];
    if (!url) return;

    if (!cache[name]) {
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      cache[name] = sound;
    }

    await cache[name].replayAsync();
  } catch (e) {
    // Son non disponible — l'app continue normalement
  }
}

export async function unloadSounds() {
  for (const sound of Object.values(cache)) {
    try { await sound.unloadAsync(); } catch (e) {}
  }
}
