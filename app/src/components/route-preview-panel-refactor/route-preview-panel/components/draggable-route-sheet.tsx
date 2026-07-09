import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

type SheetSnap = 'top' | 'middle' | 'bottom';

type DraggableRouteSheetProps = {
  children: ReactNode;
  isWide: boolean;
  initialSnap?: SheetSnap;
  collapsedHeight?: number;
  onSnapChange?: (snap: SheetSnap) => void;
};

const TOP_SCREEN_GAP = 72;
const DEFAULT_COLLAPSED_HEIGHT = 142;
const HANDLE_AREA_HEIGHT = 28;
const SNAP_VELOCITY = 0.55;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function DraggableRouteSheet({
  children,
  isWide,
  initialSnap = 'middle',
  collapsedHeight = DEFAULT_COLLAPSED_HEIGHT,
  onSnapChange,
}: DraggableRouteSheetProps) {
  const { height: windowHeight } = useWindowDimensions();

  const snapHeights = useMemo(() => {
    const top = Math.max(360, windowHeight - TOP_SCREEN_GAP);
    const bottom = Math.min(
      Math.max(collapsedHeight, 80),
      Math.max(80, top - 80),
    );

    const middle = clamp(
      Math.round(windowHeight * 0.58),
      bottom + 80,
      top - 80,
    );

    return {
      top,
      middle,
      bottom,
    };
  }, [collapsedHeight, windowHeight]);

  const animatedHeight = useRef(
    new Animated.Value(snapHeights[initialSnap]),
  ).current;

  const currentHeightRef = useRef(snapHeights[initialSnap]);
  const gestureStartHeightRef = useRef(snapHeights[initialSnap]);
  const activeSnapRef = useRef<SheetSnap>(initialSnap);
  const movedRef = useRef(false);

  useEffect(() => {
    const subscriptionId = animatedHeight.addListener(({ value }) => {
      currentHeightRef.current = value;
    });

    return () => {
      animatedHeight.removeListener(subscriptionId);
    };
  }, [animatedHeight]);

  useEffect(() => {
    if (isWide) return;

    const nextHeight = snapHeights[activeSnapRef.current];

    currentHeightRef.current = nextHeight;
    animatedHeight.setValue(nextHeight);
  }, [animatedHeight, isWide, snapHeights]);

  const snapTo = (snap: SheetSnap) => {
    const nextHeight = snapHeights[snap];

    activeSnapRef.current = snap;

    Animated.spring(animatedHeight, {
      toValue: nextHeight,
      useNativeDriver: false,
      damping: 24,
      stiffness: 240,
      mass: 0.85,
      overshootClamping: true,
    }).start(({ finished }) => {
      if (finished) {
        currentHeightRef.current = nextHeight;
        onSnapChange?.(snap);
      }
    });
  };

  const findNearestSnap = (height: number): SheetSnap => {
    const entries = Object.entries(snapHeights) as Array<
      [SheetSnap, number]
    >;

    return entries.reduce<{
      snap: SheetSnap;
      distance: number;
    }>(
      (nearest, [snap, snapHeight]) => {
        const distance = Math.abs(height - snapHeight);

        return distance < nearest.distance
          ? { snap, distance }
          : nearest;
      },
      {
        snap: 'middle',
        distance: Number.POSITIVE_INFINITY,
      },
    ).snap;
  };

  const findNextSnap = (
    currentHeight: number,
    direction: 'up' | 'down',
  ): SheetSnap => {
    const ordered: Array<[SheetSnap, number]> = [
      ['bottom', snapHeights.bottom],
      ['middle', snapHeights.middle],
      ['top', snapHeights.top],
    ];

    if (direction === 'up') {
      return (
        ordered.find(([, height]) => height > currentHeight + 16)?.[0] ||
        'top'
      );
    }

    return (
      [...ordered]
        .reverse()
        .find(([, height]) => height < currentHeight - 16)?.[0] || 'bottom'
    );
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,

        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 3 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),

        onPanResponderGrant: () => {
          movedRef.current = false;

          animatedHeight.stopAnimation((value) => {
            gestureStartHeightRef.current = value;
            currentHeightRef.current = value;
          });
        },

        onPanResponderMove: (_, gestureState) => {
          if (Math.abs(gestureState.dy) > 3) {
            movedRef.current = true;
          }

          const nextHeight = clamp(
            gestureStartHeightRef.current - gestureState.dy,
            snapHeights.bottom,
            snapHeights.top,
          );

          animatedHeight.setValue(nextHeight);
        },

        onPanResponderRelease: (_, gestureState) => {
          const currentHeight = currentHeightRef.current;

          if (!movedRef.current && Math.abs(gestureState.dy) < 4) {
            const nearest = findNearestSnap(currentHeight);

            snapTo(nearest === 'bottom' ? 'middle' : 'bottom');
            return;
          }

          if (gestureState.vy < -SNAP_VELOCITY) {
            snapTo(findNextSnap(currentHeight, 'up'));
            return;
          }

          if (gestureState.vy > SNAP_VELOCITY) {
            snapTo(findNextSnap(currentHeight, 'down'));
            return;
          }

          snapTo(findNearestSnap(currentHeight));
        },

        onPanResponderTerminate: () => {
          snapTo(findNearestSnap(currentHeightRef.current));
        },

        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [animatedHeight, snapHeights],
  );

  if (isWide) {
    return <View style={styles.wideSheet}>{children}</View>;
  }

  return (
    <Animated.View
      style={[
        styles.mobileSheet,
        {
          height: animatedHeight,
        },
      ]}
    >
      <View
        {...panResponder.panHandlers}
        style={styles.dragArea}
        accessibilityRole="adjustable"
        accessibilityLabel="Drag route panel"
        accessibilityHint="Drag up to expand or drag down to collapse"
      >
        <View style={styles.dragHandle} />
      </View>

      <View style={styles.sheetBody}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mobileSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },

  dragArea: {
    height: HANDLE_AREA_HEIGHT,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'grab',
          userSelect: 'none',
        } as any)
      : null),
  },

  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },

  sheetBody: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },

  wideSheet: {
    position: 'absolute',
    top: 16,
    right: 16,
    bottom: 16,
    width: 420,
    zIndex: 50,
    elevation: 16,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
});
