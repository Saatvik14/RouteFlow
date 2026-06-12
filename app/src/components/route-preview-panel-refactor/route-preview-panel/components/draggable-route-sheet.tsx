import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Platform, useWindowDimensions, View } from 'react-native';

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
    const maxHeight = Math.max(260, height - topSafeGap);

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

  const [sheetHeight, setSheetHeight] = useState(() => sheetBounds.initial);
  const gestureStartHeight = useRef(sheetBounds.initial);
  const currentHeightRef = useRef(sheetBounds.initial);

  const setClampedSheetHeight = useCallback(
    (nextHeight: number) => {
      const nextClampedHeight = clamp(nextHeight, sheetBounds.min, sheetBounds.max);
      currentHeightRef.current = nextClampedHeight;
      setSheetHeight(nextClampedHeight);
    },
    [sheetBounds.max, sheetBounds.min],
  );

  useEffect(() => {
    setSheetHeight(currentHeight => {
      const nextClampedHeight = clamp(currentHeight, sheetBounds.min, sheetBounds.max);
      currentHeightRef.current = nextClampedHeight;
      return nextClampedHeight;
    });
  }, [sheetBounds.max, sheetBounds.min]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 2,
        onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dy) > 2,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,

        onPanResponderGrant: () => {
          gestureStartHeight.current = currentHeightRef.current;
        },

        onPanResponderMove: (_, gestureState) => {
          setClampedSheetHeight(gestureStartHeight.current - gestureState.dy);
        },

        onPanResponderRelease: (_, gestureState) => {
          setClampedSheetHeight(gestureStartHeight.current - gestureState.dy);
        },

        onPanResponderTerminate: (_, gestureState) => {
          setClampedSheetHeight(gestureStartHeight.current - gestureState.dy);
        },
      }),
    [setClampedSheetHeight],
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
      <View
        collapsable={false}
        style={[
          styles.dragHandleZone,
          { minHeight: 42 },
          Platform.OS === 'web' &&
            ({
              cursor: 'ns-resize',
              touchAction: 'none',
              userSelect: 'none',
            } as any),
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.dragHandle} />
      </View>

      {children}
    </View>
  );
}