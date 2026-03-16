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
} from 'react-native';
import {
  AppLinkProvider,
  useSharedState,
  useSharedMethod,
  useDiscovery,
} from '@xiaoxianthis/react-native-applink';

function CounterSection() {
  const [counter, setCounter, ready] = useSharedState('demo.counter', 0);

  if (!ready) {
    return <Text style={styles.loading}>Loading counter...</Text>;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Shared Counter (Owner)</Text>
      <Text style={styles.bigNumber}>{counter}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => setCounter((prev: number) => prev - 1)}>
          <Text style={styles.btnText}>-1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => setCounter((prev: number) => prev + 1)}>
          <Text style={styles.btnText}>+1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnDanger]}
          onPress={() => setCounter(0)}>
          <Text style={styles.btnText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function UserInfoSection() {
  const defaultUser = {name: 'Alice', age: 28, role: 'Developer'};
  const [userInfo, setUserInfo, ready] = useSharedState(
    'demo.userInfo',
    defaultUser,
  );
  const [editName, setEditName] = useState('');

  if (!ready) {
    return <Text style={styles.loading}>Loading user info...</Text>;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Shared User Info (Owner)</Text>
      <Text style={styles.infoText}>Name: {userInfo?.name}</Text>
      <Text style={styles.infoText}>Age: {userInfo?.age}</Text>
      <Text style={styles.infoText}>Role: {userInfo?.role}</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="New name"
          value={editName}
          onChangeText={setEditName}
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            if (editName.trim()) {
              setUserInfo({...userInfo, name: editName.trim()});
              setEditName('');
            }
          }}>
          <Text style={styles.btnText}>Update</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MethodsSection() {
  const [lastGreetCall, setLastGreetCall] = useState<string | null>(null);
  const [lastCalcCall, setLastCalcCall] = useState<string | null>(null);

  useSharedMethod('demo.greet', async (params: {name: string}) => {
    const greeting = `Hello, ${params.name}! Welcome from AppA!`;
    setLastGreetCall(`Greeted: ${params.name}`);
    return {greeting, timestamp: Date.now()};
  });

  useSharedMethod(
    'demo.calculate',
    async (params: {a: number; b: number; op: string}) => {
      setLastCalcCall(`${params.a} ${params.op} ${params.b}`);
      let result: number;
      switch (params.op) {
        case '+':
          result = params.a + params.b;
          break;
        case '-':
          result = params.a - params.b;
          break;
        case '*':
          result = params.a * params.b;
          break;
        case '/':
          result = params.b !== 0 ? params.a / params.b : NaN;
          break;
        default:
          throw new Error(`Unknown operator: ${params.op}`);
      }
      return {result, expression: `${params.a} ${params.op} ${params.b} = ${result}`};
    },
  );

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Shared Methods (Provider)</Text>
      <Text style={styles.methodName}>demo.greet</Text>
      <Text style={styles.methodDesc}>Accepts {'{name}'} and returns a greeting</Text>
      {lastGreetCall && (
        <Text style={styles.methodLog}>Last call: {lastGreetCall}</Text>
      )}

      <View style={styles.divider} />

      <Text style={styles.methodName}>demo.calculate</Text>
      <Text style={styles.methodDesc}>
        Accepts {'{a, b, op}'} and returns calculation result
      </Text>
      {lastCalcCall && (
        <Text style={styles.methodLog}>Last call: {lastCalcCall}</Text>
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
          No other ecosystem apps found. Install AppB and run it once.
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
        <Text style={styles.title}>AppA</Text>
        <Text style={styles.subtitle}>State Owner & Method Provider</Text>
      </View>
      <CounterSection />
      <UserInfoSection />
      <MethodsSection />
      <DiscoverySection />
    </ScrollView>
  );
}

export default function App() {
  return (
    <AppLinkProvider appId="appA">
      <StatusBar barStyle="light-content" backgroundColor="#1a73e8" />
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
    backgroundColor: '#1a73e8',
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
    color: '#bbdefb',
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
    color: '#1a73e8',
    textAlign: 'center',
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  btn: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDanger: {
    backgroundColor: '#e53935',
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
  methodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a73e8',
    fontFamily: 'monospace',
  },
  methodDesc: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
    marginBottom: 4,
  },
  methodLog: {
    fontSize: 13,
    color: '#4caf50',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
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
