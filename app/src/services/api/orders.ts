/**
 * Orders API Service
 * Handles all order-related API calls
 */

import { API_ENDPOINTS } from '../../constants/api';
import { apiDelete, apiGet, apiPost, apiPut } from './client';

/**
 * Order data interface
 */
export interface Order {
  id: string;
  status?: string;
  [key: string]: any;
}

/**
 * Orders Service functions
 */
export const ordersService = {
  /**
   * Add a new order
   */
  addOrder: (data: any) =>
    apiPost<Order>(API_ENDPOINTS.ORDERS.ADD, data),

  /**
   * Edit an existing order
   */
  editOrder: (data: any) =>
    apiPut<Order>(API_ENDPOINTS.ORDERS.EDIT, data),

  /**
   * Delete all orders
   */
  deleteAllOrders: () =>
    apiDelete(API_ENDPOINTS.ORDERS.DELETE_ALL),

  /**
   * Delete an order by ID
   */
  deleteOrderById: (id: string) =>
    apiDelete(API_ENDPOINTS.ORDERS.DELETE(id)),

  /**
   * Fetch all orders
   */
  fetchOrders: () =>
    apiGet<Order[]>(API_ENDPOINTS.ORDERS.FETCH_ALL),


  fetchOrdersByRoute: (routeId: string) =>
      apiGet<Order[]>(API_ENDPOINTS.ORDERS.GET_ORDERS_BY_ROUTE(routeId)),

  /**
   * Set vehicle placement for an order
   */
  setVehiclePlacement: (data: any) =>
    apiPost(API_ENDPOINTS.ORDERS.VEHICLE_PLACE, data),

  /**
   * Get vehicle placement by order ID
   */
  getVehiclePlacementByOrderId: (orderId: string) =>
    apiGet(API_ENDPOINTS.ORDERS.GET_VEHICLE_PLACE(orderId)),
};