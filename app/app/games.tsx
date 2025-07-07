import { Text, View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function Games() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>どのゲームであそぶ？</Text>
      
      <View style={styles.gameList}>
        <Pressable 
          style={styles.gameItem}
          onPress={() => router.push('/games/nback')}
        >
          <Text style={styles.gameText}>🧠 メモリークエスト（ワーキングメモリ）</Text>
        </Pressable>
        
        <Pressable style={[styles.gameItem, styles.disabledItem]}>
          <Text style={[styles.gameText, styles.disabledText]}>👾 モンスター進化パズル（流動性推理）</Text>
          <Text style={styles.comingSoon}>準備中</Text>
        </Pressable>
        
        <Pressable 
          style={styles.gameItem}
          onPress={() => router.push('/games/flashmath')}
        >
          <Text style={styles.gameText}>⚡ フラッシュ暗算＆記号探し（処理速度）</Text>
        </Pressable>
        
        <Pressable 
          style={styles.gameItem}
          onPress={() => router.push('/games/stroop')}
        >
          <Text style={styles.gameText}>🧩 にじいろコトバ（抑制制御）</Text>
        </Pressable>
        
        <Pressable style={[styles.gameItem, styles.disabledItem]}>
          <Text style={[styles.gameText, styles.disabledText]}>🐾 かげえあわせクイズ（空間認識）</Text>
          <Text style={styles.comingSoon}>準備中</Text>
        </Pressable>
      </View>
      
      <Text style={styles.note}>※ 緑のゲームはプレイできます</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
  },
  gameList: {
    alignItems: "flex-start",
  },
  gameItem: {
    fontSize: 18,
    marginVertical: 10,
    padding: 15,
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    minWidth: 300,
  },
  disabledItem: {
    backgroundColor: "#f0f0f0",
  },
  gameText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  disabledText: {
    color: "#666",
  },
  comingSoon: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  note: {
    marginTop: 30,
    fontSize: 12,
    color: "#666",
  },
}); 