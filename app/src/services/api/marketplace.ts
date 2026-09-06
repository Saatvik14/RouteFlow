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

export interface FleetPoolRoute {
  routeId: number;
  routeName: string;
  startAddress: string;
  endAddress: string;
  plannedStart: string;
  plannedEnd: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  totalStops: number;
  optInDeadline: string;
  marketplaceStatus: MarketplaceStatus;
  optInCount: number;
  optOutCount: number;
  myResponse?: {
    response: 'opt_in' | 'opt_out';
    notes?: string | null;
    respondedAt: string;
  } | null;
  organizationName?: string;
}

export interface BusinessFleetListing {
  routeId: number;
  routeName: string;
  status: string;
  marketplaceStatus: MarketplaceStatus;
  optInDeadline: string;
  deadlinePassed: boolean;
  plannedStart: string;
  plannedEnd: string;
  totalStops: number;
  totalDistanceKm: number;
  startAddress: string;
  endAddress: string;
  optInCount: number;
  optOutCount: number;
  awardedDriverId?: number | null;
  awardedDriverName?: string | null;
  createdAt: string;
}

export interface RouteOptIn {
  optInId: number;
  driverUserId: number;
  driverName: string;
  driverEmail?: string | null;
  driverPhone?: string | null;
  response: 'opt_in' | 'opt_out';
  notes?: string | null;
  respondedAt: string;
}

export interface RouteOptInsResponse {
  success: boolean;
  route: {
    routeId: number;
    routeName: string;
    optInDeadline: string;
    deadlinePassed: boolean;
    marketplaceStatus: MarketplaceStatus;
    awardedDriverId?: number | null;
  };
  optIns: RouteOptIn[];
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

  // Fleet Driver Pool
  getFleetPoolRoutes: () => apiGet<{ success: boolean; routes: FleetPoolRoute[] }>(API_ENDPOINTS.MARKETPLACE.FLEET_ROUTES),
  respondToFleetRoute: (routeId: number, response: 'opt_in' | 'opt_out', notes?: string) =>
    apiPost<{ success: boolean; message: string; optIn: any }>(API_ENDPOINTS.MARKETPLACE.FLEET_RESPOND(routeId), { response, notes }),
  getBusinessFleetListings: () => apiGet<{ success: boolean; routes: BusinessFleetListing[] }>(API_ENDPOINTS.MARKETPLACE.FLEET_BUSINESS_ROUTES),
  getRouteOptIns: (routeId: number) => apiGet<RouteOptInsResponse>(API_ENDPOINTS.MARKETPLACE.FLEET_ROUTE_OPT_INS(routeId)),
  selectDriver: (routeId: number, driverUserId: number) =>
    apiPost<{ success: boolean; message: string }>(API_ENDPOINTS.MARKETPLACE.FLEET_SELECT_DRIVER(routeId), { driverUserId }),
  closeFleetListing: (routeId: number) => apiPost<{ success: boolean; message: string }>(API_ENDPOINTS.MARKETPLACE.FLEET_CLOSE_LISTING(routeId)),
};
