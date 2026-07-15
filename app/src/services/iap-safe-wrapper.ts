import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

export enum ErrorCode {
  ActivityUnavailable = 'activity-unavailable',
  AlreadyOwned = 'already-owned',
  AlreadyPrepared = 'already-prepared',
  BillingResponseJsonParseError = 'billing-response-json-parse-error',
  BillingUnavailable = 'billing-unavailable',
  ConnectionClosed = 'connection-closed',
  DeferredPayment = 'deferred-payment',
  DeveloperError = 'developer-error',
  DuplicatePurchase = 'duplicate-purchase',
  EmptySkuList = 'empty-sku-list',
  FeatureNotSupported = 'feature-not-supported',
  IapNotAvailable = 'iap-not-available',
  InitConnection = 'init-connection',
  Interrupted = 'interrupted',
  ItemNotOwned = 'item-not-owned',
  ItemUnavailable = 'item-unavailable',
  NetworkError = 'network-error',
  NotEnded = 'not-ended',
  NotPrepared = 'not-prepared',
  Pending = 'pending',
  PurchaseError = 'purchase-error',
  PurchaseVerificationFailed = 'purchase-verification-failed',
  PurchaseVerificationFinishFailed = 'purchase-verification-finish-failed',
  PurchaseVerificationFinished = 'purchase-verification-finished',
  QueryProduct = 'query-product',
  ReceiptFailed = 'receipt-failed',
  ReceiptFinished = 'receipt-finished',
  ReceiptFinishedFailed = 'receipt-finished-failed',
  RemoteError = 'remote-error',
  ServiceDisconnected = 'service-disconnected',
  ServiceError = 'service-error',
  ServiceTimeout = 'service-timeout',
  SkuNotFound = 'sku-not-found',
  SkuOfferMismatch = 'sku-offer-mismatch',
  SyncError = 'sync-error',
  TransactionValidationFailed = 'transaction-validation-failed',
  Unknown = 'unknown',
  UserCancelled = 'user-cancelled',
  UserError = 'user-error',
}

function isNativeModuleAvailable(): boolean {
  try {
    const names = ['Expolap', 'ExpoIap', 'ExpoIapVega', 'ExpoIapOnside'];
    for (const name of names) {
      try {
        const module = requireNativeModule(name);
        if (module) return true;
      } catch {
        // Module not found, try the next one
      }
    }
    return false;
  } catch {
    return false;
  }
}

const hasNativeModule = isNativeModuleAvailable();

export async function deepLinkToSubscriptions(options?: {
  skuAndroid?: string;
  skuIOS?: string;
}): Promise<void> {
  if (!hasNativeModule) {
    console.warn('deepLinkToSubscriptions called but expo-iap native module is not available.');
    return;
  }

  try {
    const iap = require('expo-iap');
    if (iap && typeof iap.deepLinkToSubscriptions === 'function') {
      await iap.deepLinkToSubscriptions(options);
    }
  } catch (error) {
    console.warn('deepLinkToSubscriptions failed', error);
  }
}

export function useIAP(options?: {
  onPurchaseSuccess?: (purchase: any) => void;
  onPurchaseError?: (error: any) => void;
}) {
  if (hasNativeModule) {
    try {
      const iap = require('expo-iap');
      if (iap && typeof iap.useIAP === 'function') {
        return iap.useIAP(options);
      }
    } catch (error) {
      console.warn('expo-iap native module load failed', error);
    }
  }

  // Safe mock implementation
  return {
    connected: true,
    products: [],
    subscriptions: [
      { id: 'routeflow_lite_monthly', displayPrice: '£9.99', name: 'RouteFloww Lite' },
      { id: 'routeflow_standard_monthly', displayPrice: '£14.99', name: 'RouteFloww Standard' }
    ],
    fetchProducts: async () => {
      console.warn('fetchProducts called but expo-iap native module is not available.');
      return [
        { id: 'routeflow_lite_monthly', displayPrice: '£9.99', name: 'RouteFloww Lite' },
        { id: 'routeflow_standard_monthly', displayPrice: '£14.99', name: 'RouteFloww Standard' }
      ];
    },
    requestPurchase: async () => {
      console.warn('requestPurchase called but expo-iap native module is not available.');
      throw new Error('In-app purchases are not supported in this environment.');
    },
    finishTransaction: async () => {
      console.warn('finishTransaction called but expo-iap native module is not available.');
    },
  };
}
