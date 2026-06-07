export function initMysqlSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      firm_id VARCHAR(64) NOT NULL,
      firm_name VARCHAR(255) NOT NULL,
      branch VARCHAR(255) DEFAULT 'ANA HESAP',
      role VARCHAR(32) DEFAULT 'admin',
      branch_id VARCHAR(64),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS branches (
      id VARCHAR(64) PRIMARY KEY,
      firm_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(32),
      login_code VARCHAR(64),
      password_hash VARCHAR(255),
      email VARCHAR(255),
      address TEXT,
      phone VARCHAR(64),
      active TINYINT(1) DEFAULT 1,
      menu_enabled TINYINT(1) DEFAULT 1,
      menu_title VARCHAR(255),
      menu_welcome TEXT,
      menu_accept_orders TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_branches_firm (firm_id),
      UNIQUE INDEX idx_branches_login_code (login_code),
      UNIQUE INDEX idx_branches_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS \`groups\` (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) PRIMARY KEY,
      barcode VARCHAR(64) NOT NULL,
      stock_code VARCHAR(64),
      name VARCHAR(255) NOT NULL,
      group_id VARCHAR(64),
      stock DOUBLE DEFAULT 0,
      critical_stock DOUBLE DEFAULT 5,
      vat DOUBLE DEFAULT 20,
      buy_price DOUBLE DEFAULT 0,
      price1 DOUBLE DEFAULT 0,
      price2 DOUBLE DEFAULT 0,
      unit VARCHAR(32) DEFAULT 'Adet',
      on_sale_page TINYINT(1) DEFAULT 1,
      active TINYINT(1) DEFAULT 1,
      image_path VARCHAR(512),
      branch_id VARCHAR(64),
      INDEX idx_products_barcode (barcode)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(64),
      address TEXT,
      note TEXT,
      credit_limit DOUBLE DEFAULT 0,
      debt DOUBLE DEFAULT 0,
      purchase_count INT DEFAULT 0,
      last_payment_date VARCHAR(32),
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS staff (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(64),
      role VARCHAR(64),
      active TINYINT(1) DEFAULT 1,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS firms (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(64),
      tax_no VARCHAR(64),
      balance DOUBLE DEFAULT 0,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS payment_methods (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      active TINYINT(1) DEFAULT 1,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS income_types (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS expense_types (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS income_entries (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      amount DOUBLE NOT NULL,
      type_id VARCHAR(64),
      date VARCHAR(32) NOT NULL,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS expense_entries (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      amount DOUBLE NOT NULL,
      type_id VARCHAR(64),
      date VARCHAR(32) NOT NULL,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS sales (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(64) NOT NULL,
      created_at VARCHAR(32) NOT NULL,
      payment_type VARCHAR(64) NOT NULL,
      customer_id VARCHAR(64),
      staff_name VARCHAR(255),
      note TEXT,
      discount DOUBLE DEFAULT 0,
      discount_type VARCHAR(16) DEFAULT 'TL',
      paid_amount DOUBLE DEFAULT 0,
      total DOUBLE NOT NULL,
      branch_id VARCHAR(64),
      INDEX idx_sales_created (created_at),
      INDEX idx_sales_customer (customer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS sale_items (
      id VARCHAR(64) PRIMARY KEY,
      sale_id VARCHAR(64) NOT NULL,
      product_id VARCHAR(64),
      name VARCHAR(255) NOT NULL,
      qty DOUBLE NOT NULL,
      price DOUBLE NOT NULL,
      discount DOUBLE DEFAULT 0,
      note TEXT,
      INDEX idx_sale_items_sale (sale_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS stock_counts (
      id VARCHAR(64) PRIMARY KEY,
      product_id VARCHAR(64) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      previous_stock DOUBLE NOT NULL,
      counted DOUBLE NOT NULL,
      difference DOUBLE NOT NULL,
      note TEXT,
      date VARCHAR(32) NOT NULL,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS purchase_invoices (
      id VARCHAR(64) PRIMARY KEY,
      invoice_no VARCHAR(64) NOT NULL,
      firm_id VARCHAR(64),
      firm_name VARCHAR(255),
      total DOUBLE NOT NULL,
      date VARCHAR(32) NOT NULL,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS refund_requests (
      id VARCHAR(64) PRIMARY KEY,
      product_name VARCHAR(255),
      reason TEXT,
      status VARCHAR(32) DEFAULT 'pending',
      date VARCHAR(32) NOT NULL,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      status VARCHAR(32) DEFAULT 'open',
      assignee VARCHAR(255),
      due_date VARCHAR(32),
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS notices (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      read_flag TINYINT(1) DEFAULT 0,
      date VARCHAR(32) NOT NULL,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS integrations (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      status VARCHAR(32) DEFAULT 'inactive',
      description TEXT,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS variants (
      id VARCHAR(64) PRIMARY KEY,
      product_id VARCHAR(64),
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(64),
      price DOUBLE DEFAULT 0,
      stock DOUBLE DEFAULT 0,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS sub_products (
      id VARCHAR(64) PRIMARY KEY,
      parent_product_id VARCHAR(64),
      name VARCHAR(255) NOT NULL,
      qty DOUBLE DEFAULT 1,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS e_invoices (
      id VARCHAR(64) PRIMARY KEY,
      direction VARCHAR(32) NOT NULL,
      invoice_no VARCHAR(64),
      customer_name VARCHAR(255),
      total DOUBLE DEFAULT 0,
      status VARCHAR(32) DEFAULT 'draft',
      date VARCHAR(32) NOT NULL,
      branch_id VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS firm_settings (
      firm_id VARCHAR(64) PRIMARY KEY,
      menu_slug VARCHAR(255) UNIQUE,
      menu_title VARCHAR(255),
      menu_welcome TEXT,
      menu_enabled TINYINT(1) DEFAULT 1,
      menu_social_instagram VARCHAR(512),
      menu_social_whatsapp VARCHAR(512),
      menu_social_tiktok VARCHAR(512),
      menu_default_lang VARCHAR(8) DEFAULT 'az'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS qr_orders (
      id VARCHAR(64) PRIMARY KEY,
      branch_id VARCHAR(64) NOT NULL,
      code VARCHAR(64) NOT NULL,
      status VARCHAR(32) DEFAULT 'pending',
      customer_name VARCHAR(255),
      customer_phone VARCHAR(64),
      table_no VARCHAR(64),
      note TEXT,
      total DOUBLE DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_qr_orders_branch (branch_id),
      INDEX idx_qr_orders_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS qr_order_items (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL,
      product_id VARCHAR(64),
      name VARCHAR(255) NOT NULL,
      qty DOUBLE NOT NULL,
      price DOUBLE NOT NULL,
      note TEXT,
      INDEX idx_qr_order_items_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}
