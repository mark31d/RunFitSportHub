// Components/ProfileScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import {
  launchImageLibrary,
  launchCamera,
} from 'react-native-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ===== Палитра SquadCraft ===== */
const PALETTE = {
  bg: '#0B1020',
  card: '#121A33',
  card2: '#0E1630',
  text: '#EAF2FF',
  mut: 'rgba(234,242,255,0.7)',
  primary: '#7C5CFF',
  accent: '#00E6A8',
  info: '#4FC3FF',
  warn: '#FFB020',
  danger: '#FF4D6D',
  line: 'rgba(255,255,255,0.08)',
};

const SPORTS = ['Football', 'Basketball', 'Hockey', 'Tennis', 'Esports'];

export default function ProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const [avatar, setAvatar] = useState(null); // { uri }
  const [name, setName] = useState('Player One');
  const [bio, setBio] = useState('Collector of legendary squads.');
  const [sport, setSport] = useState('Football');
  const [privateAcc, setPrivateAcc] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const pickerOpts = {
    mediaType: 'photo',
    quality: 0.9,
    includeBase64: false,
    selectionLimit: 1,
  };

  const onPickFromLibrary = async () => {
    const res = await launchImageLibrary(pickerOpts);
    if (res.didCancel) return;
    if (res.errorCode) {
      Alert.alert('Picker error', res.errorMessage || res.errorCode);
      return;
    }
    const asset = res.assets?.[0];
    if (asset?.uri) setAvatar({ uri: asset.uri });
  };

  const onTakePhoto = async () => {
    const res = await launchCamera(pickerOpts);
    if (res.didCancel) return;
    if (res.errorCode) {
      Alert.alert('Camera error', res.errorMessage || res.errorCode);
      return;
    }
    const asset = res.assets?.[0];
    if (asset?.uri) setAvatar({ uri: asset.uri });
  };

  const onSave = () => {
    const profile = { avatar, name: name.trim(), bio: bio.trim(), sport, privateAcc };
    // опционально вернёмся в вызывающий экран
    route?.params?.onSave?.(profile);
    setIsSaved(true);
    Alert.alert('Saved', 'Profile updated!');
  };

  const onEdit = () => {
    setIsSaved(false);
  };

  const onDeleteProfile = () => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete your profile? This will reset your profile data to default values. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Сбрасываем профиль к значениям по умолчанию
            setAvatar(null);
            setName('Player One');
            setBio('Collector of legendary squads.');
            setSport('Football');
            setPrivateAcc(false);
            setIsSaved(false);
            Alert.alert('Profile Deleted', 'Your profile has been reset to default values.');
          },
        },
      ],
    );
  };

  const onResetData = () => {
    Alert.alert(
      'Reset Data',
      'Are you sure you want to reset all data? This will clear all teams and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Data Reset', 'All data has been cleared. The app will restart.');
              // Здесь можно добавить перезапуск приложения
            } catch (error) {
              Alert.alert('Error', 'Failed to reset data. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ 
          padding: 16, 
          paddingBottom: Math.max(insets.bottom + 32, 32) 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          {!isSaved && (
            <Pressable style={styles.btnSave} onPress={onSave}>
              <Text style={styles.btnSaveText}>Save</Text>
            </Pressable>
          )}
        </View>

      {!isSaved ? (
        // Режим редактирования
        <>
          {/* Avatar */}
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatarWrap}>
                {avatar?.uri ? (
                  <Image source={avatar} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPh}>
                    <Text style={styles.avatarPhText}>{name?.[0]?.toUpperCase() || 'U'}</Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Avatar</Text>
                <View style={styles.row}>
                  <Pressable style={styles.btnPrimary} onPress={onPickFromLibrary}>
                    <Text style={styles.btnDarkText}>Choose photo</Text>
                  </Pressable>
                  <Pressable style={styles.btnOutline} onPress={onTakePhoto}>
                    <Text style={styles.btnText}>Take photo</Text>
                  </Pressable>
                </View>
                <Text style={styles.hint}>PNG/JPG, ~1–3 MB.</Text>
              </View>
            </View>
          </View>

          {/* Name & Bio */}
          <View style={styles.card}>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your nickname"
              placeholderTextColor={PALETTE.mut}
              style={styles.input}
            />
            <Text style={[styles.label, { marginTop: 12 }]}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell something about you..."
              placeholderTextColor={PALETTE.mut}
              style={[styles.input, { height: 96, textAlignVertical: 'top' }]}
              multiline
            />
          </View>

          {/* Favorite sport */}
          <View style={styles.card}>
            <Text style={styles.label}>Favorite sport</Text>
            <View style={styles.tagsRow}>
              {SPORTS.map((s) => (
                <Tag key={s} label={s} active={sport === s} onPress={() => setSport(s)} />
              ))}
            </View>
          </View>

          {/* Privacy & actions */}
          <View style={styles.card}>
            <Text style={styles.label}>Privacy</Text>
            <Toggle
              label="Private account"
              value={privateAcc}
              onToggle={() => setPrivateAcc((v) => !v)}
            />
            <View style={{ height: 12 }} />
            <Pressable style={styles.btnDanger} onPress={onDeleteProfile}>
              <Text style={styles.btnDarkText}>Delete Profile</Text>
            </Pressable>
          </View>
        </>
      ) : (
        // Режим просмотра сохраненного профиля
        <>
          {/* Центральное фото и имя */}
          <View style={styles.profileCard}>
            <View style={styles.profileAvatarContainer}>
              {avatar?.uri ? (
                <Image source={avatar} style={styles.profileAvatar} />
              ) : (
                <View style={styles.profileAvatarPlaceholder}>
                  <Text style={styles.profileAvatarText}>{name?.[0]?.toUpperCase() || 'U'}</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profileBio}>{bio}</Text>
            
            {/* Хештеги */}
            <View style={styles.hashtagsContainer}>
              <Text style={styles.hashtag}>#{sport.toLowerCase()}</Text>
              <Text style={styles.hashtag}>#runfitsporthub</Text>
              <Text style={styles.hashtag}>#{privateAcc ? 'private' : 'public'}</Text>
            </View>
          </View>

          {/* Дополнительная информация */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Profile Info</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sport</Text>
              <Text style={styles.infoValue}>{sport}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account</Text>
              <Text style={styles.infoValue}>{privateAcc ? 'Private' : 'Public'}</Text>
            </View>
          </View>

          {/* Действия */}
          <View style={styles.actionsContainer}>
            <Pressable style={styles.btnEdit} onPress={onEdit}>
              <Text style={styles.btnEditText}>Edit</Text>
            </Pressable>
            <View style={{ height: 12 }} />
            <Pressable style={styles.btnSignOut} onPress={onDeleteProfile}>
              <Text style={styles.btnSignOutText}>Delete Profile</Text>
            </Pressable>
            <View style={{ height: 12 }} />
            <Pressable style={styles.btnReset} onPress={onResetData}>
              <Text style={styles.btnResetText}>Reset Data</Text>
            </Pressable>
          </View>
        </>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===== Small UI ===== */
function Tag({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tag,
        active && { backgroundColor: PALETTE.accent },
      ]}
    >
      <Text style={[styles.tagText, active && { color: '#08131A', fontWeight: '800' }]}>{label}</Text>
    </Pressable>
  );
}

function Toggle({ label, value, onToggle }) {
  return (
    <Pressable onPress={onToggle} style={styles.tglRow}>
      <Text style={styles.tglLabel}>{label}</Text>
      <View style={[styles.tglTrack, value && { backgroundColor: 'rgba(0,230,168,0.25)', borderColor: 'rgba(0,230,168,0.35)' }]}>
        <View style={[styles.tglThumb, value && { backgroundColor: PALETTE.accent, alignSelf: 'flex-end' }]} />
      </View>
    </Pressable>
  );
}

/* ===== Styles ===== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.bg },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { color: PALETTE.text, fontSize: 20, fontWeight: '800', flex: 1, letterSpacing: 0.2 },

  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE.line,
    marginBottom: 12,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  avatarWrap: { width: 84, height: 84, borderRadius: 16, overflow: 'hidden', marginRight: 6, backgroundColor: PALETTE.card2, borderWidth: 1, borderColor: PALETTE.line },
  avatar: { width: 84, height: 84, resizeMode: 'cover' },
  avatarPh: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarPhText: { color: PALETTE.mut, fontSize: 28, fontWeight: '900' },

  label: { color: PALETTE.mut, fontSize: 12, marginBottom: 8 },

  input: {
    backgroundColor: PALETTE.card2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: PALETTE.text,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },

  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  tagText: { color: PALETTE.text, fontWeight: '700', fontSize: 12 },

  btnPrimary: {
    backgroundColor: PALETTE.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 6,
  },
  btnOutline: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: PALETTE.line,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btnDanger: {
    backgroundColor: PALETTE.danger,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  btnText: { color: PALETTE.text, fontWeight: '800' },
  btnDarkText: { color: '#08131A', fontWeight: '800' },
  btnGhost: {
    backgroundColor: PALETTE.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: PALETTE.accent,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  ghostText: { color: '#08131A', fontWeight: '800', fontSize: 12 },

  hint: { color: PALETTE.mut, fontSize: 11, marginTop: 6 },

  tglRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tglLabel: { color: PALETTE.text, fontWeight: '700' },
  tglTrack: {
    width: 52, height: 30, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: PALETTE.line,
    padding: 3,
  },
  tglThumb: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: PALETTE.mut,
    alignSelf: 'flex-start',
  },

  // Новые стили для сохраненного профиля
  profileCard: {
    backgroundColor: PALETTE.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PALETTE.line,
    marginBottom: 12,
  },
  profileAvatarContainer: {
    marginBottom: 16,
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
  },
  profileAvatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: PALETTE.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: PALETTE.accent,
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
  },
  profileName: {
    color: PALETTE.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  profileBio: {
    color: PALETTE.mut,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  hashtag: {
    color: PALETTE.accent,
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(0,230,168,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,230,168,0.2)',
  },
  sectionTitle: {
    color: PALETTE.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.line,
  },
  infoLabel: {
    color: PALETTE.mut,
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    color: PALETTE.text,
    fontSize: 14,
    fontWeight: '700',
  },

  // Стили для кнопок одинакового размера
  actionsContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  btnSave: {
    backgroundColor: PALETTE.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: PALETTE.accent,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  btnSaveText: {
    color: '#08131A',
    fontWeight: '800',
    fontSize: 12,
  },
  btnEdit: {
    backgroundColor: PALETTE.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    shadowColor: PALETTE.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  btnEditText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  btnSignOut: {
    backgroundColor: PALETTE.danger,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    shadowColor: PALETTE.danger,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  btnSignOutText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  btnReset: {
    backgroundColor: PALETTE.warn,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    shadowColor: PALETTE.warn,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  btnResetText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
