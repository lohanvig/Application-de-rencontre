import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../api/api";
import { colors } from "../styles/theme";

const DISTANCE_OPTIONS = [
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "50 km", value: 50 },
  { label: "100 km", value: 100 },
  { label: "Illimité", value: null },
];

export default function ProfileScreen({ route, navigation }) {
  const { userId } = route.params;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [photos, setPhotos] = useState([]);

  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(50);
  const [maxDistance, setMaxDistance] = useState(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const [userRes, photosRes, stored] = await Promise.all([
        API.get(`/user/${userId}`),
        API.get(`/user/${userId}/photos`),
        AsyncStorage.getItem("swipeFilters"),
      ]);
      const u = userRes.data;
      setProfile(u);
      setUsername(u.username || "");
      setBio(u.bio || "");
      setAge(u.age ? String(u.age) : "");
      setPhotos(photosRes.data.photos || []);
      if (stored) {
        const f = JSON.parse(stored);
        setMinAge(f.minAge ?? 18);
        setMaxAge(f.maxAge ?? 50);
        setMaxDistance(f.maxDistance ?? null);
      }
    } catch (err) {
      console.log("PROFILE ERROR:", err);
      Alert.alert("Erreur", "Impossible de charger le profil.");
    } finally {
      setLoading(false);
    }
  };

  const pickAndUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    const formData = new FormData();
    formData.append("file", { uri, name: "photo.jpg", type: "image/jpeg" });

    try {
      const res = await API.post(`/user/${userId}/photo`, formData);
      const newUrl = res.data.photo_url;
      setPhotos((prev) => {
        const isFirst = prev.length === 0;
        return [...prev, { photo_url: newUrl, is_main: isFirst }];
      });
    } catch (err) {
      console.log("UPLOAD ERROR:", err);
      Alert.alert("Erreur", "Impossible d'ajouter la photo.");
    }
  };

  const setMainPhoto = async (photoUrl) => {
    try {
      await API.put(`/user/${userId}/photo/main`, { photo_url: photoUrl });
      setPhotos((prev) =>
        prev.map((p) => ({ ...p, is_main: p.photo_url === photoUrl }))
      );
    } catch (err) {
      console.log("SET MAIN ERROR:", err);
    }
  };

  const deletePhoto = (photoUrl) => {
    Alert.alert("Supprimer cette photo ?", "", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await API.delete(`/user/${userId}/photo`, { params: { photo_url: photoUrl } });
            setPhotos((prev) => {
              const remaining = prev.filter((p) => p.photo_url !== photoUrl);
              const hasMain = remaining.some((p) => p.is_main);
              if (!hasMain && remaining.length > 0) remaining[0].is_main = true;
              return remaining;
            });
          } catch (err) {
            console.log("DELETE PHOTO ERROR:", err);
          }
        },
      },
    ]);
  };

  const validate = () => {
    if (!username.trim()) {
      Alert.alert("Erreur", "Le prénom ne peut pas être vide.");
      return false;
    }
    if (age) {
      const parsed = parseInt(age);
      if (isNaN(parsed) || parsed < 18 || parsed > 99) {
        Alert.alert("Âge invalide", "L'âge doit être entre 18 et 99 ans.");
        return false;
      }
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await Promise.all([
        API.put(`/user/${userId}`, {
          username: username.trim(),
          bio: bio.trim(),
          age: parseInt(age) || profile.age,
        }),
        AsyncStorage.setItem("swipeFilters", JSON.stringify({ minAge, maxAge, maxDistance })),
      ]);
      setProfile((prev) => ({
        ...prev,
        username: username.trim(),
        bio: bio.trim(),
        age: parseInt(age) || prev.age,
      }));
      setEditing(false);
      Alert.alert("Succès ✅", "Profil mis à jour !");
    } catch (err) {
      console.log("SAVE ERROR:", err);
      Alert.alert("Erreur", "Impossible de sauvegarder.");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    Alert.alert("Se déconnecter ?", "", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("userId");
          navigation.getParent()?.getParent()?.reset({ index: 0, routes: [{ name: "Login" }] });
        },
      },
    ]);
  };

  const cancel = () => {
    setUsername(profile.username || "");
    setBio(profile.bio || "");
    setAge(profile.age ? String(profile.age) : "");
    setEditing(false);
  };

  const changeMinAge = (delta) =>
    setMinAge((prev) => Math.max(18, Math.min(prev + delta, maxAge - 1)));
  const changeMaxAge = (delta) =>
    setMaxAge((prev) => Math.max(minAge + 1, Math.min(prev + delta, 99)));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const mainPhoto = photos.find((p) => p.is_main)?.photo_url || photos[0]?.photo_url || null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          {mainPhoto ? (
            <Image source={{ uri: mainPhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{(username || "?")[0].toUpperCase()}</Text>
            </View>
          )}
          {!editing && (
            <TouchableOpacity style={styles.editAvatarBtn} onPress={() => setEditing(true)} activeOpacity={0.8}>
              <Ionicons name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {!editing && (
          <View style={styles.nameSection}>
            <Text style={styles.displayName}>{username}{age ? `, ${age}` : ""}</Text>
            {!!bio && <Text style={styles.displayBio}>{bio}</Text>}
          </View>
        )}

        {/* Photo gallery */}
        <View style={styles.galleryCard}>
          <View style={styles.galleryHeader}>
            <Text style={styles.galleryTitle}>{editing ? "Mes photos" : "Photos"}</Text>
            <Text style={styles.galleryCount}>{photos.length}/9</Text>
          </View>
          {editing && (
            <Text style={styles.galleryHint}>
              Appui court = photo principale · Appui long = supprimer
            </Text>
          )}
          <FlatList
            data={editing ? [...photos, { add: true }] : photos}
            keyExtractor={(_, i) => i.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryList}
            renderItem={({ item }) => {
              if (item.add) {
                return (
                  <TouchableOpacity style={styles.addPhotoBtn} onPress={pickAndUpload} activeOpacity={0.7}>
                    <Ionicons name="add" size={28} color={colors.primary} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  onPress={() => editing && setMainPhoto(item.photo_url)}
                  onLongPress={() => editing && deletePhoto(item.photo_url)}
                  delayLongPress={500}
                  style={styles.thumbWrapper}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: item.photo_url }} style={styles.thumb} />
                  {item.is_main && (
                    <View style={styles.mainBadge}>
                      <Ionicons name="star" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Form or Actions */}
        {editing ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Modifier le profil</Text>

            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Ton prénom"
              placeholderTextColor={colors.textTertiary}
              maxLength={30}
            />

            <Text style={styles.label}>Âge</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="Ton âge"
              placeholderTextColor={colors.textTertiary}
              maxLength={2}
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Parle un peu de toi..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={200}
            />
            <Text style={styles.charCount}>{bio.length}/200</Text>

            {/* Preferences section */}
            <View style={styles.prefsDivider} />
            <Text style={styles.prefsTitle}>Préférences de recherche</Text>

            <Text style={styles.label}>Tranche d'âge recherchée</Text>
            <View style={styles.ageCard}>
              <View style={styles.ageBlock}>
                <Text style={styles.ageLabel}>Minimum</Text>
                <View style={styles.counter}>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => changeMinAge(-1)} activeOpacity={0.7}>
                    <Ionicons name="remove" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{minAge}</Text>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => changeMinAge(1)} activeOpacity={0.7}>
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.ageDivider} />
              <View style={styles.ageBlock}>
                <Text style={styles.ageLabel}>Maximum</Text>
                <View style={styles.counter}>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => changeMaxAge(-1)} activeOpacity={0.7}>
                    <Ionicons name="remove" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{maxAge}</Text>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => changeMaxAge(1)} activeOpacity={0.7}>
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Distance maximale</Text>
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

            <View style={styles.row}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancel} activeOpacity={0.8}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={save}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)} activeOpacity={0.85}>
              <Ionicons name="pencil-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.editBtnText}>Modifier le profil</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={18} color="#FF4458" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { alignItems: "center", paddingHorizontal: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },

  avatarSection: {
    marginTop: 28,
    marginBottom: 16,
    position: "relative",
    alignItems: "center",
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  avatarPlaceholder: {
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: {
    fontSize: 44,
    color: colors.primary,
    fontWeight: "700",
  },

  editAvatarBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },

  nameSection: {
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 32,
  },

  displayName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },

  displayBio: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  galleryCard: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  galleryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  galleryTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  galleryCount: { fontSize: 13, color: colors.textTertiary, fontWeight: "600" },
  galleryHint: { fontSize: 11, color: colors.textTertiary, marginBottom: 10 },
  galleryList: { gap: 10, paddingVertical: 4 },
  thumbWrapper: { position: "relative" },

  thumb: {
    width: 76,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.border,
  },

  mainBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  addPhotoBtn: {
    width: 76,
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
  },

  formCard: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  formTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },

  input: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: colors.text,
  },

  bioInput: {
    height: 88,
    textAlignVertical: "top",
    marginBottom: 4,
  },

  charCount: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: "right",
    marginBottom: 4,
  },

  /* Preferences */
  prefsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },

  prefsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },

  ageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: 6,
  },

  ageBlock: {
    flex: 1,
    alignItems: "center",
    gap: 8,
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
    gap: 8,
  },

  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,68,88,0.15)",
  },

  counterValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    minWidth: 30,
    textAlign: "center",
  },

  ageDivider: {
    width: 1,
    height: 52,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  chipTextSelected: { color: "#fff" },

  row: { flexDirection: "row", gap: 10, marginTop: 20 },

  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
  },

  cancelText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },

  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  actionsCard: {
    alignSelf: "stretch",
    gap: 10,
  },

  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },

  editBtnText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  logoutText: {
    color: "#FF4458",
    fontWeight: "600",
    fontSize: 15,
  },
});
