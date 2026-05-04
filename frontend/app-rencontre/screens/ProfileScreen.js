import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [userRes, photosRes] = await Promise.all([
        API.get(`/user/${userId}`),
        API.get(`/user/${userId}/photos`),
      ]);
      const u = userRes.data;
      setProfile(u);
      setUsername(u.username || "");
      setBio(u.bio || "");
      setAge(u.age ? String(u.age) : "");
      setPhotos(photosRes.data.photos || []);
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
              // si on a supprimé la principale, promouvoir la première restante
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
      await API.put(`/user/${userId}`, {
        username: username.trim(),
        bio: bio.trim(),
        age: parseInt(age) || profile.age,
      });
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const mainPhoto = photos.find((p) => p.is_main)?.photo_url || photos[0]?.photo_url || null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Main avatar */}
        <View style={styles.avatarWrapper}>
          {mainPhoto ? (
            <Image source={{ uri: mainPhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{(username || "?")[0].toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Photo gallery */}
        <View style={styles.gallerySection}>
          <Text style={styles.galleryTitle}>
            {editing ? "Mes photos · appui long pour supprimer" : "Photos"}
          </Text>
          <FlatList
            data={editing ? [...photos, { add: true }] : photos}
            keyExtractor={(_, i) => i.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryList}
            renderItem={({ item }) => {
              if (item.add) {
                return (
                  <TouchableOpacity style={styles.addPhotoBtn} onPress={pickAndUpload}>
                    <Ionicons name="add" size={30} color={colors.primary} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  onPress={() => editing && setMainPhoto(item.photo_url)}
                  onLongPress={() => editing && deletePhoto(item.photo_url)}
                  delayLongPress={500}
                  style={styles.thumbWrapper}
                >
                  <Image source={{ uri: item.photo_url }} style={styles.thumb} />
                  {item.is_main && (
                    <View style={styles.mainBadge}>
                      <Ionicons name="star" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
          {editing && (
            <Text style={styles.galleryHint}>
              Appuie sur une photo pour la définir comme principale ⭐
            </Text>
          )}
        </View>

        {/* Info / Form */}
        {editing ? (
          <View style={styles.form}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Ton prénom"
              placeholderTextColor="#aaa"
              maxLength={30}
            />

            <Text style={styles.label}>Âge</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="Ton âge"
              placeholderTextColor="#aaa"
              maxLength={2}
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Parle un peu de toi..."
              placeholderTextColor="#aaa"
              multiline
              maxLength={200}
            />
            <Text style={styles.charCount}>{bio.length}/200</Text>

            <View style={styles.row}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancel}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={save}
                disabled={saving}
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
          <View style={styles.info}>
            <Text style={styles.name}>{username}{age ? `, ${age}` : ""}</Text>
            <Text style={styles.bio}>{bio || "Aucune bio pour l'instant"}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Text style={styles.editBtnText}>Modifier le profil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
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
  container: { alignItems: "center", padding: 25, paddingBottom: 50 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },

  avatarWrapper: { marginTop: 10, marginBottom: 16 },
  avatar: { width: 130, height: 130, borderRadius: 65, borderWidth: 3, borderColor: colors.primary },
  avatarPlaceholder: { backgroundColor: colors.border, justifyContent: "center", alignItems: "center" },
  avatarInitial: { fontSize: 50, color: colors.primary, fontWeight: "700" },

  gallerySection: { width: "100%", marginBottom: 20 },
  galleryTitle: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 10 },
  galleryList: { paddingBottom: 4 },
  galleryHint: { fontSize: 11, color: "#aaa", marginTop: 6 },

  thumbWrapper: { marginRight: 10, position: "relative" },
  thumb: { width: 80, height: 100, borderRadius: 12 },
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
    width: 80,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  info: { width: "100%", alignItems: "center" },
  name: { fontSize: 26, fontWeight: "700", color: colors.primary, marginBottom: 10 },
  bio: { fontSize: 15, color: colors.text, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  editBtn: { backgroundColor: colors.primary, paddingVertical: 13, paddingHorizontal: 40, borderRadius: 25 },
  editBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },

  form: { width: "100%" },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 5, marginTop: 12 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 13, fontSize: 15, color: colors.text },
  bioInput: { height: 100, textAlignVertical: "top", marginBottom: 4 },
  charCount: { fontSize: 11, color: "#aaa", textAlign: "right", marginBottom: 4 },

  row: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10, padding: 13, alignItems: "center" },
  cancelText: { color: colors.primary, fontWeight: "600", fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, padding: 13, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "600", fontSize: 15 },

  logoutBtn: { marginTop: 24, paddingVertical: 13, paddingHorizontal: 40, borderRadius: 25, borderWidth: 1.5, borderColor: "#FF4458" },
  logoutText: { color: "#FF4458", fontWeight: "600", fontSize: 15, textAlign: "center" },
});
