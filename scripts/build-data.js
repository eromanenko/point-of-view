const fs = require('fs');
const path = require('path');

// --- CSV Parser (handles quoted multiline fields, escaped quotes) ---
function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const row = [];
    while (i < len) {
      let value = '';
      // Skip leading whitespace (but not newlines)
      while (i < len && text[i] === ' ') i++;

      if (i < len && text[i] === '"') {
        // Quoted field
        i++; // skip opening quote
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              // Escaped quote
              value += '"';
              i += 2;
            } else {
              // End of quoted field
              i++; // skip closing quote
              break;
            }
          } else {
            value += text[i];
            i++;
          }
        }
      } else {
        // Unquoted field
        while (i < len && text[i] !== ',' && text[i] !== '\r' && text[i] !== '\n') {
          value += text[i];
          i++;
        }
      }

      row.push(value);

      if (i < len && text[i] === ',') {
        i++; // skip comma
      } else {
        break; // end of row
      }
    }

    // Skip line endings
    while (i < len && (text[i] === '\r' || text[i] === '\n')) {
      i++;
    }

    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

// --- Parse dict.csv ---
function parseDict(csvText) {
  const rows = parseCSV(csvText);
  const header = rows[0]; // id,DE,EN,UK,RU
  const dict = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id = row[0];
    dict[id] = {};
    for (let j = 1; j < header.length; j++) {
      dict[id][header[j]] = row[j] || '';
    }
  }

  return dict;
}

// --- Parse game CSV (lost_places or spooky_festival) ---
function parseGameCSV(csvText) {
  const rows = parseCSV(csvText);
  // header: card,cardType,level,DE,EN,UK,RU
  const cards = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 7) continue;

    const cardId = row[0].trim();   // e.g. "1-1", "1-10"
    const cardType = row[1].trim(); // e.g. "introduction", "question", "image"
    const level = row[2].trim();    // e.g. "1", "2", "3", or ""
    const textDE = row[3] || '';
    const textEN = row[4] || '';
    const textUK = row[5] || '';
    const textRU = row[6] || '';

    // Parse card ID: "1-2" → story=1, number=2
    const parts = cardId.split('-');
    const storyNum = parseInt(parts[0], 10);
    const cardNum = parseInt(parts[1], 10);

    // Map story number to letter: 1→A, 2→B, 3→C, 4→D
    const storyLetter = String.fromCharCode(64 + storyNum); // 1→A

    // QR key format: "A-2", "B-10"
    const qrKey = `${storyLetter}-${cardNum}`;

    // Display card number: zero-padded for single digits
    const displayCard = `${storyNum}-${cardNum.toString().padStart(2, '0')}`;

    cards[qrKey] = {
      card: displayCard,
      type: cardType,
      level: level ? parseInt(level, 10) : null,
      text: {
        DE: textDE.replace(/\r/g, ''),
        EN: textEN.replace(/\r/g, ''),
        UK: textUK.replace(/\r/g, ''),
        RU: textRU.replace(/\r/g, '')
      }
    };
  }

  return cards;
}

// --- Main ---
function main() {
  const dbDir = path.join(__dirname, '..', 'db');
  const dataDir = path.join(__dirname, '..', 'data');

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Parse dict
  const dictCSV = fs.readFileSync(path.join(dbDir, 'dict.csv'), 'utf-8');
  const dict = parseDict(dictCSV);

  // Parse Lost Places
  const lpCSV = fs.readFileSync(path.join(dbDir, 'lost_places.csv'), 'utf-8');
  const lpCards = parseGameCSV(lpCSV);

  // Parse Spooky Festival
  const sfCSV = fs.readFileSync(path.join(dbDir, 'spooky_festival.csv'), 'utf-8');
  const sfCards = parseGameCSV(sfCSV);

  // Build output
  const output = {
    dict: dict,
    games: {
      LP: {
        name: 'Lost Places',
        bg: 'assets/lp_bg.jpg',
        cards: lpCards
      },
      SF: {
        name: 'Spooky Festival',
        bg: 'assets/sf_bg.jpg',
        cards: sfCards
      }
    }
  };

  // Write JSON
  const outputPath = path.join(dataDir, 'cards.json');
  fs.writeFileSync(outputPath, JSON.stringify(output), 'utf-8');

  // Stats
  const lpCount = Object.keys(lpCards).length;
  const sfCount = Object.keys(sfCards).length;
  const lpTypes = {};
  const sfTypes = {};
  Object.values(lpCards).forEach(c => { lpTypes[c.type] = (lpTypes[c.type] || 0) + 1; });
  Object.values(sfCards).forEach(c => { sfTypes[c.type] = (sfTypes[c.type] || 0) + 1; });

  console.log(`✅ Generated ${outputPath}`);
  console.log(`   Lost Places: ${lpCount} cards`, lpTypes);
  console.log(`   Spooky Festival: ${sfCount} cards`, sfTypes);
  console.log(`   Dict entries: ${Object.keys(dict).length}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
}

main();
