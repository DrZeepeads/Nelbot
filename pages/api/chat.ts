import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';
import { OpenAIModelID, OpenAITokenizers } from '@/types/openai';

import { getDatabase } from '@/src/database';
import { similaritySearch } from '@/src/search';


export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { url, model, messages, key, prompt, temperature, searchResults } =
      (await req.json()) as ChatBody & { searchResults: any[] };

    let promptToSend = "You are a helpful assistant. You work for Nosana, a decentralized computing network, and your job is to informatively answer questions about Nosana. You will get questions accompanied with pages of context. Only use the context you are given when it is informative to answer the question. If you don't know the answer, be honest about it.";
    let temperatureToUse = temperature ?? DEFAULT_TEMPERATURE;

    let messagesToSend: Message[] = [...messages];
    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage.content;

    // Check for Nosana price request
    if (userMessage.toLowerCase().includes('nosana price') || userMessage.toLowerCase().includes('price of nosana')) {
      const price = await getNosanaPrice();
      if (price) {
        const priceContext = `The current price of Nosana is $${price.toFixed(4)}. Respond with just the price, prefaced by "The price of Nosana is: X$".`;
        messagesToSend[messagesToSend.length - 1].content = `${lastMessage.content}\n\nContext: ${priceContext}`;
      }
    } else {
      // Use the search results provided by the client
      messagesToSend[messagesToSend.length - 1].content = `${userMessage}\n\nContext:\n${searchResults}`;
    }

    // Token counting logic (unchanged)
    const tokenizer = OpenAITokenizers[model.id as OpenAIModelID];
    const prompt_tokens = tokenizer.encode(promptToSend);
    let tokenCount = prompt_tokens.length;
    let filteredMessages: Message[] = [];

    for (let i = messagesToSend.length - 1; i >= 0; i--) {
      const message = messagesToSend[i];
      const tokens = tokenizer.encode(message.content);

      if (tokenCount + tokens.length + 768 > model.tokenLimit) {
        break;
      }
      tokenCount += tokens.length;
      filteredMessages = [message, ...filteredMessages];
    }

    const stream = await OpenAIStream(
      url,
      model,
      promptToSend,
      temperatureToUse,
      key,
      filteredMessages,
    );

    return new Response(stream);
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

export default handler;

async function getNosanaPrice() {
  try {
    const options = {
      method: 'GET',
      headers: {
        'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
      },
    };
    const response = await fetch('https://public-api.birdeye.so/defi/price?address=nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7', options);
    const data = await response.json();
    return data.data.value;
  } catch (error) {
    console.error('Error fetching Nosana price:', error);
    return null;
  }
}
