import { useState, useEffect } from 'react';

const lightColors = {
  primary: '#E8401C',
  primaryLight: '#FF6B47',
  primaryMuted: '#FDE8E3',
  background: '#F5F3EE',
  surface: '#FFFFFF',
  surfaceWarm: '#FAFAF7',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#ABABAB',
  border: '#EBEBEB',
  streak: '#E8401C',
  dayActive: '#E8401C',
  dayInactive: '#D4D4D4',
  tabActive: '#E8401C',
  tabInactive: '#ABABAB',
  shadow: 'rgba(0,0,0,0.06)',
  avatarBg: '#F5D5CF',
  avatarText: '#E8401C',
};

const darkColors = {
  primary: '#E8401C',
  primaryLight: '#FF6B47',
  primaryMuted: '#4A2A20',
  background: '#1A1A1A',
  surface: '#2D2D2D',
  surfaceWarm: '#252525',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#6B6B6B',
  border: '#3D3D3D',
  streak: '#E8401C',
  dayActive: '#E8401C',
  dayInactive: '#4D4D4D',
  tabActive: '#E8401C',
  tabInactive: '#6B6B6B',
  shadow: 'rgba(0,0,0,0.3)',
  avatarBg: '#4A2A20',
  avatarText: '#E8401C',
};

export const useColors = (isDarkMode: boolean) => {
  return isDarkMode ? darkColors : lightColors;
};

export const Colors = lightColors;