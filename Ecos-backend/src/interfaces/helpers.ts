export interface SaintSection {
  title: string;
  content: string;
}

export interface SaintData {
  id?: string;
  name: string;
  icon?: string;
  imageUrl?: string;
  festivity?: string;
  secularName?: string;
  birthPlaceDate?: string;
  deathPlaceDate?: string;
  patronages?: string[] | string;
  sections?: SaintSection[];
  biography?: string;
  sources?: Array<{
    name: string;
    url?: string;
  }>;
}

export interface ChatRequest {
  saintData: SaintData;
  userMessage: string;
}
export interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  code?: string;
  timestamp?: string;
}

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}