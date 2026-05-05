import { useEffect, useState, useRef } from "react";
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
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import API from "../api/api";
import * as Notifications from "expo-notifications";
import { useWS } from "../context/WebSocketContext";
import { playSound } from "../utils/sounds";
import { colors } from "../styles/theme";

const EMOJIS = ["❤️", "😂", "😮", "👍", "🔥", "😢"];
const RATES = [1.0, 1.5, 2.0];

function AudioPlayer({ url, onLongPress, isMe }) {
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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: true,
      });
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
    <Pressable onLongPress={onLongPress} delayLongPress={400} style={styles.audioBubble}>
      <Pressable onPress={toggle} style={styles.audioPlayBtn}>
        <Ionicons
          name={playing ? "pause-circle" : "play-circle"}
          size={40}
          color={isMe ? "rgba(255,255,255,0.9)" : colors.primary}
        />
      </Pressable>

      <View style={styles.audioBody}>
        <View style={styles.audioTrack}>
          <View style={[styles.audioFill, { flex: Math.max(progress, 0.01) }]} />
          <View style={[styles.audioEmpty, { flex: Math.max(1 - progress, 0) }]} />
        </View>
        <View style={styles.audioMeta}>
          <Text style={styles.audioTime}>
            {playing ? fmt(position) : fmt(duration)}
          </Text>
          <TouchableOpacity
            onPress={cycleRate}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.rateBtn}
          >
            <Text style={styles.audioRate}>{rate === 1.0 ? "1×" : `${rate}×`}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
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
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingTimerRef = useRef(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

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
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
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

  useEffect(() => { loadMessages(); }, []);

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: colors.surface,
      },
      headerShadowVisible: true,
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
            {isOtherTyping && <Text style={styles.headerTyping}>en train d'écrire…</Text>}
          </View>
        </View>
      ),
      headerTitleAlign: "left",
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <TouchableOpacity onPress={() => handleCall(true)} style={styles.headerBtn}>
            <Ionicons name="videocam-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleCall(false)} style={styles.headerBtn}>
            <Ionicons name="call-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBlock} style={styles.headerBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
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
      setRecordingSeconds(0);

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      console.log("record error:", e);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingSeconds(0);
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
    const optimistic = {
      content: "🎤 Message vocal",
      sender_id: currentUserId,
      match_id: matchId,
      content_type: "audio",
      local: true,
    };
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
          <View style={[styles.audioBubbleWrapper, isMe ? styles.audioBubbleMe : styles.otherMessage]}>
            <AudioPlayer url={item.audio_url} onLongPress={() => openPicker(item.id)} isMe={isMe} />
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => openPicker(item.id)}
            delayLongPress={400}
          >
            <View style={[styles.message, isMe ? styles.myMessage : styles.otherMessage]}>
              <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                {item.content}
              </Text>
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
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
        />

        {isOtherTyping && (
          <View style={styles.typingBubble}>
            <Text style={styles.typingDots}>● ● ●</Text>
          </View>
        )}

        <View style={[styles.inputWrapper, { paddingBottom: insets.bottom + 8 }]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable
              onPressIn={startRecording}
              onPressOut={stopRecording}
              style={[styles.micBtn, isRecording && styles.micBtnRecording]}
            >
              <Ionicons name="mic" size={20} color={isRecording ? "#fff" : colors.textTertiary} />
            </Pressable>
          </Animated.View>

          {isRecording ? (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>
                {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")}
              </Text>
              <Text style={styles.recordingHint}>Relâche pour envoyer</Text>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={handleChangeText}
                placeholder="Écris un message…"
                placeholderTextColor={colors.textTertiary}
                multiline
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                onPress={sendMessage}
                style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Emoji picker */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
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
  container: { flex: 1, backgroundColor: colors.background },

  listContent: { padding: 14 },

  messageWrapper: {
    marginVertical: 3,
    maxWidth: "80%",
  },
  wrapperRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  wrapperLeft: { alignSelf: "flex-start", alignItems: "flex-start" },

  message: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },

  myMessage: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },

  otherMessage: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },

  messageTextMe: {
    color: "#fff",
  },

  checkmark: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
    marginRight: 2,
  },

  checkmarkRead: {
    color: "#34B7F1",
  },

  reactionBadge: {
    position: "absolute",
    bottom: -10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  reactionRight: { right: 6 },
  reactionLeft: { left: 6 },
  reactionEmoji: { fontSize: 14 },

  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 14,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  typingDots: {
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 3,
  },

  inputWrapper: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "flex-end",
    gap: 8,
  },

  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  micBtnRecording: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  recordingIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    minWidth: 36,
  },
  recordingHint: {
    fontSize: 13,
    color: colors.textTertiary,
    fontStyle: "italic",
  },

  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  sendButtonDisabled: {
    backgroundColor: colors.textTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },

  audioBubbleWrapper: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 18,
  },

  audioBubbleMe: {
    backgroundColor: colors.primaryLight,
    borderBottomRightRadius: 4,
  },

  audioBubble: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 200,
    gap: 10,
  },

  audioPlayBtn: {
    justifyContent: "center",
    alignItems: "center",
  },

  audioBody: {
    flex: 1,
    gap: 5,
  },

  audioTrack: {
    flexDirection: "row",
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.1)",
  },

  audioFill: {
    backgroundColor: colors.primary,
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

  audioTime: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },

  rateBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  audioRate: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },

  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  pickerBox: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    flexDirection: "row",
    padding: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },

  emojiBtn: { padding: 6 },
  emojiText: { fontSize: 30 },

  headerTitle: { flexDirection: "row", alignItems: "center" },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  headerAvatarFallback: {
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarInitial: { fontSize: 15, fontWeight: "700", color: colors.primary },
  headerName: { fontSize: 16, fontWeight: "700", color: colors.text },
  headerTyping: { fontSize: 11, color: colors.primary, marginTop: 1 },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
  },
});
