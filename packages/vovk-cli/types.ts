export type VovkEnv = Partial<{
  PORT: string;
  VOVK_ROUTE: string;
  VOVK_FETCHER: string;
  VOVK_PREFIX: string;
  VOVK_VALIDATE_ON_CLIENT: string;
  VOVK_PORT: string;
  VOVK_CLIENT_OUT: string;
  VOVK_MODULES_DIR: string;
  __VOVK_START_SERVER__: string;
}>;