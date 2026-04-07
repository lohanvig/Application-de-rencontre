import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import API from "../api/api";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../styles/theme.js";

export default function LoginScreen({ navigation }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {

      const response = await API.post("/user", {
        username: email.split("@")[0], // simple username
        email: email,
        password: password,
        age: 25,
        bio: "Hello 👋"
      });

      const userId = response.data.user_id;

      navigation.navigate("Main", { userId });

    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Login failed");
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>❤️ MatchApp</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        onChangeText={setEmail}
        value={email}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        onChangeText={setPassword}
        value={password}
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