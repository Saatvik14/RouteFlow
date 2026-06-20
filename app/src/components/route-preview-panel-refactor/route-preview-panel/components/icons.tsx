import { Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { styles } from '../styles';

export function RowIcon({
  name,
  size = 26,
  color = '#475569',
}: {
  name: keyof typeof Feather.glyphMap;
  size?: number;
  color?: string;
}) {
  return (
    <View style={styles.rowIconBox}>
      <Feather name={name} size={size} color={color} />
    </View>
  );
}
export function McIcon({
  name,
  size = 28,
  color = '#475569',
}: {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: number;
  color?: string;
}) {
  return (
    <View style={styles.rowIconBox}>
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </View>
  );
}
export function PackageActionIcon({ type }: { type: 'failed' | 'delivered' }) {
  const isDelivered = type === 'delivered';

  return (
    <View style={styles.packageActionIconWrap}>
      <MaterialCommunityIcons
        name="package-variant-closed"
        size={24}
        color="#475569"
      />

      <View
        style={[
          styles.packageActionBadge,
          isDelivered ? styles.packageActionBadgeSuccess : styles.packageActionBadgeDanger,
        ]}
      >
        <Feather name={isDelivered ? 'check' : 'x'} size={11} color="#FFFFFF" />
      </View>
    </View>
  );
}
