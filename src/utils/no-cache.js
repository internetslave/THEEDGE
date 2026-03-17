export function noCache(res) {
  res.setHeader('Cache-Control', 'no-store,no-cache,must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}
