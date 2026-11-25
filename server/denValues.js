// Значения для плейсхолдера {{den}} в шаблоне РК.
// Нужны случайные числа в диапазоне 1,90–2,05, причём все значения
// в одном документе отличаются друг от друга не больше чем на 0,05.
//
// Чтобы не мучиться с дробными числами, считаем в сотых (190 = 1,90).
const MIN = 190;
const MAX = 205;
const MAX_SPREAD = 5; // 0,05

function randomInt(from, to) {
  return from + Math.floor(Math.random() * (to - from + 1));
}

// Возвращает функцию, которая при каждом вызове выдаёт следующее значение
// для одного документа. Сначала выбираем "нижнюю границу" base так, чтобы
// base + 0,05 не вылезло за 2,05, а потом каждое значение берём из
// отрезка [base, base + 0,05] — так разброс никогда не превысит 0,05.
function createDenGenerator() {
  const base = randomInt(MIN, MAX - MAX_SPREAD);
  return () => formatDen(randomInt(base, base + MAX_SPREAD));
}

// 195 -> "1,95" (в документах дробная часть через запятую)
function formatDen(hundredths) {
  return (hundredths / 100).toFixed(2).replace('.', ',');
}

module.exports = { createDenGenerator };
