import { useSafeAreaInsets } from "react-native-safe-area-context";
const propertySuffixMap = {
    top: "Top",
    bottom: "Bottom",
    left: "Start",
    right: "End",
    start: "Start",
    end: "End",
};
const edgeInsetMap = {
    start: "left",
    end: "right",
};
/**
 * A hook that can be used to create a safe-area-aware style object that can be passed directly to a View.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/utils/useSafeAreaInsetsStyle.ts/}
 * @param {ExtendedEdge[]} safeAreaEdges - The edges to apply the safe area insets to.
 * @param {"padding" | "margin"} property - The property to apply the safe area insets to.
 * @returns {SafeAreaInsetsStyle<Property, Edges>} - The style object with the safe area insets applied.
 */
export function useSafeAreaInsetsStyle(safeAreaEdges = [], property = "padding") {
    const insets = useSafeAreaInsets();
    return safeAreaEdges.reduce((acc, e) => {
        const value = edgeInsetMap[e] ?? e;
        return { ...acc, [`${property}${propertySuffixMap[e]}`]: insets[value] };
    }, {});
}
//# sourceMappingURL=useSafeAreaInsetsStyle.js.map