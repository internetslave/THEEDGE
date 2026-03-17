import { getProfile, resetPin, signInUser, signOutUser, signUpUser } from '../services/auth-service.js';
import { handleControllerError } from '../utils/controller.js';

export async function signUp(req, res) {
  try {
    const payload = await signUpUser(req.body || {});
    res.json(payload);
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function signIn(req, res) {
  try {
    const payload = await signInUser({ ...(req.body || {}), clientIp: req.clientIp || req.ip });
    res.json(payload);
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function resetUserPin(req, res) {
  try {
    const payload = await resetPin(req.body || {});
    res.json(payload);
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function me(req, res) {
  try {
    const payload = await getProfile(req.username);
    res.json(payload);
  } catch (error) {
    handleControllerError(res, error);
  }
}

export async function signOut(req, res) {
  try {
    res.json(await signOutUser(req.username));
  } catch (error) {
    handleControllerError(res, error);
  }
}
