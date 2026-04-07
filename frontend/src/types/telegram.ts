export interface TelegramChannel {
  id: number;
  username: string;
  title: string | null;
  description: string | null;
  logo_url: string | null;
  language: string;
  categories: string[];
  subscriber_count: number | null;
  last_synced_at: string | null;
  is_subscribed: boolean;
}

export interface TelegramFeedItem {
  id: number;
  text: string | null;
  media_url: string | null;
  posted_at: string;
  channel: { 
    id: number; 
    username: string; 
    title: string | null; 
    logo_url: string | null; 
    categories: string[]; 
  };
}

export interface TelegramFeedResponse {
  items: TelegramFeedItem[];
  total: number;
  page: number;
  page_size: number;
}
