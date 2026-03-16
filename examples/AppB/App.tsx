import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  FlatList,
  Alert,
} from 'react-native';
import {
  AppLinkProvider,
  useSharedState,
  useRemoteMethod,
  useDiscovery,
} from '@xiaoxianthis/react-native-applink';

function CounterSection() {
  const [counter, setCounter, ready] = useSharedState<number>('demo.counter');

  if (!ready) {
    return <Text style={styles.loading}>Connecting to remote counter...</Text>;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Shared Counter (Subscriber)</Text>
      <Text style={styles.bigNumber}>{counter ?? '—'}</Text>
      <Text style={styles.hint}>
        This value is owned by AppA and synced in real-time
      </Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => setCounter((prev: number | undefined) => (prev ?? 0) - 1)}>
          <Text style={styles.btnText}>Remote -1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => setCounter((prev: number | undefined) => (prev ?? 0) + 1)}>
          <Text style={styles.btnText}>Remote +1</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function UserInfoSection() {
  const [userInfo, , ready] = useSharedState<{
    name: string;
    age: number;
    role: string;
  }>('demo.userInfo');

  if (!ready) {
    return <Text style={styles.loading}>Connecting to remote user info...</Text>;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Shared User Info (Subscriber)</Text>
      {userInfo ? (
        <>
          <Text style={styles.infoText}>Name: {userInfo.name}</Text>
          <Text style={styles.infoText}>Age: {userInfo.age}</Text>
          <Text style={styles.infoText}>Role: {userInfo.role}</Text>
        </>
      ) : (
        <Text style={styles.emptyText}>
          No user info available. Make sure AppA is running.
        </Text>
      )}
      <Text style={styles.hint}>
        Changes made in AppA appear here automatically
      </Text>
    </View>
  );
}

function GreetSection() {
  const greet = useRemoteMethod<{name: string}, {greeting: string; timestamp: number}>(
    'demo.greet',
  );
  const [name, setName] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGreet = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await greet({name: name.trim()});
      setResult(res.greeting);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Remote Method: demo.greet</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Enter a name"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleGreet}
          disabled={loading}>
          <Text style={styles.btnText}>{loading ? '...' : 'Call'}</Text>
        </TouchableOpacity>
      </View>
      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}
    </View>
  );
}

function CalculatorSection() {
  const calculate = useRemoteMethod<
    {a: number; b: number; op: string},
    {result: number; expression: string}
  >('demo.calculate');
  const [numA, setNumA] = useState('');
  const [numB, setNumB] = useState('');
  const [op, setOp] = useState('+');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalc = async () => {
    const a = parseFloat(numA);
    const b = parseFloat(numB);
    if (isNaN(a) || isNaN(b)) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }
    setLoading(true);
    try {
      const res = await calculate({a, b, op});
      setResult(res.expression);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const ops = ['+', '-', '*', '/'];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Remote Method: demo.calculate</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.numInput]}
          placeholder="A"
          value={numA}
          onChangeText={setNumA}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
        <View style={styles.opRow}>
          {ops.map(o => (
            <TouchableOpacity
              key={o}
              style={[styles.opBtn, op === o && styles.opBtnActive]}
              onPress={() => setOp(o)}>
              <Text
                style={[
                  styles.opBtnText,
                  op === o && styles.opBtnTextActive,
                ]}>
                {o}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, styles.numInput]}
          placeholder="B"
          value={numB}
          onChangeText={setNumB}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
      </View>
      <TouchableOpacity
        style={[styles.btn, styles.fullBtn, loading && styles.btnDisabled]}
        onPress={handleCalc}
        disabled={loading}>
        <Text style={styles.btnText}>
          {loading ? 'Calculating...' : 'Calculate (Remote)'}
        </Text>
      </TouchableOpacity>
      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}
    </View>
  );
}

function DiscoverySection() {
  const {apps, initialized, refresh} = useDiscovery();

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Ecosystem Discovery</Text>
      {!initialized ? (
        <Text style={styles.loading}>Discovering...</Text>
      ) : apps.length === 0 ? (
        <Text style={styles.emptyText}>
          No other ecosystem apps found. Install AppA and run it once.
        </Text>
      ) : (
        <FlatList
          data={apps}
          scrollEnabled={false}
          keyExtractor={item => item.packageName}
          renderItem={({item}) => (
            <View style={styles.appItem}>
              <Text style={styles.appName}>{item.appName}</Text>
              <Text style={styles.appPkg}>{item.packageName}</Text>
              {item.states.length > 0 && (
                <Text style={styles.appCaps}>
                  States: {item.states.join(', ')}
                </Text>
              )}
              {item.methods.length > 0 && (
                <Text style={styles.appCaps}>
                  Methods: {item.methods.join(', ')}
                </Text>
              )}
            </View>
          )}
        />
      )}
      <TouchableOpacity style={styles.btn} onPress={refresh}>
        <Text style={styles.btnText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

function MainScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>AppB</Text>
        <Text style={styles.subtitle}>State Subscriber & Method Caller</Text>
      </View>
      <CounterSection />
      <UserInfoSection />
      <GreetSection />
      <CalculatorSection />
      <DiscoverySection />
    </ScrollView>
  );
}

export default function App() {
  return (
    <AppLinkProvider appId="appB">
      <StatusBar barStyle="light-content" backgroundColor="#e65100" />
      <MainScreen />
    </AppLinkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#e65100',
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#ffcc80',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  bigNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#e65100',
    textAlign: 'center',
    marginVertical: 8,
  },
  hint: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  btn: {
    backgroundColor: '#e65100',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  fullBtn: {
    marginTop: 12,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
  numInput: {
    flex: 0,
    width: 60,
    textAlign: 'center',
  },
  opRow: {
    flexDirection: 'row',
    gap: 4,
  },
  opBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opBtnActive: {
    backgroundColor: '#e65100',
    borderColor: '#e65100',
  },
  opBtnText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  opBtnTextActive: {
    color: '#fff',
  },
  resultBox: {
    marginTop: 12,
    backgroundColor: '#f1f8e9',
    padding: 12,
    borderRadius: 8,
  },
  resultText: {
    fontSize: 15,
    color: '#33691e',
    fontWeight: '500',
  },
  infoText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 4,
  },
  loading: {
    color: '#999',
    fontStyle: 'italic',
    padding: 8,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    marginBottom: 12,
  },
  appItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  appName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  appPkg: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  appCaps: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
