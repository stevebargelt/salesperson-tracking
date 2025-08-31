import { useEffect, useMemo, useRef, useCallback } from "react";
import { Animated, Image, Platform, View } from "react-native";
import { iconRegistry } from "@/components/Icon";
import { isRTL } from "@/i18n";
import { useAppTheme } from "@/theme/context";
import { $styles } from "@/theme/styles";
import { $inputOuterBase, Toggle } from "./Toggle";
/**
 * @param {SwitchToggleProps} props - The props for the `Switch` component.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Switch}
 * @returns {JSX.Element} The rendered `Switch` component.
 */
export function Switch(props) {
    const { accessibilityMode, ...rest } = props;
    const switchInput = useCallback((toggleProps) => (<SwitchInput {...toggleProps} accessibilityMode={accessibilityMode}/>), [accessibilityMode]);
    return <Toggle accessibilityRole="switch" {...rest} ToggleInput={switchInput}/>;
}
function SwitchInput(props) {
    const { on, status, disabled, outerStyle: $outerStyleOverride, innerStyle: $innerStyleOverride, detailStyle: $detailStyleOverride, } = props;
    const { theme: { colors }, themed, } = useAppTheme();
    const animate = useRef(new Animated.Value(on ? 1 : 0)); // Initial value is set based on isActive
    const opacity = useRef(new Animated.Value(0));
    useEffect(() => {
        Animated.timing(animate.current, {
            toValue: on ? 1 : 0,
            duration: 300,
            useNativeDriver: true, // Enable native driver for smoother animations
        }).start();
    }, [on]);
    useEffect(() => {
        Animated.timing(opacity.current, {
            toValue: on ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [on]);
    const knobSizeFallback = 2;
    const knobWidth = [$detailStyleOverride?.width, $switchDetail?.width, knobSizeFallback].find((v) => typeof v === "number");
    const knobHeight = [$detailStyleOverride?.height, $switchDetail?.height, knobSizeFallback].find((v) => typeof v === "number");
    const offBackgroundColor = [
        disabled && colors.palette.neutral400,
        status === "error" && colors.errorBackground,
        colors.palette.neutral300,
    ].filter(Boolean)[0];
    const onBackgroundColor = [
        disabled && colors.transparent,
        status === "error" && colors.errorBackground,
        colors.palette.secondary500,
    ].filter(Boolean)[0];
    const knobBackgroundColor = (function () {
        if (on) {
            return [
                $detailStyleOverride?.backgroundColor,
                status === "error" && colors.error,
                disabled && colors.palette.neutral600,
                colors.palette.neutral100,
            ].filter(Boolean)[0];
        }
        else {
            return [
                $innerStyleOverride?.backgroundColor,
                disabled && colors.palette.neutral600,
                status === "error" && colors.error,
                colors.palette.neutral200,
            ].filter(Boolean)[0];
        }
    })();
    const rtlAdjustment = isRTL ? -1 : 1;
    const $themedSwitchInner = useMemo(() => themed([$styles.toggleInner, $switchInner]), [themed]);
    const offsetLeft = ($innerStyleOverride?.paddingStart ||
        $innerStyleOverride?.paddingLeft ||
        $themedSwitchInner?.paddingStart ||
        $themedSwitchInner?.paddingLeft ||
        0);
    const offsetRight = ($innerStyleOverride?.paddingEnd ||
        $innerStyleOverride?.paddingRight ||
        $themedSwitchInner?.paddingEnd ||
        $themedSwitchInner?.paddingRight ||
        0);
    const outputRange = Platform.OS === "web"
        ? isRTL
            ? [+(knobWidth || 0) + offsetRight, offsetLeft]
            : [offsetLeft, +(knobWidth || 0) + offsetRight]
        : [rtlAdjustment * offsetLeft, rtlAdjustment * (+(knobWidth || 0) + offsetRight)];
    const $animatedSwitchKnob = animate.current.interpolate({
        inputRange: [0, 1],
        outputRange,
    });
    return (<View style={[$inputOuter, { backgroundColor: offBackgroundColor }, $outerStyleOverride]}>
      <Animated.View style={[
            $themedSwitchInner,
            { backgroundColor: onBackgroundColor },
            $innerStyleOverride,
            { opacity: opacity.current },
        ]}/>

      <SwitchAccessibilityLabel {...props} role="on"/>
      <SwitchAccessibilityLabel {...props} role="off"/>

      <Animated.View style={[
            $switchDetail,
            $detailStyleOverride,
            { transform: [{ translateX: $animatedSwitchKnob }] },
            { width: knobWidth, height: knobHeight },
            { backgroundColor: knobBackgroundColor },
        ]}/>
    </View>);
}
/**
 * @param {ToggleInputProps & { role: "on" | "off" }} props - The props for the `SwitchAccessibilityLabel` component.
 * @returns {JSX.Element} The rendered `SwitchAccessibilityLabel` component.
 */
function SwitchAccessibilityLabel(props) {
    const { on, disabled, status, accessibilityMode, role, innerStyle, detailStyle } = props;
    const { theme: { colors }, } = useAppTheme();
    if (!accessibilityMode)
        return null;
    const shouldLabelBeVisible = (on && role === "on") || (!on && role === "off");
    const $switchAccessibilityStyle = [
        $switchAccessibility,
        role === "off" && { end: "5%" },
        role === "on" && { left: "5%" },
    ];
    const color = (function () {
        if (disabled)
            return colors.palette.neutral600;
        if (status === "error")
            return colors.error;
        if (!on)
            return innerStyle?.backgroundColor || colors.palette.secondary500;
        return detailStyle?.backgroundColor || colors.palette.neutral100;
    })();
    return (<View style={$switchAccessibilityStyle}>
      {accessibilityMode === "text" && shouldLabelBeVisible && (<View style={[
                role === "on" && $switchAccessibilityLine,
                role === "on" && { backgroundColor: color },
                role === "off" && $switchAccessibilityCircle,
                role === "off" && { borderColor: color },
            ]}/>)}

      {accessibilityMode === "icon" && shouldLabelBeVisible && (<Image style={[$switchAccessibilityIcon, { tintColor: color }]} source={role === "off" ? iconRegistry.hidden : iconRegistry.view}/>)}
    </View>);
}
const $inputOuter = [
    $inputOuterBase,
    { height: 32, width: 56, borderRadius: 16, borderWidth: 0 },
];
const $switchInner = ({ colors }) => ({
    borderColor: colors.transparent,
    position: "absolute",
    paddingStart: 4,
    paddingEnd: 4,
});
const $switchDetail = {
    borderRadius: 12,
    position: "absolute",
    width: 24,
    height: 24,
};
const $switchAccessibility = {
    width: "40%",
    justifyContent: "center",
    alignItems: "center",
};
const $switchAccessibilityIcon = {
    width: 14,
    height: 14,
    resizeMode: "contain",
};
const $switchAccessibilityLine = {
    width: 2,
    height: 12,
};
const $switchAccessibilityCircle = {
    borderWidth: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
};
//# sourceMappingURL=Switch.js.map