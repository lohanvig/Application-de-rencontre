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
} from "react-native";
import API from "../api/api";
import * as Notifications from "expo-notifications";
import { useWS } from "../context/WebSocketContext";

export default function ChatScreen({ route, navigation }) {
  const { matchId, user, currentUserId } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const flatListRef = useRef();

  const { subscribe, markAsRead, clearActiveMatch } = useWS();

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Abonnement WS via le context partagé (pas de 2e connexion)
  useEffect(() => {
    markAsRead(matchId);

    const unsubscribe = subscribe((newMessage) => {
      if (newMessage.type !== "new_message") return;

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
      } else if (newMessage.sender_id !== currentUserId) {
        // Message pour un autre chat : notification locale
        Notifications.scheduleNotificationAsync({
          content: {
            title: "💬 Nouveau message",
            body: newMessage.content,
            data: { matchId: newMessage.match_id },
          },
          trigger: null,
        });
      }
    });

    return () => {
      clearActiveMatch();
      unsubscribe();
    };
  }, []);

  // Chargement initial + header + listener notif
  useEffect(() => {
    loadMessages();

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
          <Text style={styles.headerName}>{user.username}</Text>
        </View>
      ),
      headerTitleAlign: "left",
    });

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
            console.log("Erreur récupération user depuis notif:", err);
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

  const sendMessage = async () => {
    if (!text.trim()) return;

    const messageToSend = text;
    setText("");

    // Affichage immédiat (message temporaire)
    setMessages((prev) => [
      ...prev,
      { content: messageToSend, sender_id: currentUserId, match_id: matchId, local: true },
    ]);
    scrollToBottom();

    try {
      // Le backend sauvegarde et diffuse via WS aux deux utilisateurs
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
  message: { marginVertical: 4, padding: 12, borderRadius: 20, maxWidth: "75%" },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#DCF8C6" },
  otherMessage: { alignSelf: "flex-start", backgroundColor: "#fff" },
  messageText: { fontSize: 16 },
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
});
