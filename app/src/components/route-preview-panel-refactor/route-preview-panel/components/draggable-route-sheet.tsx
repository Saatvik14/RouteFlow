import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, useWindowDimensions, View } from 'react-native';

import { styles } from '../styles';
import { clamp } from '../utils';

type SheetSnapPoint = 'bottom' | 'middle' | 'top';

type SheetBounds = {
  bottom: number;
  middle: number;
  top: number;
};

function getSnapHeight(bounds: SheetBounds, snapPoint: SheetSnapPoint) {
  return bounds[snapPoint];
}

function getNearestSnapPoint(height: number, bounds: SheetBounds): SheetSnapPoint {
  const entries: Array<[SheetSnapPoint, number]> = [
    ['bottom', bounds.bottom],
    ['middle', bounds.middle],
    ['top', bounds.top],
  ];

  return entries.reduce((nearest, current) => {
    const nearestDistance = Math.abs(height - nearest[1]);
    const currentDistance = Math.abs(height - current[1]);

    return currentDistance < nearestDistance ? current : nearest;
  })[0];
}

export function DraggableRouteSheet({
  children,
  isWide,
  mode = 'default',
  variant = 'default',
  initialSnap,
}: {
  children?: ReactNode;
  isWide: boolean;
  mode?: 'default' | 'large';
  variant?: 'default' | 'transit';
  initialSnap?: SheetSnapPoint;
}) {
  const { height } = useWindowDimensions();
  const resolvedInitialSnap: SheetSnapPoint = initialSnap || (mode === 'large' ? 'top' : 'middle');

  const sheetBounds = useMemo<SheetBounds>(() => {
    const topSafeGap = isWide ? 72 : 58;
    const maxHeight = Math.max(260, height - topSafeGap);

    if (isWide) {
      const bottom = Math.min(mode === 'large' ? 420 : 360, maxHeight);
      const middle = Math.min(mode === 'large' ? 620 : 540, maxHeight);
      const top = Math.min(mode === 'large' ? maxHeight : 760, maxHeight);

      return {
        bottom: Math.min(bottom, middle, top),
        middle: clamp(middle, bottom, top),
        top,
      };
    }

    const bottom = Math.min(Math.max(height * 0.13, 112), maxHeight);
    const middleRatio = mode === 'large' ? 0.58 : 0.5;
    const middle = Math.min(Math.max(height * middleRatio, bottom + 150), maxHeight);
    const top = maxHeight;

    return {
      bottom: Math.min(bottom, middle, top),
      middle: clamp(middle, bottom, top),
      top,
    };
  }, [height, isWide, mode]);

  const initialHeight = getSnapHeight(sheetBounds, resolvedInitialSnap);
  const animatedHeight = useRef(new Animated.Value(initialHeight)).current;
  const gestureStartHeight = useRef(initialHeight);
  const currentHeightRef = useRef(initialHeight);
  const currentSnapRef = useRef<SheetSnapPoint>(resolvedInitialSnap);

  const snapToHeight = useCallback(
    (nextHeight: number, animated = true) => {
      const snapPoint = getNearestSnapPoint(nextHeight, sheetBounds);
      const nextSnapHeight = getSnapHeight(sheetBounds, snapPoint);

      currentSnapRef.current = snapPoint;
      currentHeightRef.current = nextSnapHeight;

      if (!animated) {
        animatedHeight.stopAnimation();
        animatedHeight.setValue(nextSnapHeight);
        return;
      }

      Animated.spring(animatedHeight, {
        toValue: nextSnapHeight,
        useNativeDriver: false,
        damping: 24,
        stiffness: 230,
        mass: 0.9,
      }).start();
    },
    [animatedHeight, sheetBounds],
  );

  const setDragHeight = useCallback(
    (nextHeight: number) => {
      const nextClampedHeight = clamp(nextHeight, sheetBounds.bottom, sheetBounds.top);
      currentHeightRef.current = nextClampedHeight;
      animatedHeight.setValue(nextClampedHeight);
    },
    [animatedHeight, sheetBounds.bottom, sheetBounds.top],
  );

  useEffect(() => {
    const nextHeight = getSnapHeight(sheetBounds, currentSnapRef.current || resolvedInitialSnap);
    currentHeightRef.current = nextHeight;
    animatedHeight.setValue(nextHeight);
  }, [animatedHeight, resolvedInitialSnap, sheetBounds]);

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
          animatedHeight.stopAnimation(value => {
            gestureStartHeight.current = value;
            currentHeightRef.current = value;
          });
        },

        onPanResponderMove: (_, gestureState) => {
          setDragHeight(gestureStartHeight.current - gestureState.dy);
        },

        onPanResponderRelease: (_, gestureState) => {
          // Project the release position a little in the swipe direction so a quick flick
          // feels natural, then settle to one of the 3 fixed points: bottom / middle / top.
          const projectedHeight = gestureStartHeight.current - gestureState.dy - gestureState.vy * 140;
          snapToHeight(projectedHeight);
        },

        onPanResponderTerminate: (_, gestureState) => {
          const projectedHeight = gestureStartHeight.current - gestureState.dy - gestureState.vy * 140;
          snapToHeight(projectedHeight);
        },
      }),
    [animatedHeight, setDragHeight, snapToHeight],
  );

  return (
    <Animated.View
      style={[
        styles.draggableSheet,
        isWide && styles.draggableSheetWeb,
        variant === 'transit' && isWide && styles.draggableTransitSheetWeb,
        { height: animatedHeight, overflow: 'hidden' },
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
    </Animated.View>
  );
}
