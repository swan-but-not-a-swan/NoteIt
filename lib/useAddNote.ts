//! Manually reviewed since 15/09/2026

import { useState } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";
import { DateTimePickerAndroid, DateTimePickerChangeEvent } from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { toLocalISODate, todayISO } from "@/lib/date";
import { appendSnippet, saveNoteDraftAsync } from "@/lib/noteHelper";
import { NoteMediaType, TagModel } from "@/models/NoteModel";
import { SnippetModel } from "@/models/SnippetModel";

type Options = {
    storedTags: TagModel[];
    snippets: SnippetModel[];
    onSaved: () => void | Promise<void>;
};

type MediaSource = "camera" | "library";

export function useAddNote({ storedTags, snippets, onSaved }: Options) {
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
    const [saving, setSaving] = useState(false);

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
        if (clean.length > 0) {
            setNoteTags((current) => (current.some((t) => t.toLowerCase() === clean) ? current : [...current, clean]));
        }
        setNoteTagInput("");
    };

    const removeNoteTag = (tag: string) => {
        setNoteTags((current) => current.filter((t) => t !== tag));
    };

    const toggleStoredTag = (tag: TagModel) => {
        const title = tag.title.toLowerCase();
        setNoteTags((current) =>
            current.some((tag) => tag.toLowerCase() === title) //* adds or removes the tag from the note's list of tags
                ? current.filter((t) => t.toLowerCase() !== title)
                : [...current, tag.title]
        );
    };

    const insertNoteSnippet = (text: string) => {
        setNoteText((current) => appendSnippet(current, text));
    };

    //* asks where the media comes from before opening anything: iOS's action
    //* sheet, and Android's dialog, since Android has no action sheet of its own
    const chooseNoteMediaSource = () => {
        if (Platform.OS === "web") {
            setNoteError("Photo/video preview isn't supported in the web preview — test this on a device or simulator.");
            return;
        }

        if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
                { options: ["Cancel", "Take Photo", "Choose from Library"], cancelButtonIndex: 0 },
                (buttonIndex) => {
                    if (buttonIndex === 1) pickNoteMediaAsync("camera");
                    else if (buttonIndex === 2) pickNoteMediaAsync("library");
                },
            );
            return;
        }

        Alert.alert(
            "Add photo or video",
            undefined,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Take photo", onPress: () => pickNoteMediaAsync("camera") },
                { text: "Choose from library", onPress: () => pickNoteMediaAsync("library") },
            ],
            { cancelable: true },
        );
    };

    const pickNoteMediaAsync = async (source: MediaSource) => {
        const permission =
            source === "camera"
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            setNoteError(
                source === "camera"
                    ? "Allow camera access to take a photo."
                    : "Allow photo library access to add a photo or video.",
            );
            return;
        }

        //* full screen, not iOS's default page sheet: this picker opens from
        //* inside the AddNote <Modal>, and a page-sheet picker over a modal
        //* can resolve as cancelled — or never resolve at all — so the pick
        //* is silently lost. Only shows on a device; the emulator is fine.
        const presentationStyle = ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN;
        //* the camera takes photos only: recording video would also need the
        //* microphone permission, which the app doesn't ask for
        const result =
            source === "camera"
                ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], presentationStyle })
                : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], presentationStyle });
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
        setNoteMediaUri(null);
        setNoteMediaType(null);
        setNoteMediaMimeType(null);
    };

    const onChangeNoteDate = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
        setNoteDate(toLocalISODate(selectedDate));
    };

    const pressNoteDate = () => {
        if (Platform.OS === "web") {
            setNoteError("Date picker isn't supported in the web preview — test this on a device or simulator.");
            return;
        }

        //*android has a native dialog, so we open it imperatively and don't render the component at all
        DateTimePickerAndroid.open({
            value: new Date(`${noteDate}T00:00:00`),
            mode: "date",
            onValueChange: onChangeNoteDate,
        });
    };

    const saveNoteAsync = async () => {
        if (saving) return;
        if (noteMediaUri == null) {
            setNoteError("Add a photo or video first.");
            return;
        }

        setSaving(true);
        const error = await saveNoteDraftAsync(
            {
                mediaUri: noteMediaUri,
                mediaType: noteMediaType ?? "image",
                mimeType: noteMediaMimeType,
                text: noteText,
                date: noteDate,
                tags: noteTags,
                folderId: noteFolderId,
            },
            storedTags,
        );
        setSaving(false);

        if (error != null) {
            setNoteError(error);
            return;
        }

        setVisible(false);
        Promise.resolve(onSaved()).catch((reloadError) => {
            console.warn("Saved the note, but couldn't reload the list.", reloadError);
        });
    };

    return {
        open,
        /** Spread onto <AddNote>; supply `colors` and `folders` at the call site. */
        props: {
            visible,
            mediaUri: noteMediaUri,
            mediaType: noteMediaType,
            onPickMedia: chooseNoteMediaSource,
            onRemoveMedia: removeNoteMedia,
            note: noteText,
            onNoteChange: setNoteText,
            snippets,
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
            saving,
        },
    };
}
