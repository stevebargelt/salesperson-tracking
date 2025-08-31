import { forwardRef, useImperativeHandle, useRef } from "react";
import { 
// eslint-disable-next-line no-restricted-imports
TextInput, TouchableOpacity, View, } from "react-native";
import { isRTL } from "@/i18n";
import { translate } from "@/i18n/translate";
import { useAppTheme } from "@/theme/context";
import { $styles } from "@/theme/styles";
import { Text } from "./Text";
/**
 * A component that allows for the entering and editing of text.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/TextField/}
 * @param {TextFieldProps} props - The props for the `TextField` component.
 * @returns {JSX.Element} The rendered `TextField` component.
 */
export const TextField = forwardRef(function TextField(props, ref) {
    const { labelTx, label, labelTxOptions, placeholderTx, placeholder, placeholderTxOptions, helper, helperTx, helperTxOptions, status, RightAccessory, LeftAccessory, HelperTextProps, LabelTextProps, style: $inputStyleOverride, containerStyle: $containerStyleOverride, inputWrapperStyle: $inputWrapperStyleOverride, ...TextInputProps } = props;
    const input = useRef(null);
    const { themed, theme: { colors }, } = useAppTheme();
    const disabled = TextInputProps.editable === false || status === "disabled";
    const placeholderContent = placeholderTx
        ? translate(placeholderTx, placeholderTxOptions)
        : placeholder;
    const $containerStyles = [$containerStyleOverride];
    const $labelStyles = [$labelStyle, LabelTextProps?.style];
    const $inputWrapperStyles = [
        $styles.row,
        $inputWrapperStyle,
        status === "error" && { borderColor: colors.error },
        TextInputProps.multiline && { minHeight: 112 },
        LeftAccessory && { paddingStart: 0 },
        RightAccessory && { paddingEnd: 0 },
        $inputWrapperStyleOverride,
    ];
    const $inputStyles = [
        $inputStyle,
        disabled && { color: colors.textDim },
        isRTL && { textAlign: "right" },
        TextInputProps.multiline && { height: "auto" },
        $inputStyleOverride,
    ];
    const $helperStyles = [
        $helperStyle,
        status === "error" && { color: colors.error },
        HelperTextProps?.style,
    ];
    /**
     *
     */
    function focusInput() {
        if (disabled)
            return;
        input.current?.focus();
    }
    useImperativeHandle(ref, () => input.current);
    return (<TouchableOpacity activeOpacity={1} style={$containerStyles} onPress={focusInput} accessibilityState={{ disabled }}>
      {!!(label || labelTx) && (<Text preset="formLabel" text={label} tx={labelTx} txOptions={labelTxOptions} {...LabelTextProps} style={themed($labelStyles)}/>)}

      <View style={themed($inputWrapperStyles)}>
        {!!LeftAccessory && (<LeftAccessory style={themed($leftAccessoryStyle)} status={status} editable={!disabled} multiline={TextInputProps.multiline ?? false}/>)}

        <TextInput ref={input} underlineColorAndroid={colors.transparent} textAlignVertical="top" placeholder={placeholderContent} placeholderTextColor={colors.textDim} {...TextInputProps} editable={!disabled} style={themed($inputStyles)}/>

        {!!RightAccessory && (<RightAccessory style={themed($rightAccessoryStyle)} status={status} editable={!disabled} multiline={TextInputProps.multiline ?? false}/>)}
      </View>

      {!!(helper || helperTx) && (<Text preset="formHelper" text={helper} tx={helperTx} txOptions={helperTxOptions} {...HelperTextProps} style={themed($helperStyles)}/>)}
    </TouchableOpacity>);
});
const $labelStyle = ({ spacing }) => ({
    marginBottom: spacing.xs,
});
const $inputWrapperStyle = ({ colors }) => ({
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: colors.palette.neutral200,
    borderColor: colors.palette.neutral400,
    overflow: "hidden",
});
const $inputStyle = ({ colors, typography, spacing }) => ({
    flex: 1,
    alignSelf: "stretch",
    fontFamily: typography.primary.normal,
    color: colors.text,
    fontSize: 16,
    height: 24,
    // https://github.com/facebook/react-native/issues/21720#issuecomment-532642093
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
});
const $helperStyle = ({ spacing }) => ({
    marginTop: spacing.xs,
});
const $rightAccessoryStyle = ({ spacing }) => ({
    marginEnd: spacing.xs,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
});
const $leftAccessoryStyle = ({ spacing }) => ({
    marginStart: spacing.xs,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
});
//# sourceMappingURL=TextField.js.map