import { StyleSheet, Text, View } from "react-native";

export default function Home() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Your Note It app</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1C1714",
        alignItems: "center",
        justifyContent: "center",
    },

    text: {
        color: "#FAF3E7",
        fontSize: 24,
    },
});