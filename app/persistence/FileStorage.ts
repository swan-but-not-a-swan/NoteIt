import AsyncStorage from '@react-native-async-storage/async-storage';
import { FolderModel } from '../models/FolderModel';
import { FolderListItemModel } from '../models/FolderListItemModel';
import { NoteModel } from '../models/NoteModel';

export async function getFoldersFromStorage(): Promise<FolderModel[]> {
    const data = await AsyncStorage.getItem('folders');
    return data ? JSON.parse(data) : [];
}
export async function getNotesFromStorage(): Promise<NoteModel[]> {
    const data = await AsyncStorage.getItem('notes');
    return data ? JSON.parse(data) : [];
}

export async function saveFoldersToStorage(folders: FolderModel[]): Promise<void> {
    await AsyncStorage.setItem('folders', JSON.stringify(folders));
}

function groupNotesByFolder(notes: NoteModel[]): Record<string, NoteModel[]> {
    const map: Record<string, NoteModel[]> = {};
    for (const note of notes) {
        const key = note.folderId ?? "gallery";
        (map[key] ??= []).push(note);
    }
    return map;
}

export async function loadFoldersWithCounts(): Promise<FolderListItemModel[]> {
    const [folders, notes] = await Promise.all([
        getFoldersFromStorage(),
        getNotesFromStorage(),
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