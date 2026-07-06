import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { routesService } from './../../services/api/routes';
import { buildRouteFromBackendResponse } from './../(route-preview)/route-preview.helpers';

function getParam(value: string | string[] | undefined, fallback = '') {
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
}

export default function CarryOverStopsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const routeName = useMemo(() => getParam(params.routeName, ''), [params.routeName]);
  const routeDate = useMemo(() => getParam(params.routeDate, ''), [params.routeDate]);
  const routeDateLabel = useMemo(() => getParam(params.routeDateLabel, ''), [params.routeDateLabel]);
  const routeDay = useMemo(() => getParam(params.routeDay, ''), [params.routeDay]);

  const [isLoadingPastRoutes, setIsLoadingPastRoutes] = useState(true);
  const [isLoadingStops, setIsLoadingStops] = useState(false);
  const [allPastRoutes, setAllPastRoutes] = useState<any[]>([]);
  const [pastRouteTitle, setPastRouteTitle] = useState('');
  const [selectedPastRouteId, setSelectedPastRouteId] = useState('');
  const [pastRouteStops, setPastRouteStops] = useState<any[]>([]);
  const [selectedPastStopKeys, setSelectedPastStopKeys] = useState<Record<string, boolean>>({});
  const [isRouteDropdownOpen, setIsRouteDropdownOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch past routes
  useEffect(() => {
    async function loadPastRoutes() {
      setIsLoadingPastRoutes(true);
      setErrorMessage('');
      try {
        const response = (await routesService.getRoutes(50, 0)) as any;
        const rawData = response?.data ?? response;
        const routesList = Array.isArray(rawData) ? rawData : rawData?.routes || [];

        setAllPastRoutes(routesList);

        const lastRoute = routesList[0];
        if (lastRoute) {
          const lastRouteId = String(lastRoute.route_id || lastRoute.id || lastRoute.routeId);
          setSelectedPastRouteId(lastRouteId);
          setPastRouteTitle(lastRoute.name || lastRoute.routeName || lastRoute.title || 'Last Route');
          await loadStopsForRoute(lastRouteId);
        } else {
          setIsLoadingStops(false);
        }
      } catch (error) {
        console.error(error);
        setErrorMessage('Unable to load past routes.');
      } finally {
        setIsLoadingPastRoutes(false);
      }
    }
    loadPastRoutes();
  }, []);

  const loadStopsForRoute = async (routeId: string) => {
    setIsLoadingStops(true);
    setErrorMessage('');
    try {
      const routeDetailResponse = await routesService.getRoute(routeId);
      const result = await buildRouteFromBackendResponse(routeDetailResponse, routeId);
      const stops = result.route.stops;

      setPastRouteStops(stops);

      // Default: select all stops
      const initialSelection: Record<string, boolean> = {};
      stops.forEach((stop: any) => {
        initialSelection[stop.id] = true;
      });
      setSelectedPastStopKeys(initialSelection);
    } catch (error) {
      console.error(error);
      setErrorMessage('Unable to load stops for selected route.');
    } finally {
      setIsLoadingStops(false);
    }
  };

  const handleSwitchPastRoute = async (routeId: string, title: string) => {
    setSelectedPastRouteId(routeId);
    setPastRouteTitle(title);
    setIsRouteDropdownOpen(false);
    await loadStopsForRoute(routeId);
  };

  const togglePastStopSelection = (stopId: string) => {
    setSelectedPastStopKeys((prev) => ({
      ...prev,
      [stopId]: !prev[stopId],
    }));
  };

  const togglePastStopsBatch = (stopIds: string[], select: boolean) => {
    setSelectedPastStopKeys((prev) => {
      const next = { ...prev };
      stopIds.forEach((id) => {
        next[id] = select;
      });
      return next;
    });
  };

  const failedStops = useMemo(() => {
    return pastRouteStops.filter((item: any) => item.status === 'failed');
  }, [pastRouteStops]);

  const doneStops = useMemo(() => {
    return pastRouteStops.filter((item: any) => item.status === 'delivered' || item.status === 'completed');
  }, [pastRouteStops]);

  const skippedStops = useMemo(() => {
    return pastRouteStops.filter((item: any) => item.status !== 'failed' && item.status !== 'delivered' && item.status !== 'completed');
  }, [pastRouteStops]);

  const handleToggleCategory = (categoryStops: any[]) => {
    const allSelected = categoryStops.length > 0 && categoryStops.every(s => !!selectedPastStopKeys[s.id]);
    const stopIds = categoryStops.map(s => s.id);
    togglePastStopsBatch(stopIds, !allSelected);
  };

  const handleConfirm = () => {
    const stopsToCopy = pastRouteStops.filter((stop) => selectedPastStopKeys[stop.id]);
    
    router.push({
      pathname: '/route-points',
      params: {
        routeName,
        routeDate,
        routeDateLabel,
        routeDay,
        carryPastStops: 'true',
        stopsToCopy: JSON.stringify(stopsToCopy),
      },
    } as never);
  };

  const handleSkip = () => {
    router.push({
      pathname: '/route-points',
      params: {
        routeName,
        routeDate,
        routeDateLabel,
        routeDay,
        carryPastStops: 'false',
        stopsToCopy: '[]',
      },
    } as never);
  };


  const selectedCount = Object.values(selectedPastStopKeys).filter(Boolean).length;

  const renderCategorySection = (
    title: string,
    stops: any[],
    iconComponent: React.ReactNode,
    emptyText: string
  ) => {
    const isChecked = stops.length > 0 && stops.every(stop => !!selectedPastStopKeys[stop.id]);
    
    return (
      <View style={{ marginBottom: 20 }}>
        {/* Category Header */}
        <Pressable
          onPress={() => handleToggleCategory(stops)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: '#F1F5F9',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialCommunityIcons
              name={isChecked ? "checkbox-marked" : "checkbox-blank-outline"}
              size={22}
              color={isChecked ? "#2F76F6" : "#CBD5E1"}
            />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#475569', marginLeft: 12 }}>
              {title}
            </Text>
          </View>
          {iconComponent}
        </Pressable>

        {/* Category Stops List */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          {stops.length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#94A3B8' }}>{emptyText}</Text>
            </View>
          ) : (
            stops.map((stop, index) => {
              const isStopChecked = !!selectedPastStopKeys[stop.id];
              return (
                <Pressable
                  key={stop.id}
                  onPress={() => togglePastStopSelection(stop.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isStopChecked ? '#EFF6FF' : '#FFFFFF',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isStopChecked ? '#BFDBFE' : '#E2E8F0',
                    padding: 16,
                    marginBottom: 8,
                  }}
                >
                  <View style={{ marginRight: 12 }}>
                    <MaterialCommunityIcons
                      name={isStopChecked ? "checkbox-marked" : "checkbox-blank-outline"}
                      size={22}
                      color={isStopChecked ? "#2F76F6" : "#CBD5E1"}
                    />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 2 }}>
                      {stop.title || 'Untitled Stop'}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748B' }} numberOfLines={2}>
                      {stop.address || stop.description || 'No address'}
                    </Text>
                  </View>

                  <View style={{
                    backgroundColor: '#DBEAFE',
                    borderRadius: 6,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    marginLeft: 8,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E40AF' }}>
                      A{stop.sequence || index + 1}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 60 : 40 }}>
      {/* Header Bar */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ padding: 8, marginLeft: -8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#64748B" />
        </Pressable>
        
        <Pressable style={{ padding: 8, marginRight: -8 }}>
          <MaterialCommunityIcons name="magnify" size={24} color="#64748B" />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 16 }}>
          Carry over stops
        </Text>

        {/* Dropdown Input Selector */}
        <Pressable
          onPress={() => setIsRouteDropdownOpen(!isRouteDropdownOpen)}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ fontSize: 15, color: '#64748B' }}>
            From: <Text style={{ color: '#0F172A', fontWeight: '500' }}>{pastRouteTitle || 'Select past route...'}</Text>
          </Text>
          <MaterialCommunityIcons 
            name="chevron-down" 
            size={20} 
            color="#64748B" 
          />
        </Pressable>
      </View>

      {/* Collapsible Dropdown Options Menu */}
      {isRouteDropdownOpen && (
        <View style={{
          position: 'absolute',
          top: Platform.OS === 'ios' ? 190 : 170,
          left: 20,
          right: 20,
          maxHeight: 200,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          padding: 4,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
          zIndex: 9999,
        }}>
          <ScrollView nestedScrollEnabled={true}>
            {allPastRoutes.length === 0 ? (
              <Text style={{ padding: 12, fontSize: 14, color: '#64748B', textAlign: 'center' }}>
                No other routes available
              </Text>
            ) : (
              allPastRoutes.map((item) => {
                const itemRouteId = String(item.route_id || item.id || item.routeId);
                const isSelected = itemRouteId === selectedPastRouteId;
                return (
                  <Pressable
                    key={itemRouteId}
                    onPress={() => handleSwitchPastRoute(itemRouteId, item.name || item.routeName || item.title || 'Untitled Route')}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? '#1D4ED8' : '#334155',
                    }}>
                      {item.name || item.routeName || item.title || 'Untitled Route'}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {isLoadingPastRoutes || isLoadingStops ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2F76F6" />
          <Text style={{ marginTop: 12, color: '#64748B', fontSize: 15 }}>
            {isLoadingPastRoutes ? 'Loading past routes...' : 'Loading route stops...'}
          </Text>
        </View>
      ) : pastRouteStops.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <MaterialCommunityIcons name="map-marker-off" size={60} color="#94A3B8" />
          <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: '#475569' }}>No stops found</Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: '#94A3B8', textAlign: 'center' }}>
            The selected route does not have any stops to copy.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 100 }}
          >
            {/* 1. Failed Stops Section */}
            {renderCategorySection(
              "Failed stops",
              failedStops,
              <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="package-variant-closed" size={20} color="#475569" />
                <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFFFFF', borderRadius: 6, width: 12, height: 12, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="close-circle" size={10} color="#EF4444" />
                </View>
              </View>,
              "No failed stops on this route"
            )}

            {/* 2. Skipped Stops Section */}
            {renderCategorySection(
              "Skipped stops",
              skippedStops,
              <MaterialCommunityIcons name="package-variant-closed" size={20} color="#475569" />,
              "No skipped stops on this route"
            )}

            {/* 3. Done Stops Section */}
            {renderCategorySection(
              "Done stops",
              doneStops,
              <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="package-variant-closed" size={20} color="#475569" />
                <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFFFFF', borderRadius: 6, width: 12, height: 12, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="check-circle" size={10} color="#22C55E" />
                </View>
              </View>,
              "No done stops on this route"
            )}
          </ScrollView>

          {/* Action Button at bottom */}
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            paddingVertical: 16,
            paddingHorizontal: 20,
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
          }}>
            {errorMessage ? (
              <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>
                {errorMessage}
              </Text>
            ) : null}
            
            <Pressable
              onPress={handleConfirm}
              disabled={selectedCount === 0}
              style={({ pressed }) => ({
                backgroundColor: selectedCount === 0 ? '#E2E8F0' : '#2F76F6',
                borderRadius: 12,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: (pressed && selectedCount > 0) ? 0.9 : 1,
                marginBottom: 12,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: selectedCount === 0 ? '#94A3B8' : '#FFFFFF' }}>
                Copy {selectedCount} {selectedCount === 1 ? 'stop' : 'stops'} to {routeDay || 'Monday'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => ({
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748B' }}>
                Skip
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
