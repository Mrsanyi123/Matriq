import { palette } from '@matriq/ui';
import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '../../components/TabBar';

/** Bottom tabs: Home, Learn, Practice, Library, Profile (see MOBILE_TABS). */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: palette.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="practice" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
