//! Manually reviewed since 14/09/2026
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FolderModel } from '../models/FolderModel';
import { NoteModel, TagModel } from '../models/NoteModel';
import { deleteFileIfExists } from '@/lib/mediaHelper';
import type { ThemeMode } from '@/theme/colors';
import { SnippetModel } from '@/models/SnippetModel';

const STORAGE_KEYS = {
    themeMode: 'themeMode',
    folders: 'folders',
    noteIds: 'noteIds',
    tags: 'tags',
    snippets: 'snippets',
} as const;

//* Each note is stored under its own key, e.g. "note:<id>"
const noteKey = (id: string) => `note:${id}`;

//! Manually reviewed since 14/09/2026
export async function getThemeModeFromStorageAsync(): Promise<ThemeMode | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.themeMode);
    return data === 'light' || data === 'dark' ? data : null;
}

//! Manually reviewed since 14/09/2026
export async function setThemeModeToStorageAsync(mode: ThemeMode): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.themeMode, mode);
}

//! Manually reviewed since 14/09/2026
export async function getFoldersFromStorageAsync(): Promise<FolderModel[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.folders);
    return data ? JSON.parse(data) : [];
}

//! Manually reviewed since 14/09/2026
export async function setFoldersToStorageAsync(folders: FolderModel[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(folders));
}

//! Manually reviewed since 14/09/2026
export async function deleteFolderFromStorageAsync(folderId: string): Promise<void> {
    //* delete all notes that point to the folderId
    const all = await getNotesFromStorageAsync();
    const notesToDelete = all.filter((note) => note.folderId === folderId);
    await deleteNotesFromStorageAsync(notesToDelete);

    //* delete folder cover and the folder itself
    const folders = await getFoldersFromStorageAsync();
    const folder = folders.find((f) => f.id === folderId);
    if (folder?.coverUri != null) deleteFileIfExists(folder.coverUri);
    await setFoldersToStorageAsync(folders.filter((f) => f.id !== folderId));
}

//! Manually reviewed since 14/09/2026
async function getNoteIdsFromStorageAsync(): Promise<string[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.noteIds);
    return data ? JSON.parse(data) : [];
}

//! Manually reviewed since 14/09/2026
async function setNoteIdsToStorageAsync(ids: string[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.noteIds, JSON.stringify(ids));
}

//! Manually reviewed since 14/09/2026
export async function getNotesFromStorageAsync(): Promise<NoteModel[]> {
    const ids = await getNoteIdsFromStorageAsync();
    if (ids.length === 0) return [];

    const entries = await AsyncStorage.multiGet(ids.map(noteKey));
    return entries
        .map(([, value]) => (value ? JSON.parse(value) as NoteModel : null))
        .filter((note): note is NoteModel => note != null);
}

//! Manually reviewed since 14/09/2026
export async function setNoteToStorageAsync(note: NoteModel): Promise<void> {
    await AsyncStorage.setItem(noteKey(note.id), JSON.stringify(note));

    const ids = await getNoteIdsFromStorageAsync();
    if (!ids.includes(note.id)) {
        await setNoteIdsToStorageAsync([...ids, note.id]);
    }
}

//! Manually reviewed since 14/09/2026
async function deleteNoteIdsFromStorageAsync(noteIds: string[]): Promise<void> {
    const idSet = new Set(noteIds);
    const ids = await getNoteIdsFromStorageAsync();
    await setNoteIdsToStorageAsync(ids.filter((id) => !idSet.has(id)));
}

//! Manually reviewed since 14/09/2026
export async function deleteNotesFromStorageAsync(notesToDelete: NoteModel[]): Promise<void> {
    const noteIdsToDelete = notesToDelete.map((note) => note.id);
    await deleteNoteIdsFromStorageAsync(noteIdsToDelete); //* delete noteIds first from storage, so they don't appear in the list of notes anymore
    await AsyncStorage.multiRemove(notesToDelete.map((note) => noteKey(note.id))); //* delete the notes themselves from storage

    for (const note of notesToDelete) {
        deleteFileIfExists(note.mediaUri); //* delete the media Uri from storage
        deleteFileIfExists(note.thumbnailUri); //* delete the thumbnail Uri from storage
    }
}

//! Manually reviewed since 14/09/2026
export async function getTagsFromStorageAsync(): Promise<TagModel[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.tags);
    return data ? JSON.parse(data) : [];
}

//! Manually reviewed since 14/09/2026
export async function setTagsToStorageAsync(tags: TagModel[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.tags, JSON.stringify(tags));
}

//! Manually reviewed since 14/09/2026
export async function getSnippetsFromStorageAsync(): Promise<SnippetModel[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.snippets);
    return data ? JSON.parse(data) : [];
}

//! Manually reviewed since 14/09/2026
export async function setSnippetsToStorageAsync(snippets: SnippetModel[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.snippets, JSON.stringify(snippets));
}