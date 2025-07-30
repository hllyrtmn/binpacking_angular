// tests/managers/file-upload.manager.spec.ts

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FileUploadManager } from '../../managers/file-upload.manager';
import { RepositoryService } from '../../../../services/repository.service';
import { INVOICE_UPLOAD_CONSTANTS } from '../../constants/invoice-upload.constants';
import { MOCK_DATA, createMockEvent, ERROR_SCENARIOS, createMockOrder, createMockOrderDetail } from '../setup/mock-data';
import { MockRepositoryService, MockToastService, expectToastMessage } from '../setup/test-setup';
import { ToastService } from '../../../../../../../../services/toast.service';

describe('FileUploadManager', () => {
  let manager: FileUploadManager;
  let mockRepositoryService: jasmine.SpyObj<RepositoryService>;
  let mockToastService: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FileUploadManager,
        { provide: RepositoryService, useClass: MockRepositoryService },
        { provide: ToastService, useClass: MockToastService }
      ]
    });

    manager = TestBed.inject(FileUploadManager);
    mockRepositoryService = TestBed.inject(RepositoryService) as jasmine.SpyObj<RepositoryService>;
    mockToastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  });

  afterEach(() => {
    manager.resetAllFiles();
  });

  describe('File Validation', () => {
    it('should validate Excel files correctly', () => {
      const result = manager.validateFile(MOCK_DATA.VALID_EXCEL_FILE);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate PDF files correctly', () => {
      const result = manager.validateFile(MOCK_DATA.VALID_PDF_FILE);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid file types', () => {
      const result = manager.validateFile(MOCK_DATA.INVALID_FILE_TYPE);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(INVOICE_UPLOAD_CONSTANTS.MESSAGES.ERROR.INVALID_FILE_TYPE);
    });

    it('should reject files exceeding size limit', () => {
      const result = manager.validateFile(MOCK_DATA.LARGE_FILE);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(INVOICE_UPLOAD_CONSTANTS.MESSAGES.ERROR.FILE_TOO_LARGE);
    });

    it('should handle null file in validator', () => {
      const control = { value: null } as any;
      const result = manager.fileValidator(control);

      expect(result).toBeNull();
    });

    it('should return validation error for invalid file in validator', () => {
      const control = { value: MOCK_DATA.INVALID_FILE_TYPE } as any;
      const result = manager.fileValidator(control);

      expect(result).toEqual({ invalidFile: INVOICE_UPLOAD_CONSTANTS.MESSAGES.ERROR.INVALID_FILE_TYPE });
    });
  });

  describe('File Selection', () => {
    it('should select valid file successfully', () => {
      const event = createMockEvent(MOCK_DATA.VALID_EXCEL_FILE);
      const result = manager.selectFile(event);

      expect(result).toBe(true);
      expect(manager.getCurrentFile()).toBe(MOCK_DATA.VALID_EXCEL_FILE);
      expectToastMessage(mockToastService, 'success');
    });

    it('should reject invalid file and show error', () => {
      const event = createMockEvent(MOCK_DATA.INVALID_FILE_TYPE);
      const result = manager.selectFile(event);

      expect(result).toBe(false);
      expect(manager.getCurrentFile()).toBeNull();
      expectToastMessage(mockToastService, 'error');
    });

    it('should handle event with no files', () => {
      const input = document.createElement('input');
      const event = new Event('change');
      Object.defineProperty(event, 'target', { value: input });

      const result = manager.selectFile(event);

      expect(result).toBe(false);
    });

    it('should handle event with empty file list', () => {
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [] });
      const event = new Event('change');
      Object.defineProperty(event, 'target', { value: input });

      const result = manager.selectFile(event);

      expect(result).toBe(false);
    });
  });

  describe('File Upload', () => {
    beforeEach(() => {
      manager.selectFile(createMockEvent(MOCK_DATA.VALID_EXCEL_FILE));
    });

    it('should upload file successfully', (done) => {
      const mockResponse = {
        message: 'File processed successfully',
        order: createMockOrder(),
        orderDetail: [createMockOrderDetail()]
      };
      mockRepositoryService.processFile.and.returnValue(of(mockResponse));

      manager.uploadFile().subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          expect(mockRepositoryService.processFile).toHaveBeenCalledWith(MOCK_DATA.VALID_EXCEL_FILE);
          expectToastMessage(mockToastService, 'info', 'yükleniyor');
          done();
        }
      });
    });

    it('should handle upload error', (done) => {
      mockRepositoryService.processFile.and.returnValue(throwError(ERROR_SCENARIOS.NETWORK_ERROR));

      manager.uploadFile().subscribe({
        error: (error) => {
          expect(error).toBe(ERROR_SCENARIOS.NETWORK_ERROR);
          done();
        }
      });
    });

    it('should throw error when no file selected', () => {
      manager.resetAllFiles();

      expect(() => manager.uploadFile()).toThrowError('No file selected');
      expectToastMessage(mockToastService, 'warning');
    });
  });

  describe('File to Order Upload', () => {
    beforeEach(() => {
      manager.selectFile(createMockEvent(MOCK_DATA.VALID_EXCEL_FILE));
      manager.moveFileToTemp();
    });

    it('should upload temp file to order successfully', (done) => {
      const orderId = 'order-123';
      const mockResponse = {
        id: 'file-uuid-123',
        file: 'https://example.com/uploads/test.xlsx',
        order: createMockOrder({ id: orderId }) // Order object instead of string
      };
      mockRepositoryService.uploadFile.and.returnValue(of(mockResponse));

      manager.uploadFileToOrder(orderId).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          expect(mockRepositoryService.uploadFile).toHaveBeenCalledWith(MOCK_DATA.VALID_EXCEL_FILE, orderId);
          done();
        }
      });
    });

    it('should throw error when no temp file available', () => {
      manager.resetAllFiles();

      expect(() => manager.uploadFileToOrder('order-123')).toThrowError('No temp file available');
    });
  });

  describe('File State Management', () => {
    it('should manage file state correctly', () => {
      expect(manager.hasFile()).toBe(false);
      expect(manager.hasTempFile()).toBe(false);

      manager.selectFile(createMockEvent(MOCK_DATA.VALID_EXCEL_FILE));
      expect(manager.hasFile()).toBe(true);
      expect(manager.hasTempFile()).toBe(false);

      manager.moveFileToTemp();
      expect(manager.hasFile()).toBe(false);
      expect(manager.hasTempFile()).toBe(true);
      expect(manager.getFileName()).toBe(MOCK_DATA.VALID_EXCEL_FILE.name);
    });

    it('should reset file input correctly', () => {
      manager.selectFile(createMockEvent(MOCK_DATA.VALID_EXCEL_FILE));
      expect(manager.getCurrentFile()).not.toBeNull();

      manager.resetFileInput();
      expect(manager.getCurrentFile()).toBeNull();
    });

    it('should reset all files correctly', () => {
      manager.selectFile(createMockEvent(MOCK_DATA.VALID_EXCEL_FILE));
      manager.moveFileToTemp();

      manager.resetAllFiles();
      expect(manager.getCurrentFile()).toBeNull();
      expect(manager.getTempFile()).toBeNull();
      expect(manager.hasFile()).toBe(false);
      expect(manager.hasTempFile()).toBe(false);
    });

    it('should return file state correctly', () => {
      manager.selectFile(createMockEvent(MOCK_DATA.VALID_EXCEL_FILE));
      const state = manager.getFileState();

      expect(state.file).toBe(MOCK_DATA.VALID_EXCEL_FILE);
      expect(state.tempFile).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined file name gracefully', () => {
      expect(manager.getFileName()).toBeUndefined();
    });

    it('should handle multiple file selections', () => {
      manager.selectFile(createMockEvent(MOCK_DATA.VALID_EXCEL_FILE));
      const firstFile = manager.getCurrentFile();

      manager.selectFile(createMockEvent(MOCK_DATA.VALID_PDF_FILE));
      const secondFile = manager.getCurrentFile();

      expect(secondFile).toBe(MOCK_DATA.VALID_PDF_FILE);
      expect(secondFile).not.toBe(firstFile);
    });

    it('should handle file selection after reset', () => {
      manager.selectFile(createMockEvent(MOCK_DATA.VALID_EXCEL_FILE));
      manager.resetAllFiles();

      manager.selectFile(createMockEvent(MOCK_DATA.VALID_PDF_FILE));
      expect(manager.getCurrentFile()).toBe(MOCK_DATA.VALID_PDF_FILE);
    });
  });
});
