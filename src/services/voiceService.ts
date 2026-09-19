import { mockProducts } from '@/data/mockData';
import type { Product } from '@/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Simulated intent detection for voice commands — no real backend yet
const intentPatterns: { keywords: string[]; intent: string }[] = [
  { keywords: ['add', 'add cheyyi', 'daalo', 'daal'], intent: 'add_stock' },
  { keywords: ['remove', 'nikaal', 'remove cheyyi', 'teyyi'], intent: 'remove_stock' },
  { keywords: ['how much', 'kitna', 'kya hai', 'entha'], intent: 'query_stock' },
  { keywords: ['no', 'make it', 'correct', 'change'], intent: 'correct_entry' },
];

function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  for (const p of intentPatterns) {
    if (p.keywords.some((k) => lower.includes(k))) return p.intent;
  }
  return 'unknown';
}

function detectLanguage(text: string): 'en' | 'hi' | 'te' {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  const lower = text.toLowerCase();
  if (lower.includes('biyyam') || lower.includes('cheyyi') || lower.includes('entha')) return 'te';
  if (lower.includes('kilo') || lower.includes('nikaal') || lower.includes('kitna') || lower.includes('daalo')) return 'hi';
  return 'en';
}

function findProduct(text: string): Product | undefined {
  const lower = text.toLowerCase();
  return mockProducts.find(
    (p) =>
      lower.includes(p.name.toLowerCase()) ||
      (p.nameLocal && lower.includes(p.nameLocal.toLowerCase())) ||
      lower.includes(p.name.toLowerCase().split(' ')[0]),
  );
}

function extractQuantity(text: string): number {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

export interface VoiceParseResult {
  intent: string;
  language: 'en' | 'hi' | 'te';
  product?: Product;
  quantity: number;
  confidence: number;
  response: string;
  action: string;
}

export const voiceService = {
  async parseCommand(transcript: string): Promise<VoiceParseResult> {
    await delay(800); // simulate AI processing
    const intent = detectIntent(transcript);
    const language = detectLanguage(transcript);
    const product = findProduct(transcript);
    const quantity = extractQuantity(transcript);

    if (intent === 'query_stock') {
      if (product) {
        return {
          intent,
          language,
          product,
          quantity: 0,
          confidence: 0.94,
          response: `You have ${product.stock} ${product.unit} of ${product.name} in stock.`,
          action: `Queried ${product.name} stock`,
        };
      }
      return {
        intent,
        language,
        quantity: 0,
        confidence: 0.6,
        response: 'Which product would you like to check?',
        action: 'Stock query — product not found',
      };
    }

    if (intent === 'add_stock' || intent === 'remove_stock') {
      if (product) {
        const verb = intent === 'add_stock' ? 'Added' : 'Removed';
        const newStock = intent === 'add_stock' ? product.stock + quantity : product.stock - quantity;
        return {
          intent,
          language,
          product,
          quantity,
          confidence: 0.92,
          response: `${verb} ${quantity} ${product.unit} ${intent === 'add_stock' ? 'to' : 'from'} ${product.name}. New stock: ${newStock} ${product.unit}.`,
          action: `${verb} ${quantity} ${product.unit} ${intent === 'add_stock' ? 'to' : 'from'} ${product.name}`,
        };
      }
      return {
        intent,
        language,
        quantity,
        confidence: 0.5,
        response: 'I could not identify the product. Could you repeat?',
        action: 'Product not recognized',
      };
    }

    if (intent === 'correct_entry') {
      return {
        intent,
        language,
        product,
        quantity,
        confidence: 0.87,
        response: `Got it! Updated the quantity to ${quantity}.`,
        action: `Corrected last entry to ${quantity}`,
      };
    }

    return {
      intent,
      language,
      quantity,
      confidence: 0.3,
      response: 'I did not understand that. Could you rephrase?',
      action: 'Unrecognized command',
    };
  },
};
