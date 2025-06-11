import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENAI_API_KEY') {
                return 'test-api-key';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chat', () => {
    it('should throw error when OpenAI is not configured', async () => {
      const serviceWithoutKey = new ChatService({
        get: () => null,
      } as any);

      await expect(serviceWithoutKey.chat('Hello')).rejects.toThrow(
        'OpenAI API key not configured',
      );
    });

    it('should handle OpenAI API errors gracefully', async () => {
      // Mock OpenAI to throw an error
      jest.spyOn(service as any, 'openai', 'get').mockReturnValue({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error')),
          },
        },
      });

      await expect(service.chat('Hello')).rejects.toThrow(
        'Chat service temporarily unavailable',
      );
    });

    it('should return default message when OpenAI returns no content', async () => {
      // Mock OpenAI to return empty content
      jest.spyOn(service as any, 'openai', 'get').mockReturnValue({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: null } }],
            }),
          },
        },
      });

      const result = await service.chat('Hello');
      expect(result).toBe('Lo siento, no pude procesar tu consulta.');
    });

    it('should process conversation with context', async () => {
      const mockResponse = 'Hello! How can I help you today?';

      jest.spyOn(service as any, 'openai', 'get').mockReturnValue({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: mockResponse } }],
            }),
          },
        },
      });

      const conversation = [
        { role: 'system' as const, content: 'You are a helpful assistant' },
        { role: 'user' as const, content: 'Hello' },
      ];

      const result = await service.chat('Hello', conversation);
      expect(result).toBe(mockResponse);
    });
  });

  describe('summarizeChat', () => {
    it('should throw error when OpenAI is not configured', async () => {
      const serviceWithoutKey = new ChatService({
        get: () => null,
      } as any);

      await expect(serviceWithoutKey.summarizeChat([])).rejects.toThrow(
        'OpenAI API key not configured',
      );
    });

    it('should generate conversation summary', async () => {
      const mockSummary =
        '**CONVERSATION SUMMARY**\nCustomer interested in roller blinds.';

      jest.spyOn(service as any, 'openai', 'get').mockReturnValue({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: mockSummary } }],
            }),
          },
        },
      });

      const messages = [
        {
          type: 'user' as const,
          content: 'I need roller blinds',
          timestamp: new Date(),
        },
        {
          type: 'bot' as const,
          content: 'Great choice!',
          timestamp: new Date(),
        },
      ];

      const result = await service.summarizeChat(messages);
      expect(result).toBe(mockSummary);
    });

    it('should handle OpenAI error in summary generation', async () => {
      jest.spyOn(service as any, 'openai', 'get').mockReturnValue({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error')),
          },
        },
      });

      const messages = [
        { type: 'user' as const, content: 'Hello', timestamp: new Date() },
      ];

      const result = await service.summarizeChat(messages);
      expect(result).toBe(
        'Unable to generate automatic summary. Please review conversation manually.',
      );
    });

    it('should format conversation correctly for OpenAI', async () => {
      const createSpy = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Summary' } }],
      });

      jest.spyOn(service as any, 'openai', 'get').mockReturnValue({
        chat: {
          completions: {
            create: createSpy,
          },
        },
      });

      const messages = [
        {
          type: 'user' as const,
          content: 'I need help',
          timestamp: new Date(),
        },
        {
          type: 'bot' as const,
          content: 'How can I help?',
          timestamp: new Date(),
        },
      ];

      await service.summarizeChat(messages);

      expect(createSpy).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('conversation summarizer'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('CLIENTE: I need help'),
          }),
        ]),
        temperature: 0.2,
        max_tokens: 400,
      });
    });
  });
});
