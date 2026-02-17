-- Remove tutorial table (optional but clean)
DROP TABLE IF EXISTS Customers;

-- Leads table for Webflow form submissions
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  service TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);
