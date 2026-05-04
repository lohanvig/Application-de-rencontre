import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../api/api";
import * as Notifications from "expo-notifications";
import { useWS } from "../context/WebSocketContext";
import { playSound } from "../utils/sounds";

export default function ChatScreen({ route, navigation }) {
  const { matchId, user, currentUserId } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [currentUserInfo, setCurrentUserInfo] = useState(null);

  const flatListRef = useRef();
  const typingClearRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  const { subscribe, sendWS, markAsRead, clearActiveMatch } = useWS();

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Abonnement WS + accusé de lecture initial
  useEffect(() => {
    markAsRead(matchId);
    sendWS({ type: "read", match_id: matchId, recipient_id: user.id });

    const unsubscribe = subscribe((msg) => {
      if (msg.match_id !== matchId) {
        // Message pour un autre chat : notification locale
        if (msg.type === "new_message" && msg.sender_id !== currentUserId) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: "💬 Nouveau message",
              body: msg.content,
              data: { matchId: msg.match_id },
            },
            trigger: null,
          });
        }
        return;
      }

      if (msg.type === "new_message") {
        setMessages((prev) => {
          const exists = prev.some(
            (m) => m.content === msg.content && m.sender_id === msg.sender_id
          );
          if (exists) return prev;
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

      if (msg.type === "messages_read") {
        setIsRead(true);
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

  const handleCall = () => {
    navigation.navigate("CallScreen", {
      isInitiator: true,
      recipientId: user.id,
      recipientName: user.username,
      recipientPhoto: user.photo_url,
      currentUserId,
      currentUserName: currentUserInfo?.username,
      currentUserPhoto: currentUserInfo?.photo_url,
    });
  };

  const handleBlock = () => {
    Alert.alert(
      "Options",
      "",
      [
        {
          text: "Bloquer et supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await API.post("/block", {
                user_id: currentUserId,
                blocked_user_id: user.id,
                match_id: matchId,
              });
              navigation.goBack();
            } catch (err) {
              console.log("BLOCK ERROR:", err);
            }
          },
        },
        { text: "Annuler", style: "cancel" },
      ]
    );
  };

  // Header + listener notification
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
              <Text style={styles.headerAvatarInitial}>
                {(user.username || "?")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{user.username}</Text>
            {isOtherTyping && (
              <Text style={styles.headerTyping}>en train d'écrire...</Text>
            )}
          </View>
        </View>
      ),
      headerTitleAlign: "left",
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={handleCall} style={{ marginRight: 16 }}>
            <Ionicons name="call" size={22} color="#FF4458" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBlock} style={{ marginRight: 12 }}>
            <Text style={{ fontSize: 22, color: "#888" }}>⋮</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [isOtherTyping, currentUserInfo]);

  // Listener notification
  useEffect(() => {
    const notifSub = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data;
        if (data?.matchId && data.matchId !== matchId && data.senderId) {
          try {
            const userRes = await API.get(`/user/${data.senderId}`);
            navigation.navigate("ChatScreen", {
              matchId: data.matchId,
              currentUserId,
              user: userRes.data,
            });
          } catch (err) {
            console.log("Erreur notif:", err);
          }
        }
      }
    );
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
    // Envoie l'événement "typing" max 1 fois par seconde
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
      await API.post("/messages", {
        match_id: matchId,
        sender_id: currentUserId,
        content: messageToSend,
      });
    } catch (err) {
      console.log("SEND ERROR:", err);
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender_id === currentUserId;
    return (
      <View style={[styles.messageRow, isMe ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.message, isMe ? styles.myMessage : styles.otherMessage]}>
          <Text style={styles.messageText}>{item.content}</Text>
        </View>
        {isMe && (
          <Text style={[styles.checkmark, isRead && styles.checkmarkRead]}>
            {isRead ? "✓✓" : "✓"}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 80}
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

        <View style={styles.inputWrapper}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },

  messageRow: { flexDirection: "row", alignItems: "flex-end", marginVertical: 3 },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },

  message: { padding: 12, borderRadius: 20, maxWidth: "72%" },
  myMessage: { backgroundColor: "#DCF8C6" },
  otherMessage: { backgroundColor: "#fff" },
  messageText: { fontSize: 16 },

  checkmark: { fontSize: 11, color: "#aaa", marginLeft: 4, marginBottom: 2 },
  checkmarkRead: { color: "#34B7F1" },

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
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    alignItems: "flex-end",
  },
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

  headerTitle: { flexDirection: "row", alignItems: "center" },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerAvatarFallback: {
    backgroundColor: "#FFD6D6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarInitial: { fontSize: 16, fontWeight: "700", color: "#FF4458" },
  headerName: { fontSize: 17, fontWeight: "700" },
  headerTyping: { fontSize: 11, color: "#FF4458", marginTop: 1 },
});
