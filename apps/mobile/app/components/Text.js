import { forwardRef } from "react";
// eslint-disable-next-line no-restricted-imports
import { Text as RNText } from "react-native";
import { isRTL } from "@/i18n";
import { translate } from "@/i18n/translate";
import { useAppTheme } from "@/theme/context";
import { typography } from "@/theme/typography";
/**
 * For your text displaying needs.
 * This component is a HOC over the built-in React Native one.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Text/}
 * @param {TextProps} props - The props for the `Text` component.
 * @returns {JSX.Element} The rendered `Text` component.
 */
export const Text = forwardRef(function Text(props, ref) {
    const { weight, size, tx, txOptions, text, children, style: $styleOverride, ...rest } = props;
    const { themed } = useAppTheme();
    const i18nText = tx && translate(tx, txOptions);
    const content = i18nText || text || children;
    const preset = props.preset ?? "default";
    const $styles = [
        $rtlStyle,
        themed($presets[preset]),
        weight && $fontWeightStyles[weight],
        size && $sizeStyles[size],
        $styleOverride,
    ];
    return (<RNText {...rest} style={$styles} ref={ref}>
      {content}
    </RNText>);
});
const $sizeStyles = {
    xxl: { fontSize: 36, lineHeight: 44 },
    xl: { fontSize: 24, lineHeight: 34 },
    lg: { fontSize: 20, lineHeight: 32 },
    md: { fontSize: 18, lineHeight: 26 },
    sm: { fontSize: 16, lineHeight: 24 },
    xs: { fontSize: 14, lineHeight: 21 },
    xxs: { fontSize: 12, lineHeight: 18 },
};
const $fontWeightStyles = Object.entries(typography.primary).reduce((acc, [weight, fontFamily]) => {
    return { ...acc, [weight]: { fontFamily } };
}, {});
const $baseStyle = (theme) => ({
    ...$sizeStyles.sm,
    ...$fontWeightStyles.normal,
    color: theme.colors.text,
});
const $presets = {
    default: [$baseStyle],
    bold: [$baseStyle, { ...$fontWeightStyles.bold }],
    heading: [
        $baseStyle,
        {
            ...$sizeStyles.xxl,
            ...$fontWeightStyles.bold,
        },
    ],
    subheading: [$baseStyle, { ...$sizeStyles.lg, ...$fontWeightStyles.medium }],
    formLabel: [$baseStyle, { ...$fontWeightStyles.medium }],
    formHelper: [$baseStyle, { ...$sizeStyles.sm, ...$fontWeightStyles.normal }],
};
const $rtlStyle = isRTL ? { writingDirection: "rtl" } : {};
//# sourceMappingURL=Text.js.map