import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";

export function deleteThumbnailFile(uri: string) {
    const file = new File(uri);
    if (file.exists) {
        file.delete(); // throws if missing, hence the exists check — this makes it idempotent
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

export function getThumbnailFileUri(destDir: Directory, croppedUri: string): string
{
    destDir.create({ intermediates: true, idempotent: true });
    const dest = new File(destDir, `${Crypto.randomUUID()}.jpg`);
    new File(croppedUri).copy(dest); // file written before...
    return dest.uri;
}

export function getNoteMediaFileUri(
    destDir: Directory, mediaUri: string, mediaExtension: string): string
{
    destDir.create({ intermediates: true, idempotent: true });
    const dest = new File(destDir, `${Crypto.randomUUID()}.${mediaExtension}`);
    new File(mediaUri).copy(dest);
    return dest.uri;
}