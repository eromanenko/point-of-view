/**
 * Card Renderer module.
 * Handles DOM updates for displaying card content.
 */

window.CardRenderer = (function() {
  const cardScreen = document.getElementById('card-screen');
  const imageScreen = document.getElementById('image-screen');
  const cardBg = document.getElementById('card-bg');
  const cardTitle = document.getElementById('card-title');
  const cardText = document.getElementById('card-text');
  const cardQuestion = document.getElementById('card-question');
  const cardStars = document.getElementById('card-stars');
  const imageView = document.getElementById('image-view');
  const cardNumberText = document.getElementById('card-number-text');

  function renderCard(card, lang) {
    if (card.type === 'image') {
      renderImageCard(card, lang);
    } else {
      renderTextCard(card, lang);
    }
  }

  function renderTextCard(card, lang) {
    // Show/hide screens
    imageScreen.classList.remove('active');
    cardScreen.classList.add('active');
    
    // Set background image
    if (card.gameBg) {
      cardBg.style.backgroundImage = `url(${card.gameBg})`;
    } else {
      cardBg.style.backgroundImage = 'none';
    }

    // Set card number text
    cardNumberText.textContent = card.card;

    const textContent = card.text[lang] || '';
    
    // Reset elements
    cardTitle.classList.add('hidden');
    cardQuestion.classList.add('hidden');
    cardStars.classList.add('hidden');
    cardText.textContent = '';
    cardQuestion.textContent = '';
    cardStars.innerHTML = '';

    if (card.type === 'question') {
      // Find question marker
      const markers = ["Frage:", "Question:", "Запитання:", "Вопрос:"];
      let questionIndex = -1;
      let usedMarker = '';
      
      for (const marker of markers) {
        questionIndex = textContent.indexOf(marker);
        if (questionIndex !== -1) {
          usedMarker = marker;
          break;
        }
      }

      if (questionIndex !== -1) {
        // Split text into context and question
        const contextText = textContent.substring(0, questionIndex).trim();
        const qText = textContent.substring(questionIndex).trim();
        
        cardText.textContent = contextText;
        cardQuestion.textContent = qText;
        cardQuestion.classList.remove('hidden');
      } else {
        // Fallback if marker not found
        cardText.textContent = textContent;
      }

      // Render stars
      if (card.level) {
        const totalStars = 3;
        let starsHtml = '';
        for (let i = 1; i <= totalStars; i++) {
          if (i <= card.level) {
            starsHtml += '<span class="star">★</span>';
          } else {
            starsHtml += '<span class="star empty">★</span>';
          }
        }
        cardStars.innerHTML = starsHtml;
        cardStars.classList.remove('hidden');
      }
    } else if (card.type === 'story') {
      cardText.textContent = textContent;
    } else {
      // For introduction, answer, early, epilogue
      const titleText = DataLoader.getDictWord(card.type, lang);
      if (titleText) {
        cardTitle.textContent = titleText;
        cardTitle.classList.remove('hidden');
      }
      cardText.textContent = textContent;
    }
  }

  function renderImageCard(card, lang) {
    // Show/hide screens
    cardScreen.classList.remove('active');
    imageScreen.classList.add('active');
    
    // Set card number text
    cardNumberText.textContent = card.card;

    // Load image
    // e.g. LP-A-10-EN.jpg
    // Need to handle missing files or specific extensions, but assuming .jpg per user comment
    const imgPath = `img/${card.gameCode}-${card.card.replace('-', '-')}-${lang}.jpg`; 
    // Wait, the card key is "A-10". So it's LP-A-10-lang.jpg
    const [storyLetter, cardNum] = card.card.split('-'); 
    // BUT in data we have key e.g. A-10, we don't have it directly in card object unless we pass it.
    // Let's deduce it. card.card is "1-10". 1 is A.
    const storyLetterDeduc = String.fromCharCode(64 + parseInt(storyLetter, 10));
    // Remove leading zeros for the image name if any
    const numPart = parseInt(cardNum, 10);
    const correctImgPath = `img/${card.gameCode}-${storyLetterDeduc}-${numPart}-${lang}.jpg`;

    imageView.src = correctImgPath;
  }

  return {
    renderCard,
    renderTextCard,
    renderImageCard
  };
})();
