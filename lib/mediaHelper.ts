import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import {useVideoPlayer} from "expo-video";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

export function deleteThumbnailFile(uri: string) {
    const file = new File(uri);
    if (file.exists) {
        file.delete(); //* throws if missing, hence the exists check — this makes it idempotent
    }
}

export async function thumbnailFileValidatorAsync():Promise<string|undefined>
{
    if (Platform.OS === "web") 
    {
        //*expo file system doesn't work on web, so error is shown if thumbnail is picked on web.
        return "Photo thumbnails aren't supported in the web preview — test this on a device or simulator.";
    }
    
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
        return "Allow photo library access to set a thumbnail.";
    }
    return undefined;
}

export async function getThumbnailFileUri(destDir: Directory, croppedUri: string): Promise<string>
{
    destDir.create({ intermediates: true, idempotent: true });
    const dest = new File(destDir, `${Crypto.randomUUID()}.jpg`);
    await new File(croppedUri).copy(dest); // file written before...
    return dest.uri;
}

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

export function extensionFrom(source: SourceMedia, mediaType: "image" | "video"): string
{
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

export async function getNoteMediaFileUri(
    destDir: Directory, source: SourceMedia, mediaType: "image" | "video"): Promise<string>
{
    destDir.create({ intermediates: true, idempotent: true });
    const extension = extensionFrom(source, mediaType); //* get the extension of the media file
    const dest = new File(destDir, `${Crypto.randomUUID()}.${extension}`);
    await new File(source.uri).copy(dest); //* creates a copy of the media file in the app storage
    return dest.uri;
}

// Width a grid/filmstrip tile is ever rendered at, with headroom for the
// densest screens — a tile is roughly a third of the screen, so this is
// generous rather than tight.
const THUMBNAIL_WIDTH = 400;

// Shrinks a photo down to tile size so the gallery isn't decoding a full
// camera-resolution image per cell. Height is omitted so the aspect ratio is
// preserved. Like getThumbnailFromVideo, the result is written to the *cache*
// directory (saveAsync's own documentation), so the caller has to copy it
// into app storage with getThumbnailFileUri.
export async function getThumbnailFromImageAsync(source : string) : Promise<string>
{
    const rendered = await ImageManipulator.manipulate(source).resize({ width: THUMBNAIL_WIDTH }).renderAsync();
    const { uri } = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
    return uri;
}

// Grabs a still from a video. The file this produces lands in the *cache*
// directory on both platforms (see the module's native source), so a caller
// that needs it to outlive an OS cache sweep has to copy it into app storage
// with getThumbnailFileUri.
export async function getThumbnailFromVideo(source : string) : Promise<string>
{
    //* `time` is in milliseconds, so 0 is the first frame. Nudge it a few
    //* hundred ms if a recording turns out to start on a black frame.
    //* `quality` keeps the file small — this is only ever shown as a tile.
    const {uri} =  await useVideoPlayer.ge
    return uri;
}