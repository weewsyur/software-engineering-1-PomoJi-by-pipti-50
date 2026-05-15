import React from 'react';
import * as LucideIcons from 'lucide-react';

interface LucideIconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const LucideIcon = React.memo(({
  name,
  size = 24,
  color = '#000',
  strokeWidth = 2
}: LucideIconProps) => {
  const iconMap: Record<string, any> = {
    'add': LucideIcons.Plus,
    'bar-chart': LucideIcons.BarChart3,
    'bar-chart-outline': LucideIcons.BarChart3,
    'calendar-outline': LucideIcons.Calendar,
    'camera': LucideIcons.Camera,
    'chevron-back': LucideIcons.ChevronLeft,
    'clipboard-outline': LucideIcons.Clipboard,
    'close': LucideIcons.X,
    'flame': LucideIcons.Flame,
    'home': LucideIcons.Home,
    'home-outline': LucideIcons.Home,
    'images-outline': LucideIcons.Images,
    'notifications-outline': LucideIcons.Bell,
    'pause': LucideIcons.Pause,
    'pencil': LucideIcons.Edit,
    'pencil-outline': LucideIcons.Edit,
    'play': LucideIcons.Play,
    'person': LucideIcons.User,
    'person-outline': LucideIcons.User,
    'search': LucideIcons.Search,
    'search-outline': LucideIcons.Search,
    'stop': LucideIcons.Square,
    'timer': LucideIcons.Clock,
    'timer-outline': LucideIcons.Clock,
    'trash-outline': LucideIcons.Trash2,
  };

  const IconComponent = iconMap[name];
  if (!IconComponent) return null;

  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} />;
});

LucideIcon.displayName = 'LucideIcon';
