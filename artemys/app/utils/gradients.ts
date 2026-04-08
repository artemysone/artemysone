export const GRADIENTS: readonly [string, string][] = [
  ['#F4845F', '#F7B267'],
  ['#7B2FBE', '#4A90D9'],
  ['#2D936C', '#47B5A0'],
  ['#E07A5F', '#F2CC8F'],
  ['#D84797', '#F09ABC'],
  ['#3D5A80', '#98C1D9'],
  ['#CB4B16', '#F5A623'],
  ['#7C6AEF', '#C084FC'],
  ['#0F766E', '#5EEAD4'],
];

export function getGradient(id: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}
