import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';
import { formatVersionLabel } from '@/utils/version';

type VersionPillProps = {
  version: string;
  size?: 'sm' | 'md';
};

export function VersionPill({ version, size = 'md' }: VersionPillProps) {
  const isSm = size === 'sm';
  return (
    <View style={[styles.pill, isSm && styles.pillSm]}>
      <Text style={[styles.text, isSm && styles.textSm]}>
        {formatVersionLabel(version)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    alignSelf: 'flex-start',
  },
  pillSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 11,
  },
});
