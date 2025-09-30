// Components/TeamDetails.js
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
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
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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

function predict(a, b) {
  const diff = (a?.power ?? 50) - (b?.power ?? 50);
  const p = 1 / (1 + Math.exp(-(diff / 8)));
  const noise = (Math.random() - 0.5) * 0.06;
  const home = 0.02;
  const probA = clamp(p + noise + home, 0.05, 0.93);
  const probB = clamp(1 - probA - 0.08, 0.05, 0.85);
  const probD = clamp(1 - probA - probB, 0.05, 0.3);
  const s = probA + probB + probD;
  return { a: probA / s, d: probD / s, b: probB / s };
}

/* ====== UI helpers ====== */
function Card({ title, right, children, style }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}
function WLBadge({ v }) {
  const text = v === 1 ? 'W' : v === 0 ? 'D' : 'L';
  const color = v === 1 ? PALETTE.accent : v === 0 ? PALETTE.warn : PALETTE.danger;
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text style={[styles.pillText, { color: v === 1 ? '#FFFFFF' : v === 0 ? '#FFFFFF' : '#FFFFFF' }]}>{text}</Text>
    </View>
  );
}
function Progress({ value = 0.5, color = PALETTE.accent }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}
function SparkBars({ data = [], color = PALETTE.info, height = 40 }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = Math.max(1, max - min);
  const bw = Math.max(8, Math.floor(280 / data.length)); // фиксированная ширина для скролла
  
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 16 }}
    >
      <View style={[styles.sparkWrap, { height: height + 8, minWidth: data.length * (bw + 2) }]}>
        {data.map((v, i) => {
          // Увеличиваем высоту столбов и добавляем отступ сверху
          const h = Math.max(4, ((v - min) / span) * (height - 12) + 8);
          return (
            <View
              key={i}
              style={{
                width: bw,
                height: h,
                backgroundColor: color,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
                marginRight: 2,
                alignSelf: 'flex-end',
                opacity: 0.95,
                marginTop: 4, // отступ сверху чтобы столбы не обрезались
              }}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

/* ====== Main ====== */
export default function TeamDetails({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { getTeamById, updateTeam, removeTeam } = useTeams();
  
  // 1) team напрямую
  let initial = route?.params?.team;
  // 2) id + getTeamById из контекста
  if (!initial && route?.params?.id) {
    initial = getTeamById(route.params.id);
  }
  // 3) id + teams[] (fallback для старых вызовов)
  if (!initial && route?.params?.id && Array.isArray(route?.params?.teams)) {
    initial = route.params.teams.find(t => t.id === route.params.id);
  }
  // fallback
  if (!initial) {
    initial = makeRandomTeam();
  }

  const [team, setTeam] = useState(initial);
  const [history, setHistory] = useState(() =>
    Array.from({ length: 10 }, () => rand(8, 24))
  );

  const attackIndex = useMemo(
    () => Math.round((team.scored / Math.max(1, team.conceded)) * 10) / 10,
    [team]
  );
  const formWins = useMemo(() => team.form.filter(f => f === 1).length, [team]);
  const formPts = useMemo(
    () => team.form.reduce((s, v) => s + (v === 1 ? 3 : v === 0 ? 1 : 0), 0),
    [team]
  );

  const onSimulateMatch = () => {
    const opp = makeRandomTeam();
    const probs = predict(team, opp);
    const roll = Math.random();
    let outcome = -1; // L
    if (roll < probs.a) outcome = 1;       // W
    else if (roll < probs.a + probs.d) outcome = 0; // D

    const nextForm = [...team.form.slice(1), outcome];
    const scored = team.scored + rand(0, 4);
    const conceded = team.conceded + rand(0, 4);
    const powerShift = outcome === 1 ? rand(0, 2) : outcome === 0 ? 0 : -rand(0, 2);

    const updated = {
      ...team,
      form: nextForm,
      scored,
      conceded,
      power: clamp(team.power + powerShift, 50, 99),
    };
    setTeam(updated);
    
    // Обновляем команду в контексте, если она там есть
    if (getTeamById(team.id)) {
      updateTeam(team.id, updated);
    }
    
    setHistory(h => [...h.slice(1), rand(8, 24)]);

    Alert.alert(
      'Match Simulated',
      `${team.name} vs ${opp.name}\nResult: ${outcome === 1 ? 'Win' : outcome === 0 ? 'Draw' : 'Loss'}`,
      [
        { text: 'OK' },
        {
          text: 'View Prediction',
          onPress: () =>
            navigation.navigate('Predictions', { screen: 'PredictionScreen', params: { a: updated, b: opp, probs } }),
        },
      ],
    );
  };

  const onDeleteTeam = () => {
    Alert.alert(
      'Delete Team',
      `Are you sure you want to delete "${team.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeTeam(team.id);
            if (navigation?.goBack) {
              navigation.goBack();
            }
          },
        },
      ],
    );
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
          <Text style={styles.title} numberOfLines={2}>{team.name}</Text>
        <Pressable style={styles.btnGhost} onPress={() => {
          if (navigation?.goBack) {
            navigation.goBack();
          }
        }}>
          <Text style={styles.ghostText}>Back</Text>
        </Pressable>
        </View>

      {/* Info Card */}
      <Card
        title="Team Overview"
        right={
          <Pressable style={styles.btnAccent} onPress={onSimulateMatch}>
            <Text style={styles.btnDarkText}>Simulate Match</Text>
          </Pressable>
        }
      >
        <View style={styles.row}>
          <View style={[styles.colorChip, { backgroundColor: team.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLine}>Power: <Text style={styles.infoStrong}>{team.power}</Text></Text>
            <Text style={styles.infoLine}>Attack Index: <Text style={styles.infoStrong}>{attackIndex}</Text></Text>
            <Text style={styles.infoSub}>GF {team.scored} • GA {team.conceded}</Text>
          </View>
          <View style={styles.overviewRight}>
            <Text style={styles.smallLabel}>Form</Text>
            <View style={styles.formRow}>
              {team.form.map((v, i) => <WLBadge key={i} v={v} />)}
            </View>
            <Text style={styles.infoSub}>Wins {formWins} • Pts {formPts}</Text>
          </View>
        </View>
      </Card>

      {/* Performance */}
      <Card
        title="Performance Trend"
        right={<Text style={styles.rightMuted}>Last 10 games</Text>}
      >
        <SparkBars data={history} color={PALETTE.info} height={44} />
        <View style={{ height: 8 }} />
        <View style={styles.legendRow}>
          <View style={styles.legendDot(PALETTE.info)} />
          <Text style={styles.legendText}>Shots / xG proxy</Text>
        </View>
      </Card>

      {/* Strengths */}
      <Card title="Strength Profile">
        <RowStat label="Offense" value={team.power / 100} color={PALETTE.accent} />
        <RowStat label="Midfield" value={clamp((team.power - 10) / 100, 0.1, 0.95)} color={PALETTE.primary} />
        <RowStat label="Defense" value={clamp((100 - (team.conceded % 100)) / 100, 0.2, 0.9)} color={PALETTE.warn} />
        <RowStat label="Stamina" value={clamp((team.scored % 70) / 100, 0.2, 0.85)} color={PALETTE.info} />
      </Card>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Pressable
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('CreateTeamForm', {
            // быстрый реюз формы для генерации новой — как соперника
            onCreate: (t) => {
              const probs = predict(team, t);
              navigation.navigate('Predictions', { screen: 'PredictionScreen', params: { a: team, b: t, probs } });
            },
          })}
        >
          <Text style={styles.btnDarkText}>New Opponent</Text>
        </Pressable>

        <Pressable
          style={styles.btnOutline}
          onPress={() => {
            const opp = makeRandomTeam();
            const probs = predict(team, opp);
            navigation.navigate('Predictions', { screen: 'PredictionScreen', params: { a: team, b: opp, probs } });
          }}
        >
          <Text style={styles.btnText}>View Prediction</Text>
        </Pressable>
      </View>

      {/* Delete button for user-created teams */}
      {team.isUserCreated && (
        <View style={styles.deleteSection}>
          <Pressable
            style={styles.btnDanger}
            onPress={onDeleteTeam}
          >
            <Text style={styles.btnDangerText}>Delete Team</Text>
          </Pressable>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===== Подкомпонент: строка со шкалой ===== */
function RowStat({ label, value, color }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowVal}>{Math.round(value * 100)}%</Text>
      </View>
      <Progress value={value} color={color} />
    </View>
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
    marginTop: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { color: PALETTE.text, fontSize: 15, fontWeight: '800', flex: 1 },
  rightMuted: { color: PALETTE.mut, fontSize: 12 },

  btnGhost: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  ghostText: { color: PALETTE.text, fontWeight: '700' },

  btnAccent: {
    backgroundColor: PALETTE.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnPrimary: {
    backgroundColor: PALETTE.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnOutline: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: PALETTE.line,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btnText: { color: PALETTE.text, fontWeight: '800' },
  btnDarkText: { color: '#08131A', fontWeight: '800' },
  
  deleteSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: PALETTE.line,
  },
  btnDanger: {
    backgroundColor: PALETTE.danger,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnDangerText: { 
    color: '#FFFFFF', 
    fontWeight: '800',
    fontSize: 14,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  colorChip: { width: 36, height: 36, borderRadius: 10, marginRight: 6, borderWidth: 1, borderColor: PALETTE.line },

  infoLine: { color: PALETTE.mut, fontSize: 13 },
  infoStrong: { color: PALETTE.text, fontWeight: '800' },
  infoSub: { color: PALETTE.mut, fontSize: 12, marginTop: 4 },

  formRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    marginTop: 6, 
    gap: 4, 
    justifyContent: 'flex-start', 
    alignItems: 'flex-start',
    maxWidth: '100%',
  },
  overviewRight: { 
    width: '32%', 
    minWidth: 120,
    maxWidth: 140,
    flexShrink: 1,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 18,
    alignItems: 'center',
    flexShrink: 0,
  },
  pillText: { color: '#FFFFFF', fontWeight: '900', fontSize: 9 },

  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  legendDot: (c) => ({ width: 10, height: 10, borderRadius: 5, backgroundColor: c }),
  legendText: { color: PALETTE.mut, marginLeft: 6, fontSize: 12 },

  progressTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 6 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { color: PALETTE.mut, fontSize: 12 },
  rowVal: { color: PALETTE.text, fontWeight: '800' },
  smallLabel: { color: PALETTE.text, fontSize: 12, fontWeight: '700' },

  sparkWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: PALETTE.card2,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: PALETTE.line,
    minHeight: 48, // минимальная высота для столбов
  },
});
