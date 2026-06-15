const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Tandaan: Palitan ito ng iyong totoong Live Secret Key sa iyong environment variables kapag tapos ka na mag-test
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_API_BASE = 'https://api.paymongo.com/v1';


/**
 * Nagmamapa ng UI string papunta sa opisyal na string type ng PayMongo API.
 */
function mapPaymentMethod(method) {
  const normalized = String(method || '').trim().toUpperCase();
  if (normalized === 'GCASH') return 'gcash';
  if (normalized === 'MAYA') return 'paymaya'; // 'paymaya' ang tinatanggap ng API, hindi 'maya'
  if (normalized === 'GOTYME' || normalized === 'BANK_TRANSFER' || normalized === 'BANK' || normalized === 'BDO' || normalized === 'BPI') {
    return 'qrph'; // Ginawang 'qrph' para gumana ang GoTyme at banking app qr scans
  }
  return null;
}

function createOrderId() {
  return `CV-${Math.floor(10000 + Math.random() * 90000)}-NEON`;
}

router.post('/checkout', async (req, res) => {
  const db = await getDb();
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Missing Idempotency-Key header.' });
  }

  const {
    full_name,
    contact_number,
    address,
    city,
    postal_code,
    payment_method,
    items,
    subtotal,
    shipping_fee,
    discount,
    total_amount
  } = req.body;

  if (!full_name || !contact_number || !address || !city || !postal_code || !payment_method) {
    return res.status(400).json({ error: 'Missing required checkout fields.' });
  }

  // 1. Suriin kung nagamit na ang Idempotency Key para iwas double-charge
  try {
    const cached = await db.get('SELECT * FROM idempotency_keys WHERE key = ?', idempotencyKey);
    if (cached) {
      return res.status(cached.response_status).json(JSON.parse(cached.response_body));
    }
  } catch (err) {
    console.error('[Payments] Error checking idempotency key:', err);
    return res.status(500).json({ error: 'Database error checking idempotency key.' });
  }

  const orderId = createOrderId();
  const paymentType = mapPaymentMethod(payment_method);
  const paymentStatus = payment_method === 'COD' ? 'COD' : 'PENDING_PAYMENT';

  if (payment_method !== 'COD' && !paymentType) {
    return res.status(400).json({ error: 'Unsupported payment method for PayMongo checkout.' });
  }

  let checkoutUrl = null;
  const base64Auth = Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString('base64');

  try {
    // 2. KUNG ONLINE PAYMENT (GCASH, MAYA, GOTYME) - PATAKBUHIN ANG PAYMONGO
    if (paymentType) {
      const amountCents = Math.round(Number(total_amount || 0) * 100);

      const sessionResponse = await fetch(`${PAYMONGO_API_BASE}/checkout_sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${base64Auth}`
        },
        body: JSON.stringify({
          data: {
            attributes: {
              billing: {
                name: full_name,
                phone: contact_number
              },
              description: `Ulap Corner Order: ${orderId}`,
              line_items: [
                {
                  currency: 'PHP',
                  amount: amountCents,
                  name: `Order ${orderId}`,
                  quantity: 1,
                  description: `Checkout for ${items ? items.length : 0} items`
                }
              ],
              payment_method_types: ['gcash', 'paymaya', 'card', 'qrph'],
              success_url: `${req.protocol}://${req.get('host')}/store/shop.html?payment_success=true&order_id=${orderId}`,
              cancel_url: `${req.protocol}://${req.get('host')}/store/checkout.html`
            }
          }
        })
      });

      const sessionResult = await sessionResponse.json();
      if (!sessionResponse.ok) {
        console.error('[PayMongo] Checkout Session creation failed:', sessionResult);
        throw new Error('Failed to initialize checkout session with PayMongo.');
      }

      // Ito ang link na ibabalik natin sa frontend para mag-checkout ang user
      checkoutUrl = sessionResult.data.attributes.checkout_url;
    }

    // 3. MAGSIMULA NG TRANSACTION SA DATABASE MO
    await db.exec('BEGIN IMMEDIATE TRANSACTION');

    // Validate and deduct inventory stock
    for (const item of (items || [])) {
      const product = await db.get('SELECT * FROM products WHERE name = ?', [item.name]);
      if (!product) {
        throw new Error(`Product "${item.name}" not found in inventory database.`);
      }
      if (product.stock < item.qty) {
        throw new Error(`Out of Stock: Insufficient stock for "${item.name}". Only ${product.stock} units available.`);
      }

      await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.qty, product.id]);
      const newStock = product.stock - item.qty;

      // Log stock adjustment in inventory audit logs
      await db.run(
        `INSERT INTO inventory_logs (staff_name, item_name, sku, action_type, prev_qty, new_qty, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        'System Checkout (Online)', product.name, 'N/A', 'Customer Order Deduct', product.stock, newStock, 'Verified'
      );
    }

    await db.run(
      `INSERT INTO orders (id, full_name, contact_number, address, city, postal_code, payment_method, items, subtotal, shipping_fee, discount, total_amount, payment_status, qr_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      orderId,
      full_name,
      contact_number,
      address,
      city,
      postal_code,
      payment_method,
      JSON.stringify(items || []),
      subtotal || 0,
      shipping_fee || 0,
      discount || 0,
      total_amount || 0,
      paymentStatus,
      checkoutUrl // I-store ang redirect URL ng PayMongo dito para pwede mabalikan ng customer kung sumablay ang browser redirect
    );

    await db.run(
      `INSERT INTO transaction_ledger (order_id, status, description) VALUES (?, 'CREATED', ?)`,
      orderId,
      `Checkout created with ${payment_method} via updated PayMongo v1 implementation.`
    );

    if (payment_method === 'COD') {
      // COD orders confirmed immediately - payment collected on delivery
      await db.run(`INSERT INTO transaction_ledger (order_id, status, description) VALUES (?, 'CONFIRMED', ?)`,
        orderId, 'Cash on Delivery order confirmed. Payment will be collected upon delivery.');
      // Update payment_status to CONFIRMED immediately
      await db.run(`UPDATE orders SET payment_status = 'CONFIRMED' WHERE id = ?`, orderId);
    } else {
      await db.run(`INSERT INTO transaction_ledger (order_id, status, description) VALUES (?, 'PENDING_PAYMENT', ?)`,
        orderId, `Awaiting external gateway authorization using ${payment_method}.`);
    }

    // Isasauli natin ang payload pabalik sa frontend (checkout.html)
    const responsePayload = {
      success: true,
      order_id: orderId,
      total_amount,
      payment_method,
      status: payment_method === 'COD' ? 'CONFIRMED' : paymentStatus,
      checkout_url: checkoutUrl, // Dito na pupunta ang frontend gamit ang window.location.href
      qr_url: null, // Ligtas na itong gawing null dahil handled na ng checkoutUrl ang QR dynamic presentation
      message: payment_method === 'COD' ? 'COD order confirmed! Payment will be collected upon delivery.' : 'Payment checkout redirection link issued.'
    };

    // I-save sa cache ang tagumpay na transaksyon para sa Idempotency validation
    await db.run(
      `INSERT INTO idempotency_keys (key, response_status, response_body) VALUES (?, ?, ?)`,
      idempotencyKey,
      201,
      JSON.stringify(responsePayload)
    );

    await db.exec('COMMIT');
    return res.status(201).json(responsePayload);
  } catch (err) {
    try { await db.exec('ROLLBACK'); } catch (rollbackErr) { }
    console.error('[Payments] checkout error:', err);
    return res.status(500).json({ error: err.message || 'Payment checkout failed.' });
  }
});

module.exports = router;