/**
 * Profile look: display name rules, the built-in avatar set (no uploads) and
 * frames unlocked by the learner tiers. Avatar and frame are stored in the
 * account's auth user_metadata (like placement), so no schema change is needed;
 * the display name is profiles.username (unique, own-row update already allowed).
 * Frames are cosmetic, so a client-side unlock check is enough.
 */

export const NAME_MIN = 3;
export const NAME_MAX = 24;
const NAME_PATTERN = /^[\p{L}\p{N} _.-]+$/u;

export function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** Problem with the name in plain words, or null when it is fine. Pass the normalised name. */
export function validateDisplayName(name: string): string | null {
  if (name.length < NAME_MIN) return `Use at least ${NAME_MIN} characters.`;
  if (name.length > NAME_MAX) return `Use at most ${NAME_MAX} characters.`;
  if (!NAME_PATTERN.test(name)) return 'Use letters, numbers, spaces, dots, dashes or underscores.';
  return null;
}

export type AvatarId = 'piano' | 'note' | 'notes' | 'headphones' | 'mic' | 'star' | 'flame' | 'moon' | 'sparkles' | 'heart';

/** Built-in avatars: an icon (lucide name) on a gradient. */
export const AVATARS: ReadonlyArray<{ id: AvatarId; label: string; from: string; to: string }> = [
  { id: 'piano', label: 'Piano', from: '#8b5cf6', to: '#d946ef' },
  { id: 'note', label: 'Note', from: '#10b981', to: '#06b6d4' },
  { id: 'notes', label: 'Notes', from: '#f59e0b', to: '#ef4444' },
  { id: 'headphones', label: 'Headphones', from: '#3b82f6', to: '#8b5cf6' },
  { id: 'mic', label: 'Microphone', from: '#ec4899', to: '#f97316' },
  { id: 'star', label: 'Star', from: '#eab308', to: '#f59e0b' },
  { id: 'flame', label: 'Flame', from: '#ef4444', to: '#f97316' },
  { id: 'moon', label: 'Moon', from: '#6366f1', to: '#0ea5e9' },
  { id: 'sparkles', label: 'Sparkles', from: '#14b8a6', to: '#a855f7' },
  { id: 'heart', label: 'Heart', from: '#f43f5e', to: '#a855f7' },
];

export type FrameId = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

/** Frames follow the learner tiers in src/lib/dashboard/curriculum.ts (learnerTier). */
export const FRAMES: ReadonlyArray<{ id: FrameId; label: string; minExp: number }> = [
  { id: 'none', label: 'No frame', minExp: 0 },
  { id: 'bronze', label: 'Bronze', minExp: 0 },
  { id: 'silver', label: 'Silver', minExp: 1000 },
  { id: 'gold', label: 'Gold', minExp: 2000 },
  { id: 'platinum', label: 'Platinum', minExp: 4000 },
];

export function frameUnlocked(frame: { minExp: number }, exp: number): boolean {
  return exp >= frame.minExp;
}

export interface ProfileLook {
  avatar: AvatarId | null;
  frame: FrameId;
}

/** Read the look from auth user_metadata, keeping only known ids. */
export function readLook(meta: Record<string, unknown> | null | undefined): ProfileLook {
  const avatar = AVATARS.find((a) => a.id === meta?.avatar)?.id ?? null;
  const frame = FRAMES.find((f) => f.id === meta?.frame)?.id ?? 'none';
  return { avatar, frame };
}
