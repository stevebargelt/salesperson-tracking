import { Pressable, } from "react-native";
import { useAppTheme } from "@/theme/context";
import { $styles } from "@/theme/styles";
import { Text } from "./Text";
/**
 * A component that allows users to take actions and make choices.
 * Wraps the Text component with a Pressable component.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Button/}
 * @param {ButtonProps} props - The props for the `Button` component.
 * @returns {JSX.Element} The rendered `Button` component.
 * @example
 * <Button
 *   tx="common:ok"
 *   style={styles.button}
 *   textStyle={styles.buttonText}
 *   onPress={handleButtonPress}
 * />
 */
export function Button(props) {
    const { tx, text, txOptions, style: $viewStyleOverride, pressedStyle: $pressedViewStyleOverride, textStyle: $textStyleOverride, pressedTextStyle: $pressedTextStyleOverride, disabledTextStyle: $disabledTextStyleOverride, children, RightAccessory, LeftAccessory, disabled, disabledStyle: $disabledViewStyleOverride, ...rest } = props;
    const { themed } = useAppTheme();
    const preset = props.preset ?? "default";
    /**
     * @param {PressableStateCallbackType} root0 - The root object containing the pressed state.
     * @param {boolean} root0.pressed - The pressed state.
     * @returns {StyleProp<ViewStyle>} The view style based on the pressed state.
     */
    function $viewStyle({ pressed }) {
        return [
            themed($viewPresets[preset]),
            $viewStyleOverride,
            !!pressed && themed([$pressedViewPresets[preset], $pressedViewStyleOverride]),
            !!disabled && $disabledViewStyleOverride,
        ];
    }
    /**
     * @param {PressableStateCallbackType} root0 - The root object containing the pressed state.
     * @param {boolean} root0.pressed - The pressed state.
     * @returns {StyleProp<TextStyle>} The text style based on the pressed state.
     */
    function $textStyle({ pressed }) {
        return [
            themed($textPresets[preset]),
            $textStyleOverride,
            !!pressed && themed([$pressedTextPresets[preset], $pressedTextStyleOverride]),
            !!disabled && $disabledTextStyleOverride,
        ];
    }
    return (<Pressable style={$viewStyle} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} {...rest} disabled={disabled}>
      {(state) => (<>
          {!!LeftAccessory && (<LeftAccessory style={$leftAccessoryStyle} pressableState={state} disabled={disabled}/>)}

          <Text tx={tx} text={text} txOptions={txOptions} style={$textStyle(state)}>
            {children}
          </Text>

          {!!RightAccessory && (<RightAccessory style={$rightAccessoryStyle} pressableState={state} disabled={disabled}/>)}
        </>)}
    </Pressable>);
}
const $baseViewStyle = ({ spacing }) => ({
    minHeight: 56,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    overflow: "hidden",
});
const $baseTextStyle = ({ typography }) => ({
    fontSize: 16,
    lineHeight: 20,
    fontFamily: typography.primary.medium,
    textAlign: "center",
    flexShrink: 1,
    flexGrow: 0,
    zIndex: 2,
});
const $rightAccessoryStyle = ({ spacing }) => ({
    marginStart: spacing.xs,
    zIndex: 1,
});
const $leftAccessoryStyle = ({ spacing }) => ({
    marginEnd: spacing.xs,
    zIndex: 1,
});
const $viewPresets = {
    default: [
        $styles.row,
        $baseViewStyle,
        ({ colors }) => ({
            borderWidth: 1,
            borderColor: colors.palette.neutral400,
            backgroundColor: colors.palette.neutral100,
        }),
    ],
    filled: [
        $styles.row,
        $baseViewStyle,
        ({ colors }) => ({ backgroundColor: colors.palette.neutral300 }),
    ],
    reversed: [
        $styles.row,
        $baseViewStyle,
        ({ colors }) => ({ backgroundColor: colors.palette.neutral800 }),
    ],
};
const $textPresets = {
    default: [$baseTextStyle],
    filled: [$baseTextStyle],
    reversed: [$baseTextStyle, ({ colors }) => ({ color: colors.palette.neutral100 })],
};
const $pressedViewPresets = {
    default: ({ colors }) => ({ backgroundColor: colors.palette.neutral200 }),
    filled: ({ colors }) => ({ backgroundColor: colors.palette.neutral400 }),
    reversed: ({ colors }) => ({ backgroundColor: colors.palette.neutral700 }),
};
const $pressedTextPresets = {
    default: () => ({ opacity: 0.9 }),
    filled: () => ({ opacity: 0.9 }),
    reversed: () => ({ opacity: 0.9 }),
};
//# sourceMappingURL=Button.js.map