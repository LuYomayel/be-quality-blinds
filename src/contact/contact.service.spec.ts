import { Test, TestingModule } from '@nestjs/testing';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  let service: ContactService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactService],
    }).compile();

    service = module.get<ContactService>(ContactService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processContactForm', () => {
    it('should process contact form successfully', async () => {
      const mockData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '0412345678',
        message: 'I need a quote for blinds',
        service: 'measure-quote',
        product: 'roller-blinds',
        address: '123 Test St',
        postcode: '2000',
      };

      const result = await service.processContactForm(mockData);

      expect(result).toEqual({
        success: true,
        message: 'Contact form submitted successfully',
      });
    });

    it('should handle form with images', async () => {
      const mockFile = {
        fieldname: 'images',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const mockData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '0412345678',
        message: 'Please see attached images',
        service: 'consultation',
        product: 'curtains',
        images: [mockFile],
      };

      const result = await service.processContactForm(mockData);

      expect(result).toEqual({
        success: true,
        message: 'Contact form submitted successfully',
      });
    });

    it('should handle form with chat summary', async () => {
      const mockData = {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '0412345678',
        message: 'Based on our chat discussion',
        service: 'measure-quote',
        product: 'shutters',
        chatSummary: 'Customer interested in premium shutters for bathroom',
      };

      const result = await service.processContactForm(mockData);

      expect(result).toEqual({
        success: true,
        message: 'Contact form submitted successfully',
      });
    });

    it('should handle optional fields as undefined', async () => {
      const mockData = {
        name: 'Bob Wilson',
        email: 'bob@example.com',
        phone: '0412345678',
        message: 'Minimal form submission',
        service: 'repair',
        product: 'venetian-blinds',
        address: undefined,
        postcode: undefined,
        chatSummary: undefined,
        images: undefined,
      };

      const result = await service.processContactForm(mockData);

      expect(result).toEqual({
        success: true,
        message: 'Contact form submitted successfully',
      });
    });

    it('should log form submission details', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '0412345678',
        message: 'Test message',
        service: 'measure-quote',
        product: 'roller-blinds',
      };

      await service.processContactForm(mockData);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Contact form submission received:',
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
          phone: '0412345678',
          message: 'Test message',
          service: 'measure-quote',
          product: 'roller-blinds',
          imageCount: 0,
        }),
      );

      consoleSpy.mockRestore();
    });
  });
});
