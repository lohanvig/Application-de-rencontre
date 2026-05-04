import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import API from "../api/api";
import { colors } from "../styles/theme.js";
import * as ImagePicker from "expo-image-picker";

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Champs manquants", "Prénom, email et mot de passe sont obligatoires.");
      return false;
    }
    if (!email.includes("@")) {
      Alert.alert("Email invalide", "Merci d'entrer un email valide.");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Mot de passe trop court", "Le mot de passe doit contenir au moins 6 caractères.");
      return false;
    }
    if (age) {
      const parsedAge = parseInt(age);
      if (isNaN(parsedAge) || parsedAge < 18 || parsedAge > 99) {
        Alert.alert("Âge invalide", "Tu dois avoir au moins 18 ans.");
        return false;
      }
    }
    return true;
  };

  const register = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await API.post("/user", {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        age: parseInt(age) || 18,
        bio: bio.trim() || "Salut ! 👋",
      });
      const userId = response.data.user_id;

      if (image) {
        const formData = new FormData();
        formData.append("file", {
          uri: image,
          name: "profile.jpg",
          type: "image/jpeg",
        });
        await API.post(`/user/${userId}/photo`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigation.navigate("Main", { userId });
    } catch (error) {
      console.log(error);
      Alert.alert("Erreur", "L'inscription a échoué. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Rejoins la communauté ❤️</Text>

        <TouchableOpacity onPress={pickImage} style={styles.photoPicker}>
          {image ? (
            <Image source={{ uri: image }} style={styles.preview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderIcon}>📷</Text>
              <Text style={styles.photoPlaceholderText}>Ajouter une photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          placeholder="Prénom *"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          maxLength={30}
          placeholderTextColor="#aaa"
        />

        <TextInput
          placeholder="Email *"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="#aaa"
        />

        <View style={styles.passwordWrapper}>
          <TextInput
            placeholder="Mot de passe * (min. 6 caractères)"
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity
            onPress={() => setShowPassword((p) => !p)}
            style={styles.eyeBtn}
          >
            <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁️"}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          placeholder="Âge (18+)"
          keyboardType="numeric"
          style={styles.input}
          value={age}
          onChangeText={setAge}
          maxLength={2}
          placeholderTextColor="#aaa"
        />

        <TextInput
          placeholder="Bio (optionnel)"
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={200}
          placeholderTextColor="#aaa"
        />
        <Text style={styles.charCount}>{bio.length}/200</Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={register}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 25,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
    color: colors.primary,
  },
  subtitle: {
    textAlign: "center",
    color: "#999",
    marginBottom: 28,
    fontSize: 15,
  },
  photoPicker: {
    alignSelf: "center",
    marginBottom: 24,
  },
  photoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholderIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  photoPlaceholderText: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
  },
  preview: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2.5,
    borderColor: colors.primary,
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
  },
  bioInput: {
    height: 90,
    textAlignVertical: "top",
    marginBottom: 4,
  },
  charCount: {
    fontSize: 11,
    color: "#aaa",
    textAlign: "right",
    marginBottom: 12,
  },
  passwordWrapper: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 12,
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
  eyeText: {
    fontSize: 18,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    textAlign: "center",
    color: colors.primary,
    fontWeight: "500",
    fontSize: 14,
  },
});
