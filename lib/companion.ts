import { apiClient } from './api'
import { config } from './config'

export interface Game {
  id: string; name: string; categories: string[];
  size: string; version: string; updated: string; description: string;
  requirements: string; online: boolean; dlc: boolean;
}
export interface Catalog {
  games: Game[]; total: number; indexTotal: number; page: number; pageSize: number;
  categories: string[]; fetchedAt: string; stale: boolean;
}
export interface LibraryGame {
  name: string; gameID?: string; playTime?: number; launchCount?: number;
  lastPlayed?: string; favorite?: boolean; completed?: boolean; version?: string;
  achievementStats?: { total: number; unlocked: number };
}
export interface Account {
  profile: { displayName?: string; photoURL?: string; bio?: string; country?: string; private?: boolean;
    profileStats?: { level?: number; xp?: number; totalPlaytime?: number; gamesPlayed?: number } };
  library: { games?: LibraryGame[]; totalPlaytime?: number; unlockedAchievements?: number; totalAchievements?: number; lastSynced?: string };
}
export class CompanionError extends Error {
  constructor(message: string, public status: number) { super(message) }
}
export async function companionFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const session = apiClient.getSessionId()
  if (!session) throw new CompanionError('Connect your desktop to explore your Ascendara account.', 401)
  const response = await fetch(`${config.apiBaseUrl}/companion/${path}`, {
    headers: { 'X-Session-ID': session }, signal,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new CompanionError(data?.error || 'Unable to load this page. Please try again.', response.status)
  return data as T
}
export function playtime(seconds = 0) {
  return seconds < 3600 ? `${Math.floor(seconds / 60)}m` : `${(seconds / 3600).toLocaleString(undefined, { maximumFractionDigits: 1 })}h`
}
