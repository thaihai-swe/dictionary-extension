import type { AppSettings } from '../../types';
import {
  loadFullSettings,
  loadPublicSettings,
  saveSettingsPartial,
} from '../../shared/settings';

export interface SettingsRepository {
  load(options?: { includeSecrets?: boolean }): Promise<AppSettings>;
  save(partial: Partial<AppSettings>): Promise<void>;
}

/** Browser storage adapter for settings; UI and runtime code depend on this port. */
export const settingsRepository: SettingsRepository = {
  load: ({ includeSecrets = false } = {}) => includeSecrets ? loadFullSettings() : loadPublicSettings(),
  save: saveSettingsPartial,
};
