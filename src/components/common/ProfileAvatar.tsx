import { Flame, Headphones, Heart, Mic, Moon, Music, Music4, Piano, Sparkles, Star } from 'lucide-react';
import { cn } from '../../lib/cn';
import { AVATARS, type AvatarId, type FrameId } from '../../lib/profile/look';

const ICONS: Record<AvatarId, typeof Piano> = {
  piano: Piano,
  note: Music,
  notes: Music4,
  headphones: Headphones,
  mic: Mic,
  star: Star,
  flame: Flame,
  moon: Moon,
  sparkles: Sparkles,
  heart: Heart,
};

/** Ring + glow per frame. Platinum gets a slow shimmer (skipped with reduced motion). */
const FRAME_STYLE: Record<FrameId, string> = {
  none: '',
  bronze: 'ring-[3px] ring-amber-700 ring-offset-2 ring-offset-slate-950',
  silver: 'ring-[3px] ring-slate-300 ring-offset-2 ring-offset-slate-950 shadow-[0_0_14px_rgba(226,232,240,0.35)]',
  gold: 'ring-[3px] ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.55)]',
  platinum:
    'ring-[3px] ring-cyan-300 ring-offset-2 ring-offset-slate-950 shadow-[0_0_22px_rgba(103,232,249,0.6),0_0_40px_rgba(167,139,250,0.35)] motion-safe:animate-pulse',
};

interface ProfileAvatarProps {
  name: string;
  avatar: AvatarId | null;
  frame: FrameId;
  /** Diameter in px. */
  size?: number;
  className?: string;
}

/** The learner's picture: a built-in avatar on its gradient, or their initial, inside their frame. */
export default function ProfileAvatar({ name, avatar, frame, size = 40, className }: ProfileAvatarProps) {
  const spec = avatar ? AVATARS.find((a) => a.id === avatar) : undefined;
  const Icon = spec ? ICONS[spec.id] : null;
  return (
    <div
      className={cn('relative flex shrink-0 items-center justify-center rounded-full text-[#ffffff]', FRAME_STYLE[frame], className)}
      style={{
        width: size,
        height: size,
        background: spec ? `linear-gradient(135deg, ${spec.from}, ${spec.to})` : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
      }}
      aria-hidden="true"
    >
      {Icon ? (
        <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.2} />
      ) : (
        <span className="font-black" style={{ fontSize: size * 0.42 }}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
