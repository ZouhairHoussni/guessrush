import { ArrowRight, Sparkles, UsersRound } from "lucide-react";

import { AppLogo } from "../../components/ui/AppLogo";
import { LinkButton } from "../../components/ui/Button";
import { AnimatedListItem, MotionPage } from "../../components/ui/Motion";
import { PageShell } from "../../components/ui/PageShell";
import { Panel } from "../../components/ui/Panel";

export function HomePage() {
  return (
    <PageShell narrow>
      <div className="flex min-h-[calc(100vh-2.5rem)] flex-col justify-between gap-10">
        <header className="pt-2">
          <AppLogo />
        </header>

        <MotionPage className="space-y-6 text-center">
          <Panel
            variant="hero"
            className="motion-winner-reveal mx-auto max-w-md border border-white/14 bg-white/12 text-white shadow-party sm:bg-paper sm:text-ink"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-brand-yellow-500 text-ink">
              <Sparkles size={30} aria-hidden />
            </div>
            <p className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl">
              Describe. One word. Mime. Beat the clock.
            </p>
            <p className="mx-auto mt-3 max-w-sm text-base font-semibold text-white/78 sm:text-muted">
              Create a room, invite friends by QR, and keep teams fair from the first join.
            </p>
          </Panel>
        </MotionPage>

        <nav className="space-y-3 pb-3 sm:hidden">
          <LinkButton
            to="/join"
            fullWidth
            className="text-lg"
          >
            <UsersRound size={20} aria-hidden />
            Join a game <ArrowRight size={22} aria-hidden />
          </LinkButton>
          <LinkButton
            to="/create"
            tone="secondary"
            fullWidth
            className="min-h-11 text-sm"
          >
            Hosting on this device?
          </LinkButton>
          <a
            href="#how-it-works"
            className="flex items-center justify-center pt-2 text-sm font-semibold text-white/72"
          >
            How it works
          </a>
        </nav>

        <nav className="hidden space-y-3 pb-3 sm:block">
          <LinkButton
            to="/create"
            fullWidth
            className="text-lg"
          >
            Create a game <ArrowRight size={22} aria-hidden />
          </LinkButton>
          <LinkButton
            to="/join"
            tone="secondary"
            fullWidth
          >
            <UsersRound size={20} aria-hidden />
            Join a game
          </LinkButton>
          <a
            href="#how-it-works"
            className="flex items-center justify-center pt-2 text-sm font-semibold text-white/72"
          >
            How it works
          </a>
        </nav>

        <section id="how-it-works" className="space-y-3 pb-8">
          <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-white/62">
            How it works
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {["Create a room", "Friends join by QR", "Play three rounds"].map((item, index) => (
              <AnimatedListItem key={item} index={index}>
                <Panel as="article" variant="soft" className="p-4 text-center">
                  <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-white/16 text-sm font-black">
                    {index + 1}
                  </span>
                  <p className="mt-3 font-bold">{item}</p>
                </Panel>
              </AnimatedListItem>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
