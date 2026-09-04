const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// Берёт путь к docx-шаблону и объект с данными строки,
// возвращает готовый docx в виде буфера.
function fillTemplate(templatePath, data) {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  // Плейсхолдеры в шаблонах записаны как {{number}} — двойные фигурные скобки,
  // а не одинарные (дефолт docxtemplater), поэтому разделители задаём явно.
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  });

  doc.render(data);

  return doc.getZip().generate({ type: 'nodebuffer' });
}

module.exports = { fillTemplate };
