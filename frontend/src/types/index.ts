/** A product in the catalog. Costs are stored in CNY (Chinese Yuan). */
export interface Product {
  productId: number;
  /** Unique display name (e.g. "National Geographic Penguin Shirt"). */
  productName: string;
  /** Category grouping (e.g. "Shirts", "Accessories"). */
  productType: string | null;
  /** Supplier cost in CNY. */
  cost: number;
  /** Current inventory count. */
  stockQuantity: number;
}

/** A line item within an order, linking to a product. */
export interface OrderItem {
  orderItemId?: number;
  productId: number;
  /** Denormalized from the Product entity (included in API responses). */
  productName?: string;
  /** What the customer paid for this item in CAD. */
  itemPaid: number;
  /** Size variant (e.g. "M", "L"). */
  itemSize: string | null;
  note: string | null;
}

/** An order placed on a sales platform. All monetary values in CAD. */
export interface Order {
  orderId: number;
  /** Sales channel (e.g. "Instagram", "GRAILED", "In Person"). */
  platform: string;
  /** Shipping cost in CAD. -1 means unknown/pending. */
  shipping: number;
  /** Total revenue in CAD. */
  revenue: number;
  /** Amount refunded to customer in CAD. */
  refunded: number;
  /** Portion of refund that was reused/recouped. */
  refundedUsed: number;
  customerName: string;
  /** Format: "City, State, COUNTRY". Country is extracted for filtering. */
  shippingLocation: string;
  /** Disputed orders are excluded from analytics views. */
  disputed: boolean;
  /** ISO date string (YYYY-MM-DD) or null. */
  orderDate: string | null;
  deliveredDate: string | null;
  note: string | null;
  items: OrderItem[];
}

/** Inbound DTO for creating/updating an order. All monetary values pre-converted to CAD. */
export interface OrderRequest {
  platform: string;
  shipping: number;
  revenue: number;
  refunded: number;
  refundedUsed: number;
  customerName: string;
  shippingLocation: string;
  disputed: boolean;
  orderDate: string | null;
  deliveredDate: string | null;
  note: string | null;
  items: {
    productId: number;
    itemPaid: number;
    itemSize: string | null;
    note: string | null;
  }[];
}

/** A personal haul cash flow entry (income or expense). */
export interface PersonalHaul {
  /** ISO-8601 timestamp (database-generated primary key). */
  entryTime: string;
  /** "income" or "expense". */
  flowType: string;
  /** Dollar amount in CAD. */
  amount: number;
  note: string | null;
}
