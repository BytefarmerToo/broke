import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { BrockerView } from './src/screens/BrockerView';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <BrockerView />
      </AppProvider>
    </SafeAreaProvider>
  );
}
