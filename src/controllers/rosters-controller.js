import { ROSTERS } from '../config/constants.js';

export function getRosters(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({ success: true, rosters: ROSTERS });
}
