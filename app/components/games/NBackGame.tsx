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
  isPreparationPhase: boolean;
}

const COLORS = ['#FF0000', '#0000FF', '#FFFF00']; // あか、あお、きいろ
const SCORED_TRIALS = 20; // スコア計算対象の問題数
const TILE_DISPLAY_DURATION = 2000; // タイル表示時間（2秒間）
const FADE_IN_DURATION = 500;        // フェードイン時間（0.5秒）
const FADE_OUT_DURATION = 500;       // フェードアウト時間（0.5秒）

// デバッグ用ヘルパー関数
const getPositionName = (position: number): string => {
  const positions = [
    '左上', '中上', '右上',
    '左中', '中央', '右中', 
    '左下', '中下', '右下'
  ];
  return positions[position] || `位置${position}`;
};

const getColorName = (color: string): string => {
  switch(color) {
    case '#FF0000': return 'あか';
    case '#0000FF': return 'あお';
    case '#FFFF00': return 'きいろ';
    default: return color;
  }
};

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
    isPreparationPhase: false,
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
      isPreparationPhase: false,
    }));
  }, [generateTrials]);

  // 同期的な判定実行関数
  const executeEvaluation = useCallback((currentIndex: number, nLevel: number, colorButtonPressed: boolean, positionButtonPressed: boolean) => {
    const { trials } = gameState;
    
    // 🔍 各レベル専用デバッグ情報
    if (nLevel === 1) {
      console.log('🔥 === レベル1専用デバッグ ===');
      console.log(`📍 現在の試行: ${currentIndex}, 比較対象: ${currentIndex - 1}`);
      console.log(`🎯 実際の比較: trials[${currentIndex}] vs trials[${currentIndex - 1}]`);
    }
    
    if (nLevel === 2) {
      console.log('🔥 === レベル2専用デバッグ ===');
      console.log(`📍 現在の試行: ${currentIndex}, 比較対象: ${currentIndex - 2}`);
      console.log(`🎯 実際の比較: trials[${currentIndex}] vs trials[${currentIndex - 2}]`);
    }
    
    if (nLevel === 3) {
      console.log('🔥 === レベル3専用デバッグ ===');
      console.log(`📍 現在の試行: ${currentIndex}, 比較対象: ${currentIndex - 3}`);
      console.log(`🎯 実際の比較: trials[${currentIndex}] vs trials[${currentIndex - 3}]`);
    }
    
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
    console.log('📊 レベル:', nLevel, '（' + nLevel + 'つ前と比較）');
    console.log('📊 現在のインデックス:', currentIndex);
    console.log('📊 比較対象インデックス:', compareIndex, '（' + nLevel + 'つ前）');
    console.log('🎯 現在のタイル:', {
      index: currentIndex,
      position: currentTrial.position,
      color: currentTrial.color,
      positionName: getPositionName(currentTrial.position),
      colorName: getColorName(currentTrial.color)
    });
    console.log('🎯 比較対象タイル:', {
      index: compareIndex,
      position: nBackTrial.position,
      color: nBackTrial.color,
      positionName: getPositionName(nBackTrial.position),
      colorName: getColorName(nBackTrial.color)
    });
    console.log('🎮 プレイヤーの操作:');
    console.log('   - いろボタン:', colorButtonPressed ? '✅ 押した' : '❌ 押さない');
    console.log('   - ばしょボタン:', positionButtonPressed ? '✅ 押した' : '❌ 押さない');
    
    // 最終安全性チェック
    if (!currentTrial || !nBackTrial) {
      console.error('❌ タイルデータが不正です！', { currentTrial, nBackTrial });
      return;
    }
    
    const samePosition = currentTrial.position === nBackTrial.position;
    const sameColor = currentTrial.color === nBackTrial.color;
    
    console.log('🎯 位置が同じ:', samePosition, `(${currentTrial.position} === ${nBackTrial.position})`);
    console.log('🎨 色が同じ:', sameColor, `(${currentTrial.color} === ${nBackTrial.color})`);
    
    // 🔍 レベル1専用：1つ前との比較確認
    if (nLevel === 1) {
      console.log('🔥 === レベル1：1つ前との比較詳細 ===');
      console.log(`📍 現在のタイル[${currentIndex}]: 位置${currentTrial.position}, 色${currentTrial.color}`);
      console.log(`📍 1つ前のタイル[${compareIndex}]: 位置${nBackTrial.position}, 色${nBackTrial.color}`);
      console.log(`🎯 位置判定: ${currentTrial.position} === ${nBackTrial.position} → ${samePosition}`);
      console.log(`🎨 色判定: ${currentTrial.color} === ${nBackTrial.color} → ${sameColor}`);
    }
    
    // 🔍 レベル2専用：2つ前との比較確認
    if (nLevel === 2) {
      console.log('🔥 === レベル2：2つ前との比較詳細 ===');
      console.log(`📍 現在のタイル[${currentIndex}]: 位置${currentTrial.position}, 色${currentTrial.color}`);
      console.log(`📍 2つ前のタイル[${compareIndex}]: 位置${nBackTrial.position}, 色${nBackTrial.color}`);
      console.log(`🎯 位置判定: ${currentTrial.position} === ${nBackTrial.position} → ${samePosition}`);
      console.log(`🎨 色判定: ${currentTrial.color} === ${nBackTrial.color} → ${sameColor}`);
    }
    
    // 🔍 レベル3専用：3つ前との比較確認
    if (nLevel === 3) {
      console.log('🔥 === レベル3：3つ前との比較詳細 ===');
      console.log(`📍 現在のタイル[${currentIndex}]: 位置${currentTrial.position}, 色${currentTrial.color}`);
      console.log(`📍 3つ前のタイル[${compareIndex}]: 位置${nBackTrial.position}, 色${nBackTrial.color}`);
      console.log(`🎯 位置判定: ${currentTrial.position} === ${nBackTrial.position} → ${samePosition}`);
      console.log(`🎨 色判定: ${currentTrial.color} === ${nBackTrial.color} → ${sameColor}`);
    }
    
    // 🔥 完璧な正誤判定ロジック
    console.log('🔍 === 判定ロジック詳細分析 ===');
    console.log(`🎯 比較結果: 位置${samePosition ? '同じ' : '違う'}, 色${sameColor ? '同じ' : '違う'}`);
    console.log(`🎮 ボタン状況: いろ${colorButtonPressed ? '押下' : '未押下'}, ばしょ${positionButtonPressed ? '押下' : '未押下'}`);
    
    // 色の判定：同じ色なら「いろ」ボタンを押すべき、違う色なら押さないべき
    const colorCorrect = (sameColor && colorButtonPressed) || (!sameColor && !colorButtonPressed);
    console.log(`🎨 色判定詳細: sameColor=${sameColor}, colorButtonPressed=${colorButtonPressed}`);
    console.log(`🎨 色判定結果: (${sameColor} && ${colorButtonPressed}) || (!${sameColor} && !${colorButtonPressed}) = ${colorCorrect}`);
    
    // 位置の判定：同じ位置なら「ばしょ」ボタンを押すべき、違う位置なら押さないべき
    const positionCorrect = (samePosition && positionButtonPressed) || (!samePosition && !positionButtonPressed);
    console.log(`📍 位置判定詳細: samePosition=${samePosition}, positionButtonPressed=${positionButtonPressed}`);
    console.log(`📍 位置判定結果: (${samePosition} && ${positionButtonPressed}) || (!${samePosition} && !${positionButtonPressed}) = ${positionCorrect}`);
    
    // 総合判定：両方正解で初めて正解
    const isCorrect = colorCorrect && positionCorrect;
    console.log(`🏆 総合判定: ${colorCorrect} && ${positionCorrect} = ${isCorrect}`);
    console.log('🔍 === 判定ロジック分析終了 ===');
    
    // スコア計算対象かどうか（シンプルで確実な方法）
    // 最初のnLevel個は練習問題、その後のSCORED_TRIALS個がスコア対象
    const practiceTrials = nLevel;
    const scoringStartIndex = practiceTrials;
    const scoringEndIndex = practiceTrials + SCORED_TRIALS - 1;
    const isScored = currentIndex >= scoringStartIndex && currentIndex <= scoringEndIndex;
    
    console.log('📈 スコア計算詳細:');
    console.log('   練習問題数:', practiceTrials);
    console.log('   スコア対象開始:', scoringStartIndex);
    console.log('   スコア対象終了:', scoringEndIndex);
    console.log('   現在のインデックス:', currentIndex);
    console.log('   スコア対象:', isScored);
    console.log('🎯 試行総数:', trials.length);
    
    // シンプルなフィードバックメッセージ（正解 or 不正解）
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
    } else {
      const incorrectMessages = [
        '🤔 もう一度！',
        '🌟 つぎがんばろう！',
        '😄 だいじょうぶ！',
        '🎈 また挑戦！',
        '💪 がんばって！',
        '🤗 つぎはできるよ！'
      ];
      feedbackMessage = incorrectMessages[Math.floor(Math.random() * incorrectMessages.length)];
    }
    
    // 結果オブジェクトを返す（setGameStateは呼ばない）
    const result = {
      isCorrect,
      feedbackMessage,
      scoreIncrement: isCorrect && isScored ? 1 : 0,
      totalTrialsIncrement: isScored ? 1 : 0,
      scoredTrialsIncrement: isScored ? 1 : 0,
    };
    
    // アニメーションは showNextTrial 内で実行するため、ここでは結果のみ返す
    
    return result;
  }, [gameState]);

  // 次の試行を表示
  const showNextTrial = useCallback(() => {
    const { currentIndex, nLevel } = gameState;
    
    console.log(`🚀 showNextTrial実行開始: currentIndex=${currentIndex}, nLevel=${nLevel}`);
    
    // アニメーション値をリセット
    fadeAnim.setValue(0);
    scaleAnim.setValue(1);
    glowAnim.setValue(0);
    sparkleAnim.setValue(0);
    
    // ゲーム終了条件を修正
    const practiceTrials = nLevel;
    const totalRequiredTrials = practiceTrials + SCORED_TRIALS;
    
    if (currentIndex >= totalRequiredTrials) {
      console.log(`🏁 ゲーム終了: currentIndex=${currentIndex} >= totalRequiredTrials=${totalRequiredTrials}`);
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

    // 準備フェーズの範囲外チェック
    if (currentIndex >= nLevel) {
      const practiceTrials = nLevel;
      const totalRequiredTrials = practiceTrials + SCORED_TRIALS;
      
      if (currentIndex >= totalRequiredTrials) {
        console.log(`🏁 範囲外アクセス防止: currentIndex=${currentIndex} >= totalRequiredTrials=${totalRequiredTrials}`);
        return;
      }
    }

    // タイルを表示
    const isPreparationPhase = currentIndex < nLevel;
    console.log(`🎯 フェーズ判定: currentIndex=${currentIndex}, nLevel=${nLevel}, isPreparationPhase=${isPreparationPhase}`);
    console.log(`🎯 準備フェーズ詳細: レベル${nLevel}は${nLevel}回の準備が必要、現在${currentIndex + 1}回目`);
    
    if (isPreparationPhase) {
      console.log(`✅ 準備フェーズ実行中: ${currentIndex + 1}/${nLevel}`);
    } else {
      console.log(`🚀 本番フェーズ開始: ${currentIndex + 1}回目 (比較対象: ${currentIndex - nLevel + 1}回目)`);
    }
    
    setGameState(prev => ({
      ...prev,
      showingStimulus: true,
      buttonsEnabled: !isPreparationPhase, // 準備フェーズではボタン無効
      // ボタン状態は新しいタイル表示時のみリセット（判定前ではない）
      colorButtonPressed: false,
      positionButtonPressed: false,
      showingFeedback: false,
      isPreparationPhase: isPreparationPhase,
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
        // レベル1: 1つ前と比較するので、currentIndex >= 1 で判定開始
        // レベル2: 2つ前と比較するので、currentIndex >= 2 で判定開始  
        // レベル3: 3つ前と比較するので、currentIndex >= 3 で判定開始
        // 🔧 完全修正: すべてsetGameState内で現在の状態を使用し、判定も同期的に処理
        setGameState(prev => {
          const currentIdx = prev.currentIndex;
          console.log(`🎯 判定チェック: currentIndex=${currentIdx}, nLevel=${nLevel}`);
          
          let evaluationResult = null;
          
          if (currentIdx >= nLevel) {
            console.log(`🎯 判定実行: currentIndex=${currentIdx}, nLevel=${nLevel}`);
            console.log(`🎮 判定時ボタン状態: color=${prev.colorButtonPressed}, position=${prev.positionButtonPressed}`);
            console.log(`🔥 重要: これらのボタン状態で判定を実行します！`);
            
            // 同期的に判定を実行
            evaluationResult = executeEvaluation(currentIdx, nLevel, prev.colorButtonPressed, prev.positionButtonPressed);
          } else {
            console.log(`⏭️ 判定スキップ: currentIndex=${currentIdx} < nLevel=${nLevel} (まだ比較できない)`);
          }
          
          // 次の試行へ進む（ボタン状態もリセット）
          const newIndex = currentIdx + 1;
          console.log(`🔄 インデックス更新: ${currentIdx} → ${newIndex}`);
          
          // 判定結果をstateに反映
          const baseNewState = {
            ...prev,
            currentIndex: newIndex,
            showingStimulus: false,
            buttonsEnabled: false,
            colorButtonPressed: false,
            positionButtonPressed: false,
          };
          
          if (evaluationResult) {
            // フィードバックアニメーションを実行
            setTimeout(() => {
              if (evaluationResult.isCorrect) {
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
            }, 100);
            
            return {
              ...baseNewState,
              score: prev.score + evaluationResult.scoreIncrement,
              totalTrials: prev.totalTrials + evaluationResult.totalTrialsIncrement,
              scoredTrialsCount: prev.scoredTrialsCount + evaluationResult.scoredTrialsIncrement,
              lastResponseCorrect: evaluationResult.isCorrect,
              showingFeedback: true,
              lastFeedbackMessage: evaluationResult.feedbackMessage,
            };
          }
          
          return baseNewState;
        });
        
      });
      
    }, TILE_DISPLAY_DURATION - FADE_OUT_DURATION);
  }, [gameState, fadeAnim, scaleAnim, glowAnim, sparkleAnim, executeEvaluation, feedbackAnim, confettiAnim, bounceAnim]);

  // ボタン押下ハンドラー
  const handleButtonPress = useCallback((buttonType: 'color' | 'position') => {
    if (!gameState.buttonsEnabled) {
      console.log(`🚫 ボタン無効: ${buttonType}ボタンが押されましたが無効です`);
      return;
    }
    
    console.log(`🎮 ボタン押下: ${buttonType}ボタンが押されました`);
    console.log(`🎮 押下前状態: color=${gameState.colorButtonPressed}, position=${gameState.positionButtonPressed}`);
    
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
    
    setGameState(prev => {
      const newState = {
        ...prev,
        [buttonType + 'ButtonPressed']: true,
      };
      console.log(`🎮 押下後状態: color=${buttonType === 'color' ? true : prev.colorButtonPressed}, position=${buttonType === 'position' ? true : prev.positionButtonPressed}`);
      return newState;
    });
  }, [gameState.buttonsEnabled, gameState.colorButtonPressed, gameState.positionButtonPressed, bounceAnim]);

  // ゲームループ：開始時のみ実行
  useEffect(() => {
    if (gameState.isPlaying && gameState.gamePhase === 'playing' && gameState.currentIndex === 0) {
      console.log(`🎮 ゲーム開始: レベル${gameState.nLevel}で新しいゲームを開始`);
      
      // 最初のタイルを表示
      const timer = setTimeout(() => {
        console.log(`🎮 最初のタイル表示開始`);
        showNextTrial();
      }, 1000);

      return () => {
        console.log(`🎮 開始タイマーをクリア`);
        clearTimeout(timer);
      };
    }
  }, [gameState.isPlaying, gameState.gamePhase]);

  // 自動進行ループ：currentIndexが更新されたときに次のタイルを表示
  useEffect(() => {
    if (gameState.isPlaying && gameState.gamePhase === 'playing' && gameState.currentIndex > 0) {
      const practiceTrials = gameState.nLevel;
      const totalRequiredTrials = practiceTrials + SCORED_TRIALS;
      
      console.log(`🔄 自動進行useEffect: currentIndex=${gameState.currentIndex}, total=${totalRequiredTrials}`);
      
      if (gameState.currentIndex >= totalRequiredTrials) {
        console.log(`🏁 ゲーム終了: ${gameState.currentIndex} >= ${totalRequiredTrials}`);
        setGameState(prev => ({
          ...prev,
          isPlaying: false,
          gamePhase: 'finished'
        }));
        return;
      }
      
      // 次のタイルを表示（タイマーで遅延）
      const timer = setTimeout(() => {
        console.log(`⏭️ 自動進行タイマー実行: ${gameState.currentIndex}回目のタイル表示`);
        showNextTrial();
      }, 3000); // 3秒間隔
      
      return () => {
        console.log(`🔄 自動進行タイマークリア`);
        clearTimeout(timer);
      };
    }
  }, [gameState.currentIndex, gameState.isPlaying, gameState.gamePhase, gameState.nLevel, showNextTrial]);

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
          
          {/* ホームへ戻るボタン */}
          <Pressable
            style={styles.homeButtonSetup}
            onPress={() => {
              // ホーム画面に戻る（ルーターナビゲーションが必要）
              console.log('ホーム画面への遷移');
              // TODO: React Navigationまたはホーム画面へのナビゲーション
            }}
          >
            <LinearGradient
              colors={['#FF6347', '#DC143C', '#FF6347']}
              style={styles.homeButtonSetupGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.homeButtonSetupText}>🏠 ホームにもどる 🏠</Text>
            </LinearGradient>
          </Pressable>
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
          
          {/* フェーズメッセージを固定高さにして、グリッドの位置を安定させる */}
          <View style={styles.messageContainer}>
            {gameState.isPreparationPhase && gameState.currentIndex < gameState.nLevel && (
              <View style={styles.preparationContainer}>
                <Text style={styles.preparationText}>
                  👀 よくみよう 👀
                </Text>
                <Text style={styles.preparationDetail}>
                  {gameState.nLevel === 1 && `1つめのタイルをおぼえよう！ (${gameState.currentIndex + 1}/1)`}
                  {gameState.nLevel === 2 && `${gameState.currentIndex + 1}つめのタイルをおぼえよう！ (${gameState.currentIndex + 1}/2)`}
                  {gameState.nLevel === 3 && `${gameState.currentIndex + 1}つめのタイルをおぼえよう！ (${gameState.currentIndex + 1}/3)`}
                </Text>
              </View>
            )}
            
            {/* 選択開始メッセージ */}
            {!gameState.isPreparationPhase && gameState.currentIndex === gameState.nLevel && gameState.showingStimulus && (
              <View style={styles.startContainer}>
                <Text style={styles.startText}>
                  🚀 はじめ！ 🚀
                </Text>
                <Text style={styles.startDetail}>
                  {gameState.nLevel}つまえとおなじかな？
                </Text>
              </View>
            )}
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
            {/* もういちど */}
            <Pressable
              style={styles.resultButtonWide}
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
                  // 新しい試行データを生成してゲームを再開
                  setGameState(prev => {
                    const newTrials = generateTrials(prev.nLevel);
                    return {
                      ...prev,
                      trials: newTrials,
                      gamePhase: 'playing',
                      currentIndex: 0,
                      score: 0,
                      totalTrials: 0,
                      scoredTrialsCount: 0,
                      colorButtonPressed: false,
                      positionButtonPressed: false,
                      showingFeedback: false,
                      isPreparationPhase: false,
                      showingStimulus: false,
                      buttonsEnabled: false,
                      isPlaying: true,
                    };
                  });
                  confettiAnim.setValue(0);
                  bounceAnim.setValue(0);
                }, 1000);
              }}
            >
              <LinearGradient
                colors={['#FF69B4', '#FF1493', '#FF69B4']}
                style={styles.resultButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.resultButtonText}>🎮 もういちど 🎮</Text>
              </LinearGradient>
            </Pressable>
            
            {/* レベルをえらびなおす */}
            <Pressable
              style={styles.resultButtonWide}
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
                  isPreparationPhase: false,
                  isPlaying: false,
                }));
                confettiAnim.setValue(0);
                bounceAnim.setValue(0);
              }}
            >
              <LinearGradient
                colors={['#32CD32', '#228B22', '#32CD32']}
                style={styles.resultButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.resultButtonText}>🔄 レベルをえらびなおす 🔄</Text>
              </LinearGradient>
            </Pressable>
            
            {/* ホームにもどる */}
            <Pressable
              style={styles.resultButtonWide}
              onPress={() => {
                // ホーム画面に戻る（ルーターナビゲーションが必要）
                console.log('ホーム画面への遷移');
                // TODO: React Navigationまたはホーム画面へのナビゲーション
              }}
            >
              <LinearGradient
                colors={['#FF6347', '#DC143C', '#FF6347']}
                style={styles.resultButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.resultButtonText}>🏠 ホームにもどる 🏠</Text>
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
  messageContainer: {
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  preparationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 3,
    borderColor: '#FFD700',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  preparationText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF1493',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 5,
  },
  preparationDetail: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
    textAlign: 'center',
  },
  startContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#FF4500',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  startText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF4500',
    textShadowColor: '#FFF',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 5,
  },
  startDetail: {
    fontSize: 16,
    color: '#FF1493',
    fontWeight: '600',
    textAlign: 'center',
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
    flexDirection: 'column',
    gap: 15,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  resultButton: {
    flex: 1,
    maxWidth: 150,
  },
  resultButtonWide: {
    width: '100%',
    maxWidth: 350,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  resultButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  homeButtonSetup: {
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    alignSelf: 'center',
  },
  homeButtonSetupGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonSetupText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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