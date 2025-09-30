// App.js
import 'react-native-gesture-handler'; // ← ОБЯЗАТЕЛЬНО ПЕРВОЙ СТРОКОЙ
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

/* ─── splash ─── */
import Loader from './Components/Loader';
import Onboarding from './Components/Onboarding';

/* ─── Home (Teams) flow ─── */
import Dashboard       from './Components/Dashboard';        // обзор + быстрые карты/графики
import CreateTeamForm  from './Components/CreateTeamForm';   // создание своей команды
import TeamDetails     from './Components/TeamDetails';      // карточка и статистика команды

/* ─── Predictions flow ─── */
import PredictionsList  from './Components/PredictionsList';  // лента предикций/скоринг
import PredictionScreen from './Components/PredictionScreen'; // подробный анализ матча/прогноза

/* ─── одиночные вкладки ─── */
import StandingsScreen from './Components/StandingsScreen';   // таблица, форма, результаты
import ProfileScreen   from './Components/ProfileScreen';     // профиль пользователя/настройки

/* ─── кастомный TabBar + контекст данных ─── */
import CustomTabBar   from './Components/CustomTabBar';
import { TeamsProvider } from './Components/TeamsContext';

const RootStack = createNativeStackNavigator();
const Tab       = createBottomTabNavigator();

const HomeStack = createNativeStackNavigator();
function HomeFlow() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Dashboard"      component={Dashboard} />
      <HomeStack.Screen name="CreateTeamForm" component={CreateTeamForm} />
      <HomeStack.Screen name="TeamDetails"    component={TeamDetails} />
    </HomeStack.Navigator>
  );
}

const PredStack = createNativeStackNavigator();
function PredictionsFlow() {
  return (
    <PredStack.Navigator screenOptions={{ headerShown: false }}>
      <PredStack.Screen name="PredictionsList"  component={PredictionsList} />
      <PredStack.Screen name="PredictionScreen" component={PredictionScreen} />
    </PredStack.Navigator>
  );
}

/* ——— Bottom-tabs ——— */
function BottomTabs() {
  return (
    <TeamsProvider>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tab.Screen name="Home"        component={HomeFlow} />
        <Tab.Screen name="Standings"   component={StandingsScreen} />
        <Tab.Screen name="Predictions" component={PredictionsFlow} />
        <Tab.Screen name="Profile"     component={ProfileScreen} />
      </Tab.Navigator>
    </TeamsProvider>
  );
}

export default function App() {
  const [bootDone, setBootDone] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Всегда показываем Onboarding после Loader
    const t = setTimeout(() => {
      setIsLoading(false);
      setBootDone(true);
    }, 10000); // 10 секунд
    
    return () => clearTimeout(t);
  }, []);

  const handleOnboardingComplete = () => {
    // Просто скрываем Onboarding, не сохраняем флаг
    setShowOnboarding(false);
  };

  if (!bootDone || isLoading) {
    return <Loader />;
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {showOnboarding ? (
            <RootStack.Screen name="Onboarding">
              {(props) => <Onboarding {...props} onComplete={handleOnboardingComplete} />}
            </RootStack.Screen>
          ) : (
            <RootStack.Screen name="Main" component={BottomTabs} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
