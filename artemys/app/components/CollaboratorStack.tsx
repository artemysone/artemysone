import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { colors } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

interface StackItem {
  name: string;
  avatar_url?: string | null;
}

interface CollaboratorStackProps {
  collaborators: StackItem[];
  max?: number;
}

export function CollaboratorStack({ collaborators, max = 4 }: CollaboratorStackProps) {
  const visible = collaborators.slice(0, max);
  const overflow = collaborators.length - max;

  return (
    <View style={styles.row}>
      <View style={styles.stack}>
        {visible.map((c, i) => (
          <View key={i} style={[styles.dotWrapper, { marginLeft: i > 0 ? -6 : 0 }]}>
            <Avatar uri={c.avatar_url} name={c.name} size="sm" />
          </View>
        ))}
        {overflow > 0 && (
          <View style={[styles.overflowDot, { marginLeft: -6 }]}>
            <Text style={styles.overflowText}>+{overflow}</Text>
          </View>
        )}
      </View>
      <Text style={styles.label}>{collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stack: {
    flexDirection: 'row',
  },
  dotWrapper: {
    borderWidth: 2,
    borderColor: colors.card,
    borderRadius: 14,
  },
  overflowDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.card,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
  },
});
