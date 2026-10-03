import { useState, useEffect } from 'react';

const lightColors = {
  primary: '#F4512C',
  primaryLight: '#FF8A65',
  primaryMuted: '#FDE3DC',
  background: '#F5F3EE',
  surface: '#FFFFFF',
  surfaceWarm: '#FAFAF7',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#ABABAB',
  border: '#EBEBEB',
  streak: '#F04423',
  dayActive: '#F04423',
  dayInactive: '#D4D4D4',
  tabActive: '#F04423',
  tabInactive: '#ABABAB',
  shadow: 'rgba(0,0,0,0.06)',
  avatarBg: '#FFD8CE',
  avatarText: '#F04423',
};

const darkColors = {
  primary: '#F4512C',
  primaryLight: '#FF7043',
  primaryMuted: '#4A241C',
  background: '#1A1A1A',
  surface: '#2D2D2D',
  surfaceWarm: '#252525',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#6B6B6B',
  border: '#3D3D3D',
  streak: '#F04423',
  dayActive: '#F04423',
  dayInactive: '#4D4D4D',
  tabActive: '#F04423',
  tabInactive: '#6B6B6B',
  shadow: 'rgba(0,0,0,0.3)',
  avatarBg: '#4A241C',
  avatarText: '#FF7043',
};

export const useColors = (isDarkMode: boolean) => {
  return isDarkMode ? darkColors : lightColors;
};

export const Colors = lightColors;