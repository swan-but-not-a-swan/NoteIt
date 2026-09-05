import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { DARK_THEME } from "@/theme/colors";
import { fonts } from "@/theme/fonts";
import TopBar from "../components/TopBar";

export default function Settings() {
    // TODO (business logic): swap DARK_THEME for real theme-mode state once
    // that exists (matches the same TODO in home.tsx).
    const colors = DARK_THEME;
    const router = useRouter();

    // TODO (business logic): load snippets from storage on focus (mirror
    // home.tsx's getFoldersWithCounts/useFocusEffect pattern) and persist on
    // add/remove — needs a getSnippetsFromStorage/saveSnippetsToStorage pair
    // in FileStorage.ts (same shape as get/saveFoldersToStorage, just a
    // string[] under its own key). Without that, this list is memory-only
    // and resets the moment you navigate away.
    const [snippets, setSnippets] = useState<string[]>([]);
    const [newSnippet, setNewSnippet] = useState("");

    const submitSnippet = () => {
        const clean = newSnippet.trim();
        if (clean.length > 0) {
            setSnippets((current) => [...current, clean]);
            setNewSnippet("");
        }
    };

    const removeSnippet = (index: number) => {
        setSnippets((current) => current.filter((_, i) => i !== index));
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <TopBar title="Settings" colors={colors} onBack={() => router.back()} />

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={[styles.sectionLabel, { color: colors.stoneDim }]}>Snippets</Text>
                <Text style={[styles.sectionHint, { color: colors.stone }]}>
                    Create reusable phrases to quickly drop into a picture-note while you&apos;re writing.
                </Text>

                <View style={styles.snippetList}>
                    {snippets.map((snippet, index) => (
                        <View
                            key={`${index}-${snippet}`}
                            style={[styles.snippetRow, { backgroundColor: colors.surface, borderColor: colors.line }]}
                        >
                            <Feather name="star" size={14} color={colors.accent} />
                            <Text style={[styles.snippetText, { color: colors.textPrimary }]} numberOfLines={2}>
                                {snippet}
                            </Text>
                            <Pressable onPress={() => removeSnippet(index)} hitSlop={8}>
                                <Feather name="trash-2" size={14} color={colors.stoneDim} />
                            </Pressable>
                        </View>
                    ))}
                    {snippets.length === 0 && (
                        <Text style={[styles.emptyLabel, { color: colors.stoneDim }]}>No snippets yet.</Text>
                    )}
                </View>

                <View style={styles.addRow}>
                    <TextInput
                        value={newSnippet}
                        onChangeText={setNewSnippet}
                        onSubmitEditing={submitSnippet}
                        placeholder="Write a snippet..."
                        placeholderTextColor={colors.stoneDim}
                        style={[
                            styles.addInput,
                            { backgroundColor: colors.surface, borderColor: colors.line, color: colors.textPrimary },
                        ]}
                    />
                    <Pressable onPress={submitSnippet} style={[styles.addButton, { backgroundColor: colors.accent }]}>
                        <Text style={[styles.addButtonLabel, { color: colors.onAccent }]}>Add</Text>
                    </Pressable>
                </View>
            </ScrollView>
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
        gap: 8,
    },
    sectionLabel: {
        fontFamily: fonts.interBold,
        fontSize: 10.5,
        letterSpacing: 1,
        textTransform: "uppercase",
        marginTop: 8,
    },
    sectionHint: {
        fontFamily: fonts.interRegular,
        fontSize: 12.5,
        lineHeight: 18,
        marginBottom: 4,
    },
    snippetList: {
        gap: 8,
        marginBottom: 12,
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
    snippetText: {
        flex: 1,
        fontFamily: fonts.interRegular,
        fontSize: 13,
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
