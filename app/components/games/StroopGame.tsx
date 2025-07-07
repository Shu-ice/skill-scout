import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions, Platform, StatusBar, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// 色の定義（年長～低学年向けに見やすい色彩）
const COLORS = [
  { name: 'あか', code: '#D32F2F', gradient: ['#D32F2F', '#F44336'], displayName: 'あか' },
  { name: 'あお', code: '#2196F3', gradient: ['#2196F3', '#42A5F5'], displayName: 'あお' },
  { name: 'みどり', code: '#4CAF50', gradient: ['#4CAF50', '#66BB6A'], displayName: 'みどり' },
  { name: 'きいろ', code: '#FFD600', gradient: ['#FFD600', '#FFEB3B'], displayName: 'きいろ' },
  { name: 'ピンク', code: '#FF69B4', gradient: ['#FF69B4', '#FFB6C1'], displayName: 'ピンク' },
  { name: 'くろ', code: '#424242', gradient: ['#424242', '#616161'], displayName: 'くろ' },
];

// レベル設定
const LEVEL_CONFIG = {
  1: { 
    colors: 3, 
    problems: 10, 
    title: 'やさしい', 
    description: '3つのいろから えらぼう！',
    emoji: '🌟'
  },
  2: { 
    colors: 4, 
    problems: 15, 
    title: 'ふつう', 
    description: '4つのいろで がんばろう！',
    emoji: '🚀'
  },
  3: { 
    colors: 5, 
    problems: 20, 
    title: 'むずかしい', 
    description: '5つのいろで すごいね！',
    emoji: '🏆'
  },
  4: { 
    colors: 6, 
    problems: 25, 
    title: 'エキスパート', 
    description: '6つのいろで だいすき！',
    emoji: '🎯'
  },
};

interface GameRecord {
  date: string;
  level: number;
  score: number;
  total: number;
  accuracy: number;
  duration: number; // 所要時間（秒）
  gameId: string;
  gameType: 'stroop';
}

interface StroopGameProps {
  onGameEnd: () => void;
}

type GameState = 'welcome' | 'levelSelect' | 'countdown' | 'playing' | 'result';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function StroopGame({ onGameEnd }: StroopGameProps) {
  const [gameState, setGameState] = useState<GameState>('welcome');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [totalProblems, setTotalProblems] = useState(0);
  const [currentProblem, setCurrentProblem] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'game' | 'records'>('game');
  const [currentWord, setCurrentWord] = useState(COLORS[0]);
  const [currentColor, setCurrentColor] = useState(COLORS[1]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // アニメーション
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const countdownAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const rainbowAnim = useRef(new Animated.Value(0)).current;
  
  // タイマー参照
  const gameTimer = useRef<NodeJS.Timeout | null>(null);

  // データロード
  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const recordsStr = await AsyncStorage.getItem('stroopRecords');
      if (recordsStr) {
        setRecords(JSON.parse(recordsStr));
      }
    } catch {
      console.log('記録の読み込みに失敗しました');
    }
  };

  const saveRecord = useCallback(async (record: GameRecord) => {
    try {
      const newRecords = [record, ...records].slice(0, 50);
      setRecords(newRecords);
      await AsyncStorage.setItem('stroopRecords', JSON.stringify(newRecords));
    } catch {
      console.log('記録の保存に失敗しました');
    }
  }, [records]);

  // 効果音の再生（ハプティック）
  const playSound = useCallback((type: 'correct' | 'incorrect' | 'countdown' | 'start' | 'levelUp') => {
    if (!soundEnabled || Platform.OS === 'web') return;
    
    try {
      switch (type) {
        case 'correct':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'incorrect':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'levelUp':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'countdown':
        case 'start':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
      }
    } catch {
      console.log('ハプティックフィードバックエラー');
    }
  }, [soundEnabled]);

  // 時間計測の処理
  useEffect(() => {
    if (gameState === 'playing' && startTime > 0) {
      const timerId = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      return () => clearInterval(timerId);
    }
  }, [gameState, startTime]);

  // ゲーム終了判定
  useEffect(() => {
    if (gameState === 'playing' && currentProblem >= LEVEL_CONFIG[selectedLevel].problems) {
      endGame();
    }
  }, [currentProblem, selectedLevel, gameState]);

  // 新しい問題の生成
  const generateNewTrial = useCallback(() => {
    const levelColors = COLORS.slice(0, LEVEL_CONFIG[selectedLevel].colors);
    let newWordIndex = Math.floor(Math.random() * levelColors.length);
    let newColorIndex = Math.floor(Math.random() * levelColors.length);

    // レベルによってストループ課題の難易度を調整
    const matchRate = selectedLevel === 1 ? 0.4 : selectedLevel === 2 ? 0.3 : 0.2;
    
    if (Math.random() > matchRate) {
      while (newColorIndex === newWordIndex) {
        newColorIndex = Math.floor(Math.random() * levelColors.length);
      }
    }

    setCurrentWord(levelColors[newWordIndex]);
    setCurrentColor(levelColors[newColorIndex]);
    
    // ワードの登場アニメーション
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedLevel, scaleAnim]);

  // カウントダウン開始
  const startCountdown = useCallback(() => {
    setGameState('countdown');
    setCountdownValue(3);
    
    const countdown = (value: number) => {
      setCountdownValue(value);
      playSound('countdown');
      
      Animated.sequence([
        Animated.timing(countdownAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(countdownAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (value > 1) {
          countdown(value - 1);
        } else {
          setCountdownValue(0);
          playSound('start');
          Animated.timing(countdownAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            setTimeout(() => {
              Animated.timing(countdownAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }).start(() => {
                setGameState('playing');
                generateNewTrial();
              });
            }, 400);
          });
        }
      });
    };
    
    countdown(3);
  }, [countdownAnim, playSound, generateNewTrial]);

  // ゲーム開始処理
  const startGame = useCallback((level: number) => {
    setSelectedLevel(level);
    setScore(0);
    setCurrentProblem(0);
    setCombo(0);
    setTotalProblems(LEVEL_CONFIG[level].problems);
    setStartTime(Date.now());
    setDuration(0);
    
    // アニメーションリセット
    fadeAnim.setValue(0);
    scaleAnim.setValue(1);
    confettiAnim.setValue(0);
    feedbackAnim.setValue(0);
    sparkleAnim.setValue(0);
    rainbowAnim.setValue(0);
    
    startCountdown();
  }, [fadeAnim, scaleAnim, confettiAnim, feedbackAnim, sparkleAnim, rainbowAnim, startCountdown]);

  // ゲーム終了処理
  const endGame = useCallback(() => {
    if (gameTimer.current) {
      clearTimeout(gameTimer.current);
    }

    const finalDuration = startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : duration;
    const accuracy = totalProblems > 0 ? Math.round((score / totalProblems) * 100) : 0;
    
    // 記録保存
    const record: GameRecord = {
      date: new Date().toLocaleString('ja-JP'),
      level: selectedLevel,
      score,
      total: totalProblems,
      accuracy,
      duration: finalDuration,
      gameId: Date.now().toString(),
      gameType: 'stroop',
    };
    saveRecord(record);

    if (combo > maxCombo) setMaxCombo(combo);
    setDuration(finalDuration);
    setGameState('result');
  }, [score, totalProblems, selectedLevel, combo, maxCombo, startTime, duration, saveRecord]);

  // 正解・不正解のフィードバックアニメーション
  const showFeedbackAnimation = useCallback((isCorrect: boolean) => {
    setShowFeedback(true);
    setLastCorrect(isCorrect);
    
    if (isCorrect) {
      // 正解時の豪華なアニメーション
      Animated.parallel([
        // 紙吹雪
        Animated.sequence([
          Animated.timing(confettiAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(confettiAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        // 虹エフェクト
        Animated.sequence([
          Animated.timing(rainbowAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(rainbowAnim, {
            toValue: 0,
            duration: 1100,
            useNativeDriver: true,
          }),
        ]),
        // キラキラ
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ),
      ]).start();
    } else {
      // 不正解時の優しいアニメーション
      Animated.sequence([
        Animated.timing(feedbackAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(feedbackAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    setTimeout(() => {
      setShowFeedback(false);
    }, 1200); // フィードバックを早めにフェードアウト
  }, [confettiAnim, rainbowAnim, sparkleAnim, feedbackAnim]);

  // 回答処理
  const handleAnswer = useCallback((selectedColorName: string) => {
    if (gameState !== 'playing') return;

    const isCorrect = selectedColorName === currentColor.name;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
      setCombo(prev => {
        const newCombo = prev + 1;
        if (newCombo > maxCombo) setMaxCombo(newCombo);
        return newCombo;
      });
      playSound('correct');
    } else {
      setCombo(0);
      playSound('incorrect');
    }
    
    setCurrentProblem(prev => prev + 1);
    showFeedbackAnimation(isCorrect);
    
    // 次の問題へ（テンポ改善：フィードバック表示と同時に次の問題準備）
    setTimeout(() => {
      if (currentProblem + 1 >= LEVEL_CONFIG[selectedLevel].problems) {
        endGame();
      } else {
        generateNewTrial();
      }
    }, 800); // 短縮してテンポアップ
  }, [gameState, currentColor.name, currentProblem, selectedLevel, maxCombo, playSound, showFeedbackAnimation, endGame, generateNewTrial]);

  // ウェルカム画面
  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeTitle}>🌈 にじいろコトバ 🌈</Text>
      <Text style={styles.welcomeSubtitle}>もじのいろを あてるゲーム！</Text>
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionHighlight}>⚠️ だいじなルール ⚠️</Text>
        <Text style={styles.welcomeDescription}>
          <Text style={styles.emphasisText}>ことばではなく</Text>
          {"\n"}
          <Text style={styles.emphasisText}>もじのいろをみて</Text>
          {"\n"}
          <Text style={styles.emphasisText}>ただしいいろのボタンをおしてね！</Text>
        </Text>
        <Text style={styles.exampleText}>
          れい：「あか」が みどりいろ → みどりボタンをおす
        </Text>
      </View>
      
      <Pressable style={styles.welcomeStartButton} onPress={() => setGameState('levelSelect')}>
        <LinearGradient
          colors={['#FF1744', '#2196F3', '#4CAF50', '#FFD600']}
          style={styles.welcomeStartButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.welcomeStartButtonText}>🎉 あそんでみる！ 🎉</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  // レベル選択画面
  const renderLevelSelect = () => (
    <ScrollView style={styles.levelSelectContainer} contentContainerStyle={styles.levelSelectContent}>
      <Text style={styles.levelSelectTitle}>🎯 レベルをえらんでね！ 🎯</Text>
      
      <View style={styles.levelGrid}>
        {Object.entries(LEVEL_CONFIG).map(([level, config]) => (
          <Pressable
            key={level}
            style={styles.levelCard}
            onPress={() => startGame(parseInt(level))}
          >
            <LinearGradient
              colors={config.colors <= 3 ? ['#4CAF50', '#66BB6A'] : 
                     config.colors <= 4 ? ['#2196F3', '#42A5F5'] :
                     config.colors <= 5 ? ['#FF6D00', '#FF8A65'] :
                     ['#9C27B0', '#BA68C8']}
              style={styles.levelCardGradient}
            >
              <Text style={styles.levelEmoji}>{config.emoji}</Text>
              <Text style={styles.levelTitle}>{config.title}</Text>
              <Text style={styles.levelDescription}>{config.description}</Text>
              <Text style={styles.levelDetails}>
                {config.colors}いろ・{config.problems}もん
              </Text>
            </LinearGradient>
          </Pressable>
        ))}
      </View>
      
      <Pressable style={styles.backToWelcomeButton} onPress={() => setGameState('welcome')}>
        <LinearGradient
          colors={['#FF6B6B', '#ff4757']}
          style={styles.backToWelcomeButtonGradient}
        >
          <Text style={styles.backToWelcomeButtonText}>🔙 もどる</Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );

  // カウントダウン画面
  const renderCountdown = () => (
    <View style={styles.countdownContainer}>
      <Animated.View
        style={[
          styles.countdownCircle,
          {
            opacity: countdownAnim,
            transform: [{
              scale: countdownAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1.2]
              })
            }]
          }
        ]}
      >
        <LinearGradient
          colors={countdownValue > 0 ? ['#FF6B35', '#F7931E'] : ['#4CAF50', '#66BB6A']}
          style={styles.countdownGradient}
        >
          <Text style={styles.countdownText}>
            {countdownValue > 0 ? countdownValue : 'スタート!'}
          </Text>
        </LinearGradient>
      </Animated.View>
      
      {countdownValue > 0 && (
        <Text style={styles.countdownSubText}>じゅんびはいい？</Text>
      )}
    </View>
  );

  // ゲーム画面
  const renderGame = () => {
    const levelColors = COLORS.slice(0, LEVEL_CONFIG[selectedLevel].colors);
    
    return (
      <View style={styles.gameContainer}>
        {/* ヘッダー情報 */}
        <View style={styles.gameHeader}>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>⭐ {score}/{totalProblems}</Text>
            <Text style={styles.statsText}>⏰ {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</Text>
            <Text style={styles.statsText}>🔥 {combo}</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${(currentProblem / totalProblems) * 100}%` }
              ]} />
            </View>
          </View>
        </View>

        {/* メインコンテンツ */}
        <View style={styles.gameContent}>
          {/* 単語表示 */}
          <View style={styles.wordContainer}>
            <Animated.Text 
              style={[
                styles.wordText, 
                { 
                  color: currentColor.code,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              {currentWord.displayName || currentWord.name}
            </Animated.Text>
          </View>

          {/* 色選択ボタン */}
          <View style={styles.colorButtonsContainer}>
            {levelColors.map((color, index) => (
              <Pressable
                key={color.name}
                style={styles.colorButton}
                onPress={() => handleAnswer(color.name)}
              >
                <LinearGradient
                  colors={color.gradient}
                  style={styles.colorButtonGradient}
                >
                  <Text style={styles.colorButtonText}>{color.name}</Text>
                  <View style={[styles.colorIndicator, { backgroundColor: color.code }]} />
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>

        {/* フィードバック表示（オーバーレイで次の問題をブロックしない） */}
        {showFeedback && (
          <View style={styles.feedbackOverlay}>
            {lastCorrect ? (
              <>
                {/* 正解時の紙吹雪 */}
                <Animated.View
                  style={[
                    styles.confettiContainer,
                    {
                      opacity: confettiAnim,
                      transform: [{
                        translateY: confettiAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -200]
                        })
                      }]
                    }
                  ]}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <Text key={i} style={[
                      styles.confetti,
                      { 
                        left: `${(i * 8) + 10}%`,
                        animationDelay: `${i * 50}ms`
                      }
                    ]}>
                      {['🎉', '🎊', '✨', '🌟', '💫', '🎈', '🎁', '🏆', '🌈', '⭐', '💖', '🦄'][i]}
                    </Text>
                  ))}
                </Animated.View>
                
                {/* 虹エフェクト */}
                <Animated.View
                  style={[
                    styles.rainbowContainer,
                    {
                      opacity: rainbowAnim,
                      transform: [{
                        scale: rainbowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.2]
                        })
                      }]
                    }
                  ]}
                >
                  <Text style={styles.rainbowText}>🌈 すごい！ 🌈</Text>
                </Animated.View>
                
                {/* キラキラエフェクト */}
                <Animated.View
                  style={[
                    styles.sparkleContainer,
                    {
                      opacity: sparkleAnim,
                      transform: [{
                        rotate: sparkleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg']
                        })
                      }]
                    }
                  ]}
                >
                  {Array.from({ length: 8 }, (_, i) => (
                    <Text key={i} style={[
                      styles.sparkle,
                      { 
                        transform: [{
                          rotate: `${i * 45}deg`
                        }]
                      }
                    ]}>✨</Text>
                  ))}
                </Animated.View>
              </>
            ) : (
              <Animated.View
                style={[
                  styles.incorrectFeedback,
                  {
                    opacity: feedbackAnim,
                    transform: [{
                      scale: feedbackAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    }]
                  }
                ]}
              >
                <Text style={styles.incorrectText}>🤗 だいじょうぶ！ 🤗</Text>
                <Text style={styles.encouragementText}>つぎ がんばろう！</Text>
              </Animated.View>
            )}
          </View>
        )}
      </View>
    );
  };

  // 記録画面
  const renderRecords = () => (
    <View style={styles.recordsContainer}>
      <Text style={styles.sectionTitle}>📊 ゲームきろく</Text>
      {records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>まだきろくがありません</Text>
          <Text style={styles.emptySubText}>ゲームをしてきろくをつくろう！</Text>
        </View>
      ) : (
        <ScrollView style={styles.recordsList}>
          {records.slice(0, 10).map((record, index) => (
            <View key={index} style={styles.recordItem}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordDate}>{record.date}</Text>
                <Text style={[
                  styles.recordResult,
                  { color: record.accuracy >= 80 ? '#4CAF50' : record.accuracy >= 60 ? '#FF9800' : '#f44336' }
                ]}>
                  {record.accuracy >= 80 ? '🌟 すばらしい' : record.accuracy >= 60 ? '😊 がんばった' : '💪 れんしゅう'}
                </Text>
              </View>
              <Text style={styles.recordDetails}>
                レベル: {LEVEL_CONFIG[record.level]?.title || record.level} | 
                せいかい: {record.score}/{record.total} ({record.accuracy}%)
              </Text>
              <Text style={styles.recordTime}>
                じかん: {Math.floor(record.duration / 60)}ふん {record.duration % 60}びょう
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // 結果画面
  const renderResult = () => {
    const accuracy = totalProblems > 0 ? Math.round((score / totalProblems) * 100) : 0;
    const isExcellent = accuracy >= 80;
    
    return (
      <View style={styles.resultContainer}>
        {/* 最終祝福エフェクト */}
        <View style={styles.finalCelebration}>
          {Array.from({ length: 20 }, (_, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.celebrationEmoji,
                {
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                  transform: [{
                    rotate: confettiAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  }],
                },
              ]}
            >
              {['🎉', '🎊', '✨', '🌟', '⭐', '💫', '🎈', '🎁', '🏆', '🌈'][Math.floor(Math.random() * 10)]}
            </Animated.Text>
          ))}
        </View>
        
        <Text style={styles.resultTitle}>🎉 おつかれさま！ 🎉</Text>
        
        <View style={styles.resultScoreContainer}>
          <LinearGradient
            colors={isExcellent ? ['#FFD700', '#FFA500'] : ['#4CAF50', '#66BB6A']}
            style={styles.resultScoreCard}
          >
            <Text style={styles.resultScore}>
              🌟 とくてん 🌟{"\n"}{score}/{totalProblems}
            </Text>
            <Text style={styles.resultPercentage}>
              💫 せいかいりつ 💫{"\n"}{accuracy}%
            </Text>
            <Text style={styles.resultDuration}>
              ⏰ かかったじかん ⏰{"\n"}{Math.floor(duration / 60)}ふん {duration % 60}びょう
            </Text>
            {maxCombo > 1 && (
              <Text style={styles.comboText}>
                🔥 さいこうれんぞく 🔥{"\n"}{maxCombo}もん
              </Text>
            )}
            {isExcellent && (
              <Text style={styles.excellentMessage}>
                🏆 すばらしい！{"\n"}いろのはんだんが とてもじょうず！ 🏆
              </Text>
            )}
          </LinearGradient>
        </View>
        
        <View style={styles.resultButtonsContainer}>
          <Pressable 
            style={styles.resultButton}
            onPress={() => startGame(selectedLevel)}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.resultButtonGradient}
            >
              <Text style={styles.resultButtonText}>🔄 もういちど</Text>
            </LinearGradient>
          </Pressable>
          
          <Pressable 
            style={styles.resultButton}
            onPress={() => setGameState('levelSelect')}
          >
            <LinearGradient
              colors={['#2196F3', '#1976D2']}
              style={styles.resultButtonGradient}
            >
              <Text style={styles.resultButtonText}>🎯 レベルえらび</Text>
            </LinearGradient>
          </Pressable>
          
          <Pressable 
            style={styles.resultButton}
            onPress={onGameEnd}
          >
            <LinearGradient
              colors={['#FF6B35', '#F7931E']}
              style={styles.resultButtonGradient}
            >
              <Text style={styles.resultButtonText}>🏠 ホーム</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (gameTimer.current) {
        clearTimeout(gameTimer.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* 美しい背景グラデーション */}
      <LinearGradient
        colors={['#FF69B4', '#FFB6C1', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* キラキラ背景 */}
      <View style={styles.sparkleBackground}>
        {Array.from({ length: 15 }, (_, i) => (
          <Text
            key={i}
            style={[
              styles.backgroundStar,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`
              }
            ]}
          >
            {['⭐', '✨', '🌟', '💫', '🌈'][Math.floor(Math.random() * 5)]}
          </Text>
        ))}
      </View>
      
      {/* タブナビゲーション */}
      {(gameState === 'welcome' || gameState === 'levelSelect') && (
        <View style={styles.tabContainer}>
          {[
            { key: 'game', label: 'ゲーム', icon: '🎮' },
            { key: 'records', label: 'きろく', icon: '📊' },
          ].map(tab => (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                { backgroundColor: activeTab === tab.key ? 'rgba(33, 150, 243, 0.9)' : 'rgba(255, 255, 255, 0.7)' }
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.key ? 'white' : '#666' }
              ]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* メインコンテンツ */}
      <View style={styles.content}>
        {gameState === 'welcome' && activeTab === 'game' && renderWelcome()}
        {gameState === 'welcome' && activeTab === 'records' && renderRecords()}
        {gameState === 'levelSelect' && activeTab === 'game' && renderLevelSelect()}
        {gameState === 'levelSelect' && activeTab === 'records' && renderRecords()}
        {gameState === 'countdown' && renderCountdown()}
        {gameState === 'playing' && renderGame()}
        {gameState === 'result' && renderResult()}
      </View>
      
      {/* サウンド設定ボタン */}
      <Pressable 
        style={styles.soundToggle}
        onPress={() => setSoundEnabled(!soundEnabled)}
      >
        <Text style={styles.soundToggleText}>
          {soundEnabled ? '🔊' : '🔇'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  sparkleBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  backgroundStar: {
    position: 'absolute',
    fontSize: 20,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 15 : 40,
    paddingHorizontal: 15,
    paddingBottom: 15,
    zIndex: 2,
  },
  soundToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 15 : 40,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  soundToggleText: {
    fontSize: 24,
  },
  
  // タブナビゲーション
  tabContainer: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
    paddingBottom: 8,
    paddingHorizontal: 10,
    justifyContent: 'space-around',
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 70,
    marginHorizontal: 3,
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // ウェルカム画面
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeTitle: {
    fontSize: screenWidth < 400 ? 28 : 32,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 15,
    textAlign: 'center',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    lineHeight: screenWidth < 400 ? 34 : 38,
    paddingHorizontal: 10,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  instructionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    marginHorizontal: 10,
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  instructionHighlight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4500',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 15,
  },
  emphasisText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF1744',
  },
  exampleText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    backgroundColor: 'rgba(255, 235, 59, 0.2)',
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD600',
  },
  welcomeStartButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    marginTop: 20,
    width: '85%',
    maxWidth: 320,
  },
  welcomeStartButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeStartButtonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 10,
  },
  
  // レベル選択画面
  levelSelectContainer: {
    flex: 1,
  },
  levelSelectContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  levelSelectTitle: {
    fontSize: screenWidth < 400 ? 20 : 24,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 30,
    textAlign: 'center',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    lineHeight: screenWidth < 400 ? 26 : 30,
    paddingHorizontal: 10,
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  levelCard: {
    width: screenWidth < 400 ? '45%' : '40%',
    minWidth: 150,
    maxWidth: 180,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    marginBottom: 10,
  },
  levelCardGradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  levelEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  levelTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  levelDescription: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.9,
  },
  levelDetails: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.8,
  },
  backToWelcomeButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backToWelcomeButtonGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToWelcomeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // カウントダウン画面
  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownCircle: {
    width: screenWidth < 400 ? 140 : 180,
    height: screenWidth < 400 ? 140 : 180,
    borderRadius: screenWidth < 400 ? 70 : 90,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  countdownGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: screenWidth < 400 ? 28 : 32,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  countdownSubText: {
    fontSize: 24,
    color: '#FF1493',
    marginTop: 30,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // ゲーム画面
  gameContainer: {
    flex: 1,
  },
  gameHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  gameContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 30,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    minHeight: 120,
  },
  wordText: {
    fontSize: Math.min(screenWidth / 5, 80),
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  colorButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 20,
  },
  colorButton: {
    width: screenWidth < 400 ? '45%' : '30%',
    minWidth: 120,
    minHeight: 80,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    marginVertical: 5,
  },
  colorButtonGradient: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  colorIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'white',
  },
  
  // フィードバック関連（タップを通して連続プレイ可能）
  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'none', // タップを下の要素に通す
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    fontSize: 30,
    top: 0,
  },
  rainbowContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    padding: 20,
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  rainbowText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF1493',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  sparkleContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
    fontSize: 24,
    color: '#FFD700',
  },
  incorrectFeedback: {
    backgroundColor: 'rgba(255, 107, 107, 0.95)',
    borderRadius: 25,
    padding: 20,
    borderWidth: 3,
    borderColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    alignItems: 'center',
  },
  incorrectText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
    marginBottom: 5,
  },
  encouragementText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // 結果画面
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  finalCelebration: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
  celebrationEmoji: {
    position: 'absolute',
    fontSize: 28,
    color: '#FFD700',
  },
  resultTitle: {
    fontSize: screenWidth < 400 ? 28 : 32,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 30,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    textAlign: 'center',
    lineHeight: screenWidth < 400 ? 34 : 38,
    paddingHorizontal: 10,
    zIndex: 1,
  },
  resultScoreContainer: {
    alignItems: 'center',
    marginBottom: 40,
    zIndex: 1,
  },
  resultScoreCard: {
    padding: 30,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    minWidth: 280,
  },
  resultScore: {
    fontSize: 22,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  resultPercentage: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 26,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 10,
  },
  comboText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  excellentMessage: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 15,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  resultButtonsContainer: {
    flexDirection: 'column',
    gap: 15,
    alignItems: 'center',
    zIndex: 1,
  },
  resultButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
  },
  resultButtonGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },
  resultDuration: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // 記録画面
  recordsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: screenWidth < 400 ? 24 : 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    lineHeight: screenWidth < 400 ? 30 : 34,
    paddingHorizontal: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  recordsList: {
    flex: 1,
  },
  recordItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  recordResult: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  recordDetails: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  recordTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
});