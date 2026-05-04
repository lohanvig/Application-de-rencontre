import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import API from "../api/api";
import { colors } from "../styles/theme.js";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef();

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Champs manquants", "Merci de remplir tous les champs.");
      return false;
    }
    if (!email.includes("@")) {
      Alert.alert("Email invalide", "Merci d'entrer un email valide.");
      return false;
    }
    return true;
  };

  const login = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await API.post("/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      const userId = response.data.user_id;
      navigation.navigate("Main", { userId });
    } catch (error) {
      Alert.alert("Connexion échouée", "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
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
        <Text style={styles.emoji}>❤️</Text>
        <Text style={styles.title}>MatchApp</Text>
        <Text style={styles.subtitle}>Retrouve ta moitié</Text>

        <TextInput
          placeholder="Email"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          value={email}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholderTextColor="#aaa"
        />

        <View style={styles.passwordWrapper}>
          <TextInput
            ref={passwordRef}
            placeholder="Mot de passe"
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
            onChangeText={setPassword}
            value={password}
            returnKeyType="done"
            onSubmitEditing={login}
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity
            onPress={() => setShowPassword((p) => !p)}
            style={styles.eyeBtn}
          >
            <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁️"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={login}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.link}>Pas encore de compte ? Créer un compte</Text>
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
    padding: 28,
  },
  emoji: {
    textAlign: "center",
    fontSize: 52,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
    color: colors.primary,
    letterSpacing: 1,
  },
  subtitle: {
    textAlign: "center",
    color: "#999",
    fontSize: 15,
    marginBottom: 40,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
  },
  passwordWrapper: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 14,
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    padding: 15,
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
    marginTop: 6,
    marginBottom: 20,
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
