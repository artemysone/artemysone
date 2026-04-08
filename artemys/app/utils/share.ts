import { Share } from 'react-native';
import { projectUrl, profileUrl } from './linking';

function shareMessage(message: string, title?: string) {
  return Share.share(title ? { title, message } : { message });
}

export async function shareProfile(name: string, handle: string) {
  try {
    await shareMessage(`Check out ${name} (@${handle}) on Artemys\n${profileUrl(handle)}`);
  } catch {}
}

export async function shareProject(title: string, authorHandle?: string, projectId?: string) {
  const authorText = authorHandle ? ` by @${authorHandle}` : '';
  const url = projectId ? `\n${projectUrl(projectId)}` : '';

  try {
    await shareMessage(`Check out "${title}"${authorText} on Artemys${url}`, title);
  } catch {}
}
