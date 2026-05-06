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
import DateTimePicker from "@react-native-community/datetimepicker";
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

const GENDERS = ["Homme", "Femme", "Non-binaire"];

const MAX_DOB = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
})();

const formatDob = (d) => {
  if (!d) return null;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
};

const dobToISO = (d) => {
  if (!d) return null;
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")}`;
};

export default function RegisterScreen({ navigation }) {
  const { height: screenH } = useWindowDimensions();
  const isSmall = screenH < 700;

  const [step, setStep] = useState(1);

  // Étape 1
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState(null);
  const [bio, setBio] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Étape 2
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
    if (!dob) {
      Alert.alert("Date de naissance", "Merci d'entrer ta date de naissance.");
      return false;
    }
    if (dob > MAX_DOB) {
      Alert.alert("Âge invalide", "Tu dois avoir au moins 18 ans.");
      return false;
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
        date_of_birth: dobToISO(dob),
        bio: bio.trim() || "Salut ! 👋",
        gender,
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

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && selectedDate) setDob(selectedDate);
    } else {
      if (selectedDate) setDob(selectedDate);
    }
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
        {/* Indicateur d'étape */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]}>
            <Text style={styles.stepNumActive}>1</Text>
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

            {/* Photo */}
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
                <View style={[styles.photoPlaceholder, { width: photoSize, height: photoSize, borderRadius: photoSize / 2 }]}>
                  <Ionicons name="camera-outline" size={isSmall ? 26 : 32} color={colors.textTertiary} />
                  <Text style={styles.photoText}>Photo de profil</Text>
                </View>
              )}
              <View style={styles.photoAddBadge}>
                <Ionicons name="add" size={16} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={[styles.form, isSmall && { gap: 10 }]}>
              {/* Prénom */}
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

              {/* Email */}
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

              {/* Mot de passe */}
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

              {/* Date de naissance */}
              <TouchableOpacity
                style={styles.inputRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                <Text style={[styles.input, { paddingTop: 0, lineHeight: 20 }, !dob && { color: colors.textTertiary }]}>
                  {dob ? formatDob(dob) : "Date de naissance *"}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <View>
                  <DateTimePicker
                    value={dob || new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    maximumDate={MAX_DOB}
                    onChange={onDateChange}
                  />
                  {Platform.OS === "ios" && (
                    <TouchableOpacity
                      style={styles.dateConfirmBtn}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.dateConfirmText}>Valider</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Sexe */}
              <View>
                <Text style={styles.fieldLabel}>Sexe</Text>
                <View style={styles.chipsRow}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.chip, gender === g && styles.chipSelected]}
                      onPress={() => setGender(g)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, gender === g && styles.chipTextSelected]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Bio */}
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

            {/* Tranche d'âge */}
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
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{opt.label}</Text>
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
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>S'inscrire</Text>}
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

  stepDotActive: { backgroundColor: colors.primary },

  stepNum: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textTertiary,
  },

  stepNumActive: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },

  stepLine: {
    width: 48,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },

  stepLineActive: { backgroundColor: colors.primary },

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

  inputIcon: { marginRight: 11 },

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

  dateConfirmBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    marginTop: 8,
  },

  dateConfirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 2,
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

  chipTextSelected: { color: "#fff" },

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
  prefBlock: { marginBottom: 20 },

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
