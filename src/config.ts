import { PlatformConfig } from 'homebridge';

// Mirrors config.schema.json: top-level fields (not nested under "options" like
// upstream homebridge-tuya-platform) since that's the form shape already published
// for this plugin. "Custom Development" project type (1) only actually uses
// endpoint/accessId/accessSecret; countryCode/username/password/appSchema are
// Smart Home project type (2) fields, ignored by the Custom login flow.
export interface TuyaUnifiedPlatformOptions {
  projectType?: 1 | 2;
  enableLocal?: boolean;
}

export interface TuyaUnifiedPlatformConfig extends PlatformConfig {
  endpoint: string;
  accessId: string;
  accessSecret: string;
  appSchema: string;
  countryCode: number;
  username: string;
  password: string;
  options?: TuyaUnifiedPlatformOptions;
}

export const ProjectType = {
  CUSTOM: 1,
  HOME: 2,
} as const;
