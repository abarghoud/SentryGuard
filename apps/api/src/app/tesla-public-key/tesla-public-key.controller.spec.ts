import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { TeslaPublicKeyController } from './tesla-public-key.controller';
import { mock, MockProxy } from 'jest-mock-extended';

describe('The TeslaPublicKeyController class', () => {
  let controller: TeslaPublicKeyController;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = process.env;
    process.env = { ...originalEnv };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeslaPublicKeyController],
    }).compile();

    controller = module.get<TeslaPublicKeyController>(TeslaPublicKeyController);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('The getPublicKey() method', () => {
    let mockResponse: MockProxy<Response>;

    beforeEach(() => {
      mockResponse = mock<Response>();
      mockResponse.status.mockReturnValue(mockResponse);
    });

    describe('When TESLA_PUBLIC_KEY_BASE64 environment variable is set', () => {
      const validPublicKeyPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1234567890
-----END PUBLIC KEY-----`;
      const validPublicKeyBase64 = Buffer.from(validPublicKeyPem).toString('base64');

      beforeEach(() => {
        process.env.TESLA_PUBLIC_KEY_BASE64 = validPublicKeyBase64;
        controller.getPublicKey(mockResponse);
      });

      it('should send the decoded PEM public key', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(validPublicKeyPem);
      });

      it('should return the decoded public key', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('-----BEGIN PUBLIC KEY-----')
        );
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('-----END PUBLIC KEY-----')
        );
      });
    });

    describe('When TESLA_PUBLIC_KEY_BASE64 environment variable is not set', () => {
      beforeEach(() => {
        delete process.env.TESLA_PUBLIC_KEY_BASE64;
        controller.getPublicKey(mockResponse);
      });

      it('should return 500 status code', () => {
        expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(500);
      });

      it('should send error message', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith('Public key not configured');
      });
    });

    describe('When TESLA_PUBLIC_KEY_BASE64 contains base64 string', () => {
      beforeEach(() => {
        // Note: Buffer.from() accepts most strings and attempts to decode them
        // The try-catch in the controller is a safety net for unexpected errors
        const someBase64 = Buffer.from('test data').toString('base64');
        process.env.TESLA_PUBLIC_KEY_BASE64 = someBase64;
        controller.getPublicKey(mockResponse);
      });

      it('should successfully decode and send the content', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith('test data');
      });

      it('should not return error status', () => {
        expect((mockResponse.status as jest.Mock)).not.toHaveBeenCalledWith(500);
      });
    });

    describe('When decoding succeeds', () => {
      beforeEach(() => {
        const validPem = '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----';
        const validBase64 = Buffer.from(validPem).toString('base64');
        process.env.TESLA_PUBLIC_KEY_BASE64 = validBase64;
        controller.getPublicKey(mockResponse);
      });

      it('should not call status method (200 OK by default)', () => {
        expect((mockResponse.status as jest.Mock)).not.toHaveBeenCalled();
      });

      it('should call send with decoded content', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith(
          expect.stringContaining('-----BEGIN PUBLIC KEY-----')
        );
      });
    });

    describe('When environment variable is empty string', () => {
      beforeEach(() => {
        process.env.TESLA_PUBLIC_KEY_BASE64 = '';
        controller.getPublicKey(mockResponse);
      });

      it('should return 500 status code', () => {
        expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(500);
      });

      it('should send error message', () => {
        expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith('Public key not configured');
      });
    });

    describe('Response handling', () => {
      describe('When everything is successful', () => {
        beforeEach(() => {
          const validPem = '-----BEGIN PUBLIC KEY-----\nMIIBIjAN\n-----END PUBLIC KEY-----';
          const validBase64 = Buffer.from(validPem).toString('base64');
          process.env.TESLA_PUBLIC_KEY_BASE64 = validBase64;
          controller.getPublicKey(mockResponse);
        });

        it('should return the response object', () => {
          expect((mockResponse.send as jest.Mock)).toHaveBeenCalled();
        });

        it('should decode base64 to UTF-8 string', () => {
          const sentValue = (mockResponse.send as jest.Mock).mock.calls[0][0];
          expect(typeof sentValue).toBe('string');
          expect(sentValue).toContain('-----BEGIN PUBLIC KEY-----');
        });
      });

      describe('When an error occurs', () => {
        beforeEach(() => {
          delete process.env.TESLA_PUBLIC_KEY_BASE64;
          controller.getPublicKey(mockResponse);
        });

        it('should chain status and send calls for error response', () => {
          expect((mockResponse.status as jest.Mock)).toHaveBeenCalledWith(500);
          expect((mockResponse.send as jest.Mock)).toHaveBeenCalledWith('Public key not configured');
        });
      });
    });
  });
});