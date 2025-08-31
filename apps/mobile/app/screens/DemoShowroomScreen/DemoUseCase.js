import { View } from "react-native";
import { Text } from "@/components/Text";
import { translate } from "@/i18n/translate";
import { useAppTheme } from "@/theme/context";
import { $styles } from "@/theme/styles";
/**
 * @param {DemoUseCaseProps} props - The props for the `DemoUseCase` component.
 * @returns {JSX.Element} The rendered `DemoUseCase` component.
 */
export function DemoUseCase(props) {
    const { name, description, children, layout = "column", itemStyle = {} } = props;
    const { themed } = useAppTheme();
    return (<View>
      <Text style={themed($name)}>{translate(name)}</Text>
      {description && <Text style={themed($description)}>{translate(description)}</Text>}

      <View style={[itemStyle, layout === "row" && $styles.row, themed($item)]}>{children}</View>
    </View>);
}
const $description = ({ spacing }) => ({
    marginTop: spacing.md,
});
const $item = ({ colors, spacing }) => ({
    backgroundColor: colors.palette.neutral100,
    borderRadius: 8,
    padding: spacing.lg,
    marginVertical: spacing.md,
});
const $name = ({ typography }) => ({
    fontFamily: typography.primary.bold,
});
//# sourceMappingURL=DemoUseCase.js.map