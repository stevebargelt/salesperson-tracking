import { useEffect, useRef, useCallback } from "react";
import { Image, Animated, View } from "react-native";
import { useAppTheme } from "@/theme/context";
import { $styles } from "@/theme/styles";
import { iconRegistry } from "../Icon";
import { $inputOuterBase, Toggle } from "./Toggle";
/**
 * @param {CheckboxToggleProps} props - The props for the `Checkbox` component.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Checkbox}
 * @returns {JSX.Element} The rendered `Checkbox` component.
 */
export function Checkbox(props) {
    const { icon, ...rest } = props;
    const checkboxInput = useCallback((toggleProps) => <CheckboxInput {...toggleProps} icon={icon}/>, [icon]);
    return <Toggle accessibilityRole="checkbox" {...rest} ToggleInput={checkboxInput}/>;
}
function CheckboxInput(props) {
    const { on, status, disabled, icon = "check", outerStyle: $outerStyleOverride, innerStyle: $innerStyleOverride, detailStyle: $detailStyleOverride, } = props;
    const { theme: { colors }, } = useAppTheme();
    const opacity = useRef(new Animated.Value(0));
    useEffect(() => {
        Animated.timing(opacity.current, {
            toValue: on ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [on]);
    const offBackgroundColor = [
        disabled && colors.palette.neutral400,
        status === "error" && colors.errorBackground,
        colors.palette.neutral200,
    ].filter(Boolean)[0];
    const outerBorderColor = [
        disabled && colors.palette.neutral400,
        status === "error" && colors.error,
        !on && colors.palette.neutral800,
        colors.palette.secondary500,
    ].filter(Boolean)[0];
    const onBackgroundColor = [
        disabled && colors.transparent,
        status === "error" && colors.errorBackground,
        colors.palette.secondary500,
    ].filter(Boolean)[0];
    const iconTintColor = [
        disabled && colors.palette.neutral600,
        status === "error" && colors.error,
        colors.palette.accent100,
    ].filter(Boolean)[0];
    return (<View style={[
            $inputOuter,
            { backgroundColor: offBackgroundColor, borderColor: outerBorderColor },
            $outerStyleOverride,
        ]}>
      <Animated.View style={[
            $styles.toggleInner,
            { backgroundColor: onBackgroundColor },
            $innerStyleOverride,
            { opacity: opacity.current },
        ]}>
        <Image source={icon ? iconRegistry[icon] : iconRegistry.check} style={[
            $checkboxDetail,
            !!iconTintColor && { tintColor: iconTintColor },
            $detailStyleOverride,
        ]}/>
      </Animated.View>
    </View>);
}
const $checkboxDetail = {
    width: 20,
    height: 20,
    resizeMode: "contain",
};
const $inputOuter = [$inputOuterBase, { borderRadius: 4 }];
//# sourceMappingURL=Checkbox.js.map