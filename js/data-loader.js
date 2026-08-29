/**
 * Data loader module.
 * Fetches and stores the game data JSON.
 */

window.DataLoader = (function() {
  let gameData = null;

  async function loadData() {
    try {
      const response = await fetch('data/cards.json');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      gameData = await response.json();
      console.log('Game data loaded:', gameData);
      return true;
    } catch (error) {
      console.error('Error loading game data:', error);
      return false;
    }
  }

  function getCard(gameCode, cardKey) {
    if (!gameData || !gameData.games[gameCode]) {
      return null;
    }
    const game = gameData.games[gameCode];
    const card = game.cards[cardKey];
    if (!card) return null;

    // Return combined object with game context
    return {
      ...card,
      gameCode: gameCode,
      gameBg: game.bg
    };
  }

  function getDictWord(type, lang) {
    if (!gameData || !gameData.dict[type]) return '';
    return gameData.dict[type][lang] || '';
  }

  return {
    loadData,
    getCard,
    getDictWord
  };
})();
