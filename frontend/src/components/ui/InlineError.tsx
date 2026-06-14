interface InlineErrorProps {
  message: string | null | undefined;
}

export function InlineError({ message }: InlineErrorProps) {
  if (!message) {
    return null;
  }
  return (
    <p
      role="alert"
      aria-live="assertive"
      className="rounded-2xl border border-brand-red-500/20 bg-[#fef3f2] px-4 py-3 text-sm font-bold text-[#b42318]"
    >
      {message}
    </p>
  );
}
