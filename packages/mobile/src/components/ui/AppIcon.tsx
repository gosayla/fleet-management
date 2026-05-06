import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Colors} from '../../lib/theme';

interface Props {
  name: string;
  size?: number;
  color?: string;
}

export function AppIcon({name, size = 20, color = Colors.textPrimary}: Props) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
