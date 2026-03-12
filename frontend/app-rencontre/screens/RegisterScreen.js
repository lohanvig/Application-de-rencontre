import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from "react-native";
import API from "../api/api";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../styles/theme.js";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";

export default function RegisterScreen({ navigation }) {

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState(null);

  const register = async () => {

    if (!username || !email || !password) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    try {

      // 1️⃣ créer utilisateur
      const response = await API.post("/user", {
        username: username,
        email: email,
        password: password,
        age: parseInt(age) || 21,
        bio: bio || "Hello 👋"
      });

      const userId = response.data.user_id;

      // 2️⃣ upload photo si image sélectionnée
      if (image) {

        const formData = new FormData();

        formData.append("file", {
          uri: image,
          name: "profile.jpg",
          type: "image/jpeg"
        });

        await API.post(`/user/${userId}/photo`, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });

      }

      // 3️⃣ aller sur Home
      navigation.navigate("Home", {
        userId: userId
      });

    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Registration failed");
    }
  };

  const pickImage = async () => {

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }

  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <Text style={styles.title}>Create Account</Text>

      <TextInput
        placeholder="Username"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        placeholder="Age"
        keyboardType="numeric"
        style={styles.input}
        value={age}
        onChangeText={setAge}
      />

      <TextInput
        placeholder="Bio"
        style={[styles.input, styles.bio]}
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <PrimaryButton
        title="Choose profile photo"
        onPress={pickImage}
      />
      {image && (
        <Image
          source={{ uri: image }}
          style={styles.preview}
        />
      )}

      <PrimaryButton title="Register" onPress={register} />

      <Text
        style={styles.link}
        onPress={() => navigation.navigate("Login")}
      >
        Already have an account? Login
      </Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 25
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 30,
    textAlign: "center",
    color: colors.primary
  },

  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16
  },

  bio: {
    height: 100,
    textAlignVertical: "top"
  },

  link: {
    marginTop: 20,
    textAlign: "center",
    color: colors.primary,
    fontWeight: "500"
  },

  preview: {
  width: 120,
  height: 120,
  borderRadius: 60,
  alignSelf: "center",
  marginVertical: 20
},

});