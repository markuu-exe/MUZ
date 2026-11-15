interface CheckButtonProps {
  disabled: boolean;
  hidden: boolean;
  onClick: () => void;
}

/** The "Check" button every answer exercise uses. Hidden once submitted (the player shows Continue). */
export default function CheckButton({ disabled, hidden, onClick }: CheckButtonProps) {
  if (hidden) return null;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(168,85,247,0.45)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
    >
      Check
    </button>
  );
}
