// Match build.py when a visual test loads source modules without the HTML bundle.
const fs = require('node:fs');
const path = require('node:path');
module.exports = function embedMedicalArt(source) {
  return source.replace(/__MEDICAL_ART_([A-Z0-9_]+)__/g, (_, token) => {
    const name = token.toLowerCase().replaceAll('_', '-');
    const file = path.resolve(__dirname, '../assets/medical-art', name + '.png');
    return 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
  });
};
