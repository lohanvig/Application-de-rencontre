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
  Image
} from "react-native";
import API from "../api/api";
import useWebSocket from "../hooks/useWebSocket";

export default function ChatScreen({ route, navigation }) {
  const { matchId, user, currentUserId } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const flatListRef = useRef();

  // 🔹 Fonction pour charger les messages existants
  const loadMessages = async () => {
    try {
      const res = await API.get(`/messages/${matchId}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.log("LOAD MESSAGES ERROR:", err);
    }
  };

  // 🔹 Callback quand un message arrive via WebSocket
  const handleNewMessage = (newMessage) => {
    // On ajoute seulement si le message correspond au match courant
    if (newMessage.match_id === matchId) {
      setMessages((prev) => [...prev, newMessage]);
      // Scroll automatique
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // 🔹 Hook WebSocket
  useWebSocket(currentUserId, handleNewMessage);

  useEffect(() => {
    loadMessages();

    // Header avec photo et nom de l’autre utilisateur
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Image source={{ uri: user.photo_url }} style={styles.headerAvatar} />
          <Text style={styles.headerName}>{user.username}</Text>
        </View>
      ),
      headerTitleAlign: "left"
    });
  }, []);

  const sendMessage = async () => {
    if (!text.trim()) return;

    const newMessage = { content: text, sender_id: currentUserId, match_id: matchId };
    setMessages((prev) => [...prev, newMessage]);
    setText("");

    try {
      await API.post("/messages", {
        match_id: matchId,
        sender_id: currentUserId,
        content: text
      });
    } catch (err) {
      console.log("SEND MESSAGE ERROR:", err);
    }

    // scroll automatique
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
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
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 10, paddingBottom: 10 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          style={{ flex: 1 }}
        />

        {/* Zone d’écriture */}
        <View style={[styles.inputWrapper, { marginBottom: Platform.OS === "android" ? 20 : 10 }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Écris un message..."
            multiline
            placeholderTextColor="#999"
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

  // Messages
  message: {
    marginVertical: 4,
    padding: 12,
    borderRadius: 20,
    maxWidth: "70%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1
  },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#DCF8C6" },
  otherMessage: { alignSelf: "flex-start", backgroundColor: "#fff" },
  messageText: { fontSize: 16, lineHeight: 22 },

  // Zone d’écriture
  inputWrapper: {
    flexDirection: "row",
    padding: 8,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    alignItems: "flex-end",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -1 },
    shadowRadius: 2
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: "#f1f1f1",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#007AFF",
    borderRadius: 25,
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center"
  },
  sendText: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  // Header
  headerTitle: { flexDirection: "row", alignItems: "center" },
  headerAvatar: { width: 35, height: 35, borderRadius: 17.5, marginRight: 10 },
  headerName: { fontSize: 18, fontWeight: "bold" }
});