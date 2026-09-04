const { ZipArchive } = require('archiver');

// Собирает список файлов { name, buffer } в один zip-архив.
// Возвращает промис с готовым буфером архива.
function buildZip(files) {
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive();
    const chunks = [];

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('error', reject);
    archive.on('end', () => resolve(Buffer.concat(chunks)));

    files.forEach(({ name, buffer }) => {
      archive.append(buffer, { name });
    });

    archive.finalize();
  });
}

module.exports = { buildZip };
