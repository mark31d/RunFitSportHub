// Components/StandingsScreen.js
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
  const form = Array.from({ length: 5 }, () => rand(0, 3) - 1); // -1 L, 0 D, 1 W
  const played = rand(10, 26);
  const wins = clamp(rand(0, played), 0, played);
  const draws = clamp(rand(0, played - wins), 0, played - wins);
  const losses = Math.max(0, played - wins - draws);
  const gf = rand(12, 55);
  const ga = rand(10, 50);

  return {
    id: Math.random().toString(36).slice(2),
    sport: pick(SPORTS),
    name: `${pick(NAMES_A)} ${pick(NAMES_B)}`,
    power: rating,
    color: pick([PALETTE.primary, PALETTE.accent, PALETTE.info, PALETTE.warn, PALETTE.danger]),
    form,
    played,
    wins,
    draws,
    losses,
    gf,
    ga,
  };
}

function tableRow(t) {
  const pts = t.wins * 3 + t.draws * 1;
  const gd = t.gf - t.ga;
  const formPts = t.form.reduce((s, v) => s + (v === 1 ? 3 : v === 0 ? 1 : 0), 0);
  return { ...t, pts, gd, formPts };
}

function simulateRound(team) {
  // наивная симуляция следующего матча
  const oppPower = rand(60, 95);
  const diff = team.power - oppPower;
  const pA = 1 / (1 + Math.exp(-(diff / 8)));
  const noise = (Math.random() - 0.5) * 0.12;
  const pa = clamp(pA + noise, 0.1, 0.8);
  const pd = clamp(0.15 + (0.2 - Math.abs(noise)), 0.05, 0.35);
  const pb = clamp(1 - pa - pd, 0.1, 0.8);
  const r = Math.random();

  let outcome = -1; // L
  if (r < pa) outcome = 1; else if (r < pa + pd) outcome = 0;

  let wins = team.wins, draws = team.draws, losses = team.losses;
  if (outcome === 1) wins += 1;
  else if (outcome === 0) draws += 1;
  else losses += 1;

  const gf = team.gf + rand(0, 4);
  const ga = team.ga + rand(0, 4);

  return tableRow({
    ...team,
    played: team.played + 1,
    wins, draws, losses, gf, ga,
    form: [...team.form.slice(1), outcome],
  });
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

function ColHeader({ title, sortKey, activeKey, dir, onPress, flex = 1, align = 'center' }) {
  const isActive = activeKey === sortKey;
  return (
    <Pressable onPress={() => onPress(sortKey)} style={[styles.th, { flex, alignItems: alignMap[align] }]}>
      <Text style={[styles.thText, isActive && { color: PALETTE.text }]}>
        {title}{isActive ? (dir === 'desc' ? ' ↓' : ' ↑') : ''}
      </Text>
    </Pressable>
  );
}

const alignMap = { left: 'flex-start', center: 'center', right: 'flex-end' };

export default function StandingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { teams: contextTeams, updateTeam, setTeams } = useTeams();
  const [sport, setSport] = useState('All');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('pts'); // pts | gd | played | wins | draws | losses | name | power | formPts
  const [sortDir, setSortDir] = useState('desc'); // asc | desc
  // Используем команды из контекста напрямую
  const teams = useMemo(() => {
    if (contextTeams && Array.isArray(contextTeams) && contextTeams.length > 0) {
      return contextTeams.map(team => tableRow({
        ...team,
        sport: pick(SPORTS),
        played: rand(10, 26),
        wins: rand(3, 15),
        draws: rand(2, 8),
        losses: rand(1, 10),
        gf: team.scored,
        ga: team.conceded,
      }));
    }
    // Иначе генерируем демо-команды
    return Array.from({ length: 14 }, () => tableRow(makeTeam()));
  }, [contextTeams]);

  const onSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const refresh = () => {
    const newTeams = Array.from({ length: 14 }, () => tableRow(makeTeam()));
    setTeams(newTeams);
  };

  const simulate = () => {
    setTeams((prev) => {
      const updated = prev.map(simulateRound);
      
      // Обновляем команды в контексте, если они там есть
      if (contextTeams && Array.isArray(contextTeams)) {
        updated.forEach(team => {
          const contextTeam = contextTeams.find(t => t.id === team.id);
          if (contextTeam) {
            updateTeam(team.id, {
              form: team.form,
              power: team.power,
              scored: team.gf,
              conceded: team.ga,
            });
          }
        });
      }
      
      return updated;
    });
  };

  const filtered = useMemo(() => {
    let data = teams;
    if (sport !== 'All') data = data.filter((t) => t.sport === sport);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      data = data.filter((t) => t.name.toLowerCase().includes(q));
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    const cmp = (a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
      return (a[sortKey] - b[sortKey]) * dir;
    };
    return [...data].sort(cmp);
  }, [teams, sport, query, sortKey, sortDir]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Standings</Text>
        <Pressable style={styles.btnGhost} onPress={refresh}>
          <Text style={styles.ghostText}>Refresh</Text>
        </Pressable>
        <Pressable style={styles.btnPrimary} onPress={simulate}>
          <Text style={styles.btnDarkText}>Simulate round</Text>
        </Pressable>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <View style={styles.tagsRow}>
          <Tag label="All" active={sport === 'All'} onPress={() => setSport('All')} />
          {SPORTS.map((s) => (
            <Tag key={s} label={s} active={sport === s} onPress={() => setSport(s)} />
          ))}
        </View>
        <View style={styles.search}>
          <TextInput
            placeholder="Search team..."
            placeholderTextColor={PALETTE.mut}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Table header */}
      <View style={styles.tableWrap}>
        <View style={styles.thead}>
          <Pressable style={[styles.th, { flex: 0.7, alignItems: 'flex-end' }]}>
            <Text style={[styles.thText, { color: PALETTE.mut }]}>#</Text>
          </Pressable>
          <ColHeader title="Team" sortKey="name" activeKey={sortKey} dir={sortDir} onPress={onSort} flex={2.8} align="left" />
          <ColHeader title="P" sortKey="played" activeKey={sortKey} dir={sortDir} onPress={onSort} />
          <ColHeader title="W" sortKey="wins" activeKey={sortKey} dir={sortDir} onPress={onSort} />
          <ColHeader title="D" sortKey="draws" activeKey={sortKey} dir={sortDir} onPress={onSort} />
          <ColHeader title="L" sortKey="losses" activeKey={sortKey} dir={sortDir} onPress={onSort} />
          <ColHeader title="GF" sortKey="gf" activeKey={sortKey} dir={sortDir} onPress={onSort} />
          <ColHeader title="GA" sortKey="ga" activeKey={sortKey} dir={sortDir} onPress={onSort} />
          <ColHeader title="GD" sortKey="gd" activeKey={sortKey} dir={sortDir} onPress={onSort} />
          <ColHeader title="Pts" sortKey="pts" activeKey={sortKey} dir={sortDir} onPress={onSort} />
        </View>

        {/* Table body */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ 
            paddingBottom: Math.max(insets.bottom + 40, 40),
            paddingTop: 4,
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item, index }) => (
            <Row
              pos={index + 1}
              team={item}
              onPress={() => navigation.navigate('Home', { screen: 'TeamDetails', params: { team: item } })}
            />
          )}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}

/* ===== Row ===== */
function Row({ pos, team, onPress }) {
  return (
    <Pressable style={styles.tr} onPress={onPress}>
      <Text style={[styles.td, styles.pos]}>{pos}</Text>

      <View style={[styles.td, { flex: 2.8, alignItems: 'flex-start' }]}>
        <View style={[styles.teamDot, { backgroundColor: team.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
          <Text style={styles.teamSub}>Power {team.power} • Form {team.formPts} pts</Text>
          <View style={styles.formRow}>
            {team.form.map((v, i) => <WLBadge key={i} v={v} />)}
          </View>
        </View>
      </View>

      <Text style={styles.td}>{team.played}</Text>
      <Text style={styles.td}>{team.wins}</Text>
      <Text style={styles.td}>{team.draws}</Text>
      <Text style={styles.td}>{team.losses}</Text>
      <Text style={styles.td}>{team.gf}</Text>
      <Text style={styles.td}>{team.ga}</Text>
      <Text style={styles.tdStrong}>{team.gd}</Text>
      <Text style={styles.tdStrong}>{team.pts}</Text>
    </Pressable>
  );
}

/* ===== Small UI ===== */
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

/* ===== Styles ===== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.bg },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { color: PALETTE.text, fontSize: 20, fontWeight: '800', flex: 1, letterSpacing: 0.2 },

  btnPrimary: {
    backgroundColor: PALETTE.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  btnDarkText: { color: '#08131A', fontWeight: '800' },
  btnGhost: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  ghostText: { color: PALETTE.text, fontWeight: '700' },

  filters: { paddingHorizontal: 16, paddingTop: 10 },
  tagsRow: { flexDirection: 'row', gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: PALETTE.line,
  },
  tagText: { color: PALETTE.text, fontWeight: '700', fontSize: 12 },

  search: {
    marginTop: 10,
    backgroundColor: PALETTE.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { color: PALETTE.text, paddingVertical: 8 },

  tableWrap: {
    flex: 1,
    marginTop: 10,
    marginHorizontal: 12,
    backgroundColor: PALETTE.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.line,
    paddingHorizontal: 8,
    paddingTop: 8,
    marginBottom: 12,
  },
  thead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.line,
  },
  th: { flex: 1, paddingVertical: 6 },
  thText: { color: PALETTE.mut, fontSize: 12, fontWeight: '800' },

  tr: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  td: {
    flex: 1,
    color: PALETTE.text,
    fontSize: 12,
    textAlign: 'center',
  },
  tdStrong: {
    flex: 1,
    color: PALETTE.text,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '900',
  },
  pos: { color: PALETTE.mut, fontWeight: '800' },

  teamDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8, marginTop: 2 },
  teamName: { color: PALETTE.text, fontWeight: '800' },
  teamSub: { color: PALETTE.mut, fontSize: 11, marginTop: 2 },

  formRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 22,
    alignItems: 'center',
  },
  pillText: { color: '#08131A', fontWeight: '900', fontSize: 10 },

  sep: { height: 10 },
});
