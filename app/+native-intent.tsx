// Where a link from outside the app should land, before Expo Router matches it.
//
// Tapping a .noteit file in a chat app (or Files, AirDrop, Mail) opens NoteIt
// with that file's address as the link: content://… on Android, file://… on
// iOS. Neither is a route, so on its own the router would show "unmatched
// route". Both are sent to the import preview instead, which reads the file
// from `?uri=`. Every other link passes through untouched.
//
// Runs for a cold start (initial: true) and for a file opened while the app
// is already running.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (path.startsWith("content://") || path.startsWith("file://")) {
      return `/import?uri=${encodeURIComponent(path)}`;
    }
    return path;
  } catch {
    //* a link that can't be handled shouldn't stop the app opening
    return "/";
  }
}
