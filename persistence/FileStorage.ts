import AsyncStorage from '@react-native-async-storage/async-storage';
import { FolderModel } from '../models/FolderModel';
import { FolderListItemModel } from '../models/FolderListItemModel';
import { NoteModel, TagModel } from '../models/NoteModel';

export async function getFoldersFromStorageAsync(): Promise<FolderModel[]> {
    const data = await AsyncStorage.getItem('folders');
    return data ? JSON.parse(data) : [];
}
const noteKey = (id: string) => `note:${id}`;

async function getNoteIdsFromStorageAsync(): Promise<string[]> {
    const data = await AsyncStorage.getItem('noteIds');
    return data ? JSON.parse(data) : [];
}

async function saveNoteIdsToStorageAsync(ids: string[]): Promise<void> {
    await AsyncStorage.setItem('noteIds', JSON.stringify(ids));
}

export async function getNotesFromStorageAsync(): Promise<NoteModel[]> {
    const ids = await getNoteIdsFromStorageAsync();
    if (ids.length === 0) return [];

    const entries = await AsyncStorage.multiGet(ids.map(noteKey));
    return entries
        .map(([, value]) => (value ? JSON.parse(value) as NoteModel : null))
        .filter((note): note is NoteModel => note != null);
}

export async function loadFoldersWithCountsAsync(): Promise<FolderListItemModel[]> {
    const [folders, notes] = await Promise.all([
        getFoldersFromStorageAsync(),
        getNotesFromStorageAsync(),
    ]);

    const notesByFolder = groupNotesByFolder(notes); // one O(n) pass over notes

    return folders.map((folder) => {
        const notes = notesByFolder[folder.id] ?? [];
        return {
            folder,
            count: notes.length
        };
    });
}

function groupNotesByFolder(notes: NoteModel[]): Record<string, NoteModel[]> {
    const map: Record<string, NoteModel[]> = {};
    for (const note of notes) {
        const key = note.folderId ?? "gallery";
        (map[key] ??= []).push(note);
    }
    return map;
}

export async function saveFoldersToStorageAsync(folders: FolderModel[]): Promise<void> {
    await AsyncStorage.setItem('folders', JSON.stringify(folders));
}

export async function getTagsFromStorageAsync(): Promise<TagModel[]> {
    const data = await AsyncStorage.getItem('tags');
    return data ? JSON.parse(data) : [];
}

export async function saveTagsToStorageAsync(tags: TagModel[]): Promise<void> {
    await AsyncStorage.setItem('tags', JSON.stringify(tags));
}

export async function saveNoteToStorageAsync(note: NoteModel): Promise<void> {
    await AsyncStorage.setItem(noteKey(note.id), JSON.stringify(note));

    const ids = await getNoteIdsFromStorageAsync();
    if (!ids.includes(note.id)) {
        await saveNoteIdsToStorageAsync([...ids, note.id]);
    }
}