export type NoteMediaType = "image" | "video";

export type NoteModel = {
    id: string;
    mediaUri: string;
    mediaType: NoteMediaType;
    thumbnailUri: string | null;
    note: string;
    date: string;
    tagIds: string[];
    folderId: string | null;
    createdAt: string;
}

export type TagModel = {
    id: string;
    title: string;
}