import { getVenueWeather } from '../services/weather-service.js';
import { handleControllerError } from '../utils/controller.js';

export async function getWeather(req, res) {
  try {
    res.json(await getVenueWeather(req.query.venue));
  } catch (error) {
    handleControllerError(res, error);
  }
}
