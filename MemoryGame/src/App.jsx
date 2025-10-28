import { useState, useEffect, useCallback } from "react";
import "./App.css";

// Cards data (16 pares, suficiente para até 6x6 que tem 18 pares)
const ALL_EMOJIS = [
  "😀",
  "😎",
  "🤩",
  "🥳",
  "🤔",
  "😊",
  "😍",
  "😇",
  "🫡",
  "🫣",
  "🤫",
  "🫠",
  "😶",
  "🫥",
  "🫤",
  "😮",
  "🧑🏿",
  "🤠"
];

// Level configuration
const LEVEL_CONFIG = {
  1: { size: 2, pairs: 2, time: 30, message: "2x2 (Fácil)" }, // 4 cards
  2: { size: 4, pairs: 8, time: 60, message: "4x4 (Normal)" }, // 16 cards
  3: { size: 6, pairs: 18, time: 145, message: "6x6 (Difícil)" }, // 36 cards
};

// --- Card Component (Componente funcional simples) ---
const Card = ({ card, index, handleCardClick }) => {
  return (
    // Usa classes CSS para os estados e animação (virada de carta)
    <div
      className={`card ${card.isFlipped ? "flipped" : ""} ${
        card.isMatched ? "matched" : ""
      }`}
      onClick={() =>
        !card.isFlipped && !card.isMatched && handleCardClick(index)
      }
      style={{
        // Define o tamanho mínimo para garantir layout correto em 2x2 e 4x4
        height: "100px",
        fontSize: card.content.length > 1 ? "1.5em" : "2.5em",
      }}
    >
      <div className="card-inner">
        <div className="card-face card-back">?</div>
        <div className="card-face card-front">{card.content}</div>
      </div>
    </div>
  );
};
// ---------------------------------------------------

// Função para gerar e embaralhar o tabuleiro
const initializeBoard = (level) => {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];
  // Garante que selecionamos pares suficientes para o nível (até 18 pares para 6x6)
  const selectedEmojis = ALL_EMOJIS.slice(
    0,
    Math.min(config.pairs, ALL_EMOJIS.length)
  );

  // Duplica os conteúdos para formar pares
  let cardsContent = [...selectedEmojis, ...selectedEmojis];

  // Se for 6x6 (18 pares), preenche os dois pares faltantes com os primeiros dois emojis
  while (cardsContent.length < config.pairs * 2) {
    cardsContent.push(ALL_EMOJIS[0], ALL_EMOJIS[1]);
  }

  // Cria os objetos de carta
  let cards = cardsContent.map((content, index) => ({
    id: index,
    content,
    isFlipped: false,
    isMatched: false,
  }));

  // Shuffle (Fisher-Yates) - Embaralhamento aleatório
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
};

// Função para carregar dados do localStorage (substituindo AsyncStorage)
const loadProgress = () => {
  try {
    const savedLevel = localStorage.getItem("memoryGameLevel");
    const savedRecord = localStorage.getItem("memoryGameRecord");
    return {
      // Retorna o nível salvo ou 1 como padrão
      level: savedLevel ? parseInt(savedLevel, 10) : 1,
      // Retorna o recorde salvo ou Infinity para indicar que não há recorde
      record: savedRecord ? parseInt(savedRecord, 10) : Infinity,
    };
  } catch (e) {
    console.error("Não foi possível carregar do localStorage:", e);
    return { level: 1, record: Infinity };
  }
};

function App() {
  const initialProgress = loadProgress();

  const [currentLevel, setCurrentLevel] = useState(initialProgress.level);
  const [bestAttempts, setBestAttempts] = useState(initialProgress.record);
  const [cards, setCards] = useState(() =>
    initializeBoard(initialProgress.level)
  );
  const [flippedCards, setFlippedCards] = useState([]); // Índices das cartas viradas (máx 2)
  const [isChecking, setIsChecking] = useState(false); // Bloqueia cliques
  const [attempts, setAttempts] = useState(0);
  const [timer, setTimer] = useState(
    LEVEL_CONFIG[initialProgress.level]?.time || 30
  );
  const [gameState, setGameState] = useState("menu"); // 'menu', 'playing', 'won', 'lost'

  const currentConfig = LEVEL_CONFIG[currentLevel] || LEVEL_CONFIG[1];

  // Efeito para persistir o progresso (nível e recorde)
  useEffect(() => {
    try {
      localStorage.setItem("memoryGameLevel", currentLevel.toString());
      if (bestAttempts !== Infinity) {
        localStorage.setItem("memoryGameRecord", bestAttempts.toString());
      }
    } catch (e) {
      console.error("Não foi possível salvar no localStorage:", e);
    }
  }, [currentLevel, bestAttempts]);

  // Efeito para o temporizador regressivo
  useEffect(() => {
    if (gameState !== "playing") {
      return;
    }

    if (timer <= 0) {
      setGameState("lost"); // Jogo perdido se o tempo acabar
      return;
    }

    const timerId = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId); // Limpa o intervalo ao desmontar/re-executar
  }, [gameState, timer]);

  // Lógica de verificação de pares
  useEffect(() => {
    if (flippedCards.length === 2) {
      setIsChecking(true);
      const [index1, index2] = flippedCards;

      if (cards[index1].content === cards[index2].content) {
        // Acertou o par!
        setTimeout(() => {
          setCards((prevCards) => {
            const newCards = [...prevCards];
            newCards[index1].isMatched = true; // Marca como combinado
            newCards[index2].isMatched = true;
            return newCards;
          });
          setFlippedCards([]);
          setIsChecking(false);
          setAttempts((prev) => prev + 1);
        }, 800);
      } else {
        // Errou. Vira as cartas de volta.
        setTimeout(() => {
          setCards((prevCards) => {
            const newCards = [...prevCards];
            newCards[index1].isFlipped = false;
            newCards[index2].isFlipped = false;
            return newCards;
          });
          setFlippedCards([]);
          setIsChecking(false);
          setAttempts((prev) => prev + 1);
        }, 1200);
      }
    }
  }, [flippedCards, cards]);

  // Lógica de Vitória (Checa se todas as cartas foram combinadas)
  useEffect(() => {
    if (
      gameState === "playing" &&
      cards.length > 0 &&
      cards.every((card) => card.isMatched)
    ) {
      setGameState("won"); // Exibir animação de vitória
      // Atualiza o recorde se as tentativas atuais forem menores
      if (attempts < bestAttempts) {
        setBestAttempts(attempts);
      }
    }
  }, [cards, attempts, bestAttempts, gameState]);

  // --- Funções de Controle do Jogo ---

  const handleCardClick = useCallback(
    (index) => {
      if (
        isChecking ||
        flippedCards.length === 2 ||
        cards[index].isFlipped ||
        gameState !== "playing"
      ) {
        return;
      }

      setCards((prevCards) => {
        const newCards = [...prevCards];
        newCards[index].isFlipped = true;
        return newCards;
      });

      setFlippedCards((prev) => [...prev, index]);
    },
    [isChecking, flippedCards.length, cards, gameState]
  );

  const startGame = (level = currentLevel) => {
    const config = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];
    setCards(initializeBoard(level));
    setCurrentLevel(level);
    setAttempts(0);
    setTimer(config.time);
    setFlippedCards([]);
    setIsChecking(false);
    setGameState("playing");
  };

  const nextLevel = () => {
    const newLevel = currentLevel + 1;
    if (LEVEL_CONFIG[newLevel]) {
      startGame(newLevel);
    } else {
      setGameState("menu"); // Fim do desafio
    }
  };

  const resetProgress = () => {
    setCurrentLevel(1);
    setBestAttempts(Infinity);
    localStorage.removeItem("memoryGameLevel");
    localStorage.removeItem("memoryGameRecord");
    startGame(1);
  };

  // --- Funções de Renderização ---

  const renderGameStatus = () => (
    <div className="game-status">
      <h2>
        Nível {currentLevel} ({currentConfig.message})
      </h2>
      <p>Tentativas: {attempts}</p>
      <p>Recorde: {bestAttempts === Infinity ? "N/A" : bestAttempts}</p>
      <p>
        Tempo Restante:{" "}
        <span className={timer <= 10 ? "low-time" : ""}>{timer}s</span>
      </p>
      -
    </div>
  );

  const renderBoard = () => (
    <div
      className={`memory-board board-size-${currentConfig.size}x${currentConfig.size}`}
    >
      {cards.map((card, index) => (
        <Card
          key={index}
          card={card}
          index={index}
          handleCardClick={handleCardClick}
        />
      ))}
    </div>
  );

  const renderMenu = () => (
    <div className="game-menu">
      <h1>Jogo da Memória Evolutivo (Web)</h1>
      <p>
        Seu progresso atual: Nível {currentLevel} (
        {LEVEL_CONFIG[currentLevel]?.message || "2x2"})
      </p>
      <p className="record-display">
        Recorde de Tentativas (Melhor Resultado):{" "}
        {bestAttempts === Infinity ? "Ainda não registrado" : bestAttempts}
      </p>
      <button onClick={() => startGame(currentLevel)}>
        Continuar no Nível {currentLevel}
      </button>
      <button onClick={() => startGame(1)}>Recomeçar Nível 1</button>
      <button onClick={resetProgress}>
        Resetar Progresso (Recorde e Nível)
      </button>
    </div>
  );

  const renderWinScreen = () => (
    <div className="game-screen win-screen">
      <h1>🏆 Parabéns! Você Venceu o Nível {currentLevel}! 🥳</h1>
      <p>Você completou o nível em {attempts} tentativas. Novo recorde!</p>
      {currentLevel < 3 ? (
        <button onClick={nextLevel}>
          Avançar para o Nível {currentLevel + 1}
        </button>
      ) : (
        <p>Você completou todos os níveis do desafio inicial!</p>
      )}
      <button onClick={() => setGameState("menu")}>Voltar ao Menu</button>
    </div>
  );

  const renderLoseScreen = () => (
    <div className="game-screen lose-screen">
      <h1>⏰ Fim de Jogo!</h1>
      <p>O tempo acabou. Tente novamente!</p>
      <button onClick={() => startGame(currentLevel)}>
        Tentar Novamente (Nível {currentLevel})
      </button>
      <button onClick={() => setGameState("menu")}>Voltar ao Menu</button>
    </div>
  );

  // --- Renderização Principal ---
  return (
    <div id="root">
      {gameState === "menu" && renderMenu()}
      {gameState === "playing" && (
        <>
          {renderGameStatus()}
          {renderBoard()}
        </>
      )}
      {gameState === "won" && renderWinScreen()}
      {gameState === "lost" && renderLoseScreen()}
    </div>
  );
}

export default App;
