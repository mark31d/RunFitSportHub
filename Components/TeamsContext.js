// Components/TeamsContext.js
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

/* ===== Палитра для случайных цветов (совпадает с проектом) ===== */
const PALETTE = {
  primary: '#7C5CFF',
  accent:  '#00E6A8',
  info:    '#4FC3FF',
  warn:    '#FFB020',
  danger:  '#FF4D6D',
};

/* ===== Доменные утилиты (экспортируем, чтобы переиспользовать в экранах) ===== */
const NAMES_A = ['Thunder', 'Storm', 'Velocity', 'Phoenix', 'Lightning', 'Cosmic', 'Falcon', 'Aurora', 'Raptors', 'Titans'];
const NAMES_B = ['Hawks', 'Eagles', 'Rebels', 'Rangers', 'Bolts', 'Knights', 'Wolves', 'Dragons', 'Comets', 'Rockets'];
const COLORS   = [PALETTE.primary, PALETTE.accent, PALETTE.info, PALETTE.warn, PALETTE.danger];

export const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pick  = (arr) => arr[rand(0, arr.length - 1)];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function makeRandomTeam() {
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
    isUserCreated: false, // Демо-команды
  };
}

export function predict(a, b) {
  // Проверяем валидность данных
  const powerA = Number(a?.power) || 50;
  const powerB = Number(b?.power) || 50;
  
  const diff = powerA - powerB;
  const base = 1 / (1 + Math.exp(-(diff / 8)));
  const noise = (Math.random() - 0.5) * 0.06;
  const home = 0.02;
  
  let pa = clamp(base + noise + home, 0.05, 0.93);       // A wins
  let pb = clamp(1 - pa - 0.08, 0.05, 0.85);             // B wins
  let pd = clamp(1 - pa - pb, 0.05, 0.30);               // Draw
  
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

  return {
    pa: Number(pa.toFixed(4)),
    pb: Number(pb.toFixed(4)),
    pd: Number(pd.toFixed(4)),
    pick: pickSide,                           // 'A' | 'B' | 'D'
    confidence: clamp(0.55 + conf * 0.8, 0.55, 0.95),
    expA: Math.max(0, Math.round((powerA - 60) / 18 + Math.random() * 2)),
    expB: Math.max(0, Math.round((powerB - 60) / 18 + Math.random() * 2)),
  };
}

/* ===== Стор ===== */
const TeamsCtx = createContext(null);

const initialState = {
  teams: Array.from({ length: 8 }, () => makeRandomTeam()),
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, teams: action.payload };
    case 'ADD':
      return { ...state, teams: [action.payload, ...state.teams] };
    case 'UPDATE':
      return {
        ...state,
        teams: state.teams.map(t => (t.id === action.id ? { ...t, ...action.patch } : t)),
      };
    case 'REMOVE':
      return { ...state, teams: state.teams.filter(t => t.id !== action.id) };
    case 'SEED':
      return { ...state, teams: Array.from({ length: action.n ?? 8 }, () => makeRandomTeam()) };
    default:
      return state;
  }
}

/* ===== Провайдер ===== */
export function TeamsProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  /* --- базовые экшены --- */
  const setTeams = useCallback((arr) => dispatch({ type: 'SET', payload: arr }), []);
  const addTeam  = useCallback((team) => dispatch({ type: 'ADD', payload: team }), []);
  const genTeam  = useCallback(() => dispatch({ type: 'ADD', payload: makeRandomTeam() }), []);
  const updateTeam = useCallback((id, patch) => dispatch({ type: 'UPDATE', id, patch }), []);
  const removeTeam = useCallback((id) => dispatch({ type: 'REMOVE', id }), []);
  const seed = useCallback((n) => dispatch({ type: 'SEED', n }), []);

  const getTeamById = useCallback((id) => state.teams.find((t) => t.id === id), [state.teams]);

  /* --- симуляция матча с апдейтом формы/счёта --- */
  const simulateMatch = useCallback((idA, idB) => {
    const A = state.teams.find(t => t.id === idA);
    const B = state.teams.find(t => t.id === idB);
    if (!A || !B) return null;

    const probs = predict(A, B);
    const r = Math.random();
    const out = r < probs.pa ? 'A' : r < probs.pa + probs.pd ? 'D' : 'B';

    const nextFormA = [...A.form.slice(1), out === 'A' ? 1 : out === 'D' ? 0 : -1];
    const nextFormB = [...B.form.slice(1), out === 'B' ? 1 : out === 'D' ? 0 : -1];

    const deltaA = out === 'A' ? rand(0, 2) : out === 'D' ? 0 : -rand(0, 2);
    const deltaB = out === 'B' ? rand(0, 2) : out === 'D' ? 0 : -rand(0, 2);

    dispatch({
      type: 'SET',
      payload: state.teams.map(t => {
        if (t.id === A.id) {
          return {
            ...t,
            form: nextFormA,
            power: clamp(t.power + deltaA, 50, 99),
            scored: t.scored + rand(0, 4),
            conceded: t.conceded + rand(0, 4),
          };
        }
        if (t.id === B.id) {
          return {
            ...t,
            form: nextFormB,
            power: clamp(t.power + deltaB, 50, 99),
            scored: t.scored + rand(0, 4),
            conceded: t.conceded + rand(0, 4),
          };
        }
        return t;
      }),
    });

    return { probs, outcome: out };
  }, [state.teams]);

  const value = useMemo(() => ({
    teams: state.teams,
    setTeams,
    addTeam,
    genTeam,
    updateTeam,
    removeTeam,
    seed,
    getTeamById,
    simulateMatch,

    // экспортируем утилиты, удобно импортировать из одного места
    makeRandomTeam,
    predict,
    rand,
    pick,
    clamp,
  }), [state.teams, setTeams, addTeam, genTeam, updateTeam, removeTeam, seed, getTeamById, simulateMatch]);

  return <TeamsCtx.Provider value={value}>{children}</TeamsCtx.Provider>;
}

/* ===== Хук ===== */
export const useTeams = () => {
  const ctx = useContext(TeamsCtx);
  if (!ctx) throw new Error('useTeams must be used within TeamsProvider');
  return ctx;
};
