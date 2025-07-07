import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated, Platform, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface GameSettings {
  digits: number;
  speed: number;
  count: number;
  mode: 'add' | 'subtract' | 'mixed';
}

interface GameRecord {
  date: string;
  digits: number;
  speed: number;
  count: number;
  mode: string;
  isCorrect: boolean;
  gameId: string;
  gameType: 'flashmath';
}

interface FlashMathGameProps {
  onGameEnd: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function FlashMathGame({ onGameEnd }: FlashMathGameProps) {
  
  // ゲーム状態
  const [gamePhase, setGamePhase] = useState<'welcome' | 'setup' | 'countdown' | 'playing' | 'input' | 'result'>('welcome');
  const [settings, setSettings] = useState<GameSettings>({
    digits: 2,
    speed: 1.0,
    count: 10,
    mode: 'add'
  });
  
  // ゲームデータ
  const [numbers, setNumbers] = useState<number[]>([]);
  const [operations, setOperations] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  
  // コンボとスコア
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  
  // 設定
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  
  // アニメーション
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const countdownAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // タブとデータ
  const [activeTab, setActiveTab] = useState<'game' | 'records' | 'stats'>('game');
  const [records, setRecords] = useState<GameRecord[]>([]);
  
  // タイマー参照
  const gameTimer = useRef<NodeJS.Timeout | null>(null);

  // データロード
  useEffect(() => {
    loadRecords();
    loadSettings();
  }, []);

  const loadRecords = async () => {
    try {
      const recordsStr = await AsyncStorage.getItem('flashMathRecords');
      if (recordsStr) {
        setRecords(JSON.parse(recordsStr));
      }
    } catch {
      console.log('記録の読み込みに失敗しました');
    }
  };

  const loadSettings = async () => {
    try {
      const settingsStr = await AsyncStorage.getItem('flashMathSettings');
      if (settingsStr) {
        const savedSettings = JSON.parse(settingsStr);
        setSoundEnabled(savedSettings.soundEnabled ?? true);
        setEffectsEnabled(savedSettings.effectsEnabled ?? true);
      }
    } catch {
      console.log('設定の読み込みに失敗しました');
    }
  };

  const saveSettings = useCallback(async () => {
    try {
      const settingsToSave = {
        soundEnabled,
        effectsEnabled,
      };
      await AsyncStorage.setItem('flashMathSettings', JSON.stringify(settingsToSave));
    } catch {
      console.log('設定の保存に失敗しました');
    }
  }, [soundEnabled, effectsEnabled]);

  const saveRecord = useCallback(async (record: GameRecord) => {
    try {
      const newRecords = [record, ...records].slice(0, 50);
      setRecords(newRecords);
      await AsyncStorage.setItem('flashMathRecords', JSON.stringify(newRecords));
    } catch {
      console.log('記録の保存に失敗しました');
    }
  }, [records]);

  // 効果音の再生（ハプティック）
  const playSound = useCallback((type: 'correct' | 'incorrect' | 'countdown' | 'start') => {
    if (!soundEnabled || Platform.OS === 'web') return;
    
    try {
      switch (type) {
        case 'correct':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'incorrect':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  // 数字生成関数
  const generateNumbers = useCallback(() => {
    const { digits, count, mode } = settings;
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    
    const nums: number[] = [];
    const ops: string[] = [];
    
    // 最初の数字
    const firstNum = Math.floor(Math.random() * (max - min + 1)) + min;
    nums.push(firstNum);
    let answer = firstNum;
    ops.push(''); // 最初は演算子なし
    
    // 残りの数字を生成
    for (let i = 1; i < count; i++) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      let operation: string;
      
      if (mode === 'add') {
        operation = '+';
      } else if (mode === 'subtract') {
        operation = '-';
      } else {
        operation = Math.random() < 0.5 ? '+' : '-';
      }
      
      // 負の数にならないように調整
      if (operation === '-' && answer - num < 0) {
        if (mode === 'mixed') {
          operation = '+'; // 混合モードでは加算に変更
        } else {
          // 減算モードの場合は、より小さい数に変更
          const maxSubtract = answer;
          const newNum = Math.floor(Math.random() * Math.min(maxSubtract, max - min + 1)) + 1;
          nums.push(newNum);
          ops.push(operation);
          answer -= newNum;
          continue;
        }
      }
      
      ops.push(operation);
      nums.push(num);
      
      if (operation === '+') {
        answer += num;
      } else {
        answer -= num;
      }
    }
    
    setNumbers(nums);
    setOperations(ops);
    setCorrectAnswer(answer);
    
    console.log('生成された数字:', nums);
    console.log('演算子:', ops);
    console.log('正解:', answer);
  }, [settings]);

  // カウントダウン開始
  const startCountdown = useCallback(() => {
    setGamePhase('countdown');
    setCountdownValue(3);
    
    // カウントダウンアニメーション
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
          // "スタート！" 表示
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
                duration: 300,
                useNativeDriver: true,
              }).start(() => {
                setGamePhase('playing');
                setCurrentIndex(0);
              });
            }, 800);
          });
        }
      });
    };
    
    countdown(3);
  }, [countdownAnim, playSound]);

  // 数字を順次表示
  const showNextNumber = useCallback(() => {
    if (currentIndex >= numbers.length) {
      // 全ての数字表示完了
      setGamePhase('input');
      return;
    }

    console.log(`数字表示: ${currentIndex + 1}/${numbers.length} - ${numbers[currentIndex]} ${operations[currentIndex]}`);

    // プログレスバー更新
    Animated.timing(progressAnim, {
      toValue: (currentIndex + 1) / numbers.length,
      duration: 200,
      useNativeDriver: false,
    }).start();

    // 数字のフェードイン
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 指定時間後にフェードアウト
    gameTimer.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(prev => prev + 1);
        // 次の数字表示のために少し間隔を空ける
      });
    }, settings.speed * 1000);
  }, [currentIndex, numbers, operations, settings.speed, fadeAnim, progressAnim, scaleAnim]);

  // ゲーム開始
  const startGame = useCallback(() => {
    // タイマーをクリア
    if (gameTimer.current) {
      clearTimeout(gameTimer.current);
    }
    
    // アニメーションをリセット
    fadeAnim.setValue(0);
    scaleAnim.setValue(1);
    countdownAnim.setValue(0);
    confettiAnim.setValue(0);
    progressAnim.setValue(0);
    
    // ゲーム状態をリセット
    setCurrentIndex(0);
    setUserAnswer('');
    setIsCorrect(false);
    
    // 数字を生成
    generateNumbers();
    
    // カウントダウン開始
    setTimeout(() => {
      startCountdown();
    }, 500);
  }, [generateNumbers, startCountdown, fadeAnim, scaleAnim, countdownAnim, confettiAnim, progressAnim]);

  // 答えをチェック
  const checkAnswer = useCallback(() => {
    const answer = parseInt(userAnswer);
    const correct = answer === correctAnswer;
    
    setIsCorrect(correct);
    
    if (correct) {
      playSound('correct');
      setCombo(prev => {
        const newCombo = prev + 1;
        if (newCombo > maxCombo) setMaxCombo(newCombo);
        return newCombo;
      });
    } else {
      playSound('incorrect');
      setCombo(0);
    }

    // 記録保存
    const record: GameRecord = {
      date: new Date().toLocaleString('ja-JP'),
      digits: settings.digits,
      speed: settings.speed,
      count: settings.count,
      mode: settings.mode,
      isCorrect: correct,
      gameId: Date.now().toString(),
      gameType: 'flashmath',
    };
    saveRecord(record);

    setGamePhase('result');
  }, [userAnswer, correctAnswer, maxCombo, settings, playSound, saveRecord]);

  // 紙吹雪アニメーション
  const playConfettiAnimation = useCallback(() => {
    Animated.sequence([
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(confettiAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [confettiAnim]);

  // ゲームリセット
  const resetGame = useCallback(() => {
    if (gameTimer.current) {
      clearTimeout(gameTimer.current);
    }
    
    fadeAnim.setValue(0);
    scaleAnim.setValue(1);
    countdownAnim.setValue(0);
    confettiAnim.setValue(0);
    progressAnim.setValue(0);
    
    setGamePhase('setup');
    setCurrentIndex(0);
    setUserAnswer('');
    setIsCorrect(false);
    setCountdownValue(3);
  }, [fadeAnim, scaleAnim, countdownAnim, confettiAnim, progressAnim]);

  // ウェルカム画面からセットアップ画面へ
  const goToSetup = useCallback(() => {
    setGamePhase('setup');
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (gameTimer.current) {
        clearTimeout(gameTimer.current);
      }
    };
  }, []);

  // 設定保存
  useEffect(() => {
    saveSettings();
  }, [soundEnabled, effectsEnabled, saveSettings]);

  // ゲームフェーズが'playing'になったら数字表示開始
  useEffect(() => {
    if (gamePhase === 'playing' && currentIndex === 0 && numbers.length > 0) {
      const timer = setTimeout(() => {
        showNextNumber();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, currentIndex, numbers.length, showNextNumber]);

  // currentIndexが変更されたら次の数字を表示
  useEffect(() => {
    if (gamePhase === 'playing' && currentIndex > 0 && currentIndex < numbers.length) {
      const timer = setTimeout(() => {
        showNextNumber();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, currentIndex, numbers.length, showNextNumber]);

  // 正解時の紙吹雪エフェクト表示
  useEffect(() => {
    if (gamePhase === 'result' && isCorrect && effectsEnabled) {
      playConfettiAnimation();
    }
  }, [gamePhase, isCorrect, effectsEnabled, playConfettiAnimation]);

  // タブコンテンツのレンダリング
  const renderTabContent = () => {
    if (activeTab === 'records') {
      return (
        <View style={styles.recordsContainer}>
          <Text style={styles.sectionTitle}>📊 ゲームきろく</Text>
          {records.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>まだきろくがありません</Text>
              <Text style={styles.emptySubText}>ゲームをしてきろくをつくろう！</Text>
            </View>
          ) : (
            <View style={styles.recordsList}>
              {records.slice(0, 10).map((record, index) => (
                <View key={index} style={styles.recordItem}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordDate}>{record.date}</Text>
                    <Text style={[
                      styles.recordResult,
                      { color: record.isCorrect ? '#4CAF50' : '#f44336' }
                    ]}>
                      {record.isCorrect ? '🎉 せいかい' : '😅 まちがい'}
                    </Text>
                  </View>
                  <Text style={styles.recordDetails}>
                    {record.digits}けた × {record.count}もん ({record.speed}びょう) - {record.mode === 'add' ? 'たし' : record.mode === 'subtract' ? 'ひき' : 'まぜ'}ざん
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      );
    }

    if (activeTab === 'stats') {
      const totalGames = records.length;
      const correctGames = records.filter(r => r.isCorrect).length;
      const correctRate = totalGames > 0 ? Math.round((correctGames / totalGames) * 100) : 0;

      return (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>📈 とうけい</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalGames}</Text>
              <Text style={styles.statLabel}>そうゲームすう</Text>
              <Text style={styles.statIcon}>🎮</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{correctGames}</Text>
              <Text style={styles.statLabel}>せいかいすう</Text>
              <Text style={styles.statIcon}>✅</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{maxCombo}</Text>
              <Text style={styles.statLabel}>コンボすう</Text>
              <Text style={styles.statIcon}>🔥</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{correctRate}%</Text>
              <Text style={styles.statLabel}>せいかいりつ</Text>
              <Text style={styles.statIcon}>🎯</Text>
            </View>
          </View>
          
          {/* データリセットボタン */}
          <Pressable 
            style={styles.resetButton}
            onPress={() => {
              setRecords([]);
              setMaxCombo(0);
              AsyncStorage.removeItem('flashMathRecords');
            }}
          >
            <LinearGradient
              colors={['#ff6b6b', '#ee5a52']}
              style={styles.resetButtonGradient}
            >
              <Text style={styles.resetButtonText}>🗑️ データをリセット</Text>
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    // ゲームタブ
    return (
      <View style={styles.gameContent}>
        {renderGamePhase()}
      </View>
    );
  };

  // ゲームフェーズのレンダリング
  const renderGamePhase = () => {
    if (gamePhase === 'welcome') {
      return (
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>⚡ フラッシュあんざん ⚡</Text>
          <Text style={styles.welcomeSubtitle}>すうじをおぼえてけいさんしよう！</Text>
          <Text style={styles.welcomeDescription}>
            フラッシュあんざんは、すうじがしゅんじでててきて、それをおぼえてけいさんするゲームです。
            あたまをきたえて、たのしくあそんでみよう！
          </Text>
          
          <Pressable style={styles.welcomeStartButton} onPress={goToSetup}>
            <LinearGradient
              colors={['#4CAF50', '#45a049', '#66BB6A']}
              style={styles.welcomeStartButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.welcomeStartButtonText}>🎉 はじめる！ 🎉</Text>
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    if (gamePhase === 'setup') {
      return (
        <View style={styles.setupContainer}>
          <Text style={styles.gameTitle}>🌸 ゲームせってい 🌸</Text>
          <Text style={styles.gameSubtitle}>あなたのすきなむずかしさをえらんでね！</Text>
          
          {/* 設定パネル */}
          <View style={styles.settingsPanel}>
            {/* 桁数設定 */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingTitle}>🔢 けたすう: {settings.digits}けた</Text>
              <View style={styles.settingButtons}>
                {[1, 2, 3].map(digit => (
                  <Pressable
                    key={digit}
                    style={[
                      styles.settingButton,
                      { backgroundColor: settings.digits === digit ? '#4CAF50' : '#E0E0E0' }
                    ]}
                    onPress={() => setSettings(prev => ({ ...prev, digits: digit }))}
                  >
                    <Text style={[
                      styles.settingButtonText,
                      { color: settings.digits === digit ? 'white' : '#333' }
                    ]}>
                      {digit}けた
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 速度設定 */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingTitle}>⚡ はやさ: {settings.speed}びょう</Text>
              <View style={styles.settingButtons}>
                {[0.5, 0.8, 1.0, 1.5].map(speed => (
                  <Pressable
                    key={speed}
                    style={[
                      styles.settingButton,
                      { backgroundColor: settings.speed === speed ? '#2196F3' : '#E0E0E0' }
                    ]}
                    onPress={() => setSettings(prev => ({ ...prev, speed }))}
                  >
                    <Text style={[
                      styles.settingButtonText,
                      { color: settings.speed === speed ? 'white' : '#333' }
                    ]}>
                      {speed}s
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 問題数設定 */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingTitle}>📝 もんだいすう: {settings.count}もん</Text>
              <View style={styles.settingButtons}>
                {[5, 10, 15, 20].map(count => (
                  <Pressable
                    key={count}
                    style={[
                      styles.settingButton,
                      { backgroundColor: settings.count === count ? '#FF6B35' : '#E0E0E0' }
                    ]}
                    onPress={() => setSettings(prev => ({ ...prev, count }))}
                  >
                    <Text style={[
                      styles.settingButtonText,
                      { color: settings.count === count ? 'white' : '#333' }
                    ]}>
                      {count}もん
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* モード選択 */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingTitle}>🎯 けいさんモード</Text>
              <View style={styles.modeButtons}>
                {[
                  { key: 'add', label: '➕ たしざん', color: '#4CAF50' },
                  { key: 'subtract', label: '➖ ひきざん', color: '#FF6B35' },
                  { key: 'mixed', label: '🎲 まぜる', color: '#9C27B0' }
                ].map(mode => (
                  <Pressable
                    key={mode.key}
                    style={[
                      styles.modeButton,
                      { 
                        backgroundColor: settings.mode === mode.key ? mode.color : '#E0E0E0',
                        borderColor: mode.color,
                        borderWidth: settings.mode === mode.key ? 0 : 2
                      }
                    ]}
                    onPress={() => setSettings(prev => ({ ...prev, mode: mode.key as any }))}
                  >
                    <Text style={[
                      styles.modeButtonText,
                      { color: settings.mode === mode.key ? 'white' : mode.color }
                    ]}>
                      {mode.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* エフェクト設定 */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingTitle}>🎨 エフェクト</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  style={[styles.toggleButton, { backgroundColor: soundEnabled ? '#4CAF50' : '#E0E0E0' }]}
                  onPress={() => setSoundEnabled(!soundEnabled)}
                >
                  <Text style={[styles.toggleText, { color: soundEnabled ? 'white' : '#666' }]}>
                    🔊 おと
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleButton, { backgroundColor: effectsEnabled ? '#4CAF50' : '#E0E0E0' }]}
                  onPress={() => setEffectsEnabled(!effectsEnabled)}
                >
                  <Text style={[styles.toggleText, { color: effectsEnabled ? 'white' : '#666' }]}>
                    ✨ しかけ
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* スタートボタン */}
          <Pressable style={styles.startButton} onPress={startGame}>
            <LinearGradient
              colors={['#4CAF50', '#45a049', '#66BB6A']}
              style={styles.startButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.startButtonText}>🚀 ゲームスタート！ 🚀</Text>
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    if (gamePhase === 'countdown') {
      return (
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
                {countdownValue > 0 ? countdownValue : 'スタート！'}
              </Text>
            </LinearGradient>
          </Animated.View>
          
          {countdownValue > 0 && (
            <Text style={styles.countdownSubText}>よういはいい？</Text>
          )}
        </View>
      );
    }

    if (gamePhase === 'playing') {
      const currentNumber = numbers[currentIndex] || 0;
      const currentOperation = operations[currentIndex] || '';
      
      return (
        <View style={styles.playingContainer}>
          {/* プログレスバー */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {currentIndex + 1} / {numbers.length}
            </Text>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]}
              />
            </View>
          </View>
          
          {/* 数字表示 */}
          <Animated.View
            style={[
              styles.numberDisplayContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={
                currentOperation === '+' ? ['#4CAF50', '#66BB6A'] :
                currentOperation === '-' ? ['#FF6B35', '#FF8A50'] :
                ['#2196F3', '#42A5F5']
              }
              style={styles.numberGradient}
            >
              {currentIndex > 0 && currentOperation && (
                <Text style={styles.operationDisplay}>{currentOperation}</Text>
              )}
              <Text style={styles.numberDisplay}>{currentNumber}</Text>
            </LinearGradient>
          </Animated.View>
          
          {/* 残り時間インジケーター */}
          <View style={styles.timeIndicator}>
            <Text style={styles.timeText}>⏱️ {settings.speed}びょう</Text>
          </View>
        </View>
      );
    }

    if (gamePhase === 'input') {
      return (
        <View style={styles.inputContainer}>
          <Text style={styles.inputTitle}>📝 こたえをにゅうりょくしてね！</Text>
          <Text style={styles.inputSubTitle}>すべてのすうじをたしたり、ひいたりしたこたえは？</Text>
          
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.answerInput}
              value={userAnswer}
              onChangeText={setUserAnswer}
              placeholder="こたえ"
              keyboardType="numeric"
              autoFocus
              placeholderTextColor="#999"
            />
          </View>
          
          <Pressable 
            style={[styles.submitButton, { opacity: userAnswer ? 1 : 0.5 }]}
            onPress={checkAnswer}
            disabled={!userAnswer}
          >
            <LinearGradient
              colors={userAnswer ? ['#2196F3', '#1976D2'] : ['#E0E0E0', '#BDBDBD']}
              style={styles.submitButtonGradient}
            >
              <Text style={[
                styles.submitButtonText,
                { color: userAnswer ? 'white' : '#666' }
              ]}>
                ✅ かくにん
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    if (gamePhase === 'result') {
      return (
        <View style={styles.resultContainer}>
          {/* 紙吹雪エフェクト */}
          {effectsEnabled && isCorrect && (
            <Animated.View
              style={[
                styles.confettiContainer,
                {
                  opacity: confettiAnim,
                  transform: [{
                    translateY: confettiAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -100]
                    })
                  }]
                }
              ]}
            >
              {Array.from({ length: 8 }, (_, i) => (
                <Text key={i} style={[styles.confetti, { 
                  left: `${(i * 12) + 10}%`,
                  animationDelay: `${i * 100}ms`
                }]}>
                  {['🎉', '🎊', '✨', '🌟', '💫', '🎈', '🎁', '🏆'][i]}
                </Text>
              ))}
            </Animated.View>
          )}
          
          <LinearGradient
            colors={isCorrect ? ['#4CAF50', '#66BB6A'] : ['#FF6B35', '#FF8A50']}
            style={styles.resultCard}
          >
            <Text style={styles.resultTitle}>
              {isCorrect ? '🌟 せいかい！ 🌟' : '😅 まちがい'}
            </Text>
            
            <View style={styles.resultDetails}>
              <Text style={styles.resultLabel}>せいかい:</Text>
              <Text style={styles.resultAnswer}>{correctAnswer}</Text>
            </View>
            
            <View style={styles.resultDetails}>
              <Text style={styles.resultLabel}>あなたのこたえ:</Text>
              <Text style={styles.resultAnswer}>{userAnswer || 'なし'}</Text>
            </View>
            
            {combo > 1 && (
              <View style={styles.comboContainer}>
                <Text style={styles.comboText}>🔥 {combo}れんぞく！ 🔥</Text>
              </View>
            )}
          </LinearGradient>

          <View style={styles.resultButtons}>
            <Pressable style={styles.resultButton} onPress={resetGame}>
              <LinearGradient
                colors={['#4CAF50', '#45a049']}
                style={styles.resultButtonGradient}
              >
                <Text style={styles.resultButtonText}>🔄 もういちど</Text>
              </LinearGradient>
            </Pressable>
            
            <Pressable style={styles.resultButton} onPress={onGameEnd}>
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
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* 背景グラデーション */}
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
      <View style={styles.tabContainer}>
        {[
          { key: 'game', label: 'ゲーム', icon: '🎮' },
          { key: 'records', label: 'きろく', icon: '📊' },
          { key: 'stats', label: 'とうけい', icon: '📈' }
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

      {/* メインコンテンツ */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
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
  tabContainer: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'ios' ? Math.max(screenWidth / 8, 60) : StatusBar.currentHeight ? StatusBar.currentHeight + Math.max(screenWidth / 20, 20) : Math.max(screenWidth / 10, 50),
    paddingBottom: Math.max(screenWidth / 30, 12),
    paddingHorizontal: Math.max(screenWidth / 25, 15),
    justifyContent: 'space-around',
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  tab: {
    paddingHorizontal: Math.max(screenWidth / 30, 12),
    paddingVertical: Math.max(screenWidth / 40, 8),
    borderRadius: Math.max(screenWidth / 25, 16),
    alignItems: 'center',
    minWidth: Math.max(screenWidth / 6, 70),
    minHeight: Math.max(screenWidth / 12, 44),
    marginHorizontal: Math.max(screenWidth / 80, 3),
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: Math.min(screenWidth / 18, 22),
    marginBottom: Math.max(screenWidth / 100, 2),
  },
  tabText: {
    fontSize: Math.min(screenWidth / 30, 14),
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: Math.max(screenWidth / 25, 15),
    paddingTop: Math.max(screenWidth / 50, 8),
    paddingBottom: Math.max(screenWidth / 25, 15),
    zIndex: 2,
  },
  gameContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Setup画面
  // Welcome画面
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Math.max(screenWidth / 15, 20),
  },
  welcomeTitle: {
    fontSize: Math.min(screenWidth / 8, 40),
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: Math.max(screenWidth / 25, 20),
    textAlign: 'center',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  welcomeSubtitle: {
    fontSize: Math.min(screenWidth / 12, 24),
    color: '#555',
    marginBottom: Math.max(screenWidth / 20, 25),
    textAlign: 'center',
    fontWeight: '600',
  },
  welcomeDescription: {
    fontSize: Math.min(screenWidth / 16, 18),
    color: '#555',
    textAlign: 'center',
    lineHeight: Math.min(screenWidth / 12, 28),
    marginBottom: Math.max(screenWidth / 10, 40),
    paddingHorizontal: Math.max(screenWidth / 20, 15),
  },
  welcomeStartButton: {
    borderRadius: Math.max(screenWidth / 12, 30),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 15,
    marginTop: Math.max(screenWidth / 20, 20),
    width: '90%',
    maxWidth: Math.min(screenWidth * 0.8, 350),
  },
  welcomeStartButtonGradient: {
    paddingHorizontal: Math.max(screenWidth / 8, 40),
    paddingVertical: Math.max(screenWidth / 20, 18),
    minHeight: Math.max(screenWidth / 7, 65),
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeStartButtonText: {
    color: 'white',
    fontSize: Math.min(screenWidth / 10, 28),
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  
  // Setup画面
  setupContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Math.max(screenWidth / 30, 15),
    paddingHorizontal: Math.max(screenWidth / 20, 15),
  },
  gameTitle: {
    fontSize: Math.min(screenWidth / 10, 32),
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: Math.max(screenWidth / 40, 12),
    textAlign: 'center',
    textShadowColor: '#FFB6C1',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  gameSubtitle: {
    fontSize: Math.min(screenWidth / 16, 18),
    color: '#555',
    marginBottom: Math.max(screenWidth / 30, 20),
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: Math.min(screenWidth / 12, 24),
  },
  settingsPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: Math.max(screenWidth / 20, 20),
    padding: Math.max(screenWidth / 20, 20),
    width: '100%',
    maxWidth: Math.min(screenWidth * 0.95, 500),
    marginBottom: Math.max(screenWidth / 25, 20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  settingGroup: {
    marginBottom: Math.max(screenWidth / 15, 25),
  },
  settingTitle: {
    fontSize: Math.min(screenWidth / 14, 22),
    fontWeight: 'bold',
    marginBottom: Math.max(screenWidth / 25, 15),
    color: '#333',
    textAlign: 'center',
  },
  settingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: Math.max(screenWidth / 40, 8),
  },
  settingButton: {
    paddingHorizontal: Math.max(screenWidth / 30, 12),
    paddingVertical: Math.max(screenWidth / 40, 10),
    borderRadius: Math.max(screenWidth / 25, 16),
    minWidth: Math.max(screenWidth / 8, 60),
    minHeight: Math.max(screenWidth / 12, 44),
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: Math.max(screenWidth / 80, 2),
  },
  settingButtonText: {
    fontSize: Math.min(screenWidth / 20, 16),
    fontWeight: 'bold',
  },
  modeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: Math.max(screenWidth / 35, 10),
  },
  modeButton: {
    paddingHorizontal: Math.max(screenWidth / 25, 15),
    paddingVertical: Math.max(screenWidth / 30, 12),
    borderRadius: Math.max(screenWidth / 20, 20),
    minWidth: Math.max(screenWidth / 5, 90),
    minHeight: Math.max(screenWidth / 10, 48),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonText: {
    fontSize: Math.min(screenWidth / 18, 18),
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: Math.max(screenWidth / 20, 15),
  },
  toggleButton: {
    paddingHorizontal: Math.max(screenWidth / 20, 20),
    paddingVertical: Math.max(screenWidth / 30, 12),
    borderRadius: Math.max(screenWidth / 20, 20),
    minHeight: Math.max(screenWidth / 10, 48),
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: Math.min(screenWidth / 16, 20),
    fontWeight: 'bold',
  },
  startButton: {
    borderRadius: Math.max(screenWidth / 15, 25),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 15,
    marginTop: Math.max(screenWidth / 25, 15),
    width: '100%',
    maxWidth: Math.min(screenWidth * 0.9, 400),
  },
  startButtonGradient: {
    paddingHorizontal: Math.max(screenWidth / 10, 40),
    paddingVertical: Math.max(screenWidth / 20, 20),
    minHeight: Math.max(screenWidth / 8, 60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: Math.min(screenWidth / 12, 26),
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  
  // カウントダウン画面
  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
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
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  countdownSubText: {
    fontSize: 24,
    color: '#FF1493',
    marginTop: 30,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // プレイ画面
  playingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 50,
  },
  progressText: {
    fontSize: 20,
    color: '#666',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  numberDisplayContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  numberGradient: {
    paddingHorizontal: 60,
    paddingVertical: 40,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  operationDisplay: {
    fontSize: 40,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  numberDisplay: {
    fontSize: Math.min(screenWidth / 4, 80),
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  timeIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  timeText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  
  // 入力画面
  inputContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  inputSubTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputWrapper: {
    marginBottom: 30,
  },
  answerInput: {
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#2196F3',
    borderRadius: 20,
    paddingHorizontal: 25,
    paddingVertical: 20,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // 結果画面
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
  },
  confetti: {
    position: 'absolute',
    fontSize: 30,
    top: 0,
  },
  resultCard: {
    padding: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 30,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  resultDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultLabel: {
    fontSize: 18,
    color: 'white',
    marginRight: 10,
    fontWeight: '600',
  },
  resultAnswer: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  comboContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 15,
  },
  comboText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  resultButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resultButtonGradient: {
    paddingHorizontal: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  resultButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // 記録・統計共通
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // 記録画面
  recordsContainer: {
    flex: 1,
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
  
  // 統計画面
  statsContainer: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 15,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  statIcon: {
    fontSize: 20,
    marginTop: 5,
  },
  resetButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resetButtonGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});