
import React from 'react';
import { Stack } from 'expo-router';
import StroopGame from '@/components/games/StroopGame';
import { ThemedView } from '@/components/ThemedView';

const StroopGameScreen = () => {
  return (
    <>
      <Stack.Screen options={{ title: 'ストループ チャレンジ' }} />
      <ThemedView style={{ flex: 1 }}>
        <StroopGame />
      </ThemedView>
    </>
  );
};

export default StroopGameScreen;
