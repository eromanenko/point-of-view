/**
 * Main application module.
 * Ties together data, UI, and scanner.
 */

window.App = (function() {
  const state = {
    language: localStorage.getItem('pov_lang') || 'EN',
    currentCard: null
  };

  let touchTimeout = null;
  const SCAN_DELAY = 300; // ms to wait before starting camera on touchstart

  // DOM Elements
  const langBtn = document.getElementById('lang-btn');
  const langMenu = document.getElementById('lang-menu');
  const langOptions = document.querySelectorAll('.lang-option');
  const closeBtn = document.getElementById('close-btn');
  const placeholderScreen = document.getElementById('placeholder-screen');
  const cardScreen = document.getElementById('card-screen');
  const imageScreen = document.getElementById('image-screen');
  const toastEl = document.getElementById('toast');

  async function init() {
    // Load Data
    const success = await DataLoader.loadData();
    if (!success) {
      showToast('Error loading game data');
      return;
    }

    // Init UI
    updateLanguageUI();
    
    // Init Scanner
    Scanner.init();

    // Event Listeners
    setupEvents();

    // Check URL for card param (for desktop testing)
    const urlParams = new URLSearchParams(window.location.search);
    const cardParam = urlParams.get('card');
    if (cardParam) {
      const parts = cardParam.split('-');
      if (parts.length >= 3) {
        const gameCode = parts[0];
        const storyLetter = parts[1];
        const cardNum = parts[2];
        const cardKey = `${storyLetter}-${cardNum}`;
        const card = DataLoader.getCard(gameCode, cardKey);
        if (card) {
           showCard(card);
        }
      }
    }
  }

  function setupEvents() {
    // Language menu toggle
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.classList.remove('hidden');
      langBtn.classList.add('hidden');
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      langMenu.classList.add('hidden');
      langBtn.classList.remove('hidden');
    });

    // Language selection
    langOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const newLang = e.target.dataset.lang;
        setLanguage(newLang);
        langMenu.classList.add('hidden');
        langBtn.classList.remove('hidden');
      });
    });

    // Close card button
    closeBtn.addEventListener('click', () => {
      closeCard();
    });

    // Touch scanning events
    // Apply to document, but ignore if touching specific UI elements
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
    
    // For desktop testing
    document.addEventListener('mousedown', handleTouchStart);
    document.addEventListener('mouseup', handleTouchEnd);
  }

  function setLanguage(lang) {
    state.language = lang;
    localStorage.setItem('pov_lang', lang);
    updateLanguageUI();

    // Live update if a card is open
    if (state.currentCard) {
      CardRenderer.renderCard(state.currentCard, state.language);
    }
  }

  function updateLanguageUI() {
    langBtn.textContent = state.language;
    langOptions.forEach(opt => {
      if (opt.dataset.lang === state.language) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });

    // Update placeholder text based on language
    const hintText = DataLoader.getDictWord('scan_hint', state.language);
    if (hintText) {
      document.getElementById('placeholder-text').textContent = hintText;
    }
  }

  function handleTouchStart(e) {
    // Ignore if clicking on language bar, close button, or toast
    if (e.target.closest('#lang-bar') || e.target.closest('#close-btn') || e.target.closest('#toast')) {
      return;
    }
    
    // Only handle primary touch
    if (e.type === 'touchstart' && e.touches.length > 1) return;

    // Optional: prevent default to avoid scrolling while holding, 
    // but we only want to prevent it if we're starting a scan.
    // Let's delay starting the camera to distinguish from a tap/scroll.
    touchTimeout = setTimeout(() => {
      startScanning();
    }, SCAN_DELAY);
  }

  function handleTouchEnd(e) {
    if (touchTimeout) {
      clearTimeout(touchTimeout);
      touchTimeout = null;
    }

    // Stop scanning and see what we got
    Scanner.stop().then(card => {
      if (card) {
        showCard(card);
      } else if (document.getElementById('camera-overlay').classList.contains('hidden') === false) {
        // Camera was open but no card detected
        showToast('QR code not found');
      }
    });
  }

  function startScanning() {
    Scanner.start((card) => {
      // Called when card is detected while holding
      // We don't auto-close, we wait for touchend
    });
  }

  function showCard(card) {
    state.currentCard = card;
    CardRenderer.renderCard(card, state.language);
    
    placeholderScreen.classList.remove('active');
    closeBtn.classList.remove('hidden');
  }

  function closeCard() {
    state.currentCard = null;
    cardScreen.classList.remove('active');
    imageScreen.classList.remove('active');
    placeholderScreen.classList.add('active');
    closeBtn.classList.add('hidden');
    document.getElementById('card-number').classList.add('hidden');
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    
    // Clear previous timeout if any
    if (toastEl.timeoutId) {
      clearTimeout(toastEl.timeoutId);
    }
    
    toastEl.timeoutId = setTimeout(() => {
      toastEl.classList.add('hidden');
    }, 2000);
  }

  return {
    init,
    showToast
  };
})();

// Start App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
