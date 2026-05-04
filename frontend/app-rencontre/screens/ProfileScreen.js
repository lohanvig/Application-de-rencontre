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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import API from "../api/api";
import { colors } from "../styles/theme";

export default function ProfileScreen({ route }) {
  const { userId } = route.params;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [photo, setPhoto] = useState(null);
  const [newPhoto, setNewPhoto] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await API.get(`/user/${userId}`);
      const u = res.data;
      setProfile(u);
      setUsername(u.username || "");
      setBio(u.bio || "");
      setAge(u.age ? String(u.age) : "");
      setPhoto(u.photo_url);
    } catch (err) {
      console.log("PROFILE ERROR:", err);
      Alert.alert("Erreur", "Impossible de charger le profil.");
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
      setNewPhoto(result.assets[0].uri);
    }
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

      if (newPhoto) {
        const formData = new FormData();
        formData.append("file", {
          uri: newPhoto,
          name: "profile.jpg",
          type: "image/jpeg",
        });
        await API.post(`/user/${userId}/photo`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setPhoto(newPhoto);
        setNewPhoto(null);
      }

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
      Alert.alert("Erreur", "Impossible de sauvegarder les modifications.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setUsername(profile.username || "");
    setBio(profile.bio || "");
    setAge(profile.age ? String(profile.age) : "");
    setNewPhoto(null);
    setEditing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayPhoto = newPhoto || photo;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>

        <TouchableOpacity
          onPress={editing ? pickImage : undefined}
          activeOpacity={editing ? 0.7 : 1}
          style={styles.avatarWrapper}
        >
          {displayPhoto ? (
            <Image source={{ uri: displayPhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {(username || "?")[0].toUpperCase()}
              </Text>
            </View>
          )}
          {editing && (
            <View style={styles.editPhotoOverlay}>
              <Text style={styles.editPhotoText}>Changer</Text>
            </View>
          )}
        </TouchableOpacity>

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
            <Text style={styles.name}>
              {username}{age ? `, ${age}` : ""}
            </Text>
            <Text style={styles.bio}>{bio || "Aucune bio pour l'instant"}</Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.editBtnText}>Modifier le profil</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    alignItems: "center",
    padding: 25,
    paddingBottom: 50,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },

  avatarWrapper: {
    marginTop: 10,
    marginBottom: 24,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 50,
    color: colors.primary,
    fontWeight: "700",
  },
  editPhotoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 6,
    borderBottomLeftRadius: 65,
    borderBottomRightRadius: 65,
    alignItems: "center",
  },
  editPhotoText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  info: {
    width: "100%",
    alignItems: "center",
  },
  name: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 10,
  },
  bio: {
    fontSize: 15,
    color: colors.text,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  editBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  editBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  form: {
    width: "100%",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 5,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: colors.text,
  },
  bioInput: {
    height: 100,
    textAlignVertical: "top",
    marginBottom: 4,
  },
  charCount: {
    fontSize: 11,
    color: "#aaa",
    textAlign: "right",
    marginBottom: 4,
  },

  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
  },
  cancelText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 15,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
