import { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
      await AsyncStorage.setItem("userId", userId);

      if (image) {
        const formData = new FormData();
        formData.append("file", { uri: image, name: "profile.jpg", type: "image/jpeg" });
        await API.post(`/user/${userId}/photo`, formData);
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
    if (!result.canceled) setImage(result.assets[0].uri);
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
        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoins la communauté 💕</Text>
        </View>

        {/* Photo picker */}
        <TouchableOpacity onPress={pickImage} style={styles.photoPicker} activeOpacity={0.8}>
          {image ? (
            <Image source={{ uri: image }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.photoText}>Photo de profil</Text>
            </View>
          )}
          <View style={styles.photoAddBadge}>
            <Ionicons name="add" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.form}>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              placeholder="Prénom *"
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              maxLength={30}
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              placeholder="Email *"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              placeholder="Mot de passe * (min. 6 caractères)"
              secureTextEntry={!showPassword}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
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

          <View style={styles.inputRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              placeholder="Âge (18+)"
              keyboardType="numeric"
              style={styles.input}
              value={age}
              onChangeText={setAge}
              maxLength={2}
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={[styles.inputRow, styles.bioRow]}>
            <Ionicons name="pencil-outline" size={18} color={colors.textTertiary} style={[styles.inputIcon, { marginTop: 2 }]} />
            <TextInput
              placeholder="Bio (optionnel)"
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={200}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <Text style={styles.charCount}>{bio.length}/200</Text>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={register}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>S'inscrire</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          style={styles.linkRow}
          activeOpacity={0.7}
        >
          <Text style={styles.linkGray}>Déjà un compte ? </Text>
          <Text style={styles.linkPrimary}>Se connecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 28,
    paddingTop: 20,
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    marginBottom: 28,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.2,
  },

  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 6,
  },

  photoPicker: {
    alignSelf: "center",
    marginBottom: 28,
    position: "relative",
  },

  photoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  photoText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: "500",
  },

  photoPreview: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: colors.primary,
  },

  photoAddBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },

  form: {
    gap: 12,
    marginBottom: 28,
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

  bioRow: {
    height: "auto",
    paddingVertical: 14,
    alignItems: "flex-start",
  },

  inputIcon: {
    marginRight: 11,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },

  bioInput: {
    minHeight: 70,
    textAlignVertical: "top",
  },

  eyeBtn: {
    padding: 4,
    marginLeft: 6,
  },

  charCount: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: "right",
    marginTop: -6,
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
