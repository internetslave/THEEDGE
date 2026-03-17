import { WEATHER_PROXY_TTL } from '../config/constants.js';
import { logger } from '../lib/logger.js';
import { ServiceError } from '../utils/service-error.js';
import { sanitizeText } from '../utils/validation.js';

const WEATHER_COORDS = {
  Flemington: [-37.8006, 144.9093], Caulfield: [-37.8767, 145.0432],
  Rosehill: [-33.8361, 150.9916], Randwick: [-33.8963, 151.2096],
  'Royal Randwick': [-33.8963, 151.2096], 'Eagle Farm': [-27.4291, 153.0697],
  Doomben: [-27.4300, 153.0685], 'Moonee Valley': [-37.7587, 144.9226],
  'The Valley': [-37.7587, 144.9226], Sandown: [-38.0378, 145.1668],
  Ascot: [-31.9455, 115.9440], Morphettville: [-34.9717, 138.5627],
  Ballarat: [-37.5580, 143.7985], Bendigo: [-36.7571, 144.2796],
  Geelong: [-38.1502, 144.3548], Hawkesbury: [-33.6220, 150.8480],
  'Warwick Farm': [-33.9100, 150.9330], Wyong: [-33.2828, 151.4333],
  'Kembla Grange': [-34.4722, 150.8628], Newcastle: [-32.9100, 151.7650],
  'The Meadows': [-37.7840, 144.9030], 'Wentworth Park': [-33.8754, 151.1963],
  Dapto: [-34.5100, 150.8028], Ipswich: [-27.6200, 152.7800],
  'Albion Park': [-27.5800, 153.0270], 'Gold Coast': [-28.0167, 153.4000],
  'Sunshine Coast': [-26.6500, 153.0667], Townsville: [-19.2589, 146.8169],
  Darwin: [-12.4634, 130.8456], Launceston: [-41.4332, 147.1441],
  Hobart: [-42.8821, 147.3272], Pakenham: [-38.0711, 145.4858],
  Moe: [-38.1738, 146.2634], Echuca: [-36.1428, 144.7583],
  Seymour: [-37.0212, 145.1433], Balaklava: [-34.1485, 138.4203],
  Gawler: [-34.5986, 138.7437], 'Murray Bridge': [-35.1200, 139.2667],
  Bulli: [-34.3333, 150.9000], Canterbury: [-33.9167, 151.1167],
  Gosford: [-33.4278, 151.3411], Goulburn: [-34.7548, 149.7186],
  Tamworth: [-31.0927, 150.9320], Grafton: [-29.6931, 152.9341],
  'Mount Gambier': [-37.8284, 140.7828], Hamilton: [-37.7385, 142.0222],
  Stawell: [-37.0572, 142.7766], Mildura: [-34.1842, 142.1600],
  'Swan Hill': [-35.3384, 143.5553],
};

const weatherProxyCache = {};
const weatherLogger = logger.child({ component: 'weather-service', provider: 'Open-Meteo' });

export async function getVenueWeather(venue) {
  const cleanVenue = sanitizeText(venue, { maxLength: 80 });
  if (!cleanVenue) throw new ServiceError(400, 'venue required');

  if (weatherProxyCache[cleanVenue] && Date.now() - weatherProxyCache[cleanVenue].ts < WEATHER_PROXY_TTL) {
    weatherLogger.debug('weather.cache.hit', {
      venue: cleanVenue,
      cacheAgeSec: Math.round((Date.now() - weatherProxyCache[cleanVenue].ts) / 1000),
    });
    return weatherProxyCache[cleanVenue].data;
  }

  let coords = WEATHER_COORDS[cleanVenue];
  if (!coords) {
    const key = Object.keys(WEATHER_COORDS).find((candidate) =>
      cleanVenue.toLowerCase().includes(candidate.toLowerCase()) || candidate.toLowerCase().includes(cleanVenue.toLowerCase())
    );
    coords = key ? WEATHER_COORDS[key] : null;
  }

  if (!coords) {
    weatherLogger.debug('weather.lookup.miss', { venue: cleanVenue });
    return { found: false };
  }

  try {
    const [lat, lng] = coords;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);

    const data = await response.json();
    const payload = {
      found: true,
      temp: Math.round(data.current.temperature_2m),
      code: data.current.weather_code,
    };

    weatherProxyCache[cleanVenue] = { data: payload, ts: Date.now() };
    weatherLogger.debug('weather.fetch.success', { venue: cleanVenue });
    return payload;
  } catch (error) {
    weatherLogger.warn('weather.fetch.failed', {
      venue: cleanVenue,
      error: { name: error.name, message: error.message },
    });
    return { found: false };
  }
}
