import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import FlashMathGame from '../../components/games/FlashMathGame';

export default function FlashMathScreen() {
  const router = useRouter();

  const handleGameEnd = () => {
    // ゲーム終了時の処理
    router.push('/games');
  };

  return (
    <View style={styles.container}>
      <FlashMathGame onGameEnd={handleGameEnd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
});