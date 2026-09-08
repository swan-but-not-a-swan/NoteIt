import { useState } from "react";
import { Platform } from "react-native";
import { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Crypto from "expo-crypto";
import { Directory, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import {
    getNoteMediaFileUri,
    getThumbnailFileUri,
    getThumbnailFromImageAsync,
    getThumbnailFromVideo,
    SourceMedia,
} from "@/lib/mediaHelper";
import { todayISO } from "@/lib/date";
import { saveNoteToStorageAsync, saveTagsToStorageAsync } from "@/persistence/FileStorage";
import { NoteMediaType, NoteModel, TagModel } from "@/models/NoteModel";

const getNoteMediaDir = () => new Directory(Paths.document, "note-media");

type Options = {
    /** Previously used tags — drives the quick-pick row, and resolves names to
     *  ids on save. */
    storedTags: TagModel[];
    /** Runs once a note has been written, so the screen can reload whichever
     *  lists it shows. The modal has already closed by this point. */
    onSaved: () => void | Promise<void>;
};

/**
 * Everything the AddNote modal needs, so a screen can present it without
 * owning the composition state itself.
 *
 * Extracted from home so the folder screen can show the same modal in place,
 * over its own grid, instead of navigating back to home to reach it. The
 * alternative was duplicating fifteen useStates and the whole save pipeline
 * in a second file, where the two copies would drift the first time one was
 * touched.
 *
 * `props` is shaped to match AddNote's own props exactly, minus the two a
 * screen has to supply itself (`colors` and `folders`), so a caller spreads it
 * rather than restating twenty lines of plumbing.
 */
export function useAddNote({ storedTags, onSaved }: Options) {
    const [visible, setVisible] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [noteMediaUri, setNoteMediaUri] = useState<string | null>(null);
    const [noteMediaType, setNoteMediaType] = useState<NoteMediaType | null>(null);
    const [noteMediaMimeType, setNoteMediaMimeType] = useState<string | null>(null);
    const [noteDate, setNoteDate] = useState(todayISO());
    const [noteTags, setNoteTags] = useState<string[]>([]);
    const [noteTagInput, setNoteTagInput] = useState("");
    const [noteFolderId, setNoteFolderId] = useState<string | null>(null);
    const [noteError, setNoteError] = useState<string | undefined>(undefined);
    //* guards a second Save while the first is still writing — every await in
    //* saveNoteAsync is a chance for another tap to start a duplicate note
    const [saving, setSaving] = useState(false);

    /** Opens a blank note. Pass a folder id to preselect it. */
    const open = (folderId: string | null = null) => {
        setNoteText("");
        setNoteMediaUri(null);
        setNoteMediaType(null);
        setNoteMediaMimeType(null);
        setNoteDate(todayISO());
        setNoteTags([]);
        setNoteTagInput("");
        setNoteFolderId(folderId);
        setNoteError(undefined);
        setVisible(true);
    };

    const cancel = () => {
        setVisible(false);
    };

    const commitNoteTag = () => {
        const clean = noteTagInput.trim().replace(/^#/, "").toLowerCase();
        if (clean.length > 0 && !noteTags.includes(clean)) {
            setNoteTags((tags) => [...tags, clean]);
        }
        setNoteTagInput("");
    };

    const removeNoteTag = (tag: string) => {
        setNoteTags((tags) => tags.filter((t) => t !== tag));
    };

    const toggleStoredTag = (tag: TagModel) => {
        setNoteTags((tags) =>
            tags.includes(tag.title) ? tags.filter((t) => t !== tag.title) : [...tags, tag.title]
        );
    };

    const insertNoteSnippet = (text: string) => {
        setNoteText((current) => (current.trim().length > 0 ? `${current.trim()} ${text}` : text));
    };

    const pickNoteMediaAsync = async () => {
        if (Platform.OS === "web") {
            setNoteError("Photo/video preview isn't supported in the web preview — test this on a device or simulator.");
            return;
        }

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            setNoteError("Allow photo library access to add a photo or video.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images", "videos"],
        });
        if (result.canceled) return;

        const asset = result.assets[0];
        setNoteMediaUri(asset.uri);
        //*checks whether the media is image or video
        setNoteMediaType(
            asset.type === "video" || asset.mimeType?.startsWith("video/") === true ? "video" : "image",
        );
        setNoteMediaMimeType(asset.mimeType ?? null);
        setNoteError(undefined);
    };

    const removeNoteMedia = () => {
        // Just the raw picker URI at this point, not a copy in app storage —
        // that only happens once saveNoteAsync actually persists the note — so
        // there's no file to delete here, unlike folder thumbnails.
        setNoteMediaUri(null);
        setNoteMediaType(null);
        setNoteMediaMimeType(null);
    };

    const onChangeNoteDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (event.type === "set" && selectedDate != null) {
            setNoteDate(selectedDate.toISOString().slice(0, 10));
        }
    };

    //* only android and web reach this — ios renders UIDatePicker's compact
    //* control, which owns its own trigger and popover, so AddNote never calls it
    const pressNoteDate = () => {
        if (Platform.OS === "web") {
            setNoteError("Date picker isn't supported in the web preview — test this on a device or simulator.");
            return;
        }

        //*android has a native dialog, so we open it imperatively and don't render the component at all
        DateTimePickerAndroid.open({
            value: new Date(`${noteDate}T00:00:00`),
            mode: "date",
            onChange: onChangeNoteDate,
        });
    };

    const saveTagsAsync = async (): Promise<string[]> => {
        //* check for new tags that don't exist in storage yet
        const newTagNames = noteTags.filter(
            (name) => !storedTags.some((tag) => tag.title.toLowerCase() === name.toLowerCase())
        );
        const newTags: TagModel[] = newTagNames.map((title) => ({ id: Crypto.randomUUID(), title }));
        const allTags = [...storedTags, ...newTags];
        if (newTags.length > 0) {
            await saveTagsToStorageAsync(allTags);
        }
        //* return tagIds for the note, matching the order of noteTags (which is what the user sees)
        const tagIds = noteTags.map(
            (name) => allTags.find((tag) => tag.title.toLowerCase() === name.toLowerCase())!.id
        );
        return tagIds;
    };

    const saveNoteAsync = async () => {
        if (saving) return;
        if (noteMediaUri == null) {
            setNoteError("Add a photo or video first.");
            return;
        }
        setSaving(true);
        try {
            //* Save media to app storage
            const notemediaType: NoteMediaType = noteMediaType ?? "image";
            const source: SourceMedia = { uri: noteMediaUri, mimeType: noteMediaMimeType };
            const destUri = await getNoteMediaFileUri(getNoteMediaDir(), source, notemediaType);
            //* get thumbnail of the media and save it to app storage — a video's
            //* first frame, or a tile-sized copy of a photo so the gallery isn't
            //* decoding full camera resolution per cell. Both are generated into
            //* the cache directory, so both get copied into app storage to survive
            //* an OS cache sweep. Generation can throw on an unsupported codec —
            //* the note is still worth saving, the tiles just fall back to a
            //* placeholder (photos fall back to their full-size media).
            let coverUri: string | null = null;
            try {
                const generatedUri = notemediaType === "video"
                    ? await getThumbnailFromVideo(destUri)
                    : await getThumbnailFromImageAsync(destUri);
                coverUri = await getThumbnailFileUri(getNoteMediaDir(), generatedUri);
            } catch {
                coverUri = null;
            }
            //* Save tags to storage
            const noteTagIds = await saveTagsAsync();
            //* Connect note to folder if one is selected, else null (gallery)
            const newNote: NoteModel = {
                id: Crypto.randomUUID(),
                mediaUri: destUri,
                mediaType: notemediaType,
                thumbnailUri: coverUri,
                note: noteText,
                date: noteDate,
                tagIds: noteTagIds,
                folderId: noteFolderId,
                createdAt: new Date().toISOString(),
            };
            //* Save picture-note to storage
            await saveNoteToStorageAsync(newNote);
            setVisible(false);
            await onSaved();
        } catch {
            //* the copy, the storage write or the tag write failed. without this
            //* the rejection escapes a Pressable's onPress as an unhandled
            //* promise and the sheet just sits there saying nothing
            setNoteError("Couldn't save that note. Try again.");
        } finally {
            setSaving(false);
        }
    };

    return {
        open,
        /** Spread onto <AddNote>; supply `colors` and `folders` at the call site. */
        props: {
            visible,
            mediaUri: noteMediaUri,
            mediaType: noteMediaType,
            onPickMedia: pickNoteMediaAsync,
            onRemoveMedia: removeNoteMedia,
            note: noteText,
            onNoteChange: setNoteText,
            onInsertSnippet: insertNoteSnippet,
            date: noteDate,
            onPressDate: pressNoteDate,
            onDateChange: setNoteDate,
            tags: noteTags,
            tagInput: noteTagInput,
            onTagInputChange: setNoteTagInput,
            onCommitTag: commitNoteTag,
            onRemoveTag: removeNoteTag,
            storedTags,
            onToggleStoredTag: toggleStoredTag,
            folderId: noteFolderId,
            onFolderChange: setNoteFolderId,
            error: noteError,
            onCancel: cancel,
            onSave: saveNoteAsync,
        },
    };
}
