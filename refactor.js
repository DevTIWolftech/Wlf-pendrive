import fs from 'fs';
import path from 'path';

const replacements = [
  ['bg-zinc-950', 'dark:bg-zinc-950 bg-gray-50'],
  ['bg-zinc-900', 'dark:bg-zinc-900 bg-white'],
  ['border-zinc-800', 'dark:border-zinc-800 border-gray-200'],
  ['text-zinc-100', 'dark:text-zinc-100 text-gray-900'],
  ['text-zinc-200', 'dark:text-zinc-200 text-gray-800'],
  ['text-zinc-300', 'dark:text-zinc-300 text-gray-700'],
  ['text-zinc-400', 'dark:text-zinc-400 text-gray-500'],
  ['text-zinc-500', 'dark:text-zinc-500 text-gray-400'],
  ['text-zinc-600', 'dark:text-zinc-600 text-gray-400'],
  ['bg-zinc-800', 'dark:bg-zinc-800 bg-gray-100'],
  ['hover:bg-zinc-800', 'dark:hover:bg-zinc-800 hover:bg-gray-100'],
  ['hover:bg-zinc-700', 'dark:hover:bg-zinc-700 hover:bg-gray-200'],
  ['border-zinc-700', 'dark:border-zinc-700 border-gray-300'],
  ['bg-black/60', 'dark:bg-black/60 bg-gray-900/40'],
  ['bg-zinc-500/10', 'dark:bg-zinc-500/10 bg-gray-500/10'],
  ['border-zinc-500/20', 'dark:border-zinc-500/20 border-gray-500/20'],
  ['divide-zinc-800', 'dark:divide-zinc-800 divide-gray-200'],
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [oldClass, newClass] of replacements) {
    const regex = new RegExp(`(?<!dark:)\\b${oldClass.replace('/', '\\/')}\\b`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, newClass);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

function processDir(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

processDir('./src');
