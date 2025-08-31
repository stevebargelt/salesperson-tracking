import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Image, Platform, View, } from "react-native";
import { Link, useRoute } from "@react-navigation/native";
import { Drawer } from "react-native-drawer-layout";
import { ListItem } from "@/components/ListItem";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { isRTL } from "@/i18n";
import { translate } from "@/i18n/translate";
import { useAppTheme } from "@/theme/context";
import { $styles } from "@/theme/styles";
import { hasValidStringProp } from "@/utils/hasValidStringProp";
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle";
import * as Demos from "./demos";
import { DrawerIconButton } from "./DrawerIconButton";
import SectionListWithKeyboardAwareScrollView from "./SectionListWithKeyboardAwareScrollView";
const logo = require("@assets/images/logo.png");
const slugify = (str) => str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
const WebListItem = ({ item, sectionIndex }) => {
    const sectionSlug = item.name.toLowerCase();
    const { themed } = useAppTheme();
    return (<View>
      <Link screen="DemoShowroom" params={{ queryIndex: sectionSlug }} style={themed($menuContainer)}>
        <Text preset="bold">{item.name}</Text>
      </Link>
      {item.useCases.map((u) => {
            const itemSlug = slugify(u);
            return (<Link key={`section${sectionIndex}-${u}`} screen="DemoShowroom" params={{ queryIndex: sectionSlug, itemIndex: itemSlug }}>
            <Text>{u}</Text>
          </Link>);
        })}
    </View>);
};
const NativeListItem = ({ item, sectionIndex, handleScroll }) => {
    const { themed } = useAppTheme();
    return (<View>
      <Text onPress={() => handleScroll?.(sectionIndex)} preset="bold" style={themed($menuContainer)}>
        {item.name}
      </Text>
      {item.useCases.map((u, index) => (<ListItem key={`section${sectionIndex}-${u}`} onPress={() => handleScroll?.(sectionIndex, index)} text={u} rightIcon={isRTL ? "caretLeft" : "caretRight"}/>))}
    </View>);
};
const ShowroomListItem = Platform.select({ web: WebListItem, default: NativeListItem });
const isAndroid = Platform.OS === "android";
export const DemoShowroomScreen = function DemoShowroomScreen(_props) {
    const [open, setOpen] = useState(false);
    const timeout = useRef(null);
    const listRef = useRef(null);
    const menuRef = useRef(null);
    const route = useRoute();
    const params = route.params;
    const { themed, theme } = useAppTheme();
    const toggleDrawer = useCallback(() => {
        if (!open) {
            setOpen(true);
        }
        else {
            setOpen(false);
        }
    }, [open]);
    const handleScroll = useCallback((sectionIndex, itemIndex = 0) => {
        try {
            listRef.current?.scrollToLocation({
                animated: true,
                itemIndex,
                sectionIndex,
                viewPosition: 0.25,
            });
        }
        catch (e) {
            console.error(e);
        }
    }, []);
    // handle Web links
    useEffect(() => {
        if (params !== undefined && Object.keys(params).length > 0) {
            const demoValues = Object.values(Demos);
            const findSectionIndex = demoValues.findIndex((x) => x.name.toLowerCase() === params.queryIndex);
            let findItemIndex = 0;
            if (params.itemIndex) {
                try {
                    findItemIndex = demoValues[findSectionIndex].data({ themed, theme }).findIndex((u) => {
                        if (hasValidStringProp(u.props, "name")) {
                            return (slugify(translate(u.props.name)) === params.itemIndex);
                        }
                        return false;
                    });
                }
                catch (err) {
                    console.error(err);
                }
            }
            handleScroll(findSectionIndex, findItemIndex);
        }
    }, [handleScroll, params, theme, themed]);
    const scrollToIndexFailed = (info) => {
        listRef.current?.getScrollResponder()?.scrollToEnd();
        timeout.current = setTimeout(() => listRef.current?.scrollToLocation({
            animated: true,
            itemIndex: info.index,
            sectionIndex: 0,
        }), 50);
    };
    useEffect(() => {
        return () => {
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
        };
    }, []);
    const $drawerInsets = useSafeAreaInsetsStyle(["top"]);
    return (<Drawer open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} drawerType="back" drawerPosition={isRTL ? "right" : "left"} renderDrawerContent={() => (<View style={themed([$drawer, $drawerInsets])}>
            <View style={themed($logoContainer)}>
              <Image source={logo} style={$logoImage}/>
            </View>
            <FlatList ref={menuRef} contentContainerStyle={themed($listContentContainer)} data={Object.values(Demos).map((d) => ({
                name: d.name,
                useCases: d.data({ theme, themed }).map((u) => {
                    if (hasValidStringProp(u.props, "name")) {
                        return translate(u.props.name);
                    }
                    return "";
                }),
            }))} keyExtractor={(item) => item.name} renderItem={({ item, index: sectionIndex }) => (<ShowroomListItem {...{ item, sectionIndex, handleScroll }}/>)}/>
          </View>)}>
        <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={$styles.flex1} {...(isAndroid ? { KeyboardAvoidingViewProps: { behavior: undefined } } : {})}>
          <DrawerIconButton onPress={toggleDrawer}/>

          <SectionListWithKeyboardAwareScrollView ref={listRef} contentContainerStyle={themed($sectionListContentContainer)} stickySectionHeadersEnabled={false} sections={Object.values(Demos).map((d) => ({
            name: d.name,
            description: d.description,
            data: [d.data({ theme, themed })],
        }))} renderItem={({ item, index: sectionIndex }) => (<View>
                {item.map((demo, demoIndex) => (<View key={`${sectionIndex}-${demoIndex}`}>{demo}</View>))}
              </View>)} renderSectionFooter={() => <View style={themed($demoUseCasesSpacer)}/>} ListHeaderComponent={<View style={themed($heading)}>
                <Text preset="heading" tx="demoShowroomScreen:jumpStart"/>
              </View>} onScrollToIndexFailed={scrollToIndexFailed} renderSectionHeader={({ section }) => {
            return (<View>
                  <Text preset="heading" style={themed($demoItemName)}>
                    {section.name}
                  </Text>
                  <Text style={themed($demoItemDescription)}>{translate(section.description)}</Text>
                </View>);
        }}/>
        </Screen>
      </Drawer>);
};
const $drawer = ({ colors }) => ({
    backgroundColor: colors.background,
    flex: 1,
});
const $listContentContainer = ({ spacing }) => ({
    paddingHorizontal: spacing.lg,
});
const $sectionListContentContainer = ({ spacing }) => ({
    paddingHorizontal: spacing.lg,
});
const $heading = ({ spacing }) => ({
    marginBottom: spacing.xxxl,
});
const $logoImage = {
    height: 42,
    width: 77,
};
const $logoContainer = ({ spacing }) => ({
    alignSelf: "flex-start",
    justifyContent: "center",
    height: 56,
    paddingHorizontal: spacing.lg,
});
const $menuContainer = ({ spacing }) => ({
    paddingBottom: spacing.xs,
    paddingTop: spacing.lg,
});
const $demoItemName = ({ spacing }) => ({
    fontSize: 24,
    marginBottom: spacing.md,
});
const $demoItemDescription = ({ spacing }) => ({
    marginBottom: spacing.xxl,
});
const $demoUseCasesSpacer = ({ spacing }) => ({
    paddingBottom: spacing.xxl,
});
//# sourceMappingURL=DemoShowroomScreen.js.map