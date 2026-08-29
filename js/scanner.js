/**
 * Scanner module.
 * Manages the camera and QR decoding using html5-qrcode.
 */

window.Scanner = (function() {
  let html5QrCode = null;
  let isScanning = false;
  let detectedCardData = null; // Store the last detected card during continuous scan
  let scanCallback = null;
  
  const cameraOverlay = document.getElementById('camera-overlay');
  const cameraBorder = document.getElementById('camera-border');
  const cameraCardNumber = document.getElementById('camera-card-number');

  function init() {
    html5QrCode = new Html5Qrcode("camera-container");
  }

  function parseQRUrl(url) {
    // LP: https://haba-play.com/point-of-view?card=LP-A-2
    // SF: https://qrco.de/bfbHX4?card=SF-D-11
    try {
      const urlObj = new URL(url);
      const cardParam = urlObj.searchParams.get('card');
      if (!cardParam) return null;

      // Expecting format like "LP-A-2" or "SF-D-11"
      const parts = cardParam.split('-');
      if (parts.length >= 3) {
        const gameCode = parts[0]; // LP or SF
        const storyLetter = parts[1]; // A, B, C, D
        const cardNum = parts[2]; // 1, 2, 10
        const cardKey = `${storyLetter}-${cardNum}`;
        return { gameCode, cardKey };
      }
    } catch (e) {
      console.warn("Invalid URL format in QR code", url);
    }
    return null;
  }

  function start(onDetectedCallback) {
    if (isScanning || !html5QrCode) return;
    
    scanCallback = onDetectedCallback;
    detectedCardData = null;
    isScanning = true;
    
    // Show UI
    cameraOverlay.classList.remove('hidden');
    cameraBorder.classList.remove('detected');
    cameraCardNumber.classList.add('hidden');
    cameraCardNumber.textContent = '';

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
      .catch((err) => {
        console.error("Error starting camera", err);
        App.showToast("Could not start camera");
        stop();
      });
  }

  function stop() {
    if (!isScanning || !html5QrCode) return Promise.resolve();
    
    isScanning = false;
    cameraOverlay.classList.add('hidden');
    
    return html5QrCode.stop().then(() => {
      html5QrCode.clear();
      return detectedCardData; // Return whatever was detected
    }).catch((err) => {
      console.error("Error stopping camera", err);
      return null;
    });
  }

  function onScanSuccess(decodedText, decodedResult) {
    if (detectedCardData) return; // Already detected something in this session

    const parsed = parseQRUrl(decodedText);
    if (parsed) {
      const card = DataLoader.getCard(parsed.gameCode, parsed.cardKey);
      if (card) {
        detectedCardData = card;
        
        // Visual feedback
        cameraBorder.classList.add('detected');
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }
        
        // Show card number overlay
        cameraCardNumber.textContent = card.card;
        cameraCardNumber.classList.remove('hidden');
        
        if (scanCallback) {
          scanCallback(card);
        }
      }
    }
  }

  function onScanFailure(error) {
    // Continuous scan errors are expected when no QR is in frame, just ignore
  }

  function getDetectedCard() {
    return detectedCardData;
  }

  return {
    init,
    start,
    stop,
    getDetectedCard
  };
})();
