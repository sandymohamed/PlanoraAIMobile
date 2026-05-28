import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type IconProps = React.ComponentProps<typeof MaterialCommunityIcons>;

/** Shared MaterialCommunityIcons wrapper (same as MainTabs, Profile, Calendar, etc.) */
export const AppIcon: React.FC<IconProps> = (props) => <MaterialCommunityIcons {...props} />;

export default AppIcon;
