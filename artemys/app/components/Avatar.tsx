import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { colors } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

const SIZES = {
  xs: { container: 22, font: 8 },
  sm: { container: 28, font: 10 },
  md: { container: 36, font: 13 },
  lg: { container: 80, font: 28 },
} as const;

const DEFAULT_GRADIENT: [string, string] = [colors.accent, colors.gold];

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  gradient?: readonly [string, string] | [string, string];
  showRing?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ uri, name, size = 'md', gradient, showRing }: AvatarProps) {
  const { container, font } = SIZES[size];
  const borderRadius = container / 2;
  const grad = (gradient as [string, string]) ?? DEFAULT_GRADIENT;

  if (uri) {
    if (showRing) {
      const ringSize = container + 8;
      return (
        <LinearGradient colors={grad} style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
          <Image source={{ uri }} style={[styles.imageInRing, { width: container, height: container, borderRadius }]} />
        </LinearGradient>
      );
    }
    return <Image source={{ uri }} style={{ width: container, height: container, borderRadius }} />;
  }

  if (showRing) {
    const ringSize = container + 8;
    return (
      <LinearGradient colors={grad} style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
        <View style={[styles.initialsContainer, { width: container, height: container, borderRadius }]}>
          <Text style={[styles.initials, { fontSize: font }]}>{getInitials(name)}</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={grad} style={{ width: container, height: container, borderRadius, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[styles.initials, { fontSize: font, color: '#fff' }]}>{getInitials(name)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  ring: {
    padding: 3,
  },
  imageInRing: {
    flex: 1,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  initialsContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontFamily: fonts.display,
    color: colors.accent,
  },
});
