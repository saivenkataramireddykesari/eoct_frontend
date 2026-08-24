export interface IMilestone {
  id: number | string;
  name: string;
  status: string;
  target_date: string | null;
  actual_date: string | null;
  remarks: string | null;
  category?: string; // Optional, as it's added in getUniqueMilestones
}

export interface IOrderCreate {
  customer_id: number;
  country_id: number;
  po_number: string;
  po_date: string | null;
  sku?: string | null; // Make optional
  unregistered_product_name?: string | null; // New field
  unregistered_product_description?: string | null; // New field
  sales_quantity: number;
  free_quantity: number;
  quantity: number;
  requested_delivery_date: string | null;
  shipping_terms?: string | null;
  import_license_required?: boolean;
  import_license_validity?: string | null;
  remarks?: string | null;
  order_type: string;
  currency: string;
  order_price?: number; // Make optional for unregistered products
}

export interface IOrder {
  id: number;
  order_id: number;
  order_number: string;
  customer: { customer_name: string };
  country: { name: string };
  po_number: string;
  po_date: string;
  sku: string | null; // Make optional
  unregistered_product_name?: string | null; // New field
  unregistered_product_description?: string | null; // New field
  product: {
    product_name: string;
    pack_size: string;
    standard_batch_size: string;
    moq: string;
    primary_pm_code: string;
    secondary_pm_code: string;
    leaf_pm_code: string;
    artwork_status: string;
  } | null; // Allow product to be null
  quantity: number;
  requested_delivery_date: string;
  shipping_terms: string;
  status: string;
  compliance_status: string;
  compliance_remarks: string;
  tentative_production_date: string | null;
  tentative_release_date: string | null;
  approvals: IApproval[];
  milestones: IMilestone[];
  created_at: string;
  order_price: number;
  currency: string;
}

export interface IApproval {
  id: number;
  department: string;
  status: string;
  approver?: { name: string; department: string };
  remarks: string;
  approved_at: string | null;
  sequence?: number;
}

export interface IUser {
  department: string;
  role: string;
  name: string;
  email: string;
}

export interface IAuditLog {
  id: number;
  action: string;
  timestamp: string;
  user: { name: string; department: string } | null;
  remarks: string | null;
  previous_status: string | null;
  new_status: string | null;
}

export interface IMilestoneHistoryEntry {
  id: number;
  changed_at: string;
  changed_by_user?: { name: string; department: string }; // For new API
  changed_by?: { name: string; department: string }; // For old API
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  remarks: string | null;
}
