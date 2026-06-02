-- =============================================================================
-- Pawly ERP — Migración inicial
-- Multi-tenant SaaS para tiendas de alimentos para mascotas
-- =============================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'vendedor');

CREATE TYPE movement_type AS ENUM ('entrada', 'salida', 'ajuste');

CREATE TYPE cash_movement_type AS ENUM ('apertura', 'ingreso', 'egreso', 'cierre');

CREATE TYPE sale_status AS ENUM ('pendiente', 'completada', 'anulada');

CREATE TYPE payment_method AS ENUM ('efectivo', 'debito', 'credito', 'transferencia', 'otro');

CREATE TYPE stock_alert_level AS ENUM ('bajo', 'critico', 'agotado');

CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- =============================================================================
-- TABLA: tenants
-- Cada tenant es una tienda independiente
-- =============================================================================

CREATE TABLE tenants (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        text NOT NULL,
    slug        text NOT NULL UNIQUE,
    email       text NOT NULL,
    phone       text,
    address     text,
    logo_url    text,
    settings    jsonb NOT NULL DEFAULT '{}',
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- TABLA: users
-- Usuarios vinculados a Supabase Auth y a un tenant
-- =============================================================================

CREATE TABLE users (
    id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email       text NOT NULL,
    full_name   text NOT NULL,
    role        user_role NOT NULL DEFAULT 'vendedor',
    avatar_url  text,
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, email);

-- =============================================================================
-- TABLA: customers
-- Clientes del tenant
-- =============================================================================

CREATE TABLE customers (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name   text NOT NULL,
    email       text,
    phone       text,
    rut         text,
    address     text,
    notes       text,
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_tenant_name ON customers(tenant_id, full_name);

-- =============================================================================
-- TABLA: suppliers
-- Proveedores del tenant
-- =============================================================================

CREATE TABLE suppliers (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          text NOT NULL,
    contact_name  text,
    email         text,
    phone         text,
    rut           text,
    address       text,
    notes         text,
    active        boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_tenant_id ON suppliers(tenant_id);

-- =============================================================================
-- TABLA: products
-- Catálogo de productos del tenant
-- =============================================================================

CREATE TABLE products (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id         uuid REFERENCES suppliers(id) ON DELETE SET NULL,
    sku                 text,
    name                text NOT NULL,
    description         text,
    brand               text,
    category            text,
    unit                text NOT NULL DEFAULT 'unidad',
    cost_price          numeric(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    sale_price          numeric(12, 2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    margin_pct          numeric(6, 2) GENERATED ALWAYS AS (
                            CASE WHEN cost_price > 0
                                 THEN ROUND(((sale_price - cost_price) / cost_price) * 100, 2)
                                 ELSE 0
                            END
                        ) STORED,
    profit_per_unit     numeric(12, 2) GENERATED ALWAYS AS (
                            ROUND(sale_price - cost_price, 2)
                        ) STORED,
    stock_quantity      integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    stock_min           integer NOT NULL DEFAULT 5 CHECK (stock_min >= 0),
    stock_max           integer CHECK (stock_max IS NULL OR stock_max >= stock_min),
    image_url           text,
    barcode             text,
    active              boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_products_tenant_active ON products(tenant_id, active);
CREATE INDEX idx_products_tenant_category ON products(tenant_id, category);
CREATE UNIQUE INDEX idx_products_tenant_sku ON products(tenant_id, sku) WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX idx_products_tenant_barcode ON products(tenant_id, barcode) WHERE barcode IS NOT NULL;

-- =============================================================================
-- TABLA: inventory_movements
-- Movimientos de inventario (entradas, salidas, ajustes)
-- =============================================================================

CREATE TABLE inventory_movements (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id      uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    supplier_id     uuid REFERENCES suppliers(id) ON DELETE SET NULL,
    type            movement_type NOT NULL,
    quantity        integer NOT NULL CHECK (quantity != 0),
    cost_price      numeric(12, 2) CHECK (cost_price >= 0),
    stock_before    integer NOT NULL,
    stock_after     integer NOT NULL,
    reference       text,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_movements_tenant_id ON inventory_movements(tenant_id);
CREATE INDEX idx_inv_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_inv_movements_tenant_created ON inventory_movements(tenant_id, created_at DESC);

-- =============================================================================
-- TABLA: cash_registers
-- Sesiones de caja (apertura → cierre)
-- =============================================================================

CREATE TABLE cash_registers (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    opened_at           timestamptz NOT NULL DEFAULT now(),
    closed_at           timestamptz,
    opening_balance     numeric(12, 2) NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
    closing_balance     numeric(12, 2) CHECK (closing_balance >= 0),
    expected_balance    numeric(12, 2),
    difference          numeric(12, 2) GENERATED ALWAYS AS (
                            CASE WHEN closing_balance IS NOT NULL AND expected_balance IS NOT NULL
                                 THEN ROUND(closing_balance - expected_balance, 2)
                                 ELSE NULL
                            END
                        ) STORED,
    notes               text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT cash_registers_closed_has_balance
        CHECK (closed_at IS NULL OR closing_balance IS NOT NULL)
);

CREATE INDEX idx_cash_registers_tenant_id ON cash_registers(tenant_id);
CREATE INDEX idx_cash_registers_tenant_opened ON cash_registers(tenant_id, opened_at DESC);
-- Solo puede haber una caja abierta por tenant
CREATE UNIQUE INDEX idx_cash_registers_one_open
    ON cash_registers(tenant_id) WHERE closed_at IS NULL;

-- =============================================================================
-- TABLA: cash_movements
-- Ingresos y egresos dentro de una sesión de caja
-- =============================================================================

CREATE TABLE cash_movements (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cash_register_id    uuid NOT NULL REFERENCES cash_registers(id) ON DELETE RESTRICT,
    user_id             uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    type                cash_movement_type NOT NULL,
    amount              numeric(12, 2) NOT NULL CHECK (amount > 0),
    description         text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_movements_tenant_id ON cash_movements(tenant_id);
CREATE INDEX idx_cash_movements_register_id ON cash_movements(cash_register_id);

-- =============================================================================
-- TABLA: sales
-- Cabecera de cada venta
-- =============================================================================

CREATE TABLE sales (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    customer_id         uuid REFERENCES customers(id) ON DELETE SET NULL,
    cash_register_id    uuid REFERENCES cash_registers(id) ON DELETE RESTRICT,
    status              sale_status NOT NULL DEFAULT 'completada',
    payment_method      payment_method NOT NULL DEFAULT 'efectivo',
    subtotal            numeric(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_amount     numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_amount          numeric(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total               numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    total_cost          numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
    total_profit        numeric(12, 2) GENERATED ALWAYS AS (
                            ROUND(total - total_cost - discount_amount, 2)
                        ) STORED,
    margin_pct          numeric(6, 2) GENERATED ALWAYS AS (
                            CASE WHEN total_cost > 0
                                 THEN ROUND(((total - total_cost - discount_amount) / total_cost) * 100, 2)
                                 ELSE 0
                            END
                        ) STORED,
    notes               text,
    voided_at           timestamptz,
    voided_by           uuid REFERENCES users(id),
    void_reason         text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_tenant_id ON sales(tenant_id);
CREATE INDEX idx_sales_tenant_created ON sales(tenant_id, created_at DESC);
CREATE INDEX idx_sales_tenant_status ON sales(tenant_id, status);
CREATE INDEX idx_sales_customer_id ON sales(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_sales_cash_register_id ON sales(cash_register_id) WHERE cash_register_id IS NOT NULL;

-- =============================================================================
-- TABLA: sale_items
-- Líneas de cada venta
-- =============================================================================

CREATE TABLE sale_items (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sale_id         uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id      uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity        integer NOT NULL CHECK (quantity > 0),
    unit_price      numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
    unit_cost       numeric(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    discount_pct    numeric(5, 2) NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 100),
    line_total      numeric(12, 2) GENERATED ALWAYS AS (
                        ROUND(quantity * unit_price * (1 - discount_pct / 100), 2)
                    ) STORED,
    line_cost       numeric(12, 2) GENERATED ALWAYS AS (
                        ROUND(quantity * unit_cost, 2)
                    ) STORED,
    line_profit     numeric(12, 2) GENERATED ALWAYS AS (
                        ROUND(quantity * unit_price * (1 - discount_pct / 100) - quantity * unit_cost, 2)
                    ) STORED,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_items_tenant_id ON sale_items(tenant_id);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- =============================================================================
-- TABLA: stock_alerts
-- Alertas de stock bajo/crítico/agotado por producto
-- =============================================================================

CREATE TABLE stock_alerts (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    level           stock_alert_level NOT NULL,
    stock_current   integer NOT NULL,
    stock_min       integer NOT NULL,
    resolved        boolean NOT NULL DEFAULT false,
    resolved_at     timestamptz,
    resolved_by     uuid REFERENCES users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_alerts_tenant_id ON stock_alerts(tenant_id);
CREATE INDEX idx_stock_alerts_tenant_unresolved ON stock_alerts(tenant_id, resolved) WHERE resolved = false;
CREATE INDEX idx_stock_alerts_product_id ON stock_alerts(product_id);
-- Una sola alerta activa por producto
CREATE UNIQUE INDEX idx_stock_alerts_product_active
    ON stock_alerts(product_id) WHERE resolved = false;

-- =============================================================================
-- TABLA: audit_logs
-- Trazabilidad de cambios en tablas sensibles
-- =============================================================================

CREATE TABLE audit_logs (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
    table_name  text NOT NULL,
    record_id   uuid NOT NULL,
    action      audit_action NOT NULL,
    old_data    jsonb,
    new_data    jsonb,
    ip_address  inet,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);

-- =============================================================================
-- FUNCIÓN AUXILIAR: updated_at automático
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cash_registers_updated_at
    BEFORE UPDATE ON cash_registers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_stock_alerts_updated_at
    BEFORE UPDATE ON stock_alerts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TRIGGER: Actualizar stock al registrar un movimiento de inventario
-- =============================================================================

CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_stock_before integer;
    v_stock_after  integer;
BEGIN
    SELECT stock_quantity INTO v_stock_before
    FROM products
    WHERE id = NEW.product_id
    FOR UPDATE;

    IF NEW.type = 'entrada' THEN
        v_stock_after := v_stock_before + ABS(NEW.quantity);
    ELSIF NEW.type = 'salida' THEN
        v_stock_after := v_stock_before - ABS(NEW.quantity);
        IF v_stock_after < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto %', NEW.product_id;
        END IF;
    ELSIF NEW.type = 'ajuste' THEN
        -- quantity puede ser positivo o negativo en ajustes
        v_stock_after := v_stock_before + NEW.quantity;
        IF v_stock_after < 0 THEN
            RAISE EXCEPTION 'Ajuste resultaría en stock negativo para el producto %', NEW.product_id;
        END IF;
    END IF;

    UPDATE products
    SET stock_quantity = v_stock_after, updated_at = now()
    WHERE id = NEW.product_id;

    NEW.stock_before := v_stock_before;
    NEW.stock_after  := v_stock_after;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_inventory_movement
    BEFORE INSERT ON inventory_movements
    FOR EACH ROW EXECUTE FUNCTION apply_inventory_movement();

-- =============================================================================
-- TRIGGER: Evaluar alerta de stock después de cada cambio de stock_quantity
-- =============================================================================

CREATE OR REPLACE FUNCTION evaluate_stock_alert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_level   stock_alert_level;
    v_exists  boolean;
BEGIN
    -- Determinar nivel de alerta
    IF NEW.stock_quantity = 0 THEN
        v_level := 'agotado';
    ELSIF NEW.stock_quantity <= GREATEST(NEW.stock_min * 0.5, 1) THEN
        v_level := 'critico';
    ELSIF NEW.stock_quantity <= NEW.stock_min THEN
        v_level := 'bajo';
    ELSE
        -- Stock OK: resolver alerta activa si existe
        UPDATE stock_alerts
        SET resolved = true, resolved_at = now()
        WHERE product_id = NEW.id AND resolved = false;
        RETURN NEW;
    END IF;

    -- Upsert alerta activa
    SELECT EXISTS(
        SELECT 1 FROM stock_alerts
        WHERE product_id = NEW.id AND resolved = false
    ) INTO v_exists;

    IF v_exists THEN
        UPDATE stock_alerts
        SET level         = v_level,
            stock_current = NEW.stock_quantity,
            stock_min     = NEW.stock_min,
            updated_at    = now()
        WHERE product_id = NEW.id AND resolved = false;
    ELSE
        INSERT INTO stock_alerts (tenant_id, product_id, level, stock_current, stock_min)
        VALUES (NEW.tenant_id, NEW.id, v_level, NEW.stock_quantity, NEW.stock_min);
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evaluate_stock_alert
    AFTER UPDATE OF stock_quantity ON products
    FOR EACH ROW
    WHEN (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity)
    EXECUTE FUNCTION evaluate_stock_alert();

-- Evaluar al insertar producto también
CREATE TRIGGER trg_evaluate_stock_alert_insert
    AFTER INSERT ON products
    FOR EACH ROW EXECUTE FUNCTION evaluate_stock_alert();

-- =============================================================================
-- TRIGGER: Descontar stock y calcular totales al completar una venta
-- =============================================================================

CREATE OR REPLACE FUNCTION process_sale_items()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_item      record;
    v_subtotal  numeric(12,2) := 0;
    v_cost      numeric(12,2) := 0;
    v_user_id   uuid;
BEGIN
    -- Solo procesar ventas completadas
    IF NEW.status != 'completada' THEN
        RETURN NEW;
    END IF;
    -- Solo al insertar (no recalcular en updates que no cambian status)
    IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT user_id INTO v_user_id FROM sales WHERE id = NEW.id;

    FOR v_item IN
        SELECT si.product_id, si.quantity, si.unit_price,
               si.unit_cost, si.discount_pct,
               si.line_total, si.line_cost
        FROM sale_items si
        WHERE si.sale_id = NEW.id
    LOOP
        -- Registrar movimiento de inventario (salida por venta)
        INSERT INTO inventory_movements (
            tenant_id, product_id, user_id,
            type, quantity, cost_price,
            stock_before, stock_after, reference
        )
        VALUES (
            NEW.tenant_id, v_item.product_id, NEW.user_id,
            'salida', v_item.quantity, v_item.unit_cost,
            0, 0,  -- rellenados por trigger apply_inventory_movement
            'venta:' || NEW.id
        );

        v_subtotal := v_subtotal + v_item.line_total;
        v_cost     := v_cost + v_item.line_cost;
    END LOOP;

    -- Actualizar totales en la cabecera
    UPDATE sales
    SET subtotal   = v_subtotal,
        total      = v_subtotal - discount_amount + tax_amount,
        total_cost = v_cost,
        updated_at = now()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_process_sale_items
    AFTER INSERT ON sales
    FOR EACH ROW
    WHEN (NEW.status = 'completada')
    EXECUTE FUNCTION process_sale_items();

-- =============================================================================
-- TRIGGER: Revertir stock al anular una venta
-- =============================================================================

CREATE OR REPLACE FUNCTION revert_sale_stock()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_item record;
BEGIN
    IF OLD.status = 'completada' AND NEW.status = 'anulada' THEN
        FOR v_item IN
            SELECT product_id, quantity, unit_cost
            FROM sale_items
            WHERE sale_id = NEW.id
        LOOP
            INSERT INTO inventory_movements (
                tenant_id, product_id, user_id,
                type, quantity, cost_price,
                stock_before, stock_after, reference, notes
            )
            VALUES (
                NEW.tenant_id, v_item.product_id, NEW.voided_by,
                'entrada', v_item.quantity, v_item.unit_cost,
                0, 0,
                'anulacion:' || NEW.id,
                NEW.void_reason
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_revert_sale_stock
    AFTER UPDATE OF status ON sales
    FOR EACH ROW
    WHEN (OLD.status = 'completada' AND NEW.status = 'anulada')
    EXECUTE FUNCTION revert_sale_stock();

-- =============================================================================
-- TRIGGER: Recalcular expected_balance al cerrar caja
-- =============================================================================

CREATE OR REPLACE FUNCTION recalculate_expected_balance()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_inflows   numeric(12,2);
    v_outflows  numeric(12,2);
    v_sales_cash numeric(12,2);
BEGIN
    IF NEW.closed_at IS NOT NULL AND OLD.closed_at IS NULL THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_inflows
        FROM cash_movements
        WHERE cash_register_id = NEW.id AND type = 'ingreso';

        SELECT COALESCE(SUM(amount), 0) INTO v_outflows
        FROM cash_movements
        WHERE cash_register_id = NEW.id AND type = 'egreso';

        SELECT COALESCE(SUM(total), 0) INTO v_sales_cash
        FROM sales
        WHERE cash_register_id = NEW.id
          AND status = 'completada'
          AND payment_method = 'efectivo';

        NEW.expected_balance := NEW.opening_balance + v_inflows - v_outflows + v_sales_cash;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalculate_expected_balance
    BEFORE UPDATE OF closed_at ON cash_registers
    FOR EACH ROW EXECUTE FUNCTION recalculate_expected_balance();

-- =============================================================================
-- FUNCIÓN GENÉRICA DE AUDITORÍA
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_tenant_id uuid;
    v_user_id   uuid;
    v_old_data  jsonb;
    v_new_data  jsonb;
    v_action    audit_action;
BEGIN
    v_action := TG_OP::audit_action;

    IF TG_OP = 'DELETE' THEN
        v_tenant_id := OLD.tenant_id;
        v_old_data  := to_jsonb(OLD);
        v_new_data  := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_tenant_id := NEW.tenant_id;
        v_old_data  := NULL;
        v_new_data  := to_jsonb(NEW);
    ELSE
        v_tenant_id := NEW.tenant_id;
        v_old_data  := to_jsonb(OLD);
        v_new_data  := to_jsonb(NEW);
    END IF;

    -- Obtener user_id desde JWT claim
    BEGIN
        v_user_id := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
    EXCEPTION WHEN others THEN
        v_user_id := NULL;
    END;

    INSERT INTO audit_logs (tenant_id, user_id, table_name, record_id, action, old_data, new_data)
    VALUES (
        v_tenant_id,
        v_user_id,
        TG_TABLE_NAME,
        COALESCE((NEW.id)::uuid, (OLD.id)::uuid),
        v_action,
        v_old_data,
        v_new_data
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar auditoría en tablas sensibles
CREATE TRIGGER trg_audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION audit_row();

CREATE TRIGGER trg_audit_sales
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION audit_row();

CREATE TRIGGER trg_audit_cash_registers
    AFTER INSERT OR UPDATE OR DELETE ON cash_registers
    FOR EACH ROW EXECUTE FUNCTION audit_row();

CREATE TRIGGER trg_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_row();

-- =============================================================================
-- FUNCIÓN HELPER: obtener tenant_id del usuario autenticado
-- =============================================================================

CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT tenant_id FROM users WHERE id = auth.uid();
$$;

-- =============================================================================
-- ROW LEVEL SECURITY — Habilitar en todas las tablas
-- =============================================================================

ALTER TABLE tenants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS: tenants
-- Admin ve y edita solo su propio tenant; vendedor solo lectura
-- =============================================================================

CREATE POLICY tenants_select ON tenants
    FOR SELECT USING (id = auth_tenant_id());

CREATE POLICY tenants_update ON tenants
    FOR UPDATE USING (
        id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================================================
-- RLS: users
-- =============================================================================

CREATE POLICY users_select ON users
    FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY users_insert ON users
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY users_update ON users
    FOR UPDATE USING (
        tenant_id = auth_tenant_id()
        AND (
            id = auth.uid()  -- cualquier usuario puede editar su propio perfil
            OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        )
    );

CREATE POLICY users_delete ON users
    FOR DELETE USING (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        AND id != auth.uid()  -- no puede auto-eliminarse
    );

-- =============================================================================
-- RLS: customers
-- =============================================================================

CREATE POLICY customers_select ON customers
    FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY customers_insert ON customers
    FOR INSERT WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY customers_update ON customers
    FOR UPDATE USING (tenant_id = auth_tenant_id());

CREATE POLICY customers_delete ON customers
    FOR DELETE USING (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================================================
-- RLS: suppliers
-- =============================================================================

CREATE POLICY suppliers_select ON suppliers
    FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY suppliers_insert ON suppliers
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY suppliers_update ON suppliers
    FOR UPDATE USING (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY suppliers_delete ON suppliers
    FOR DELETE USING (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================================================
-- RLS: products
-- =============================================================================

CREATE POLICY products_select ON products
    FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY products_insert ON products
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY products_update ON products
    FOR UPDATE USING (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY products_delete ON products
    FOR DELETE USING (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================================================
-- RLS: inventory_movements
-- Admin: CRUD; Vendedor: INSERT + SELECT
-- =============================================================================

CREATE POLICY inv_movements_select ON inventory_movements
    FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY inv_movements_insert ON inventory_movements
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        AND user_id = auth.uid()
    );

CREATE POLICY inv_movements_delete ON inventory_movements
    FOR DELETE USING (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================================================
-- RLS: cash_registers
-- Admin: CRUD; Vendedor: SELECT + abrir/cerrar su propia caja
-- =============================================================================

CREATE POLICY cash_registers_select ON cash_registers
    FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY cash_registers_insert ON cash_registers
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        AND user_id = auth.uid()
    );

CREATE POLICY cash_registers_update ON cash_registers
    FOR UPDATE USING (
        tenant_id = auth_tenant_id()
        AND (
            user_id = auth.uid()
            OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        )
    );

CREATE POLICY cash_registers_delete ON cash_registers
    FOR DELETE USING (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================================================
-- RLS: cash_movements
-- =============================================================================

CREATE POLICY cash_movements_select ON cash_movements
    FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY cash_movements_insert ON cash_movements
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        AND user_id = auth.uid()
    );

CREATE POLICY cash_movements_delete ON cash_movements
    FOR DELETE USING (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================================================
-- RLS: sales
-- Admin: CRUD; Vendedor: INSERT propio + SELECT
-- =============================================================================

CREATE POLICY sales_select ON sales
    FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY sales_insert ON sales
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        AND user_id = auth.uid()
    );

CREATE POLICY sales_update ON sales
    FOR UPDATE USING (
        tenant_id = auth_tenant_id()
        AND (
            -- Vendedor solo puede anular su propia venta del día
            (
                user_id = auth.uid()
                AND status = 'completada'
                AND created_at >= current_date
            )
            OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        )
    );

-- =============================================================================
-- RLS: sale_items
-- =============================================================================

CREATE POLICY sale_items_select ON sale_items
    FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY sale_items_insert ON sale_items
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        AND EXISTS (
            SELECT 1 FROM sales
            WHERE id = sale_id AND user_id = auth.uid()
        )
    );

-- =============================================================================
-- RLS: stock_alerts
-- Todos leen; solo admin resuelve manualmente; triggers pueden escribir
-- =============================================================================

CREATE POLICY stock_alerts_select ON stock_alerts
    FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY stock_alerts_update ON stock_alerts
    FOR UPDATE USING (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================================================
-- RLS: audit_logs
-- Solo admins pueden leer; nadie puede insertar/actualizar/borrar manualmente
-- =============================================================================

CREATE POLICY audit_logs_select ON audit_logs
    FOR SELECT USING (
        tenant_id = auth_tenant_id()
        AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================================================
-- DATOS SEMILLA: permisos de service_role para triggers internos
-- Los triggers con SECURITY DEFINER evitan problemas de RLS en cascada
-- =============================================================================

-- Asegurar que la función auth_tenant_id es ejecutable por authenticated
GRANT EXECUTE ON FUNCTION auth_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION set_updated_at() TO authenticated;
