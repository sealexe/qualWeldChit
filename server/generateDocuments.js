const fs = require('fs');
const { parseInputFile } = require('./parseInput');
const { fillTemplate } = require('./fillTemplate');
const {
  buildTemplatePath,
  listControlMethods,
  buildOutputFileName,
  buildPersonFolderName,
  extractArchiveNumber,
} = require('./buildPaths');
const { buildZip } = require('./buildZip');

// Ошибка с понятным для пользователя сообщением (в отличие от неожиданного падения сервера).
class GenerationError extends Error {}

// Если в папке шаблонов несколько методов контроля (например templates/3/РД:
// ВИК, РК, ПВК) — для сварщика создаются сразу все акты и кладутся в его папку.
// Если шаблон один (например templates/3/ЗН или templates/2/РД) — как раньше,
// один файл по выбранному на фронте методу контроля, без отдельной папки.
function hasMultipleTemplates(row) {
  return listControlMethods(row.qualificationDigit, row.weldingMethod).length > 1;
}

function checkRow(row) {
  if (!row.qualificationDigit || !row.weldingMethod) {
    throw new GenerationError(
      `Не удалось определить квалификацию или способ сварки для строки с ФИО "${row.fio}"`,
    );
  }
}

async function readRows(xlsxBuffer) {
  const rows = await parseInputFile(xlsxBuffer);
  if (rows.length === 0) {
    throw new GenerationError('В файле нет ни одной строки с данными');
  }
  rows.forEach(checkRow);
  return rows;
}

// Быстрая проверка файла до генерации: нужен ли пользователю выбор
// метода контроля (он нужен, только если есть строки с одним шаблоном).
async function inspectInput(xlsxBuffer) {
  const rows = await readRows(xlsxBuffer);
  const multiRows = rows.filter(hasMultipleTemplates);
  return {
    rowCount: rows.length,
    multiTemplateCount: multiRows.length,
    needsControlMethod: multiRows.length < rows.length,
  };
}

// Список { controlMethod, zipPath } — какие акты делать для строки и куда их класть в архиве.
function planRowFiles(row, controlMethod) {
  const methods = listControlMethods(row.qualificationDigit, row.weldingMethod);

  if (methods.length > 1) {
    const folder = buildPersonFolderName(row);
    // Внутри zip разделитель папок всегда "/" (так требует формат zip),
    // поэтому здесь не path.join — он на Windows поставил бы "\".
    return methods.map((method) => ({
      controlMethod: method,
      zipPath: `${folder}/${buildOutputFileName(row, method)}`,
    }));
  }

  if (!controlMethod) {
    throw new GenerationError(
      `Для строки "${row.fio}" (квалификация ${row.qualificationDigit}, способ сварки ` +
        `${row.weldingMethod}) нужно выбрать метод контроля`,
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

  return [{ controlMethod, zipPath: buildOutputFileName(row, controlMethod) }];
}

// Полный цикл генерации: xlsx (буфер) -> список заполненных docx -> zip-архив.
// Если для какой-то строки нет шаблона или выходные имена совпадают —
// вся генерация останавливается с понятной ошибкой (так решил пользователь).
async function generateDocuments(xlsxBuffer, inputFileName, controlMethod) {
  const rows = await readRows(xlsxBuffer);

  const files = [];
  const usedNames = new Set();

  for (const row of rows) {
    for (const { controlMethod: method, zipPath } of planRowFiles(row, controlMethod)) {
      if (usedNames.has(zipPath)) {
        throw new GenerationError(`Совпадение имён выходных файлов: "${zipPath}" уже есть в списке`);
      }
      usedNames.add(zipPath);

      const templatePath = buildTemplatePath(row.qualificationDigit, row.weldingMethod, method);
      files.push({ name: zipPath, buffer: fillTemplate(templatePath, row) });
    }
  }

  const zipBuffer = await buildZip(files);
  const archiveName = `${extractArchiveNumber(inputFileName)}.zip`;

  return { zipBuffer, archiveName };
}

module.exports = { generateDocuments, inspectInput, GenerationError };
