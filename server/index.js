const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { generateDocuments, inspectInput, GenerationError } = require('./generateDocuments');
const { CONTROL_METHODS } = require('./buildPaths');

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

// Готовые архивы храним в памяти по id, пока их не скачают.
const generations = new Map();

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// Общая проверка загруженного файла. Возвращает текст ошибки или null.
function checkUploadedFile(file) {
  if (!file) return 'Не передан xlsx-файл';
  if (!file.originalname.toLowerCase().endsWith('.xlsx')) return 'Файл должен быть в формате .xlsx';
  return null;
}

function sendError(res, error, fallbackMessage) {
  if (error instanceof GenerationError) {
    return res.status(400).json({ error: error.message });
  }
  console.error(error);
  res.status(500).json({ error: fallbackMessage });
}

// Предварительная проверка файла: фронт узнаёт, нужен ли выбор метода контроля.
app.post('/api/inspect', upload.single('file'), async (req, res) => {
  const fileError = checkUploadedFile(req.file);
  if (fileError) {
    return res.status(400).json({ error: fileError });
  }

  try {
    res.json(await inspectInput(req.file.buffer));
  } catch (error) {
    sendError(res, error, 'Внутренняя ошибка сервера при чтении файла');
  }
});

app.post('/api/generate', upload.single('file'), async (req, res) => {
  const { file } = req;
  // Метод контроля необязателен: для папок с несколькими шаблонами
  // (например 3/РД) создаются все акты сразу.
  const controlMethod = req.body.controlMethod || null;

  const fileError = checkUploadedFile(file);
  if (fileError) {
    return res.status(400).json({ error: fileError });
  }
  if (controlMethod && !CONTROL_METHODS.includes(controlMethod)) {
    return res.status(400).json({ error: 'Метод контроля должен быть одним из: ВИК, РК, ПВК' });
  }

  try {
    const { zipBuffer, archiveName } = await generateDocuments(file.buffer, file.originalname, controlMethod);
    const id = crypto.randomUUID();
    generations.set(id, { zipBuffer, archiveName });
    res.json({ id });
  } catch (error) {
    sendError(res, error, 'Внутренняя ошибка сервера при генерации документов');
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
