import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { useAppTheme } from "@/theme/context";
import { $styles } from "@/theme/styles";
import { $inputOuterBase, Toggle } from "./Toggle";
/**
 * @param {RadioToggleProps} props - The props for the `Radio` component.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Radio}
 * @returns {JSX.Element} The rendered `Radio` component.
 */
export function Radio(props) {
    return <Toggle accessibilityRole="radio" {...props} ToggleInput={RadioInput}/>;
}
function RadioInput(props) {
    const { on, status, disabled, outerStyle: $outerStyleOverride, innerStyle: $innerStyleOverride, detailStyle: $detailStyleOverride, } = props;
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
        colors.palette.neutral100,
    ].filter(Boolean)[0];
    const dotBackgroundColor = [
        disabled && colors.palette.neutral600,
        status === "error" && colors.error,
        colors.palette.secondary500,
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
        <View style={[$radioDetail, { backgroundColor: dotBackgroundColor }, $detailStyleOverride]}/>
      </Animated.View>
    </View>);
}
const $radioDetail = {
    width: 12,
    height: 12,
    borderRadius: 6,
};
const $inputOuter = [$inputOuterBase, { borderRadius: 12 }];
//# sourceMappingURL=Radio.js.map