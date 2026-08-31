import { useEffect, useRef } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    View,
} from "react-native";

type Props = {
    onFinish: () => void;
};

export default function InAppSplash({ onFinish }: Props) {
    const poweredOpacity = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleY = useRef(new Animated.Value(25)).current;

    useEffect(() => {
        Animated.sequence([
            // Powered by SMKPremiere appears
            Animated.timing(poweredOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),

            // Note It appears and rises
            Animated.parallel([
                Animated.timing(titleOpacity, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.spring(titleY, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 12,
                    stiffness: 100,
                }),
            ]),

            // Keep splash visible
            Animated.delay(1200),

            // Fade everything away
            Animated.parallel([
                Animated.timing(poweredOpacity, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(titleOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(onFinish);
    }, []);

    return (
        <View style={styles.container}>
            <Animated.Text
                style={[
                    styles.powered,
                    { opacity: poweredOpacity },
                ]}
            >
                Powered by SMKPremiere
            </Animated.Text>

            <View style={styles.divider} />

            <Animated.Text
                style={[
                    styles.title,
                    {
                        opacity: titleOpacity,
                        transform: [{ translateY: titleY }],
                    },
                ]}
            >
                Note It
            </Animated.Text>

            <View style={styles.bottomDivider} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1C1714",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 30,
    },

    powered: {
        color: "#B5AA98",
        fontSize: 14,
        letterSpacing: 2,
        fontFamily: "serif",
        marginBottom: 22,
    },

    divider: {
        width: 180,
        height: 1,
        backgroundColor: "#E0632E",
        marginBottom: 30,
        opacity: 0.8,
    },

    title: {
        color: "#FAF3E7",
        fontSize: 58,
        fontFamily: "serif",
        fontWeight: "700",
        letterSpacing: 1,
    },

    bottomDivider: {
        width: 120,
        height: 2,
        backgroundColor: "#E0632E",
        marginTop: 28,
    },
});