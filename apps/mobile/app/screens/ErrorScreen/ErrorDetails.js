import { ScrollView, View } from "react-native";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAppTheme } from "@/theme/context";
/**
 * Renders the error details screen.
 * @param {ErrorDetailsProps} props - The props for the `ErrorDetails` component.
 * @returns {JSX.Element} The rendered `ErrorDetails` component.
 */
export function ErrorDetails(props) {
    const { themed } = useAppTheme();
    return (<Screen preset="fixed" safeAreaEdges={["top", "bottom"]} contentContainerStyle={themed($contentContainer)}>
      <View style={$topSection}>
        <Icon icon="ladybug" size={64}/>
        <Text style={themed($heading)} preset="subheading" tx="errorScreen:title"/>
        <Text tx="errorScreen:friendlySubtitle"/>
      </View>

      <ScrollView style={themed($errorSection)} contentContainerStyle={themed($errorSectionContentContainer)}>
        <Text style={themed($errorContent)} weight="bold" text={`${props.error}`.trim()}/>
        <Text selectable style={themed($errorBacktrace)} text={`${props.errorInfo?.componentStack ?? ""}`.trim()}/>
      </ScrollView>

      <Button preset="reversed" style={themed($resetButton)} onPress={props.onReset} tx="errorScreen:reset"/>
    </Screen>);
}
const $contentContainer = ({ spacing }) => ({
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    flex: 1,
});
const $topSection = {
    flex: 1,
    alignItems: "center",
};
const $heading = ({ colors, spacing }) => ({
    color: colors.error,
    marginBottom: spacing.md,
});
const $errorSection = ({ colors, spacing }) => ({
    flex: 2,
    backgroundColor: colors.separator,
    marginVertical: spacing.md,
    borderRadius: 6,
});
const $errorSectionContentContainer = ({ spacing }) => ({
    padding: spacing.md,
});
const $errorContent = ({ colors }) => ({
    color: colors.error,
});
const $errorBacktrace = ({ colors, spacing }) => ({
    marginTop: spacing.md,
    color: colors.textDim,
});
const $resetButton = ({ colors, spacing }) => ({
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xxl,
});
//# sourceMappingURL=ErrorDetails.js.map