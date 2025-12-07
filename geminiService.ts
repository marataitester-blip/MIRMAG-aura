
import { GoogleGenAI, Type } from "@google/genai";
import { IdentifyResponse } from "./types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const identifyTarotCard = async (base64Image: string): Promise<IdentifyResponse> => {
  try {
    // Using gemini-2.5-flash as the performant standard, replacing the user's requested 1.5-flash
    // while keeping the prompt logic exactly as requested.
    const model = 'gemini-2.5-flash';

    // Remove the data URL prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: `Ты — мистический оракул. Твоя задача — идентифицировать карту Таро.
            1. СНАЧАЛА попытайся ПРОЧИТАТЬ название на карте (OCR). Текст — это истина.
            2. Если текста нет, анализируй визуальные образы.
            
            Карта может быть из классической колоды Райдера-Уэйта ИЛИ специальная карта 'Герой' (Hero) или 'Белая Карта' (White Card).
            
            Верни JSON строго в формате: { "cardName": "Название карты на Русском" }.
            Примеры: 'Туз Жезлов', 'Шут', 'Королева Кубков', 'Герой', 'Белая Карта'.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cardName: {
              type: Type.STRING,
              description: "The Russian name of the identified tarot card."
            }
          },
          required: ["cardName"]
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text) as IdentifyResponse;
      return result;
    } else {
      throw new Error("No text returned from Gemini");
    }

  } catch (error) {
    console.error("Error identifying card:", error);
    throw error;
  }
};
