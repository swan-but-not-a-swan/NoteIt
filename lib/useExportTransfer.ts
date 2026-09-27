import { useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import type { FolderModel } from "@/models/FolderModel";
import type { NoteModel, TagModel } from "@/models/NoteModel";
import {
  buildExportPayload,
  shareExportFileAsync,
  TransferCancelledError,
  TransferError,
  writeExportFileAsync,
  type TransferSignal,
} from "@/lib/noteTransfer";

//* how long an iOS modal takes to finish dismissing; the share sheet can't be
//* presented while it is still on its way out
const MODAL_DISMISS_MS = 350;

/**
 * Exporting as the screens see it: build the manifest, write the file while
 * showing progress, then hand it to the share sheet. One hook so the viewer's
 * share button, the gallery's menus and the folder dialog all behave the same.
 *
 * Render <ExportProgress progress={progress} onCancel={cancel} /> alongside.
 */
export function useExportTransfer(tags: TagModel[]) {
  //* non-null exactly while a file is being written — what opens the dialog
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  //* the running export's cancel switch; null when none is running, which is
  //* also what stops a second tap starting a second export
  const signalRef = useRef<TransferSignal | null>(null);

  const exportAsync = async (notes: NoteModel[], folder: FolderModel | null) => {
    if (signalRef.current != null) return;
    if (folder == null && notes.length === 0) return;
    const signal: TransferSignal = { cancelled: false };
    signalRef.current = signal;
    setProgress({ done: 0, total: 0 });

    try {
      const { payload, mediaUris } = buildExportPayload(notes, tags, folder);
      const fileUri = await writeExportFileAsync(
        payload,
        mediaUris,
        (done, total) => setProgress({ done, total }),
        signal,
      );

      //* the dialog goes before the share sheet comes: iOS won't present one
      //* over a modal that is still closing
      setProgress(null);
      if (Platform.OS === "ios") await new Promise((resolve) => setTimeout(resolve, MODAL_DISMISS_MS));
      await shareExportFileAsync(fileUri, fileNameFor(notes, folder));
    } catch (error) {
      setProgress(null);
      if (error instanceof TransferCancelledError) return;
      Alert.alert(
        "Couldn't export",
        error instanceof TransferError ? error.message : "That didn't export. Try again.",
      );
    } finally {
      signalRef.current = null;
    }
  };

  const cancel = () => {
    if (signalRef.current != null) signalRef.current.cancelled = true;
  };

  return { exporting: progress != null, progress, exportAsync, cancel };
}

/** What the file is called in the share sheet and the chat it lands in. */
function fileNameFor(notes: NoteModel[], folder: FolderModel | null): string {
  if (folder != null) return `${folder.name}.noteit`;
  return notes.length === 1 ? "Picture-note.noteit" : `${notes.length} picture-notes.noteit`;
}
