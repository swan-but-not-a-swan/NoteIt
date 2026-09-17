# Note It

A photo and video journal. Take a picture, write what was happening in it, tag it, date it, file it in a folder — then find it again later by tag, by date, or by what you wrote.

Built with Expo / React Native for iOS and Android, by **SMKTechnologies**.

Everything stays on the device. There is no account, no sync and no server — your photos and notes are written to the app's own storage and never leave the phone.

---

## Contents

- [What a picture-note is](#what-a-picture-note-is)
- [Screens](#screens)
- [Using the app](#using-the-app)
  - [1. First launch](#1-first-launch)
  - [2. Add your first picture-note](#2-add-your-first-picture-note)
  - [3. Create a folder](#3-create-a-folder)
  - [4. Add a picture-note straight into a folder](#4-add-a-picture-note-straight-into-a-folder)
  - [5. Move between Folders and Gallery](#5-move-between-folders-and-gallery)
  - [6. Read a picture-note](#6-read-a-picture-note)
  - [7. Edit a note's text](#7-edit-a-notes-text)
  - [8. Delete a picture-note](#8-delete-a-picture-note)
  - [9. Rename, recolour or delete a folder](#9-rename-recolour-or-delete-a-folder)
  - [10. Search and filter the gallery](#10-search-and-filter-the-gallery)
  - [11. Compare picture-notes side by side](#11-compare-picture-notes-side-by-side)
  - [12. Save reusable snippets](#12-save-reusable-snippets)
  - [13. Format note text](#13-format-note-text)
  - [14. Share a note](#14-share-a-note)
  - [15. Switch between dark and light](#15-switch-between-dark-and-light)
- [Gesture reference](#gesture-reference)
- [Running it locally](#running-it-locally)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [How data is stored](#how-data-is-stored)
- [Building and releasing](#building-and-releasing)
- [Status](#status)

---

## What a picture-note is

A **picture-note** is the one thing this app stores. It is:

| Part | Required | Notes |
|---|---|---|
| A photo or a video | **Yes** | One per note. Picked from your library. |
| Written note | No | Free text. Supports simple bold/italic formatting. |
| Date | Yes | Defaults to today; you can set any date. |
| Tags | No | Lowercase, reusable across notes. |
| Folder | No | A note with no folder still appears in the Gallery. |

The photo is what you see; the note is what you wrote about it. The Gallery holds **every** picture-note. A folder holds a subset.

---

## Screens

| Route | Screen | What it does |
|---|---|---|
| `/` | Splash | Branded intro, then moves on to Home automatically. |
| `/(tabs)/home` | Home | Two tabs in one screen: **Folders** and **Gallery**. |
| `/(tabs)/folder/[id]` | Folder | One folder's picture-notes as a grid. |
| `/(tabs)/note/[id]` | Viewer | A full-bleed photo with its note; swipe through neighbours. |
| `/(tabs)/compare` | Compare | 2–4 picture-notes side by side. |
| `/(tabs)/settings` | Settings | Theme and snippets. |

---

## Using the app

### 1. First launch

1. Open the app. The **Note It** splash plays for a moment, then Home opens on its own.
2. Home opens on the **Folders** tab. It will be empty — there are no starter folders.
3. From here you can either create a folder first, or go straight to adding a picture-note. Neither depends on the other: a picture-note does not need a folder.

---

### 2. Add your first picture-note

1. On Home, tap the round **+** button in the middle of the bottom bar.
   *(Or put your finger anywhere on the bottom bar and swipe up — a "Swipe up to add note" hint appears, and releasing past it opens the same sheet.)*
2. The **New picture-note** sheet slides up.
3. Tap **Add photo or video**.
4. Grant photo-library access the first time you are asked. If you decline, the sheet tells you access is needed and no media is attached.
5. Pick one photo or one video. It appears as a preview at the top of the sheet — a video gets normal playback controls. To swap it, tap the small **×** on the preview and pick again.
6. Tap the **Note** field and write what was happening. This is optional; you can save a picture with no words.
7. Set **Day and date**:
   - **iOS** — tap the date shown and pick from the calendar popover.
   - **Android** — tap the date row to open the system date dialog.
   - It defaults to today, so skip this unless the photo is from another day.
8. Add **Tags**:
   - Type a tag into the tag box and press **enter**. It turns into a `#pill`.
   - A leading `#` is stripped for you, and tags are stored lowercase.
   - Tap the **×** on a pill to remove it.
   - Tags you have used before appear as a row of pills underneath — tap one to add it instead of retyping.
9. Choose a **Folder**:
   - **No folder (Gallery only)** is selected by default. The note still shows in the Gallery; it just is not filed anywhere.
   - Or tap a folder pill to file it there.
10. Tap **Save picture-note**.

> **The photo is the only required field.** If you tap save without one, the sheet says *"Add a photo or video first."* and stays open.

Tapping the **×** in the sheet header, or the dimmed area behind the sheet, closes it without saving.

---

### 3. Create a folder

1. Go to the **Folders** tab on Home.
2. Scroll to the bottom and tap the dashed **New folder** button.
3. Type a **folder name**. It is required, and it has to be different from your other folders (case is ignored, so "Trips" and "trips" clash).
4. *(Optional)* Give it a cover image:
   1. Tap the image slot.
   2. Pick a photo from your library.
   3. **Crop thumbnail** opens over the same sheet. **Drag** to reposition and **pinch** to zoom until the part you want fills the rounded window.
   4. Tap **Use Photo** to keep the crop, or **Cancel** to go back to the form without one.
   5. Once set, a **Remove** control lets you clear it again.
5. Pick a **colour** from the swatch row. It tints the folder's tile.
6. Tap **Create**.

The new folder appears in the list showing how many picture-notes are in it.

---

### 4. Add a picture-note straight into a folder

1. On the **Folders** tab, tap a folder to open it.
2. Tap the **…** menu in the top-right corner.
3. Tap **Add picture-note**.
4. Fill in the sheet exactly as in [step 2](#2-add-your-first-picture-note) — except the **Folder** field is already set to the folder you are standing in.
5. Tap **Save picture-note**. The grid behind the sheet refreshes with it.

The same **…** menu exists in the viewer, and it does the same thing: a note added from inside a folder stays in that folder.

---

### 5. Move between Folders and Gallery

Home holds both. To switch:

- Tap **Folders** or **Gallery** in the bottom bar, **or**
- Swipe left anywhere on the page to go to Gallery, swipe right to go back to Folders.

The screen title changes to match ("Your folders" / "Gallery"), and the incoming page slides in from the side you swiped.

**Folders** lists your folders with a note count each. **Gallery** is a three-across grid of every picture-note you own, folder or no folder.

---

### 6. Read a picture-note

1. Open the **Gallery** tab (or a folder).
2. Tap any tile. The viewer opens on that note.

Inside the viewer:

| To do this | Do that |
|---|---|
| Go to the next / previous note | Swipe **left** or **right** across the photo |
| Jump to a specific note | Tap a tile on the **filmstrip** under the photo |
| Open the written note | Swipe **up**, or tap the 📄 button in the header |
| Close the note again | Swipe **down**, or tap 📄 again |
| Leave the viewer | Swipe down from the top edge, or tap the back arrow |

Details worth knowing:

- Under the photo you always see the **first line** of the note. Swiping up promotes it to the full note, and the photo shrinks onto the filmstrip's highlighted tile as it goes.
- **While the note is open, sideways swiping is switched off** — use the filmstrip to move between notes instead. This is deliberate: it stops a reading gesture from throwing you onto a different note.
- The header shows your position, e.g. `3 / 17`.
- Which notes you can swipe through depends on where you came from. Opened from a folder, you move within that folder. Opened from the Gallery, you move through everything.
- The 📄 button is **lit** while the note is showing, so you can tell which of the two you are looking at.

---

### 7. Edit a note's text

1. Open the picture-note in the viewer.
2. Tap the **…** menu in the header.
3. Tap **Edit note**. The note opens automatically and its text becomes an editable field.
4. Change the text. Any snippets you have saved appear as chips underneath — tap one to append it.
5. Finish:
   - Tap the **✓** button to save.
   - Tap the **×** button (or the back arrow) to discard. If you actually changed something, you are asked to confirm first; if you did not, it just closes.

While you are editing, swiping is disabled in both directions, so a half-written edit cannot be lost by a stray gesture.

---

### 8. Delete a picture-note

1. Open the picture-note in the viewer.
2. Tap the **…** menu.
3. Tap **Delete note**.
4. Confirm. The note **and its photo or video file** are deleted. This cannot be undone.

After deleting, the viewer moves to the next note (or the previous one if there is no next). If that was the last note, the viewer closes itself.

---

### 9. Rename, recolour or delete a folder

1. On the **Folders** tab, tap the small **pencil** button on the folder's row. (Tapping the row itself opens the folder instead.)
2. **Edit folder** opens — the same sheet used for creating one, filled in.
3. Change the name, colour or cover image, then tap **Save changes**.

To delete it instead:

1. In that same sheet, tap the red **trash** button next to the *Edit folder* title.
2. Read the confirmation carefully. **Deleting a folder deletes the picture-notes inside it**, along with their photos and videos — the dialog tells you how many. It does not move them to the Gallery.
3. Confirm.

---

### 10. Search and filter the gallery

Quick date filtering, straight from the toolbar:

1. Go to the **Gallery** tab.
2. Tap one of the pills: **Any time**, **Today**, **7 days**, **30 days**. The grid narrows immediately and the toolbar reports how many matched.

For anything more specific:

1. Tap the **search bar** at the top of the Gallery.
2. The **Search picture-notes** sheet opens. Set any combination of:
   - **Text** — matched against the note body *and* tag names.
   - **Tags** — tap to select. Selecting more than one **narrows** the results: a note must have *all* of them, not any.
   - **Date range** — set a **from** date, a **to** date, or just one of the two. Each has its own clear button.
3. The button at the bottom updates live as you go — **Show 4 results**. Tap it to close the sheet and see them.
4. To reset, tap **Clear all** in the sheet, or the clear control on the toolbar summary line.

While a filter is active the search bar turns amber and reads back what is applied, e.g. `4 results · "harbour" · #trip · 1 Sep → 12 Sep`. Picking an explicit range replaces the pills with a **Custom range** chip.

---

### 11. Compare picture-notes side by side

1. Go to the **Gallery** tab.
2. Tap the **columns** button to the right of the search bar. A hint appears: *"Tap picture-notes to select up to 4 to compare side by side."*
3. Tap between **2 and 4** tiles. Selected tiles get an amber border; unselected ones dim.
4. Tap **Compare (n)** in the bar at the bottom. (It stays disabled until you have picked at least two.)
5. The Compare screen shows the notes as cards in the order you picked them, each with its photo, date, note text and tags. Scroll sideways when there are three or more.
6. Tap the **×** on a card to drop it from the comparison. This only affects this screen — nothing is deleted.
7. Tap back when you are done.

Tap **Cancel**, or switch tabs, to leave compare mode without going anywhere.

---

### 12. Save reusable snippets

A snippet is a phrase you drop into notes often, so you are not retyping it.

**To create one:**

1. Tap the **gear** button in the top-right of Home.
2. Scroll to **Snippets**.
3. Type a short **name** into the "Name a snippet..." field — this is the label you will see on the chip later — and tap **Add**. (The button stays dimmed until you have typed something.)
4. **Write the snippet** opens, already focused. Write the actual **text** of the snippet — this is what gets inserted, and it can be a full sentence or a paragraph. Bold and italic markers work here too.
5. Tap **Save snippet**.

**To use one:** while writing a note — either in the New picture-note sheet or while editing a note in the viewer — tap its chip. The snippet is **appended to the end** of whatever you have written, with a single space in front of it. It does not insert at the cursor.

**To change or remove one:** tap the snippet's row in Settings. **Edit snippet** opens with both the name and the text editable — tap **Save changes**, or the red **trash** button in its header to delete it.

---

### 13. Format note text

Note text supports two inline styles:

| You type | You get |
|---|---|
| `**important**` | **important** |
| `*quietly*` or `_quietly_` | *quietly* |

The markers are shown as-is while you are typing, and rendered when the note is displayed — in the viewer, on compare cards, and in snippet previews. Nothing else from Markdown is supported: no headings, links, lists or code.

---

### 14. Share a note

1. Open the picture-note in the viewer.
2. Tap the **share** button in the header.
3. Pick a destination from the system share sheet.

What gets shared is the **text**: the note body, then its tags as `#hashtags`, then the date. The photo itself is not attached.

---

### 15. Switch between dark and light

1. Tap the **gear** button in the top-right of Home.
2. Under **Appearance**, tap **Dark** or **Light**.

The change applies immediately across the app and is remembered. The app picks its own theme rather than following the phone's system setting, so a light-mode phone can still run the dark theme.

---

## Gesture reference

| Where | Gesture | Result |
|---|---|---|
| Home | Swipe left / right | Switch between Folders and Gallery |
| Home, bottom bar | Swipe up | Open the New picture-note sheet |
| Home, bottom bar | Tap **+** | Open the New picture-note sheet |
| Folders list | Tap a row | Open that folder |
| Folders list | Tap the pencil | Edit that folder |
| Gallery / folder grid | Tap a tile | Open it in the viewer |
| Gallery grid, compare mode | Tap a tile | Select / deselect it |
| Viewer | Swipe left / right | Previous / next note *(only while the note is closed)* |
| Viewer | Swipe up | Open the written note |
| Viewer | Swipe down | Close the written note |
| Viewer filmstrip | Tap a tile | Jump to that note, keeping the note open |
| Folder cover cropper | Drag / pinch | Reposition and zoom the crop |
| Any sheet | Tap the dimmed backdrop | Close without saving |

---

## Running it locally

### Prerequisites

- [Bun](https://bun.sh) 1.4.0 — the version this project pins for builds
- The [EAS CLI](https://docs.expo.dev/eas/) for device builds, run through `bunx eas-cli`
- An iOS or Android device, or a simulator/emulator

### Install

```bash
bun install
```

### Start the dev server

```bash
bunx expo start
```

> **Expo Go will not run this app.** It uses native modules that Expo Go does not bundle — Google Mobile Ads, RevenueCat, the video thumbnailer and the native date picker. You need a **development build**.

### Get a development build onto a device

Locally, if you have the platform toolchain installed:

```bash
bunx expo run:android
```

```bash
bunx expo run:ios
```

Or in the cloud, with no Xcode or Android Studio needed:

```bash
bunx eas-cli build --profile development --platform android
```

Install the resulting build once, then `bunx expo start` connects to it for day-to-day work.

### Checks

Run both before pushing:

```bash
bunx tsc --noEmit
```

```bash
bunx expo lint
```

### A note on the web preview

`bunx expo start --web` runs, and is useful for checking layout, but two things are switched off there because the browser has no equivalent:

- **Picking a photo or video** — the sheet tells you to test it on a device.
- **The date picker** — same.

Ads (the folder banner and the viewer's end-of-list page) also render nothing on web. Treat the web build as a layout preview, not a way to exercise the app.

---

## Environment variables

Local values live in `.env`, which is **git-ignored** — copy the keys below and fill in your own. `EXPO_PUBLIC_` variables are inlined into the JS bundle at build time, so they must also be set on EAS or a cloud build will ship empty strings.

| Variable | Used for |
|---|---|
| `EXPO_PUBLIC_RC_ANDROID_KEY` | RevenueCat public SDK key for Play Billing (`goog_…`) |
| `EXPO_PUBLIC_RC_IOS_KEY` | RevenueCat public SDK key for StoreKit (`appl_…`) |
| `EXPO_PUBLIC_RC_TEST_KEY` | RevenueCat Test Store key (`test_…`) — routes purchases to RevenueCat's own test store so no Play/App Store account is needed |
| `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` | Real AdMob banner unit id for Android |
| `EXPO_PUBLIC_ADMOB_BANNER_IOS` | Real AdMob banner unit id for iOS |
| `EXPO_PUBLIC_ADMOB_NATIVE_ANDROID` | Real AdMob **native** unit id for Android — the ad page at the end of the picture-note viewer |
| `EXPO_PUBLIC_ADMOB_NATIVE_IOS` | Real AdMob native unit id for iOS |
| `EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS` | Comma-separated device ids allowed to receive test creatives from real ad units |

Safety rails already built in, so you do not have to remember them:

- **RevenueCat's public SDK keys are safe to ship** — they identify the app and authorise nothing. The *secret* API key is server-side only and must never appear in `.env`.
- **The Test Store key is ignored in release builds** and logs a warning, so a test key left in the environment cannot hand out Pro to everybody.
- **Development builds always request Google's test ad unit**, never a real one. Impressions you generate on your own live ads count as invalid traffic and AdMob suspends accounts for it, so the dev path is structurally unable to request a real unit.
- If no banner or native unit is configured, the app falls back to Google's test unit rather than collapsing the layout.

---

## Project structure

```
app/                      Expo Router routes — every file here is a screen
  _layout.tsx             Root: fonts, theme, entitlements, splash gate
  index.tsx               Branded splash, then redirects to Home
  (tabs)/
    _layout.tsx           Stack for everything below
    home.tsx              Folders + Gallery, the compose sheet, search, compare mode
    folder/[id].tsx       One folder's grid
    note/[id].tsx         The viewer screen: header, card, filmstrip, ad slot
    compare.tsx           Side-by-side cards
    settings.tsx          Appearance and snippets

components/               Presentational pieces, all fully controlled
  AddNote.tsx             The New picture-note sheet
  ViewNote.tsx            The pager: photo, note, filmstrip, open/close gesture
  FilmStrip.tsx           The contact strip under the photo
  GalleryGrid.tsx         Three-across tiles, incl. compare selection
  GalleryToolbar.tsx      Search button and date preset pills
  SearchNotesModal.tsx    Text / tags / date-range sheet
  FoldersList.tsx         Folder rows + the ad placement
  Folder.tsx              One folder row
  NewFolder.tsx           Create/edit folder sheet
  ThumbnailCropper.tsx    Pan/pinch crop window for folder covers
  NewSnippet.tsx          Snippet editor
  MarkdownText.tsx        Renders **bold** / *italic* spans
  MediaThumb.tsx          Thumbnail (or full-size photo) with video badge
  OverflowMenu.tsx        The "…" menu
  TopBar.tsx              Title, back arrow, right-hand slot
  BottomTabBar.tsx        Folders | + | Gallery, with swipe-up-to-add
  AdBannerStrip.tsx       The banner placement
  EndAd.tsx               The native ad page after the viewer's last note
  in-app-splash.tsx       The animated splash

lib/                      Logic kept out of components so it can be read and tested
  useAddNote.ts           Compose state + the whole save pipeline
  noteHelper.ts           Note filtering, the pager's rules, snippet joining, saving a new note
  mediaHelper.ts          Copying media into app storage, thumbnails
  entitlements.ts         RevenueCat reads
  EntitlementsContext.tsx Entitlement state for the tree
  purchases.ts            Which SDK key applies, and when
  paywall.ts              Paywall and Customer Center presentation
  ads.ts                  Ad unit selection, consent, SDK init
  date.ts                 Small pure helpers
  useNavigateOnce.ts      Stops a double-tap pushing the same route twice

models/                   The four stored shapes: Note, Folder, Tag, Snippet
persistence/FileStorage.ts  Every read and write to AsyncStorage
theme/                    Colour tokens + hexToRgba, font names, icon fonts, theme context, styles/
```

Path alias: `@/` maps to the project root, so `@/lib/date` and `@/components/TopBar` work from anywhere.

---

## How data is stored

Two places, both local to the device:

**AsyncStorage** — the structured data:

| Key | Holds |
|---|---|
| `folders` | The whole folder array |
| `noteIds` | The list of note ids |
| `note:<id>` | One picture-note each |
| `tags` | The whole tag array |
| `snippets` | The whole snippet array |
| `themeMode` | `"dark"` or `"light"` |

Notes are stored one key per note and read back with a single `multiGet`, so a note can be written without rewriting every other note. Folders, tags and snippets are small enough to live in one key each — which is also what makes deleting one of them just "save the rest".

**The app's document directory** — the files:

| Directory | Holds |
|---|---|
| `note-media/` | The photo or video for each picture-note, plus its generated thumbnail |
| `folder-thumbnails/` | Cropped folder cover images |

Media is **copied** into app storage when a note is saved, not referenced in place, so the note survives the original being deleted from your library. Thumbnails are generated once at save time — a video's first frame, or a tile-sized copy of a photo — so the grid is not decoding full camera resolution per cell. If thumbnail generation fails on an unusual codec, the note still saves and the tile falls back.

Deletes cascade. Deleting a note removes its record, its media file and its thumbnail. Deleting a folder does that for every note inside it, plus the folder's cover.

### Data model note

A note carries a `folderId`; folders do not carry a list of note ids. That is the single source of truth for folder membership, and it is why opening a note can always tell you which folder it is in without a second lookup. Folder counts are computed with one grouping pass over the notes.

---

## Building and releasing

Build profiles are in `eas.json`:

| Profile | What it produces |
|---|---|
| `development` | Dev-client APK, internal distribution — the one to install for daily work |
| `preview` | Release-mode APK, internal distribution — for sharing a testable build |
| `production` | Store-ready build, with the build number auto-incremented |

```bash
bunx eas-cli build --profile preview --platform android
```

```bash
bunx eas-cli build --profile production --platform all
```

Submitting to Google Play's internal track:

```bash
bunx eas-cli submit --profile production --platform android
```

Identity, set and final:

- Bundle identifier / Android package: `com.smktechnologies.noteit`
- EAS project: `@reacttut/noteit`
- `appVersionSource` is `remote`, so EAS owns the build number — do not bump it by hand.

`ios/` and `android/` are generated (Continuous Native Generation) and git-ignored. Never edit them by hand; change `app.json` or a config plugin instead.

---

## Status

Working end to end: folders, picture-notes, the gallery, search and filtering, compare, the viewer with in-place editing, snippets, theming, and the Android banner placement.

Known gaps, so nobody goes looking for them:

- **Nothing is for sale yet.** The RevenueCat entitlement (`noteit_pro`), the paywall and the Customer Center are all implemented in `lib/`, but no screen calls them — there is no "Go Pro" or "Restore purchases" button anywhere in the UI. The entitlement is read for one purpose today: hiding the ad banner from anyone who already holds it.
- **The viewer's ad slot is a reserved space, not a banner.** The real banner renders in the folders list only.
- **Fonts are heavier than they need to be.** The Google Fonts packages pull in every weight per family, not the seven actually used, which delays first paint. Deep-importing the specific weights fixes it.
