import { NoteMediaType } from "./NoteModel";

/** Bumped whenever the shape below changes incompatibly. An importer that
 *  meets a higher number should refuse the file rather than guess. */
export const EXPORT_VERSION = 1;

/** Written at the head of a .noteit container so a file that isn't one can be
 *  rejected before anything tries to parse it — expo-document-picker can't
 *  filter by custom extension, so users can hand us anything. */
export const EXPORT_MAGIC = "NOTEIT01";

/**
 * A picture-note as it travels between devices.
 *
 * Deliberately *not* NoteModel. Ids and uris are device-local and meaningless
 * on the receiving phone: a tagId points at a tag that doesn't exist there, a
 * mediaUri points at a file in another app's sandbox. So tags travel as
 * titles, media travels as a payload name, and the importer mints everything
 * else fresh.
 *
 * Keeping this separate from NoteModel also means renaming a field on the
 * model doesn't silently invalidate every export ever written.
 */
export type ExportedNote = {
  note: string;
  /** ISO "yyyy-mm-dd", same as NoteModel.date. */
  date: string;
  mediaType: NoteMediaType;
  /** Names the note's bytes in the container's payload section — not a uri. */
  mediaFile: string;
  /** Titles rather than ids; the importer matches them against its own tags. */
  tagTitles: string[];
};

export type ExportedFolder = {
  name: string;
  accent: string;
  /** Payload name of the folder's cover photo, if it had one. */
  coverFile?: string;
};

/** One entry per blob in the payload section, in the order they were written.
 *  Lengths are what let a reader seek without scanning. */
export type ExportedFile = {
  name: string;
  length: number;
};

export type ExportPayload = {
  version: number;
  /** ISO timestamp — shown in the import confirmation so you can tell two
   *  exports of the same folder apart. */
  exportedAt: string;
  kind: "note" | "folder";
  /** Present only when kind is "folder". */
  folder?: ExportedFolder;
  notes: ExportedNote[];
  files: ExportedFile[];
};
