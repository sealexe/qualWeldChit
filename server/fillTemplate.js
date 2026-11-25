const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { createDenGenerator } = require('./denValues');

// Берёт путь к docx-шаблону и объект с данными строки,
// возвращает готовый docx в виде буфера.
function fillTemplate(templatePath, data) {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  // {{den}} встречается в шаблоне несколько раз, и в каждом месте должно
  // стоять своё случайное значение. Обычная подстановка ставит везде одно
  // и то же, поэтому используем свой parser: он вызывается для каждого
  // плейсхолдера отдельно, и для "den" каждый раз берём новое число.
  const nextDen = createDenGenerator();
  const parser = (tag) => ({
    get: (scope) => (tag.trim() === 'den' ? nextDen() : scope[tag.trim()]),
  });

  // Плейсхолдеры в шаблонах записаны как {{number}} — двойные фигурные скобки,
  // а не одинарные (дефолт docxtemplater), поэтому разделители задаём явно.
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    parser,
  });

  doc.render(data);

  return doc.getZip().generate({ type: 'nodebuffer' });
}

module.exports = { fillTemplate };
