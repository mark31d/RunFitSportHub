// Components/CreateTeamForm.js
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTeams } from './TeamsContext';

const { width } = Dimensions.get('window');

/* ===== Палитра SquadCraft ===== */
const PALETTE = {
  bg: '#0B1020',
  card: '#121A33',
  card2: '#0E1630',
  text: '#EAF2FF',
  mut: 'rgba(234,242,255,0.7)',
  primary: '#7C5CFF',
  accent: '#00E6A8',
  info: '#4FC3FF',
  warn: '#FFB020',
  danger: '#FF4D6D',
  line: 'rgba(255,255,255,0.08)',
};

const NAMES_A = ['Thunder', 'Storm', 'Velocity', 'Phoenix', 'Lightning', 'Cosmic', 'Falcon', 'Aurora', 'Raptors', 'Titans'];
const NAMES_B = ['Hawks', 'Eagles', 'Rebels', 'Rangers', 'Bolts', 'Knights', 'Wolves', 'Dragons', 'Comets', 'Rockets'];
const COLORS   = [PALETTE.primary, PALETTE.accent, PALETTE.info, PALETTE.warn, PALETTE.danger];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

/* --- БЕЗОПАСНАЯ НАВИГАЦИЯ --- */
function safeNavigate(navigation, routeName, params) {
  try {
    if (navigation?.navigate) {
      return navigation.navigate(routeName, params);
    }
  } catch (error) {
    console.warn(`Navigation error for ${routeName}:`, error);
  }
  return null;
}

function makeRandomTeam() {
  const rating = rand(60, 95);
  return {
    id: Math.random().toString(36).slice(2),
    name: `${pick(NAMES_A)} ${pick(NAMES_B)}`,
    power: rating,
    form: Array.from({ length: 5 }, () => rand(0, 3) - 1), // -1 L, 0 D, 1 W
    color: pick(COLORS),
    scored: rand(12, 42),
    conceded: rand(8, 35),
    createdAt: Date.now(),
  };
}

function WLBadge({ v, onPress }) {
  // v: -1 L, 0 D, 1 W
  const text = v === 1 ? 'W' : v === 0 ? 'D' : 'L';
  const color = v === 1 ? PALETTE.accent : v === 0 ? PALETTE.warn : PALETTE.danger;
  return (
    <Pressable onPress={onPress} style={[styles.pill, { backgroundColor: color }]}>
      <Text style={styles.pillText}>{text}</Text>
    </Pressable>
  );
}

export default function CreateTeamForm({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { addTeam } = useTeams();
  const [name, setName] = useState('');
  const [power, setPower] = useState(75);
  const [color, setColor] = useState(COLORS[0]);
  const [form, setForm] = useState([1, 0, -1, 1, 0]); // W D L W D

  const canSave = useMemo(() => name.trim().length >= 2, [name]);

  const cycle = (v) => {
    // -1 -> 0 -> 1 -> -1
    if (v === -1) return 0;
    if (v === 0) return 1;
    return -1;
  };

  const onRandom = () => {
    const t = makeRandomTeam();
    setName(t.name);
    setPower(t.power);
    setColor(t.color);
    setForm(t.form);
  };

  const onSave = () => {
    if (!canSave) {
      Alert.alert('Name required', 'Введите название команды (минимум 2 символа).');
      return;
    }
    const team = {
      id: Math.random().toString(36).slice(2),
      name: name.trim(),
      power: Math.max(1, Math.min(99, power)),
      color,
      form,
      scored: rand(10, 40),
      conceded: rand(8, 35),
      createdAt: Date.now(),
      isUserCreated: true, // Пользовательская команда
    };
    
    // Если есть коллбек из route.params — используем его
    if (route?.params?.onCreate) {
      route.params.onCreate(team);
    } else {
      // Иначе добавляем в контекст
      addTeam(team);
    }
    
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ 
          padding: 16, 
          paddingBottom: Math.max(insets.bottom + 32, 32) 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Team</Text>
          <Pressable style={styles.btnGhost} onPress={onRandom}>
            <Text style={styles.ghostText}>Randomize</Text>
          </Pressable>
        </View>

      {/* Name */}
      <View style={styles.card}>
        <Text style={styles.label}>Team Name</Text>
        <TextInput
          placeholder="e.g., Thunder Knights"
          placeholderTextColor={PALETTE.mut}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
      </View>

      {/* Color */}
      <View style={styles.card}>
        <Text style={styles.label}>Team Color</Text>
        <View style={styles.colorsRow}>
          {COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.colorDot, { backgroundColor: c, borderColor: color === c ? '#fff' : 'transparent' }]}
            />
          ))}
        </View>
      </View>

      {/* Power */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Power</Text>
          <Text style={styles.valueStrong}>{power}</Text>
        </View>
        <View style={styles.sliderRow}>
          <Pressable style={styles.sliderBtn} onPress={() => setPower((p) => Math.max(1, p - 1))}>
            <Text style={styles.sliderBtnText}>–</Text>
          </Pressable>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round((power / 99) * 100)}%` }]} />
          </View>
          <Pressable style={styles.sliderBtn} onPress={() => setPower((p) => Math.min(99, p + 1))}>
            <Text style={styles.sliderBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Form */}
      <View style={styles.card}>
        <Text style={styles.label}>Recent Form</Text>
        <View style={styles.formRow}>
          {form.map((v, i) => (
            <WLBadge
              key={i}
              v={v}
              onPress={() => {
                const next = [...form];
                next[i] = cycle(v);
                setForm(next);
              }}
            />
          ))}
        </View>
        <Text style={styles.hint}>Нажимай по бейджам, чтобы переключать: L → D → W.</Text>
      </View>

      <View style={styles.rowBetween}>
        <Pressable style={styles.btnGhost} onPress={() => {
          if (navigation?.goBack) {
            navigation.goBack();
          }
        }}>
          <Text style={styles.ghostText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimary, !canSave && { opacity: 0.5 }]}
          onPress={onSave}
          disabled={!canSave}
        >
          <Text style={styles.btnText}>Save Team</Text>
        </Pressable>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===== Стили ===== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.bg },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { color: PALETTE.text, fontSize: 20, fontWeight: '800', flex: 1, letterSpacing: 0.2 },

  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE.line,
    marginBottom: 12,
  },

  label: { color: PALETTE.mut, fontSize: 12, marginBottom: 8 },
  input: {
    backgroundColor: PALETTE.card2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: PALETTE.text,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },

  colorsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  colorDot: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
  },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },

  valueStrong: { color: PALETTE.text, fontSize: 16, fontWeight: '800' },

  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: PALETTE.card2,
    borderWidth: 1, borderColor: PALETTE.line,
    alignItems: 'center', justifyContent: 'center',
  },
  sliderBtnText: { color: PALETTE.text, fontSize: 20, fontWeight: '800' },

  track: {
    flex: 1,
    height: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: PALETTE.accent, borderRadius: 8 },

  formRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 34,
    alignItems: 'center',
  },
  pillText: { color: '#08131A', fontWeight: '900', fontSize: 12 },

  hint: { color: PALETTE.mut, fontSize: 11, marginTop: 6 },

  btnPrimary: {
    backgroundColor: PALETTE.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-end',
  },
  btnText: { color: '#08131A', fontWeight: '800' },
  btnGhost: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  ghostText: { color: PALETTE.text, fontWeight: '700' },
});
