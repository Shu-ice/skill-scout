import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions, ScrollView, Easing } from 'react-native';
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
  awaitingResponse: boolean;
  timeLeft: number;
  gamePhase: 'setup' | 'playing' | 'finished';
  showingFeedback: boolean;
  lastResponseCorrect: boolean;
  scoredTrialsCount: number; // スコア計算対象の問題数
  // ✨ 新ルール: ボタン状態管理
  colorButtonPressed: boolean;
  positionButtonPressed: boolean;
  buttonsEnabled: boolean;
  stimulusCountdown: number; // 刺激表示中のカウントダウン（3秒）
}

// ✨ 新ルール: 簡素化されたレスポンス型
type ResponseType = 'color' | 'position' | 'both' | 'neither';
type ButtonType = 'color' | 'position';

const COLORS = ['#FF4444', '#4444FF', '#FFDD44']; // 赤、青、黄の3色
const SCORED_TRIALS = 20; // スコア計算対象の問題数
// ✨ 新ルール: シームレス演出のための定数更新
const TILE_DISPLAY_DURATION = 2000; // タイル表示時間（2秒間）
const FADE_IN_DURATION = 400;        // フェードイン時間（0.4秒）
const FADE_OUT_DURATION = 400;       // フェードアウト時間（0.4秒）
const STIMULUS_GLOW_TIME = 2;        // カウントダウン時間（2秒）
const RESPONSE_TIME = 3;             // 応答時間（秒）

export default function NBackGame() {
  const [gameState, setGameState] = useState<GameState>({
    trials: [],
    currentIndex: 0,
    nLevel: 1,
    score: 0,
    totalTrials: 0,
    isPlaying: false,
    showingStimulus: false,
    awaitingResponse: false,
    timeLeft: RESPONSE_TIME,
    gamePhase: 'setup',
    showingFeedback: false,
    lastResponseCorrect: false,
    scoredTrialsCount: 0,
    // ✨ 新ルール: ボタン状態の初期化
    colorButtonPressed: false,
    positionButtonPressed: false,
    buttonsEnabled: false,
    stimulusCountdown: STIMULUS_GLOW_TIME,
  });

  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [feedbackAnim] = useState(new Animated.Value(0));
  const [glowAnim] = useState(new Animated.Value(0));
  
  // 超絶エフェクト用アニメーション値
  const [innerGlowAnim] = useState(new Animated.Value(0));
  const [outerGlowAnim] = useState(new Animated.Value(0));
  const [pulseGlowAnim] = useState(new Animated.Value(0));
  const [colorShiftAnim] = useState(new Animated.Value(0));
  const [rippleAnim] = useState(new Animated.Value(0));
  const [ripple2Anim] = useState(new Animated.Value(0));
  const [ripple3Anim] = useState(new Animated.Value(0));
  const [particleAnim] = useState(new Animated.Value(0));
  const [explosionAnim] = useState(new Animated.Value(0));
  const [spiralAnim] = useState(new Animated.Value(0));
  const [liquidAnim] = useState(new Animated.Value(0));
  const [depthAnim] = useState(new Animated.Value(0));
  
  // ✨ 新しいエフェクト用アニメーション値 - 子どもがすごい！と感じるレベル
  const [starBurstAnim] = useState(new Animated.Value(0)); // 星光爆発
  const [rainbowAnim] = useState(new Animated.Value(0)); // 虚虹光輪
  const [heartPulseAnim] = useState(new Animated.Value(0)); // ハートパルス
  const [shockWaveAnim] = useState(new Animated.Value(0)); // 衝撃波
  const [magicCircleAnim] = useState(new Animated.Value(0)); // 魔法陣回転
  const [sparkleAnim] = useState(new Animated.Value(0)); // キラキラスパークル
  const [glitterAnim] = useState(new Animated.Value(0)); // 金粉グリッター
  const [diamondAnim] = useState(new Animated.Value(0)); // ダイヤモンド輝き
  
  // 将来の拡張用エフェクト（現在は使用していません）
  // const [confettiAnim] = useState(new Animated.Value(0)); // 紙吹雪エフェクト
  // const [fireWorkAnim] = useState(new Animated.Value(0)); // 花火エフェクト
  // const [lightningAnim] = useState(new Animated.Value(0)); // 雷エフェクト
  // const [auraAnim] = useState(new Animated.Value(0)); // オーラエフェクト
  
  const [countdownTimer, setCountdownTimer] = useState<NodeJS.Timeout | null>(null);

  // パルスアニメーション
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, [pulseAnim]);

  const generateTrial = useCallback((): Trial => {
    return {
      position: Math.floor(Math.random() * 9),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  }, []);

  const startGame = useCallback((selectedN: number) => {
    console.log('Starting game with N-level:', selectedN);
    
    // n+20問のトライアルデータを生成
    const totalTrials = selectedN + SCORED_TRIALS;
    const newTrials = Array.from({ length: totalTrials }, () => generateTrial());
    console.log('Generated new trials:', newTrials.length);
    
    setGameState({
      trials: newTrials,
      currentIndex: 0,
      nLevel: selectedN,
      score: 0,
      totalTrials: 0,
      isPlaying: true,
      showingStimulus: false,
      awaitingResponse: false,
      timeLeft: RESPONSE_TIME,
      gamePhase: 'playing',
      showingFeedback: false,
      lastResponseCorrect: false,
      scoredTrialsCount: 0,
      // ✨ 新ルール: 新しいフィールドを初期化
      colorButtonPressed: false,
      positionButtonPressed: false,
      buttonsEnabled: false,
      stimulusCountdown: STIMULUS_GLOW_TIME,
    });
    
    // ✨ シームレス演出: 最初のタイルを即座表示
    setTimeout(() => showNextTrial(newTrials, 0, selectedN), 500);
  }, [generateTrial]);

  // ✨ シームレス演出: フェードイン→フェードアウト3秒間、待ち時間なし
  const showNextTrial = useCallback((trials: Trial[], currentIdx: number, nLevel: number) => {
    console.log(`✨ Seamless trial ${currentIdx + 1}/${trials.length}`);
    
    if (currentIdx >= trials.length) {
      console.log('Game ending - reached trial limit');
      endGame();
      return;
    }

    // アニメーションをリセット
    fadeAnim.setValue(0);
    scaleAnim.setValue(1);
    
    // ✨ シームレス演出: タイル表示開始と同時にカウントダウン開始
    setGameState(prev => ({ 
      ...prev, 
      trials: trials,
      currentIndex: currentIdx,
      showingStimulus: true, 
      awaitingResponse: currentIdx >= nLevel, // N回に達しているか即座判定
      showingFeedback: false,
      buttonsEnabled: currentIdx >= nLevel, // ✨ タイル表示と同時にボタン有効化
      stimulusCountdown: STIMULUS_GLOW_TIME,
      colorButtonPressed: false, // ボタン状態リセット
      positionButtonPressed: false,
    }));
    
    // ✨ 子どもが「すごい！」と感じる超美しいシームレスアニメーション
    const seamlessAnimation = Animated.sequence([
      // 🌌 子どもが「わあ！」と感動する超印象的な明滅フェードイン（0.6秒）
      Animated.parallel([
        // ✨ 超印象的な明滅効果 - 魔法のようなフラッシュイン
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: FADE_IN_DURATION + 200,
          easing: Easing.bezier(0.68, -0.55, 0.265, 1.55), // 魔法のような光の出現
          useNativeDriver: true,
        }),
        // 🎆 超ダイナミックなスケールバウンス - 驚きのポップ感
        Animated.spring(scaleAnim, {
          toValue: 1.5,   // さらに大きくバウンス
          friction: 2.5,  // より弾んでおもしろい
          tension: 150,   // よりダイナミック
          useNativeDriver: true,
        }),
        // 🌟 超強烈な光輝エフェクト - 子どもが「キラキラ！」と言うレベル
        Animated.timing(glowAnim, {
          toValue: 1.2,   // 超最大グロー
          duration: FADE_IN_DURATION + 100,
          easing: Easing.bezier(0.68, -0.55, 0.265, 1.55), // 星のような光
          useNativeDriver: true,
        }),
        // 💫 魔法的なパルス効果 - ハートがドキドキ
        Animated.spring(pulseAnim, {
          toValue: 1.3,   // さらに強いパルス
          friction: 3.5,
          tension: 160,
          useNativeDriver: true,
        }),
      ]),
      // 🌱 輝き続ける美しい瞬間（0.8秒）
      Animated.delay(TILE_DISPLAY_DURATION - FADE_IN_DURATION - FADE_OUT_DURATION - 200),
      // 🍃 印象的な明滅フェードアウト（0.6秒）- 余韻を残す劇的な消失
      Animated.parallel([
        // ⚡ 強烈な明滅フェードアウト
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: FADE_OUT_DURATION + 200,
          easing: Easing.bezier(0.6, 0.04, 0.98, 0.335), // 劇的な消失
          useNativeDriver: true,
        }),
        // 🎆 ダイナミックなスケール収束
        Animated.spring(scaleAnim, {
          toValue: 0.7,   // より小さく収束
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        // 🌟 劇的なグロー消失 - 光の爆発的減衰
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: FADE_OUT_DURATION + 300,
          easing: Easing.bezier(0.68, -0.55, 0.265, 1.55), // 弾む消失
          useNativeDriver: true,
        }),
        // 💫 印象的なパルス収束
        Animated.spring(pulseAnim, {
          toValue: 0.95,  // わずかに縮小して余韻
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
    ]);

    // アニメーション開始
    seamlessAnimation.start(() => {
      // ✨ シームレスなフロー：フェードアウト完了と同時に判定・次のタイル開始
      if (currentIdx >= nLevel) {
        // 回答フェーズ：判定とフィードバックを同時に開始
        handleInstantJudgment(trials, currentIdx, nLevel);
      } else {
        // 練習フェーズ：即座次のタイルへシームレス移行
        console.log('✨ Seamless auto-advance to trial', currentIdx + 2);
        setGameState(prev => ({ ...prev, showingStimulus: false }));
        // フェードアウト完了と同時に次のタイルを開始
        setTimeout(() => showNextTrial(trials, currentIdx + 1, nLevel), 50);
      }
    });

    // ✨ N回に達している場合のみカウントダウンタイマー開始
    if (currentIdx >= nLevel) {
      startSeamlessCountdown(trials, currentIdx, nLevel);
    }
  }, [fadeAnim, scaleAnim]);

  // ✨ シームレス演出: タイルアニメーションと同期したカウントダウン
  const startSeamlessCountdown = useCallback((trials: Trial[], currentIdx: number, nLevel: number) => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
    }

    let count = STIMULUS_GLOW_TIME;
    const timer = setInterval(() => {
      count--;
      setGameState(prev => ({ ...prev, stimulusCountdown: count }));
      
      if (count <= 0) {
        clearInterval(timer);
        // タイマーはアニメーションと同時に終了するため、ここでは判定しない
      }
    }, 1000);

    setCountdownTimer(timer as unknown as NodeJS.Timeout);
  }, [countdownTimer]);

  // ✨ シームレス演出: タイル消失瞬間の即座判定（状態を関数型更新で取得）
  const handleInstantJudgment = useCallback((trials: Trial[], currentIdx: number, nLevel: number) => {
    console.log('✨ Instant judgment for seamless trial', currentIdx + 1);
    
    // タイマーをクリア
    if (countdownTimer) {
      clearInterval(countdownTimer);
      setCountdownTimer(null);
    }

    const currentTrial = trials[currentIdx];
    const nBackTrial = trials[currentIdx - nLevel];
    
    const samePosition = currentTrial.position === nBackTrial.position;
    const sameColor = currentTrial.color === nBackTrial.color;
    
    // 🔧 バグ修正: 状態を関数型更新で取得し、判定ロジックを内部で実行
    setGameState(prev => {
      // 現在の最新の状態を取得
      const colorButtonPressed = prev.colorButtonPressed;
      const positionButtonPressed = prev.positionButtonPressed;
      
      // 判定ロジック
      const colorCorrect = (sameColor && colorButtonPressed) || (!sameColor && !colorButtonPressed);
      const positionCorrect = (samePosition && positionButtonPressed) || (!samePosition && !positionButtonPressed);
      const isCorrect = colorCorrect && positionCorrect;
      
      console.log('✨ Fixed Judgement - Color same:', sameColor, 'pressed:', colorButtonPressed, 'correct:', colorCorrect);
      console.log('✨ Fixed Judgement - Position same:', samePosition, 'pressed:', positionButtonPressed, 'correct:', positionCorrect);
      console.log('✨ Overall fixed correct:', isCorrect);
      
      // スコア計算対象の問題かどうかを判定（最後の20問のみ）
      const isScored = currentIdx >= nLevel + (trials.length - nLevel - SCORED_TRIALS);
      
      // 正解時のエフェクトを発動（関数定義後に発動するためコメントアウト）
      if (isCorrect) {
        console.log('🎆 Fixed correct answer effect triggered!');
        // setTimeout(() => triggerUltimateGlowEffect(), 100);
      }
      
      return {
        ...prev,
        score: prev.score + (isCorrect && isScored ? 1 : 0),
        totalTrials: prev.totalTrials + (isScored ? 1 : 0),
        scoredTrialsCount: prev.scoredTrialsCount + (isScored ? 1 : 0),
        awaitingResponse: false,
        buttonsEnabled: false,
        showingFeedback: true,
        lastResponseCorrect: isCorrect,
        showingStimulus: false,
        stimulusCountdown: STIMULUS_GLOW_TIME,
        colorButtonPressed: false,
        positionButtonPressed: false,
      };
    });

    // ✨ シームレスなフィードバックアニメーション（次のタイルと同時開始）
    feedbackAnim.setValue(0);
    // フィードバックを即座表示し、次のタイルを同時に開始
    Animated.timing(feedbackAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    
    // フィードバックを表示しつつ、即座次のタイルを開始
    setGameState(prev => ({ ...prev, showingFeedback: false }));
    setTimeout(() => {
      showNextTrial(trials, currentIdx + 1, nLevel);
    }, 100); // 最小限の遅延でシームレスに
  }, [countdownTimer, feedbackAnim, showNextTrial]);

  // ✨ 改善されたボタントグル処理（ハプティックフィードバック付き）
  const handleButtonToggle = useCallback((buttonType: ButtonType) => {
    // ボタンが無効なら何もしない
    if (!gameState.buttonsEnabled || !gameState.awaitingResponse) return;
    
    console.log('✨ Enhanced Button toggled:', buttonType, 'current state enabled:', gameState.buttonsEnabled);
    
    // ボタンアニメーション（将来実装予定）
    // const buttonScale = new Animated.Value(1);
    // Animated.sequence([
    //   Animated.spring(buttonScale, {
    //     toValue: 0.95,
    //     friction: 6,
    //     tension: 200,
    //     useNativeDriver: true,
    //   }),
    //   Animated.spring(buttonScale, {
    //     toValue: 1,
    //     friction: 4,
    //     tension: 150,
    //     useNativeDriver: true,
    //   }),
    // ]).start();
    
    setGameState(prev => {
      if (buttonType === 'color') {
        const newPressed = !prev.colorButtonPressed;
        console.log('✨ Enhanced Color button toggled to:', newPressed);
        return { ...prev, colorButtonPressed: newPressed };
      } else {
        const newPressed = !prev.positionButtonPressed;
        console.log('✨ Enhanced Position button toggled to:', newPressed);
        return { ...prev, positionButtonPressed: newPressed };
      }
    });
  }, [gameState.buttonsEnabled, gameState.awaitingResponse]);

  // ✨ 新ルール: ボタン状態から最終判定（バグ修正済み）（現在は使用していません）
  const handleNewRuleResponse = useCallback((trials: Trial[], currentIdx: number, nLevel: number, colorPressed: boolean, positionPressed: boolean) => {
    console.log('New rule response - Color:', colorPressed, 'Position:', positionPressed, 'for trial', currentIdx + 1);
    
    // タイマーをクリア
    if (countdownTimer) {
      clearInterval(countdownTimer);
      setCountdownTimer(null);
    }

    const currentTrial = trials[currentIdx];
    const nBackTrial = trials[currentIdx - nLevel];
    
    const samePosition = currentTrial.position === nBackTrial.position;
    const sameColor = currentTrial.color === nBackTrial.color;
    
    // 判定ロジック（引数で渡された最新の状態を使用）
    const colorCorrect = (sameColor && colorPressed) || (!sameColor && !colorPressed);
    const positionCorrect = (samePosition && positionPressed) || (!samePosition && !positionPressed);
    const isCorrect = colorCorrect && positionCorrect;
    
    console.log('Fixed Judgement - Color same:', sameColor, 'pressed:', colorPressed, 'correct:', colorCorrect);
    console.log('Fixed Judgement - Position same:', samePosition, 'pressed:', positionPressed, 'correct:', positionCorrect);
    console.log('Fixed Overall correct:', isCorrect);

    // スコア計算対象の問題かどうかを判定（最後の20問のみ）
    const isScored = currentIdx >= nLevel + (trials.length - nLevel - SCORED_TRIALS);
    
    setGameState(prev => ({
      ...prev,
      score: prev.score + (isCorrect && isScored ? 1 : 0),
      totalTrials: prev.totalTrials + (isScored ? 1 : 0),
      scoredTrialsCount: prev.scoredTrialsCount + (isScored ? 1 : 0),
      awaitingResponse: false,
      buttonsEnabled: false,
      showingFeedback: true,
      lastResponseCorrect: isCorrect,
      stimulusCountdown: STIMULUS_GLOW_TIME,
      colorButtonPressed: false,
      positionButtonPressed: false,
    }));

    // 正解時のエフェクトを発動（関数定義後に発動するためコメントアウト）
    if (isCorrect) {
      console.log('🎆 Fixed correct answer effect triggered!');
      // setTimeout(() => triggerUltimateGlowEffect(), 100);
    }

    // ✨ 確実なフィードバック表示（0.7秒以上必ず表示）
    feedbackAnim.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(700), // 0.7秒以上の表示時間を確保
      Animated.timing(feedbackAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // フィードバック表示後、次の問題へ
    setTimeout(() => {
      showNextTrial(trials, currentIdx + 1, nLevel);
    }, 1400); // 0.7秒表示 + アニメーション時間を考慮
  }, [countdownTimer, feedbackAnim, showNextTrial]);

  // ✨ 旧ルールの関数は保持（現在は使用していません）
  const handleResponse = useCallback((response: ResponseType, trials: Trial[], currentIdx: number, nLevel: number) => {
    console.log('Response received:', response, 'for trial', currentIdx + 1);
    
    // タイマーをクリア
    if (countdownTimer) {
      clearInterval(countdownTimer);
      setCountdownTimer(null);
    }

    const currentTrial = trials[currentIdx];
    const nBackTrial = trials[currentIdx - nLevel];
    
    const samePosition = currentTrial.position === nBackTrial.position;
    const sameColor = currentTrial.color === nBackTrial.color;
    
    let correctResponse: ResponseType;
    if (samePosition && sameColor) {
      correctResponse = 'both';
    } else if (sameColor) {
      correctResponse = 'color';
    } else if (samePosition) {
      correctResponse = 'position';
    } else {
      correctResponse = 'neither';
    }

    const isCorrect = response === correctResponse;
    console.log('Correct response:', correctResponse, 'User response:', response, 'Is correct:', isCorrect);

    // スコア計算対象の問題かどうかを判定（最後の20問のみ）
    const isScored = currentIdx >= nLevel + (trials.length - nLevel - SCORED_TRIALS);
    
    setGameState(prev => ({
      ...prev,
      score: prev.score + (isCorrect && isScored ? 1 : 0),
      totalTrials: prev.totalTrials + (isScored ? 1 : 0),
      scoredTrialsCount: prev.scoredTrialsCount + (isScored ? 1 : 0),
      awaitingResponse: false,
      showingFeedback: true,
      lastResponseCorrect: isCorrect,
      timeLeft: RESPONSE_TIME,
    }));

    // フィードバックアニメーション（短縮して即座に次の問題へ）
    feedbackAnim.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // 🌟 超絶光るエフェクト！ 🌟
    if (isCorrect) {
      triggerUltimateGlowEffect();
    }

    // 次の問題へ（テンポアップ！）
    setTimeout(() => {
      showNextTrial(trials, currentIdx + 1, nLevel);
    }, 500);
  }, [countdownTimer, feedbackAnim, glowAnim]);

  // ✨ 美しい自然な正解エフェクト関数 ✨
  const triggerUltimateGlowEffect = useCallback(() => {
    console.log('✨ Beautiful Natural Glow Effect Activated! ✨');
    
    // 必要なエフェクトアニメーションをリセット（パフォーマンス最適化）
    [glowAnim, innerGlowAnim, outerGlowAnim, pulseGlowAnim, colorShiftAnim].forEach(anim => anim.setValue(0));

    // 🌸 美しい自然なグローエフェクト（パフォーマンス最適化）
    const naturalGlow = Animated.parallel([
      // 柔らかい内側光 - ゆっくりと輝く
      Animated.sequence([
        Animated.timing(innerGlowAnim, {
          toValue: 0.9,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(innerGlowAnim, {
          toValue: 0.2,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      
      // やさしい外側光 - 自然な拡散
      Animated.sequence([
        Animated.delay(100),
        Animated.timing(outerGlowAnim, {
          toValue: 0.7,
          duration: 500,
          easing: Easing.out(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(outerGlowAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]),
      
      // 穏やかなパルス
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseGlowAnim, {
            toValue: 0.8,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseGlowAnim, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ),
    ]);

    // 🌼 自然な色変化エフェクト（穏やかな金色）
    const colorShift = Animated.timing(colorShiftAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });

    // 🌊 波紋エフェクト - 3層の同心円
    const rippleEffects = Animated.stagger(100, [
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(ripple2Anim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(ripple3Anim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    // ✨ パーティクル爆発エフェクト
    const particleExplosion = Animated.sequence([
      Animated.timing(particleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(particleAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    // 💥 エクスプロージョンエフェクト
    const explosion = Animated.sequence([
      Animated.timing(explosionAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(explosionAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);

    // 🌀 スパイラルエフェクト
    const spiral = Animated.loop(
      Animated.timing(spiralAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      { iterations: 2 }
    );

    // 💧 リキッドエフェクト
    const liquid = Animated.sequence([
      Animated.timing(liquidAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(liquidAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    // 🎯 3D深度エフェクト
    const depth = Animated.sequence([
      Animated.timing(depthAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(depthAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]);

    // ⭐ 星光爆発エフェクト - 子どもが目を輝かせるレベル！
    const starBurst = Animated.sequence([
      Animated.timing(starBurstAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(starBurstAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    // 🌈 虹色光輪エフェクト
    const rainbow = Animated.loop(
      Animated.timing(rainbowAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      { iterations: 2 }
    );

    // 💖 ハートパルスエフェクト
    const heartPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(heartPulseAnim, {
          toValue: 0.3,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 4 }
    );

    // 🌊 衝撃波エフェクト
    const shockWave = Animated.timing(shockWaveAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    });

    // 🔮 魔法陣回転エフェクト
    const magicCircle = Animated.loop(
      Animated.timing(magicCircleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      { iterations: 2 }
    );

    // ✨ キラキラスパークルエフェクト
    const sparkle = Animated.stagger(50, [
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(sparkleAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    // ✨ 金粉グリッターエフェクト
    const glitter = Animated.sequence([
      Animated.timing(glitterAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(glitterAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    // 💎 ダイヤモンド輝きエフェクト
    const diamond = Animated.loop(
      Animated.sequence([
        Animated.timing(diamondAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(diamondAnim, {
          toValue: 0.2,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 }
    );

    // ✨ 美しい自然なエフェクトを発動（パフォーマンス最適化）
    Animated.parallel([
      naturalGlow,
      colorShift,
    ]).start(() => {
      console.log('✨🌼🌸 Beautiful Natural Glow Effect Completed! ✨🌼🌸');
    });
  }, [glowAnim, innerGlowAnim, outerGlowAnim, pulseGlowAnim, colorShiftAnim]);

  const endGame = () => {
    console.log('Ending game - final score:', gameState.score, '/', gameState.totalTrials);
    if (countdownTimer) {
      clearInterval(countdownTimer);
      setCountdownTimer(null);
    }
    setGameState(prev => ({ ...prev, isPlaying: false, gamePhase: 'finished' }));
  };

  const resetGame = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      setCountdownTimer(null);
    }
    setGameState({
      trials: [],
      currentIndex: 0,
      nLevel: 1,
      score: 0,
      totalTrials: 0,
      isPlaying: false,
      showingStimulus: false,
      awaitingResponse: false,
      timeLeft: RESPONSE_TIME,
      gamePhase: 'setup',
      showingFeedback: false,
      lastResponseCorrect: false,
      scoredTrialsCount: 0,
      // ✨ 新ルール: ボタン状態のリセット
      colorButtonPressed: false,
      positionButtonPressed: false,
      buttonsEnabled: false,
      stimulusCountdown: STIMULUS_GLOW_TIME,
    });
    fadeAnim.setValue(0);
    scaleAnim.setValue(1);
    feedbackAnim.setValue(0);
    glowAnim.setValue(0);
    
    // 全エフェクトアニメーションもリセット
    [innerGlowAnim, outerGlowAnim, pulseGlowAnim, colorShiftAnim, 
     rippleAnim, ripple2Anim, ripple3Anim, particleAnim, explosionAnim, 
     spiralAnim, liquidAnim, depthAnim, starBurstAnim, rainbowAnim, 
     heartPulseAnim, shockWaveAnim, magicCircleAnim, sparkleAnim, 
     glitterAnim, diamondAnim].forEach(anim => anim.setValue(0));
  };

  useEffect(() => {
    return () => {
      if (countdownTimer) {
        clearInterval(countdownTimer);
      }
    };
  }, [countdownTimer]);

  // ゲーム設定画面
  if (gameState.gamePhase === 'setup') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.gradientBackground}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Animated.View style={[styles.titleContainer, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.title}>🧠 メモリークエスト</Text>
              <Text style={styles.subtitle}>✨ ワーキングメモリ測定 ✨</Text>
            </Animated.View>
            
            <View style={styles.instructionContainer}>
              <Text style={styles.instructions}>
                🎮 むずかしさを えらんでね！
              </Text>
              
              <View style={styles.demoGrid}>
                {Array.from({ length: 9 }, (_, i) => (
                  <View key={i} style={styles.demoCell} />
                ))}
              </View>
            </View>
            
            <Text style={styles.levelTitle}>🎯 むずかしさ</Text>
            <View style={styles.levelContainer}>
              {[1, 2, 3].map((level) => (
                <Pressable
                  key={level}
                  style={({ pressed }) => [
                    styles.levelButton,
                    level === 1 ? styles.easyLevel :
                    level === 2 ? styles.mediumLevel : styles.hardLevel,
                    pressed && styles.buttonPressed
                  ]}
                  onPress={() => {
                    console.log('Level button pressed:', level);
                    startGame(level);
                  }}
                >
                  <Text style={styles.levelButtonText}>
                    {level === 1 ? '🟢 かんたん' : 
                     level === 2 ? '🟡 ふつう' : '🔴 むずかしい'}
                  </Text>
                  <Text style={styles.levelDescription}>
                    {level}回まえと くらべる
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  // ゲーム終了画面
  if (gameState.gamePhase === 'finished') {
    const accuracy = Math.round((gameState.score / Math.max(gameState.totalTrials, 1)) * 100);
    
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.gradientBackground}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Animated.View style={[styles.titleContainer, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.title}>🎉 ゲーム完了！</Text>
            </Animated.View>
            
            <View style={styles.resultsContainer}>
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                style={styles.resultGradient}
              >
                <Text style={styles.resultText}>
                  🎯 むずかしさ: {gameState.nLevel === 1 ? 'かんたん' : gameState.nLevel === 2 ? 'ふつう' : 'むずかしい'}
                </Text>
                <Text style={styles.resultText}>
                  ✅ せいかい: {gameState.score} / {gameState.totalTrials}
                </Text>
                <Text style={styles.totalScore}>
                  🏆 せいかいりつ: {accuracy}%
                </Text>
              </LinearGradient>
            </View>
            
            <Pressable 
              style={({ pressed }) => [
                styles.startButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => {
                console.log('Reset button pressed');
                resetGame();
              }}
            >
              <LinearGradient
                colors={['#27ae60', '#2ecc71']}
                style={styles.buttonGradient}
              >
                <Text style={styles.startButtonText}>🔄 もう一度</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  // ゲーム中
  const currentTrial = gameState.trials[gameState.currentIndex];
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradientBackground}
      >
        <ScrollView 
          contentContainerStyle={styles.gameScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.gameHeader}>
            <Text style={styles.gameTitle}>🧠 メモリークエスト</Text>
            <Text style={styles.progress}>
              📊 {gameState.currentIndex >= gameState.nLevel ? 
                `${Math.min(gameState.scoredTrialsCount, SCORED_TRIALS)} / ${SCORED_TRIALS}` : 
                'ちょっとまってね...'} 
            </Text>
            <Text style={styles.levelIndicator}>
              🎯 {gameState.nLevel}回まえと くらべてみよう
            </Text>
            {gameState.currentIndex >= gameState.nLevel && (
              <Text style={styles.scoreDisplay}>
                ✅ せいかい: {gameState.score} / {Math.min(gameState.scoredTrialsCount, SCORED_TRIALS)}
              </Text>
            )}
          </View>
          
          {/* 🎯 安定グリッドエリア：タイマーをグリッド内右上角に配置 */}
          <View style={styles.stableGridArea}>
            {/* メイングリッドコンテナ（タイマーを内包） */}
            <View style={styles.gridWithTimerContainer}>
              {/* 🕑 タイマー（グリッド右上角にぴったり寄せ） */}
              {gameState.awaitingResponse && (
                <Animated.View style={[
                  styles.gridTimerOverlay,
                  {
                    transform: [{ scale: pulseAnim }],
                    shadowColor: gameState.stimulusCountdown <= 1 ? '#ff4444' : '#FFD700',
                    shadowOpacity: gameState.stimulusCountdown <= 1 ? 0.8 : 0.3,
                  }
                ]}>
                  <Text style={[
                    styles.gridTimer,
                    { color: gameState.stimulusCountdown <= 1 ? '#ff4444' : '#ffffff' }
                  ]}>{gameState.stimulusCountdown}</Text>
                </Animated.View>
              )}
              
              {/* グリッド本体 */}
            {/* タイル上のカウントダウンオーバーレイを削除（コンパクトタイマーのみ維持） */}

            {/* 🌊 波紋エフェクト層 (最背面) */}
            {gameState.showingFeedback && gameState.lastResponseCorrect && (
              <>
                <Animated.View style={[
                  styles.rippleEffect,
                  {
                    opacity: rippleAnim,
                    transform: [
                      { scale: Animated.multiply(rippleAnim, 3) },
                      { rotate: spiralAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }) }
                    ],
                  }
                ]} />
                <Animated.View style={[
                  styles.rippleEffect2,
                  {
                    opacity: Animated.multiply(ripple2Anim, 0.7),
                    transform: [
                      { scale: Animated.multiply(ripple2Anim, 2.5) },
                      { rotate: spiralAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['360deg', '0deg'],
                      }) }
                    ],
                  }
                ]} />
                <Animated.View style={[
                  styles.rippleEffect3,
                  {
                    opacity: Animated.multiply(ripple3Anim, 0.5),
                    transform: [
                      { scale: Animated.multiply(ripple3Anim, 2) },
                      { rotate: spiralAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['180deg', '540deg'],
                      }) }
                    ],
                  }
                ]} />
                {/* 🌊 衝撃波エフェクト */}
                <Animated.View style={[
                  styles.shockWaveEffect,
                  {
                    opacity: Animated.multiply(shockWaveAnim, 0.8),
                    transform: [
                      { scale: Animated.multiply(shockWaveAnim, 5) },
                    ],
                  }
                ]} />
                {/* 🔮 魔法陣エフェクト */}
                <Animated.View style={[
                  styles.magicCircleEffect,
                  {
                    opacity: Animated.multiply(magicCircleAnim, 0.9),
                    transform: [
                      { scale: Animated.add(1, Animated.multiply(magicCircleAnim, 0.5)) },
                      { rotate: magicCircleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '720deg'],
                      }) }
                    ],
                  }
                ]} />
                {/* 🌈 虹色光輪エフェクト */}
                <Animated.View style={[
                  styles.rainbowEffect,
                  {
                    opacity: Animated.multiply(rainbowAnim, 0.7),
                    transform: [
                      { scale: Animated.add(1, Animated.multiply(rainbowAnim, 0.8)) },
                      { rotate: rainbowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '-360deg'],
                      }) }
                    ],
                  }
                ]} />
              </>
            )}

            {/* 🎆 パーティクル層 */}
            {gameState.showingFeedback && gameState.lastResponseCorrect && (
              <>
                <View style={styles.particleContainer}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.particle,
                        {
                          opacity: particleAnim,
                          transform: [
                            {
                              translateX: Animated.multiply(
                                particleAnim,
                                Math.cos((i * 30) * Math.PI / 180) * 80
                              )
                            },
                            {
                              translateY: Animated.multiply(
                                particleAnim,
                                Math.sin((i * 30) * Math.PI / 180) * 80
                              )
                            },
                            {
                              rotate: particleAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', `${360 * (i + 1)}deg`],
                              })
                            },
                            { scale: Animated.subtract(1, particleAnim) }
                          ],
                        }
                      ]}
                    />
                  ))}
                </View>
                
                {/* ⭐ 星光爆発パーティクル */}
                <View style={styles.starBurstContainer}>
                  {Array.from({ length: 16 }, (_, i) => (
                    <Animated.View
                      key={`star-${i}`}
                      style={[
                        styles.starParticle,
                        {
                          opacity: starBurstAnim,
                          transform: [
                            {
                              translateX: Animated.multiply(
                                starBurstAnim,
                                Math.cos((i * 22.5) * Math.PI / 180) * 120
                              )
                            },
                            {
                              translateY: Animated.multiply(
                                starBurstAnim,
                                Math.sin((i * 22.5) * Math.PI / 180) * 120
                              )
                            },
                            {
                              rotate: starBurstAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', `${720}deg`],
                              })
                            },
                            { scale: Animated.subtract(1.5, starBurstAnim) }
                          ],
                        }
                      ]}
                    />
                  ))}
                </View>
                
                {/* ✨ キラキラスパークル */}
                <View style={styles.sparkleContainer}>
                  {Array.from({ length: 20 }, (_, i) => (
                    <Animated.View
                      key={`sparkle-${i}`}
                      style={[
                        styles.sparkleParticle,
                        {
                          opacity: sparkleAnim,
                          transform: [
                            {
                              translateX: Animated.multiply(
                                sparkleAnim,
                                (Math.random() - 0.5) * 200
                              )
                            },
                            {
                              translateY: Animated.multiply(
                                sparkleAnim,
                                (Math.random() - 0.5) * 200
                              )
                            },
                            {
                              rotate: sparkleAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', `${360 * (i % 4 + 1)}deg`],
                              })
                            },
                            { scale: Animated.add(0.5, Animated.multiply(sparkleAnim, 1.5)) }
                          ],
                        }
                      ]}
                    />
                  ))}
                </View>
                
                {/* 💖 ハートパーティクル */}
                <View style={styles.heartContainer}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <Animated.View
                      key={`heart-${i}`}
                      style={[
                        styles.heartParticle,
                        {
                          opacity: heartPulseAnim,
                          transform: [
                            {
                              translateX: Animated.multiply(
                                heartPulseAnim,
                                Math.cos((i * 45) * Math.PI / 180) * 100
                              )
                            },
                            {
                              translateY: Animated.multiply(
                                heartPulseAnim,
                                Math.sin((i * 45) * Math.PI / 180) * 100
                              )
                            },
                            { scale: Animated.add(0.8, Animated.multiply(heartPulseAnim, 0.7)) }
                          ],
                        }
                      ]}
                    />
                  ))}
                </View>
              </>
            )}

            {/* 🎭 メインタイルグリッド */}
            <Animated.View style={[
              styles.grid,
              gameState.showingFeedback && gameState.lastResponseCorrect && {
                // 🌟 外側グロー効果
                shadowColor: colorShiftAnim.interpolate({
                  inputRange: [0, 0.3, 0.6, 1],
                  outputRange: ['#FFFFFF', '#FFD700', '#FF6B9D', '#9B59B6'],
                }),
                shadowOpacity: Animated.multiply(outerGlowAnim, 0.8),
                shadowRadius: Animated.multiply(outerGlowAnim, 30),
                elevation: Animated.multiply(outerGlowAnim, 15),
                // 💫 3D効果
                transform: [
                  { scale: Animated.add(1, Animated.multiply(depthAnim, 0.1)) },
                  { perspective: 1000 },
                  { 
                    rotateX: depthAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '5deg'],
                    })
                  }
                ],
              }
            ]}>
              {Array.from({ length: 9 }, (_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.cell,
                    // ✨ 子どもが「すごい！」と叫ぶ超美しいタイル光演出
                    gameState.showingStimulus && currentTrial?.position === i && {
                      // 超美しいグラデーション背景
                      backgroundColor: fadeAnim.interpolate({
                        inputRange: [0, 0.3, 0.6, 1],
                        outputRange: [
                          'rgba(255, 255, 255, 0.2)', 
                          `${currentTrial.color}40`, // 25% 透明度
                          `${currentTrial.color}80`, // 50% 透明度
                          currentTrial.color
                        ],
                      }),
                      // 美しいボーダーグラデーション
                      borderColor: fadeAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [
                          'rgba(255, 255, 255, 0.4)', 
                          `${currentTrial.color}CC`, // 80% 透明度
                          '#FFFFFF'
                        ],
                      }),
                      borderWidth: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [2, 4],
                      }),
                      // 物理的な美しいスケール変化
                      transform: [{ 
                        scale: scaleAnim.interpolate({
                          inputRange: [0.85, 1, 1.35],
                          outputRange: [0.98, 1.15, 1.35],
                          extrapolate: 'clamp'
                        })
                      }],
                      // 美しい透明度変化
                      opacity: fadeAnim.interpolate({
                        inputRange: [0, 0.2, 0.5, 0.8, 1],
                        outputRange: [0.2, 0.6, 0.85, 0.95, 0.92]
                      }),
                      // 超美しいグロー効果
                      shadowColor: currentTrial.color,
                      shadowOpacity: Animated.multiply(fadeAnim, 0.8),
                      shadowRadius: Animated.multiply(fadeAnim, 25),
                      elevation: Animated.multiply(fadeAnim, 12),
                      shadowOffset: { width: 0, height: 0 },
                    },
                    // ✨ 子どもが「きれい！」と感動する超美しい正解エフェクト
                    gameState.showingFeedback && gameState.lastResponseCorrect && currentTrial?.position === i && {
                      // 魅惑的な色変化グラデーション
                      backgroundColor: colorShiftAnim.interpolate({
                        inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                        outputRange: [
                          currentTrial?.color || '#FFD700', 
                          '#FFFFFF', 
                          '#FFE55C', 
                          '#FFD700',
                          '#FFF8DC', // コーンシルク
                          '#FFD700'
                        ],
                      }),
                      // 美しいボーダーエフェクト
                      borderColor: colorShiftAnim.interpolate({
                        inputRange: [0, 0.3, 0.6, 1],
                        outputRange: ['#FFD700', '#FFFFFF', '#FFE55C', '#FFD700'],
                      }),
                      borderWidth: colorShiftAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [3, 5],
                      }),
                      // 超美しいグロー効果
                      shadowColor: colorShiftAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: ['#FFD700', '#FFFFFF', '#FFD700'],
                      }),
                      shadowOpacity: Animated.multiply(innerGlowAnim, 0.9),
                      shadowRadius: Animated.multiply(innerGlowAnim, 35),
                      elevation: Animated.multiply(innerGlowAnim, 16),
                      shadowOffset: { width: 0, height: 0 },
                      // 美しいスケール効果
                      transform: [
                        { 
                          scale: Animated.add(
                            1.25,
                            Animated.multiply(pulseGlowAnim, 0.2)
                          )
                        }
                      ],
                      // 輝く透明度
                      opacity: Animated.add(
                        0.92,
                        Animated.multiply(pulseGlowAnim, 0.08)
                      ),
                    }
                  ]}
                />
              ))}
            </Animated.View>

            {/* 💥 爆発エフェクト層 (最前面) */}
            {gameState.showingFeedback && gameState.lastResponseCorrect && (
              <>
                <Animated.View style={[
                  styles.explosionEffect,
                  {
                    opacity: explosionAnim,
                    transform: [
                      { scale: Animated.multiply(explosionAnim, 4) },
                      {
                        rotate: explosionAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '180deg'],
                        })
                      }
                    ],
                  }
                ]} />
                
                {/* ✨ 金粉グリッターエフェクト */}
                <Animated.View style={[
                  styles.glitterEffect,
                  {
                    opacity: glitterAnim,
                    transform: [
                      { scale: Animated.add(1, Animated.multiply(glitterAnim, 2)) },
                    ],
                  }
                ]} />
                
                {/* 💎 ダイヤモンド輝きエフェクト */}
                <Animated.View style={[
                  styles.diamondEffect,
                  {
                    opacity: diamondAnim,
                    transform: [
                      { scale: Animated.add(0.8, Animated.multiply(diamondAnim, 0.4)) },
                      {
                        rotate: diamondAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '45deg'],
                        })
                      }
                    ],
                  }
                ]} />
              </>
            )}
            
            </View>
          </View>
          
          {/* ✨ フィードバックエリア（グリッド下に大きく表示） */}
          <View style={styles.mainFeedbackArea}>
            {gameState.showingFeedback && (
              <Animated.View style={[
                styles.mainFeedbackPanel,
                {
                  opacity: feedbackAnim,
                  transform: [
                    { scale: feedbackAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    })},
                    { translateY: feedbackAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    })}
                  ],
                }
              ]}>
                <Text style={[
                  styles.mainFeedbackIcon,
                  { color: gameState.lastResponseCorrect ? '#27ae60' : '#e74c3c' }
                ]}>
                  {gameState.lastResponseCorrect ? '⭕' : '❌'}
                </Text>
                <Text style={[
                  styles.mainFeedbackText,
                  { color: gameState.lastResponseCorrect ? '#27ae60' : '#e74c3c' }
                ]}>
                  {gameState.lastResponseCorrect ? 'せいかい！' : 'おしい！'}
                </Text>
              </Animated.View>
            )}
          </View>

          {/* 🎯 コンパクトボタンエリア：グリッド直下に配置 */}
          <View style={styles.compactButtonArea}>
            {gameState.awaitingResponse ? (
              <>
                {/* ✨ コンパクトボタンコンテナ */}
                <View style={styles.compactButtonContainer}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Pressable 
                      style={({ pressed }) => [
                        styles.compactButton, 
                        styles.colorButton,
                        gameState.colorButtonPressed && styles.compactButtonActive,
                        !gameState.buttonsEnabled && styles.compactButtonDisabled,
                        pressed && gameState.buttonsEnabled && styles.responseButtonPressed
                      ]}
                      onPress={() => handleButtonToggle('color')}
                      disabled={!gameState.buttonsEnabled}
                    >
                      <Text style={[
                        styles.compactButtonText,
                        gameState.colorButtonPressed && styles.compactButtonTextActive
                      ]}>🎨 いろ</Text>
                    </Pressable>
                  </Animated.View>
                  
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Pressable 
                      style={({ pressed }) => [
                        styles.compactButton, 
                        styles.positionButton,
                        gameState.positionButtonPressed && styles.compactButtonActive,
                        !gameState.buttonsEnabled && styles.compactButtonDisabled,
                        pressed && gameState.buttonsEnabled && styles.responseButtonPressed
                      ]}
                      onPress={() => handleButtonToggle('position')}
                      disabled={!gameState.buttonsEnabled}
                    >
                      <Text style={[
                        styles.compactButtonText,
                        gameState.positionButtonPressed && styles.compactButtonTextActive
                      ]}>📍 ばしょ</Text>
                    </Pressable>
                  </Animated.View>
                </View>
                
                {/* ✨ コンパクトルール説明 */}
                <Text style={styles.compactRuleText}>
                  {gameState.buttonsEnabled ? 
                    '💡 同じものをタップ！' :
                    '⏳ 待ってね...'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.compactWaitingText}>
                  {gameState.showingStimulus ? '👀 よく見て！' : '⏳ まってね...'}
                </Text>
                <View style={styles.compactButtonContainer}>
                  <View style={[styles.compactButton, styles.transparentButton]} />
                  <View style={[styles.compactButton, styles.transparentButton]} />
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const { width, height } = Dimensions.get('window');
const isTablet = width > 768 || height > 1024;
const baseSize = isTablet ? 1.2 : 1;
const gridSize = Math.min(width * 0.7, height * 0.4, 280) * baseSize;
const cellSize = (gridSize - 30) / 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Math.max(20, width * 0.05),
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: height,
  },
  gameScrollContent: {
    flexGrow: 1,
    padding: Math.max(20, width * 0.05),
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: height,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 32 * baseSize,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18 * baseSize,
    color: '#f8f9fa',
    marginTop: 8,
    textAlign: 'center',
  },
  gameTitle: {
    fontSize: 24 * baseSize,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  gameHeader: {
    alignItems: 'center',
    marginVertical: 10,
  },
  instructionContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  instructions: {
    fontSize: 20 * baseSize,
    textAlign: 'center',
    marginBottom: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  progress: {
    fontSize: 16 * baseSize,
    marginVertical: 8,
    color: '#f8f9fa',
    textAlign: 'center',
  },
  levelIndicator: {
    fontSize: 18 * baseSize,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  scoreDisplay: {
    fontSize: 16 * baseSize,
    color: '#f8f9fa',
    textAlign: 'center',
    marginTop: 5,
    fontWeight: 'bold',
  },
  countdown: {
    fontSize: 28 * baseSize,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  countdownPlaceholder: {
    height: 40 * baseSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoGrid: {
    width: gridSize * 0.8,
    height: gridSize * 0.8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 10,
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  demoCell: {
    width: (gridSize * 0.8 - 30) / 3,
    height: (gridSize * 0.8 - 30) / 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  // 🎯 安定グリッドエリア：上下動を防止する固定レイアウト
  stableGridArea: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // 固定高さでレイアウト安定化
    minHeight: gridSize + 80,
    height: gridSize + 80,
  },
  
  // 🎯 グリッドコンテナ（タイマーを内包）
  gridWithTimerContainer: {
    position: 'relative',
    width: gridSize + 40,
    height: gridSize + 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // 🕑 グリッド内タイマーオーバーレイ（右上角にぴったり）
  gridTimerOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    zIndex: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  // 🕑 グリッドタイマーテキスト
  gridTimer: {
    fontSize: 18 * baseSize,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // ✨ メインフィードバックエリア（グリッド下に大きく表示）
  mainFeedbackArea: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    // 固定高さでレイアウト安定化
    minHeight: 80,
    height: 80,
  },
  
  // ✨ メインフィードバックパネル
  mainFeedbackPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  
  // ✨ メインフィードバックアイコン
  mainFeedbackIcon: {
    fontSize: 36 * baseSize,
    textAlign: 'center',
    marginBottom: 5,
  },
  
  // ✨ メインフィードバックテキスト
  mainFeedbackText: {
    fontSize: 18 * baseSize,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // 🎯 メイングリッドエリア（中央固定）
  centralGridContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: gridSize + 40,
    height: gridSize + 40,
    position: 'relative',
  },
  
  // 🕑 コンパクトタイマーコンテナ
  compactCountdownContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  compactCountdown: {
    fontSize: 16 * baseSize,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // ✨ コンパクトフィードバックパネル
  compactFeedbackPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  
  compactFeedbackIcon: {
    fontSize: 24 * baseSize,
    textAlign: 'center',
    marginBottom: 2,
  },
  
  compactFeedbackText: {
    fontSize: 12 * baseSize,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // ✨ 美しいサイドフィードバックパネル
  feedbackSidePanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  
  // ✨ メインフィードバックテキスト
  feedbackSideText: {
    fontSize: 18 * baseSize,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 4,
  },
  
  // ✨ サブフィードバックテキスト
  feedbackSubText: {
    fontSize: 14 * baseSize,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  grid: {
    width: gridSize,
    height: gridSize,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    justifyContent: 'space-between',
    alignContent: 'space-between',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    // グリッド位置を絶対的に固定
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 'auto',
  },
  cell: {
    width: cellSize,
    height: cellSize,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  levelTitle: {
    fontSize: 22 * baseSize,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  levelContainer: {
    gap: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  levelButton: {
    borderRadius: 20,
    alignItems: 'center',
    minWidth: Math.max(220 * baseSize, width * 0.6),
    maxWidth: width * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  easyLevel: {
    backgroundColor: '#27ae60',
  },
  mediumLevel: {
    backgroundColor: '#f39c12',
  },
  hardLevel: {
    backgroundColor: '#e74c3c',
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
  },
  levelButtonText: {
    color: 'white',
    fontSize: 20 * baseSize,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  levelDescription: {
    color: 'white',
    fontSize: 16 * baseSize,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // 🎯 コンパクトボタンエリア（グリッド直下に配置）
  compactButtonArea: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    height: 120,
  },
  
  // 🔘 コンパクトボタンコンテナ
  compactButtonContainer: {
    flexDirection: 'row',
    gap: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  // 🔘 コンパクトボタン
  compactButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80 * baseSize,
    minHeight: 50 * baseSize,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  compactButtonActive: {
    backgroundColor: '#f39c12',
    borderColor: '#ffffff',
    borderWidth: 3,
    shadowColor: '#f39c12',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },
  
  compactButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  
  compactButtonText: {
    fontSize: 14 * baseSize,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  
  compactButtonTextActive: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // 📋 コンパクトルールテキスト
  compactRuleText: {
    fontSize: 14 * baseSize,
    color: '#f8f9fa',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 8,
  },
  
  compactWaitingText: {
    fontSize: 16 * baseSize,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  
  transparentButton: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    borderColor: 'transparent',
  },
  responseContainer: {
    gap: 15,
    alignItems: 'center',
  },
  responseRow: {
    flexDirection: 'row',
    gap: 15,
    justifyContent: 'center',
  },
  responseButton: {
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: Math.max(90 * baseSize, width * 0.2),
    minHeight: Math.max(70 * baseSize, height * 0.08),
    maxWidth: width * 0.4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  responseButtonPressed: {
    transform: [{ scale: 0.9 }],
  },
  bothButton: {
    backgroundColor: '#9b59b6',
  },
  colorButton: {
    backgroundColor: '#3498db',
  },
  positionButton: {
    backgroundColor: '#e74c3c',
  },
  neitherButton: {
    backgroundColor: '#95a5a6',
  },
  
  // ✨ 新ルールUIスタイル
  
  // 大きなカウントダウン
  bigCountdownContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bigCountdown: {
    fontSize: 48 * baseSize,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  countdownLabel: {
    fontSize: 16 * baseSize,
    color: '#f8f9fa',
    marginTop: 5,
    fontWeight: 'bold',
  },
  
  // トグルボタンコンテナ
  newResponseContainer: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  
  // トグルボタン
  toggleButton: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: Math.max(120 * baseSize, width * 0.35),
    minHeight: Math.max(80 * baseSize, height * 0.1),
    maxWidth: width * 0.4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  
  // 色ボタン
  colorToggleButton: {
    backgroundColor: '#3498db',
  },
  
  // 位置ボタン
  positionToggleButton: {
    backgroundColor: '#e74c3c',
  },
  
  // 強化されたアクティブ状態
  toggleButtonActive: {
    backgroundColor: '#f39c12',
    borderColor: '#ffffff',
    borderWidth: 4,
    shadowColor: '#f39c12',
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 16,
    transform: [{ scale: 1.08 }],
  },
  
  // ボタングローオーバーレイ
  buttonGlowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#ffffff',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  
  // 無効状態
  toggleButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#95a5a6',
  },
  
  // ボタンテキスト
  toggleButtonText: {
    color: 'white',
    fontSize: 16 * baseSize,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // アクティブ時のテキスト
  toggleButtonTextActive: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // 改善されたルール説明コンテナ
  ruleExplanationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  // ルール説明テキスト
  newRuleExplanation: {
    fontSize: 15 * baseSize,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 22 * baseSize,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // タイル輝き中のカウントダウンオーバーレイ
  glowCountdownOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 15,
  },
  
  glowCountdownText: {
    fontSize: 24 * baseSize,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // タイル上のカウントダウンオーバーレイを削除（中央のカウントダウンのみ使用）
  // 削除済み: tileCountdownOverlay と tileCountdownText
  responseButtonText: {
    color: 'white',
    fontSize: 12 * baseSize,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16 * baseSize,
  },
  startButton: {
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 20,
  },
  buttonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 20 * baseSize,
    fontWeight: 'bold',
  },
  waitingText: {
    fontSize: 18 * baseSize,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  resultsContainer: {
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  resultGradient: {
    padding: 25,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 18 * baseSize,
    marginBottom: 12,
    textAlign: 'center',
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  totalScore: {
    fontSize: 24 * baseSize,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#27ae60',
    marginTop: 10,
  },
  feedbackOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 30,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  feedbackText: {
    fontSize: 24 * baseSize,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // 🌟🌟🌟 超絶エフェクトスタイル 🌟🌟🌟
  
  // 🌊 波紋エフェクト
  rippleEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: gridSize / 3,
    height: gridSize / 3,
    borderRadius: gridSize / 6,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#FFD700',
    transform: [{ translateX: -(gridSize / 6) }, { translateY: -(gridSize / 6) }],
  },
  rippleEffect2: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: gridSize / 4,
    height: gridSize / 4,
    borderRadius: gridSize / 8,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6B9D',
    transform: [{ translateX: -(gridSize / 8) }, { translateY: -(gridSize / 8) }],
  },
  rippleEffect3: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: gridSize / 5,
    height: gridSize / 5,
    borderRadius: gridSize / 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#9B59B6',
    transform: [{ translateX: -(gridSize / 10) }, { translateY: -(gridSize / 10) }],
  },
  
  // ✨ パーティクルエフェクト
  particleContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    height: 1,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
    transform: [{ translateX: -4 }, { translateY: -4 }],
  },
  
  // 💥 爆発エフェクト
  explosionEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFD700',
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
  
  // ⭐⭐⭐ 子どもがすごい！と叫ぶレベルの新エフェクト ⭐⭐⭐
  
  // 🌊 衝撃波エフェクト
  shockWaveEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: gridSize / 2,
    height: gridSize / 2,
    borderRadius: gridSize / 4,
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: '#00FFFF',
    shadowColor: '#00FFFF',
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
    transform: [{ translateX: -(gridSize / 4) }, { translateY: -(gridSize / 4) }],
  },
  
  // 🔮 魔法陣エフェクト
  magicCircleEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: gridSize * 0.8,
    height: gridSize * 0.8,
    borderRadius: gridSize * 0.4,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#FF1493',
    shadowColor: '#FF1493',
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 12,
    transform: [{ translateX: -(gridSize * 0.4) }, { translateY: -(gridSize * 0.4) }],
  },
  
  // 🌈 虹色光輪エフェクト
  rainbowEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: gridSize * 0.6,
    height: gridSize * 0.6,
    borderRadius: gridSize * 0.3,
    backgroundColor: 'transparent',
    borderWidth: 6,
    borderColor: '#FF69B4',
    shadowColor: '#FF69B4',
    shadowOpacity: 0.7,
    shadowRadius: 25,
    elevation: 10,
    transform: [{ translateX: -(gridSize * 0.3) }, { translateY: -(gridSize * 0.3) }],
  },
  
  // ⭐ 星光爆発コンテナ
  starBurstContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    height: 1,
  },
  
  // ⭐ 星パーティクル
  starParticle: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ translateX: -6 }, { translateY: -6 }],
    // 星形シェイプをダイヤモンドで表現
    borderRadius: 2,
  },
  
  // ✨ キラキラスパークルコンテナ
  sparkleContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    height: 1,
  },
  
  // ✨ スパークルパーティクル
  sparkleParticle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ translateX: -3 }, { translateY: -3 }],
  },
  
  // 💖 ハートコンテナ
  heartContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    height: 1,
  },
  
  // 💖 ハートパーティクル
  heartParticle: {
    position: 'absolute',
    width: 16,
    height: 14,
    backgroundColor: '#FF69B4',
    shadowColor: '#FF69B4',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 7,
    transform: [{ translateX: -8 }, { translateY: -7 }],
    // ハートシェイプを似せた丸み
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  
  // ✨ 金粉グリッターエフェクト
  glitterEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 15,
    transform: [{ translateX: -15 }, { translateY: -15 }],
  },
  
  // 💎 ダイヤモンド輝きエフェクト
  diamondEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 24,
    height: 24,
    backgroundColor: '#E0E0E0',
    shadowColor: '#FFFFFF',
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
    transform: [{ translateX: -12 }, { translateY: -12 }, { rotate: '45deg' }],
  },
});