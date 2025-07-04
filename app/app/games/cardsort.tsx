import React from 'react';
import { View, StyleSheet } from 'react-native';
import CardSortGame from '../../components/games/CardSortGame';

export default function CardSortScreen() {
  const handleGameEnd = (score: number) => {
    console.log('カード仕分けゲーム終了。スコア:', score);
    // TODO: スコアをデータベースに保存
  };

  return (
    <View style={styles.container}>
      <CardSortGame onGameEnd={handleGameEnd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 