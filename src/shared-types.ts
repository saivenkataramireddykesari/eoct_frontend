// frontend/src/shared-types.ts

export interface Country {
  id: number;
  name: string;
}

export interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  is_active: boolean;
  created_at?: string | null;
  last_login?: string | null;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

export interface PMCodeTransaction {
  id: number;
  request_id: number;
  from_state?: string | null;
  to_state?: string | null;
  action_by_dept?: string | null;
  action_by_user_id: number;
  primary_pm_code?: string | null;
  secondary_pm_code?: string | null;
  leaf_pm_code?: string | null;
  remarks?: string | null;
  created_at: string;
  response_time_days: number;
}

export interface PMCodeRequest {
  id: number;
  product_sku: string;
  status: string;
  current_primary_pm_code?: string | null;
  current_secondary_pm_code?: string | null;
  current_leaf_pm_code?: string | null;
  created_at: string;
  updated_at: string;
  transactions: PMCodeTransaction[];
}

export interface Product {
  id: number;
  sku_code: string;
  product_name: string;
  category?: string | null;
  country_id?: number | null;
  country?: Country | null; // Relationship
  customer?: string | null; 
  pack_size?: string | null;
  standard_batch_size?: number | null;
  moq?: number | null;
  primary_pm_code?: string | null;
  secondary_pm_code?: string | null;
  leaf_pm_code?: string | null;
  current_artwork_version?: string | null;
  artwork_status: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  pm_code_requests?: PMCodeRequest[]; // Relationship
}

export interface Registration {
  id: number;
  country_id: number;
  country?: Country | null; // Relationship
  sku: string;
  product?: Product | null; // Relationship (from models.py)
  registration_number: string;
  registration_status: string;
  registration_issue_date?: string | null;
  registration_expiry_date?: string | null;
  certificate_path?: string | null;
  remarks?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Customer {
  id: number;
  customer_name: string;
  country_id: number;
  country?: Country | null;
  payment_terms: string | null;
  agreement_status: string;
  agreement_validity: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  notes: string | null; 
  compliance_risk: string | null;
  order_type?: string;
  default_artwork_status?: string;
  order_count?: number;
  category?: string;
}

export interface Milestone {
  id: number;
  order_id: number;
  name: string;
  category: string;
  status: string;
  target_date?: string | null;
  actual_date?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OrderApproval {
  id: number;
  order_id: number;
  department: string;
  approver_id?: number | null;
  status: string;
  remarks?: string | null;
  approved_at?: string | null;
  sequence: number;
  created_at?: string | null;
  approver?: User | null; // Relationship
}

export interface Alert {
  id: number;
  alert_type: string;
  order_id?: number | null;
  message: string;
  priority: string;
  department?: string | null;
  is_read: boolean;
  created_at?: string | null;
  resolved_at?: string | null;
}

export interface AuditLog {
  id: number;
  order_id: number;
  user_id: number;
  action: string;
  previous_status?: string | null;
  new_status?: string | null;
  remarks?: string | null;
  timestamp?: string | null;
  ip_address?: string | null;
  user?: User | null; // Relationship
}

export interface Order {
  id: number;
  order_id: string;
  order_number: string;
  customer_id: number;
  country_id: number;
  po_number: string;
  po_date: string;
  sku: string;
  sales_quantity: number;
  free_quantity: number;
  quantity: number;
  requested_delivery_date: string;
  shipping_terms?: string | null;
  import_license_required: boolean;
  import_license_validity?: string | null;
  remarks?: string | null;
  status: string;
  compliance_status?: string | null;
  compliance_remarks?: string | null;
  tentative_production_date?: string | null;
  tentative_release_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  accepted_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;

  // Relationships
  customer?: Customer | null;
  product?: Product | null;
  approvals?: OrderApproval[];
  milestones?: Milestone[];
  alerts?: Alert[];
  country?: Country | null;
}

export interface DashboardStats {
  new_orders: number;
  pending_approval: number;
  accepted: number;
  in_execution: number;
  ready_shipment: number;
  shipped: number;
  delivered: number;
  at_risk: number;
  expiring_registrations: number;
  missing_certificates: number;
  pending_approvals: number;
  open_orders: number;
  delayed: number;
  on_time_deliveries: number;
  total_delivered: number;
  compliance_issues: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recent_orders: Order[];
  alerts: Alert[];
}

export interface CanApproveResponse {
  can_approve: boolean;
  is_scm_override: boolean;
  is_exports_override: boolean;
  reason?: string | null;
  current_sequence?: number | null;
  pending_department?: string | null;
  waiting_for?: Record<string, any> | null; // Assuming a generic object for now
}

export interface BulkTargetDateItem {
  milestone_id: number;
  target_date?: string | null;
}

export interface MilestoneHistoryResponse {
  id: number;
  milestone_id: number;
  change_type: string;
  old_value?: string | null;
  new_value?: string | null;
  changed_by?: User | null;
  changed_at: string;
}

export interface ProductSearchItem {
  sku_code: string;
  product_name: string;
}

export interface ProductSearchResponse {
  products: ProductSearchItem[];
}
