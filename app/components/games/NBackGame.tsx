import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Trial {
  position: number; // 0-8 (3x3グリッドの位置)
  color: string; // 色
}

interface GameState {
  trials: Trial[];
  currentIndex: number;
  nLevel: number;
  score: number;
  totalTrials: number;
  isPlaying: boolean;
  showingStimulus: boolean;
  gamePhase: 'setup' | 'rules' | 'playing' | 'finished';
  showingFeedback: boolean;
  lastResponseCorrect: boolean;
  scoredTrialsCount: number;
  colorButtonPressed: boolean;
  positionButtonPressed: boolean;
  buttonsEnabled: boolean;
  lastFeedbackMessage: string;
}

const COLORS = ['#FF0000', '#0000FF', '#FFFF00']; // あか、あお、きいろ
const SCORED_TRIALS = 20; // スコア計算対象の問題数
const TILE_DISPLAY_DURATION = 2000; // タイル表示時間（2秒間）
const FADE_IN_DURATION = 500;        // フェードイン時間（0.5秒）
const FADE_OUT_DURATION = 500;       // フェードアウト時間（0.5秒）

export default function NBackGame() {
  const [gameState, setGameState] = useState<GameState>({
    trials: [],
    currentIndex: 0,
    nLevel: 1,
    score: 0,
    totalTrials: 0,
    isPlaying: false,
    showingStimulus: false,
    gamePhase: 'setup',
    showingFeedback: false,
    lastResponseCorrect: false,
    scoredTrialsCount: 0,
    colorButtonPressed: false,
    positionButtonPressed: false,
    buttonsEnabled: false,
    lastFeedbackMessage: '',
  });

  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [feedbackAnim] = useState(new Animated.Value(0));
  const [glowAnim] = useState(new Animated.Value(0));
  const [bounceAnim] = useState(new Animated.Value(0));
  const [confettiAnim] = useState(new Animated.Value(0));
  const [sparkleAnim] = useState(new Animated.Value(0));

  // 画面の幅を取得
  const { width } = Dimensions.get('window');
  const gridSize = Math.min(width - 60, 300);
  const tileSize = gridSize / 3 - 8;

  // 試行データを生成
  const generateTrials = useCallback((nLevel: number) => {
    const trials: Trial[] = [];
    const totalTrials = nLevel + SCORED_TRIALS + 5; // 練習問題 + 本番問題 + 余裕分
    
    for (let i = 0; i < totalTrials; i++) {
      trials.push({
        position: Math.floor(Math.random() * 9),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    
    return trials;
  }, []);

  // ゲーム開始
  const startGame = useCallback((nLevel: number) => {
    const trials = generateTrials(nLevel);
    setGameState(prev => ({
      ...prev,
      trials,
      currentIndex: 0,
      nLevel,
      score: 0,
      totalTrials: 0,
      isPlaying: true,
      gamePhase: 'playing',
      scoredTrialsCount: 0,
      colorButtonPressed: false,
      positionButtonPressed: false,
      buttonsEnabled: false,
      showingFeedback: false,
      lastFeedbackMessage: '',
    }));
  }, [generateTrials]);

  // 安全な回答評価関数（パラメータで受け取り）
  const evaluateResponseWithCurrentState = useCallback((currentIndex: number, nLevel: number, colorButtonPressed: boolean, positionButtonPressed: boolean) => {
    const { trials } = gameState;
    
    // 厳密な境界チェック（世界最高品質）
    const compareIndex = currentIndex - nLevel;
    if (currentIndex < nLevel || compareIndex < 0 || currentIndex >= trials.length || compareIndex >= trials.length) {
      console.log('🚫 判定範囲外:', { currentIndex, nLevel, compareIndex, trialsLength: trials.length });
      return;
    }
    
    const currentTrial = trials[currentIndex];
    const nBackTrial = trials[compareIndex];
    
    // デバッグ情報をログ出力
    console.log('=== 🔍 正誤判定デバッグ（世界最高品質） ===');
    console.log('📊 currentIndex:', currentIndex);
    console.log('📊 nLevel:', nLevel);
    console.log('📊 比較対象インデックス:', compareIndex);
    console.log('🎯 現在のタイル:', currentTrial);
    console.log('🎯 比較対象タイル:', nBackTrial);
    console.log('🎮 ボタン状態 - いろ:', colorButtonPressed, 'ばしょ:', positionButtonPressed);
    
    // 最終安全性チェック
    if (!currentTrial || !nBackTrial) {
      console.error('❌ タイルデータが不正です！', { currentTrial, nBackTrial });
      return;
    }
    
    const samePosition = currentTrial.position === nBackTrial.position;
    const sameColor = currentTrial.color === nBackTrial.color;
    
    console.log('🎯 位置が同じ:', samePosition, `(${currentTrial.position} === ${nBackTrial.position})`);
    console.log('🎨 色が同じ:', sameColor, `(${currentTrial.color} === ${nBackTrial.color})`);
    
    // 正誤判定の詳細ロジック
    const colorCorrect = (sameColor && colorButtonPressed) || (!sameColor && !colorButtonPressed);
    const positionCorrect = (samePosition && positionButtonPressed) || (!samePosition && !positionButtonPressed);
    const isCorrect = colorCorrect && positionCorrect;
    
    console.log('✅ 色の判定:', sameColor ? '同じ色' : '違う色', '→', colorButtonPressed ? 'ボタン押下' : 'ボタン未押下', '→', colorCorrect ? '正解' : '不正解');
    console.log('✅ 位置の判定:', samePosition ? '同じ位置' : '違う位置', '→', positionButtonPressed ? 'ボタン押下' : 'ボタン未押下', '→', positionCorrect ? '正解' : '不正解');
    console.log('🏆 総合判定:', isCorrect ? '✅ 正解！' : '❌ 不正解！');
    
    // スコア計算対象かどうか
    const isScored = currentIndex >= nLevel + (trials.length - nLevel - SCORED_TRIALS);
    
    console.log('📈 スコア対象:', isScored, `(${currentIndex} >= ${nLevel + (trials.length - nLevel - SCORED_TRIALS)})`);
    console.log('🎯 試行総数:', trials.length);
    
    // 楽しいフィードバックメッセージ
    let feedbackMessage = '';
    if (isCorrect) {
      const successMessages = [
        '🌟 すごい！',
        '✨ やったね！',
        '🎉 せいかい！',
        '🌈 ばっちり！',
        '⭐ すばらしい！',
        '🎊 だいせいかい！'
      ];
      feedbackMessage = successMessages[Math.floor(Math.random() * successMessages.length)];
    } else if (colorCorrect || positionCorrect) {
      const partialMessages = [
        '😊 おしい！',
        '🤗 もうすこし！',
        '💪 がんばって！',
        '🌸 あとちょっと！'
      ];
      feedbackMessage = partialMessages[Math.floor(Math.random() * partialMessages.length)];
    } else {
      const tryAgainMessages = [
        '🤔 もう一度！',
        '🌟 つぎがんばろう！',
        '😄 だいじょうぶ！',
        '🎈 また挑戦！'
      ];
      feedbackMessage = tryAgainMessages[Math.floor(Math.random() * tryAgainMessages.length)];
    }
    
    setGameState(prev => ({
      ...prev,
      score: prev.score + (isCorrect && isScored ? 1 : 0),
      totalTrials: prev.totalTrials + (isScored ? 1 : 0),
      scoredTrialsCount: prev.scoredTrialsCount + (isScored ? 1 : 0),
      lastResponseCorrect: isCorrect,
      showingFeedback: true,
      lastFeedbackMessage: feedbackMessage,
    }));
    
    // 楽しいフィードバックアニメーション
    if (isCorrect) {
      // 正解時の紙吹雪エフェクト
      Animated.parallel([
        Animated.sequence([
          Animated.timing(feedbackAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.elastic(1.5),
            useNativeDriver: true,
          }),
          Animated.timing(feedbackAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(confettiAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(confettiAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      // 間違い時の優しいアニメーション
      Animated.sequence([
        Animated.timing(feedbackAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(feedbackAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [gameState, feedbackAnim, confettiAnim, bounceAnim]);

  // 次の試行を表示
  const showNextTrial = useCallback(() => {
    const { trials, currentIndex, nLevel } = gameState;
    
    // アニメーション値をリセット
    fadeAnim.setValue(0);
    scaleAnim.setValue(1);
    glowAnim.setValue(0);
    sparkleAnim.setValue(0);
    
    if (currentIndex >= trials.length) {
      // ゲーム終了
      setGameState(prev => ({
        ...prev,
        gamePhase: 'finished',
        isPlaying: false,
        showingStimulus: false,
        buttonsEnabled: false,
      }));
      return;
    }

    // タイルを表示
    setGameState(prev => ({
      ...prev,
      showingStimulus: true,
      buttonsEnabled: currentIndex >= nLevel, // N回目以降はボタンを有効化
      colorButtonPressed: false,
      positionButtonPressed: false,
      showingFeedback: false,
    }));

    // 魔法のようなキラキラ登場アニメーション
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FADE_IN_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 300,
          easing: Easing.elastic(1.2),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
    
    // キラキラエフェクト
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2秒後にキラキラ消失アニメーション
    setTimeout(() => {
      // アニメーションを停止してリセット
      glowAnim.stopAnimation();
      sparkleAnim.stopAnimation();
      glowAnim.setValue(0);
      sparkleAnim.setValue(0);
      
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: FADE_OUT_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 判定を先に実行（currentIndexが変わる前に）
        if (currentIndex >= nLevel) {
          // 現在の状態で判定を実行
          evaluateResponseWithCurrentState(currentIndex, nLevel, gameState.colorButtonPressed, gameState.positionButtonPressed);
        }
        
        // 次の試行へ進む
        setGameState(prev => ({
          ...prev,
          currentIndex: prev.currentIndex + 1,
          showingStimulus: false,
          buttonsEnabled: false,
        }));
      });
    }, TILE_DISPLAY_DURATION - FADE_OUT_DURATION);
  }, [gameState, fadeAnim, scaleAnim, glowAnim, sparkleAnim, evaluateResponseWithCurrentState]);

  // ボタン押下ハンドラー
  const handleButtonPress = useCallback((buttonType: 'color' | 'position') => {
    if (!gameState.buttonsEnabled) return;
    
    // ボタン押下時の楽しいアニメーション
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
    ]).start();
    
    setGameState(prev => ({
      ...prev,
      [buttonType + 'ButtonPressed']: true,
    }));
  }, [gameState.buttonsEnabled, bounceAnim]);

  // ゲームループ
  useEffect(() => {
    if (gameState.isPlaying && gameState.gamePhase === 'playing') {
      const timer = setTimeout(() => {
        showNextTrial();
      }, gameState.currentIndex === 0 ? 1000 : 3000); // 最初の試行は1秒待機、その後は3秒間隔（2秒表示+1秒休憩）

      return () => clearTimeout(timer);
    }
  }, [gameState.isPlaying, gameState.currentIndex, gameState.gamePhase, showNextTrial]);

  // 現在のタイル情報を取得
  const getCurrentTile = () => {
    const { trials, currentIndex } = gameState;
    if (currentIndex >= trials.length || !gameState.showingStimulus) return null;
    return trials[currentIndex];
  };

  const currentTile = getCurrentTile();

  // タイルを描画
  const renderTile = (index: number) => {
    const isActive = currentTile && currentTile.position === index;
    const row = Math.floor(index / 3);
    const col = index % 3;
    
    return (
      <Animated.View
        key={index}
        style={[
          styles.tile,
          {
            width: tileSize,
            height: tileSize,
            left: col * (tileSize + 8),
            top: row * (tileSize + 8),
            opacity: isActive ? fadeAnim : 0.2,
            transform: [{ scale: isActive ? scaleAnim : 1 }],
          },
        ]}
      >
        <LinearGradient
          colors={isActive ? 
            [currentTile.color, '#FFFFFF', currentTile.color] : 
            ['#F0F0F0', '#FFFFFF', '#F0F0F0']
          }
          style={styles.tileGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {/* キラキラエフェクト */}
        {isActive && (
          <Animated.View
            style={[
              styles.sparkleOverlay,
              {
                opacity: sparkleAnim,
                transform: [{
                  rotate: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                }],
              },
            ]}
          >
            <Text style={styles.sparkleText}>✨</Text>
          </Animated.View>
        )}
        {/* 光のリング */}
        {isActive && (
          <Animated.View
            style={[
              styles.glowRing,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
                transform: [{
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                }],
              },
            ]}
          />
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 美しい動的背景 */}
      <LinearGradient
        colors={['#FF69B4', '#FFB6C1', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* キラキラ背景エフェクト */}
      <View style={styles.sparkleBackground}>
        {Array.from({ length: 15 }, (_, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.backgroundStar,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: sparkleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
                transform: [{
                  scale: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.2],
                  }),
                }],
              },
            ]}
          >
            {['⭐', '✨', '🌟', '💫', '🌈'][Math.floor(Math.random() * 5)]}
          </Animated.Text>
        ))}
      </View>
      <View style={styles.mainContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>🌟 メモリークエスト 🌟</Text>
          <View style={styles.decorativeStars}>
            <Text style={styles.decorativeStar}>⭐</Text>
            <Text style={styles.decorativeStar}>💫</Text>
            <Text style={styles.decorativeStar}>🌟</Text>
          </View>
        </View>
      
      {gameState.gamePhase === 'setup' && (
        <View style={styles.setupContainer}>
          <Text style={styles.setupText}>🎮 レベルを選んでね！ 🎮</Text>
          
          <Pressable
            style={styles.rulesButton}
            onPress={() => setGameState(prev => ({ ...prev, gamePhase: 'rules' }))}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500', '#FFD700']}
              style={styles.rulesButtonGradient}
            >
              <Text style={styles.rulesButtonText}>📖 あそびかたをかくにん 📖</Text>
            </LinearGradient>
          </Pressable>
          
          <View style={styles.levelButtons}>
            {[1, 2, 3].map(level => (
              <Pressable
                key={level}
                style={[styles.levelButton, { backgroundColor: COLORS[level - 1] }]}
                onPress={() => startGame(level)}
              >
                <LinearGradient
                  colors={[COLORS[level - 1], '#FFFFFF']}
                  style={styles.levelButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.levelButtonText}>🌟 レベル {level} 🌟</Text>
                  <Text style={styles.levelDescription}>
                    {level === 1 && '１つまえをおぼえよう！'}
                    {level === 2 && '２つまえをおぼえよう！'}
                    {level === 3 && '３つまえをおぼえよう！'}
                  </Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {gameState.gamePhase === 'rules' && (
        <View style={styles.rulesContainer}>
          <Text style={styles.rulesTitle}>📖 あそびかた 📖</Text>
          
          <View style={styles.rulesContent}>
            <Text style={styles.rulesText}>
              🌟 このゲームはおぼえるちからをきたえるゲームだよ！
            </Text>
            
            <Text style={styles.rulesStep}>🔥 あそびかた</Text>
            <Text style={styles.rulesDetail}>
              • いろんないろのタイルがひとつずつひかるよ
              {"\n"}• まえに出たタイルとおなじかどうかおぼえてね
              {"\n"}• おなじだったらボタンをおしてね！
            </Text>
            
            <Text style={styles.rulesStep}>🎨 つかういろ</Text>
            <Text style={styles.rulesDetail}>
              タイルは3つのいろだよ：あか、あお、きいろ
            </Text>
            
            <Text style={styles.rulesStep}>🎯 ボタンのつかいかた</Text>
            <Text style={styles.rulesDetail}>
              🎨 「いろ」ボタン：いろがおなじとき
              {"\n"}📍 「ばしょ」ボタン：ばしょがおなじとき
            </Text>
            
            <Text style={styles.rulesStep}>🎆 レベルのちがい</Text>
            <Text style={styles.rulesDetail}>
              レベル１：１つまえのタイルとくらべる
              {"\n"}レベル２：２つまえのタイルとくらべる
              {"\n"}レベル３：３つまえのタイルとくらべる
            </Text>
          </View>
          
          <Pressable
            style={styles.backButton}
            onPress={() => setGameState(prev => ({ ...prev, gamePhase: 'setup' }))}
          >
            <LinearGradient
              colors={['#FF69B4', '#FF1493', '#FF69B4']}
              style={styles.backButtonGradient}
            >
              <Text style={styles.backButtonText}>🔙 もどる</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {gameState.gamePhase === 'playing' && (
        <View style={styles.gameContainer}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>てんすう: {gameState.score}/{gameState.totalTrials}</Text>
            <Text style={styles.levelText}>レベル: {gameState.nLevel}</Text>
          </View>
          
          <View style={[styles.grid, { width: gridSize, height: gridSize }]}>
            {Array.from({ length: 9 }, (_, i) => renderTile(i))}
          </View>
          
          {/* 子供向けの大きなボタンをグリッド直下に配置 */}
          <View style={styles.buttonsContainer}>
            <Animated.View
              style={{
                transform: [{
                  scale: bounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                }],
              }}
            >
              <Pressable
                style={[
                  styles.gameButton,
                  styles.colorButton,
                  { opacity: gameState.buttonsEnabled ? 1 : 0.5 },
                  gameState.colorButtonPressed && styles.gameButtonPressed,
                ]}
                onPress={() => handleButtonPress('color')}
                disabled={!gameState.buttonsEnabled}
              >
                <LinearGradient
                  colors={gameState.colorButtonPressed ? 
                    ['#FFD700', '#FFA500', '#FFD700'] : 
                    ['#FF69B4', '#FF1493', '#FF69B4']
                  }
                  style={[
                    styles.buttonGradient,
                    gameState.colorButtonPressed && styles.selectedButtonGradient
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[
                    styles.buttonText,
                    gameState.colorButtonPressed && styles.selectedButtonText
                  ]}>
                    {gameState.colorButtonPressed ? '✨ いろ えらんだ ✨' : '🎨 いろ 🎨'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
            
            <Animated.View
              style={{
                transform: [{
                  scale: bounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                }],
              }}
            >
              <Pressable
                style={[
                  styles.gameButton,
                  styles.positionButton,
                  { opacity: gameState.buttonsEnabled ? 1 : 0.5 },
                  gameState.positionButtonPressed && styles.gameButtonPressed,
                ]}
                onPress={() => handleButtonPress('position')}
                disabled={!gameState.buttonsEnabled}
              >
                <LinearGradient
                  colors={gameState.positionButtonPressed ? 
                    ['#FFD700', '#FFA500', '#FFD700'] : 
                    ['#00CED1', '#20B2AA', '#00CED1']
                  }
                  style={[
                    styles.buttonGradient,
                    gameState.positionButtonPressed && styles.selectedButtonGradient
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[
                    styles.buttonText,
                    gameState.positionButtonPressed && styles.selectedButtonText
                  ]}>
                    {gameState.positionButtonPressed ? '✨ ばしょ えらんだ ✨' : '📍 ばしょ 📍'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
          
          {/* 楽しいフィードバック表示 */}
          {gameState.showingFeedback && (
            <Animated.View
              style={[
                styles.feedbackContainer,
                {
                  opacity: feedbackAnim,
                  transform: [{
                    translateY: feedbackAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  }, {
                    scale: feedbackAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  }],
                },
              ]}
            >
              <LinearGradient
                colors={gameState.lastResponseCorrect ? 
                  ['#FFD700', '#FFA500', '#FFD700'] : 
                  ['#FF6B6B', '#FF4757', '#FF6B6B']
                }
                style={styles.feedbackGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[
                  styles.feedbackText,
                  !gameState.lastResponseCorrect && styles.incorrectFeedbackText
                ]}>{gameState.lastFeedbackMessage}</Text>
              </LinearGradient>
            </Animated.View>
          )}
          
          {/* 正解時の紙吹雪エフェクト */}
          {gameState.showingFeedback && gameState.lastResponseCorrect && (
            <Animated.View
              style={[
                styles.confettiContainer,
                {
                  opacity: confettiAnim,
                  transform: [{
                    translateY: confettiAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-50, 200],
                    }),
                  }],
                },
              ]}
            >
              <Text style={styles.confetti}>🎉</Text>
              <Text style={styles.confetti}>🎊</Text>
              <Text style={styles.confetti}>✨</Text>
              <Text style={styles.confetti}>🌟</Text>
              <Text style={styles.confetti}>⭐</Text>
            </Animated.View>
          )}
        </View>
      )}

      {gameState.gamePhase === 'finished' && (
        <View style={styles.resultContainer}>
          {/* 最終的な大祝福エフェクト */}
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
                    }, {
                      scale: confettiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    }],
                  },
                ]}
              >
                {['🎉', '🎊', '✨', '🌟', '⭐', '💫', '🎈', '🎁'][Math.floor(Math.random() * 8)]}
              </Animated.Text>
            ))}
          </View>
          
          <Animated.Text 
            style={[
              styles.resultTitle,
              {
                transform: [{
                  scale: bounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                }],
              },
            ]}
          >
            🎉 ゲームおわり！ 🎉
          </Animated.Text>
          
          <View style={styles.resultScoreContainer}>
            <Text style={styles.resultScore}>
              🌟 さいしゅうてんすう: {gameState.score}/{gameState.totalTrials} 🌟
            </Text>
            <Text style={styles.resultPercentage}>
              💫 せいかいりつ: {Math.round((gameState.score / Math.max(gameState.totalTrials, 1)) * 100)}% 💫
            </Text>
            {gameState.score / Math.max(gameState.totalTrials, 1) >= 0.8 && (
              <Text style={styles.excellentMessage}>🏆 すごい！おぼえるのがじょうずだね！ 🏆</Text>
            )}
          </View>
          
          <View style={styles.resultButtonsContainer}>
            <Pressable
              style={[styles.restartButton, styles.resultButton]}
              onPress={() => {
                // 終了時の祝福アニメーション開始
                Animated.parallel([
                  Animated.timing(confettiAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                  }),
                  Animated.timing(bounceAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.bounce,
                    useNativeDriver: true,
                  }),
                ]).start();
                
                setTimeout(() => {
                  setGameState(prev => ({
                    ...prev,
                    gamePhase: 'playing',
                    currentIndex: 0,
                    score: 0,
                    totalTrials: 0,
                    scoredTrialsCount: 0,
                    colorButtonPressed: false,
                    positionButtonPressed: false,
                    showingFeedback: false,
                  }));
                  confettiAnim.setValue(0);
                  bounceAnim.setValue(0);
                }, 1000);
              }}
            >
              <LinearGradient
                colors={['#FF69B4', '#FF1493', '#FF69B4']}
                style={styles.restartButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.restartButtonText}>🎮 もういちど 🎮</Text>
              </LinearGradient>
            </Pressable>
            
            <Pressable
              style={[styles.homeButton, styles.resultButton]}
              onPress={() => {
                setGameState(prev => ({
                  ...prev,
                  gamePhase: 'setup',
                  currentIndex: 0,
                  score: 0,
                  totalTrials: 0,
                  scoredTrialsCount: 0,
                  colorButtonPressed: false,
                  positionButtonPressed: false,
                  showingFeedback: false,
                }));
                confettiAnim.setValue(0);
                bounceAnim.setValue(0);
              }}
            >
              <LinearGradient
                colors={['#00CED1', '#20B2AA', '#00CED1']}
                style={styles.homeButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.homeButtonText}>🏠 トップにもどる 🏠</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
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
    color: '#FFD700',
  },
  mainContent: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    zIndex: 2,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 10,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  decorativeStars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 80,
  },
  decorativeStar: {
    fontSize: 24,
    color: '#FFD700',
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupText: {
    fontSize: 22,
    color: '#FF1493',
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: 'bold',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  levelButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  levelButton: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginHorizontal: 10,
  },
  levelButtonGradient: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gameContainer: {
    flex: 1,
    alignItems: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 18,
    color: '#FF1493',
    fontWeight: 'bold',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  levelText: {
    fontSize: 18,
    color: '#FF1493',
    fontWeight: 'bold',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  grid: {
    position: 'relative',
    marginBottom: 30,
  },
  tile: {
    position: 'absolute',
    borderRadius: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  tileGradient: {
    flex: 1,
    borderRadius: 15,
  },
  sparkleOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    zIndex: 10,
  },
  sparkleText: {
    fontSize: 16,
    color: '#FFD700',
  },
  glowRing: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFD700',
    opacity: 0.6,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  gameButton: {
    paddingHorizontal: 35,
    paddingVertical: 20,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginHorizontal: 10,
  },
  buttonGradient: {
    paddingHorizontal: 35,
    paddingVertical: 20,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButton: {
    backgroundColor: '#FF69B4',
  },
  positionButton: {
    backgroundColor: '#00CED1',
  },
  gameButtonPressed: {
    transform: [{ scale: 0.95 }],
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  feedbackContainer: {
    position: 'absolute',
    bottom: 100,
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  feedbackGradient: {
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  incorrectFeedbackText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: '#8B0000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  confettiContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 20,
  },
  confetti: {
    fontSize: 30,
    color: '#FFD700',
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
  excellentMessage: {
    fontSize: 20,
    color: '#FF69B4',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 15,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  rulesButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginBottom: 25,
  },
  rulesButtonGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulesButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  levelDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.9,
  },
  rulesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  rulesTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 30,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  rulesContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  rulesText: {
    fontSize: 20,
    color: '#FF1493',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  rulesStep: {
    fontSize: 18,
    color: '#FF6347',
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  rulesDetail: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 24,
    marginBottom: 10,
  },
  backButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  backButtonGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  selectedButtonGradient: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  selectedButtonText: {
    fontSize: 18,
    color: '#000',
    fontWeight: 'bold',
  },
  resultButtonsContainer: {
    flexDirection: 'row',
    gap: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultButton: {
    flex: 1,
    maxWidth: 150,
  },
  homeButton: {
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  homeButtonGradient: {
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF1493',
    marginBottom: 30,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  resultScoreContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  resultScore: {
    fontSize: 26,
    color: '#FF1493',
    fontWeight: 'bold',
    marginBottom: 15,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  resultPercentage: {
    fontSize: 22,
    color: '#00CED1',
    fontWeight: 'bold',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  restartButton: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  restartButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});