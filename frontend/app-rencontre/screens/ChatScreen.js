import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import API from "../api/api";
import * as Notifications from "expo-notifications";
import { useWS } from "../context/WebSocketContext";
import { playSound } from "../utils/sounds";

const EMOJIS = ["❤️", "😂", "😮", "👍", "🔥", "😢"];

const RATES = [1.0, 1.5, 2.0];

function AudioPlayer({ url, onLongPress }) {
  const soundRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [rateIdx, setRateIdx] = useState(0);
  const rate = RATES[rateIdx];

  const fmt = (ms) => {
    const s = Math.floor((ms || 0) / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const toggle = async () => {
    try {
      if (playing) {
        await soundRef.current?.pauseAsync();
        setPlaying(false);
        return;
      }
      if (!soundRef.current) {
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false }
        );
        soundRef.current = sound;
        if (status.durationMillis) setDuration(status.durationMillis);
        sound.setOnPlaybackStatusUpdate((s) => {
          if (!s.isLoaded) return;
          setPosition(s.positionMillis || 0);
          if (s.durationMillis) setDuration(s.durationMillis);
          if (s.didJustFinish) {
            setPlaying(false);
            setPosition(0);
            soundRef.current = null;
          }
        });
        await sound.setRateAsync(rate, true);
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      await soundRef.current.playAsync();
      setPlaying(true);
    } catch (e) {
      console.log("playback error:", e);
    }
  };

  const cycleRate = async () => {
    const next = (rateIdx + 1) % RATES.length;
    setRateIdx(next);
    try {
      await soundRef.current?.setRateAsync(RATES[next], true);
    } catch (_) {}
  };

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.audioBubble}>
      <Pressable onPress={toggle} onLongPress={onLongPress} delayLongPress={400} style={styles.audioPlayBtn}>
        <Ionicons name={playing ? "pause-circle" : "play-circle"} size={36} color="#FF4458" />
      </Pressable>

      <View style={styles.audioBody}>
        <View style={styles.audioTrack}>
          <View style={[styles.audioFill, { flex: progress }]} />
          <View style={[styles.audioEmpty, { flex: 1 - progress }]} />
        </View>
        <View style={styles.audioMeta}>
          <Text style={styles.audioTime}>
            {playing ? fmt(position) : fmt(duration)}
          </Text>
          <TouchableOpacity onPress={cycleRate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.audioRate}>{rate === 1.0 ? "1×" : `${rate}×`}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen({ route, navigation }) {
  const { matchId, user, currentUserId } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMessageId, setPickerMessageId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const flatListRef = useRef();
  const typingClearRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const recordingRef = useRef(null);

  const { subscribe, sendWS, markAsRead, clearActiveMatch } = useWS();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  useEffect(() => {
    markAsRead(matchId);
    sendWS({ type: "read", match_id: matchId, recipient_id: user.id });

    const unsubscribe = subscribe((msg) => {
      if (msg.match_id !== matchId) {
        if (msg.type === "new_message" && msg.sender_id !== currentUserId) {
          Notifications.scheduleNotificationAsync({
            content: { title: "💬 Nouveau message", body: msg.content, data: { matchId: msg.match_id } },
            trigger: null,
          });
        }
        return;
      }

      if (msg.type === "new_message") {
        setMessages((prev) => {
          const exists = prev.some(
            (m) => m.content === msg.content && m.sender_id === msg.sender_id && !m.id
          );
          if (exists) {
            // assign server id to the optimistic message
            return prev.map((m) =>
              m.content === msg.content && m.sender_id === msg.sender_id && !m.id
                ? { ...m, id: msg.id, audio_url: msg.audio_url, content_type: msg.content_type }
                : m
            );
          }
          return [...prev, msg];
        });
        scrollToBottom();
        if (msg.sender_id !== currentUserId) {
          playSound("receive");
          sendWS({ type: "read", match_id: matchId, recipient_id: msg.sender_id });
        }
      }

      if (msg.type === "typing") {
        setIsOtherTyping(true);
        if (typingClearRef.current) clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(() => setIsOtherTyping(false), 2500);
      }

      if (msg.type === "messages_read") setIsRead(true);

      if (msg.type === "message_reaction" && msg.sender_id === user.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.message_id ? { ...m, reaction: msg.emoji } : m))
        );
      }
    });

    return () => {
      clearActiveMatch();
      unsubscribe();
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
    };
  }, []);

  useEffect(() => {
    API.get(`/user/${currentUserId}`)
      .then((res) => setCurrentUserInfo(res.data))
      .catch(() => {});
  }, []);

  const handleCall = (isVideo = false) => {
    navigation.navigate("CallScreen", {
      isInitiator: true,
      isVideo,
      recipientId: user.id,
      recipientName: user.username,
      recipientPhoto: user.photo_url,
      currentUserId,
      currentUserName: currentUserInfo?.username,
      currentUserPhoto: currentUserInfo?.photo_url,
    });
  };

  const handleBlock = () => {
    Alert.alert("Options", "", [
      {
        text: "Bloquer et supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await API.post("/block", { user_id: currentUserId, blocked_user_id: user.id, match_id: matchId });
            navigation.goBack();
          } catch (err) {
            console.log("BLOCK ERROR:", err);
          }
        },
      },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          {user.photo_url ? (
            <Image source={{ uri: user.photo_url }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
              <Text style={styles.headerAvatarInitial}>{(user.username || "?")[0].toUpperCase()}</Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{user.username}</Text>
            {isOtherTyping && <Text style={styles.headerTyping}>en train d'écrire...</Text>}
          </View>
        </View>
      ),
      headerTitleAlign: "left",
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => handleCall(true)} style={{ marginRight: 16 }}>
            <Ionicons name="videocam" size={24} color="#FF4458" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleCall(false)} style={{ marginRight: 16 }}>
            <Ionicons name="call" size={22} color="#FF4458" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBlock} style={{ marginRight: 12 }}>
            <Text style={{ fontSize: 22, color: "#888" }}>⋮</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [isOtherTyping, currentUserInfo]);

  useEffect(() => {
    const notifSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      if (data?.matchId && data.matchId !== matchId && data.senderId) {
        try {
          const userRes = await API.get(`/user/${data.senderId}`);
          navigation.navigate("ChatScreen", { matchId: data.matchId, currentUserId, user: userRes.data });
        } catch (err) {
          console.log("Erreur notif:", err);
        }
      }
    });
    return () => notifSub.remove();
  }, []);

  const loadMessages = async () => {
    try {
      const res = await API.get(`/messages/${matchId}`);
      setMessages(res.data.messages || []);
      scrollToBottom();
    } catch (err) {
      console.log("LOAD ERROR:", err);
    }
  };

  const handleChangeText = (value) => {
    setText(value);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1000) {
      lastTypingSentRef.current = now;
      sendWS({ type: "typing", match_id: matchId, recipient_id: user.id });
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    const messageToSend = text;
    setText("");
    playSound("send");
    setMessages((prev) => [
      ...prev,
      { content: messageToSend, sender_id: currentUserId, match_id: matchId, local: true },
    ]);
    scrollToBottom();
    try {
      await API.post("/messages", { match_id: matchId, sender_id: currentUserId, content: messageToSend });
    } catch (err) {
      console.log("SEND ERROR:", err);
    }
  };

  // ─── Voice recording ────────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      console.log("record error:", e);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (uri) await uploadAudio(uri);
    } catch (e) {
      console.log("stop record error:", e);
      recordingRef.current = null;
    }
  };

  const uploadAudio = async (uri) => {
    const optimistic = { content: "🎤 Message vocal", sender_id: currentUserId, match_id: matchId, content_type: "audio", local: true };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();
    const formData = new FormData();
    formData.append("file", { uri, name: "voice.m4a", type: "audio/m4a" });
    formData.append("match_id", matchId);
    formData.append("sender_id", currentUserId);
    try {
      await API.post("/messages/audio", formData);
    } catch (e) {
      console.log("audio upload error:", e);
    }
  };

  // ─── Reactions ──────────────────────────────────────────────────────────────

  const openPicker = (messageId) => {
    if (!messageId) return;
    setPickerMessageId(messageId);
    setPickerVisible(true);
  };

  const sendReaction = (emoji) => {
    setPickerVisible(false);
    if (!pickerMessageId) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === pickerMessageId ? { ...m, reaction: emoji } : m))
    );
    sendWS({ type: "message_reaction", recipient_id: user.id, message_id: pickerMessageId, emoji });
    setPickerMessageId(null);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const isLastFromMe = (item) => {
    const myMessages = messages.filter((m) => m.sender_id === currentUserId);
    return myMessages.length > 0 && myMessages[myMessages.length - 1] === item;
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender_id === currentUserId;
    const isAudio = item.content_type === "audio";
    const showStatus = isMe && isLastFromMe(item);

    return (
      <View style={[styles.messageWrapper, isMe ? styles.wrapperRight : styles.wrapperLeft]}>
        {isAudio && item.audio_url ? (
          <View style={[styles.message, styles.audioMessage, isMe ? styles.myMessage : styles.otherMessage]}>
            <AudioPlayer url={item.audio_url} onLongPress={() => openPicker(item.id)} />
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => openPicker(item.id)}
            delayLongPress={400}
          >
            <View style={[styles.message, isMe ? styles.myMessage : styles.otherMessage]}>
              <Text style={styles.messageText}>{item.content}</Text>
            </View>
          </TouchableOpacity>
        )}

        {item.reaction && (
          <View style={[styles.reactionBadge, isMe ? styles.reactionRight : styles.reactionLeft]}>
            <Text style={styles.reactionEmoji}>{item.reaction}</Text>
          </View>
        )}

        {showStatus && (
          <Text style={[styles.checkmark, isRead && styles.checkmarkRead]}>
            {isRead ? "✓✓ Lu" : "✓ Envoyé"}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 10 }}
          onContentSizeChange={scrollToBottom}
        />

        {isOtherTyping && (
          <View style={styles.typingBubble}>
            <Text style={styles.typingDots}>···</Text>
          </View>
        )}

        <View style={[styles.inputWrapper, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable
            onPressIn={startRecording}
            onPressOut={stopRecording}
            style={[styles.micBtn, isRecording && styles.micBtnActive]}
          >
            <Ionicons name="mic" size={22} color={isRecording ? "#FF4458" : "#888"} />
          </Pressable>

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleChangeText}
            placeholder="Écris un message..."
            placeholderTextColor="#999"
            multiline
            onSubmitEditing={sendMessage}
          />

          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Emoji picker modal */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.pickerBox}>
            {EMOJIS.map((e) => (
              <TouchableOpacity key={e} onPress={() => sendReaction(e)} style={styles.emojiBtn}>
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },

  messageWrapper: {
    marginVertical: 4,
    maxWidth: "82%",
  },
  wrapperRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  wrapperLeft: { alignSelf: "flex-start", alignItems: "flex-start" },

  message: { padding: 14, borderRadius: 20 },
  myMessage: { backgroundColor: "#DCF8C6" },
  otherMessage: { backgroundColor: "#fff", elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  messageText: { fontSize: 16, lineHeight: 22 },

  checkmark: { fontSize: 11, color: "#aaa", marginTop: 3, marginRight: 2 },
  checkmarkRead: { color: "#34B7F1" },

  reactionBadge: {
    position: "absolute",
    bottom: -10,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  reactionRight: { right: 8 },
  reactionLeft: { left: 8 },
  reactionEmoji: { fontSize: 15 },

  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 10,
    marginBottom: 4,
    elevation: 1,
  },
  typingDots: { fontSize: 22, color: "#aaa", letterSpacing: 2 },

  inputWrapper: {
    flexDirection: "row",
    padding: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    alignItems: "flex-end",
  },

  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    backgroundColor: "#f1f1f1",
  },
  micBtnActive: { backgroundColor: "#FFE5E8" },

  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: "#f1f1f1",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#FF4458",
    borderRadius: 25,
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  sendText: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  audioMessage: { paddingHorizontal: 8, paddingVertical: 8 },

  audioBubble: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 180,
    gap: 10,
  },
  audioPlayBtn: {
    justifyContent: "center",
    alignItems: "center",
  },
  audioBody: {
    flex: 1,
    gap: 4,
  },
  audioTrack: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  audioFill: {
    backgroundColor: "#FF4458",
    borderRadius: 2,
  },
  audioEmpty: {
    backgroundColor: "transparent",
  },
  audioMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  audioTime: { fontSize: 12, color: "#666" },
  audioRate: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF4458",
    backgroundColor: "rgba(255,68,88,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    flexDirection: "row",
    padding: 12,
    gap: 8,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  emojiBtn: { padding: 6 },
  emojiText: { fontSize: 28 },

  headerTitle: { flexDirection: "row", alignItems: "center" },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerAvatarFallback: { backgroundColor: "#FFD6D6", justifyContent: "center", alignItems: "center" },
  headerAvatarInitial: { fontSize: 16, fontWeight: "700", color: "#FF4458" },
  headerName: { fontSize: 17, fontWeight: "700" },
  headerTyping: { fontSize: 11, color: "#FF4458", marginTop: 1 },
});
