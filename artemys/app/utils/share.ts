import { Share } from 'react-native';

function shareMessage(message: string, title?: string) {
  return Share.share(title ? { title, message } : { message });
}

export async function shareProfile(name: string, handle: string) {
  try {
    await shareMessage(`Check out ${name} (@${handle}) on Artemys`);
  } catch {}
}

export async function shareProject(title: string, authorHandle?: string) {
  const authorText = authorHandle ? ` by @${authorHandle}` : '';

  try {
    await shareMessage(`Check out "${title}"${authorText} on Artemys`, title);
  } catch {}
}
