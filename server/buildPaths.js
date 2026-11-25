const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// Все методы контроля в том порядке, в каком их показываем и кладём в архив.
const CONTROL_METHODS = ['ВИК', 'РК', 'ПВК'];

// Путь к шаблону: templates/<квалификация>/<способ сварки>/<метод контроля>.docx
function buildTemplatePath(qualificationDigit, weldingMethod, controlMethod) {
  return path.join(TEMPLATES_DIR, qualificationDigit, weldingMethod, `${controlMethod}.docx`);
}

// Какие методы контроля есть в папке templates/<квалификация>/<способ сварки>.
// Например для templates/3/РД вернёт ['ВИК', 'РК', 'ПВК'], для templates/3/ЗН — ['ВИК'].
// Если папки нет — пустой массив.
function listControlMethods(qualificationDigit, weldingMethod) {
  return CONTROL_METHODS.filter((method) =>
    fs.existsSync(buildTemplatePath(qualificationDigit, weldingMethod, method)),
  );
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

// "Иванов Иван Иванович" -> "Иванов И.И."
// Первое слово — фамилия целиком, от остальных слов берём первую букву.
function shortenFio(fio) {
  const [surname, ...rest] = String(fio).trim().split(/\s+/);
  const initials = rest.map((word) => `${word[0].toUpperCase()}.`).join('');
  return initials ? `${surname} ${initials}` : surname;
}

// Имя папки сварщика, в которую кладутся все его акты:
// "<Фамилия И.О.> <способ сварки>(<цифра>)", например "Иванов И.И. РД(3)".
function buildPersonFolderName(row) {
  return sanitizeFileName(`${shortenFio(row.fio)} ${row.weldingMethod}(${row.qualificationDigit})`);
}

// Имя архива = первое число в имени входного xlsx-файла,
// например из "65. 5ЭЦ-Группа № 321 (ВИК).xlsx" получаем "65".
function extractArchiveNumber(inputFileName) {
  const match = inputFileName.match(/\d+/);
  return match ? match[0] : 'archive';
}

module.exports = {
  CONTROL_METHODS,
  buildTemplatePath,
  listControlMethods,
  buildOutputFileName,
  buildPersonFolderName,
  shortenFio,
  sanitizeFileName,
  extractArchiveNumber,
};
