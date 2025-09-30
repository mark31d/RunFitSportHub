// Components/Loader.js
import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

/* ===== Палитра SquadCraft ===== */
const PALETTE = {
  bg: '#0B1020',
  card: '#121A33',
  text: '#EAF2FF',
  accent: '#00E6A8',
  primary: '#7C5CFF',
};

const html = (dotColor = '#00E6A8', shadowColor = 'rgba(0,0,0,0.9)') => `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
  />
  <style>
    html,body{height:100%;margin:0;background:transparent;overflow:hidden;}
    /* Центрирование */
    .center {
      height:100%;
      display:flex;
      align-items:center;
      justify-content:center;
    }
    /* From Uiverse.io by mobinkakei */
    .wrapper {
      width: 200px;
      height: 60px;
      position: relative;
      z-index: 1;
    }

    .circle {
      width: 20px;
      height: 20px;
      position: absolute;
      border-radius: 50%;
      background-color: ${dotColor};
      left: 15%;
      transform-origin: 50%;
      animation: circle7124 .5s alternate infinite ease;
    }

    @keyframes circle7124 {
      0% {
        top: 60px;
        height: 5px;
        border-radius: 50px 50px 25px 25px;
        transform: scaleX(1.7);
      }
      40% {
        height: 20px;
        border-radius: 50%;
        transform: scaleX(1);
      }
      100% { top: 0%; }
    }

    .circle:nth-child(2) { left: 45%; animation-delay: .2s; }
    .circle:nth-child(3) { left: auto; right: 15%; animation-delay: .3s; }

    .shadow {
      width: 20px;
      height: 4px;
      border-radius: 50%;
      background-color: ${shadowColor};
      position: absolute;
      top: 62px;
      transform-origin: 50%;
      z-index: -1;
      left: 15%;
      filter: blur(1px);
      animation: shadow046 .5s alternate infinite ease;
    }

    @keyframes shadow046 {
      0%   { transform: scaleX(1.5); }
      40%  { transform: scaleX(1); opacity: .7; }
      100% { transform: scaleX(.2); opacity: .4; }
    }

    .shadow:nth-child(4) { left: 45%; animation-delay: .2s }
    .shadow:nth-child(5) { left: auto; right: 15%; animation-delay: .3s; }
  </style>
</head>
<body>
  <div class="center">
    <div class="wrapper">
      <div class="circle"></div>
      <div class="circle"></div>
      <div class="circle"></div>
      <div class="shadow"></div>
      <div class="shadow"></div>
      <div class="shadow"></div>
    </div>
  </div>
</body>
</html>
`;

export default function Loader() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Image 
            source={require('../assets/Logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
      
      {/* Анимация кружочков внизу */}
      <View style={styles.dotsContainer}>
        <WebView
          originWhitelist={['*']}
          source={{ html: html(PALETTE.accent, 'rgba(0,0,0,0.9)') }}
          style={styles.web}
          androidLayerType="hardware"
          automaticallyAdjustContentInsets
          setSupportMultipleWindows={false}
          allowsLinkPreview={false}
          scrollEnabled={false}
          bounces={false}
          mixedContentMode="always"
          onError={() => {}}
          startInLoadingState={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: PALETTE.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PALETTE.card,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: PALETTE.accent,
    shadowColor: PALETTE.accent,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: 'hidden', // для закругления логотипа
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60, // закругление логотипа
  },
  dotsContainer: {
    height: 100,
    marginBottom: 50,
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'android' ? { opacity: 0.999 } : {}), // фикс прозрачности на Android
  },
});
