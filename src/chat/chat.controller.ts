import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  conversation?: ChatMessage[];
}

interface ChatSummaryMessage {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface ChatSummaryRequest {
  messages: ChatSummaryMessage[];
}

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() body: ChatRequest) {
    try {
      const { message, conversation } = body;

      if (!message) {
        return {
          error: 'Message is required',
        };
      }

      const reply = await this.chatService.generateChatResponse(
        message,
        conversation || [],
      );

      return {
        reply,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        error:
          errorMessage ||
          "Sorry, I'm having trouble right now. Please call (02) 9340 5050 for immediate assistance.",
      };
    }
  }

  @Post('summary')
  async chatSummary(@Body() body: ChatSummaryRequest) {
    try {
      const { messages } = body;

      if (!messages || !Array.isArray(messages)) {
        return {
          error: 'Messages array is required',
        };
      }

      const summary =
        await this.chatService.generateConversationSummary(messages);

      return {
        summary,
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      return {
        error: 'Error generating conversation summary',
        summary:
          'Unable to generate automatic summary. Please review conversation manually.',
      };
    }
  }
}
