import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import API from "../api/api";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../styles/theme.js";

export default function LoginScreen({ navigation }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {

    const response = await API.post("/login", {
      email,
      password
    });

    navigation.navigate("Home", {
      userId: response.data.user_id
    });
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>❤️ MatchApp</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        onChangeText={setPassword}
      />

      <PrimaryButton title="Login" onPress={login} />

      <Text
        style={styles.link}
        onPress={() => navigation.navigate("Register")}
      >
        Create account
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 25
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 40,
    textAlign: "center",
    color: colors.primary
  },

  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border
  },

  link: {
    marginTop: 15,
    textAlign: "center",
    color: colors.primary
  }
});