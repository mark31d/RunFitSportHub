// Components/Onboarding.js
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Pressable, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const PALETTE = {
  bg: '#0B1020',
  card: '#121A33',
  card2: '#0E1630',
  text: '#EAF2FF',
  mut: 'rgba(234,242,255,0.72)',
  primary: '#7C5CFF',
  accent: '#00E6A8',
  info: '#4FC3FF',
  warn: '#FFB020',
  danger: '#FF4D6D',
  line: 'rgba(255,255,255,0.08)',
};

// строго используем только эти 5 изображений
const IMG = {
  start:   require('../assets/start.png'),
  create:  require('../assets/create.png'),
  predict: require('../assets/predict.png'),
  stats:   require('../assets/stats.png'),
  welcome: require('../assets/welcome.png'),
};

// Onboarding slides with English text and asset images
const slides = [
  {
    key: 'start',
    title: 'Welcome to Run Fit Sport Hub',
    subtitle: 'Build Your Dream Team',
    desc:
      'Create teams, manage lineups, and watch match predictions. '
      + 'This is an entertainment app: data is generated to help you quickly feel the gameplay.',
    img: IMG.start,
    tint: '#7C5CFF',
    iconTint: '#7C5CFF', // тот же цвет что и subtitle
    tips: ['Create your first team', 'Check the Predictions section', 'View standings and form'],
  },
  {
    key: 'create',
    title: 'Team Creation',
    subtitle: 'Name, Colors, Power & Form',
    desc:
      'Set a name, choose a color, set the "power" and mark the last form W/D/L. '
      + 'The team will immediately appear on the main screen, in predictions and standings.',
    img: IMG.create,
    tint: '#00E6A8',
    iconTint: '#00E6A8', // тот же цвет что и subtitle
    tips: ['Color is the team emblem', 'Power affects probability', 'Form shows last 5 games'],
  },
  {
    key: 'predict',
    title: 'Match Predictions',
    subtitle: 'Smart AI Model',
    desc:
      'The model considers power difference and form, adds some randomness and outputs win/draw probabilities.',
    img: IMG.predict,
    tint: '#4FC3FF',
    iconTint: '#4FC3FF', // тот же цвет что и subtitle
    tips: ['Compare A/Draw/B', 'Check model confidence', 'Open match Analytics'],
  },
  {
    key: 'stats',
    title: 'Statistics & Standings',
    subtitle: 'Progress & Results',
    desc:
      'Mini-charts on the main screen. In standings - points, goal difference and form. You can "play" a round and update stats.',
    img: IMG.stats,
    tint: '#FFB020',
    iconTint: '#FFB020', // тот же цвет что и subtitle
    tips: ['Mini form charts', 'Sort by columns', 'Round simulation'],
  },
  {
    key: 'welcome',
    title: 'About the App',
    subtitle: 'Entertainment Analytics',
    desc:
      'Run Fit Sport Hub is created to play with tactics and probability ideas. '
      + 'No real data is used - everything is generated for a pleasant experience.',
    img: IMG.welcome,
    tint: '#FF4D6D',
    iconTint: '#FF4D6D', // тот же цвет что и subtitle
    tips: ['Dark theme', 'Easy navigation', 'Create, simulate, compare'],
  },
];

export default function Onboarding({ onComplete }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const ref = useRef(null);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x } } }],
    {
      useNativeDriver: true,
      listener: (e) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / width);
        if (i !== index) setIndex(i);
      },
    },
  );

  const next = () => {
    if (index < slides.length - 1) {
      ref.current?.scrollTo({ x: (index + 1) * width, animated: true });
    } else {
      onComplete?.();
    }
  };
  const skip = () => onComplete?.();

  return (
    <SafeAreaView style={s.root}>
      <Animated.ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
         {slides.map((sld, i) => {
           const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
           const translateX = x.interpolate({
             inputRange,
             outputRange: [width * 0.35, 0, -width * 0.35], // light parallax
           });

           return (
             <View key={sld.key} style={[s.slide, { width }]}>
               <View style={[s.tint, { backgroundColor: sld.tint + '22' }]} />
               <Animated.View style={[s.illWrap, { transform: [{ translateX }] }]}>
                 <Image 
                   source={sld.img} 
                   style={[s.ill, { tintColor: sld.iconTint }]} 
                   resizeMode="contain" 
                 />
               </Animated.View>

               <View style={s.content}>
                 <Text style={s.title}>{sld.title}</Text>
                 <Text style={[s.subtitle, { color: sld.tint }]}>{sld.subtitle}</Text>
                 <Text style={s.desc}>{sld.desc}</Text>

                 {!!sld.tips?.length && (
                   <View style={s.tips}>
                     {sld.tips.map((t, k) => (
                       <View key={k} style={s.tipCard}>
                         <View style={s.bullet} />
                         <Text style={s.tipText}>{t}</Text>
                       </View>
                     ))}
                   </View>
                 )}
               </View>
             </View>
           );
         })}
      </Animated.ScrollView>

      {/* pagination */}
      <View style={[s.dots, { bottom: Math.max(insets.bottom + 92, 92) }]}>
        {slides.map((_, i) => {
          const isActive = i === index;
          return (
            <View 
              key={i} 
              style={[
                s.dot, 
                { 
                  width: isActive ? 24 : 8, 
                  backgroundColor: isActive ? PALETTE.accent : PALETTE.line 
                }
              ]} 
            />
          );
        })}
      </View>

      {/* bottom actions */}
      <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom + 18, 18) }]}>
        {index < slides.length - 1 ? (
          <>
            <Pressable style={s.skip} onPress={skip}>
              <Text style={s.skipTxt}>Skip</Text>
            </Pressable>
            <Pressable style={s.next} onPress={next}>
              <Text style={s.nextTxt}>Next</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={s.start} onPress={next}>
            <Text style={s.startTxt}>Get Started</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.bg },
  slide: { flex: 1, alignItems: 'center', paddingTop: 24 },
  tint: {
    position: 'absolute', top: 110, width: 300, height: 300, borderRadius: 160,
  },
  illWrap: {
    width: '80%', height: 260, alignItems: 'center', justifyContent: 'center',
    backgroundColor: PALETTE.card, borderRadius: 24, borderWidth: 1, borderColor: PALETTE.line,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  ill: { width: '80%', height: '80%' },

  content: { width: '86%', maxWidth: 360, alignItems: 'center', marginTop: 20 },
  title: { color: PALETTE.text, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  subtitle: { fontSize: 16, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  desc: { color: PALETTE.mut, fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 10 },

  tips: { width: '100%', marginTop: 16, gap: 10 },
  tipCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PALETTE.card2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: PALETTE.line,
  },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: PALETTE.accent, marginRight: 10 },
  tipText: { color: PALETTE.text, fontWeight: '700' },

  dots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { height: 8, borderRadius: 4 },

  bottom: { position: 'absolute', left: 16, right: 16, bottom: 0, flexDirection: 'row', gap: 12 },
  skip: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: PALETTE.line, backgroundColor: 'rgba(255,255,255,0.04)' },
  skipTxt: { color: PALETTE.mut, fontWeight: '700' },
  next: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: PALETTE.accent, alignItems: 'center' },
  nextTxt: { color: '#08131A', fontWeight: '900' },
  start: { flex: 1, paddingVertical: 18, borderRadius: 14, backgroundColor: PALETTE.primary, alignItems: 'center' },
  startTxt: { color: '#fff', fontWeight: '900', letterSpacing: 0.3 },
});
