import { ExcelDatasetLoader } from './tmp_ExcelDatasetLoader.mjs';

const loader = new ExcelDatasetLoader();
console.log('ExcelDatasetLoader instantiated:', typeof loader.load === 'function');
