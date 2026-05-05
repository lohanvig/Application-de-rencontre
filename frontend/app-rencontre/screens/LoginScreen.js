import { useState, useRef } from "react";
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
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../api/api";
import { colors } from "../styles/theme.js";

export default function LoginScreen({ navigation }) {
  const { height: screenH } = useWindowDimensions();
  const isSmall = screenH < 700;

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
      await AsyncStorage.setItem("userId", userId);
      navigation.replace("Main", { userId });
    } catch (error) {
      Alert.alert("Connexion échouée", "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, isSmall && { marginBottom: 28 }]}>
          <View style={[styles.logoCircle, isSmall && { width: 68, height: 68, borderRadius: 34, marginBottom: 14 }]}>
            <Ionicons name="heart" size={isSmall ? 32 : 42} color="#fff" />
          </View>
          <Text style={styles.title}>MatchApp</Text>
          <Text style={styles.subtitle}>Retrouve ta moitié</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              placeholder="Email"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              value={email}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              ref={passwordRef}
              placeholder="Mot de passe"
              secureTextEntry={!showPassword}
              style={styles.input}
              onChangeText={setPassword}
              value={password}
              returnKeyType="done"
              onSubmitEditing={login}
              placeholderTextColor={colors.textTertiary}
            />
            <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={login}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={styles.linkRow}
          activeOpacity={0.7}
        >
          <Text style={styles.linkGray}>Pas encore de compte ? </Text>
          <Text style={styles.linkPrimary}>Créer un compte</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 28,
    paddingBottom: 40,
  },

  hero: {
    alignItems: "center",
    marginBottom: 52,
  },

  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.3,
  },

  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 7,
  },

  form: {
    gap: 12,
    marginBottom: 32,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 54,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  inputIcon: {
    marginRight: 11,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },

  eyeBtn: {
    padding: 4,
    marginLeft: 6,
  },

  button: {
    backgroundColor: colors.primary,
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  linkGray: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  linkPrimary: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
  },
});
