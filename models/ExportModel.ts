import { NoteMediaType } from "./NoteModel";

//* iterated whenever export/import version changes. Incomptaible feature versions shall be refused
export const EXPORT_VERSION = 1;

//* header of a .noteit container. Ensures the file is recognized as a valid NoteIt export
export const EXPORT_MAGIC = "NOTEIT01";

//* entire payload of a note or folder
export type ExportedNote = {
  note: string;
  date: string; //* ISO "yyyy-mm-dd"
  mediaType: NoteMediaType;
  mediaFile: string; //* the importer will look for this file in the payload section
  thumbnailFile: string; //* the importer will look for this file in the payload section
  tagTitles: string[]; //* the importer creates and appends them against its own tags
};

export type ExportedFolder = {
  name: string;
  accent: string;
  coverFile?: string; //* the importer will look for this file in the payload section if present
};

//* metadata for each file in the payload section, allowing the importer to locate and read them efficiently
export type ExportedFile = {
  name: string;
  length: number;
};

export type ExportedPayload = {
  version: number;
  exportedAt: string; //* shown in the import confirmation so two exports of the same folder can be told apart
  kind: "note" | "folder";
  folder?: ExportedFolder; //* present only when kind is "folder"
  notes: ExportedNote[];
  files: ExportedFile[];
};
