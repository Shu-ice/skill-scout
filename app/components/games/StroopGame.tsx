
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// 色の定義
const COLORS = [
  { name: 'あか', code: '#FF5252' },
  { name: 'あお', code: '#448AFF' },
  { name: 'みどり', code: '#69F0AE' },
  { name: 'きいろ', code: '#FFD740' },
];

const GAME_DURATION = 30; // ゲーム時間（秒）

type GameState = 'idle' | 'running' | 'finished';

const StroopGame = () => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [currentWord, setCurrentWord] = useState(COLORS[0]);
  const [currentColor, setCurrentColor] = useState(COLORS[1]);

  // ゲームタイマーの処理
  useEffect(() => {
    if (gameState !== 'running') return;

    if (timeLeft === 0) {
      setGameState('finished');
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [gameState, timeLeft]);

  // 新しい問題の生成
  const generateNewTrial = useCallback(() => {
    let newWordIndex = Math.floor(Math.random() * COLORS.length);
    let newColorIndex = Math.floor(Math.random() * COLORS.length);

    // ストループ課題の条件（文字と色が一致しない）を生成
    // たまに一致する課題も混ぜる
    if (Math.random() > 0.2) {
      while (newColorIndex === newWordIndex) {
        newColorIndex = Math.floor(Math.random() * COLORS.length);
      }
    }

    setCurrentWord(COLORS[newWordIndex]);
    setCurrentColor(COLORS[newColorIndex]);
  }, []);

  // ゲーム開始処理
  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setGameState('running');
    generateNewTrial();
  };

  // 回答処理
  const handleAnswer = (selectedColorName: string) => {
    if (gameState !== 'running') return;

    if (selectedColorName === currentColor.name) {
      setScore((prevScore) => prevScore + 1);
    }
    generateNewTrial();
  };

  // ゲーム画面のレンダリング
  const renderGame = () => {
    return (
      <View style={styles.gameContainer}>
        <View style={styles.statsContainer}>
          <ThemedText style={styles.statsText}>スコア: {score}</ThemedText>
          <ThemedText style={styles.statsText}>のこりじかん: {timeLeft}</ThemedText>
        </View>
        <View style={styles.stimulusContainer}>
          <Text style={[styles.wordText, { color: currentColor.code }]}>
            {currentWord.name}
          </Text>
        </View>
        <View style={styles.optionsContainer}>
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color.name}
              style={[styles.optionButton, { backgroundColor: color.code }]}
              onPress={() => handleAnswer(color.name)}
            >
              <Text style={styles.optionText}>{color.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // 開始・終了画面のレンダリング
  const renderIdleOrFinished = () => {
    const isFinished = gameState === 'finished';
    return (
      <View style={styles.centeredView}>
        <ThemedText type="title" style={styles.title}>
          {isFinished ? `おしまい！` : 'ストループ チャレンジ'}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {isFinished
            ? `あなたのスコアは ${score} でした！`
            : 'もじの いみ ではなく、もじの いろ をおしてね！'}
        </ThemedText>
        <TouchableOpacity style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>
            {isFinished ? 'もういっかい' : 'スタート'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {gameState === 'running' ? renderGame() : renderIdleOrFinished()}
      </SafeAreaView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#448AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  startButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  statsText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  stimulusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordText: {
    fontSize: 64,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  optionButton: {
    width: '45%',
    aspectRatio: 2,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  optionText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default StroopGame;
