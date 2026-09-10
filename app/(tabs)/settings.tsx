import { useCallback, useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@react-native-vector-icons/feather";
import { useFocusEffect, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import type { ThemeColors, ThemeMode } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/fonts";
import TopBar from "@/components/TopBar";
import NewSnippet from "@/components/NewSnippet";
import MarkdownText from "@/components/MarkdownText";
import type { SnippetModel } from "@/models/SnippetModel";
import { getSnippetsFromStorageAsync, saveSnippetsToStorageAsync } from "@/persistence/FileStorage";

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
        <View style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.line }]}>
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
                            active && { backgroundColor: colors.accentSolid },
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

export default function Settings() {
    const { colors, mode, setMode } = useTheme();
    const router = useRouter();

    //* re-read on focus rather than held across navigations, so returning
    //* here after a change elsewhere shows what storage actually holds
    const [snippets, setSnippets] = useState<SnippetModel[]>([]);
    const [newSnippetName, setNewSnippetName] = useState("");

    //* the name is parked here while the modal collects the body. Non-null is
    //* what opens the modal, in either mode.
    const [pendingName, setPendingName] = useState<string | null>(null);
    const [pendingText, setPendingText] = useState("");
    //* null means "creating"; an id means "reworking that one". The modal is
    //* the same form either way — only where the result lands differs.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | undefined>(undefined);

    const canAddSnippet = newSnippetName.trim().length > 0;

    const getSnippetsAsync = async () => {
            const data = await getSnippetsFromStorageAsync();
            setSnippets(data);
        };
    
    useFocusEffect(
            useCallback(() => {
                getSnippetsAsync();
            }, []),
        );
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
            await saveSnippetsToStorageAsync(updatedSnippets);
            await getSnippetsAsync(); // reload from storage to ensure consistency
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
            await saveSnippetsToStorageAsync(snippets.filter((s) => s.id !== editingId));
            await getSnippetsAsync();
            closeForm();
        }
        catch
        {
            setFormError("Couldn't delete that snippet. Try again.");
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <TopBar title="Settings" colors={colors} onBack={() => router.back()} />

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                //* the inline name field has no other way out on iOS — there is
                //* nothing tappable below it to steal focus, so scrolling away
                //* is the gesture people reach for
                keyboardDismissMode="on-drag"
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.stoneDim }]}>Appearance</Text>
                    <AppearanceToggle colors={colors} mode={mode} onSelect={setMode} />
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
                                    {
                                        backgroundColor: colors.surface,
                                        borderColor: colors.line,
                                        opacity: pressed ? 0.7 : 1,
                                    },
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
                            placeholderTextColor={colors.stoneDim}
                            style={[
                                styles.addInput,
                                { backgroundColor: colors.surface, borderColor: colors.line, color: colors.textPrimary },
                            ]}
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
                                {
                                    backgroundColor: colors.accent,
                                    opacity: !canAddSnippet ? 0.4 : pressed ? 0.75 : 1,
                                },
                            ]}
                        >
                            <Text style={[styles.addButtonLabel, { color: colors.onAccent }]}>Add</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

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

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 18,
        paddingBottom: 24,
        gap: 24,
    },
    section: {
        gap: 10,
    },
    sectionLabel: {
        fontFamily: fonts.interBold,
        fontSize: 10.5,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    sectionHint: {
        fontFamily: fonts.interRegular,
        fontSize: 12.5,
        lineHeight: 18,
        marginTop: -4,
    },
    segment: {
        flexDirection: "row",
        borderWidth: 1,
        borderRadius: 14,
        padding: 5,
        gap: 5,
    },
    segmentItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        borderRadius: 10,
        paddingVertical: 10,
    },
    segmentLabel: {
        fontFamily: fonts.interSemiBold,
        fontSize: 13,
    },
    snippetList: {
        gap: 8,
    },
    snippetRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    snippetBody: {
        flex: 1,
        minWidth: 0,
        gap: 1,
    },
    snippetName: {
        fontFamily: fonts.interSemiBold,
        fontSize: 13,
    },
    snippetText: {
        fontFamily: fonts.interRegular,
        fontSize: 12,
    },
    emptyLabel: {
        fontFamily: fonts.interRegular,
        fontSize: 12.5,
    },
    addRow: {
        flexDirection: "row",
        gap: 8,
    },
    addInput: {
        flex: 1,
        minWidth: 0,
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontFamily: fonts.interRegular,
        fontSize: 13,
    },
    addButton: {
        justifyContent: "center",
        borderRadius: 10,
        paddingHorizontal: 16,
    },
    addButtonLabel: {
        fontFamily: fonts.interBold,
        fontSize: 13,
    },
});
