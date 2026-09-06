CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(64) NOT NULL UNIQUE CHECK (code = upper(btrim(code)) AND length(code) > 0),
  name varchar(160) NOT NULL CHECK (length(btrim(name)) > 0),
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'SELLER', 'OPERATIONS')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE login_attempts (
  key char(64) PRIMARY KEY,
  attempts integer NOT NULL CHECK (attempts > 0),
  window_start timestamptz NOT NULL
);
CREATE INDEX login_attempts_window_idx ON login_attempts(window_start);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku varchar(80) NOT NULL UNIQUE CHECK (length(btrim(sku)) > 0),
  name varchar(200) NOT NULL CHECK (length(btrim(name)) > 0),
  description varchar(4000) NOT NULL DEFAULT '',
  category varchar(120) NOT NULL CHECK (length(btrim(category)) > 0),
  unit varchar(20) NOT NULL CHECK (length(btrim(unit)) > 0),
  price numeric(12,2) NOT NULL CHECK (price BETWEEN 0 AND 9999999.99),
  image_url text,
  physical_stock numeric(15,3) NOT NULL DEFAULT 0 CHECK (physical_stock BETWEEN 0 AND 1000000000),
  reserved_stock numeric(15,3) NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0 AND reserved_stock <= physical_stock),
  minimum_stock numeric(15,3) NOT NULL DEFAULT 0 CHECK (minimum_stock BETWEEN 0 AND 1000000000),
  quantity_step numeric(10,3) NOT NULL DEFAULT 1 CHECK (quantity_step BETWEEN 0.001 AND 1000000),
  active boolean NOT NULL DEFAULT true,
  sale_blocked boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_catalog_idx ON products(active, category, name, id);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name varchar(200) NOT NULL CHECK (length(btrim(company_name)) > 0),
  document varchar(32) NOT NULL DEFAULT '' CHECK (document ~ '^[0-9]*$'),
  address varchar(500) NOT NULL DEFAULT '',
  phone varchar(40) NOT NULL DEFAULT '',
  contact_name varchar(160) NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_document_unique ON customers(document) WHERE document <> '';
CREATE INDEX customers_name_idx ON customers(active, company_name, id);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  seller_id uuid NOT NULL REFERENCES users(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  seller_snapshot jsonb NOT NULL,
  customer_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  notes varchar(4000) NOT NULL DEFAULT '',
  discount_percent numeric(5,2) NOT NULL CHECK (discount_percent BETWEEN 0 AND 100),
  subtotal numeric(14,2) NOT NULL CHECK (subtotal BETWEEN 0 AND 999999999999.99),
  discount_value numeric(14,2) NOT NULL CHECK (discount_value BETWEEN 0 AND subtotal AND discount_value = round(subtotal * discount_percent / 100, 2)),
  total numeric(14,2) NOT NULL CHECK (total = subtotal - discount_value),
  idempotency_key varchar(128) NOT NULL,
  request_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, idempotency_key)
);
CREATE INDEX orders_created_idx ON orders(created_at DESC, id DESC);
CREATE INDEX orders_status_idx ON orders(status, created_at DESC, id DESC);
CREATE INDEX orders_customer_idx ON orders(customer_id, created_at DESC, id DESC);
CREATE INDEX orders_seller_idx ON orders(seller_id, created_at DESC, id DESC);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  product_id uuid NOT NULL REFERENCES products(id),
  position integer NOT NULL CHECK (position >= 0),
  product_snapshot jsonb NOT NULL,
  quantity numeric(10,3) NOT NULL CHECK (quantity BETWEEN 0.001 AND 1000000),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price BETWEEN 0 AND 9999999.99),
  line_total numeric(14,2) NOT NULL CHECK (line_total >= 0 AND line_total = round(quantity * unit_price, 2)),
  UNIQUE (order_id, product_id),
  UNIQUE (order_id, position)
);
CREATE INDEX order_items_product_idx ON order_items(product_id);

CREATE TABLE order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  from_status text CHECK (from_status IN ('PENDING', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  to_status text NOT NULL CHECK (to_status IN ('PENDING', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  actor_id uuid NOT NULL REFERENCES users(id),
  actor_name varchar(160) NOT NULL,
  reason varchar(1000) NOT NULL DEFAULT '',
  order_version integer NOT NULL CHECK (order_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, order_version)
);
CREATE INDEX order_events_actor_idx ON order_events(actor_id);

CREATE TABLE reservations (
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity numeric(10,3) NOT NULL CHECK (quantity BETWEEN 0.001 AND 1000000),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONSUMED', 'RELEASED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id, product_id) REFERENCES order_items(order_id, product_id)
);
CREATE INDEX reservations_product_idx ON reservations(product_id, status);

CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  order_id uuid REFERENCES orders(id),
  quantity numeric(15,3) NOT NULL CHECK (quantity <> 0),
  kind text NOT NULL CHECK (kind IN ('INITIAL', 'ADJUSTMENT', 'SHIPMENT')),
  reason varchar(1000) NOT NULL,
  actor_id uuid REFERENCES users(id),
  actor_name varchar(160) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_product_idx ON stock_movements(product_id, created_at DESC, id DESC);
CREATE INDEX stock_movements_order_idx ON stock_movements(order_id);
CREATE INDEX stock_movements_actor_idx ON stock_movements(actor_id);

CREATE TABLE price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  old_price numeric(12,2) CHECK (old_price BETWEEN 0 AND 9999999.99),
  new_price numeric(12,2) NOT NULL CHECK (new_price BETWEEN 0 AND 9999999.99),
  actor_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX price_history_product_idx ON price_history(product_id, created_at DESC);
CREATE INDEX price_history_actor_idx ON price_history(actor_id);

CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES users(id),
  action varchar(80) NOT NULL,
  entity_type varchar(40) NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX audit_log_actor_idx ON audit_log(actor_id, created_at DESC);
