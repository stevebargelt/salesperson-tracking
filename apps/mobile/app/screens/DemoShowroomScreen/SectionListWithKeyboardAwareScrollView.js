import { forwardRef, useCallback } from "react";
import { SectionList } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { DEFAULT_BOTTOM_OFFSET } from "@/components/Screen";
function SectionListWithKeyboardAwareScrollView({ renderScrollComponent, bottomOffset = DEFAULT_BOTTOM_OFFSET, contentContainerStyle, ...props }, ref) {
    const defaultRenderScrollComponent = useCallback((props) => (<KeyboardAwareScrollView contentContainerStyle={contentContainerStyle} bottomOffset={bottomOffset} {...props}/>), [contentContainerStyle, bottomOffset]);
    return (<SectionList {...props} ref={ref} renderScrollComponent={renderScrollComponent ?? defaultRenderScrollComponent}/>);
}
export default forwardRef(SectionListWithKeyboardAwareScrollView);
//# sourceMappingURL=SectionListWithKeyboardAwareScrollView.js.map