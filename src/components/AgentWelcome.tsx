import * as React from "react";
import type { Role } from "../lib/types";
import { roleContent } from "../lib/agent-role-content";
const TITLE_WRITE_MS = 58;
const TITLE_ERASE_MS = 22;
const CJK_TITLE_WRITE_MS = 96;
const CJK_TITLE_ERASE_MS = 38;
const TITLE_HOLD_MS = 15_000;
export function AgentWelcome({ role }: { role: Role }) {
  const title = useTypewriterTitle(roleContent[role].prompts, false);
  return (
    <h1
      className="mb-8 min-h-24 text-center text-3xl font-semibold tracking-tight lg:min-h-12 lg:text-4xl"
      aria-label={roleContent[role].prompts[0]}
    >
      <span aria-hidden="true">{title}</span>
      <span
        className="ml-1 inline-block h-[0.9em] w-0.5 translate-y-[0.1em] rounded-full bg-muted-foreground motion-safe:animate-[composer-caret_1s_steps(1,end)_infinite]"
        aria-hidden="true"
      />
    </h1>
  );
}
// Copied from Agents Anywhere task-composer.
function useTypewriterTitle(titles: string[], paused: boolean) {
  const [titleIndex, setTitleIndex] = React.useState(0);
  const [typedTitle, setTypedTitle] = React.useState("");

  React.useEffect(() => {
    if (paused || titles.length === 0) return;

    const title = titles[titleIndex % titles.length] ?? titles[0] ?? "";
    const hasCjk = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(title);
    const writeDelay = hasCjk ? CJK_TITLE_WRITE_MS : TITLE_WRITE_MS;
    const eraseDelay = hasCjk ? CJK_TITLE_ERASE_MS : TITLE_ERASE_MS;
    let cancelled = false;
    let timeout: number | undefined;

    const schedule = (fn: () => void, delay: number) => {
      timeout = window.setTimeout(fn, delay);
    };

    const write = (count: number) => {
      if (cancelled) return;
      setTypedTitle(title.slice(0, count));
      if (count < title.length) {
        schedule(() => write(count + 1), writeDelay);
        return;
      }
      schedule(() => erase(title.length), TITLE_HOLD_MS);
    };

    const erase = (count: number) => {
      if (cancelled) return;
      setTypedTitle(title.slice(0, count));
      if (count > 0) {
        schedule(() => erase(count - 1), eraseDelay);
        return;
      }
      setTitleIndex((index) => (index + 1) % titles.length);
    };

    write(0);

    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [paused, titleIndex, titles]);

  return typedTitle;
}
