import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../lib/theme';

interface Props {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function AppIcon({
  name,
  size = 20,
  color = Colors.textPrimary,
  style,
}: Props) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      style={style}
    />
  );
}
