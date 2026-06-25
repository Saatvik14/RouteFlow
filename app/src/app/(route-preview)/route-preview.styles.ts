import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  menuButton: {
    position: 'absolute',
    left: 24,
    zIndex: 80,
    elevation: 12,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },

  hamburger: {
    width: 24,
    gap: 5,
  },

  hamburgerBar: {
    width: 24,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#111827',
  },

  mapControls: {
    position: 'absolute',
    right: 24,
    zIndex: 80,
    gap: 14,
  },

  mapControlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 12,
  },

  loadingCard: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 100,
    minHeight: 88,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },

  loadingText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#475569',
  },

  errorCard: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 100,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  errorText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '400',
    color: '#64748B',
  },

  optimizingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },

  optimizingCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 28,
    alignItems: 'center',
  },

  optimizingTitle: {
    fontSize: 28,
    fontWeight: '500',
    color: '#111827',
  },

  optimizingArt: {
    marginTop: 34,
    fontSize: 82,
    color: '#2F76F6',
  },

  optimizingText: {
    marginTop: 34,
    fontSize: 17,
    fontWeight: '400',
    color: '#111827',
  },

  progressTrack: {
    marginTop: 22,
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#93C5FD',
    overflow: 'hidden',
  },

  progressFill: {
    width: '48%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2F76F6',
  },
});
