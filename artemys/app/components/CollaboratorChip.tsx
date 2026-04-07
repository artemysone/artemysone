import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { colors } from '@/constants/Colors';
import { fonts } from '@/constants/Typography';

interface CollaboratorChipProps {
  name: string;
  avatarUrl?: string | null;
  onRemove: () => void;
}

export function CollaboratorChip({ name, avatarUrl, onRemove }: CollaboratorChipProps) {
  return (
    <View style={styles.chip}>
      <Avatar uri={avatarUrl} name={name} size="sm" />
      <Text style={styles.name}>{name}</Text>
      <Pressable style={styles.removeBtn} onPress={onRemove}>
        <Ionicons name="close" size={12} color={colors.text.secondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    paddingLeft: 6,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.input,
  },
  name: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.primary,
  },
  removeBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});
