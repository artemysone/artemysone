import { Share } from 'react-native';

export async function shareProfile(name: string, handle: string) {
  try {
    await Share.share({
      message: `Check out ${name} (@${handle}) on Artemys`,
    });
  } catch {}
}
