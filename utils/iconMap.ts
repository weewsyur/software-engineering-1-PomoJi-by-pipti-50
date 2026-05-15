import * as Icons from 'lucide-react';

type IconName = keyof typeof Icons;

export const lucideIcons = {
  add: 'Plus',
  'bar-chart': 'BarChart3',
  'bar-chart-outline': 'BarChart3',
  'calendar-outline': 'Calendar',
  camera: 'Camera',
  'chevron-back': 'ChevronLeft',
  'clipboard-outline': 'Clipboard',
  close: 'X',
  flame: 'Flame',
  'home': 'Home',
  'home-outline': 'Home',
  'images-outline': 'Images',
  'notifications-outline': 'Bell',
  pause: 'Pause',
  pencil: 'Edit',
  'pencil-outline': 'Edit',
  play: 'Play',
  'person': 'User',
  'person-outline': 'User',
  search: 'Search',
  'search-outline': 'Search',
  stop: 'Square',
  'timer': 'Clock',
  'timer-outline': 'Clock',
  'trash-outline': 'Trash2',
} as const;

export const getIcon = (iconName: keyof typeof lucideIcons): IconName => {
  return lucideIcons[iconName] as IconName;
};

export const renderIcon = (iconName: keyof typeof lucideIcons, size: number, color: string) => {
  const mappedName = lucideIcons[iconName] as IconName;
  const IconComponent = Icons[mappedName] as any;
  if (!IconComponent) return null;
  return <IconComponent size={size} color={color} strokeWidth={2} />;
};
