import {
  buildTippingLeaderboard,
  createComp,
  createRound,
  getFixtures,
  getMyComps,
  getMyTips,
  getRoundResults,
  joinComp,
  recordRoundResult,
  setUserRole,
  submitTips,
} from '../services/tipping-service.js';
import { handleControllerError } from '../utils/controller.js';

export async function tippingFixtures(req, res) {
  try {
    res.json(await getFixtures());
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function tippingMyTips(req, res) {
  try {
    res.json(await getMyTips(req.username));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function tippingSubmit(req, res) {
  try {
    res.json(await submitTips(req.username, req.body?.tips));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function tippingLeaderboard(req, res) {
  try {
    res.json(await buildTippingLeaderboard());
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function tippingRoundResults(req, res) {
  try {
    res.json(await getRoundResults(req.query.round));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function tippingCreateComp(req, res) {
  try {
    res.json(await createComp(req.username, req.body || {}));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function tippingJoinComp(req, res) {
  try {
    res.json(await joinComp(req.username, req.body?.code));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function tippingMyComps(req, res) {
  try {
    res.json(await getMyComps(req.username));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function tippingAdminRound(req, res) {
  try {
    res.json(await createRound(req.username, req.body || {}));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function tippingAdminResult(req, res) {
  try {
    res.json(await recordRoundResult(req.username, req.body || {}));
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function tippingAdminSetRole(req, res) {
  try {
    res.json(await setUserRole({ actorUsername: req.username, ...(req.body || {}) }));
  } catch (error) {
    handleControllerError(res, error);
  }
}
