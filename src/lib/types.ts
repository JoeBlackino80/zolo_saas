export type Company = {
  id: string;
  name: string;
  ico: string | null;
  dic: string | null;
  ic_dph: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
  is_vat_payer: boolean | null;
  business_type: string | null;
};

export type Contact = {
  id: string;
  company_id: string;
  type: string;
  name: string;
  ico: string | null;
  dic: string | null;
  ic_dph: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
};

export type Invoice = {
  id: string;
  company_id: string;
  type: string;
  number: string;
  variable_symbol: string | null;
  customer_name: string | null;
  customer_ico: string | null;
  customer_ic_dph: string | null;
  issue_date: string;
  due_date: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  paid_amount: number;
  status: string;
  notes: string | null;
};

export type InvoiceItem = {
  id?: string;
  invoice_id?: string;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  subtotal: number;
  vat_amount: number;
  total: number;
};

export type Product = {
  id: string;
  company_id: string;
  name: string;
  sku: string | null;
  unit: string;
  vat_rate: number;
  selling_price: number;
};
