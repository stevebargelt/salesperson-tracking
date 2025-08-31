/* eslint-disable react/jsx-key */
import { View } from "react-native";
import { Icon, iconRegistry } from "@/components/Icon";
import { Text } from "@/components/Text";
import { $styles } from "@/theme/styles";
import { DemoUseCase } from "../DemoUseCase";
const $demoIconContainer = ({ spacing }) => ({
    padding: spacing.xs,
});
const $iconTile = ({ spacing }) => ({
    width: "33.333%",
    alignItems: "center",
    paddingVertical: spacing.xs,
});
const $iconTileLabel = ({ colors, spacing }) => ({
    marginTop: spacing.xxs,
    color: colors.textDim,
});
const $customIconContainer = ({ colors, spacing }) => ({
    padding: spacing.md,
    backgroundColor: colors.palette.angry500,
});
const $customIcon = ({ colors }) => ({
    tintColor: colors.palette.neutral100,
});
export const DemoIcon = {
    name: "Icon",
    description: "demoIcon:description",
    data: ({ theme, themed }) => [
        <DemoUseCase name="demoIcon:useCase.icons.name" description="demoIcon:useCase.icons.description" layout="row" itemStyle={$styles.flexWrap}>
      {Object.keys(iconRegistry).map((icon) => (<View key={icon} style={themed($iconTile)}>
          <Icon icon={icon} color={theme.colors.tint} size={35}/>

          <Text size="xs" style={themed($iconTileLabel)}>
            {icon}
          </Text>
        </View>))}
    </DemoUseCase>,
        <DemoUseCase name="demoIcon:useCase.size.name" description="demoIcon:useCase.size.description" layout="row">
      <Icon icon="ladybug" containerStyle={themed($demoIconContainer)}/>
      <Icon icon="ladybug" size={35} containerStyle={themed($demoIconContainer)}/>
      <Icon icon="ladybug" size={50} containerStyle={themed($demoIconContainer)}/>
      <Icon icon="ladybug" size={75} containerStyle={themed($demoIconContainer)}/>
    </DemoUseCase>,
        <DemoUseCase name="demoIcon:useCase.color.name" description="demoIcon:useCase.color.description" layout="row">
      <Icon icon="ladybug" color={theme.colors.palette.accent500} containerStyle={themed($demoIconContainer)}/>
      <Icon icon="ladybug" color={theme.colors.palette.primary500} containerStyle={themed($demoIconContainer)}/>
      <Icon icon="ladybug" color={theme.colors.palette.secondary500} containerStyle={themed($demoIconContainer)}/>
      <Icon icon="ladybug" color={theme.colors.palette.neutral700} containerStyle={themed($demoIconContainer)}/>
      <Icon icon="ladybug" color={theme.colors.palette.angry500} containerStyle={themed($demoIconContainer)}/>
    </DemoUseCase>,
        <DemoUseCase name="demoIcon:useCase.styling.name" description="demoIcon:useCase.styling.description" layout="row">
      <Icon icon="ladybug" style={themed($customIcon)} size={40} containerStyle={themed($customIconContainer)}/>
    </DemoUseCase>,
    ],
};
//# sourceMappingURL=DemoIcon.js.map