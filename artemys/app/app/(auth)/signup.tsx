import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, radius } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { Avatar } from '@/components/Avatar';
import { checkHandleAvailable, uploadAvatar } from '@/services/profiles';
import {
  MAX_HANDLE_LENGTH,
  MIN_HANDLE_LENGTH,
  HANDLE_RULE_MESSAGE,
  hasMinimumHandleLength,
  isHandleValid,
  normalizeHandle,
} from '@/utils/validation';

const DEBOUNCE_MS = 500;

export default function SignupScreen() {
  const { signUp } = useAuth();

  // Step management
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 fields
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Handle availability
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Debounced handle check
  const checkHandle = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setHandleAvailable(null);

    if (!value || !hasMinimumHandleLength(value)) {
      setCheckingHandle(false);
      return;
    }

    setCheckingHandle(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const available = await checkHandleAvailable(value);
        setHandleAvailable(available);
      } catch {
        setHandleAvailable(null);
      } finally {
        setCheckingHandle(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const onHandleChange = (text: string) => {
    const cleaned = normalizeHandle(text);
    setHandle(cleaned);
    checkHandle(cleaned);
  };

  const handleContinue = () => {
    setError('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords don\u2019t match.');
      return;
    }

    setStep(2);
  };

  const handleCreateAccount = async () => {
    setError('');

    const trimmedName = name.trim();
    const trimmedHandle = normalizeHandle(handle);
    const trimmedBio = bio.trim();

    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (!hasMinimumHandleLength(trimmedHandle)) {
      setError(`Handle must be at least ${MIN_HANDLE_LENGTH} characters.`);
      return;
    }
    if (!isHandleValid(trimmedHandle)) {
      setError(HANDLE_RULE_MESSAGE);
      return;
    }
    if (checkingHandle) {
      setError('Wait for the handle availability check to finish.');
      return;
    }
    if (handleAvailable === false) {
      setError('That handle is already taken.');
      return;
    }

    setLoading(true);
    try {
      const available = handleAvailable ?? await checkHandleAvailable(trimmedHandle);
      setHandleAvailable(available);
      if (!available) {
        setError('That handle is already taken.');
        return;
      }

      const authResult = await signUp(email.trim(), password, {
        name: trimmedName,
        handle: trimmedHandle,
        bio: trimmedBio,
      });

      if (avatarUri && authResult.user && authResult.session) {
        try {
          await uploadAvatar(authResult.user.id, avatarUri);
        } catch {
          Alert.alert(
            'Profile photo skipped',
            'Your account was created, but the photo upload failed. You can add it later from Edit Profile.',
          );
        }
      }

      if (!authResult.session) {
        Alert.alert(
          'Check your email',
          avatarUri
            ? 'Confirm your email, then sign in to finish setup and add your profile photo.'
            : 'Confirm your email, then sign in to finish setup.',
        );
        router.replace('/login');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // Handle availability indicator
  const renderHandleStatus = () => {
    if (!handle || !hasMinimumHandleLength(handle)) return null;

    if (checkingHandle) {
      return (
        <View style={styles.handleStatus}>
          <ActivityIndicator size="small" color={colors.text.tertiary} />
          <Text style={[styles.handleStatusText, { color: colors.text.tertiary }]}>
            Checking...
          </Text>
        </View>
      );
    }

    if (handleAvailable === true) {
      return (
        <View style={styles.handleStatus}>
          <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
          <Text style={[styles.handleStatusText, { color: '#4CAF50' }]}>Available</Text>
        </View>
      );
    }

    if (handleAvailable === false) {
      return (
        <View style={styles.handleStatus}>
          <Ionicons name="close-circle" size={18} color="#D44" />
          <Text style={[styles.handleStatusText, { color: '#D44' }]}>Already taken</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>Artemys</Text>
            <Text style={styles.title}>
              {step === 1 ? 'Create your account' : 'Set up your profile'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'Show what you\u2019ve built' : 'How others will find you'}
            </Text>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
            </View>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {step === 1 ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.text.tertiary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor={colors.text.tertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    textContentType="newPassword"
                    autoComplete="new-password"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Confirm password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor={colors.text.tertiary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    textContentType="newPassword"
                    autoComplete="new-password"
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleContinue}
                >
                  <Text style={styles.buttonText}>Continue</Text>
                </Pressable>
              </>
            ) : (
              <>
                {/* Avatar picker */}
                <View style={styles.avatarSection}>
                  <Pressable onPress={pickAvatar} style={styles.avatarPicker}>
                    <Avatar uri={avatarUri} name={name || 'U'} size="lg" />
                    <View style={styles.avatarBadge}>
                      <Ionicons name="camera" size={14} color="#fff" />
                    </View>
                  </Pressable>
                  <Text style={styles.avatarHint}>Tap to add a photo</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your full name"
                    placeholderTextColor={colors.text.tertiary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    textContentType="name"
                    autoComplete="name"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Handle</Text>
                  <View style={styles.handleInputRow}>
                    <Text style={styles.handlePrefix}>@</Text>
                    <TextInput
                      style={[styles.input, styles.handleInput]}
                      placeholder="yourhandle"
                      placeholderTextColor={colors.text.tertiary}
                      value={handle}
                      onChangeText={onHandleChange}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="username"
                      autoComplete="username"
                      maxLength={MAX_HANDLE_LENGTH}
                    />
                  </View>
                  {renderHandleStatus()}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Bio <Text style={styles.optional}>(optional)</Text></Text>
                  <TextInput
                    style={[styles.input, styles.bioInput]}
                    placeholder="What are you building?"
                    placeholderTextColor={colors.text.tertiary}
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.stepButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.backButton,
                      pressed && styles.backButtonPressed,
                    ]}
                    onPress={() => { setError(''); setStep(1); }}
                  >
                    <Ionicons name="arrow-back" size={18} color={colors.text.secondary} />
                    <Text style={styles.backButtonText}>Back</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.button,
                      styles.createButton,
                      pressed && styles.buttonPressed,
                      loading && styles.buttonDisabled,
                    ]}
                    onPress={handleCreateAccount}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.buttonText}>Create Account</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.replace('/login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.accent,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stepDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  stepDotActive: {
    backgroundColor: colors.accent,
  },
  form: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text.primary,
  },
  optional: {
    fontFamily: fonts.body,
    color: colors.text.tertiary,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text.primary,
  },
  bioInput: {
    minHeight: 80,
    paddingTop: 14,
  },
  handleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  handlePrefix: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  handleInput: {
    flex: 1,
  },
  handleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  handleStatusText: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarPicker: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.accent,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  avatarHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
  errorBox: {
    backgroundColor: 'rgba(224,122,95,0.1)',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.accent,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 52,
  },
  buttonPressed: {
    backgroundColor: colors.accentHover,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: '#fff',
  },
  stepButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 15,
    paddingHorizontal: spacing.md,
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text.secondary,
  },
  createButton: {
    flex: 1,
    marginTop: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
  },
  footerLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.accent,
  },
});
