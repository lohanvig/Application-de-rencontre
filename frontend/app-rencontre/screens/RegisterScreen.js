import React, { useState } from "react";
import { View, TextInput, Button } from "react-native";
import API from "../api/api";

export default function RegisterScreen({ navigation }) {

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = async () => {

    await API.post("/users", {
      username,
      email,
      password
    });

    navigation.navigate("Login");
  };

  return (
    <View>

      <TextInput placeholder="Username" onChangeText={setUsername} />
      <TextInput placeholder="Email" onChangeText={setEmail} />
      <TextInput placeholder="Password" secureTextEntry onChangeText={setPassword} />

      <Button title="Register" onPress={register} />

    </View>
  );
}