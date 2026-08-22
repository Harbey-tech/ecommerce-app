const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ecommerce',
  port: process.env.DB_PORT || 5432,
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'ecommerce-api' });
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC;');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Add a product
app.post('/api/products', async (req, res) => {
  const { name, category, price, stock } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4) RETURNING *;',
      [name, category, price, stock]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to insert product' });
  }
});

// Get cart items with product details
app.get('/api/cart', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cart.id, cart.product_id, cart.quantity, products.name, products.price, products.category 
      FROM cart 
      JOIN products ON cart.product_id = products.id 
      ORDER BY cart.id ASC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Add item to cart
app.post('/api/cart', async (req, res) => {
  const { product_id, quantity } = req.body;
  try {
    // Check if item already in cart
    const existing = await pool.query('SELECT * FROM cart WHERE product_id = $1;', [product_id]);
    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].quantity + (quantity || 1);
      const updateResult = await pool.query(
        'UPDATE cart SET quantity = $1 WHERE product_id = $2 RETURNING *;',
        [newQty, product_id]
      );
      return res.json(updateResult.rows[0]);
    }

    const result = await pool.query(
      'INSERT INTO cart (product_id, quantity) VALUES ($1, $2) RETURNING *;',
      [product_id, quantity || 1]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// Remove item from cart
app.delete('/api/cart/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM cart WHERE id = $1;', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
