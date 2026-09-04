const path = require('path');
const fs = require('fs');
const { parseInputFile } = require('../parseInput');

const inputDir = path.join(__dirname, '..', '..', 'input_example');
const fileName = fs.readdirSync(inputDir).find((name) => name.endsWith('.xlsx'));
const filePath = path.join(inputDir, fileName);
const buffer = fs.readFileSync(filePath);

parseInputFile(buffer).then((rows) => {
  console.log(rows);
});
