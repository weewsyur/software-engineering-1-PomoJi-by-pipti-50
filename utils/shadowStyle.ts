import { Platform, ViewStyle } from "react-native";

function colorWithOpacity(color: string, opacity: number): string {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const normalized =
      hex.length === 3
        ? hex
            .split("")
            .map((digit) => digit + digit)
            .join("")
        : hex;
    const [red, green, blue] = [0, 2, 4].map((index) =>
      Number.parseInt(normalized.slice(index, index + 2), 16),
    );
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  }

  return color;
}

export function shadowStyle(
  color: string,
  offsetX: number,
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number,
): ViewStyle {
  return (
    Platform.select<ViewStyle>({
      web: {
        boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${colorWithOpacity(color, opacity)}`,
      },
      default: {
        shadowColor: color,
        shadowOffset: { width: offsetX, height: offsetY },
        shadowOpacity: opacity,
        shadowRadius: radius,
        elevation,
      },
    }) ?? {}
  );
}
