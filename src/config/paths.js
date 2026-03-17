import path from 'path';
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(configDir, '..', '..');
export const publicDir = path.join(projectRoot, 'public');
export const docsDir = path.join(projectRoot, 'docs');
