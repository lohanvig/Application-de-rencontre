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
  AppState
} from "react-native";
import API from "../api/api";
import useWebSocket from "../hooks/useWebSocket";
import * as Notifications from "expo-notifications";

export default function ChatScreen({ route, navigation }) {
  const { matchId, user, currentUserId } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const flatListRef = useRef();
  const wsRef = useWebSocket(currentUserId, handleNewMessage);
  const appState = useRef(AppState.currentState);

  // 🔹 LOAD INITIAL MESSAGES
  const loadMessages = async () => {
    try {
      const res = await API.get(`/messages/${matchId}`);
      setMessages(res.data.messages || []);
      scrollToBottom();
    } catch (err) {
      console.log("LOAD ERROR:", err);
    }
  };

  // 🔹 NEW MESSAGE HANDLER
  function handleNewMessage(newMessage) {
    // Message pour ce chat
    if (newMessage.match_id === matchId) {
      setMessages((prev) => {
        const exists = prev.some(
          (msg) =>
            msg.content === newMessage.content &&
            msg.sender_id === newMessage.sender_id
        );
        if (exists) return prev;
        return [...prev, newMessage];
      });
      scrollToBottom();
    } else {
      // Message pour un autre match => notification
      if (newMessage.sender_id !== currentUserId) {
        sendLocalNotification(
          "💬 Nouveau message",
          newMessage.content,
          newMessage.match_id
        );
      }
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // 🔹 SEND MESSAGE
  const sendMessage = async () => {
    if (!text.trim()) return;

    const messageToSend = text;
    setText("");

    const tempMessage = {
      content: messageToSend,
      sender_id: currentUserId,
      match_id: matchId,
      local: true
    };
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    try {
      await API.post("/messages", {
        match_id: matchId,
        sender_id: currentUserId,
        content: messageToSend
      });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          content: messageToSend,
          sender_id: currentUserId,
          match_id: matchId
        }));
      }

    } catch (err) {
      console.log("SEND ERROR:", err);
    }
  };

  // 🔹 LOCAL NOTIFICATION
  const sendLocalNotification = async (title, body, match_id) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { matchId: match_id },
      },
      trigger: null,
    });
  };

  // 🔹 HANDLE APP STATE & NOTIF CLICK
  useEffect(() => {
    loadMessages();

    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Image source={{ uri: user.photo_url }} style={styles.headerAvatar} />
          <Text style={styles.headerName}>{user.username}</Text>
        </View>
      ),
      headerTitleAlign: "left",
    });

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(async response => {
      const data = response.notification.request.content.data;
      const matchIdFromNotif = data.matchId;
      if (matchIdFromNotif && matchIdFromNotif !== matchId && data.senderId) {
        try {
          const userRes = await API.get(`/user/${data.senderId}`);
          navigation.navigate("ChatScreen", {
            matchId: matchIdFromNotif,
            currentUserId,
            user: userRes.data
          });
        } catch (err) {
          console.log("Erreur récupération user depuis notif:", err);
        }
      }
    });

    return () => {
      subscription.remove();
      notificationSubscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState) => {
    appState.current = nextAppState;
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender_id === currentUserId;
    return (
      <View style={[styles.message, isMe ? styles.myMessage : styles.otherMessage]}>
        <Text style={styles.messageText}>{item.content}</Text>
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
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
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
  message: { marginVertical: 4, padding: 12, borderRadius: 20, maxWidth: "70%" },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#DCF8C6" },
  otherMessage: { alignSelf: "flex-start", backgroundColor: "#fff" },
  messageText: { fontSize: 16 },
  inputWrapper: { flexDirection: "row", padding: 8, borderTopWidth: 1, borderColor: "#eee", backgroundColor: "#fff", alignItems: "flex-end" },
  input: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: "#f1f1f1", borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16 },
  sendButton: { marginLeft: 8, backgroundColor: "#007AFF", borderRadius: 25, width: 45, height: 45, justifyContent: "center", alignItems: "center" },
  sendText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  headerTitle: { flexDirection: "row", alignItems: "center" },
  headerAvatar: { width: 35, height: 35, borderRadius: 17.5, marginRight: 10 },
  headerName: { fontSize: 18, fontWeight: "bold" },
});