import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile, uploadAvatar, checkHandleAvailable } from '@/services/profiles';
import { Avatar } from '@/components/Avatar';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

export default function ProfileEditScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(profile?.name ?? '');
  const [handle, setHandle] = useState(profile?.handle ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [newAvatarLocal, setNewAvatarLocal] = useState<string | null>(null);

  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalHandle = profile?.handle ?? '';

  // Debounced handle availability check
  useEffect(() => {
    if (handleTimerRef.current) clearTimeout(handleTimerRef.current);

    const trimmed = handle.trim().toLowerCase();
    if (!trimmed || trimmed === originalHandle.toLowerCase()) {
      setHandleAvailable(null);
      setCheckingHandle(false);
      return;
    }

    setCheckingHandle(true);
    handleTimerRef.current = setTimeout(async () => {
      try {
        const available = await checkHandleAvailable(trimmed);
        setHandleAvailable(available);
      } catch {
        setHandleAvailable(null);
      } finally {
        setCheckingHandle(false);
      }
    }, 500);

    return () => {
      if (handleTimerRef.current) clearTimeout(handleTimerRef.current);
    };
  }, [handle, originalHandle]);

  const pickAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setNewAvatarLocal(result.assets[0].uri);
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;

    const trimmedName = name.trim();
    const trimmedHandle = handle.trim().toLowerCase();

    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    if (!trimmedHandle) {
      Alert.alert('Handle required', 'Please enter a handle.');
      return;
    }
    if (handleAvailable === false) {
      Alert.alert('Handle taken', 'That handle is already in use. Please choose another.');
      return;
    }

    setSaving(true);
    try {
      // Upload new avatar if changed
      if (newAvatarLocal) {
        await uploadAvatar(user.id, newAvatarLocal);
      }

      // Update text fields
      await updateProfile(user.id, {
        name: trimmedName,
        handle: trimmedHandle,
        bio: bio.trim(),
      });

      await refreshProfile();
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, name, handle, bio, handleAvailable, newAvatarLocal, refreshProfile, router]);

  const displayName = name.trim() || profile?.name || 'Builder';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={12}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Avatar
              uri={avatarUri}
              name={displayName}
              size="lg"
              showRing
            />
            <Pressable style={styles.changeAvatarBtn} onPress={pickAvatar}>
              <Text style={styles.changeAvatarText}>Change Photo</Text>
            </Pressable>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Handle */}
            <View style={styles.field}>
              <Text style={styles.label}>Handle</Text>
              <View style={styles.handleRow}>
                <Text style={styles.handlePrefix}>@</Text>
                <TextInput
                  style={[styles.input, styles.handleInput]}
                  value={handle}
                  onChangeText={(text) => setHandle(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="handle"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              {checkingHandle && (
                <Text style={styles.handleStatus}>Checking...</Text>
              )}
              {!checkingHandle && handleAvailable === true && (
                <Text style={[styles.handleStatus, styles.handleAvailable]}>Available</Text>
              )}
              {!checkingHandle && handleAvailable === false && (
                <Text style={[styles.handleStatus, styles.handleTaken]}>Already taken</Text>
              )}
            </View>

            {/* Bio */}
            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell the world what you build"
                placeholderTextColor={colors.text.tertiary}
                multiline
                textAlignVertical="top"
                maxLength={200}
              />
              <Text style={[styles.charCount, bio.length >= 200 && styles.charCountMax]}>{bio.length}/200</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom save button */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.text.primary,
  },
  cancelText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text.secondary,
  },
  saveText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.accent,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  changeAvatarBtn: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
  },
  changeAvatarText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.accent,
  },
  form: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text.primary,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  handlePrefix: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text.secondary,
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  handleInput: {
    flex: 1,
    paddingLeft: 28,
  },
  handleStatus: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.tertiary,
    marginLeft: 2,
  },
  handleAvailable: {
    color: '#2D936C',
  },
  handleTaken: {
    color: '#DC3545',
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  charCount: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'right',
  },
  charCountMax: {
    color: colors.accent,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.bg,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: '#fff',
  },
});
