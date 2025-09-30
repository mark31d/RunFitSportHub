// Components/Dashboard.js
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  FlatList,
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

const NAMES_A = ['Thunder', 'Storm', 'Velocity', 'Phoenix', 'Lightning', 'Cosmic', 'Falcon', 'Tigers', 'Raptors', 'Titans'];
const NAMES_B = ['Hawks', 'Eagles', 'Rebels', 'Rangers', 'Bolts', 'Titans', 'Wolves', 'Dragons', 'Knights', 'Comets'];
const COLORS  = [PALETTE.primary, PALETTE.accent, PALETTE.info, PALETTE.warn, PALETTE.danger];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* --- НАВИГАЦИЯ БЕЗ ОШИБОК --- */
function safeNavigate(navigation, routeName, params) {
  try {
    // Проверяем, есть ли экран в текущем навигаторе
    const currentState = navigation?.getState?.();
    const routeNames = currentState?.routeNames || [];
    
    if (routeNames.includes(routeName)) {
      return navigation.navigate(routeName, params);
    }

    // Проверяем родительский навигатор
    const parent = navigation.getParent?.();
    if (parent) {
      const parentState = parent.getState?.();
      const parentRouteNames = parentState?.routeNames || [];
      
      if (parentRouteNames.includes(routeName)) {
        return parent.navigate(routeName, params);
      }
    }

    // Если экран не найден, используем простую навигацию с fallback
    console.warn(`Screen ${routeName} not found in navigation. Attempting direct navigation.`);
    return navigation.navigate(routeName, params);
    
  } catch (error) {
    console.warn(`Navigation error for ${routeName}:`, error);
    // Fallback: просто не делаем навигацию
    return null;
  }
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

/* ===== Мини-компоненты ===== */
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

function KPI({ label, value, trend = 0 }) {
  const trendColor = trend > 0 ? PALETTE.accent : trend < 0 ? PALETTE.danger : PALETTE.mut;
  const sign = trend > 0 ? '+' : trend < 0 ? '' : '';
  return (
    <View style={styles.kpiBox}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiTrend, { color: trendColor }]}>{sign}{trend}%</Text>
    </View>
  );
}

function Sparkline({ data = [], color = PALETTE.info, height = 36 }) {
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
      <View style={[styles.sparkWrap, { height, minWidth: data.length * (bw + 2) }]}>
        {data.map((v, i) => {
          const h = ((v - min) / span) * (height - 6) + 6;
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
              }}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

function WLBadge({ v }) {
  const text = v === 1 ? 'W' : v === 0 ? 'D' : 'L';
  const color = v === 1 ? PALETTE.accent : v === 0 ? PALETTE.warn : PALETTE.danger;
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text style={styles.pillText}>{text}</Text>
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

/* ======== Основной экран ======== */
export default function Dashboard({ navigation }) {
  const insets = useSafeAreaInsets();
  const { teams, addTeam } = useTeams();
  
  // Если в контексте нет команд, создаем демо-команды
  const [demoTeams, setDemoTeams] = useState(() => [
    makeRandomTeam(),
    makeRandomTeam(),
    makeRandomTeam(),
    makeRandomTeam(),
  ]);
  
  // Используем команды из контекста или демо-команды
  const displayTeams = teams && Array.isArray(teams) && teams.length > 0 ? teams : demoTeams;

  // быстрый выбор для предикта
  const teamA = displayTeams[0];
  const teamB = displayTeams[1];
  const probs = useMemo(() => predict(teamA, teamB), [teamA, teamB]);

  const kpiShots = useMemo(() => rand(12, 24), [displayTeams]);
  const kpiConv  = useMemo(() => rand(18, 32), [displayTeams]);
  const kpiForm  = useMemo(() => teamA ? (teamA.form.filter(f => f === 1).length / teamA.form.length) * 100 : 0, [teamA]);

  const sparkData1 = useMemo(() => Array.from({ length: 14 }, () => rand(8, 26)), [displayTeams]);
  const sparkData2 = useMemo(() => Array.from({ length: 14 }, () => rand(0, 12)), [displayTeams]);

  const addRandomTeam = () => {
    if (teams.length > 0) {
      addTeam(makeRandomTeam());
    } else {
      setDemoTeams(t => [makeRandomTeam(), ...t]);
    }
  };
  
  const shuffleOpp = () => {
    if (teams.length > 0) {
      // В контексте просто добавляем новую команду
      addTeam(makeRandomTeam());
    } else {
      setDemoTeams(t => [t[0], makeRandomTeam(), ...t.slice(2)]);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom + 32, 32) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Run Fit Sport Hub — Dashboard</Text>
          <Pressable
            style={styles.btnAccent}
            onPress={() => {
              navigation.navigate('CreateTeamForm');
            }}
          >
            <Text style={styles.btnText}>Create Team</Text>
          </Pressable>
        </View>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <KPI label="Avg Shots" value={kpiShots} trend={rand(-6, 12)} />
          <KPI label="Conv%" value={`${kpiConv}%`} trend={rand(-5, 9)} />
          <KPI label={`${teamA?.name.split(' ')[0]} Form`} value={`${Math.round(kpiForm)}%`} trend={rand(-4, 10)} />
        </View>

         {/* Mini charts */}
         <Card title="Performance (last 14 games)" right={<Text style={styles.rightMuted}>Shots • xG</Text>}>
           <View style={styles.chartContainer}>
             <Sparkline data={sparkData1} color={PALETTE.info} />
             <Sparkline data={sparkData2} color={PALETTE.primary} />
           </View>
           <View style={{ height: 8 }} />
           <View style={styles.legendRow}>
             <View style={styles.legendDot(PALETTE.info)} />
             <Text style={styles.legendText}>Offense</Text>
             <View style={{ width: 12 }} />
             <View style={styles.legendDot(PALETTE.primary)} />
             <Text style={styles.legendText}>xG Proxy</Text>
           </View>
         </Card>

        {/* Quick Prediction */}
        <Card
          title="Quick Prediction"
          right={
            <Pressable style={styles.linkBtn} onPress={shuffleOpp}>
              <Text style={styles.linkText}>Random Opponent</Text>
            </Pressable>
          }
        >
           <View style={styles.vsRow}>
             <TeamChip team={teamA} onPress={() => navigation.navigate('TeamDetails', { id: teamA?.id })} />
             <Text style={styles.vsText}>vs</Text>
             <TeamChip team={teamB} onPress={() => navigation.navigate('TeamDetails', { id: teamB?.id })} />
           </View>

          <View style={{ height: 8 }} />
          <View style={styles.probRow}>
            <ProbBar label={teamA?.name.split(' ')[0]} value={probs.a} color={PALETTE.accent} />
            <ProbBar label="Draw" value={probs.d} color={PALETTE.warn} />
            <ProbBar label={teamB?.name.split(' ')[0]} value={probs.b} color={PALETTE.info} />
          </View>

          <View style={{ height: 12 }} />
           <Pressable
             style={styles.btnPrimary}
             onPress={() => navigation.navigate('Predictions', { 
               screen: 'PredictionScreen', 
               params: { a: teamA, b: teamB, probs } 
             })}
           >
             <Text style={styles.btnText}>View Analysis</Text>
           </Pressable>
        </Card>

         {/* Recent results */}
         <Card
           title="Recent Results"
           right={
             <Pressable style={styles.linkBtn} onPress={addRandomTeam}>
               <Text style={styles.linkText}>Add Random Team</Text>
             </Pressable>
           }
         >
           <FlatList
             data={displayTeams && displayTeams.length > 0 ? displayTeams.slice(0, 5) : []}
             keyExtractor={(item) => item.id}
             ItemSeparatorComponent={() => <View style={styles.sep} />}
             renderItem={({ item }) => (
               <ResultRow item={item} onPress={() => navigation.navigate('TeamDetails', { id: item.id })} />
             )}
             scrollEnabled={false}
           />
         </Card>

         {/* Mini standings */}
         <Card title="Mini Standings">
           {displayTeams && displayTeams.length > 0 ? displayTeams.slice(0, 4).map((t, i) => (
            <View key={t.id} style={styles.standRow}>
              <Text style={styles.standPos}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.standName} numberOfLines={1}>{t.name}</Text>
                <Progress value={t.power / 100} color={t.color} />
              </View>
              <Text style={styles.standPts}>{Math.round((t.power - 50) * 1.2)}</Text>
            </View>
          )) : (
            <Text style={[styles.standName, { color: PALETTE.mut, textAlign: 'center', paddingVertical: 20 }]}>
              No teams available
            </Text>
          )}
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===== Вспомогательные UI ===== */
function TeamChip({ team, onPress }) {
  if (!team) return null;
  return (
    <Pressable onPress={onPress} style={[styles.teamChip, { borderColor: team.color }]}>
      <View style={[styles.teamDot, { backgroundColor: team.color }]} />
      <View style={styles.teamInfo}>
        <View style={styles.formRow}>
          {team.form.slice(0, 4).map((v, idx) => <WLBadge v={v} key={idx} />)}
        </View>
        <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
        <Text style={styles.teamSub}>Power {team.power}</Text>
      </View>
    </Pressable>
  );
}

function ProbBar({ label, value, color }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.probTop}>
        <Text style={styles.probLabel}>{label}</Text>
        <Text style={styles.probVal}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function ResultRow({ item, onPress }) {
  const gf = item.scored;
  const ga = item.conceded;
  const diff = gf - ga;
  const diffColor = diff > 0 ? PALETTE.accent : diff < 0 ? PALETTE.danger : PALETTE.mut;

  return (
    <Pressable onPress={onPress} style={styles.resultRow}>
      <View style={[styles.dot, { backgroundColor: item.color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.resName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.resSub}>GF {gf} • GA {ga} • PWR {item.power}</Text>
      </View>
      <Text style={[styles.diff, { color: diffColor }]}>
        {diff > 0 ? `+${diff}` : diff}
      </Text>
    </Pressable>
  );
}

/* ===== Стили ===== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.bg },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { color: PALETTE.text, fontSize: 20, fontWeight: '800', flex: 1, letterSpacing: 0.2 },
  btnAccent: { backgroundColor: PALETTE.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  btnPrimary: { backgroundColor: PALETTE.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start' },
  btnText: { color: '#08131A', fontWeight: '800' },

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpiBox: { flex: 1, backgroundColor: PALETTE.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: PALETTE.line },
  kpiValue: { color: PALETTE.text, fontSize: 20, fontWeight: '800' },
  kpiLabel: { color: PALETTE.mut, marginTop: 2, fontSize: 12 },
  kpiTrend: { marginTop: 6, fontSize: 12, fontWeight: '700' },

  card: { backgroundColor: PALETTE.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: PALETTE.line, marginTop: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { color: PALETTE.text, fontSize: 15, fontWeight: '800', flex: 1 },
  rightMuted: { color: PALETTE.mut, fontSize: 12 },

  chartContainer: { marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  legendDot: (c) => ({ width: 10, height: 10, borderRadius: 5, backgroundColor: c }),
  legendText: { color: PALETTE.mut, marginLeft: 6, fontSize: 12 },

  sparkWrap: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    backgroundColor: PALETTE.card2, 
    borderRadius: 12, 
    paddingHorizontal: 8, 
    paddingVertical: 6, 
    borderWidth: 1, 
    borderColor: PALETTE.line, 
    marginBottom: 6,
    overflow: 'hidden'
  },

  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vsText: { color: PALETTE.mut, fontSize: 12, marginHorizontal: 8 },

  probRow: { flexDirection: 'row', gap: 10 },
  probTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  probLabel: { color: PALETTE.text, fontWeight: '700' },
  probVal: { color: PALETTE.text, fontWeight: '800' },

  teamChip: { 
    flex: 1, 
    minWidth: 0, 
    maxWidth: '48%', 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    borderWidth: 1, 
    borderRadius: 14, 
    paddingHorizontal: 10, 
    paddingVertical: 8, 
    backgroundColor: '#0C142A' 
  },
  teamDot: { width: 10, height: 10, borderRadius: 5, marginRight: 2 },
  teamInfo: { flex: 1, minWidth: 0 },
  teamName: { color: PALETTE.text, fontWeight: '800', marginTop: 4 },
  teamSub: { color: PALETTE.mut, fontSize: 12, marginTop: 2 },
  formRow: { flexDirection: 'row', gap: 4, flexShrink: 0 },

  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  resName: { color: PALETTE.text, fontWeight: '700' },
  resSub: { color: PALETTE.mut, fontSize: 12, marginTop: 2 },
  diff: { fontSize: 14, fontWeight: '800', minWidth: 36, textAlign: 'right' },

  standRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  standPos: { color: PALETTE.mut, width: 22, textAlign: 'center', fontWeight: '800' },
  standName: { color: PALETTE.text, fontWeight: '700', marginBottom: 6 },
  standPts: { color: PALETTE.text, fontWeight: '800', marginLeft: 8 },
  progressTrack: { height: 8, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },

  sep: { height: 1, backgroundColor: PALETTE.line, marginVertical: 2 },

  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, minWidth: 22, alignItems: 'center' },
  pillText: { color: '#08131A', fontWeight: '900', fontSize: 10 },

  linkBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: PALETTE.line },
  linkText: { color: PALETTE.text, fontWeight: '700' },
});
