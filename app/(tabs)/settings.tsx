import { useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather/static";
import { useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import type { ThemeColors, ThemeMode } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeContext";
import { useFieldFocus } from "@/theme/focus";
import { glass } from "@/theme/glass";
import TopBar, { TopBarIconButton } from "@/components/TopBar";
import NewSnippet from "@/components/NewSnippet";
import SendFeedback from "@/components/SendFeedback";
import ImportSummary from "@/components/ImportSummary";
import SettingsActionRow from "@/components/SettingsActionRow";
import MarkdownText from "@/components/MarkdownText";
import type { SnippetModel } from "@/models/SnippetModel";
import { useLibrary } from "@/lib/LibraryContext";
import { useEntitlements } from "@/lib/EntitlementsContext";
import { PLUS_ON_SALE } from "@/lib/entitlements";
import { pickExportFileAsync, TransferError } from "@/lib/noteTransfer";
import { settingsScreenStyles as styles } from "@/theme/styles/settings.styles";

type ThemeOption = {
    id: ThemeMode;
    label: string;
    icon: "moon" | "sun";
};

const THEME_OPTIONS: ThemeOption[] = [
    { id: "dark", label: "Dark", icon: "moon" },
    { id: "light", label: "Light", icon: "sun" },
];

// A two-up segmented control rather than a switch: the reference draws it
// this way, and it names both states instead of leaving the user to infer
// what "off" means.
function AppearanceToggle({
    colors,
    mode,
    onSelect,
}: {
    colors: ThemeColors;
    mode: ThemeMode;
    onSelect: (mode: ThemeMode) => void;
}) {
    return (
        <View style={[styles.segment, glass(colors)]}>
            {THEME_OPTIONS.map((option) => {
                const active = mode === option.id;
                //* the active pill is the only filled surface in the row, so
                //* everything else has to read against the plain background
                const tint = active ? colors.onAccent : colors.stone;
                return (
                    <Pressable
                        key={option.id}
                        onPress={() => onSelect(option.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${option.label} theme`}
                        style={[
                            styles.segmentItem,
                            //* the idle side keeps a clear rim of the same width, so
                            //* switching doesn't shift its contents by a pixel
                            active
                                ? glass(colors, { tint: colors.accentSolid, strength: "fill" })
                                : { borderWidth: 1, borderColor: "transparent" },
                        ]}
                    >
                        <Feather name={option.icon} size={15} color={tint} />
                        <Text style={[styles.segmentLabel, { color: tint }]}>{option.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

//* The one place Plus is reachable without first hitting a limit. The subtitle
//* carries the state, so someone mid-trial can see when it ends without
//* opening anything. Subscribers get Customer Center rather than the paywall:
//* what they need from here is managing or cancelling, not buying again.
//*
//* No price or trial length in the copy on purpose. Both come from the store
//* (localised, and eligibility-dependent: someone who has used their trial
//* before won't get another), so the paywall is the only place that can state
//* them truthfully.
function PlusRow({ colors }: { colors: ThemeColors }) {
    const { hasPlus, plus, openPaywall, openCustomerCenter } = useEntitlements();

    const until = (date: Date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    const subtitle =
        hasPlus !== true || plus == null
            ? "No ads and unlimited compare."
            : plus.expiresAt == null
              ? "Active."
              : plus.inTrial
                ? plus.willRenew
                    ? `Free trial until ${until(plus.expiresAt)}, then your subscription starts.`
                    : `Trial cancelled. Plus stays on until ${until(plus.expiresAt)}.`
                : plus.willRenew
                  ? `Active. Renews ${until(plus.expiresAt)}.`
                  : `Cancelled. Plus stays on until ${until(plus.expiresAt)}.`;

    return (
        <Pressable
            onPress={() => {
                if (hasPlus === true) {
                    void openCustomerCenter();
                } else {
                    void openPaywall();
                }
            }}
            accessibilityRole="button"
            accessibilityLabel="NoteIt Plus"
            style={({ pressed }) => [
                styles.plusRow,
                glass(colors),
                { opacity: pressed ? 0.85 : 1 },
            ]}
        >
            <View style={[styles.plusBadge, { backgroundColor: colors.accent }]}>
                <Feather name="star" size={16} color={colors.onAccent} />
            </View>
            <View style={styles.plusText}>
                <Text style={[styles.plusTitle, { color: colors.textPrimary }]}>NoteIt Plus</Text>
                <Text style={[styles.plusSubtitle, { color: colors.stone }]}>{subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.stoneDim} />
        </Pressable>
    );
}

export default function Settings() {
    const { colors, mode, setMode } = useTheme();
    const router = useRouter();

    //* from the shared store, so a snippet saved here is already offered in
    //* AddNote on every other screen — no re-read on the way back
    const { snippets, saveSnippetsAsync } = useLibrary();
    const [newSnippetName, setNewSnippetName] = useState("");

    //* the name is parked here while the modal collects the body. Non-null is
    //* what opens the modal, in either mode.
    const [pendingName, setPendingName] = useState<string | null>(null);
    const [pendingText, setPendingText] = useState("");
    //* null means "creating"; an id means "reworking that one". The modal is
    //* the same form either way — only where the result lands differs.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | undefined>(undefined);
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const snippetNameFocus = useFieldFocus(colors);

    const canAddSnippet = newSnippetName.trim().length > 0;

    // --- import ------------------------------------------------------------

    //* only a picker that fails outright is reported here. Reading the file,
    //* the preview and adding it are all the /import screen's
    const [pickError, setPickError] = useState<string | undefined>(undefined);

    const startImport = async () => {
        let uri: string | null;
        try {
            uri = await pickExportFileAsync();
        } catch (error) {
            setPickError(error instanceof TransferError ? error.message : "Couldn't open the file picker.");
            return;
        }
        //* cancelled — nothing happened
        if (uri == null) return;
        router.push({ pathname: "/import", params: { uri } });
    };

    //* "Add" doesn't commit — it carries the name into the modal, which is
    //* where the body actually gets written
    const startWritingSnippet = () => {
        if (!canAddSnippet) return;
        setEditingId(null);
        setPendingName(newSnippetName.trim());
        setPendingText("");
        setFormError(undefined);
    };

    const startEditingSnippet = (snippet: SnippetModel) => {
        setEditingId(snippet.id);
        setPendingName(snippet.name);
        setPendingText(snippet.text);
        setFormError(undefined);
    };

    const closeForm = () => {
        //* iOS keeps the keyboard up when a focused TextInput is unmounted with
        //* its Modal — the sheet fades out and the keyboard is left sitting on
        //* the settings screen behind it. Every path that closes the form comes
        //* through here (save, cancel, backdrop, Android back), so this is the
        //* one place that has to say so.
        Keyboard.dismiss();
        //* on the way in, the name stays in the inline field, so backing out
        //* loses only the body — reopening starts from the same name
        setEditingId(null);
        setPendingName(null);
        setPendingText("");
        setFormError(undefined);
    };

    const commitSnippet = async () => {
        if (pendingName == null) return;
        const name = pendingName.trim();
        const text = pendingText.trim();
        if (name.length === 0) {
            setFormError("Give the snippet a name.");
            return;
        }
        if (text.length === 0) {
            setFormError("Write something for the snippet.");
            return;
        }
        //*checks duplicate, rejects if the name is same as any other snippet except the one being edited
        const isDuplicate = snippets.some(
            (snippet) => snippet.id !== editingId &&
                snippet.name.trim().toLowerCase() === name.toLowerCase()
        );

        if (isDuplicate) {
            setFormError("A snippet with that name already exists.");
            return;
        }

        let updatedSnippets: SnippetModel[] = [];
        if (editingId != null)
        {
            updatedSnippets = snippets.map((snippet) =>
                snippet.id === editingId ? { ...snippet, name, text } : snippet);
        }
        else
        {
            const snippet: SnippetModel = { id: Crypto.randomUUID(), name, text };
            updatedSnippets = [...snippets, snippet];

        }

        try
        {
            await saveSnippetsAsync(updatedSnippets); //* storage first, then the store
            //* only the create path consumed the inline field — clearing it
            //* after an edit throws away a name the user was midway through
            if (editingId == null) setNewSnippetName("");
            closeForm();
        }
        catch
        {
            //* the write failed and the draft is still the only copy of it —
            //* staying in the form is what keeps it from being thrown away
            setFormError("Couldn't save that snippet. Try again.");
        }
    };

    const deleteEditingSnippet = async () => {
        if (editingId == null) return;
        //* the whole array is the unit of storage, so removing one is just
        //* saving the rest — no separate delete call needed
        try
        {
            await saveSnippetsAsync(snippets.filter((s) => s.id !== editingId));
            closeForm();
        }
        catch
        {
            setFormError("Couldn't delete that snippet. Try again.");
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <TopBar
                title="Settings"
                colors={colors}
                onBack={() => router.back()}
                right={
                    <TopBarIconButton
                        icon="bell"
                        accessibilityLabel="Send feedback"
                        colors={colors}
                        onPress={() => setFeedbackOpen(true)}
                    />
                }
            />

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                //* the inline name field has no other way out on iOS — there is
                //* nothing tappable below it to steal focus, so scrolling away
                //* is the gesture people reach for
                keyboardDismissMode="on-drag"
            >
                {/* Hidden while Plus isn't sold: a row that opens a paywall
                    with nothing to buy is what App Review rejects. */}
                {PLUS_ON_SALE && <PlusRow colors={colors} />}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.stoneDim }]}>Appearance</Text>
                    <AppearanceToggle colors={colors} mode={mode} onSelect={setMode} />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.stoneDim }]}>Data</Text>
                    {/* Import lives here rather than on a note screen because
                        it isn't about any one note — it drops a file's whole
                        contents into the app. Exporting is the opposite: it is
                        always about the thing you are looking at, so it sits in
                        the viewer's and the folder's own menus. */}
                    <SettingsActionRow
                        icon="download"
                        title="Import from a file"
                        subtitle="Add picture-notes or a whole folder from a .noteit file."
                        colors={colors}
                        onPress={startImport}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.stoneDim }]}>Snippets</Text>
                    <Text style={[styles.sectionHint, { color: colors.stone }]}>
                        Create reusable phrases to quickly drop into a picture-note while you&apos;re writing.
                    </Text>

                    <View style={styles.snippetList}>
                        {/* The whole row opens the editor, the way a folder
                            row opens its own. Delete lives in there too, so
                            there is one place a snippet is changed rather than
                            a trash icon here and a form somewhere else. */}
                        {snippets.map((snippet) => (
                            <Pressable
                                key={snippet.id}
                                onPress={() => startEditingSnippet(snippet)}
                                accessibilityRole="button"
                                accessibilityLabel={`Edit snippet ${snippet.name}`}
                                style={({ pressed }) => [
                                    styles.snippetRow,
                                    glass(colors),
                                    { opacity: pressed ? 0.7 : 1 },
                                ]}
                            >
                                <Feather name="star" size={14} color={colors.accent} />
                                {/* Name leads, body follows in one dimmer line.
                                    The name is what the chips in AddNote show,
                                    so it has to be the thing you recognise a
                                    snippet by here too. */}
                                <View style={styles.snippetBody}>
                                    <Text
                                        style={[styles.snippetName, { color: colors.textPrimary }]}
                                        numberOfLines={1}
                                    >
                                        {snippet.name}
                                    </Text>
                                    {/* Rendered, not raw — a dim preview full
                                        of ** is noise, and this matches how the
                                        editor shows it. */}
                                    <MarkdownText
                                        text={snippet.text}
                                        numberOfLines={2}
                                        style={[styles.snippetText, { color: colors.stone }]}
                                    />
                                </View>
                                <Feather name="chevron-right" size={16} color={colors.stoneDim} />
                            </Pressable>
                        ))}
                        {snippets.length === 0 && (
                            <Text style={[styles.emptyLabel, { color: colors.stoneDim }]}>No snippets yet.</Text>
                        )}
                    </View>

                    <View style={styles.addRow}>
                        <TextInput
                            value={newSnippetName}
                            onChangeText={setNewSnippetName}
                            onSubmitEditing={startWritingSnippet}
                            placeholder="Name a snippet..."
                            placeholderTextColor={snippetNameFocus.placeholder}
                            style={[
                                styles.addInput,
                                { backgroundColor: colors.surface, borderColor: snippetNameFocus.border, color: colors.textPrimary },
                            ]}
                            {...snippetNameFocus.handlers}
                        />
                        <Pressable
                            onPress={startWritingSnippet}
                            //* dimmed and inert without a name, rather than a
                            //* live button that silently does nothing
                            disabled={!canAddSnippet}
                            accessibilityRole="button"
                            accessibilityLabel="Write this snippet"
                            accessibilityState={{ disabled: !canAddSnippet }}
                            style={({ pressed }) => [
                                styles.addButton,
                                glass(colors, { tint: colors.accent, strength: "fill" }),
                                { opacity: !canAddSnippet ? 0.4 : pressed ? 0.75 : 1 },
                            ]}
                        >
                            <Text style={[styles.addButtonLabel, { color: colors.onAccent }]}>Add</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            <SendFeedback
                visible={feedbackOpen}
                colors={colors}
                onClose={() => setFeedbackOpen(false)}
            />

            <ImportSummary
                visible={pickError != null}
                payload={null}
                error={pickError}
                busy={false}
                colors={colors}
                onCancel={() => setPickError(undefined)}
                onConfirm={() => {}}
            />

            <NewSnippet
                visible={pendingName != null}
                mode={editingId != null ? "edit" : "create"}
                name={pendingName ?? ""}
                //* only editing offers the name as a field — on the way in it
                //* was just typed into the row behind the modal
                onNameChange={
                    editingId != null
                        ? (name) => {
                              setPendingName(name);
                              if (formError != null) setFormError(undefined);
                          }
                        : undefined
                }
                text={pendingText}
                onTextChange={(text) => {
                    setPendingText(text);
                    //* clear the complaint as soon as they act on it
                    if (formError != null) setFormError(undefined);
                }}
                onDelete={editingId != null ? deleteEditingSnippet : undefined}
                error={formError}
                colors={colors}
                onCancel={closeForm}
                onSave={commitSnippet}
            />
        </View>
    );
}
