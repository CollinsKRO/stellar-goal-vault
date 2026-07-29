import fs from 'fs';
import path from 'path';
import { generateOpenApiDocument } from '../openapi';
import { logger } from '../logger';

const outputDir = path.resolve(__dirname, '..', '..', 'dist');
const outputPath = path.join(outputDir, 'openapi.json');

const document = generateOpenApiDocument();

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

logger.info(`OpenAPI spec written to ${outputPath} (${document.paths ? Object.keys(document.paths).length : 0} paths)`);
