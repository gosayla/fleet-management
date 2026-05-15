declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import React from 'react';
  import { StyleProp, TextStyle } from 'react-native';

  export interface MaterialCommunityIconsProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  }

  const MaterialCommunityIcons: React.ComponentType<MaterialCommunityIconsProps>;
  export default MaterialCommunityIcons;
}
