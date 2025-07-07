import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';

interface Card {
  id: number;
  color: 'red' | 'blue' | 'green' | 'yellow';
  shape: 'circle' | 'square' | 'triangle' | 'star';
}

interface CardSortGameProps {
  onGameEnd: (score: number) => void;
}

export default function CardSortGame({ onGameEnd }: CardSortGameProps) {
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [currentRule, setCurrentRule] = useState<'color' | 'shape'>('color');
  const [score, setScore] = useState(0);
  const [gamePhase, setGamePhase] = useState<'intro' | 'playing' | 'end'>('intro');
  const [cardIndex, setCardIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalCards] = useState(20);
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(1));

  // カードデータ生成
  const generateCards = (): Card[] => {
    const colors: Card['color'][] = ['red', 'blue', 'green', 'yellow'];
    const shapes: Card['shape'][] = ['circle', 'square', 'triangle', 'star'];
    const cards: Card[] = [];
    
    for (let i = 0; i < totalCards; i++) {
      cards.push({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)]
      });
    }
    return cards;
  };

  const [cards] = useState(generateCards());

  // ルール切り替え（5枚ごと）
  useEffect(() => {
    if (cardIndex > 0 && cardIndex % 5 === 0) {
      setCurrentRule(prev => prev === 'color' ? 'shape' : 'color');
    }
  }, [cardIndex]);

  // カード表示アニメーション
  useEffect(() => {
    if (currentCard) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [currentCard]);

  const startGame = () => {
    setGamePhase('playing');
    setCurrentCard(cards[0]);
  };

  const handleAnswer = (answer: 'left' | 'right') => {
    if (!currentCard) return;

    let isCorrect = false;
    const currentValue = currentRule === 'color' ? currentCard.color : currentCard.shape;
    
    // 簡単な仕分けルール（赤・青は左、緑・黄は右、円・四角は左、三角・星は右）
    if (currentRule === 'color') {
      isCorrect = (currentValue === 'red' || currentValue === 'blue') ? answer === 'left' : answer === 'right';
    } else {
      isCorrect = (currentValue === 'circle' || currentValue === 'square') ? answer === 'left' : answer === 'right';
    }

    if (isCorrect) {
      setScore(prev => prev + 10);
      setCorrectAnswers(prev => prev + 1);
    }

    // 次のカードへ
    const nextIndex = cardIndex + 1;
    if (nextIndex < cards.length) {
      setCardIndex(nextIndex);
      setCurrentCard(cards[nextIndex]);
      fadeAnim.setValue(0);
    } else {
      // ゲーム終了
      setGamePhase('end');
      onGameEnd(score);
    }
  };

  const getShapeEmoji = (shape: Card['shape']) => {
    switch (shape) {
      case 'circle': return '⭕';
      case 'square': return '⬜';
      case 'triangle': return '🔺';
      case 'star': return '⭐';
    }
  };

  const getColorStyle = (color: Card['color']) => {
    switch (color) {
      case 'red': return { color: '#ff4444' };
      case 'blue': return { color: '#4444ff' };
      case 'green': return { color: '#44ff44' };
      case 'yellow': return { color: '#ffff44' };
    }
  };

  if (gamePhase === 'intro') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎴 カード仕分け</Text>
        <Text style={styles.subtitle}>魔法使いの修行だよ！</Text>
        
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionTitle}>ルール説明</Text>
          <Text style={styles.instructionText}>
            • カードを正しく仕分けしよう！{'\n'}
            • ルールは途中で変わるよ{'\n'}
            • 色で仕分け：赤・青は左、緑・黄は右{'\n'}
            • 形で仕分け：円・四角は左、三角・星は右
          </Text>
        </View>

        <Pressable style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>修行開始！</Text>
        </Pressable>
      </View>
    );
  }

  if (gamePhase === 'end') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎴 修行完了！</Text>
        <Text style={styles.scoreText}>スコア: {score}点</Text>
        <Text style={styles.accuracyText}>
          正答率: {Math.round((correctAnswers / totalCards) * 100)}%
        </Text>
        
        <Pressable style={styles.restartButton} onPress={() => window.location.reload()}>
          <Text style={styles.restartButtonText}>もう一度修行</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.scoreDisplay}>スコア: {score}</Text>
        <Text style={styles.progressDisplay}>{cardIndex + 1} / {totalCards}</Text>
      </View>

      <View style={styles.ruleDisplay}>
        <Text style={styles.ruleText}>
          現在のルール: {currentRule === 'color' ? '色で仕分け' : '形で仕分け'}
        </Text>
      </View>

      <View style={styles.cardContainer}>
        <Animated.View 
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          {currentCard && (
            <>
              <Text style={[styles.cardShape, getColorStyle(currentCard.color)]}>
                {getShapeEmoji(currentCard.shape)}
              </Text>
              <Text style={styles.cardText}>
                {currentCard.color}の{currentCard.shape}
              </Text>
            </>
          )}
        </Animated.View>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.sortButton, styles.leftButton]} 
          onPress={() => handleAnswer('left')}
        >
          <Text style={styles.buttonText}>左に仕分け</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.sortButton, styles.rightButton]} 
          onPress={() => handleAnswer('right')}
        >
          <Text style={styles.buttonText}>右に仕分け</Text>
        </Pressable>
      </View>

      <View style={styles.magicianContainer}>
        <Text style={styles.magicianText}>🧙‍♂️ がんばれ！</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f8ff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#7f8c8d',
  },
  instructionContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#34495e',
  },
  startButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  scoreDisplay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  progressDisplay: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  ruleDisplay: {
    backgroundColor: '#e8f4fd',
    padding: 10,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  ruleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2980b9',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 200,
    minHeight: 200,
    justifyContent: 'center',
  },
  cardShape: {
    fontSize: 80,
    marginBottom: 20,
  },
  cardText: {
    fontSize: 18,
    color: '#2c3e50',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  sortButton: {
    padding: 20,
    borderRadius: 15,
    minWidth: 120,
    alignItems: 'center',
  },
  leftButton: {
    backgroundColor: '#e74c3c',
  },
  rightButton: {
    backgroundColor: '#27ae60',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  magicianContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  magicianText: {
    fontSize: 20,
    color: '#8e44ad',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2c3e50',
  },
  accuracyText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#7f8c8d',
  },
  restartButton: {
    backgroundColor: '#f39c12',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  restartButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 