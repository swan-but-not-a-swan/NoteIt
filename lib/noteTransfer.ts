import { ExportPayload } from "@/models/ExportModel";
import { FolderModel } from "@/models/FolderModel";
import { NoteModel, TagModel } from "@/models/NoteModel";

/**
 * The seam between the export/import UI and the container + storage work.
 *
 * Everything here is declared but not implemented yet — the screens are wired
 * against these signatures, and each throws NotImplementedError so the UI's
 * failure path is live and testable rather than a button that silently does
 * nothing. Replace the bodies; the callers don't change.
 */

/** Thrown by the stubs below. The screens surface `message` as-is, so once
 *  these are implemented a real failure reads the same way to the user. */
export class TransferError extends Error {}

const notImplemented = (what: string): never => {
  throw new TransferError(`${what} isn't wired up yet.`);
};

/**
 * Opens the system file picker and returns the picked file's uri, or null if
 * the user backed out.
 *
 * Behind this seam on purpose: expo-document-picker is a native module, so
 * importing it from a screen would make the whole app need a dev-client
 * rebuild before anything else here could run.
 *
 * TODO (business logic): `npx expo install expo-document-picker`, then
 * getDocumentAsync({ type: "*&#47;*", copyToCacheDirectory: true }). Keep
 * copyToCacheDirectory true — the docs warn the file may not be readable
 * otherwise. type has to be a wildcard: the picker cannot filter by custom
 * extension, which is why readExportManifestAsync validates the magic bytes.
 */
export async function pickExportFileAsync(): Promise<string | null> {
  return notImplemented("Import");
}

/**
 * Hands a written container to the system share sheet.
 *
 * TODO (business logic): `npx expo install expo-sharing`, gate on
 * isAvailableAsync(), then shareAsync(fileUri, { UTI: "public.data",
 * mimeType: "application/octet-stream", dialogTitle: suggestedName }).
 */
export async function shareExportFileAsync(
  fileUri: string,
  suggestedName: string,
): Promise<void> {
  void fileUri;
  void suggestedName;
  return notImplemented("Export");
}

/**
 * Writes a .noteit container into the cache directory and returns its uri,
 * ready to hand to shareExportFileAsync.
 *
 * TODO (business logic): magic + manifest header, then each media file's raw
 * bytes appended in `payload.files` order. Stream it — file.open(FileMode.Append)
 * gives a FileHandle in SDK 57, so a 100MB video never has to sit in a JS
 * string the way base64 would force.
 *
 * @param payload   manifest describing what's in the container
 * @param mediaUris local uris to append, in the same order as payload.files
 * @returns         uri of the written container
 */
export async function writeExportFileAsync(
  payload: ExportPayload,
  mediaUris: string[],
): Promise<string> {
  void payload;
  void mediaUris;
  return notImplemented("Export");
}

/**
 * Reads and validates a picked file's manifest, without importing anything.
 *
 * The confirmation step needs this: it has to say what's in the file before
 * the user agrees to write it.
 *
 * TODO (business logic): read the first 16 bytes, reject anything whose magic
 * isn't EXPORT_MAGIC, parse the manifest, then reject a version newer than
 * EXPORT_VERSION. Throw TransferError with something a human can read — this
 * is the path a user hits by picking the wrong file.
 */
export async function readExportManifestAsync(fileUri: string): Promise<ExportPayload> {
  void fileUri;
  return notImplemented("Import");
}

/**
 * Writes the container's contents into app storage.
 *
 * TODO (business logic), in this order — see the notes in the design brief:
 *   1. folder first (new id), so notes have something to point at
 *   2. resolve tagTitles against existing tags, minting the misses
 *   3. per note: extract payload bytes into note-media/ with a fresh UUID,
 *      regenerate the thumbnail, build the NoteModel with a new id and the
 *      remapped tagIds/folderId
 *   4. write the notes only once they are all built — a throw partway
 *      through step 3 should delete whatever media was already copied
 *
 * A single-note import must set folderId to null, never the exported folder's
 * id: a note pointing at a folder that doesn't exist here renders nowhere.
 *
 * @param existingTags  the importing device's tags, for title matching
 * @returns             what was written, so the caller can report it
 */
export async function importExportFileAsync(
  fileUri: string,
  payload: ExportPayload,
  existingTags: TagModel[],
): Promise<{ notes: NoteModel[]; folder: FolderModel | null }> {
  void fileUri;
  void payload;
  void existingTags;
  return notImplemented("Import");
}

/**
 * Builds the manifest for a set of notes. Pure — no filesystem, no storage —
 * so it can be tested with `bun` the way notePager's rules are.
 *
 * TODO (business logic): map NoteModel -> ExportedNote, resolving each note's
 * tagIds to titles via `tags`, and naming each media payload (its own id plus
 * the source extension is enough to keep them unique within one container).
 */
export function buildExportPayload(
  notes: NoteModel[],
  tags: TagModel[],
  folder: FolderModel | null,
): { payload: ExportPayload; mediaUris: string[] } {
  void notes;
  void tags;
  void folder;
  return notImplemented("Export");
}
