-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create cart table
CREATE TABLE IF NOT EXISTS cart (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial products if table is empty
INSERT INTO products (name, category, price, stock) 
SELECT 'Cloud Native T-Shirt', 'Apparel', 25.99, 100
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Cloud Native T-Shirt');

INSERT INTO products (name, category, price, stock) 
SELECT 'DevSecOps Handbook', 'Books', 39.99, 50
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'DevSecOps Handbook');

INSERT INTO products (name, category, price, stock) 
SELECT 'Kubernetes Coffee Mug', 'Accessories', 15.50, 200
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Kubernetes Coffee Mug');

INSERT INTO products (name, category, price, stock) 
SELECT 'Terraform Sticker Pack', 'Accessories', 5.00, 500
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Terraform Sticker Pack');
