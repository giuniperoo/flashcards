import { pick, type CopyArgs, type CopyKey } from "@/lib/copy";

/*
 * Words on the page, in both voices at once. The server prerenders pages that
 * are the same for everyone, so it cannot know which voice a reader is in;
 * it renders both, and CSS keyed off `data-voice` on `<html>`, which the
 * pre-paint script sets, shows one. Nothing is swapped after load, so nothing
 * flashes, and the markup hydrates as it was served. See `app/globals.css`.
 *
 * No hooks and no directive, so a server component and a client component can
 * both render these. A string that cannot be markup, such as an `aria-label`
 * or a `placeholder`, comes from `useSay` in `lib/useSay.ts` instead.
 */

type SayProps<K extends CopyKey> = CopyArgs<K> extends []
  ? { k: K; args?: undefined }
  : { k: K; args: CopyArgs<K> };

/** One entry from `lib/copy.ts`, both voices. */
export function Say<K extends CopyKey>({ k, args }: SayProps<K>) {
  const a = (args ?? []) as CopyArgs<K>;
  return (
    <>
      <span className="voice-plain">{pick(k, "plain", ...a)}</span>
      <span className="voice-swearengen">{pick(k, "swearengen", ...a)}</span>
    </>
  );
}

/** A passage with markup inside it, which one string from the table cannot hold. */
export function Voiced({ plain, swearengen }: { plain: React.ReactNode; swearengen: React.ReactNode }) {
  return (
    <>
      <span className="voice-plain">{plain}</span>
      <span className="voice-swearengen">{swearengen}</span>
    </>
  );
}
