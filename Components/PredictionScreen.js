// Components/PredictionScreen.js
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
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

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
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

/* — демо генераторы на случай отсутствия params — */
const NAMES_A = ['Thunder', 'Storm', 'Velocity', 'Phoenix', 'Lightning', 'Cosmic', 'Falcon', 'Aurora', 'Raptors', 'Titans'];
const NAMES_B = ['Hawks', 'Eagles', 'Rebels', 'Rangers', 'Bolts', 'Knights', 'Wolves', 'Dragons', 'Comets', 'Rockets'];
const COLORS   = [PALETTE.primary, PALETTE.accent, PALETTE.info, PALETTE.warn, PALETTE.danger];
const pick = (arr) => arr[rand(0, arr.length - 1)];

function makeTeam() {
  const rating = rand(60, 95);
  return {
    id: Math.random().toString(36).slice(2),
    name: `${pick(NAMES_A)} ${pick(NAMES_B)}`,
    power: rating,
    color: pick(COLORS),
    form: Array.from({ length: 5 }, () => rand(0, 3) - 1),
    scored: rand(12, 42),
    conceded: rand(8, 35),
  };
}

function predict(a, b) {
  // Проверяем валидность данных
  const powerA = Number(a?.power) || 50;
  const powerB = Number(b?.power) || 50;
  
  // Используем реальные данные команд для более точного расчета
  const formA = a?.form ? a.form.reduce((sum, v) => sum + (v === 1 ? 3 : v === 0 ? 1 : 0), 0) : 0;
  const formB = b?.form ? b.form.reduce((sum, v) => sum + (v === 1 ? 3 : v === 0 ? 1 : 0), 0) : 0;
  const scoredA = Number(a?.scored) || 0;
  const scoredB = Number(b?.scored) || 0;
  const concededA = Number(a?.conceded) || 0;
  const concededB = Number(b?.conceded) || 0;
  
  // Более сложный расчет с учетом формы и статистики
  const powerDiff = powerA - powerB;
  const formDiff = (formA - formB) / 15; // нормализуем форму
  const attackDiff = (scoredA - scoredB) / 30; // нормализуем атаку
  const defenseDiff = (concededB - concededA) / 30; // нормализуем защиту
  
  const totalDiff = powerDiff + formDiff * 10 + attackDiff * 5 + defenseDiff * 5;
  const base = 1 / (1 + Math.exp(-(totalDiff / 8)));
  const noise = (Math.random() - 0.5) * 0.04; // уменьшили шум
  const home = 0.02;
  
  let pa = clamp(base + noise + home, 0.05, 0.93);       // win A
  let pb = clamp(1 - pa - 0.08, 0.05, 0.85);             // win B
  let pd = clamp(1 - pa - pb, 0.05, 0.30);               // draw
  
  // Нормализация для избежания NaN
  const s = pa + pb + pd;
  if (s > 0) {
    pa /= s; 
    pb /= s; 
    pd /= s;
  } else {
    pa = 0.33; pb = 0.33; pd = 0.34; // fallback
  }

  const conf = Math.max(Math.abs(pa - pb), Math.abs(pa - pd), Math.abs(pb - pd));
  const pickSide = pa > pb && pa > pd ? 'A' : pb > pa && pb > pd ? 'B' : 'D';

  // Более реалистичные ожидаемые голы на основе силы и формы
  const expA = Math.max(0, Math.round((powerA / 100) * 2 + (formA / 15) * 0.5 + Math.random() * 0.5));
  const expB = Math.max(0, Math.round((powerB / 100) * 2 + (formB / 15) * 0.5 + Math.random() * 0.5));

  // Финальная проверка на валидность
  const finalPa = Number(pa.toFixed(4)) || 0.33;
  const finalPb = Number(pb.toFixed(4)) || 0.33;
  const finalPd = Number(pd.toFixed(4)) || 0.34;
  const finalConf = Number(clamp(0.55 + conf * 0.8, 0.55, 0.95).toFixed(2)) || 0.7;
  const finalExpA = Number(expA) || 0;
  const finalExpB = Number(expB) || 0;

  return {
    pa: finalPa,
    pb: finalPb,
    pd: finalPd,
    pick: pickSide,
    confidence: finalConf,
    expA: finalExpA,
    expB: finalExpB,
  };
}

export default function PredictionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { teams } = useTeams();
  
  // входные данные - используем переданные команды или берем из контекста
  const a0 = route?.params?.a || (teams.length > 0 ? teams[0] : makeTeam());
  const b0 = route?.params?.b || (teams.length > 1 ? teams[1] : makeTeam());
  const p0 = route?.params?.probs || predict(a0, b0);

  const [A, setA] = useState(a0);
  const [B, setB] = useState(b0);
  const [P, setP] = useState(p0);

  const pickLabel = useMemo(() => {
    if (P.pick === 'A') return A.name.split(' ')[0];
    if (P.pick === 'B') return B.name.split(' ')[0];
    return 'Draw';
  }, [P.pick, A, B]);

  const pickColor = P.pick === 'A' ? PALETTE.accent : P.pick === 'B' ? PALETTE.info : PALETTE.warn;

  const impliedOdds = useMemo(() => {
    // Проверяем валидность данных P
    const pa = Number(P.pa) || 0.33;
    const pb = Number(P.pb) || 0.33;
    const pd = Number(P.pd) || 0.34;
    
    const safePa = Math.max(pa, 0.01); // минимум 1% чтобы избежать деления на 0
    const safePb = Math.max(pb, 0.01);
    const safePd = Math.max(pd, 0.01);
    
    return {
      A: (1 / safePa).toFixed(2),
      D: (1 / safePd).toFixed(2),
      B: (1 / safePb).toFixed(2),
    };
  }, [P]);

  const rerun = () => {
    // Пересчитываем с текущими данными команд
    const newProbs = predict(A, B);
    setP(newProbs);
  };
  
  const swap = () => {
    const tempA = A;
    const tempB = B;
    setA(tempB);
    setB(tempA);
    // Пересчитываем с поменянными командами
    setP(predict(tempB, tempA));
  };
  const simulateOnce = () => {
    const r = Math.random();
    const outcome = r < P.pa ? 'A' : r < P.pa + P.pd ? 'D' : 'B';
    Alert.alert('Simulated result',
      outcome === 'A' ? `${A.name} win` : outcome === 'B' ? `${B.name} win` : 'Draw'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ 
          padding: 16, 
          paddingBottom: Math.max(insets.bottom + 80, 80) 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Prediction</Text>
        <Pressable style={styles.btnGhost} onPress={() => {
          if (navigation?.goBack) {
            navigation.goBack();
          }
        }}>
          <Text style={styles.ghostText}>Back</Text>
        </Pressable>
        </View>

      {/* Match card */}
      <View style={styles.card}>
        <View style={styles.matchRow}>
          <TeamSide team={A} align="right" onPress={() => navigation.navigate('Home', { screen: 'TeamDetails', params: { team: A } })} />
          <Text style={styles.vs}>vs</Text>
          <TeamSide team={B} onPress={() => navigation.navigate('Home', { screen: 'TeamDetails', params: { team: B } })} />
        </View>

        <View style={{ height: 8 }} />
        <View style={styles.scoreRow}>
          <ScoreBubble label="Exp. Score" a={P.expA} b={P.expB} />
          <ConfGauge value={P.confidence} />
        </View>
      </View>

      {/* Probabilities */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Outcome Probabilities</Text>
        <View style={{ height: 6 }} />
        <ProbBar label={A.name.split(' ')[0]} value={P.pa} color={PALETTE.accent} />
        <ProbBar label="Draw" value={P.pd} color={PALETTE.warn} />
        <ProbBar label={B.name.split(' ')[0]} value={P.pb} color={PALETTE.info} />
      </View>

      {/* Implied odds & pick */}
      <View style={styles.cardRow}>
        <View style={[styles.card, styles.cardHalf]}>
          <Text style={styles.cardTitle}>Implied Odds</Text>
          <KV k={`${A.name.split(' ')[0]} win`} v={impliedOdds.A} />
          <KV k="Draw" v={impliedOdds.D} />
          <KV k={`${B.name.split(' ')[0]} win`} v={impliedOdds.B} />
        </View>
        <View style={[styles.card, styles.cardHalf]}>
          <Text style={styles.cardTitle}>Model Pick</Text>
          <View style={[styles.pickPill, { borderColor: pickColor }]}>
            <View style={styles.pickText}>
              <View style={[styles.pickDot, { backgroundColor: pickColor, marginRight: 6 }]} />
              <Text style={styles.pickText} numberOfLines={1}>
                {pickLabel} <Text style={styles.pickSub}>({Math.round((Number(P.confidence) || 0.7) * 100)}%)</Text>
              </Text>
            </View>
          </View>
          <Text style={styles.expl} numberOfLines={2}>
            Rating diff: {A.power} vs {B.power} + form
          </Text>
        </View>
      </View>

      {/* Factors */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Key Factors</Text>
        <Factor label="Team Power" a={A.power / 100} b={B.power / 100} ca={PALETTE.accent} cb={PALETTE.info} />
        <Factor label="Recent Form (pts)" a={formPoints(A) / 15} b={formPoints(B) / 15} ca={PALETTE.accent} cb={PALETTE.info} />
        <Factor label="Home Edge" a={0.6} b={0.4} ca={PALETTE.accent} cb={PALETTE.info} />
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Pressable style={styles.btnPrimary} onPress={rerun}>
          <Text style={styles.btnDarkText}>Re-run model</Text>
        </Pressable>
        <Pressable style={styles.btnOutline} onPress={swap}>
          <Text style={styles.btnText}>Swap sides</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={simulateOnce}>
          <Text style={styles.ghostText}>Simulate once</Text>
        </Pressable>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===== Helpers UI ===== */
function formPoints(t) {
  if (!t?.form || !Array.isArray(t.form)) return 0;
  return t.form.reduce((s, v) => s + (v === 1 ? 3 : v === 0 ? 1 : 0), 0);
}

function TeamSide({ team, align = 'left', onPress }) {
  if (!team) return null;
  
  return (
    <Pressable onPress={onPress} style={[styles.teamBox, align === 'right' && { alignItems: 'flex-end' }]}>
      <View style={[styles.teamDot, { backgroundColor: team.color || PALETTE.mut }]} />
      <Text style={styles.teamName} numberOfLines={1}>{team.name || 'Unknown Team'}</Text>
      <Text style={styles.teamSub}>Power {team.power || 0} • Form {formPoints(team)} pts</Text>
    </Pressable>
  );
}

function ScoreBubble({ label, a, b }) {
  return (
    <View style={styles.scoreWrap}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.scorePill}>
        <Text style={[styles.score, { color: PALETTE.accent }]}>{a || 0}</Text>
        <Text style={styles.scoreX}> : </Text>
        <Text style={[styles.score, { color: PALETTE.info }]}>{b || 0}</Text>
      </View>
    </View>
  );
}

function ConfGauge({ value = 0.7 }) {
  const safeValue = Number(value) || 0.7;
  const percentage = Math.round(safeValue * 100);
  
  return (
    <View style={styles.gauge}>
      <Text style={styles.gaugeLabel}>Confidence</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: PALETTE.primary }]} />
      </View>
      <Text style={styles.gaugeVal}>{percentage}%</Text>
    </View>
  );
}

function ProbBar({ label, value, color }) {
  const safeValue = Number(value) || 0;
  const percentage = Math.round(safeValue * 100);
  
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.probLabel}>{label}</Text>
        <Text style={styles.probVal}>{percentage}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function KV({ k, v }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  );
}

function Factor({ label, a, b, ca, cb }) {
  const A = clamp(a, 0, 1);
  const B = clamp(b, 0, 1);
  return (
    <View style={{ marginTop: 10 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.factorLabel}>{label}</Text>
        <Text style={styles.factorVal}>{Math.round(A * 100)}% / {Math.round(B * 100)}%</Text>
      </View>
      <View style={styles.dualTrack}>
        <View style={[styles.dualFill, { flex: A, backgroundColor: ca }]} />
        <View style={[styles.dualFill, { flex: B, backgroundColor: cb }]} />
      </View>
    </View>
  );
}

/* ===== Styles ===== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.bg },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { color: PALETTE.text, fontSize: 20, fontWeight: '800', flex: 1, letterSpacing: 0.2 },

  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: PALETTE.line,
    marginTop: 12,
  },
  cardRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginTop: 12,
    paddingHorizontal: 4,
  },
  cardHalf: {
    flex: 1,
    minWidth: 0,
  },

  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vs: { color: PALETTE.mut, fontSize: 12 },

  teamBox: { 
    maxWidth: 140, 
    minWidth: 100,
    flex: 1,
  },
  teamDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  teamName: { color: PALETTE.text, fontWeight: '800' },
  teamSub: { color: PALETTE.mut, fontSize: 12 },

  scoreRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  scoreWrap: { flex: 1, backgroundColor: PALETTE.card2, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: PALETTE.line },
  scoreLabel: { color: PALETTE.mut, fontSize: 12, marginBottom: 6 },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  score: { fontSize: 26, fontWeight: '900' },
  scoreX: { color: PALETTE.mut, fontSize: 18, fontWeight: '800' },

  gauge: { flex: 1, backgroundColor: PALETTE.card2, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: PALETTE.line, alignItems: 'flex-start' },
  gaugeLabel: { color: PALETTE.mut, fontSize: 12, marginBottom: 6 },
  gaugeVal: { color: PALETTE.text, fontWeight: '800', marginTop: 6 },

  cardTitle: { color: PALETTE.text, fontSize: 15, fontWeight: '800' },

  probLabel: { color: PALETTE.mut, fontSize: 12 },
  probVal: { color: PALETTE.text, fontWeight: '800' },

  progressTrack: { height: 8, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },

  kvRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  kvKey: { color: PALETTE.mut, fontSize: 12 },
  kvVal: { color: PALETTE.text, fontWeight: '800' },

  pickPill: { 
    flexDirection: 'column', 
    alignItems: 'flex-start', 
    gap: 4, 
    borderRadius: 12, 
    paddingHorizontal: 8, 
    paddingVertical: 8, 
    borderWidth: 1,
    width: '100%',
  },
  pickDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  pickText: { 
    color: PALETTE.text, 
    fontWeight: '800', 
    fontSize: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  pickSub: { 
    color: PALETTE.mut, 
    fontWeight: '700',
    fontSize: 11,
  },
  expl: { 
    color: PALETTE.mut, 
    fontSize: 10, 
    marginTop: 4,
    lineHeight: 14,
    width: '100%',
  },

  factorLabel: { color: PALETTE.mut, fontSize: 12 },
  factorVal: { color: PALETTE.text, fontWeight: '800' },
  dualTrack: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 6,
    width: '100%',
    overflow: 'hidden',
  },
  dualFill: {
    height: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: 0,
  },

  actionsRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 8, 
    marginTop: 12, 
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },

  btnPrimary: {
    backgroundColor: PALETTE.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
    minWidth: 80,
    maxWidth: '32%',
    alignItems: 'center',
  },
  btnOutline: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: PALETTE.line,
    backgroundColor: 'rgba(255,255,255,0.04)',
    flex: 1,
    minWidth: 80,
    maxWidth: '32%',
    alignItems: 'center',
  },
  btnGhost: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: PALETTE.line,
    flex: 1,
    minWidth: 80,
    maxWidth: '32%',
    alignItems: 'center',
  },
  btnText: { 
    color: PALETTE.text, 
    fontWeight: '800', 
    fontSize: 12,
    textAlign: 'center',
  },
  btnDarkText: { 
    color: '#08131A', 
    fontWeight: '800', 
    fontSize: 12,
    textAlign: 'center',
  },
  ghostText: { 
    color: PALETTE.text, 
    fontWeight: '800', 
    fontSize: 12,
    textAlign: 'center',
  },
});
