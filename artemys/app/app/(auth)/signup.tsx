import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

export default function SignupScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Show what you've built</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 8,
  },
});
