import { API_ENDPOINTS } from '../../constants/api';
import { apiGet, apiPatch, apiPost } from './client';

export type MarketplaceStatus = 'open' | 'awarded' | 'withdrawn' | 'closed';
export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

export interface MarketplaceBid {
  bidId: number;
  routeId: number;
  amount: number;
  currency: 'GBP' | 'INR';
  message?: string | null;
  status: BidStatus;
  createdAt: string;
  updatedAt: string;
  driver?: {
    userId: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    vehicleType?: string | null;
    completedRoutes: number;
    cancelledRoutes: number;
    completionRate: number;
  };
  route?: {
    name: string;
    organizationName: string;
    plannedStart: string;
    plannedEnd: string;
    startAddress: string;
    endAddress: string;
    maxCost: number;
    marketplaceStatus: MarketplaceStatus;
  };
}

export interface MarketplaceRoute {
  routeId: number;
  organizationName: string;
  name: string;
  startAddress: string;
  endAddress: string;
  plannedStart: string;
  plannedEnd: string;
  maxCost: number;
  currency: 'GBP' | 'INR';
  biddingClosesAt: string;
  marketplaceStatus: MarketplaceStatus;
  bidCount: number;
  pendingBidCount: number;
  awardedCost?: number | null;
  myBid?: Pick<MarketplaceBid, 'bidId' | 'amount' | 'status' | 'message' | 'updatedAt'> | null;
}

export const marketplaceService = {
  getSummary: () => apiGet<any>(API_ENDPOINTS.MARKETPLACE.SUMMARY),
  getAvailableRoutes: () => apiGet<{ routes: MarketplaceRoute[] }>(API_ENDPOINTS.MARKETPLACE.ROUTES),
  getMyBids: () => apiGet<{ bids: MarketplaceBid[] }>(API_ENDPOINTS.MARKETPLACE.MY_BIDS),
  placeBid: (routeId: number, amount: number, message?: string) =>
    apiPost<{ bid: MarketplaceBid }>(API_ENDPOINTS.MARKETPLACE.PLACE_BID(routeId), { amount, message }),
  withdrawBid: (bidId: number) => apiPatch(API_ENDPOINTS.MARKETPLACE.WITHDRAW_BID(bidId)),
  getBusinessRoutes: () => apiGet<{ routes: MarketplaceRoute[] }>(API_ENDPOINTS.MARKETPLACE.BUSINESS_ROUTES),
  getRouteBids: (routeId: number) => apiGet<{ bids: MarketplaceBid[] }>(API_ENDPOINTS.MARKETPLACE.ROUTE_BIDS(routeId)),
  acceptBid: (bidId: number) => apiPost(API_ENDPOINTS.MARKETPLACE.ACCEPT_BID(bidId)),
  closeListing: (routeId: number) => apiPost(API_ENDPOINTS.MARKETPLACE.CLOSE_LISTING(routeId)),
};
