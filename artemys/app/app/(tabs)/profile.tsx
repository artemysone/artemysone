import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileTab() {
  const { profile } = useAuth();
  if (!profile?.handle) return null;
  return <Redirect href={{ pathname: '/[handle]', params: { handle: profile.handle } }} />;
}
