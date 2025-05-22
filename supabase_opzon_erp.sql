-- Complete ERP Database Schema Export
-- Generated: 2025-05-19 15:26:49.038753+00
-- Includes all shared and private schemas

-- SCHEMAS --
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS graphql_public;
CREATE SCHEMA IF NOT EXISTS graphql;

-- TABLES --
-- Table: public.attendance
CREATE TABLE IF NOT EXISTS public.attendance (id integer DEFAULT nextval('attendance_id_seq'::regclass) NOT NULL, "employeeId" integer NOT NULL, date date NOT NULL, "timeIn" character varying, "timeOut" character varying, status character varying DEFAULT 'Present'::character varying NOT NULL, overtime numeric DEFAULT 0, notes text, "createdAt" timestamp with time zone DEFAULT now(), "updatedAt" timestamp with time zone DEFAULT now());

-- Table: public.client_order_items
CREATE TABLE IF NOT EXISTS public.client_order_items (id integer DEFAULT nextval('client_order_items_id_seq'::regclass) NOT NULL, order_id integer NOT NULL, product_id integer, product_name character varying NOT NULL, quantity integer DEFAULT 1 NOT NULL, unit_price numeric(10,2) DEFAULT 0 NOT NULL, total_price numeric(10,2) DEFAULT 0 NOT NULL, serial_start character varying, serial_end character varying, created_at timestamp with time zone DEFAULT now());

-- Table: public.client_orders
CREATE TABLE IF NOT EXISTS public.client_orders (id integer DEFAULT nextval('client_orders_id_seq'::regclass) NOT NULL, order_id character varying NOT NULL, client_id integer NOT NULL, date date DEFAULT CURRENT_DATE NOT NULL, amount numeric(10,2) DEFAULT 0 NOT NULL, status character varying DEFAULT 'Approved'::character varying NOT NULL, notes text, request_id integer, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), paid_amount numeric(10,2) DEFAULT 0, remaining_amount numeric(10,2), payment_plan text);

-- Table: public.clients
CREATE TABLE IF NOT EXISTS public.clients (id integer DEFAULT nextval('clients_id_seq1'::regclass) NOT NULL, name character varying NOT NULL, "contactPerson" character varying NOT NULL, email character varying, phone character varying, status character varying DEFAULT 'Active'::character varying, address text, notes text, "businessType" character varying, industry character varying, "taxId" character varying, "clientSince" date, "alternatePhone" character varying, "billingAddressSame" boolean DEFAULT true, "billingAddress" text, "paymentTerms" character varying, "creditLimit" numeric, "taxExempt" boolean DEFAULT false, "specialRequirements" text, "createdAt" timestamp with time zone DEFAULT now(), "updatedAt" timestamp with time zone DEFAULT now(), custom_business_type text, custom_industry text, businesstype character varying);

-- Table: public.employees
CREATE TABLE IF NOT EXISTS public.employees (id integer DEFAULT nextval('employees_id_seq'::regclass) NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, email character varying, phone character varying, "position" character varying NOT NULL, department character varying, status character varying DEFAULT 'Active'::character varying, "hireDate" date, address text, "emergencyContact" character varying, "emergencyPhone" character varying, "employeeId" character varying, notes text, salary numeric, "bankDetails" text, "taxId" character varying, "birthDate" date, "createdAt" timestamp with time zone DEFAULT now(), "updatedAt" timestamp with time zone DEFAULT now());

-- Table: public.inventory
CREATE TABLE IF NOT EXISTS public.inventory (id integer DEFAULT nextval('inventory_id_seq'::regclass) NOT NULL, "itemName" character varying NOT NULL, sku character varying NOT NULL, "itemType" character varying NOT NULL, quantity integer DEFAULT 0 NOT NULL, "minStockLevel" integer DEFAULT 0 NOT NULL, "unitPrice" numeric(10,2) DEFAULT 0, "supplierId" integer, "createdAt" timestamp with time zone DEFAULT now(), "updatedAt" timestamp with time zone DEFAULT now());

-- Table: public.inventory_transactions
CREATE TABLE IF NOT EXISTS public.inventory_transactions (id integer DEFAULT nextval('inventory_transactions_id_seq'::regclass) NOT NULL, "inventoryId" integer NOT NULL, "transactionType" character varying NOT NULL, quantity integer NOT NULL, "createdBy" integer NOT NULL, "isSupplier" boolean NOT NULL, notes text, "transactionDate" timestamp with time zone DEFAULT now() NOT NULL, reason text, type text);

-- Table: public.machinery
CREATE TABLE IF NOT EXISTS public.machinery (id integer DEFAULT nextval('machinery_id_seq'::regclass) NOT NULL, name character varying NOT NULL, type character varying NOT NULL, model character varying NOT NULL, "serialNumber" character varying NOT NULL, manufacturer character varying, "purchaseDate" date, "purchasePrice" numeric, "lastMaintenanceDate" date, "nextMaintenanceDate" date, status character varying DEFAULT 'Operational'::character varying NOT NULL, location character varying, specifications text, notes text, "imageUrl" text, "imageUrls" ARRAY, "createdAt" timestamp with time zone DEFAULT now(), "updatedAt" timestamp with time zone DEFAULT now());

-- Table: public.machinery_status_history
CREATE TABLE IF NOT EXISTS public.machinery_status_history (id integer DEFAULT nextval('machinery_status_history_id_seq'::regclass) NOT NULL, "machineryId" integer NOT NULL, date date NOT NULL, "previousStatus" character varying NOT NULL, "newStatus" character varying NOT NULL, reason text NOT NULL, "changedBy" character varying NOT NULL, notes text, "imageUrls" ARRAY, "createdAt" timestamp with time zone DEFAULT now(), "updatedAt" timestamp with time zone DEFAULT now());

-- Table: public.maintenance_records
CREATE TABLE IF NOT EXISTS public.maintenance_records (id integer DEFAULT nextval('maintenance_records_id_seq'::regclass) NOT NULL, "machineryId" integer NOT NULL, date date NOT NULL, type character varying NOT NULL, description text NOT NULL, cost numeric DEFAULT 0 NOT NULL, "performedBy" character varying NOT NULL, notes text, "createdAt" timestamp with time zone DEFAULT now(), "updatedAt" timestamp with time zone DEFAULT now(), "imageUrls" ARRAY, is_completed boolean DEFAULT false);

-- Table: public.order_history
CREATE TABLE IF NOT EXISTS public.order_history (id integer DEFAULT nextval('order_history_id_seq'::regclass) NOT NULL, request_id integer, order_id integer, status character varying NOT NULL, notes text, changed_by character varying, created_at timestamp with time zone DEFAULT now() NOT NULL);

-- Table: public.order_payments
CREATE TABLE IF NOT EXISTS public.order_payments (id integer DEFAULT nextval('order_payments_id_seq'::regclass) NOT NULL, order_id integer NOT NULL, amount numeric(10,2) DEFAULT 0 NOT NULL, payment_date date DEFAULT CURRENT_DATE NOT NULL, payment_method character varying, notes text, created_at timestamp with time zone DEFAULT now());

-- Table: public.order_request_items
CREATE TABLE IF NOT EXISTS public.order_request_items (id integer DEFAULT nextval('order_request_items_id_seq'::regclass) NOT NULL, request_id integer NOT NULL, product_id integer, product_name character varying NOT NULL, quantity integer DEFAULT 1 NOT NULL, unit_price numeric(10,2) DEFAULT 0 NOT NULL, total_price numeric(10,2) DEFAULT 0 NOT NULL, serial_start character varying, serial_end character varying, created_at timestamp with time zone DEFAULT now());

-- Table: public.order_requests
CREATE TABLE IF NOT EXISTS public.order_requests (id integer DEFAULT nextval('order_requests_id_seq'::regclass) NOT NULL, request_id character varying NOT NULL, client_id integer NOT NULL, date date DEFAULT CURRENT_DATE NOT NULL, type character varying NOT NULL, status character varying DEFAULT 'Pending'::character varying NOT NULL, total_amount numeric(10,2) DEFAULT 0 NOT NULL, notes text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now());

-- Table: public.payroll
CREATE TABLE IF NOT EXISTS public.payroll (id integer DEFAULT nextval('payroll_id_seq'::regclass) NOT NULL, "employeeId" integer NOT NULL, period character varying NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "baseSalary" numeric DEFAULT 0 NOT NULL, "overtimePay" numeric DEFAULT 0 NOT NULL, bonus numeric DEFAULT 0 NOT NULL, deductions numeric DEFAULT 0 NOT NULL, "taxWithholding" numeric DEFAULT 0 NOT NULL, "netSalary" numeric DEFAULT 0 NOT NULL, status character varying DEFAULT 'Draft'::character varying NOT NULL, notes text, "bankTransferRef" character varying, "paymentDate" date, "createdAt" timestamp with time zone DEFAULT now(), "updatedAt" timestamp with time zone DEFAULT now(), "paymentCycle" character varying DEFAULT '30'::character varying);

-- Table: public.product_materials
CREATE TABLE IF NOT EXISTS public.product_materials (id integer DEFAULT nextval('product_materials_id_seq'::regclass) NOT NULL, "productId" integer NOT NULL, "materialId" integer NOT NULL, "quantityRequired" numeric(10,2) DEFAULT 1 NOT NULL, "createdAt" timestamp with time zone DEFAULT now(), "updatedAt" timestamp with time zone DEFAULT now(), unit_type text DEFAULT 'piece'::text, other_type text);

-- Table: public.products
CREATE TABLE IF NOT EXISTS public.products (id integer DEFAULT nextval('products_id_seq'::regclass) NOT NULL, name character varying NOT NULL, price numeric(10,2) DEFAULT 0 NOT NULL, description text, "createdAt" timestamp with time zone DEFAULT now(), "updatedAt" timestamp with time zone DEFAULT now(), "imageUrl" text, "imageUrls" json);

-- Table: public.quotation_items
CREATE TABLE IF NOT EXISTS public.quotation_items (id integer DEFAULT nextval('quotation_items_id_seq'::regclass) NOT NULL, request_id integer NOT NULL, inventory_id integer NOT NULL, inventory_name text NOT NULL, quantity integer NOT NULL, expected_price numeric(12,2), notes text, created_at timestamp with time zone DEFAULT now());

-- Table: public.quotation_requests
CREATE TABLE IF NOT EXISTS public.quotation_requests (id integer DEFAULT nextval('quotation_requests_id_seq'::regclass) NOT NULL, request_id text NOT NULL, supplier_id integer NOT NULL, date date NOT NULL, status text NOT NULL, notes text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now());

-- Table: public.supplier_order_items
CREATE TABLE IF NOT EXISTS public.supplier_order_items (id integer DEFAULT nextval('supplier_order_items_id_seq'::regclass) NOT NULL, order_id integer NOT NULL, inventory_id integer NOT NULL, inventory_name text NOT NULL, quantity integer NOT NULL, unit_price numeric(12,2) NOT NULL, total_price numeric(12,2) NOT NULL, expected_delivery_date date, created_at timestamp with time zone DEFAULT now());

-- Table: public.supplier_orders
CREATE TABLE IF NOT EXISTS public.supplier_orders (id integer DEFAULT nextval('supplier_orders_id_seq'::regclass) NOT NULL, order_id text NOT NULL, supplier_id integer NOT NULL, date date NOT NULL, status text NOT NULL, total_amount numeric(12,2) NOT NULL, paid_amount numeric(12,2) DEFAULT 0, remaining_amount numeric(12,2), payment_plan text, notes text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now());

-- Table: public.supplier_payment_records
CREATE TABLE IF NOT EXISTS public.supplier_payment_records (id integer DEFAULT nextval('supplier_payment_records_id_seq'::regclass) NOT NULL, order_id integer NOT NULL, amount numeric(10,2) NOT NULL, payment_date date NOT NULL, payment_method character varying NOT NULL, notes text, created_at timestamp with time zone DEFAULT now());

-- Table: public.supplier_purchase_items
CREATE TABLE IF NOT EXISTS public.supplier_purchase_items (id integer DEFAULT nextval('supplier_purchase_items_id_seq'::regclass) NOT NULL, order_id integer NOT NULL, inventory_id integer NOT NULL, inventory_name character varying NOT NULL, quantity integer DEFAULT 1 NOT NULL, unit_price numeric(10,2) DEFAULT 0 NOT NULL, total_price numeric(10,2) DEFAULT 0 NOT NULL, expected_delivery_date date, created_at timestamp with time zone DEFAULT now(), item_type text DEFAULT 'piece'::text);

-- Table: public.supplier_purchase_orders
CREATE TABLE IF NOT EXISTS public.supplier_purchase_orders (id integer DEFAULT nextval('supplier_purchase_orders_id_seq'::regclass) NOT NULL, order_id character varying NOT NULL, supplier_id integer NOT NULL, date date DEFAULT CURRENT_DATE NOT NULL, status character varying DEFAULT 'Pending'::character varying NOT NULL, total_amount numeric(10,2) DEFAULT 0 NOT NULL, paid_amount numeric(10,2) DEFAULT 0, remaining_amount numeric(10,2) DEFAULT 0, payment_plan text, notes text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now());

-- Table: public.supplier_quotation_items
CREATE TABLE IF NOT EXISTS public.supplier_quotation_items (id integer DEFAULT nextval('supplier_quotation_items_id_seq'::regclass) NOT NULL, request_id integer NOT NULL, inventory_id integer NOT NULL, inventory_name character varying NOT NULL, quantity integer DEFAULT 1 NOT NULL, expected_price numeric(10,2), notes text, created_at timestamp with time zone DEFAULT now());

-- Table: public.supplier_quotation_requests
CREATE TABLE IF NOT EXISTS public.supplier_quotation_requests (id integer DEFAULT nextval('supplier_quotation_requests_id_seq'::regclass) NOT NULL, request_id character varying NOT NULL, supplier_id integer NOT NULL, date date DEFAULT CURRENT_DATE NOT NULL, status character varying DEFAULT 'Draft'::character varying NOT NULL, notes text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now());

-- Table: public.suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (id integer DEFAULT nextval('suppliers_id_seq'::regclass) NOT NULL, name character varying NOT NULL, "contactPerson" character varying NOT NULL, email character varying, phone character varying, status character varying DEFAULT 'Active'::character varying, address text, notes text, "businessType" character varying, industry character varying, "taxId" character varying, relationship_since date, "alternatePhone" character varying, "billingAddressSame" boolean DEFAULT true, "billingAddress" text, "paymentTerms" character varying, "leadTime" integer DEFAULT 7, "productCategories" text, "taxExempt" boolean DEFAULT false, "createdAt" timestamp with time zone DEFAULT now(), "updatedAt" timestamp with time zone DEFAULT now(), custom_business_type text, custom_industry text, businesstype character varying);

-- Table: public.technician_machinery
CREATE TABLE IF NOT EXISTS public.technician_machinery (id bigint DEFAULT nextval('technician_machinery_id_seq'::regclass) NOT NULL, technician_id bigint, machinery_id bigint, assigned_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP, notes text, created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP, updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP);

-- Table: public.technicians
CREATE TABLE IF NOT EXISTS public.technicians (id bigint DEFAULT nextval('technicians_id_seq'::regclass) NOT NULL, first_name text NOT NULL, last_name text NOT NULL, email text NOT NULL, phone text NOT NULL, experience integer DEFAULT 0 NOT NULL, bio text, join_date date DEFAULT CURRENT_DATE NOT NULL, status text DEFAULT 'Active'::text NOT NULL, assigned_machinery ARRAY DEFAULT '{}'::integer[], type text DEFAULT 'Company'::text NOT NULL, company text, created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP, updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP);

-- Table: realtime.messages
CREATE TABLE IF NOT EXISTS realtime.messages (topic text NOT NULL, extension text NOT NULL, payload jsonb, event text, private boolean DEFAULT false, updated_at timestamp without time zone DEFAULT now() NOT NULL, inserted_at timestamp without time zone DEFAULT now() NOT NULL, id uuid DEFAULT gen_random_uuid() NOT NULL);

-- Table: realtime.schema_migrations
CREATE TABLE IF NOT EXISTS realtime.schema_migrations (version bigint NOT NULL, inserted_at timestamp without time zone);

-- Table: realtime.subscription
CREATE TABLE IF NOT EXISTS realtime.subscription (id bigint NOT NULL, subscription_id uuid NOT NULL, entity regclass NOT NULL, filters ARRAY DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL, claims jsonb NOT NULL, claims_role regrole NOT NULL, created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL);

-- Table: vault.decrypted_secrets
CREATE TABLE IF NOT EXISTS vault.decrypted_secrets (id uuid, name text, description text, secret text, decrypted_secret text, key_id uuid, nonce bytea, created_at timestamp with time zone, updated_at timestamp with time zone);

-- Table: vault.secrets
CREATE TABLE IF NOT EXISTS vault.secrets (id uuid DEFAULT gen_random_uuid() NOT NULL, name text, description text DEFAULT ''::text NOT NULL, secret text NOT NULL, key_id uuid DEFAULT (pgsodium.create_key()).id, nonce bytea DEFAULT pgsodium.crypto_aead_det_noncegen(), created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL);

-- PRIMARY KEYS --
ALTER TABLE public.attendance ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);
ALTER TABLE public.client_order_items ADD CONSTRAINT client_order_items_pkey PRIMARY KEY (id);
ALTER TABLE public.client_orders ADD CONSTRAINT client_orders_pkey PRIMARY KEY (id);
ALTER TABLE public.clients ADD CONSTRAINT clients_pkey PRIMARY KEY (id);
ALTER TABLE public.employees ADD CONSTRAINT employees_pkey PRIMARY KEY (id);
ALTER TABLE public.inventory ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);
ALTER TABLE public.machinery ADD CONSTRAINT machinery_pkey PRIMARY KEY (id);
ALTER TABLE public.machinery_status_history ADD CONSTRAINT machinery_status_history_pkey PRIMARY KEY (id);
ALTER TABLE public.maintenance_records ADD CONSTRAINT maintenance_records_pkey PRIMARY KEY (id);
ALTER TABLE public.order_history ADD CONSTRAINT order_history_pkey PRIMARY KEY (id);
ALTER TABLE public.order_payments ADD CONSTRAINT order_payments_pkey PRIMARY KEY (id);
ALTER TABLE public.order_request_items ADD CONSTRAINT order_request_items_pkey PRIMARY KEY (id);
ALTER TABLE public.order_requests ADD CONSTRAINT order_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.payroll ADD CONSTRAINT payroll_pkey PRIMARY KEY (id);
ALTER TABLE public.product_materials ADD CONSTRAINT product_materials_pkey PRIMARY KEY (id);
ALTER TABLE public.products ADD CONSTRAINT products_pkey PRIMARY KEY (id);
ALTER TABLE public.quotation_items ADD CONSTRAINT quotation_items_pkey PRIMARY KEY (id);
ALTER TABLE public.quotation_requests ADD CONSTRAINT quotation_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.supplier_order_items ADD CONSTRAINT supplier_order_items_pkey PRIMARY KEY (id);
ALTER TABLE public.supplier_orders ADD CONSTRAINT supplier_orders_pkey PRIMARY KEY (id);
ALTER TABLE public.supplier_payment_records ADD CONSTRAINT supplier_payment_records_pkey PRIMARY KEY (id);
ALTER TABLE public.supplier_purchase_items ADD CONSTRAINT supplier_purchase_items_pkey PRIMARY KEY (id);
ALTER TABLE public.supplier_purchase_orders ADD CONSTRAINT supplier_purchase_orders_pkey PRIMARY KEY (id);
ALTER TABLE public.supplier_quotation_items ADD CONSTRAINT supplier_quotation_items_pkey PRIMARY KEY (id);
ALTER TABLE public.supplier_quotation_requests ADD CONSTRAINT supplier_quotation_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);
ALTER TABLE public.technician_machinery ADD CONSTRAINT technician_machinery_pkey PRIMARY KEY (id);
ALTER TABLE public.technicians ADD CONSTRAINT technicians_pkey PRIMARY KEY (id);
ALTER TABLE realtime.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);
ALTER TABLE realtime.schema_migrations ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);
ALTER TABLE realtime.subscription ADD CONSTRAINT pk_subscription PRIMARY KEY (id);
ALTER TABLE vault.secrets ADD CONSTRAINT secrets_pkey PRIMARY KEY (id);

-- FOREIGN KEYS --
ALTER TABLE public.attendance ADD CONSTRAINT "attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees (id);
ALTER TABLE public.client_order_items ADD CONSTRAINT client_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.client_orders (id);
ALTER TABLE public.client_orders ADD CONSTRAINT client_orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients (id);
ALTER TABLE public.client_orders ADD CONSTRAINT client_orders_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.order_requests (id);
ALTER TABLE public.inventory ADD CONSTRAINT "inventory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.suppliers (id);
ALTER TABLE public.inventory_transactions ADD CONSTRAINT "inventory_transactions_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES public.inventory (id);
ALTER TABLE public.machinery_status_history ADD CONSTRAINT "machinery_status_history_machineryId_fkey" FOREIGN KEY ("machineryId") REFERENCES public.machinery (id);
ALTER TABLE public.maintenance_records ADD CONSTRAINT "maintenance_records_machineryId_fkey" FOREIGN KEY ("machineryId") REFERENCES public.machinery (id);
ALTER TABLE public.order_history ADD CONSTRAINT order_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.client_orders (id);
ALTER TABLE public.order_history ADD CONSTRAINT order_history_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.order_requests (id);
ALTER TABLE public.order_payments ADD CONSTRAINT order_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.client_orders (id);
ALTER TABLE public.order_request_items ADD CONSTRAINT order_request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.order_requests (id);
ALTER TABLE public.order_requests ADD CONSTRAINT order_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients (id);
ALTER TABLE public.payroll ADD CONSTRAINT "payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees (id);
ALTER TABLE public.product_materials ADD CONSTRAINT "product_materials_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES public.inventory (id);
ALTER TABLE public.product_materials ADD CONSTRAINT "product_materials_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products (id);
ALTER TABLE public.quotation_items ADD CONSTRAINT quotation_items_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory (id);
ALTER TABLE public.quotation_items ADD CONSTRAINT quotation_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.quotation_requests (id);
ALTER TABLE public.quotation_requests ADD CONSTRAINT quotation_requests_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers (id);
ALTER TABLE public.supplier_order_items ADD CONSTRAINT supplier_order_items_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory (id);
ALTER TABLE public.supplier_order_items ADD CONSTRAINT supplier_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.supplier_orders (id);
ALTER TABLE public.supplier_orders ADD CONSTRAINT supplier_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers (id);
ALTER TABLE public.supplier_payment_records ADD CONSTRAINT supplier_payment_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.supplier_purchase_orders (id);
ALTER TABLE public.supplier_purchase_items ADD CONSTRAINT supplier_purchase_items_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory (id);
ALTER TABLE public.supplier_purchase_items ADD CONSTRAINT supplier_purchase_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.supplier_purchase_orders (id);
ALTER TABLE public.supplier_purchase_orders ADD CONSTRAINT supplier_purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers (id);
ALTER TABLE public.supplier_quotation_items ADD CONSTRAINT supplier_quotation_items_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory (id);
ALTER TABLE public.supplier_quotation_items ADD CONSTRAINT supplier_quotation_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.supplier_quotation_requests (id);
ALTER TABLE public.supplier_quotation_requests ADD CONSTRAINT supplier_quotation_requests_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers (id);
ALTER TABLE public.technician_machinery ADD CONSTRAINT technician_machinery_machinery_id_fkey FOREIGN KEY (machinery_id) REFERENCES public.machinery (id);
ALTER TABLE public.technician_machinery ADD CONSTRAINT technician_machinery_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.technicians (id);

-- UNIQUE CONSTRAINTS --
ALTER TABLE public.client_orders ADD CONSTRAINT client_orders_order_id_key UNIQUE (order_id);
ALTER TABLE public.inventory ADD CONSTRAINT inventory_sku_key UNIQUE (sku);
ALTER TABLE public.order_requests ADD CONSTRAINT order_requests_request_id_key UNIQUE (request_id);
ALTER TABLE public.supplier_purchase_orders ADD CONSTRAINT supplier_purchase_orders_order_id_key UNIQUE (order_id);
ALTER TABLE public.supplier_quotation_requests ADD CONSTRAINT supplier_quotation_requests_request_id_key UNIQUE (request_id);
ALTER TABLE public.technician_machinery ADD CONSTRAINT technician_machinery_technician_id_machinery_id_key UNIQUE (technician_id, machinery_id);
ALTER TABLE public.technicians ADD CONSTRAINT technicians_email_key UNIQUE (email);

-- INDEXES --
CREATE UNIQUE INDEX secrets_name_idx ON vault.secrets USING btree (name) WHERE (name IS NOT NULL);
CREATE INDEX idx_inventory_name ON public.inventory USING btree ("itemName");
CREATE INDEX idx_inventory_sku ON public.inventory USING btree (sku);
CREATE INDEX idx_inventory_type ON public.inventory USING btree ("itemType");
CREATE INDEX idx_inventory_supplier ON public.inventory USING btree ("supplierId");
CREATE INDEX idx_inventory_transactions_inventory ON public.inventory_transactions USING btree ("inventoryId");
CREATE INDEX idx_inventory_transactions_created_by ON public.inventory_transactions USING btree ("createdBy");
CREATE INDEX idx_inventory_transactions_type ON public.inventory_transactions USING btree ("transactionType");
CREATE INDEX idx_inventory_transactions_date ON public.inventory_transactions USING btree ("transactionDate");
CREATE INDEX idx_order_requests_client ON public.order_requests USING btree (client_id);
CREATE INDEX idx_order_requests_status ON public.order_requests USING btree (status);
CREATE INDEX idx_order_requests_date ON public.order_requests USING btree (date);
CREATE INDEX idx_order_request_items_request ON public.order_request_items USING btree (request_id);
CREATE INDEX idx_client_orders_client ON public.client_orders USING btree (client_id);
CREATE INDEX idx_client_orders_status ON public.client_orders USING btree (status);
CREATE INDEX idx_client_orders_date ON public.client_orders USING btree (date);
CREATE INDEX idx_client_orders_request ON public.client_orders USING btree (request_id);
CREATE INDEX idx_client_order_items_order ON public.client_order_items USING btree (order_id);
CREATE INDEX idx_technicians_type ON public.technicians USING btree (type);
CREATE INDEX idx_technicians_status ON public.technicians USING btree (status);
CREATE INDEX idx_technician_machinery_technician_id ON public.technician_machinery USING btree (technician_id);
CREATE INDEX idx_technician_machinery_machinery_id ON public.technician_machinery USING btree (machinery_id);
CREATE INDEX idx_order_history_request ON public.order_history USING btree (request_id);
CREATE INDEX idx_order_history_order ON public.order_history USING btree (order_id);
CREATE INDEX idx_order_history_created ON public.order_history USING btree (created_at);
CREATE INDEX idx_attendance_employee_date ON public.attendance USING btree ("employeeId", date);
CREATE INDEX idx_products_name ON public.products USING btree (name);
CREATE INDEX idx_product_materials_product ON public.product_materials USING btree ("productId");
CREATE INDEX idx_product_materials_material ON public.product_materials USING btree ("materialId");
CREATE INDEX idx_status_history_machinery_id ON public.machinery_status_history USING btree ("machineryId");
CREATE INDEX idx_order_payments_order ON public.order_payments USING btree (order_id);
CREATE INDEX idx_supplier_purchase_orders_supplier ON public.supplier_purchase_orders USING btree (supplier_id);
CREATE INDEX idx_supplier_purchase_orders_status ON public.supplier_purchase_orders USING btree (status);
CREATE INDEX idx_supplier_purchase_orders_date ON public.supplier_purchase_orders USING btree (date);
CREATE INDEX idx_supplier_purchase_items_order ON public.supplier_purchase_items USING btree (order_id);
CREATE INDEX idx_supplier_purchase_items_inventory ON public.supplier_purchase_items USING btree (inventory_id);
CREATE INDEX idx_supplier_quotation_requests_supplier ON public.supplier_quotation_requests USING btree (supplier_id);
CREATE INDEX idx_supplier_quotation_requests_status ON public.supplier_quotation_requests USING btree (status);
CREATE INDEX idx_supplier_quotation_items_request ON public.supplier_quotation_items USING btree (request_id);
CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);
CREATE INDEX idx_supplier_quotation_items_inventory ON public.supplier_quotation_items USING btree (inventory_id);
CREATE INDEX idx_supplier_payment_records_order ON public.supplier_payment_records USING btree (order_id);
CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);
CREATE INDEX idx_maintenance_records_machinery_id ON public.maintenance_records USING btree ("machineryId");