import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWS } from "../context/WebSocketContext";

// WebRTC — fonctionne avec un dev build (pas Expo Go)
let RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, RTCView;
try {
  const webrtc = require("react-native-webrtc");
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  mediaDevices = webrtc.mediaDevices;
  RTCView = webrtc.RTCView;
} catch (_) {}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function CallScreen({ route, navigation }) {
  const {
    isInitiator,
    isVideo,
    recipientId,
    recipientName,
    recipientPhoto,
    sdpOffer,
    currentUserId,
  } = route.params;

  const { sendWS, subscribe } = useWS();

  const [status, setStatus] = useState(isInitiator ? "En attente..." : "Connexion...");
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [connected, setConnected] = useState(false);
  const [localStreamURL, setLocalStreamURL] = useState(null);
  const [remoteStreamURL, setRemoteStreamURL] = useState(null);

  const pc = useRef(null);
  const localStream = useRef(null);
  const timerRef = useRef(null);
  const webrtcAvailable = !!RTCPeerConnection;

  useEffect(() => {
    setupCall();

    const unsubscribe = subscribe(async (msg) => {
      if (msg.sender_id !== recipientId && msg.sender_id !== currentUserId) return;

      if (msg.type === "call_answer" && pc.current) {
        await pc.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        onConnected();
      }
      if (msg.type === "call_ice_candidate" && pc.current) {
        try {
          await pc.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch (e) {}
      }
      if (msg.type === "call_reject") {
        setStatus("Appel refusé");
        setTimeout(() => navigation.goBack(), 1500);
      }
      if (msg.type === "call_end") {
        endCall(false);
      }
    });

    return () => {
      unsubscribe();
      cleanup();
    };
  }, []);

  const setupCall = async () => {
    if (!webrtcAvailable) {
      setStatus("WebRTC non disponible en Expo Go");
      if (isInitiator) {
        sendWS({
          type: "call_offer",
          recipient_id: recipientId,
          is_video: isVideo,
          caller_name: route.params.currentUserName,
          caller_photo: route.params.currentUserPhoto,
          sdp: null,
        });
      }
      return;
    }

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
          ? { facingMode: "user", width: 640, height: 480 }
          : false,
      });
      localStream.current = stream;

      if (isVideo) {
        setLocalStreamURL(stream.toURL());
      }

      const peerConnection = new RTCPeerConnection(ICE_SERVERS);
      pc.current = peerConnection;

      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStreamURL(event.streams[0].toURL());
        }
      };

      peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          sendWS({
            type: "call_ice_candidate",
            recipient_id: recipientId,
            candidate: candidate.toJSON(),
          });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") onConnected();
        if (["disconnected", "failed", "closed"].includes(peerConnection.connectionState)) {
          endCall(false);
        }
      };

      if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendWS({
          type: "call_offer",
          recipient_id: recipientId,
          is_video: isVideo,
          caller_name: route.params.currentUserName,
          caller_photo: route.params.currentUserPhoto,
          sdp: offer,
        });
        setStatus("En attente...");
      } else {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdpOffer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendWS({
          type: "call_answer",
          recipient_id: recipientId,
          sdp: answer,
        });
      }
    } catch (e) {
      console.log("WebRTC error:", e);
      setStatus("Erreur media");
    }
  };

  const onConnected = () => {
    setConnected(true);
    setStatus("En appel");
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStream.current?.getTracks().forEach((t) => t.stop());
    pc.current?.close();
  };

  const endCall = (notify = true) => {
    if (notify) sendWS({ type: "call_end", recipient_id: recipientId });
    cleanup();
    navigation.goBack();
  };

  const toggleMute = () => {
    localStream.current?.getAudioTracks().forEach((t) => {
      t.enabled = muted;
    });
    setMuted((m) => !m);
  };

  const toggleCamera = () => {
    localStream.current?.getVideoTracks().forEach((t) => {
      t.enabled = !cameraOn;
    });
    setCameraOn((c) => !c);
  };

  const toggleSpeaker = () => setSpeaker((s) => !s);

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ─── AUDIO CALL UI ───────────────────────────────────────────────────────────
  if (!isVideo) {
    return (
      <View style={styles.audioContainer}>
        <View style={styles.avatarWrapper}>
          {recipientPhoto ? (
            <Image source={{ uri: recipientPhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>
                {(recipientName || "?")[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{recipientName}</Text>
        <Text style={styles.status}>{connected ? formatDuration(duration) : status}</Text>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, muted && styles.controlBtnActive]}
            onPress={toggleMute}
          >
            <Ionicons name={muted ? "mic-off" : "mic"} size={26} color={muted ? "#FF4458" : "#fff"} />
            <Text style={styles.controlLabel}>{muted ? "Muet" : "Micro"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.endBtn} onPress={() => endCall(true)}>
            <Ionicons name="call" size={34} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, speaker && styles.controlBtnActive]}
            onPress={toggleSpeaker}
          >
            <Ionicons name={speaker ? "volume-high" : "volume-medium"} size={26} color={speaker ? "#4CD964" : "#fff"} />
            <Text style={styles.controlLabel}>HP</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── VIDEO CALL UI ────────────────────────────────────────────────────────────
  return (
    <View style={styles.videoContainer}>
      <StatusBar hidden />

      {/* Remote video — full screen */}
      {remoteStreamURL && RTCView ? (
        <RTCView
          streamURL={remoteStreamURL}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
          mirror={false}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.videoPlaceholder]}>
          {recipientPhoto ? (
            <Image source={{ uri: recipientPhoto }} style={styles.avatarLarge} />
          ) : (
            <View style={[styles.avatarLarge, styles.avatarFallback]}>
              <Text style={styles.avatarInitialLarge}>
                {(recipientName || "?")[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Local video — small corner */}
      {localStreamURL && RTCView && cameraOn && (
        <RTCView
          streamURL={localStreamURL}
          style={styles.localVideo}
          objectFit="cover"
          mirror
          zOrder={1}
        />
      )}

      {/* Top bar */}
      <View style={styles.videoTopBar}>
        <Text style={styles.videoName}>{recipientName}</Text>
        <Text style={styles.videoStatus}>{connected ? formatDuration(duration) : status}</Text>
      </View>

      {/* Controls overlay */}
      <View style={styles.videoControls}>
        <TouchableOpacity
          style={[styles.videoBtn, muted && styles.videoBtnActive]}
          onPress={toggleMute}
        >
          <Ionicons name={muted ? "mic-off" : "mic"} size={24} color="#fff" />
          <Text style={styles.videoBtnLabel}>{muted ? "Muet" : "Micro"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endBtnVideo} onPress={() => endCall(true)}>
          <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.videoBtn, !cameraOn && styles.videoBtnActive]}
          onPress={toggleCamera}
        >
          <Ionicons name={cameraOn ? "videocam" : "videocam-off"} size={24} color="#fff" />
          <Text style={styles.videoBtnLabel}>{cameraOn ? "Caméra" : "Caméra off"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.videoBtn, speaker && styles.videoBtnActive]}
          onPress={toggleSpeaker}
        >
          <Ionicons name={speaker ? "volume-high" : "volume-medium"} size={24} color="#fff" />
          <Text style={styles.videoBtnLabel}>HP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Audio ───────────────────────────────────────────────────────────────────
  audioContainer: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },

  avatarWrapper: {
    marginBottom: 24,
    shadowColor: "#fff",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },

  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },

  avatarFallback: {
    backgroundColor: "#FF4458",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: {
    fontSize: 52,
    fontWeight: "700",
    color: "#fff",
  },

  name: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 10,
  },

  status: {
    fontSize: 16,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 80,
    letterSpacing: 0.5,
  },

  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
  },

  controlBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  controlBtnActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  controlLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    marginTop: 4,
    position: "absolute",
    bottom: -20,
    alignSelf: "center",
  },

  endBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#FF3B30",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  // ─── Video ───────────────────────────────────────────────────────────────────
  videoContainer: {
    flex: 1,
    backgroundColor: "#000",
  },

  videoPlaceholder: {
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarLarge: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },

  avatarInitialLarge: {
    fontSize: 64,
    fontWeight: "700",
    color: "#fff",
  },

  localVideo: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    zIndex: 10,
    elevation: 10,
  },

  videoTopBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 20,
    zIndex: 10,
  },

  videoName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  videoStatus: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  videoControls: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 20,
  },

  videoBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  videoBtnActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  videoBtnLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    marginTop: 3,
    position: "absolute",
    bottom: -18,
    alignSelf: "center",
    width: 70,
    textAlign: "center",
  },

  endBtnVideo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#FF3B30",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
