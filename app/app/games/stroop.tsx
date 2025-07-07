
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import StroopGame from '@/components/games/StroopGame';

const StroopGameScreen = () => {
  const router = useRouter();

  const handleGameEnd = () => {
    // ゲーム終了時の処理
    router.push('/games');
  };

  return (
    <>
      <Stack.Screen options={{ title: '🌈 にじいろコトバ' }} />
      <View style={styles.container}>
        <StroopGame onGameEnd={handleGameEnd} />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
});

export default StroopGameScreen;
