const fs = require('fs');
const { parseInputFile } = require('./parseInput');
const { fillTemplate } = require('./fillTemplate');
const { buildTemplatePath, buildOutputFileName, extractArchiveNumber } = require('./buildPaths');
const { buildZip } = require('./buildZip');

// Ошибка с понятным для пользователя сообщением (в отличие от неожиданного падения сервера).
class GenerationError extends Error {}

// Полный цикл генерации: xlsx (буфер) -> список заполненных docx -> zip-архив.
// Если для какой-то строки нет шаблона или выходные имена совпадают —
// вся генерация останавливается с понятной ошибкой (так решил пользователь).
async function generateDocuments(xlsxBuffer, inputFileName, controlMethod) {
  const rows = await parseInputFile(xlsxBuffer);

  if (rows.length === 0) {
    throw new GenerationError('В файле нет ни одной строки с данными');
  }

  const files = [];
  const usedNames = new Set();

  for (const row of rows) {
    if (!row.qualificationDigit || !row.weldingMethod) {
      throw new GenerationError(
        `Не удалось определить квалификацию или способ сварки для строки с ФИО "${row.fio}"`,
      );
    }

    const templatePath = buildTemplatePath(row.qualificationDigit, row.weldingMethod, controlMethod);
    if (!fs.existsSync(templatePath)) {
      throw new GenerationError(
        `Не найден шаблон для строки "${row.fio}" (квалификация ${row.qualificationDigit}, ` +
          `способ сварки ${row.weldingMethod}, метод контроля ${controlMethod}). ` +
          `Ожидался файл: ${templatePath}`,
      );
    }

    const outputName = buildOutputFileName(row, controlMethod);
    if (usedNames.has(outputName)) {
      throw new GenerationError(`Совпадение имён выходных файлов: "${outputName}" уже есть в списке`);
    }
    usedNames.add(outputName);

    const buffer = fillTemplate(templatePath, row);
    files.push({ name: outputName, buffer });
  }

  const zipBuffer = await buildZip(files);
  const archiveName = `${extractArchiveNumber(inputFileName)}.zip`;

  return { zipBuffer, archiveName };
}

module.exports = { generateDocuments, GenerationError };
