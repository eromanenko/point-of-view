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
  const cardNumberBtn = document.getElementById('card-number-btn');
  const placeholderScreen = document.getElementById('placeholder-screen');
  const cardScreen = document.getElementById('card-screen');
  const imageScreen = document.getElementById('image-screen');
  const toastEl = document.getElementById('toast');
  const scanFab = document.getElementById('scan-fab');
  const ghostIcon = document.getElementById('ghost-icon');
  const centerScanIcon = document.getElementById('center-scan-icon');

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
    cardNumberBtn.addEventListener('click', () => {
      closeCard();
    });

    // Touch scanning events
    // Apply only to placeholder and fab instead of globally
    
    // Placeholder screen interactions
    placeholderScreen.addEventListener('touchstart', handleTouchStart, { passive: false });
    placeholderScreen.addEventListener('touchend', handleTouchEnd);
    placeholderScreen.addEventListener('touchcancel', handleTouchEnd);
    placeholderScreen.addEventListener('mousedown', handleTouchStart);
    placeholderScreen.addEventListener('mouseup', handleTouchEnd);
    
    // Scan FAB interactions
    scanFab.addEventListener('touchstart', handleTouchStart, { passive: false });
    scanFab.addEventListener('touchend', handleTouchEnd);
    scanFab.addEventListener('touchcancel', handleTouchEnd);
    scanFab.addEventListener('mousedown', handleTouchStart);
    scanFab.addEventListener('mouseup', handleTouchEnd);
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
    const fromPlaceholder = placeholderScreen.classList.contains('active');
    
    state.currentCard = card;
    CardRenderer.renderCard(card, state.language);
    
    placeholderScreen.classList.remove('active');
    cardNumberBtn.classList.remove('hidden');

    if (fromPlaceholder) {
      playScanIconAnimation();
    } else {
      scanFab.classList.remove('hidden');
    }
  }

  function playScanIconAnimation() {
    const centerRect = centerScanIcon.getBoundingClientRect();
    
    // Temporarily show fab to get its coordinates, but keep it invisible
    scanFab.style.opacity = '0';
    scanFab.classList.remove('hidden');
    const fabRect = scanFab.getBoundingClientRect();
    
    // Center the ghost icon perfectly over the center icon
    ghostIcon.classList.remove('hidden');
    ghostIcon.style.left = centerRect.left + 'px';
    ghostIcon.style.top = centerRect.top + 'px';
    
    // Calculate the translation to move ghost exactly over fab center
    const deltaX = fabRect.left - centerRect.left + (fabRect.width - centerRect.width) / 2;
    const deltaY = fabRect.top - centerRect.top + (fabRect.height - centerRect.height) / 2;
    
    // The FAB icon is 28x28, the center icon is 48x48. Scale factor = 28/48
    const scaleFactor = 28 / 48;

    const animation = ghostIcon.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { 
        transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleFactor})`,
        opacity: 0.3
      }
    ], {
      duration: 600,
      easing: 'cubic-bezier(0.2, 0, 0.2, 1)'
    });
    
    animation.onfinish = () => {
      ghostIcon.classList.add('hidden');
      scanFab.style.opacity = '';
    };
  }

  function closeCard() {
    state.currentCard = null;
    cardScreen.classList.remove('active');
    imageScreen.classList.remove('active');
    placeholderScreen.classList.add('active');
    cardNumberBtn.classList.add('hidden');
    scanFab.classList.add('hidden');
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
