import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { Directory, File, FileMode, Paths, type FileHandle } from "expo-file-system";
import * as Crypto from "expo-crypto";
import {
  EXPORT_MAGIC,
  EXPORT_VERSION,
  type ExportedFile,
  type ExportedFolder,
  type ExportedNote,
  type ExportedPayload,
} from "@/models/ExportModel";
import type { FolderModel } from "@/models/FolderModel";
import type { NoteModel, TagModel } from "@/models/NoteModel";
import { createThumbnailAsync, deleteFileIfExists } from "@/lib/mediaHelper";
import { saveTagsAsync } from "@/lib/noteHelper";
import {
  deleteNotesFromStorageAsync,
  getFoldersFromStorageAsync,
  getTagsFromStorageAsync,
  setFoldersToStorageAsync,
  setNoteToStorageAsync,
} from "@/persistence/FileStorage";

/**
 * The seam between the export/import UI and the .noteit container.
 *
 * A container is laid out as:
 *
 *   [0..7]    EXPORT_MAGIC, ASCII
 *   [8..11]   manifest length in bytes, uint32 little-endian
 *   [12..n]   the manifest — an ExportPayload as UTF-8 JSON
 *   [n..]     every blob in `payload.files`, in that order, each exactly
 *             `length` bytes, back to back
 *
 * Importing is staged: the file is unpacked into the cache and checked before
 * anything touches the library, so it can be looked through first and then
 * either committed or thrown away.
 */

/** A failure worth showing as-is. The screens print `message` verbatim; any
 *  other error is a bug and gets their own fallback sentence instead. */
export class TransferError extends Error { }

/** Thrown when the user cancelled. Not a failure: callers stay quiet. */
export class TransferCancelledError extends Error {}

/** Reports work done as (finished, total) — files written or unpacked. */
export type TransferProgress = (done: number, total: number) => void;

/** Flipped to cancelled: true by whoever started the work; checked between chunks. */
export type TransferSignal = { cancelled: boolean };

/** The type iOS knows a .noteit by — declared in app.json's infoPlist. */
export const EXPORT_UTI = "com.smktechnologies.noteit.export";

const HEADER_BYTES = 12;
//* a manifest is text describing notes; anything near this is not one
const MAX_MANIFEST_BYTES = 1024 * 1024;
//* how much of a photo or video is held in memory at once while copying
const CHUNK_BYTES = 1024 * 1024;

const getExportDir = () => new Directory(Paths.cache, "export");
const getImportDir = () => new Directory(Paths.cache, "import");
//* where a file opened from another app lands on iOS (LSSupportsOpeningDocumentsInPlace is off)
const getInboxDir = () => new Directory(Paths.document, "Inbox");
//* the same folders the app's own save paths use (noteHelper, home)
const getNoteMediaDir = () => new Directory(Paths.document, "note-media");
const getFolderThumbnailDir = () => new Directory(Paths.document, "folder-thumbnails");

/**
 * Deletes whatever earlier exports and imports left in the cache. Run once at
 * startup, before any screen can begin a new one: a shared file has to outlive
 * the share sheet (the receiving app may read it later), and a preview closed
 * by the app being killed never got to discard itself.
 */
export function sweepTransferCache(): void {
  if (Platform.OS === "web") return;
  deleteDirectoryIfExists(getExportDir());
  deleteDirectoryIfExists(getImportDir());
}

// ── Export ──────────────────────────────────────────────────────────────────

/**
 * Builds the manifest for a set of notes, and the files that go with it in the
 * same order as `payload.files`. No filesystem work: each file's `length` is
 * left at 0 here and measured by writeExportFileAsync when it writes them.
 *
 * Payload names are made up rather than taken from the notes' own files — they
 * only have to be unique within one container, and the importer never uses
 * them as paths.
 */
export function buildExportPayload(
  notes: NoteModel[],
  tags: TagModel[],
  folder: FolderModel | null,
): { payload: ExportedPayload; mediaUris: string[] } {
  const files: ExportedFile[] = [];
  const mediaUris: string[] = [];
  const addFile = (baseName: string, uri: string, fallbackExtension: string): string => {
    const name = `${baseName}.${extensionOf(uri, fallbackExtension)}`;
    files.push({ name, length: 0 });
    mediaUris.push(uri);
    return name;
  };

  const titleById = new Map(tags.map((tag) => [tag.id, tag.title]));
  const exportedNotes: ExportedNote[] = notes.map((note, i) => ({
    note: note.note,
    date: note.date,
    mediaType: note.mediaType,
    mediaFile: addFile(`media-${i}`, note.mediaUri, note.mediaType === "video" ? "mp4" : "jpg"),
    thumbnailFile: addFile(`thumb-${i}`, note.thumbnailUri, "jpg"),
    //* a tag id with no tag behind it has no title to carry, so it is dropped
    tagTitles: note.tagIds
      .map((id) => titleById.get(id))
      .filter((title): title is string => title != null),
  }));

  let exportedFolder: ExportedFolder | undefined;
  if (folder != null) {
    exportedFolder = { name: folder.name, accent: folder.accent };
    if (folder.coverUri != null) exportedFolder.coverFile = addFile("cover", folder.coverUri, "jpg");
  }

  return {
    payload: {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      kind: folder != null ? "folder" : "note",
      folder: exportedFolder,
      notes: exportedNotes,
      files,
    },
    mediaUris,
  };
}

/**
 * Writes a .noteit container into the cache and returns its uri, ready for
 * shareExportFileAsync. Streams each file across in chunks, so a long video is
 * never held in memory whole. A failure part-way deletes the half-written file,
 * and so does cancelling through `signal` (which throws TransferCancelledError).
 *
 * @param payload   from buildExportPayload
 * @param mediaUris the local files to append, in the same order as payload.files
 */
export async function writeExportFileAsync(
  payload: ExportedPayload,
  mediaUris: string[],
  onProgress?: TransferProgress,
  signal?: TransferSignal,
): Promise<string> {
  if (Platform.OS === "web") throw new TransferError("Exporting isn't available in the web preview.");
  if (mediaUris.length !== payload.files.length) {
    throw new Error("writeExportFileAsync: mediaUris must match payload.files one to one");
  }

  const sources = mediaUris.map(resolveStoredFile);
  const files: ExportedFile[] = payload.files.map((entry, i) => {
    if (!sources[i].exists) {
      throw new TransferError("A photo or video in this export is missing from the phone, so it couldn't be exported.");
    }
    return { name: entry.name, length: sources[i].size };
  });

  const manifest = utf8Encode(JSON.stringify({ ...payload, files }));
  const header = new Uint8Array(HEADER_BYTES);
  for (let i = 0; i < EXPORT_MAGIC.length; i++) header[i] = EXPORT_MAGIC.charCodeAt(i);
  new DataView(header.buffer).setUint32(8, manifest.length, true);

  const dir = getExportDir();
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, `${Crypto.randomUUID()}.noteit`);
  dest.create();

  let written = false;
  const output = dest.open(FileMode.WriteOnly);
  try {
    output.writeBytes(header);
    output.writeBytes(manifest);
    for (let i = 0; i < sources.length; i++) {
      const input = sources[i].open(FileMode.ReadOnly);
      try {
        await pipeAsync(input, output, files[i].length, signal);
      } finally {
        input.close();
      }
      onProgress?.(i + 1, sources.length);
    }
    written = true;
  } finally {
    output.close();
    if (!written) deleteFileIfExists(dest.uri);
  }
  return dest.uri;
}

/**
 * Hands a written container to the system share sheet, under a readable name —
 * the share sheet and the receiving app both show the file's own name.
 */
export async function shareExportFileAsync(fileUri: string, suggestedName: string): Promise<void> {
  if (Platform.OS === "web") throw new TransferError("Sharing isn't available in the web preview.");
  //* the native half arrives with an app build, not over Metro. A build made
  //* before expo-sharing was added has none, and importing it there would throw
  //* before this could say anything useful — hence the check and the late import
  if (requireOptionalNativeModule("ExpoSharing") == null) {
    throw new TransferError("Sharing a file needs the next version of the app.");
  }
  const Sharing = await import("expo-sharing");
  if (!(await Sharing.isAvailableAsync())) {
    throw new TransferError("This device can't share files.");
  }

  //* its own folder, so two exports with the same name can't collide
  const dir = new Directory(getExportDir(), Crypto.randomUUID());
  dir.create({ intermediates: true, idempotent: true });
  const named = new File(dir, safeFileName(suggestedName));
  await new File(fileUri).move(named);

  await Sharing.shareAsync(named.uri, {
    mimeType: "application/octet-stream",
    UTI: EXPORT_UTI,
    dialogTitle: suggestedName,
  });
}

// ── Import ──────────────────────────────────────────────────────────────────

/**
 * Opens the system file picker and returns a local copy of the picked file,
 * or null if the user backed out. expo-file-system's own picker, so it needs no
 * module beyond the one already in the build. It can't filter by a custom
 * extension — stageImportAsync is what rejects a file that isn't a container.
 *
 * Copied here rather than handing on the picked uri: Android only lets the
 * app read a picked document through what the picker returned, and a bare
 * content:// uri passed to another screen is refused ("Permission Denial").
 */
export async function pickExportFileAsync(): Promise<string | null> {
  if (Platform.OS === "web") throw new TransferError("Importing isn't available in the web preview.");
  const picked = await File.pickFileAsync();
  if (picked.canceled) return null;

  const dir = getImportDir();
  dir.create({ intermediates: true, idempotent: true });
  const copy = new File(dir, `picked-${Crypto.randomUUID()}.noteit`);
  try {
    await copyWholeFileAsync(picked.result, copy);
  } catch {
    deleteFileIfExists(copy.uri);
    throw new TransferError("Couldn't open that file.");
  }
  return copy.uri;
}

/** A note from a staged container, with its files unpacked on this phone. */
export type StagedNote = ExportedNote & {
  mediaUri: string;
  thumbnailUri: string;
};

/** A container unpacked into the cache and checked, not yet in the library. */
export type StagedImport = {
  /** The cache folder holding every unpacked file. */
  dirUri: string;
  payload: ExportedPayload;
  notes: StagedNote[];
  coverUri: string | null;
  /** Total size of the unpacked files, for the preview's summary line. */
  totalBytes: number;
};

/**
 * Unpacks a container into its own cache folder and checks it, without
 * touching the library. The preview reads everything from what this returns;
 * commitStagedImportAsync or discardStagedImport ends it.
 *
 * Throws TransferError with a sentence for the user when the file isn't a
 * container, is damaged, or comes from a newer app. Whatever it had unpacked
 * is deleted before it throws.
 */
export async function stageImportAsync(
  fileUri: string,
  onProgress?: TransferProgress,
): Promise<StagedImport> {
  if (Platform.OS === "web") throw new TransferError("Importing isn't available in the web preview.");

  const dir = new Directory(getImportDir(), Crypto.randomUUID());
  dir.create({ intermediates: true, idempotent: true });

  try {
    //* copied in first: a file handed over by another app can stop being
    //* readable once that app lets go of it
    //* streamed rather than File.copy: Android refuses to copy a picked
    //* content:// document ("Source has no file name"), but reads it fine
    const source = new File(dir, "source.noteit");
    try {
      await copyWholeFileAsync(new File(fileUri), source);
    } catch {
      throw new TransferError("Couldn't open that file.");
    }
    //* the picker's copy, or the one iOS put in the Inbox when another app
    //* handed the file over, has served its purpose once this one exists
    if (fileUri.startsWith(getImportDir().uri) || fileUri.startsWith(getInboxDir().uri)) {
      deleteFileIfExists(fileUri);
    }

    const size = source.size;
    const uriByName = new Map<string, string>();
    let payload: ExportedPayload;

    const input = source.open(FileMode.ReadOnly);
    try {
      if (size < HEADER_BYTES) throw notAContainer();
      const header = input.readBytes(HEADER_BYTES);
      for (let i = 0; i < EXPORT_MAGIC.length; i++) {
        if (header[i] !== EXPORT_MAGIC.charCodeAt(i)) throw notAContainer();
      }
      const manifestLength = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(8, true);
      if (manifestLength === 0 || manifestLength > MAX_MANIFEST_BYTES || HEADER_BYTES + manifestLength > size) {
        throw damaged();
      }

      const manifestBytes = input.readBytes(manifestLength);
      if (manifestBytes.length !== manifestLength) throw damaged();
      let raw: unknown;
      try {
        raw = JSON.parse(utf8Decode(manifestBytes));
      } catch {
        throw damaged();
      }
      payload = validatePayload(raw);

      //* the lengths have to account for every byte, or a blob would be read
      //* out of the wrong place
      const blobBytes = payload.files.reduce((sum, file) => sum + file.length, 0);
      if (HEADER_BYTES + manifestLength + blobBytes !== size) throw damaged();

      for (let i = 0; i < payload.files.length; i++) {
        const entry = payload.files[i];
        //* named fresh: a payload name is only a label and never becomes a path
        const target = new File(dir, `${Crypto.randomUUID()}.${extensionOf(entry.name, "bin")}`);
        target.create();
        const output = target.open(FileMode.WriteOnly);
        try {
          await pipeAsync(input, output, entry.length);
        } finally {
          output.close();
        }
        uriByName.set(entry.name, target.uri);
        onProgress?.(i + 1, payload.files.length);
      }
    } finally {
      input.close();
    }
    source.delete();

    const notes: StagedNote[] = [];
    for (const note of payload.notes) {
      const mediaUri = uriByName.get(note.mediaFile)!;
      let thumbnailUri = uriByName.get(note.thumbnailFile)!;
      //* an empty thumbnail is a note whose original had none to send
      if (new File(thumbnailUri).size === 0) {
        thumbnailUri = (await createThumbnailAsync(dir, mediaUri, note.mediaType)) ?? mediaUri;
      }
      notes.push({ ...note, mediaUri, thumbnailUri });
    }

    const coverFile = payload.folder?.coverFile;
    return {
      dirUri: dir.uri,
      payload,
      notes,
      coverUri: coverFile != null ? uriByName.get(coverFile)! : null,
      totalBytes: size - HEADER_BYTES,
    };
  } catch (error) {
    deleteDirectoryIfExists(dir);
    throw error;
  }
}

/** Throws away a staged import — the preview was closed without adding it. */
export function discardStagedImport(staged: StagedImport): void {
  deleteDirectoryIfExists(new Directory(staged.dirUri));
}

/** What the preview's add button decides before committing. */
export type CommitOptions = {
  /** Where a note-kind import lands; null = the gallery only. Ignored for a
   *  folder, whose notes go into the folder the import creates. */
  targetFolderId: string | null;
};

/**
 * Moves a staged import into the library: a new folder (for a folder export),
 * any tags this phone doesn't have yet, and every note with fresh ids.
 *
 * Files are moved out of the staging folder, not copied — cache and documents
 * are on the same disk, so each is only a rename. Nothing is written to
 * storage until every file is in place; if that part fails, the moved files
 * are deleted again. If a storage write fails part-way, the notes that did
 * land are deleted too, so a failed import leaves nothing half-there. New tags
 * already written stay — harmless, the same as a failed note save
 * (noteHelper.saveNoteDraftAsync).
 *
 * Writes storage directly; the caller re-reads the store afterwards.
 */
export async function commitStagedImportAsync(
  staged: StagedImport,
  options: CommitOptions,
): Promise<{ notes: NoteModel[]; folder: FolderModel | null }> {
  const moved: string[] = [];
  const moveIntoAsync = async (dir: Directory, uri: string): Promise<string> => {
    dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, `${Crypto.randomUUID()}.${extensionOf(uri, "bin")}`);
    await new File(uri).move(dest);
    moved.push(dest.uri);
    return dest.uri;
  };

  // 1. files into the library's own folders, still invisible to the app
  let folder: FolderModel | null = null;
  const storedFolders = await getFoldersFromStorageAsync();
  const placed: { note: StagedNote; mediaUri: string; thumbnailUri: string }[] = [];
  try {
    const exportedFolder = staged.payload.folder;
    if (staged.payload.kind === "folder" && exportedFolder != null) {
      folder = {
        id: Crypto.randomUUID(),
        name: uniqueFolderName(exportedFolder.name, storedFolders),
        accent: exportedFolder.accent,
        Visible: true,
        coverUri: staged.coverUri != null ? await moveIntoAsync(getFolderThumbnailDir(), staged.coverUri) : null,
      };
    }

    for (const note of staged.notes) {
      const mediaUri = await moveIntoAsync(getNoteMediaDir(), note.mediaUri);
      //* a thumbnail that couldn't be made falls back to the media itself
      //* (stageImportAsync), and a file can only be moved once
      const thumbnailUri =
        note.thumbnailUri === note.mediaUri ? mediaUri : await moveIntoAsync(getNoteMediaDir(), note.thumbnailUri);
      placed.push({ note, mediaUri, thumbnailUri });
    }
  } catch {
    moved.forEach(deleteFileIfExists);
    throw new TransferError("Couldn't copy the photos and videos into the app. Check there's space on the phone and try again.");
  }

  // 2. storage: tags, then the folder, then the notes that point at both
  const written: NoteModel[] = [];
  let folderWritten = false;
  try {
    //* one call for every title in the file, so a tag several notes share is
    //* only created once; matching ignores case, like tags typed on the sheet
    const titles = [...new Set(staged.notes.flatMap((note) => note.tagTitles))];
    const tagIds = await saveTagsAsync(titles, await getTagsFromStorageAsync());
    const tagIdByTitle = new Map(titles.map((title, i) => [title.toLowerCase(), tagIds[i]]));

    if (folder != null) {
      await setFoldersToStorageAsync([...storedFolders, folder]);
      folderWritten = true;
    }

    const folderId = folder != null ? folder.id : options.targetFolderId;
    const now = Date.now();
    for (const [i, { note, mediaUri, thumbnailUri }] of placed.entries()) {
      const model: NoteModel = {
        id: Crypto.randomUUID(),
        mediaUri,
        mediaType: note.mediaType,
        thumbnailUri,
        note: note.note,
        date: note.date,
        tagIds: [...new Set(note.tagTitles.map((title) => tagIdByTitle.get(title.toLowerCase())!))],
        folderId,
        //* a millisecond apart, so the import keeps the order it was sent in
        createdAt: new Date(now + i).toISOString(),
      };
      //* one at a time: each write also rewrites the shared note-id list
      await setNoteToStorageAsync(model);
      written.push(model);
    }
  } catch {
    //* takes their files with them; the rest were never written to storage
    await deleteNotesFromStorageAsync(written).catch(() => {});
    const writtenUris = new Set(written.flatMap((note) => [note.mediaUri, note.thumbnailUri]));
    moved.filter((uri) => !writtenUris.has(uri)).forEach(deleteFileIfExists);
    if (folderWritten) await setFoldersToStorageAsync(storedFolders).catch(() => {});
    throw new TransferError("Couldn't add that to your library. Nothing was added — try again.");
  }

  discardStagedImport(staged);
  return { notes: written, folder };
}

/** "Trip", or "Trip (2)", "Trip (3)"… when a folder already has the name.
 *  Compared without case, the way the folder dialog checks names. */
function uniqueFolderName(name: string, folders: FolderModel[]): string {
  const taken = new Set(folders.map((folder) => folder.name.trim().toLowerCase()));
  const base = name.trim().length > 0 ? name.trim() : "Imported folder";
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

// ── Checking a manifest ─────────────────────────────────────────────────────

const notAContainer = () => new TransferError("That file isn't a NoteIt export.");
const damaged = () =>
  new TransferError("That file is damaged or incomplete. Ask whoever sent it to export it again.");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value != null && !Array.isArray(value);

const isShortString = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max;

/**
 * Checks a parsed manifest field by field and returns a copy holding only the
 * fields this version knows. The file came from another phone, so nothing in
 * it is trusted: every file a note names has to be in `files`, exactly once.
 */
function validatePayload(raw: unknown): ExportedPayload {
  if (!isRecord(raw)) throw damaged();

  const version = raw.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) throw damaged();
  if (version > EXPORT_VERSION) {
    throw new TransferError("That file was made by a newer version of NoteIt. Update the app to open it.");
  }

  const kind = raw.kind;
  if (kind !== "note" && kind !== "folder") throw damaged();
  if (!isShortString(raw.exportedAt, 64)) throw damaged();

  if (!Array.isArray(raw.files) || raw.files.length > 20000) throw damaged();
  const files: ExportedFile[] = [];
  const names = new Set<string>();
  for (const file of raw.files) {
    if (!isRecord(file) || !isShortString(file.name, 100) || file.name.length === 0) throw damaged();
    if (typeof file.length !== "number" || !Number.isSafeInteger(file.length) || file.length < 0) throw damaged();
    if (names.has(file.name)) throw damaged();
    names.add(file.name);
    files.push({ name: file.name, length: file.length });
  }
  const namesFile = (value: unknown): value is string => typeof value === "string" && names.has(value);

  if (!Array.isArray(raw.notes) || raw.notes.length > 10000) throw damaged();
  const notes: ExportedNote[] = raw.notes.map((note: unknown) => {
    if (!isRecord(note)) throw damaged();
    if (!isShortString(note.note, 100_000) || !isShortString(note.date, 32)) throw damaged();
    if (note.mediaType !== "image" && note.mediaType !== "video") throw damaged();
    if (!namesFile(note.mediaFile) || !namesFile(note.thumbnailFile)) throw damaged();
    if (!Array.isArray(note.tagTitles) || note.tagTitles.length > 200) throw damaged();
    const tagTitles = note.tagTitles.map((title: unknown) => {
      if (!isShortString(title, 200)) throw damaged();
      return title;
    });
    return {
      note: note.note,
      date: note.date,
      mediaType: note.mediaType,
      mediaFile: note.mediaFile,
      thumbnailFile: note.thumbnailFile,
      tagTitles,
    };
  });

  let folder: ExportedFolder | undefined;
  if (kind === "folder") {
    const rawFolder = raw.folder;
    if (!isRecord(rawFolder) || !isShortString(rawFolder.name, 200)) throw damaged();
    if (typeof rawFolder.accent !== "string" || !/^#[0-9a-fA-F]{6}$/.test(rawFolder.accent)) throw damaged();
    folder = { name: rawFolder.name, accent: rawFolder.accent };
    if (rawFolder.coverFile != null) {
      if (!namesFile(rawFolder.coverFile)) throw damaged();
      folder.coverFile = rawFolder.coverFile;
    }
  } else if (raw.folder != null) {
    throw damaged();
  }

  return { version, exportedAt: raw.exportedAt, kind, folder, notes, files };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Copies exactly `length` bytes from one open file to another, a chunk at a
 *  time, handing the thread back between chunks so the UI keeps drawing — and
 *  so a cancel tapped meanwhile is seen before the next chunk. */
async function pipeAsync(
  input: FileHandle,
  output: FileHandle,
  length: number,
  signal?: TransferSignal,
): Promise<void> {
  let remaining = length;
  while (remaining > 0) {
    if (signal?.cancelled === true) throw new TransferCancelledError();
    const chunk = input.readBytes(Math.min(CHUNK_BYTES, remaining));
    if (chunk.length === 0) throw damaged();
    output.writeBytes(chunk);
    remaining -= chunk.length;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

/** Copies a whole file of unknown length — a picked content:// document may
 *  not report its size — reading until the source runs out. */
async function copyWholeFileAsync(from: File, to: File): Promise<void> {
  let input: FileHandle;
  try {
    input = from.open(FileMode.ReadOnly);
  } catch {
    //* a plain content provider — how chat apps (Telegram, WhatsApp) hand a
    //* file over — offers no file handle, only a stream, and copy() streams.
    //* Picked documents are the other way round, hence handles first
    await from.copy(to, { overwrite: true });
    return;
  }
  to.create({ overwrite: true });
  const output = to.open(FileMode.WriteOnly);
  try {
    for (;;) {
      const chunk = input.readBytes(CHUNK_BYTES);
      if (chunk.length === 0) break;
      output.writeBytes(chunk);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    input.close();
    output.close();
  }
}

function extensionOf(uriOrName: string, fallback: string): string {
  const match = /\.([A-Za-z0-9]{1,5})$/.exec(uriOrName.split("?")[0]);
  return match != null ? match[1].toLowerCase() : fallback;
}

/** A name every file system accepts, ending in .noteit. */
function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .trim()
    .slice(0, 80);
  const base = cleaned.length > 0 && cleaned !== ".noteit" ? cleaned : "NoteIt export.noteit";
  return base.toLowerCase().endsWith(".noteit") ? base : `${base}.noteit`;
}

/**
 * A file the library points at, found even if the app has moved since the uri
 * was stored.
 *
 * Notes keep absolute uris, and on iOS the app's container folder changes on
 * every update (…/Application/<new id>/Documents/…). A note saved before an
 * update still names the old folder; its file is really at the same place
 * under this install's Documents. So a uri that doesn't exist is re-pointed
 * there, and used if the file is found. On Android the path doesn't move and
 * the first check simply succeeds.
 */
function resolveStoredFile(uri: string): File {
  const stored = new File(uri);
  if (stored.exists) return stored;

  const marker = "/Documents/";
  const at = uri.indexOf(marker);
  if (at < 0) return stored;
  const segments = uri
    .slice(at + marker.length)
    .split("/")
    .map((segment) => decodeURIComponent(segment));
  const current = new File(Paths.document, ...segments);
  return current.exists ? current : stored;
}

function deleteDirectoryIfExists(dir: Directory): void {
  try {
    if (dir.exists) dir.delete();
  } catch (error) {
    console.error("Error deleting folder:", dir.uri, error);
  }
}

//* written out rather than relying on TextEncoder/TextDecoder, which Hermes
//* hasn't always shipped. A manifest is small, so speed doesn't matter here.
function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (cp < 0x80) {
      bytes.push(cp);
    } else if (cp < 0x800) {
      bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    }
  }
  return Uint8Array.from(bytes);
}

function utf8Decode(bytes: Uint8Array): string {
  const continuation = (i: number) => {
    const b = bytes[i];
    if (b == null || (b & 0xc0) !== 0x80) throw damaged();
    return b & 0x3f;
  };
  let text = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    let cp: number;
    if (b < 0x80) {
      cp = b;
      i += 1;
    } else if ((b & 0xe0) === 0xc0) {
      cp = ((b & 0x1f) << 6) | continuation(i + 1);
      i += 2;
    } else if ((b & 0xf0) === 0xe0) {
      cp = ((b & 0x0f) << 12) | (continuation(i + 1) << 6) | continuation(i + 2);
      i += 3;
    } else if ((b & 0xf8) === 0xf0) {
      cp = ((b & 0x07) << 18) | (continuation(i + 1) << 12) | (continuation(i + 2) << 6) | continuation(i + 3);
      i += 4;
    } else {
      throw damaged();
    }
    text += String.fromCodePoint(cp);
  }
  return text;
}
