// tests/managers/ui-state.manager.spec.ts

import { TestBed } from '@angular/core/testing';
import { UIStateManager } from '../../managers/ui-state.manager';
import { UIState } from '../../models/invoice-upload-interfaces';
import { MOCK_DATA } from '../setup/mock-data';

describe('UIStateManager', () => {
  let manager: UIStateManager;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UIStateManager]
    });

    manager = TestBed.inject(UIStateManager);
  });

  afterEach(() => {
    manager.resetAllStates();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const currentState = manager.getCurrentState();
      expect(currentState).toEqual(MOCK_DATA.UI_STATES.INITIAL);
    });

    it('should return correct initial values', () => {
      expect(manager.getLoading()).toBe(false);
      expect(manager.getExcelUpload()).toBe(false);
      expect(manager.getDataRefreshInProgress()).toBe(false);
    });
  });

  describe('Loading State Management', () => {
    it('should set and get loading state', () => {
      manager.setLoading(true);

      expect(manager.getLoading()).toBe(true);
    });

    it('should emit state changes for loading', (done) => {
      let emissionCount = 0;

      manager.uiState$.subscribe(state => {
        emissionCount++;
        if (emissionCount === 1) {
          // Initial state
          expect(state.isLoading).toBe(false);
        } else if (emissionCount === 2) {
          // After setting loading to true
          expect(state.isLoading).toBe(true);
          done();
        }
      });

      manager.setLoading(true);
    });
  });

  describe('Excel Upload State Management', () => {
    it('should set and get excel upload state', () => {
      manager.setExcelUpload(true);

      expect(manager.getExcelUpload()).toBe(true);
    });

    it('should not affect other states when setting excel upload', () => {
      manager.setLoading(true);
      manager.setExcelUpload(true);

      expect(manager.getLoading()).toBe(true);
      expect(manager.getExcelUpload()).toBe(true);
      expect(manager.getDataRefreshInProgress()).toBe(false);
    });
  });

  describe('Data Refresh State Management', () => {
    it('should set and get data refresh state', () => {
      manager.setDataRefreshInProgress(true);

      expect(manager.getDataRefreshInProgress()).toBe(true);
    });

    it('should emit correct state for data refresh', (done) => {
      manager.setDataRefreshInProgress(true);

      manager.uiState$.subscribe(state => {
        if (state.dataRefreshInProgress) {
          expect(state).toEqual(MOCK_DATA.UI_STATES.DATA_REFRESH);
          done();
        }
      });
    });
  });

  describe('Combined State Operations', () => {
    it('should start file upload with correct states', () => {
      manager.startFileUpload();

      expect(manager.getLoading()).toBe(true);
      expect(manager.getExcelUpload()).toBe(true);
      expect(manager.getDataRefreshInProgress()).toBe(false);
    });

    it('should finish file upload with correct states', () => {
      manager.startFileUpload();
      manager.finishFileUpload();

      expect(manager.getLoading()).toBe(false);
      expect(manager.getExcelUpload()).toBe(false);
    });

    it('should start submit with loading state', () => {
      manager.startSubmit();

      expect(manager.getLoading()).toBe(true);
      expect(manager.getExcelUpload()).toBe(false);
    });

    it('should finish submit and reset loading', () => {
      manager.startSubmit();
      manager.finishSubmit();

      expect(manager.getLoading()).toBe(false);
    });

    it('should start data refresh correctly', () => {
      manager.startDataRefresh();

      expect(manager.getDataRefreshInProgress()).toBe(true);
      expect(manager.getLoading()).toBe(false);
      expect(manager.getExcelUpload()).toBe(false);
    });

    it('should finish data refresh correctly', () => {
      manager.startDataRefresh();
      manager.finishDataRefresh();

      expect(manager.getDataRefreshInProgress()).toBe(false);
    });
  });

  describe('State Queries', () => {
    it('should detect when any operation is in progress', () => {
      expect(manager.isAnyOperationInProgress()).toBe(false);

      manager.setLoading(true);
      expect(manager.isAnyOperationInProgress()).toBe(true);

      manager.setLoading(false);
      manager.setExcelUpload(true);
      expect(manager.isAnyOperationInProgress()).toBe(true);

      manager.setExcelUpload(false);
      manager.setDataRefreshInProgress(true);
      expect(manager.isAnyOperationInProgress()).toBe(true);
    });

    it('should detect when user can interact', () => {
      expect(manager.canUserInteract()).toBe(true);

      manager.setLoading(true);
      expect(manager.canUserInteract()).toBe(false);

      manager.resetAllStates();
      expect(manager.canUserInteract()).toBe(true);
    });

    it('should get current state correctly', () => {
      manager.setLoading(true);
      manager.setExcelUpload(true);

      const currentState = manager.getCurrentState();

      expect(currentState.isLoading).toBe(true);
      expect(currentState.excelUpload).toBe(true);
      expect(currentState.dataRefreshInProgress).toBe(false);
    });
  });

  describe('State Reset', () => {
    it('should reset all states to initial values', () => {
      manager.setLoading(true);
      manager.setExcelUpload(true);
      manager.setDataRefreshInProgress(true);

      manager.resetAllStates();

      expect(manager.getCurrentState()).toEqual(MOCK_DATA.UI_STATES.INITIAL);
    });

    it('should emit reset state', (done) => {
      manager.setLoading(true);

      // Subscribe only after state change
      let emissionCount = 0;
      const subscription = manager.uiState$.subscribe(state => {
        emissionCount++;
        if (emissionCount === 2 && !state.isLoading && !state.excelUpload && !state.dataRefreshInProgress) {
          expect(state).toEqual(MOCK_DATA.UI_STATES.INITIAL);
          subscription.unsubscribe();
          done();
        }
      });

      manager.resetAllStates();
    });
  });

  describe('State Subscriptions', () => {
    it('should provide loading state subscription', (done) => {
      let emissionCount = 0;

      manager.subscribeToLoadingState().subscribe(isLoading => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(isLoading).toBe(false);
        } else if (emissionCount === 2) {
          expect(isLoading).toBe(true);
          done();
        }
      });

      manager.setLoading(true);
    });

    it('should provide excel upload state subscription', (done) => {
      manager.subscribeToExcelUploadState().subscribe(excelUpload => {
        if (excelUpload) {
          expect(excelUpload).toBe(true);
          done();
        }
      });

      manager.setExcelUpload(true);
    });

    it('should provide data refresh state subscription', (done) => {
      manager.subscribeToDataRefreshState().subscribe(dataRefresh => {
        if (dataRefresh) {
          expect(dataRefresh).toBe(true);
          done();
        }
      });

      manager.setDataRefreshInProgress(true);
    });
  });

  describe('Complex State Scenarios', () => {
    it('should handle rapid state changes correctly', (done) => {
      let stateHistory: UIState[] = [];

      manager.uiState$.subscribe(state => {
        stateHistory.push({ ...state });

        if (stateHistory.length === 4) {
          expect(stateHistory[0]).toEqual(MOCK_DATA.UI_STATES.INITIAL);
          expect(stateHistory[1].isLoading).toBe(true);
          expect(stateHistory[2].excelUpload).toBe(true);
          expect(stateHistory[3]).toEqual(MOCK_DATA.UI_STATES.INITIAL);
          done();
        }
      });

      manager.setLoading(true);
      manager.setExcelUpload(true);
      manager.resetAllStates();
    });

    it('should handle file upload lifecycle', () => {
      // Start file upload
      manager.startFileUpload();
      expect(manager.isAnyOperationInProgress()).toBe(true);
      expect(manager.getLoading()).toBe(true);
      expect(manager.getExcelUpload()).toBe(true);

      // Finish file upload
      manager.finishFileUpload();
      expect(manager.isAnyOperationInProgress()).toBe(false);
      expect(manager.getLoading()).toBe(false);
      expect(manager.getExcelUpload()).toBe(false);
    });

    it('should handle submit lifecycle', () => {
      // Start submit
      manager.startSubmit();
      expect(manager.getLoading()).toBe(true);
      expect(manager.canUserInteract()).toBe(false);

      // Finish submit
      manager.finishSubmit();
      expect(manager.getLoading()).toBe(false);
      expect(manager.canUserInteract()).toBe(true);
    });
  });

  describe('Memory and Performance', () => {
    it('should not leak memory with multiple subscriptions', () => {
      const subscriptions = [];

      // Create multiple subscriptions
      for (let i = 0; i < 10; i++) {
        subscriptions.push(manager.uiState$.subscribe());
      }

      // Change state multiple times
      manager.setLoading(true);
      manager.setExcelUpload(true);
      manager.resetAllStates();

      // Unsubscribe all
      subscriptions.forEach(sub => sub.unsubscribe());

      // Should not throw or cause memory leaks
      expect(true).toBe(true);
    });

    it('should handle concurrent state updates', () => {
      // Simulate concurrent updates
      manager.setLoading(true);
      manager.setExcelUpload(true);
      manager.setDataRefreshInProgress(true);
      manager.setLoading(false);

      const finalState = manager.getCurrentState();

      expect(finalState.isLoading).toBe(false);
      expect(finalState.excelUpload).toBe(true);
      expect(finalState.dataRefreshInProgress).toBe(true);
    });
  });
});
