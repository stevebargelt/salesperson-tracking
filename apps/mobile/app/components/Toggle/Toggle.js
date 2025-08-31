import { useMemo } from "react";
import { TouchableOpacity, View, } from "react-native";
import { useAppTheme } from "@/theme/context";
import { $styles } from "@/theme/styles";
import { Text } from "../Text";
/**
 * Renders a boolean input.
 * This is a controlled component that requires an onValueChange callback that updates the value prop in order for the component to reflect user actions. If the value prop is not updated, the component will continue to render the supplied value prop instead of the expected result of any user actions.
 * @param {ToggleProps} props - The props for the `Toggle` component.
 * @returns {JSX.Element} The rendered `Toggle` component.
 */
export function Toggle(props) {
    const { editable = true, status, value, onPress, onValueChange, labelPosition = "right", helper, helperTx, helperTxOptions, HelperTextProps, containerStyle: $containerStyleOverride, inputWrapperStyle: $inputWrapperStyleOverride, ToggleInput, accessibilityRole, ...WrapperProps } = props;
    const { theme: { colors }, themed, } = useAppTheme();
    const disabled = editable === false || status === "disabled" || props.disabled;
    const Wrapper = useMemo(() => (disabled ? View : TouchableOpacity), [disabled]);
    const $containerStyles = [$containerStyleOverride];
    const $inputWrapperStyles = [$styles.row, $inputWrapper, $inputWrapperStyleOverride];
    const $helperStyles = themed([
        $helper,
        status === "error" && { color: colors.error },
        HelperTextProps?.style,
    ]);
    /**
     * @param {GestureResponderEvent} e - The event object.
     */
    function handlePress(e) {
        if (disabled)
            return;
        onValueChange?.(!value);
        onPress?.(e);
    }
    return (<Wrapper activeOpacity={1} accessibilityRole={accessibilityRole} accessibilityState={{ checked: value, disabled }} {...WrapperProps} style={$containerStyles} onPress={handlePress}>
      <View style={$inputWrapperStyles}>
        {labelPosition === "left" && <FieldLabel {...props} labelPosition={labelPosition}/>}

        <ToggleInput on={!!value} disabled={!!disabled} status={status} outerStyle={props.inputOuterStyle ?? {}} innerStyle={props.inputInnerStyle ?? {}} detailStyle={props.inputDetailStyle ?? {}}/>

        {labelPosition === "right" && <FieldLabel {...props} labelPosition={labelPosition}/>}
      </View>

      {!!(helper || helperTx) && (<Text preset="formHelper" text={helper} tx={helperTx} txOptions={helperTxOptions} {...HelperTextProps} style={$helperStyles}/>)}
    </Wrapper>);
}
/**
 * @param {ToggleProps} props - The props for the `FieldLabel` component.
 * @returns {JSX.Element} The rendered `FieldLabel` component.
 */
function FieldLabel(props) {
    const { status, label, labelTx, labelTxOptions, LabelTextProps, labelPosition, labelStyle: $labelStyleOverride, } = props;
    const { theme: { colors }, themed, } = useAppTheme();
    if (!label && !labelTx && !LabelTextProps?.children)
        return null;
    const $labelStyle = themed([
        $label,
        status === "error" && { color: colors.error },
        labelPosition === "right" && $labelRight,
        labelPosition === "left" && $labelLeft,
        $labelStyleOverride,
        LabelTextProps?.style,
    ]);
    return (<Text preset="formLabel" text={label} tx={labelTx} txOptions={labelTxOptions} {...LabelTextProps} style={$labelStyle}/>);
}
const $inputWrapper = {
    alignItems: "center",
};
export const $inputOuterBase = {
    height: 24,
    width: 24,
    borderWidth: 2,
    alignItems: "center",
    overflow: "hidden",
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: "space-between",
    flexDirection: "row",
};
const $helper = ({ spacing }) => ({
    marginTop: spacing.xs,
});
const $label = {
    flex: 1,
};
const $labelRight = ({ spacing }) => ({
    marginStart: spacing.md,
});
const $labelLeft = ({ spacing }) => ({
    marginEnd: spacing.md,
});
//# sourceMappingURL=Toggle.js.map