import { Text, View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧠 メモリークエスト</Text>
      
      <Text style={styles.subtitle}>たのしいゲームで、きみの能力を発見しよう！</Text>
      
      <View style={styles.buttonContainer}>
        <Pressable 
          style={styles.button}
          onPress={() => router.push('/games')}
        >
          <Text style={styles.buttonText}>🎮 ゲームであそぶ</Text>
        </Pressable>
        
        <Pressable 
          style={styles.button}
          onPress={() => router.push('/dashboard')}
        >
          <Text style={styles.buttonText}>📊 せいせきをみる</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: "center",
    color: "#666",
  },
  buttonContainer: {
    gap: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 20,
    borderRadius: 15,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
}); 