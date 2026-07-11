export interface UserSessionContext {
  userId: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface SystemVersionInfo {
  version: string;
  environment: string;
  releaseDate: string;
}
