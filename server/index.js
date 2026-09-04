const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { generateDocuments, GenerationError } = require('./generateDocuments');

const app = express();
const PORT = 3001;
const upload = multer({ storage: multer.memoryStorage() });

const CONTROL_METHODS = ['ВИК', 'РК', 'ПВК'];

// Готовые архивы храним в памяти по id, пока их не скачают.
const generations = new Map();

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.post('/api/generate', upload.single('file'), async (req, res) => {
  const { file } = req;
  const { controlMethod } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'Не передан xlsx-файл' });
  }
  if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
    return res.status(400).json({ error: 'Файл должен быть в формате .xlsx' });
  }
  if (!CONTROL_METHODS.includes(controlMethod)) {
    return res.status(400).json({ error: 'Метод контроля должен быть одним из: ВИК, РК, ПВК' });
  }

  try {
    const { zipBuffer, archiveName } = await generateDocuments(file.buffer, file.originalname, controlMethod);
    const id = crypto.randomUUID();
    generations.set(id, { zipBuffer, archiveName });
    res.json({ id });
  } catch (error) {
    if (error instanceof GenerationError) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при генерации документов' });
  }
});

app.get('/api/download/:id', (req, res) => {
  const generation = generations.get(req.params.id);
  if (!generation) {
    return res.status(404).json({ error: 'Архив не найден. Возможно, он уже был скачан или устарел' });
  }

  res.set('Content-Type', 'application/zip');
  res.set('Content-Disposition', `attachment; filename="${generation.archiveName}"`);
  res.send(generation.zipBuffer);
  generations.delete(req.params.id);
});

// Собранный клиент (npm run build --prefix client). Позволяет запускать
// одной командой (node server/index.js) без Vite — например, портативным
// Node.js на компьютере без установленного npm-сервера разработки.
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDistPath, 'index.html'))) {
  app.use(express.static(clientDistPath));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
