import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─────────────────────────────────────────────
// SONS DISTANTS (fonctionnent sans fichiers)
// ─────────────────────────────────────────────
const REMOTE_SOUNDS = {
  like:    "https://assets.mixkit.co/sfx/preview/mixkit-bonus-earned-in-video-game-2058.mp3",
  nope:    "https://assets.mixkit.co/sfx/preview/mixkit-fast-small-sweep-transition-166.mp3",
  match:   "https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3",
  send:    "https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3",
  receive: "https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3",
  photo:   "https://assets.mixkit.co/sfx/preview/mixkit-camera-shutter-click-1133.mp3",
  tap:     "https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-3124.mp3",
};

// ─────────────────────────────────────────────
// SONS LOCAUX — décommente après avoir téléchargé
// les fichiers dans assets/sounds/ :
//
//   like.mp3    → son satisfaisant au swipe droit
//   nope.mp3    → son léger au swipe gauche
//   match.mp3   → fanfare courte pour un match
//   send.mp3    → whoosh envoi message
//   receive.mp3 → ding réception message
//   photo.mp3   → click photo
//   tap.mp3     → clic UI subtil
//   ambient.mp3 → musique ambiante (optionnelle)
// ─────────────────────────────────────────────
// const LOCAL_SOUNDS = {
//   like:    require("../assets/sounds/like.mp3"),
//   nope:    require("../assets/sounds/nope.mp3"),
//   match:   require("../assets/sounds/match.mp3"),
//   send:    require("../assets/sounds/send.mp3"),
//   receive: require("../assets/sounds/receive.mp3"),
//   photo:   require("../assets/sounds/photo.mp3"),
//   tap:     require("../assets/sounds/tap.mp3"),
// };
// const USE_LOCAL = true;

const USE_LOCAL = false;

// ─────────────────────────────────────────────
// VIBRATIONS (jouent même en mode silencieux)
// ─────────────────────────────────────────────
const HAPTICS = {
  like:    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  nope:    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  match:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  send:    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  receive: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  photo:   () => Haptics.selectionAsync(),
  tap:     () => Haptics.selectionAsync(),
};

// ─────────────────────────────────────────────
// VOLUMES PAR SON
// ─────────────────────────────────────────────
const VOLUMES = {
  like:    0.75,
  nope:    0.6,
  match:   1.0,
  send:    0.65,
  receive: 0.65,
  photo:   0.4,
  tap:     0.3,
};

const cache = {};
let _muted = false;
let _backgroundMusic = null;

// ─────────────────────────────────────────────
// ÉTAT MUET (persisté)
// ─────────────────────────────────────────────
export async function loadMuteState() {
  try {
    const stored = await AsyncStorage.getItem("soundMuted");
    _muted = stored === "true";
  } catch {}
  return _muted;
}

export async function toggleMute() {
  _muted = !_muted;
  try { await AsyncStorage.setItem("soundMuted", String(_muted)); } catch {}
  if (_muted) await stopBackgroundMusic();
  return _muted;
}

export const getMuted = () => _muted;

// ─────────────────────────────────────────────
// INITIALISATION AUDIO
// ─────────────────────────────────────────────
export async function initAudio() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
    });
  } catch {}
}

// ─────────────────────────────────────────────
// JOUER UN SON
// ─────────────────────────────────────────────
export async function playSound(name) {
  // Haptic toujours actif (indépendant du mode muet)
  try { await HAPTICS[name]?.(); } catch {}

  if (_muted) return;

  try {
    const source = USE_LOCAL
      ? LOCAL_SOUNDS[name]
      : { uri: REMOTE_SOUNDS[name] };

    if (!source) return;

    if (!cache[name]) {
      const { sound } = await Audio.Sound.createAsync(source, {
        volume: VOLUMES[name] ?? 0.7,
      });
      cache[name] = sound;
    }
    await cache[name].replayAsync();
  } catch {}
}

// ─────────────────────────────────────────────
// MUSIQUE D'AMBIANCE (looping)
// Active après avoir déposé assets/sounds/ambient.mp3
// et décommenté les lignes ci-dessous
// ─────────────────────────────────────────────
export async function startBackgroundMusic() {
  if (_muted || _backgroundMusic) return;
  try {
    // const { sound } = await Audio.Sound.createAsync(
    //   require("../assets/sounds/ambient.mp3"),
    //   { isLooping: true, volume: 0.12 }
    // );
    // await sound.playAsync();
    // _backgroundMusic = sound;
  } catch {}
}

export async function stopBackgroundMusic() {
  if (!_backgroundMusic) return;
  try {
    await _backgroundMusic.stopAsync();
    await _backgroundMusic.unloadAsync();
    _backgroundMusic = null;
  } catch {}
}

// ─────────────────────────────────────────────
// NETTOYAGE
// ─────────────────────────────────────────────
export async function unloadSounds() {
  await stopBackgroundMusic();
  for (const sound of Object.values(cache)) {
    try { await sound.unloadAsync(); } catch {}
  }
}
