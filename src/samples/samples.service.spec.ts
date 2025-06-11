import { Test, TestingModule } from '@nestjs/testing';
import { SamplesService } from './samples.service';

describe('SamplesService', () => {
  let service: SamplesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SamplesService],
    }).compile();

    service = module.get<SamplesService>(SamplesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processSampleRequest', () => {
    it('should process sample request successfully', () => {
      const mockData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '0412345678',
        address: '123 Test Street',
        postcode: '2000',
        productTypes: ['Roller Blinds', 'Roman Blinds'],
        message: 'Please send samples for my new home',
      };

      const result = service.processSampleRequest(mockData);

      expect(result).toEqual({
        success: true,
        message: 'Sample request submitted successfully',
      });
    });

    it('should handle minimal required data', () => {
      const mockData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '0412345678',
        address: '456 Another St',
        postcode: '2001',
        productTypes: ['Venetian Blinds'],
      };

      const result = service.processSampleRequest(mockData);

      expect(result).toEqual({
        success: true,
        message: 'Sample request submitted successfully',
      });
    });

    it('should handle multiple product types', () => {
      const mockData = {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '0412345678',
        address: '789 Sample Ave',
        postcode: '2002',
        productTypes: [
          'Roller Blinds - Blockout',
          'Roman Blinds',
          'Shutters - ABS',
          'Curtains - Sheer',
        ],
        message: 'I would like to see samples of these products',
      };

      const result = service.processSampleRequest(mockData);

      expect(result).toEqual({
        success: true,
        message: 'Sample request submitted successfully',
      });
    });

    it('should handle request with chat summary', () => {
      const mockData = {
        name: 'Bob Wilson',
        email: 'bob@example.com',
        phone: '0412345678',
        address: '321 Chat St',
        postcode: '2003',
        productTypes: ['Shutters'],
        message: 'Based on our chat, I need samples',
        chatSummary:
          'Customer discussed premium shutters for bathroom renovation project',
      };

      const result = service.processSampleRequest(mockData);

      expect(result).toEqual({
        success: true,
        message: 'Sample request submitted successfully',
      });
    });

    it('should log sample request details', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '0412345678',
        address: '123 Test St',
        postcode: '2000',
        productTypes: ['Roller Blinds'],
        message: 'Test message',
      };

      service.processSampleRequest(mockData);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Samples request received:',
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
          phone: '0412345678',
          address: '123 Test St',
          postcode: '2000',
          productTypes: ['Roller Blinds'],
          message: 'Test message',
          chatSummary: undefined,
        }),
      );

      consoleSpy.mockRestore();
    });

    it('should generate email content correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockData = {
        name: 'Email Test User',
        email: 'emailtest@example.com',
        phone: '0412345678',
        address: '123 Email St',
        postcode: '2004',
        productTypes: ['Roman Blinds', 'Curtains'],
        message: 'Please send samples',
        chatSummary: 'Customer wants elegant window treatments',
      };

      service.processSampleRequest(mockData);

      expect(consoleSpy).toHaveBeenLastCalledWith(
        'Sample request email content:',
        expect.stringContaining('New Sample Request from Email Test User'),
      );

      expect(consoleSpy).toHaveBeenLastCalledWith(
        'Sample request email content:',
        expect.stringContaining('emailtest@example.com'),
      );

      expect(consoleSpy).toHaveBeenLastCalledWith(
        'Sample request email content:',
        expect.stringContaining('Roman Blinds'),
      );

      expect(consoleSpy).toHaveBeenLastCalledWith(
        'Sample request email content:',
        expect.stringContaining('Customer wants elegant window treatments'),
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty product types array', () => {
      const mockData = {
        name: 'Empty Array User',
        email: 'empty@example.com',
        phone: '0412345678',
        address: '123 Empty St',
        postcode: '2005',
        productTypes: [],
      };

      const result = service.processSampleRequest(mockData);

      expect(result).toEqual({
        success: true,
        message: 'Sample request submitted successfully',
      });
    });

    it('should handle undefined optional fields', () => {
      const mockData = {
        name: 'Minimal User',
        email: 'minimal@example.com',
        phone: '0412345678',
        address: '123 Minimal St',
        postcode: '2006',
        productTypes: ['Blinds'],
        message: undefined,
        chatSummary: undefined,
      };

      const result = service.processSampleRequest(mockData);

      expect(result).toEqual({
        success: true,
        message: 'Sample request submitted successfully',
      });
    });
  });
});
