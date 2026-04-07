import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from "react-native";
import API from "../api/api";

export default function ChatScreen({ route }) {

  const { matchId, user } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const flatListRef = useRef();

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const res = await API.get(`/messages/${matchId}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.log(err);
    }
  };

  const sendMessage = async () => {

    if (!text.trim()) return;

    const newMessage = {
      content: text,
      sender_id: userId
    };

    setMessages((prev) => [...prev, newMessage]);
    setText("");

    try {
        await API.post("/messages", {
        match_id: matchId,
        sender_id: userId,
        content: text
        });
    } catch (err) {
      console.log(err);
    }

  };

  const renderItem = ({ item }) => {

    const isMe = item.sender_id === userId;

    return (
      <View style={[
        styles.message,
        isMe ? styles.myMessage : styles.otherMessage
      ]}>
        <Text style={styles.messageText}>{item.content}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        onContentSizeChange={() =>
          flatListRef.current.scrollToEnd({ animated: true })
        }
      />

      <View style={styles.inputContainer}>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Écris un message..."
        />

        <TouchableOpacity onPress={sendMessage}>
          <Text style={styles.send}>Envoyer</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#fff"
  },

  message: {
    margin: 10,
    padding: 10,
    borderRadius: 10,
    maxWidth: "70%"
  },

  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6"
  },

  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#eee"
  },

  messageText: {
    fontSize: 16
  },

  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#eee"
  },

  input: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    borderRadius: 20,
    paddingHorizontal: 15
  },

  send: {
    marginLeft: 10,
    alignSelf: "center",
    color: "#007AFF",
    fontWeight: "bold"
  }

});