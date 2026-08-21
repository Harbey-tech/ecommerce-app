CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, category, price, stock) VALUES
('Cloud Native T-Shirt', 'Apparel', 25.99, 100),
('DevSecOps Handbook', 'Books', 39.99, 50),
('Kubernetes Coffee Mug', 'Accessories', 15.50, 200),
('Terraform Sticker Pack', 'Accessories', 5.00, 500)
ON CONFLICT DO NOTHING;
