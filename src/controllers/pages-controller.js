import path from 'path';
import { publicDir } from '../config/paths.js';
import { noCache } from '../utils/no-cache.js';

export function fantasyPage(req, res) {
  noCache(res);
  res.sendFile(path.join(publicDir, 'fantasy.html'));
}

export function tippingPage(req, res) {
  noCache(res);
  res.sendFile(path.join(publicDir, 'tipping.html'));
}

export function dashboardPage(req, res) {
  noCache(res);
  res.sendFile(path.join(publicDir, 'index.html'));
}
