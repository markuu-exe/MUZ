import type { ProfileStatus } from '../../types/auth.types';

export const PROFILE_STATUS_MESSAGES: Partial<Record<ProfileStatus, string>> = {
  not_found: 'Profile not found. Message wording pending (U-37).',
  failed: 'Profile could not be loaded. Message wording pending (U-37).',
};

export interface ProfileHudPresentation {
  showValues: boolean;
  message: string | null;
  canRetry: boolean;
}

export function profileHudPresentation(status: ProfileStatus): ProfileHudPresentation {
  return {
    showValues: status === 'loaded',
    message: PROFILE_STATUS_MESSAGES[status] ?? null,
    canRetry: status === 'failed',
  };
}
