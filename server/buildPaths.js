const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// Путь к шаблону: templates/<квалификация>/<способ сварки>/<метод контроля>.docx
function buildTemplatePath(qualificationDigit, weldingMethod, controlMethod) {
  return path.join(TEMPLATES_DIR, qualificationDigit, weldingMethod, `${controlMethod}.docx`);
}

// Windows запрещает в именах файлов символы: \ / : * ? " < > |
function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

// Имя выходного файла: "<ФИО>, <способ сварки>(<цифра>) №<Номер>-ОК-<метод контроля>.docx"
function buildOutputFileName(row, controlMethod) {
  const rawName = `${row.fio}, ${row.weldingMethod}(${row.qualificationDigit}) №${row.number}-ОК-${controlMethod}.docx`;
  return sanitizeFileName(rawName);
}

// Имя архива = первое число в имени входного xlsx-файла,
// например из "65. 5ЭЦ-Группа № 321 (ВИК).xlsx" получаем "65".
function extractArchiveNumber(inputFileName) {
  const match = inputFileName.match(/\d+/);
  return match ? match[0] : 'archive';
}

module.exports = {
  buildTemplatePath,
  buildOutputFileName,
  sanitizeFileName,
  extractArchiveNumber,
};
