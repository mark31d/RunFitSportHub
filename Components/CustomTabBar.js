// Components/CustomTabBar.js
import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* — палитра SquadCraft — */
const PALETTE = {
  bg: '#0B1020',
  card: '#121A33',
  text: '#EAF2FF',
  mut: 'rgba(234,242,255,0.6)',
  primary: '#7C5CFF',
  accent: '#00E6A8',
  info: '#4FC3FF',
  warn: '#FFB020',
  danger: '#FF4D6D',
  line: 'rgba(255,255,255,0.06)',
};

/* — иконки из assets — */
const ICONS = {
  Home:        require('../assets/home.png'),
  Standings:   require('../assets/standings.png'),
  Predictions: require('../assets/predictions.png'),
  Profile:     require('../assets/profile.png'),
};

/**
 * Custom bottom tab bar for react-navigation v6
 * props: { state, descriptors, navigation }
 */
export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  // индикатор активной вкладки
  const indicatorX = useRef(new Animated.Value(0)).current;
  const tabWidth = useMemo(() => 1 / state.routes.length, [state.routes.length]);

  // анимации для каждой вкладки
  const tabAnimations = useRef(
    state.routes.map(() => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(0.6),
    }))
  ).current;

  useEffect(() => {
    // Анимация индикатора с более плавным переходом
    Animated.timing(indicatorX, {
      toValue: state.index,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Анимация вкладок
    state.routes.forEach((_, index) => {
      const isActive = state.index === index;
      
      Animated.parallel([
        Animated.spring(tabAnimations[index].scale, {
          toValue: isActive ? 1.1 : 1,
          useNativeDriver: true,
          stiffness: 400,
          damping: 20,
        }),
        Animated.timing(tabAnimations[index].opacity, {
          toValue: isActive ? 1 : 0.6,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [state.index, indicatorX, tabAnimations]);

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View style={styles.plate}>
        {/* индикатор */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: `${tabWidth * 100}%`,
              left: `${(state.index * 100) / state.routes.length}%`,
            },
          ]}
        />
        {/* кнопки */}
        {state.routes.map((route, idx) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === idx;

          const onPress = () => {
            // Анимация нажатия
            Animated.sequence([
              Animated.timing(tabAnimations[idx].scale, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.spring(tabAnimations[idx].scale, {
                toValue: isFocused ? 1.1 : 1,
                useNativeDriver: true,
                stiffness: 300,
                damping: 15,
              }),
            ]).start();

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const color = isFocused ? PALETTE.accent : PALETTE.mut;
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const iconSrc = ICONS[route.name];

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
            >
              <Animated.View
                style={[
                  styles.iconBox,
                  {
                    transform: [{ scale: tabAnimations[idx].scale }],
                    opacity: tabAnimations[idx].opacity,
                  },
                ]}
              >
                <Image
                  source={iconSrc}
                  resizeMode="contain"
                  style={[
                    styles.icon,
                    // Если иконка монохромная — подкрашиваем тинтом:
                    { tintColor: color },
                  ]}
                />
              </Animated.View>
              <Animated.Text 
                style={[
                  styles.label, 
                  { 
                    color,
                    transform: [{ scale: tabAnimations[idx].scale }],
                    opacity: tabAnimations[idx].opacity,
                  }
                ]} 
                numberOfLines={1}
              >
                {label}
              </Animated.Text>

              {/* пример бейджа: options.tabBarBadge = number */}
              {typeof options.tabBarBadge === 'number' && options.tabBarBadge > 0 && (
                <Animated.View 
                  style={[
                    styles.badge,
                    {
                      transform: [{ scale: tabAnimations[idx].scale }],
                    }
                  ]}
                >
                  <Text style={styles.badgeText}>{options.tabBarBadge}</Text>
                </Animated.View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  plate: {
    flexDirection: 'row',
    backgroundColor: PALETTE.card,
    borderRadius: 18,
    marginHorizontal: 16,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  tab: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  iconBox: { 
    height: 24, 
    marginBottom: 4, 
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  icon: { 
    width: 22, 
    height: 22,
    alignSelf: 'center',
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.2,
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0,230,168,0.15)', // accent с прозрачностью
    marginHorizontal: 2,
    shadowColor: '#00E6A8',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 20,
    backgroundColor: PALETTE.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
