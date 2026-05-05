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
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../api/api";
import { colors } from "../styles/theme.js";
import * as ImagePicker from "expo-image-picker";

const DISTANCE_OPTIONS = [
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "50 km", value: 50 },
  { label: "100 km", value: 100 },
  { label: "Illimité", value: null },
];

export default function RegisterScreen({ navigation }) {
  const { height: screenH } = useWindowDimensions();
  const isSmall = screenH < 700;

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(50);
  const [maxDistance, setMaxDistance] = useState(null);

  const validateStep1 = () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Champs manquants", "Prénom, email et mot de passe sont obligatoires.");
      return false;
    }
    if (!email.includes("@")) {
      Alert.alert("Email invalide", "Merci d'entrer un email valide.");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Mot de passe trop court", "Minimum 6 caractères.");
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

  const goToStep2 = () => {
    if (validateStep1()) setStep(2);
  };

  const changeMinAge = (delta) =>
    setMinAge((prev) => Math.max(18, Math.min(prev + delta, maxAge - 1)));
  const changeMaxAge = (delta) =>
    setMaxAge((prev) => Math.max(minAge + 1, Math.min(prev + delta, 99)));

  const register = async () => {
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
      await AsyncStorage.setItem(
        "swipeFilters",
        JSON.stringify({ minAge, maxAge, maxDistance })
      );

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

  const photoSize = isSmall ? 88 : 110;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: isSmall ? 12 : 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]}>
            <Text style={styles.stepNum}>1</Text>
          </View>
          <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step === 2 && styles.stepDotActive]}>
            <Text style={[styles.stepNum, step === 2 && styles.stepNumActive]}>2</Text>
          </View>
        </View>

        {step === 1 ? (
          <>
            <View style={[styles.header, isSmall && { marginBottom: 16 }]}>
              <Text style={styles.title}>Créer un compte</Text>
              <Text style={styles.subtitle}>Rejoins la communauté 💕</Text>
            </View>

            <TouchableOpacity
              onPress={pickImage}
              style={[styles.photoPicker, { marginBottom: isSmall ? 16 : 24 }]}
              activeOpacity={0.8}
            >
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={[styles.photoPreview, { width: photoSize, height: photoSize, borderRadius: photoSize / 2 }]}
                />
              ) : (
                <View
                  style={[styles.photoPlaceholder, { width: photoSize, height: photoSize, borderRadius: photoSize / 2 }]}
                >
                  <Ionicons name="camera-outline" size={isSmall ? 26 : 32} color={colors.textTertiary} />
                  <Text style={styles.photoText}>Photo de profil</Text>
                </View>
              )}
              <View style={styles.photoAddBadge}>
                <Ionicons name="add" size={16} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={[styles.form, isSmall && { gap: 10 }]}>
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
                  placeholder="Mot de passe * (min. 6 car.)"
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
                <Ionicons
                  name="pencil-outline"
                  size={18}
                  color={colors.textTertiary}
                  style={[styles.inputIcon, { marginTop: 2 }]}
                />
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

              <TouchableOpacity style={styles.button} onPress={goToStep2} activeOpacity={0.85}>
                <Text style={styles.buttonText}>Suivant</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.header, isSmall && { marginBottom: 16 }]}>
              <Text style={styles.title}>Tes préférences</Text>
              <Text style={styles.subtitle}>Pour te montrer les bons profils ✨</Text>
            </View>

            {/* Age range */}
            <View style={styles.prefBlock}>
              <View style={styles.prefHeader}>
                <Ionicons name="person-outline" size={16} color={colors.primary} />
                <Text style={styles.prefTitle}>Tranche d'âge recherchée</Text>
              </View>
              <View style={styles.ageCard}>
                <View style={styles.ageBlock}>
                  <Text style={styles.ageLabel}>Minimum</Text>
                  <View style={styles.counter}>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => changeMinAge(-1)} activeOpacity={0.7}>
                      <Ionicons name="remove" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{minAge}</Text>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => changeMinAge(1)} activeOpacity={0.7}>
                      <Ionicons name="add" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.ageDivider} />
                <View style={styles.ageBlock}>
                  <Text style={styles.ageLabel}>Maximum</Text>
                  <View style={styles.counter}>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => changeMaxAge(-1)} activeOpacity={0.7}>
                      <Ionicons name="remove" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{maxAge}</Text>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => changeMaxAge(1)} activeOpacity={0.7}>
                      <Ionicons name="add" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Distance */}
            <View style={styles.prefBlock}>
              <View style={styles.prefHeader}>
                <Ionicons name="location-outline" size={16} color={colors.primary} />
                <Text style={styles.prefTitle}>Distance maximale</Text>
              </View>
              <View style={styles.chipsRow}>
                {DISTANCE_OPTIONS.map((opt) => {
                  const sel = maxDistance === opt.value;
                  return (
                    <TouchableOpacity
                      key={String(opt.value)}
                      style={[styles.chip, sel && styles.chipSelected]}
                      onPress={() => setMaxDistance(opt.value)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.step2Btns}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
                <Text style={styles.backBtnText}>Retour</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonFlex, loading && { opacity: 0.7 }]}
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
          </>
        )}

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
    paddingHorizontal: 28,
    paddingBottom: 40,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    marginTop: 8,
  },

  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },

  stepDotActive: {
    backgroundColor: colors.primary,
  },

  stepNum: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textTertiary,
  },

  stepNumActive: {
    color: "#fff",
  },

  stepLine: {
    flex: 0,
    width: 48,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },

  stepLineActive: {
    backgroundColor: colors.primary,
  },

  header: {
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.2,
  },

  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
  },

  photoPicker: {
    alignSelf: "center",
    position: "relative",
  },

  photoPlaceholder: {
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
    marginBottom: 24,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 52,
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
    minHeight: 60,
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
    flexDirection: "row",
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  buttonFlex: {
    flex: 1,
    marginTop: 0,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  /* Step 2 */
  prefBlock: {
    marginBottom: 20,
  },

  prefHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  prefTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },

  ageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  ageBlock: {
    flex: 1,
    alignItems: "center",
    gap: 10,
  },

  ageLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,68,88,0.15)",
  },

  counterValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    minWidth: 34,
    textAlign: "center",
  },

  ageDivider: {
    width: 1,
    height: 56,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },

  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  chipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  chipTextSelected: {
    color: "#fff",
  },

  step2Btns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  backBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 8,
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
