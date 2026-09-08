import AsyncStorage from '@react-native-async-storage/async-storage';
import { FolderModel } from '../models/FolderModel';
import { FolderListItemModel } from '../models/FolderListItemModel';
import { NoteModel, TagModel } from '../models/NoteModel';
import { deleteFileIfExists } from '@/lib/mediaHelper';

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

async function deleteNoteIdsFromStorageAsync(noteIds: string[]): Promise<void> {
    const idSet = new Set(noteIds);
    const ids = await getNoteIdsFromStorageAsync();
    await saveNoteIdsToStorageAsync(ids.filter((id) => !idSet.has(id)));
}

export async function deleteNotesFromStorageAsync(notesToDelete: NoteModel[]): Promise<void> 
{
    const noteIdsToDelete = notesToDelete.map((note) => note.id);
    await deleteNoteIdsFromStorageAsync(noteIdsToDelete); //* delete noteIds first from storage, so they don't appear in the list of notes anymore
    await AsyncStorage.multiRemove(notesToDelete.map((note) => noteKey(note.id))); //* delete the notes themselves from storage

    for(const note of notesToDelete) 
    {
        deleteFileIfExists(note.mediaUri); //* delete the media Uri from storage
        if(note.thumbnailUri != null)
        {
            deleteFileIfExists(note.thumbnailUri);
        }
    }
}

export async function deleteFolderFromStorageAsync(folderId: string): Promise<void>
{
    //* delete all notes that point to the folderId
    const all = await getNotesFromStorageAsync();
    const notesToDelete = all.filter((note) => note.folderId === folderId);
    await deleteNotesFromStorageAsync(notesToDelete);

    //* delete folder cover and the folder itself
    const folders = await getFoldersFromStorageAsync();
    const folder = folders.find((f) => f.id === folderId);
    if (folder?.coverUri != null) deleteFileIfExists(folder.coverUri);
    await saveFoldersToStorageAsync(folders.filter((f) => f.id !== folderId));
}