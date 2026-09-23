import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  deleteFolderFromStorageAsync,
  deleteNotesFromStorageAsync,
  getFoldersFromStorageAsync,
  getNotesFromStorageAsync,
  getSnippetsFromStorageAsync,
  getTagsFromStorageAsync,
  setFoldersToStorageAsync,
  setNoteToStorageAsync,
  setSnippetsToStorageAsync,
} from "@/persistence/FileStorage";
import type { FolderModel } from "@/models/FolderModel";
import type { NoteModel, TagModel } from "@/models/NoteModel";
import type { SnippetModel } from "@/models/SnippetModel";

type LibraryContextValue = {
  folders: FolderModel[];
  notes: NoteModel[];
  tags: TagModel[];
  snippets: SnippetModel[];
  /** False until the first read has finished — successfully or not. The root
   *  layout holds the splash on this, so no screen paints an empty library and
   *  then fills in. */
  ready: boolean;

  /** Replaces the whole folder list (create, rename, recolour, re-cover). */
  saveFoldersAsync: (folders: FolderModel[]) => Promise<void>;
  /** Deletes a folder together with its notes and their media files. */
  deleteFolderAsync: (folderId: string) => Promise<void>;
  /** Inserts a note, or replaces the one with the same id. */
  saveNoteAsync: (note: NoteModel) => Promise<void>;
  deleteNotesAsync: (notes: NoteModel[]) => Promise<void>;
  /** Files notes under another folder, or under none when folderId is null. */
  moveNotesToFolderAsync: (notes: NoteModel[], folderId: string | null) => Promise<void>;
  saveSnippetsAsync: (snippets: SnippetModel[]) => Promise<void>;
  /** Re-reads notes and tags. Only for writes that bypass this store — today
   *  that is AddNote's save, which goes through noteHelper's own pipeline. */
  refreshNotesAndTagsAsync: () => Promise<void>;
  /** Re-reads everything. For recovering after a write that may have half
   *  happened, where memory can no longer be trusted to match storage. */
  reloadAsync: () => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

async function readAllAsync() {
  const [folders, notes, tags, snippets] = await Promise.all([
    getFoldersFromStorageAsync(),
    getNotesFromStorageAsync(),
    getTagsFromStorageAsync(),
    getSnippetsFromStorageAsync(),
  ]);
  return { folders, notes, tags, snippets };
}

// The app's one in-memory copy of the user's folders, notes, tags and snippets.
//
// Storage is read once at startup. After that this state is the source of
// truth: every write goes through a method here, which writes storage first
// and updates memory only once that succeeded. Screens read from here instead
// of re-reading storage whenever they gain focus, so navigating costs nothing
// and a change made on one screen (a note deleted in the viewer) is already
// true on every other screen by the time you go back to it.
//
// Write-then-set rather than set-then-write: a failed write throws before
// memory changes, so a screen's existing try/catch still leaves memory
// matching disk. The state updates are functional, so two writes that
// overlap can't overwrite each other's result.
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<FolderModel[]>([]);
  const [notes, setNotes] = useState<NoteModel[]>([]);
  const [tags, setTags] = useState<TagModel[]>([]);
  const [snippets, setSnippets] = useState<SnippetModel[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readAllAsync()
      .then((loaded) => {
        if (cancelled) return;
        setFolders(loaded.folders);
        setNotes(loaded.notes);
        setTags(loaded.tags);
        setSnippets(loaded.snippets);
      })
      .catch((error) => {
        console.warn("Could not read the library; starting empty.", error);
      })
      .finally(() => {
        //* ready even on failure — a stuck splash is worse than an empty list
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const saveFoldersAsync = useCallback(async (next: FolderModel[]) => {
    await setFoldersToStorageAsync(next);
    setFolders(next);
  }, []);

  const deleteFolderAsync = useCallback(async (folderId: string) => {
    await deleteFolderFromStorageAsync(folderId);
    setFolders((current) => current.filter((f) => f.id !== folderId));
    setNotes((current) => current.filter((note) => note.folderId !== folderId));
  }, []);

  const saveNoteAsync = useCallback(async (note: NoteModel) => {
    await setNoteToStorageAsync(note);
    setNotes((current) =>
      current.some((n) => n.id === note.id)
        ? current.map((n) => (n.id === note.id ? note : n))
        : [...current, note],
    );
  }, []);

  const deleteNotesAsync = useCallback(async (toDelete: NoteModel[]) => {
    await deleteNotesFromStorageAsync(toDelete);
    const ids = new Set(toDelete.map((note) => note.id));
    setNotes((current) => current.filter((note) => !ids.has(note.id)));
  }, []);

  const moveNotesToFolderAsync = useCallback(
    async (toMove: NoteModel[], folderId: string | null) => {
      //* only the ones that would actually change, so re-picking the folder a
      //* note is already in writes nothing
      const moved = toMove
        .filter((note) => note.folderId !== folderId)
        .map((note) => ({ ...note, folderId }));
      if (moved.length === 0) return;

      //* one at a time rather than Promise.all: each write also reads and
      //* rewrites the shared note-id list, and concurrent writes would race
      for (const note of moved) {
        await setNoteToStorageAsync(note);
      }

      const byId = new Map(moved.map((note) => [note.id, note]));
      setNotes((current) => current.map((note) => byId.get(note.id) ?? note));
    },
    [],
  );

  const saveSnippetsAsync = useCallback(async (next: SnippetModel[]) => {
    await setSnippetsToStorageAsync(next);
    setSnippets(next);
  }, []);

  const refreshNotesAndTagsAsync = useCallback(async () => {
    const [loadedNotes, loadedTags] = await Promise.all([
      getNotesFromStorageAsync(),
      getTagsFromStorageAsync(),
    ]);
    setNotes(loadedNotes);
    setTags(loadedTags);
  }, []);

  const reloadAsync = useCallback(async () => {
    const loaded = await readAllAsync();
    setFolders(loaded.folders);
    setNotes(loaded.notes);
    setTags(loaded.tags);
    setSnippets(loaded.snippets);
  }, []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      folders,
      notes,
      tags,
      snippets,
      ready,
      saveFoldersAsync,
      deleteFolderAsync,
      saveNoteAsync,
      deleteNotesAsync,
      moveNotesToFolderAsync,
      saveSnippetsAsync,
      refreshNotesAndTagsAsync,
      reloadAsync,
    }),
    [
      folders,
      notes,
      tags,
      snippets,
      ready,
      saveFoldersAsync,
      deleteFolderAsync,
      saveNoteAsync,
      deleteNotesAsync,
      moveNotesToFolderAsync,
      saveSnippetsAsync,
      refreshNotesAndTagsAsync,
      reloadAsync,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

/** Every screen's source of folders, notes, tags and snippets. Throws outside
 *  the provider for the same reason useTheme() does: a screen rendered without
 *  it is a wiring bug, and an empty library would hide that. */
export function useLibrary(): LibraryContextValue {
  const value = useContext(LibraryContext);
  if (value == null) {
    throw new Error("useLibrary() must be used inside a <LibraryProvider>.");
  }
  return value;
}
