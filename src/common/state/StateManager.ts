import { BehaviorSubject, Observable } from 'rxjs';
import { AppState, RiskLevel } from '../types';
import { ErrorHandler, ErrorCategory, ErrorSeverity } from '../errors/ErrorHandler';

/**
 * StateManager - Singleton class responsible for managing the application state
 * using RxJS BehaviorSubject for reactive state management.
 */
export class StateManager {
  private static instance: StateManager;
  private state: BehaviorSubject<AppState>;
  private errorHandler: ErrorHandler;

  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
    this.state = new BehaviorSubject<AppState>({
      products: {
        items: [],
        loading: false,
        error: null
      },
      analysis: {
        current: null,
        loading: false,
        error: null
      },
      ui: {
        activeTab: 'home',
        settings: {
          riskThreshold: RiskLevel.MEDIUM,
          notifications: true,
          autoAnalyze: true
        }
      }
    });
  }

  /**
   * Get the singleton instance of StateManager
   * @returns The StateManager instance
   */
  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Get the current state as an Observable
   * @returns Observable of AppState
   */
  getState(): Observable<AppState> {
    return this.state.asObservable();
  }

  /**
   * Get a snapshot of the current state
   * @returns Current AppState
   */
  getCurrentState(): AppState {
    return this.state.getValue();
  }

  /**
   * Update the application state using a state updater function
   * @param updater Function that takes current state and returns new state
   */
  updateState(updater: (state: AppState) => AppState): void {
    try {
      const currentState = this.state.getValue();
      const newState = updater(currentState);
      this.state.next(newState);
    } catch (error) {
      this.errorHandler.error(
        'Failed to update state',
        'STATE_UPDATE_ERROR',
        ErrorSeverity.HIGH,
        ErrorCategory.UI,
        { error }
      );
    }
  }

  /**
   * Persist the current state to Chrome storage
   */
  async persistState(): Promise<void> {
    try {
      const currentState = this.state.getValue();
      await chrome.storage.local.set({ appState: currentState });
    } catch (error) {
      this.errorHandler.error(
        'Failed to persist state to storage',
        'STATE_PERSIST_ERROR',
        ErrorSeverity.MEDIUM,
        ErrorCategory.STORAGE,
        { error }
      );
    }
  }

  /**
   * Load persisted state from Chrome storage
   */
  async loadPersistedState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('appState');
      if (result.appState) {
        this.state.next(result.appState);
      }
    } catch (error) {
      this.errorHandler.error(
        'Failed to load persisted state',
        'STATE_LOAD_ERROR',
        ErrorSeverity.MEDIUM,
        ErrorCategory.STORAGE,
        { error }
      );
    }
  }

  /**
   * Reset state to initial values
   */
  resetState(): void {
    this.state.next({
      products: {
        items: [],
        loading: false,
        error: null
      },
      analysis: {
        current: null,
        loading: false,
        error: null
      },
      ui: {
        activeTab: 'home',
        settings: {
          riskThreshold: RiskLevel.MEDIUM,
          notifications: true,
          autoAnalyze: true
        }
      }
    });
  }
}