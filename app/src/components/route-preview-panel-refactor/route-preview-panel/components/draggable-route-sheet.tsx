import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, useWindowDimensions, View } from 'react-native';

import { styles } from '../styles';
import { clamp } from '../utils';

export function DraggableRouteSheet({
  children,
  isWide,
  mode = 'default',
  variant = 'default',
}: {
  children?: ReactNode;
  isWide: boolean;
  mode?: 'default' | 'large';
  variant?: 'default' | 'transit';
}) {
  const { height } = useWindowDimensions();

  const sheetBounds = useMemo(() => {
    const topSafeGap = isWide ? 72 : 62;
    const maxHeight = height - topSafeGap;

    if (mode === 'large') {
      return {
        min: isWide ? Math.min(420, maxHeight) : Math.min(height * 0.58, maxHeight),
        initial: isWide ? Math.min(620, maxHeight) : Math.min(height * 0.76, maxHeight),
        max: maxHeight,
      };
    }

    return {
      min: isWide ? Math.min(360, maxHeight) : Math.min(height * 0.44, maxHeight),
      initial: isWide ? Math.min(540, maxHeight) : Math.min(height * 0.58, maxHeight),
      max: isWide ? Math.min(720, maxHeight) : maxHeight,
    };
  }, [height, isWide, mode]);

  const [sheetHeight, setSheetHeight] = useState(sheetBounds.initial);
  const gestureStartHeight = useRef(sheetBounds.initial);

  useEffect(() => {
    setSheetHeight(currentHeight => clamp(currentHeight, sheetBounds.min, sheetBounds.max));
  }, [sheetBounds.max, sheetBounds.min]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
          gestureStartHeight.current = sheetHeight;
        },
        onPanResponderMove: (_, gestureState) => {
          const nextHeight = gestureStartHeight.current - gestureState.dy;
          setSheetHeight(clamp(nextHeight, sheetBounds.min, sheetBounds.max));
        },
        onPanResponderRelease: (_, gestureState) => {
          const currentHeight = clamp(
            gestureStartHeight.current - gestureState.dy,
            sheetBounds.min,
            sheetBounds.max,
          );

          const midpoint = (sheetBounds.min + sheetBounds.max) / 2;
          const shouldExpand = gestureState.vy < -0.45 || currentHeight > midpoint;
          const shouldCollapse = gestureState.vy > 0.45 || currentHeight <= midpoint;

          if (shouldExpand) {
            setSheetHeight(sheetBounds.max);
          } else if (shouldCollapse) {
            setSheetHeight(sheetBounds.initial);
          } else {
            setSheetHeight(currentHeight);
          }
        },
      }),
    [sheetBounds.initial, sheetBounds.max, sheetBounds.min, sheetHeight],
  );

  return (
    <View
      style={[
        styles.draggableSheet,
        isWide && styles.draggableSheetWeb,
        variant === 'transit' && isWide && styles.draggableTransitSheetWeb,
        { height: clamp(sheetHeight, sheetBounds.min, sheetBounds.max) },
      ]}
    >
      <View style={styles.dragHandleZone} {...panResponder.panHandlers}>
        <View style={styles.dragHandle} />
      </View>

      {children}
    </View>
  );
}
