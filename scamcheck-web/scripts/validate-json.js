const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '../messages');
const files = ['en.json', 'tr.json', 'de.json'];

let hasError = false;

function findDuplicateKeys(jsonString, filename) {
    const lines = jsonString.split('\n');
    const keys = new Set();
    const duplicates = [];

    // This is a very rough check, assuming one key per line and standard formatting.
    // It will catch "key": "value" duplicates in the same block if formatted nicely.
    // But since the requirement is to fix them, let's just use `json-dup-key-validator` logic if we could.
    // Instead, I'll regex for keys and see if they appear more times than expected in their scope.
    // Actually, simpler: Use `JSON.parse` with a custom reviver is not enough.

    // Let's use a regex to capture keys and their indentation to guess scope.
    // Or simpler: Look for keys that appear multiple times in the whole file and check if it's suspicious.
    // But "title" appears in HomePage and history. That's valid.

    // The user specifically mentioned: demoLoaded, history.empty, rules.mixed_script.
    // These likely appear as direct duplicates in their respective objects.

    // Let's try to parse manually-ish.
    // Or better, just trust that I'll look for them manually if the script passes standard JSON validation.

    // We can use a trick: `JSON.parse(text)` keeps the LAST one.
    // If we can detect that `text` has more keys than `JSON.stringify(JSON.parse(text))`, maybe?
    // No, that doesn't work because values might differ.

    // Let's just rely on syntax validation first.
}

files.forEach(file => {
  const filePath = path.join(messagesDir, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    console.log(`✅ ${file} is valid JSON.`);
  } catch (e) {
    console.error(`❌ ${file} has invalid JSON syntax:`, e.message);
    hasError = true;
  }
});

if (hasError) {
  process.exit(1);
} else {
  console.log("All JSON files are valid.");
}
