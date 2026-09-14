import { Directory, File } from "expo-file-system";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import * as VideoThumbnails from "expo-video-thumbnails";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

//* Width a grid/filmstrip tile is ever rendered at.
const THUMBNAIL_WIDTH = 400;

const MEDIA_EXTENSIONS: Record<"image" | "video", { allowed: string[]; fallback: string }> = {
    image: { allowed: ["jpg", "jpeg", "png", "heic", "heif", "webp", "gif"], fallback: "jpg" },
    video: { allowed: ["mov", "mp4", "m4v", "webm", "avi", "mkv"], fallback: "mp4" },
};

const MIME_EXTENSIONS: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/quicktime": "mov",
    "video/mp4": "mp4",
    "video/x-m4v": "m4v",
    "video/webm": "webm",
    "video/x-msvideo": "avi",
    "video/x-matroska": "mkv",
};

export type SourceMedia = {
    uri: string;
    mimeType?: string | null;
};

//! Manually reviewed since 14/09/2026
export async function moveAndGetImageUri(destDir: Directory, sourceUri: string): Promise<string> {
    destDir.create({ intermediates: true, idempotent: true });
    const dest = new File(destDir, `${Crypto.randomUUID()}.jpg`);
    await new File(sourceUri).move(dest); //* move file from cache into app storage
    return dest.uri;
}

//! Manually reviewed since 14/09/2026
export function deleteFileIfExists(uri: string) {
    try {
        const file = new File(uri);
        if (file.exists) {
            file.delete();
        }
    } catch (error) {
        console.error("Error deleting file:", uri, error);
    }
}

//! Manually reviewed since 14/09/2026
export function extensionFrom(source: SourceMedia, mediaType: "image" | "video"): string {
    const { allowed, fallback } = MEDIA_EXTENSIONS[mediaType];

    //* what the picker reported
    const declared = source.mimeType?.toLowerCase().split(";")[0].trim();
    const fromMime = (declared != null) ? MIME_EXTENSIONS[declared] : undefined;
    if (fromMime != null && allowed.includes(fromMime)) return fromMime;

    //* read it off the uri instead — the real fallback on providers that
    //* don't report a mime type at all
    const match = /\.([A-Za-z0-9]{1,5})$/.exec(source.uri.split("?")[0]);
    const fromUri = match != null ? match[1].toLowerCase() : undefined;
    if (fromUri != null && allowed.includes(fromUri)) return fromUri;

    return fallback;
}

//! Manually reviewed since 14/09/2026
export async function copyAndGetMediaFileUri(destDir: Directory, source: SourceMedia, mediaType: "image" | "video"): Promise<string> {
    destDir.create({ intermediates: true, idempotent: true });
    const extension = extensionFrom(source, mediaType); //* get the extension of the media file
    const dest = new File(destDir, `${Crypto.randomUUID()}.${extension}`);
    await new File(source.uri).copy(dest); //* creates a copy of the media file from gallery to the app storage
    return dest.uri;
}

//! Manually reviewed since 14/09/2026
export async function thumbnailFileValidatorAsync(): Promise<string | undefined> {
    if (Platform.OS === "web")
        return "Photo thumbnails aren't supported in the web preview — test this on a device or simulator.";

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
        return "Allow photo library access to set a thumbnail.";
    }
    return undefined;
}

//! Manually reviewed since 14/09/2026
export async function getThumbnailFromImageAsync(source: string): Promise<string> {
    const rendered = await ImageManipulator.manipulate(source).resize({ width: THUMBNAIL_WIDTH }).renderAsync();
    const { uri } = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
    return uri;
}

//! Manually reviewed since 14/09/2026
export async function getThumbnailFromVideoAsync(source: string): Promise<string> {
    const { uri } = await VideoThumbnails.getThumbnailAsync(source, { time: 0, quality: 0.7 });
    try {
        return await getThumbnailFromImageAsync(uri); //* resize the thumbnail to a smaller size
    } finally {
        deleteFileIfExists(uri); //* the full-size frame is only an intermediate
    }
}
