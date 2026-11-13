# Echord: design

Dark, Spotify-style app shell for a private chord library (style reference only; no Spotify names, logos or icons).

## System
- **Colors** (`app/globals.css`): app `#000` (gaps between panels), panel `#121212`, card `#181818` / hover `#282828`, surface `#2a2a2a`, ink `#fff`, muted `#b3b3b3`, line `#ffffff1a`, accent green `#1ed760` (on it: black), danger `#f3727f`. Dark only.
- **Type:** Satoshi only. Page titles 900 / -0.04em; section titles 24px bold; chords bold in the accent.
- **Shape:** 8px panels and cards, pill buttons and chips, round artist avatars. No blob shapes.
- **Interaction:** cards lift to the hover color and a green play button rises in; track rows turn their number into a play button; buttons scale 1.04 on hover and 0.96 on press; 2px white focus ring everywhere.
- **Motion:** React `<ViewTransition>`: covers morph from a track row into the song header; pages fade and rise 8px. All off under reduced motion.

## Shell (`app/(main)/layout.tsx`)
- **Desktop:** a sidebar (navigation + "Pustakamu" setlists), the main panel with its own scroll and a top bar that turns solid on scroll, and the player bar along the bottom.
- **Phones:** a full-bleed panel, a mini player, and bottom tabs.
- **Outside the shell:** stage mode (`app/(stage)`), share links (`app/s`), login, and 404.

## Player (`components/player`)
One `<audio>` in `PlayerProvider` that survives navigation. `/api/preview/[id]` returns the stored iTunes preview, or a fresh Deezer one, since Deezer links expire.
