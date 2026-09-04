const ExcelJS = require('exceljs');

// Excel хранит даты как порядковый номер дня от 1899-12-30.
// Переводим такое число в строку вида "ДД.ММ.ГГГГ".
function excelDateToString(value) {
  if (value instanceof Date) {
    return formatDate(value);
  }
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return formatDate(date);
  }
  return String(value ?? '');
}

function formatDate(date) {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

// Из текста ячейки "Квалификация" вытаскиваем первую цифру,
// например из "...( 2 уровень квалификации)" получаем "2".
function extractQualificationDigit(cellText) {
  const match = String(cellText ?? '').match(/\d/);
  return match ? match[0] : null;
}

// Из текста ячейки "Способ сварки" вытаскиваем буквы способа,
// например из "РД" или "Ручная дуговая (РД)" получаем "РД".
function extractWeldingMethodLetters(cellText) {
  const match = String(cellText ?? '').match(/[А-ЯЁ]+/);
  return match ? match[0] : null;
}

// Читает xlsx из буфера и возвращает массив объектов с данными по каждой строке.
async function parseInputFile(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];

  const columnByHeader = {};
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    columnByHeader[String(cell.value).trim()] = colNumber;
  });

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // пропускаем заголовок

    const getValue = (header) => {
      const colNumber = columnByHeader[header];
      return colNumber ? row.getCell(colNumber).value : undefined;
    };

    const fio = getValue('ФИО');
    if (!fio) return; // пустая строка — пропускаем

    rows.push({
      fio: String(fio),
      lable: String(getValue('Клеймо') ?? ''),
      company: String(getValue('Организация') ?? ''),
      qualificationDigit: extractQualificationDigit(getValue('Квалификация')),
      weldingMethod: extractWeldingMethodLetters(getValue('Способ сварки')),
      w_day: excelDateToString(getValue('Дата сварки')),
      i_day: excelDateToString(getValue('Дата контроля')),
      number: String(getValue('Номер') ?? ''),
    });
  });

  return rows;
}

module.exports = {
  parseInputFile,
  extractQualificationDigit,
  extractWeldingMethodLetters,
  excelDateToString,
};
