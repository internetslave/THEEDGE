import { env } from '../../config/env.js';
import { MemoryRepository } from './memory-repository.js';
import { PostgresRepository } from './postgres-repository.js';

let repository = null;

export async function initializeRepository() {
  if (repository) return repository;

  repository = env.EDGEIQ_STORAGE_MODE === 'postgres'
    ? new PostgresRepository(env)
    : new MemoryRepository();

  await repository.init();
  return repository;
}

export function getRepository() {
  if (!repository) {
    throw new Error('Repository not initialized');
  }
  return repository;
}

export async function closeRepository() {
  if (!repository) return;
  await repository.close?.();
  repository = null;
}

export async function getRepositoryStats() {
  return getRepository().getStats();
}
