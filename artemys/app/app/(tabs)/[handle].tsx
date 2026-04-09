import { useLocalSearchParams } from 'expo-router';
import { ProfileScreen } from '@/components/ProfileScreen';

export default function UserProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  return <ProfileScreen handle={handle} />;
}
