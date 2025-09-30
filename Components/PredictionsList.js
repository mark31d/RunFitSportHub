// Components/PredictionsList.js
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTeams } from './TeamsContext';

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

const SPORTS = ['Football', 'Basketball', 'Hockey'];

const NAMES_A = ['Thunder', 'Storm', 'Velocity', 'Phoenix', 'Lightning', 'Cosmic', 'Falcon', 'Aurora', 'Raptors', 'Titans'];
const NAMES_B = ['Hawks', 'Eagles', 'Rebels', 'Rangers', 'Bolts', 'Knights', 'Wolves', 'Dragons', 'Comets', 'Rockets'];

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

function makeTeam() {
  const rating = rand(60, 95);
  const colorPick = [PALETTE.primary, PALETTE.accent, PALETTE.info, PALETTE.warn, PALETTE.danger];
  return {
    id: Math.random().toString(36).slice(2),
    name: `${pick(NAMES_A)} ${pick(NAMES_B)}`,
    power: rating,
    color: pick(colorPick),
    form: Array.from({ length: 5 }, () => rand(0, 3) - 1),
  };
}

function predict(a, b) {
  const diff = (a?.power ?? 50) - (b?.power ?? 50);
  const p = 1 / (1 + Math.exp(-(diff / 8)));
  const noise = (Math.random() - 0.5) * 0.06;
  const home = 0.02;
  let pa = clamp(p + noise + home, 0.05, 0.93);
  let pb = clamp(1 - pa - 0.08, 0.05, 0.85);
  let pd = clamp(1 - pa - pb, 0.05, 0.3);
  const s = pa + pb + pd;
  pa /= s; pb /= s; pd /= s;

  const conf = Math.max(Math.abs(pa - pb), Math.abs(pa - pd), Math.abs(pb - pd));
  const predictSide = pa > pb && pa > pd ? 'A' : pb > pa && pb > pd ? 'B' : 'D';

  return {
    pa, pb, pd,
    pick: predictSide, // 'A' | 'B' | 'D'
    confidence: clamp(0.55 + conf * 0.8, 0.55, 0.95),
    // наивная проекция счёта (для футбола): сила + шум
    scoreA: Math.max(0, Math.round((a.power - 60) / 18 + Math.random() * 2)),
    scoreB: Math.max(0, Math.round((b.power - 60) / 18 + Math.random() * 2)),
  };
}

function makeFixture() {
  const a = makeTeam();
  const b = makeTeam();
  const sport = pick(SPORTS);
  const timeIn = rand(30, 180); // минут до матча
  const pr = predict(a, b);

  return {
    id: Math.random().toString(36).slice(2),
    sport,
    a,
    b,
    probs: pr,
    startsInMin: timeIn,
  };
}

/* ===== UI helpers ===== */
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

function WLRow({ team }) {
  return (
    <View style={styles.formRow}>
      {team.form.map((v, i) => {
        const text = v === 1 ? 'W' : v === 0 ? 'D' : 'L';
        const color = v === 1 ? PALETTE.accent : v === 0 ? PALETTE.warn : PALETTE.danger;
        return (
          <View key={i} style={[styles.pill, { backgroundColor: color }]}>
            <Text style={styles.pillText}>{text}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Tag({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tag,
        active && { backgroundColor: PALETTE.accent },
      ]}
    >
      <Text style={[styles.tagText, active && { color: '#08131A', fontWeight: '800' }]}>{label}</Text>
    </Pressable>
  );
}

/* ===== Main ===== */
export default function PredictionsList({ navigation }) {
  const insets = useSafeAreaInsets();
  const { teams } = useTeams();
  const [fixtures, setFixtures] = useState(() => Array.from({ length: 14 }, () => makeFixture()));
  const [sport, setSport] = useState('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('time'); // time | conf | index

  const filtered = useMemo(() => {
    let data = fixtures;
    if (sport !== 'All') data = data.filter(f => f.sport === sport);
    if (query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      data = data.filter(f =>
        f.a.name.toLowerCase().includes(q) ||
        f.b.name.toLowerCase().includes(q)
      );
    }
    if (sort === 'time') {
      data = [...data].sort((x, y) => x.startsInMin - y.startsInMin);
    } else if (sort === 'conf') {
      data = [...data].sort((x, y) => y.probs.confidence - x.probs.confidence);
    } else if (sort === 'index') {
      data = [...data].sort((x, y) => (y.a.power + y.b.power) - (x.a.power + x.b.power));
    }
    return data;
  }, [fixtures, sport, query, sort]);

  const refresh = () => {
    // Если есть команды в контексте, создаем фикстуры из них
    if (teams.length >= 2) {
      const newFixtures = Array.from({ length: 14 }, () => {
        const teamA = teams[rand(0, teams.length - 1)];
        const teamB = teams[rand(0, teams.length - 1)];
        const sport = pick(SPORTS);
        const timeIn = rand(30, 180);
        const pr = predict(teamA, teamB);
        
        return {
          id: Math.random().toString(36).slice(2),
          sport,
          a: teamA,
          b: teamB,
          probs: pr,
          startsInMin: timeIn,
        };
      });
      setFixtures(newFixtures);
    } else {
      // Иначе используем генерацию
      setFixtures(Array.from({ length: 14 }, () => makeFixture()));
    }
  };

  const openPrediction = (f) => {
    navigation.navigate('PredictionScreen', { a: f.a, b: f.b, probs: f.probs });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Filters */}
      <View style={styles.header}>
        <Text style={styles.title}>Predictions</Text>
        <Pressable style={styles.btnGhost} onPress={refresh}>
          <Text style={styles.ghostText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Tag label="All"        active={sport === 'All'}        onPress={() => setSport('All')} />
        {SPORTS.map(s => (
          <Tag key={s} label={s} active={sport === s} onPress={() => setSport(s)} />
        ))}
      </View>

      <View style={styles.row}>
        <Pressable style={[styles.sortBtn, sort === 'time' && styles.sortBtnActive]} onPress={() => setSort('time')}>
          <Text style={[styles.sortText, sort === 'time' && styles.sortTextActive]}>Soonest</Text>
        </Pressable>
        <Pressable style={[styles.sortBtn, sort === 'conf' && styles.sortBtnActive]} onPress={() => setSort('conf')}>
          <Text style={[styles.sortText, sort === 'conf' && styles.sortTextActive]}>Confidence</Text>
        </Pressable>
        <Pressable style={[styles.sortBtn, sort === 'index' && styles.sortBtnActive]} onPress={() => setSort('index')}>
          <Text style={[styles.sortText, sort === 'index' && styles.sortTextActive]}>Power Index</Text>
        </Pressable>
      </View>

      <View style={styles.searchCard}>
        <TextInput
          placeholder="Search teams..."
          placeholderTextColor={PALETTE.mut}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ 
          padding: 16, 
          paddingBottom: Math.max(insets.bottom + 28, 28) 
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => <FixtureCard item={item} onPress={() => openPrediction(item)} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

/* ===== Row item ===== */
function FixtureCard({ item, onPress }) {
  const side = item.probs.pick; // 'A' | 'B' | 'D'
  const pickLabel = side === 'A' ? item.a.name.split(' ')[0] : side === 'B' ? item.b.name.split(' ')[0] : 'Draw';
  const pickColor = side === 'A' ? PALETTE.accent : side === 'B' ? PALETTE.info : PALETTE.warn;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={styles.sportTag}>
          <Text style={styles.sportText}>{item.sport}</Text>
        </View>
        <Text style={styles.mutText}>Starts in {item.startsInMin}m</Text>
      </View>

      <View style={styles.teamsRow}>
        <TeamSide team={item.a} align="right" />
        <Text style={styles.vs}>vs</Text>
        <TeamSide team={item.b} align="left" />
      </View>

      <View style={{ height: 8 }} />

      <View style={styles.probRow}>
        <ProbBar label={item.a.name.split(' ')[0]} value={item.probs.pa} color={PALETTE.accent} />
        <ProbBar label="Draw" value={item.probs.pd} color={PALETTE.warn} />
        <ProbBar label={item.b.name.split(' ')[0]} value={item.probs.pb} color={PALETTE.info} />
      </View>

      <View style={styles.pickRow}>
        <Text style={styles.pickText}>
          Pick: <Text style={[styles.pickStrong, { color: pickColor }]}>{pickLabel}</Text>
        </Text>
        <View style={styles.confBar}>
          <View style={[styles.confFill, { width: `${Math.round(item.probs.confidence * 100)}%` }]} />
        </View>
        <Text style={styles.confVal}>{Math.round(item.probs.confidence * 100)}%</Text>
      </View>

      <View style={styles.formsRow}>
        <WLRow team={item.a} />
        <WLRow team={item.b} />
      </View>
    </Pressable>
  );
}

function TeamSide({ team, align = 'left' }) {
  return (
    <View style={[styles.teamBox, align === 'right' && { alignItems: 'flex-end' }]}>
      <View style={[styles.teamDot, { backgroundColor: team.color }]} />
      <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
      <Text style={styles.teamSub}>Power {team.power}</Text>
    </View>
  );
}

/* ===== Стили ===== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: PALETTE.text, fontSize: 20, fontWeight: '800', flex: 1, letterSpacing: 0.2 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 10 },

  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  tagText: { color: PALETTE.text, fontWeight: '700', fontSize: 12 },

  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  sortBtnActive: {
    backgroundColor: 'rgba(124,92,255,0.18)',
    borderColor: 'rgba(124,92,255,0.28)',
  },
  sortText: { color: PALETTE.mut, fontWeight: '700', fontSize: 12 },
  sortTextActive: { color: PALETTE.text },

  searchCard: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: PALETTE.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    color: PALETTE.text,
    paddingVertical: 8,
  },

  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sportTag: {
    backgroundColor: '#0C142A',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  sportText: { color: PALETTE.text, fontSize: 11, fontWeight: '800' },
  mutText: { color: PALETTE.mut, fontSize: 12, marginLeft: 'auto' },

  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vs: { color: PALETTE.mut, fontSize: 12, marginHorizontal: 6 },

  probRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  probTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  probLabel: { color: PALETTE.mut, fontSize: 12 },
  probVal: { color: PALETTE.text, fontWeight: '800' },

  progressTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 6 },

  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  pickText: { color: PALETTE.mut, fontSize: 12 },
  pickStrong: { fontWeight: '900' },
  confBar: {
    flex: 1,
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  confFill: { height: '100%', backgroundColor: PALETTE.primary, borderRadius: 6 },
  confVal: { color: PALETTE.text, fontWeight: '800' },

  formsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },

  teamBox: { maxWidth: 140 },
  teamDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  teamName: { color: PALETTE.text, fontWeight: '800' },
  teamSub: { color: PALETTE.mut, fontSize: 12 },

  formRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, minWidth: 22, alignItems: 'center' },
  pillText: { color: '#08131A', fontWeight: '900', fontSize: 10 },

  sep: { height: 12 },
});
