import { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  AppState,
  BackHandler,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerChangeEvent } from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@/theme/ThemeContext";
import { LIGHT_THEME } from "@/theme/colors";
import { flatSurface } from "@/theme/glass";
import { exifCaptureDate, formatDayDate, toLocalISODate, todayISO } from "@/lib/date";
import { appendSnippet, saveNoteDraftAsync, saveTagsAsync } from "@/lib/noteHelper";
import { useLibrary } from "@/lib/LibraryContext";
import { useEntitlements } from "@/lib/EntitlementsContext";
import { useKeyboardHeight } from "@/lib/useKeyboardHeight";
import { useSaveInterstitial } from "@/lib/useSaveInterstitial";
import type { NoteMediaType, TagModel } from "@/models/NoteModel";
import DraftNoteCard from "@/components/DraftNoteCard";
import GlassPressable from "@/components/GlassPressable";
import InputPanel, { inputPanelHeight } from "@/components/InputPanel";
import NoteFields from "@/components/NoteFields";
import OverflowMenu from "@/components/OverflowMenu";
import PressableScale from "@/components/PressableScale";
import SuggestionRow, { type SuggestionChip } from "@/components/SuggestionRow";
import TopBar, { TopBarActions, TopBarIconButton } from "@/components/TopBar";
import WheelPicker, { type WheelItem } from "@/components/WheelPicker";
import { useFieldFocus } from "@/theme/focus";
import { addNoteScreenStyles as styles } from "@/theme/styles/note.styles";

/** What opens in the keyboard's place: the folder wheel, or the date picker. */
type Picker = "folder" | "date";
/** Which text field has the keyboard, which decides what rides on top of it. */
type TypingField = "note" | "tags";
type MediaSource = "camera" | "library";

/** The titles behind a saved note's tag ids, in the order it stored them. The
 *  editor works in titles, the note stores ids, and this is the seam. */
function tagTitlesOf(tagIds: string[], storedTags: TagModel[]): string[] {
  return tagIds
    .map((tagId) => storedTags.find((tag) => tag.id === tagId)?.title)
    .filter((title): title is string => title != null);
}

const sameTags = (a: string[], b: string[]) => a.length === b.length && a.every((tag, i) => tag === b[i]);

/** A tag as the store keys it: no leading #, lower case, no outer spaces. */
const cleanTag = (text: string) => text.trim().replace(/^#/, "").toLowerCase();

// Writing a picture-note, and reworking one: the same screen, because a note
// is the same thing before and after it is saved, and two screens drawing it
// meant two places to fix whenever it changed.
//
// `id` is what picks the mode. Without one this is a new note; with one, that
// note is loaded into the same fields and saving replaces it. The only thing
// editing can't do is swap the media — the picture is the note's identity, and
// replacing it means copying a new file, rebuilding the thumbnail and clearing
// up the old one, which is a job of its own.
//
// Layout (v1.2): the picture, the date line, the note, then Tags, Folder and
// Date as fields of their own under it. Whatever takes the bottom of the screen
// changes with what you're doing — the keyboard with snippets on top of it for
// the note, the keyboard with saved tags on top for Tags, a folder wheel or a
// date picker in the keyboard's place for those two. Save stays pinned under
// all of it and only appears once there's a picture to save.
//
// The state lives here rather than in a hook of its own. It was a hook while
// this was a modal that several screens opened; now that it is a route, the
// hook's `visible`/`open`/`cancel` were three ways of saying "navigate", and
// the wiring read as indirection with nothing on the other side of it.
export default function AddNoteScreen() {
  const { colors } = useTheme();
  const captionFocus = useFieldFocus(colors);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const { id, folderId: folderParam } = useLocalSearchParams<{ id?: string; folderId?: string }>();

  const { notes, folders, tags: storedTags, snippets, saveNoteAsync, refreshNotesAndTagsAsync } = useLibrary();
  const { hasPlus } = useEntitlements();

  //* the note being reworked, or null when this is a new one
  const editing = id != null ? notes.find((n) => n.id === id) ?? null : null;

  const [note, setNote] = useState("");
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<NoteMediaType | null>(null);

  //* the full-screen ad after saving a note, new or edited — an image ad after
  //* a photo, a video ad after a video. Starts loading once there's a picture
  //* (picked, or the edited note's own), so it's ready by Save; never for a
  //* subscriber, and not for an edit that changed nothing (saveAsync just
  //* closes that)
  const showSaveAdThen = useSaveInterstitial(
    mediaUri != null ? (mediaType === "video" ? "video" : "image") : null,
    hasPlus === false,
  );
  const [mediaMimeType, setMediaMimeType] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  //* every await below is a chance for a second tap to start a duplicate write
  const [saving, setSaving] = useState(false);

  const [picker, setPicker] = useState<Picker | null>(null);
  const [typing, setTyping] = useState<TypingField | null>(null);
  const [noteOpen, setNoteOpen] = useState(true); //* the viewer's two modes, note = true, photo = false
  //* how tall the pinned Save area is, so the fields can scroll out from under it
  const [footerHeight, setFooterHeight] = useState(0);

  //* whichever scroll view holds the fields: the empty state's, or the draft card's
  const scrollRef = useRef<ScrollView>(null);
  //* the folder field reflects the folder this was opened from on the first
  //* render, rather than a frame later
  const [folderApplied, setFolderApplied] = useState(false);
  if (folderApplied === false) {
    setFolderApplied(true);
    //* only a new note takes its folder from the route — an existing one
    //* brings its own, filled in below
    if (id == null && folderParam != null) setFolderId(folderParam);
  }

  // The note arrives from the store a render or two after the route param
  // does, so this waits for it rather than reading once and finding nothing.
  // Adjusted during render, like the folder above: through an effect the
  // screen would paint one empty frame before filling in.
  const [prefilled, setPrefilled] = useState(false);
  if (prefilled === false && editing != null) {
    setPrefilled(true);
    setNote(editing.note);
    setMediaUri(editing.mediaUri);
    setMediaType(editing.mediaType);
    setMediaMimeType(null); //* already in app storage; nothing left to copy
    setDate(editing.date);
    setFolderId(editing.folderId);
    setTags(tagTitlesOf(editing.tagIds, storedTags));
  }

  const folder = folders.find((f) => f.id === folderId) ?? null;

  //* what a cancel would throw away: everything for a new note, and whatever
  //* differs from what was stored for one being reworked
  const dirty =
    editing != null
      ? note !== editing.note ||
        date !== editing.date ||
        folderId !== editing.folderId ||
        !sameTags(tags, tagTitlesOf(editing.tagIds, storedTags))
      : mediaUri != null || note.trim().length > 0 || tags.length > 0;

  const hasTag = (title: string) => tags.some((t) => t.toLowerCase() === title.toLowerCase());

  const commitTag = () => {
    const clean = cleanTag(tagInput);
    if (clean.length > 0) {
      setTags((current) => (current.some((t) => t.toLowerCase() === clean) ? current : [...current, clean]));
    }
    setTagInput("");
  };

  //* a saved tag picked from the row on the keyboard
  const addTag = (title: string) => {
    setTags((current) => (current.some((t) => t.toLowerCase() === title.toLowerCase()) ? current : [...current, title]));
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags((current) => current.filter((t) => t !== tag));
  };

  const insertSnippet = (text: string) => {
    setNote((current) => appendSnippet(current, text));
  };

  // Whether there is text worth offering to paste. `hasStringAsync` only
  // reports that something is there — reading it is what raises iOS's paste
  // banner, and that belongs to a tap, not to opening the screen.
  const [canPaste, setCanPaste] = useState(false);
  useEffect(() => {
    let cancelled = false;

    const check = () => {
      Clipboard.hasStringAsync().then(
        (has) => {
          if (!cancelled) setCanPaste(has);
        },
        () => {
          //* nothing to ask (the web preview, or a platform that refuses):
          //* leave the chip off rather than offering something that can't work
        },
      );
    };

    check();
    //* and again whenever the app comes back to the front. Copying happens in
    //* another app — a browser, a chat — so the clipboard almost always fills
    //* while this screen is in the background, and a check that only ran on
    //* mount would leave the chip hidden exactly when it is wanted.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const pasteIntoNote = async () => {
    const text = await Clipboard.getStringAsync();
    //* it emptied between the check and the tap, or holds only whitespace
    if (text.trim().length === 0) {
      setCanPaste(false);
      return;
    }
    //* appended the way a snippet is, so pasting into a half-written note
    //* reads as another paragraph rather than running into the last word
    setNote((current) => appendSnippet(current, text));
  };

  //* asks where the media comes from before opening anything: iOS's action
  //* sheet, and Android's dialog, since Android has no action sheet of its own
  const chooseMediaSource = () => {
    if (Platform.OS === "web") {
      setError("Photo/video preview isn't supported in the web preview — test this on a device or simulator.");
      return;
    }

    Keyboard.dismiss();
    setPicker(null);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take Photo", "Choose from Library"], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) pickMediaAsync("camera");
          else if (buttonIndex === 2) pickMediaAsync("library");
        },
      );
      return;
    }

    Alert.alert(
      "Add photo or video",
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Take photo", onPress: () => pickMediaAsync("camera") },
        { text: "Choose from library", onPress: () => pickMediaAsync("library") },
      ],
      { cancelable: true },
    );
  };

  const pickMediaAsync = async (source: MediaSource) => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        source === "camera"
          ? "Allow camera access to take a photo."
          : "Allow photo library access to add a photo or video.",
      );
      return;
    }

    //* full screen, not iOS's default page sheet: a page-sheet picker opening
    //* over a presented screen can resolve as cancelled — or never resolve at
    //* all — so the pick is silently lost. Only shows on a device.
    const presentationStyle = ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN;
    //* the camera takes photos only: recording video would also need the
    //* microphone permission, which the app doesn't ask for. exif carries the
    //* day the photo was taken, which the date below is preselected from — it
    //* is read for images only, a video comes back without any of it
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], presentationStyle, exif: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], presentationStyle, exif: true });
    if (result.canceled) return;

    const asset = result.assets[0];
    //* the draft card mounts with this and puts the cursor in the note
    setNoteOpen(true);
    setMediaUri(asset.uri);
    //* checks whether the media is image or video
    setMediaType(asset.type === "video" || asset.mimeType?.startsWith("video/") === true ? "video" : "image");
    setMediaMimeType(asset.mimeType ?? null);
    setError(undefined);

    //* the photo's own day, offered as the default — the date stays a free
    //* choice and this only fills it in. Nothing is written when the file has
    //* no date to read, so a day already chosen is never overwritten by a
    //* guess. Videos carry no exif and keep whatever date is set.
    const captured = exifCaptureDate(asset.exif);
    if (captured != null) setDate(captured);
  };

  const onChangeDate = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    setDate(toLocalISODate(selectedDate));
  };

  //* Android has a native dialog, so it's opened imperatively rather than as a
  //* panel; iOS gets the wheel in the keyboard's place
  const openPicker = (next: Picker) => {
    //* the folder wheel is JS and works anywhere; the date picker is native
    if (next === "date" && Platform.OS === "web") {
      setError("Date picker isn't supported in the web preview — test this on a device or simulator.");
      return;
    }
    Keyboard.dismiss();

    if (next === "date" && Platform.OS === "android") {
      setPicker(null);
      DateTimePickerAndroid.open({
        value: new Date(`${date}T00:00:00`),
        mode: "date",
        onValueChange: onChangeDate,
      });
      return;
    }
    setPicker((current) => (current === next ? null : next));
  };

  const saveAsync = async () => {
    if (saving || mediaUri == null) return;

    //* an untouched note would still cost a write, so treat saving one as the
    //* cancel it effectively is
    if (editing != null && !dirty) {
      router.back();
      return;
    }

    setSaving(true);
    if (editing != null) {
      //* the media stays as it is; only what is written about it changes.
      //* saveNoteAsync replaces by id, so this updates rather than adding
      const tagIds = await saveTagsAsync(tags, storedTags);
      await saveNoteAsync({ ...editing, note, date, tagIds, folderId });
    } else {
      const failure = await saveNoteDraftAsync(
        {
          mediaUri,
          mediaType: mediaType ?? "image",
          mimeType: mediaMimeType,
          text: note,
          date,
          tags,
          folderId,
        },
        storedTags,
      );
      if (failure != null) {
        setError(failure);
        setSaving(false);
        return;
      }
    }
    setSaving(false);

    await refreshNotesAndTagsAsync(); //* refreshes the store before navigating back
    //* the note is already saved: the ad (when one is ready) comes between
    //* saving and landing back on the notes, and its close is what goes back
    showSaveAdThen(() => router.back());
  };

  const confirmCancel = () => {
    //* nothing written, nothing to lose — don't make anyone dismiss a dialog
    //* they didn't earn
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert(
      editing != null ? "Discard changes?" : "Discard this note?",
      editing != null
        ? "Your changes to this note will not be saved."
        : "The media and the note will be discarded.",
      [
        { text: "Keep writing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ],
    );
  };

  // Android's own back gesture leaves the same way the X does, so it has to
  // ask the same question. Without this a picked photo and everything written
  // about it went in one swipe, with nothing said. An open picker goes first,
  // the way back closes the keyboard before it leaves a screen.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (picker != null) {
        setPicker(null);
        return true;
      }
      if (!dirty) return false; //* nothing to lose: let the back happen
      confirmCancel();
      return true; //* handled — the alert decides what happens next
    });
    return () => sub.remove();
  });

  const toggleNote = (next: boolean) => {
    if (next === false) Keyboard.dismiss(); //* dismiss the keyboard when switching to the photo view
    setNoteOpen(next);
  };

  const removeMedia = () => {
    setMediaUri(null);
    setMediaType(null);
    setMediaMimeType(null);
    //* the next picture lands on the note again, like the first one did
    setNoteOpen(true);
  };

  //* a text field taking the keyboard closes whichever picker was open
  const startTyping = (field: TypingField) => {
    setTyping(field);
    setPicker(null);
  };
  const stopTyping = (field: TypingField) => {
    setTyping((current) => (current === field ? null : current));
  };

  // What covers the bottom of the screen right now, so the fields can scroll
  // clear of it: the keyboard, a picker, or just Save.
  const bottomCover = Math.max(
    mediaUri != null ? footerHeight : insets.bottom,
    typing != null ? keyboard.height : 0,
    picker != null ? inputPanelHeight(insets.bottom) : 0,
  );
  const bottomInset = bottomCover + 16;
  //* the draft card already ends where Save begins, so it only needs room for
  //* whatever reaches higher than Save — the keyboard, a picker
  const cardInset = Math.max(bottomCover - footerHeight, 0) + 16;

  // A picker opening scrolls to the end, where the fields are, so the one
  // being changed stays in sight above it. Waits a frame for the new padding.
  useEffect(() => {
    if (picker == null) return;
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [picker, bottomInset]);

  // The focused field and the chips under it are one block, and while a
  // keyboard is docked the scroll sets that block's bottom edge on the
  // keyboard's top edge — so the chips read as sitting on the keyboard, the
  // way the old floating row did, but stay under their field when there's no
  // keyboard on screen at all (a hardware one, Gboard's floating toolbar).
  // Measured in the window rather than worked out from layout, because the
  // block lives in a different scroll view before and after the picture.
  // Re-runs when the block changes size: a note growing a line, a tag added.
  const noteBlockRef = useRef<View>(null);
  const tagsBlockRef = useRef<View>(null);
  const scrollOffset = useRef(0);
  const [blockLayouts, setBlockLayouts] = useState(0);
  const onBlockLayout = () => setBlockLayouts((n) => n + 1);
  const { height: windowHeight } = useWindowDimensions();
  useEffect(() => {
    if (typing == null || keyboard.height <= 0) return;
    const block = typing === "tags" ? tagsBlockRef.current : noteBlockRef.current;
    if (block == null) return;
    const frame = requestAnimationFrame(() => {
      block.measureInWindow((_x, y, _width, height) => {
        const keyboardTop = windowHeight - keyboard.height;
        //* a little air between the chips and the keys
        const overshoot = y + height + 8 - keyboardTop;
        if (Math.abs(overshoot) < 2) return;
        scrollRef.current?.scrollTo({ y: Math.max(0, scrollOffset.current + overshoot), animated: true });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [typing, keyboard.height, windowHeight, blockLayouts]);

  const folderItems: WheelItem[] = [
    { key: "none", label: "No folder" },
    ...folders.map((f) => ({ key: f.id, label: f.name, swatch: f.accent })),
  ];
  const folderIndex = folderId == null ? 0 : folders.findIndex((f) => f.id === folderId) + 1;

  //* the chips under the focused field: saved tags for Tags, snippets for the note
  const typed = cleanTag(tagInput);
  const tagChips: SuggestionChip[] = storedTags
    .filter((tag) => !hasTag(tag.title))
    .filter((tag) => typed.length === 0 || tag.title.toLowerCase().includes(typed))
    .map((tag) => ({ key: tag.id, label: `#${tag.title}`, onPress: () => addTag(tag.title) }));
  if (typed.length > 0 && !hasTag(typed) && !storedTags.some((tag) => tag.title.toLowerCase() === typed)) {
    tagChips.push({
      key: "create",
      label: `Create #${typed}`,
      icon: "plus",
      iconColor: colors.teal,
      create: true,
      onPress: commitTag,
    });
  }
  const snippetChips: SuggestionChip[] = [
    ...(canPaste
      ? [{
          key: "paste",
          label: "Paste",
          icon: "clipboard" as const,
          iconColor: colors.teal,
          accessibilityLabel: "Paste from the clipboard",
          onPress: pasteIntoNote,
        }]
      : []),
    ...snippets.map((snippet) => ({
      key: snippet.id,
      label: snippet.name,
      icon: "star" as const,
      iconColor: colors.accent,
      accessibilityLabel: `Insert snippet ${snippet.name}`,
      onPress: () => insertSnippet(snippet.text),
    })),
  ];

  const tagSuggestions = (
    <SuggestionRow
      colors={colors}
      chips={tagChips}
      accessibilityLabel="Saved tags"
      emptyLabel={typed.length > 0 ? "No saved tags match" : "No saved tags yet — type one and press return"}
    />
  );
  const noteSuggestions = (
    <SuggestionRow
      colors={colors}
      chips={snippetChips}
      accessibilityLabel="Snippets"
      emptyLabel="No snippets yet — add them in Settings"
    />
  );

  const fields = (
    <NoteFields
      colors={colors}
      tags={tags}
      onRemoveTag={removeTag}
      tagInput={tagInput}
      onTagInputChange={setTagInput}
      onSubmitTag={commitTag}
      onTagsFocus={() => startTyping("tags")}
      //* whatever was left typed becomes a tag, as it did before
      onTagsBlur={() => {
        stopTyping("tags");
        commitTag();
      }}
      tagsFocused={typing === "tags"}
      tagSuggestions={tagSuggestions}
      tagsBlockRef={tagsBlockRef}
      onTagsBlockLayout={onBlockLayout}
      folderName={folder?.name ?? null}
      folderAccent={folder?.accent ?? null}
      folderOpen={picker === "folder"}
      onPressFolder={() => openPicker("folder")}
      dateLabel={formatDayDate(date)}
      dateOpen={picker === "date"}
      onPressDate={() => openPicker("date")}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <TopBar
        title={editing != null ? "Edit note" : "New note"}
        colors={colors}
        right={
          <TopBarActions>
            {mediaUri != null && (
              <>
                <GlassPressable
                  colors={colors}
                  tint={noteOpen ? colors.accent : undefined}
                  onPress={() => toggleNote(!noteOpen)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: noteOpen }}
                  accessibilityLabel={noteOpen ? "Show the photo" : "Show the note"}
                  style={styles.headerButton}
                >
                  <Feather name="file-text" size={16} color={noteOpen ? colors.accent : colors.textPrimary} />
                </GlassPressable>

                {/* the picture is fixed once a note exists, so the menu that
                    swaps it belongs only to a new one */}
                {editing == null && (
                  <OverflowMenu
                    colors={colors}
                    items={[
                      {
                        key: "change",
                        label: mediaType === "video" ? "Change video" : "Change photo",
                        icon: "image",
                        onPress: chooseMediaSource,
                      },
                      {
                        key: "remove",
                        label: mediaType === "video" ? "Remove video" : "Remove photo",
                        icon: "trash-2",
                        onPress: removeMedia,
                        destructive: true,
                      },
                    ]}
                  />
                )}
              </>
            )}
            <TopBarIconButton
              icon="x"
              accessibilityLabel="Close without saving"
              colors={colors}
              onPress={confirmCancel}
            />
          </TopBarActions>
        }
      />

      {mediaUri == null ? (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.body, { paddingBottom: bottomInset }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={(e) => {
            scrollOffset.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          {/* flat, never glass: it's the page's empty slot, not a control
              floating over it */}
          <PressableScale
            onPress={chooseMediaSource}
            accessibilityRole="button"
            style={[styles.pickButton, flatSurface(colors), { borderStyle: "dashed" }]}
          >
            <Feather name="image" size={30} color={colors.accent} />
            <Text style={[styles.pickLabel, { color: colors.accent }]}>Add photo or video</Text>
            <Text style={[styles.pickHint, { color: colors.stoneDim }]}>A note needs a media</Text>
          </PressableScale>

          {error != null && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

          <Text style={[styles.dateLine, { color: colors.stoneDim }]}>{formatDayDate(date)}</Text>

          {/* the note and its snippet chips, one block lined up with the
              keyboard while the note has it */}
          <View ref={noteBlockRef} onLayout={onBlockLayout} style={styles.noteBlock}>
            <View style={[styles.captionBox, { borderBottomColor: captionFocus.border }]}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="What's happening…"
                placeholderTextColor={captionFocus.placeholder}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Note"
                style={[styles.caption, { color: colors.textPrimary }]}
                onFocus={() => {
                  captionFocus.handlers.onFocus();
                  startTyping("note");
                }}
                onBlur={() => {
                  captionFocus.handlers.onBlur();
                  stopTyping("note");
                }}
              />
            </View>
            {typing === "note" && noteSuggestions}
          </View>

          {fields}
        </ScrollView>
      ) : (
        //* ends where the pinned Save area begins: in photo mode the picture
        //* fills the card, and its bottom (the note's one-line hint) would
        //* otherwise sit behind Save
        <View style={[styles.draftArea, { marginBottom: footerHeight }]}>
          <DraftNoteCard
            colors={colors}
            mediaUri={mediaUri}
            mediaType={mediaType}
            date={date}
            note={note}
            onNoteChange={setNote}
            onNoteFocus={() => startTyping("note")}
            onNoteBlur={() => stopTyping("note")}
            scrollRef={scrollRef}
            bottomInset={cardInset}
            noteSuggestions={noteSuggestions}
            noteBlockRef={noteBlockRef}
            onNoteBlockLayout={onBlockLayout}
            onScrollOffset={(y) => {
              scrollOffset.current = y;
            }}
            noteOpen={noteOpen}
            onToggleNote={toggleNote}
          >
            {fields}
          </DraftNoteCard>
        </View>
      )}

      {/* stationary: pinned to the bottom, and only once there's a picture to
          save. The keyboard and the pickers rise over it rather than carry it */}
      {mediaUri != null && (
        <View
          style={[styles.footer, { paddingBottom: insets.bottom + 18, backgroundColor: colors.bg }]}
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        >
          {error != null && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
          <GlassPressable
            colors={colors}
            tint={colors.accent}
            strength="fill"
            onPress={saveAsync}
            disabled={saving}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving, busy: saving }}
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <Feather name="check" size={17} color={colors.onAccent} />
            )}
            <Text style={[styles.saveLabel, { color: colors.onAccent }]}>
              {saving ? "Saving…" : editing != null ? "Save changes" : "Save note"}
            </Text>
          </GlassPressable>
          <Text style={[styles.footnote, { color: colors.stoneDim }]}>
            Saving takes you back to your notes. Ads keep NoteIt free.
          </Text>
        </View>
      )}

      {picker === "folder" && (
        <InputPanel title="Folder" colors={colors} onDone={() => setPicker(null)}>
          <WheelPicker
            items={folderItems}
            selectedIndex={folderIndex}
            onChange={(index) => setFolderId(index === 0 ? null : folders[index - 1].id)}
            colors={colors}
          />
        </InputPanel>
      )}

      {picker === "date" && Platform.OS === "ios" && (
        <InputPanel
          title="Date"
          colors={colors}
          onDone={() => setPicker(null)}
          leading={{ label: "Today", onPress: () => setDate(todayISO()) }}
        >
          <DateTimePicker
            value={new Date(`${date}T00:00:00`)}
            mode="date"
            display="spinner"
            themeVariant={colors === LIGHT_THEME ? "light" : "dark"}
            textColor={colors.textPrimary}
            onValueChange={onChangeDate}
          />
        </InputPanel>
      )}
    </View>
  );
}
