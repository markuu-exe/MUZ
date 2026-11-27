/**
 * Settings → Profile: display name, a built-in avatar (no uploads) and a frame
 * unlocked by the learner tier. In demo mode changes stay in memory only.
 */
import { useEffect, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  AVATARS,
  FRAMES,
  NAME_MAX,
  frameUnlocked,
  normalizeDisplayName,
  validateDisplayName,
  type ProfileLook,
} from '../../lib/profile/look';
import ProfileAvatar from '../common/ProfileAvatar';

interface ProfileEditorProps {
  name: string;
  look: ProfileLook;
  exp: number;
  isDemo: boolean;
  onSaveName: (name: string) => Promise<string | null>;
  onSaveLook: (look: ProfileLook) => Promise<string | null>;
}

export default function ProfileEditor({ name, look, exp, isDemo, onSaveName, onSaveLook }: ProfileEditorProps) {
  const [draftName, setDraftName] = useState(name);
  const [draftLook, setDraftLook] = useState<ProfileLook>(look);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => setDraftName(name), [name]);
  useEffect(() => setDraftLook(look), [look.avatar, look.frame]); // eslint-disable-line react-hooks/exhaustive-deps

  const normalized = normalizeDisplayName(draftName);
  const nameProblem = normalized === name ? null : validateDisplayName(normalized);
  const nameChanged = normalized !== name;
  const lookChanged = draftLook.avatar !== look.avatar || draftLook.frame !== look.frame;
  const canSave = !busy && (lookChanged || (nameChanged && !isDemo)) && !nameProblem;

  const save = async () => {
    setBusy(true);
    setMessage(null);
    let error: string | null = null;
    if (nameChanged && !isDemo) error = await onSaveName(normalized);
    if (!error && lookChanged) error = await onSaveLook(draftLook);
    setBusy(false);
    setMessage(error ? { tone: 'error', text: error } : { tone: 'ok', text: isDemo ? 'Updated for this demo (not saved).' : 'Profile saved.' });
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
      <div className="flex items-center gap-4">
        <ProfileAvatar name={normalized || name} avatar={draftLook.avatar} frame={draftLook.frame} size={64} />
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white">Profile</h2>
          <p className="text-xs text-slate-400">How you appear in MUZ. Frames unlock as you earn EXP.</p>
        </div>
      </div>

      <label htmlFor="display-name" className="mt-6 block text-xs font-bold uppercase tracking-wider text-slate-400">
        Display name
      </label>
      <input
        id="display-name"
        value={draftName}
        onChange={(e) => setDraftName(e.target.value)}
        maxLength={NAME_MAX + 8}
        disabled={isDemo}
        className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-violet-400 disabled:opacity-60"
      />
      {isDemo && <p className="mt-1 text-xs text-slate-400">Sign in to change your name.</p>}
      {nameProblem && <p className="mt-1 text-xs text-rose-300">{nameProblem}</p>}

      <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">Avatar</p>
      <div className="mt-3 grid grid-cols-6 gap-3 sm:grid-cols-11" role="radiogroup" aria-label="Avatar">
        <button
          type="button"
          role="radio"
          aria-checked={draftLook.avatar === null}
          aria-label="Your initial"
          onClick={() => setDraftLook((l) => ({ ...l, avatar: null }))}
          className={cn('rounded-full p-0.5 transition', draftLook.avatar === null ? 'ring-2 ring-violet-400' : 'opacity-70 hover:opacity-100')}
        >
          <ProfileAvatar name={normalized || name} avatar={null} frame="none" size={40} />
        </button>
        {AVATARS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={draftLook.avatar === a.id}
            aria-label={a.label}
            onClick={() => setDraftLook((l) => ({ ...l, avatar: a.id }))}
            className={cn('rounded-full p-0.5 transition', draftLook.avatar === a.id ? 'ring-2 ring-violet-400' : 'opacity-70 hover:opacity-100')}
          >
            <ProfileAvatar name={name} avatar={a.id} frame="none" size={40} />
          </button>
        ))}
      </div>

      <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">Frame</p>
      <div className="mt-3 flex flex-wrap gap-3" role="radiogroup" aria-label="Frame">
        {FRAMES.map((f) => {
          const open = frameUnlocked(f, exp);
          const on = draftLook.frame === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={!open}
              disabled={!open}
              onClick={() => setDraftLook((l) => ({ ...l, frame: f.id }))}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                on ? 'border-violet-400 bg-violet-500/15 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500',
                !open && 'cursor-not-allowed opacity-50 hover:border-slate-700',
              )}
            >
              <ProfileAvatar name={name} avatar={draftLook.avatar} frame={f.id} size={26} />
              {f.label}
              {!open && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Lock className="h-3 w-3" aria-hidden="true" /> {f.minExp.toLocaleString()} EXP
                </span>
              )}
              {on && <Check className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void save()}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save profile'}
        </button>
        {message && (
          <p role="status" className={cn('text-xs font-semibold', message.tone === 'ok' ? 'text-emerald-300' : 'text-rose-300')}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
