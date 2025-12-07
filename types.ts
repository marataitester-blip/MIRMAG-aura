
export interface TarotCard {
  name: string;
  keyword: string;
  imageUrl: string;
  isVideo: boolean;
  desc_general: string;
  desc_love: string;
  desc_work: string;
  desc_health: string;
  desc_path: string;
}

export interface IdentifyResponse {
  cardName: string;
}
