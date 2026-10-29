require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const {
  PORT = 5000, DB_HOST = "localhost", DB_USER = "root", DB_PASSWORD = "", DB_NAME = "toko_sukses",
  JWT_SECRET, CORS_ORIGIN = "*", ADMIN_USERNAME = "admin", ADMIN_PASSWORD = "admin123",
} = process.env;
if (!JWT_SECRET) { console.error("JWT_SECRET belum diisi di .env"); process.exit(1); }

const pool = mysql.createPool({
  host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME,
  waitForConnections: true, connectionLimit: 10, decimalNumbers: true, dateStrings: true,
});

const app = express();
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",") }));
app.use(express.json({ limit: "1mb" }));
const api = express.Router();
app.use("/api", api);
app.use("/toko-sukses", api);
app.use("/", api);

/* ---------- Helpers ---------- */
const fail = (status, message) => Object.assign(new Error(message), { status });
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  let status = e.status || 500, message = e.status ? e.message : "Terjadi kesalahan server";
  if (e.code === "ER_DUP_ENTRY") { status = 409; message = "Data duplikat (kode/nama sudah digunakan)"; }
  if (e.code === "ER_ROW_IS_REFERENCED_2") { status = 409; message = "Data tidak bisa dihapus karena sudah dipakai transaksi lain"; }
  if (status === 500) console.error(e);
  res.status(status).json({ success: false, message });
});
const str = (v) => String(v ?? "").trim().replace(/[<>]/g, "");
const num = (v) => {
  const n = Number(String(v ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n)) throw fail(400, "Angka tidak valid");
  return n;
};
const int = (v) => parseInt(num(v), 10);
const round = (n, d = 2) => Math.round((n + Number.EPSILON) * 10 ** d) / 10 ** d;
const pad = (id) => String(id).padStart(5, "0");

async function tx(fn) {
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

/** Satu-satunya pintu perubahan stok: update saldo + catat riwayat (kartu stok). */
async function moveStock(conn, { productId, type, qty, price = null, refType = null, refId = null, note = null, userId }) {
  qty = round(qty, 3);
  const [[p]] = await conn.query("SELECT stock FROM products WHERE id=? FOR UPDATE", [productId]);
  if (!p) throw fail(404, "Barang tidak ditemukan");
  const after = round(p.stock + qty, 3);
  if (after < 0) throw fail(400, `Stok tidak mencukupi (tersedia ${p.stock})`);
  await conn.query("UPDATE products SET stock=? WHERE id=?", [after, productId]);
  await conn.query(
    "INSERT INTO stock_movements (product_id,type,quantity,balance_after,unit_price,ref_type,ref_id,note,created_by) VALUES (?,?,?,?,?,?,?,?,?)",
    [productId, type, qty, after, price, refType, refId, note, userId]
  );
}

/** Query list standar: pagination, search, limit, sorting, filter. */
async function paginate(req, { select, from, alias, searchCols = [], filters = {}, sorts = {}, extra }) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const reqLimit = parseInt(req.query.limit, 10);
  const limit = [10, 25, 50, 100].includes(reqLimit) ? reqLimit : 10;
  const where = [], params = [];
  const s = str(req.query.search);
  if (s && searchCols.length) {
    where.push("(" + searchCols.map((c) => `${c} LIKE ?`).join(" OR ") + ")");
    searchCols.forEach(() => params.push(`%${s}%`));
  }
  for (const [q, col] of Object.entries(filters)) {
    if (req.query[q] !== undefined && req.query[q] !== "") { where.push(`${col}=?`); params.push(req.query[q]); }
  }
  for (const [sql, ...p] of extra ? extra(req) : []) { where.push(sql); params.push(...p); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const sortCol = sorts[req.query.sortBy] || `${alias}.id`;
  const order = req.query.order === "asc" ? "ASC" : "DESC";
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM ${from} ${w}`, params);
  const [rows] = await pool.query(`SELECT ${select} FROM ${from} ${w} ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  return { rows, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}
const listRoute = (path, cfg) => api.get(path, wrap(async (req, res) => {
  const { rows, pagination } = await paginate(req, cfg);
  res.json({ success: true, data: rows, pagination });
}));

const conv = { str, num, int };
function clean(body, fields) {
  const out = {};
  for (const [k, d] of Object.entries(fields)) {
    const v = body[k];
    if (v === undefined || v === null || String(v).trim() === "") {
      if (d.req) throw fail(400, `${d.label || k} wajib diisi`);
      out[k] = d.def !== undefined ? d.def : null;
      continue;
    }
    out[k] = conv[d.t](v);
    if (d.min !== undefined && out[k] < d.min) throw fail(400, `${d.label || k} tidak boleh kurang dari ${d.min}`);
  }
  return out;
}

/** Factory CRUD generik agar tidak ada kode duplikat. */
function crud(name, table, o) {
  const alias = o.alias || table;
  const cfg = { select: `${alias}.*`, from: table, alias, ...o };
  listRoute(`/${name}`, cfg);

  api.get(`/${name}/:id`, wrap(async (req, res) => {
    const [[row]] = await pool.query(`SELECT ${cfg.select} FROM ${cfg.from} WHERE ${alias}.id=?`, [req.params.id]);
    if (!row) throw fail(404, "Data tidak ditemukan");
    res.json({ success: true, data: row });
  }));

  api.post(`/${name}`, wrap(async (req, res) => {
    const data = clean(req.body, o.fields);
    const id = await tx(async (c) => {
      const [r] = await c.query(`INSERT INTO ${table} SET ?`, [data]);
      if (o.prefix && !data.code) await c.query(`UPDATE ${table} SET code=? WHERE id=?`, [`${o.prefix}-${pad(r.insertId)}`, r.insertId]);
      if (o.afterCreate) await o.afterCreate(c, r.insertId, req);
      return r.insertId;
    });
    res.status(201).json({ success: true, data: { id } });
  }));

  api.put(`/${name}/:id`, wrap(async (req, res) => {
    const data = clean(req.body, o.fields);
    if (o.fields.code && !data.code) delete data.code;
    const [r] = await pool.query(`UPDATE ${table} SET ? WHERE id=?`, [data, req.params.id]);
    if (!r.affectedRows) throw fail(404, "Data tidak ditemukan");
    res.json({ success: true, data: { id: Number(req.params.id) } });
  }));

  api.delete(`/${name}/:id`, adminGuard, wrap(async (req, res) => {
    const [r] = await pool.query(`DELETE FROM ${table} WHERE id=?`, [req.params.id]);
    if (!r.affectedRows) throw fail(404, "Data tidak ditemukan");
    res.json({ success: true });
  }));
}

/* ---------- Auth ---------- */
api.post("/auth/login", wrap(async (req, res) => {
  const username = str(req.body.username), password = String(req.body.password || "");
  if (!username || !password) throw fail(400, "Username dan password wajib diisi");
  const [[u]] = await pool.query("SELECT * FROM users WHERE username=? AND is_active=1", [username]);
  if (!u || !(await bcrypt.compare(password, u.password))) throw fail(401, "Username atau password salah");
  const user = { id: u.id, name: u.name, username: u.username, role: u.role };
  res.json({ success: true, data: { token: jwt.sign(user, JWT_SECRET, { expiresIn: "12h" }), user } });
}));

api.use((req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || "").replace("Bearer ", ""), JWT_SECRET); next(); }
  catch { res.status(401).json({ success: false, message: "Sesi berakhir, silakan login kembali" }); }
});
function adminGuard(req, res, next) {
  if (req.user?.role === "admin") return next();
  res.status(403).json({ success: false, message: "Hanya admin yang boleh melakukan aksi ini" });
}
api.get("/auth/profile", (req, res) => res.json({ success: true, data: req.user }));

api.put("/auth/change-password", wrap(async (req, res) => {
  const current_password = String(req.body.current_password || "");
  const new_password = String(req.body.new_password || "");
  if (!current_password || !new_password) throw fail(400, "Password lama dan password baru wajib diisi");
  if (new_password.length < 6) throw fail(400, "Password baru minimal 6 karakter");

  const [[u]] = await pool.query("SELECT * FROM users WHERE id=?", [req.user.id]);
  if (!u || !(await bcrypt.compare(current_password, u.password))) {
    throw fail(400, "Password lama tidak sesuai");
  }

  const hash = await bcrypt.hash(new_password, 10);
  await pool.query("UPDATE users SET password=? WHERE id=?", [hash, req.user.id]);
  res.json({ success: true, message: "Password berhasil diperbarui" });
}));

/* ---------- Manajemen Pengguna (Admin Only) ---------- */
api.get("/users", adminGuard, wrap(async (req, res) => {
  const { rows, pagination } = await paginate(req, {
    alias: "u",
    select: "u.id, u.name, u.username, u.role, u.is_active, u.created_at, u.updated_at",
    from: "users u",
    searchCols: ["u.name", "u.username"],
    filters: { role: "u.role", is_active: "u.is_active" },
    sorts: { name: "u.name", username: "u.username", role: "u.role", created_at: "u.created_at" },
  });
  res.json({ success: true, data: rows, pagination });
}));

api.get("/users/:id", adminGuard, wrap(async (req, res) => {
  const [[row]] = await pool.query(
    "SELECT id, name, username, role, is_active, created_at, updated_at FROM users WHERE id=?",
    [req.params.id]
  );
  if (!row) throw fail(404, "Pengguna tidak ditemukan");
  res.json({ success: true, data: row });
}));

api.post("/users", adminGuard, wrap(async (req, res) => {
  const name = str(req.body.name);
  const username = str(req.body.username).toLowerCase();
  const password = String(req.body.password || "").trim();
  const role = req.body.role === "admin" ? "admin" : "staff";
  const is_active = req.body.is_active === 0 || req.body.is_active === false || req.body.is_active === "0" ? 0 : 1;

  if (!name) throw fail(400, "Nama pengguna wajib diisi");
  if (!username) throw fail(400, "Username wajib diisi");
  if (username.length < 3) throw fail(400, "Username minimal 3 karakter");
  if (!/^[a-z0-9_.-]+$/.test(username)) throw fail(400, "Username hanya boleh huruf kecil, angka, titik, strip, atau underscore");
  if (!password || password.length < 6) throw fail(400, "Password minimal 6 karakter");

  const [[exist]] = await pool.query("SELECT id FROM users WHERE username=?", [username]);
  if (exist) throw fail(409, "Username sudah digunakan");

  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    "INSERT INTO users (name, username, password, role, is_active) VALUES (?, ?, ?, ?, ?)",
    [name, username, hash, role, is_active]
  );
  res.status(201).json({ success: true, data: { id: r.insertId } });
}));

api.put("/users/:id", adminGuard, wrap(async (req, res) => {
  const id = int(req.params.id);
  const [[user]] = await pool.query("SELECT * FROM users WHERE id=?", [id]);
  if (!user) throw fail(404, "Pengguna tidak ditemukan");

  const name = str(req.body.name);
  const username = str(req.body.username).toLowerCase();
  const role = req.body.role;
  const is_active = req.body.is_active !== undefined ? (req.body.is_active === 1 || req.body.is_active === true || req.body.is_active === "1" ? 1 : 0) : user.is_active;
  const password = String(req.body.password || "").trim();

  if (!name) throw fail(400, "Nama pengguna wajib diisi");
  if (!username) throw fail(400, "Username wajib diisi");
  if (username.length < 3) throw fail(400, "Username minimal 3 karakter");
  if (!/^[a-z0-9_.-]+$/.test(username)) throw fail(400, "Username hanya boleh huruf kecil, angka, titik, strip, atau underscore");

  if (req.user.id === id) {
    if (is_active === 0) throw fail(400, "Tidak dapat menonaktifkan akun sendiri");
    if (role && role !== "admin") throw fail(400, "Tidak dapat mengubah role akun sendiri dari admin");
  }

  const [[dup]] = await pool.query("SELECT id FROM users WHERE username=? AND id!=?", [username, id]);
  if (dup) throw fail(409, "Username sudah digunakan oleh pengguna lain");

  const targetRole = role === "admin" ? "admin" : role === "staff" ? "staff" : user.role;
  const updates = [name, username, targetRole, is_active];
  let sql = "UPDATE users SET name=?, username=?, role=?, is_active=?";

  if (password) {
    if (password.length < 6) throw fail(400, "Password baru minimal 6 karakter");
    const hash = await bcrypt.hash(password, 10);
    sql += ", password=?";
    updates.push(hash);
  }

  sql += " WHERE id=?";
  updates.push(id);

  await pool.query(sql, updates);
  res.json({ success: true, data: { id } });
}));

api.delete("/users/:id", adminGuard, wrap(async (req, res) => {
  const id = int(req.params.id);
  if (req.user.id === id) throw fail(400, "Tidak dapat menghapus akun sendiri yang sedang aktif");

  const [[user]] = await pool.query("SELECT id FROM users WHERE id=?", [id]);
  if (!user) throw fail(404, "Pengguna tidak ditemukan");

  const [r] = await pool.query("DELETE FROM users WHERE id=?", [id]);
  if (!r.affectedRows) throw fail(404, "Data tidak ditemukan");
  res.json({ success: true });
}));

/* ---------- Master data ---------- */
crud("categories", "categories", {
  searchCols: ["categories.name"], sorts: { name: "categories.name" },
  fields: { name: { t: "str", req: true, label: "Nama kategori" }, description: { t: "str" } },
});
crud("units", "units", {
  searchCols: ["units.name", "units.symbol"], sorts: { name: "units.name" },
  fields: { name: { t: "str", req: true, label: "Nama satuan" }, symbol: { t: "str", req: true, label: "Simbol" } },
});
crud("suppliers", "suppliers", {
  prefix: "SUP", searchCols: ["suppliers.name", "suppliers.code", "suppliers.phone", "suppliers.company"], sorts: { name: "suppliers.name" },
  fields: {
    code: { t: "str" }, name: { t: "str", req: true, label: "Nama supplier" }, contact_name: { t: "str" },
    phone: { t: "str" }, address: { t: "str" }, company: { t: "str" }, note: { t: "str" },
  },
});
crud("customers", "customers", {
  prefix: "CUS", searchCols: ["customers.name", "customers.code", "customers.phone"], sorts: { name: "customers.name" },
  fields: { code: { t: "str" }, name: { t: "str", req: true, label: "Nama customer" }, phone: { t: "str" }, address: { t: "str" }, note: { t: "str" } },
});
crud("products", "products", {
  alias: "p", prefix: "BRG",
  select: "p.*, c.name category_name, u.symbol unit_symbol, u.name unit_name, s.name supplier_name, ROUND(p.stock*p.cost_price,2) stock_value",
  from: "products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN units u ON u.id=p.unit_id LEFT JOIN suppliers s ON s.id=p.supplier_id",
  searchCols: ["p.name", "p.code"],
  filters: { category_id: "p.category_id", unit_id: "p.unit_id", supplier_id: "p.supplier_id" },
  sorts: { name: "p.name", stock: "p.stock", stock_value: "stock_value", cost_price: "p.cost_price" },
  extra: (req) => (req.query.low_stock === "1" ? [["p.min_stock>0 AND p.stock<=p.min_stock"]] : []),
  fields: {
    code: { t: "str" }, name: { t: "str", req: true, label: "Nama barang" }, category_id: { t: "int" },
    unit_id: { t: "int", req: true, label: "Satuan" }, cost_price: { t: "num", min: 0, def: 0, label: "Harga modal" },
    sell_price: { t: "num", min: 0, def: 0, label: "Harga jual" }, min_stock: { t: "num", min: 0, def: 0, label: "Stok minimum" },
    supplier_id: { t: "int" }, description: { t: "str" },
  },
  afterCreate: async (c, id, req) => {
    const opening = req.body.stock ? num(req.body.stock) : 0;
    if (opening < 0) throw fail(400, "Stok awal tidak boleh negatif");
    if (opening > 0) {
      const [[p]] = await c.query("SELECT cost_price FROM products WHERE id=?", [id]);
      await moveStock(c, { productId: id, type: "opening", qty: opening, price: p.cost_price, note: "Stok awal", userId: req.user.id });
    }
  },
});

/* ---------- Pembelian ---------- */
const purchaseFrom = "purchases pu LEFT JOIN suppliers s ON s.id=pu.supplier_id LEFT JOIN users us ON us.id=pu.created_by";
const dateRange = (col) => (req) => [
  ...(req.query.date_from ? [[`${col}>=?`, req.query.date_from]] : []),
  ...(req.query.date_to ? [[`${col}<=?`, req.query.date_to]] : []),
];
listRoute("/purchases", {
  alias: "pu", select: "pu.*, s.name supplier_name, us.name user_name", from: purchaseFrom,
  searchCols: ["pu.number", "pu.invoice_no", "s.name"],
  filters: { supplier_id: "pu.supplier_id", status: "pu.status", payment_status: "pu.payment_status" },
  sorts: { purchase_date: "pu.purchase_date", total: "pu.total", number: "pu.number" },
  extra: dateRange("pu.purchase_date"),
});

api.get("/purchases/:id", wrap(async (req, res) => {
  const [[p]] = await pool.query(`SELECT pu.*, s.name supplier_name, us.name user_name FROM ${purchaseFrom} WHERE pu.id=?`, [req.params.id]);
  if (!p) throw fail(404, "Pembelian tidak ditemukan");
  const [items] = await pool.query(
    "SELECT i.*, pr.name product_name, pr.code product_code, u.symbol unit_symbol FROM purchase_items i JOIN products pr ON pr.id=i.product_id LEFT JOIN units u ON u.id=pr.unit_id WHERE i.purchase_id=?", [p.id]);
  res.json({ success: true, data: { ...p, items } });
}));

api.post("/purchases", wrap(async (req, res) => {
  const b = req.body, items = Array.isArray(b.items) ? b.items : [];
  if (!int(b.supplier_id || 0)) throw fail(400, "Supplier wajib dipilih");
  if (!items.length) throw fail(400, "Minimal 1 barang pada pembelian");
  const lines = items.map((i, n) => {
    const quantity = round(num(i.quantity), 3), unit_price = num(i.unit_price), product_id = int(i.product_id || 0);
    if (!product_id) throw fail(400, `Barang pada baris ${n + 1} belum dipilih`);
    if (quantity <= 0) throw fail(400, `Jumlah pada baris ${n + 1} harus lebih dari 0`);
    if (unit_price < 0) throw fail(400, `Harga pada baris ${n + 1} tidak valid`);
    return { product_id, quantity, unit_price, subtotal: round(quantity * unit_price) };
  });
  const subtotal = round(lines.reduce((a, l) => a + l.subtotal, 0));
  const discount = num(b.discount || 0), extra = num(b.extra_cost || 0), paid = num(b.paid_amount || 0);
  const total = round(subtotal - discount + extra);
  if (discount < 0 || extra < 0 || paid < 0) throw fail(400, "Nilai tidak boleh negatif");
  if (total < 0) throw fail(400, "Total pembelian tidak boleh negatif");
  const payment = total > 0 && paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.purchase_date) ? b.purchase_date : new Date().toISOString().slice(0, 10);

  const id = await tx(async (c) => {
    const [r] = await c.query(
      "INSERT INTO purchases (number,supplier_id,purchase_date,invoice_no,note,subtotal,discount,extra_cost,total,paid_amount,payment_status,status,created_by) VALUES (UUID(),?,?,?,?,?,?,?,?,?,?,'confirmed',?)",
      [int(b.supplier_id), date, str(b.invoice_no) || null, str(b.note) || null, subtotal, discount, extra, total, paid, payment, req.user.id]);
    const number = `PB-${date.replace(/-/g, "").slice(0, 6)}-${pad(r.insertId)}`;
    await c.query("UPDATE purchases SET number=? WHERE id=?", [number, r.insertId]);
    for (const l of lines) {
      await c.query("INSERT INTO purchase_items (purchase_id,product_id,quantity,unit_price,subtotal) VALUES (?,?,?,?,?)", [r.insertId, l.product_id, l.quantity, l.unit_price, l.subtotal]);
      // harga modal = rata-rata tertimbang
      await c.query("UPDATE products SET cost_price=IF(stock+?>0,ROUND((stock*cost_price+?*?)/(stock+?),2),?) WHERE id=?",
        [l.quantity, l.quantity, l.unit_price, l.quantity, l.unit_price, l.product_id]);
      await moveStock(c, { productId: l.product_id, type: "purchase", qty: l.quantity, price: l.unit_price, refType: "purchase", refId: r.insertId, note: number, userId: req.user.id });
    }
    return r.insertId;
  });
  res.status(201).json({ success: true, data: { id } });
}));

api.post("/purchases/:id/cancel", adminGuard, wrap(async (req, res) => {
  const reason = str(req.body.reason);
  if (!reason) throw fail(400, "Alasan pembatalan wajib diisi");
  await tx(async (c) => {
    const [[p]] = await c.query("SELECT * FROM purchases WHERE id=? FOR UPDATE", [req.params.id]);
    if (!p) throw fail(404, "Pembelian tidak ditemukan");
    if (p.status === "cancelled") throw fail(400, "Pembelian sudah dibatalkan");
    const [items] = await c.query("SELECT * FROM purchase_items WHERE purchase_id=?", [p.id]);
    for (const i of items) {
      await moveStock(c, { productId: i.product_id, type: "cancel", qty: -i.quantity, refType: "purchase", refId: p.id, note: `Pembatalan ${p.number}`, userId: req.user.id });
    }
    await c.query("UPDATE purchases SET status='cancelled', cancel_reason=? WHERE id=?", [reason, p.id]);
  });
  res.json({ success: true });
}));

/* ---------- Penjualan (Sales) ---------- */
const saleFrom = "sales sl LEFT JOIN customers c ON c.id=sl.customer_id LEFT JOIN users us ON us.id=sl.created_by";

listRoute("/sales", {
  alias: "sl",
  select: "sl.*, COALESCE(c.name, 'Umum') customer_name, us.name user_name",
  from: saleFrom,
  searchCols: ["sl.number", "sl.invoice_no", "c.name"],
  filters: { customer_id: "sl.customer_id", status: "sl.status", payment_status: "sl.payment_status" },
  sorts: { sale_date: "sl.sale_date", total: "sl.total", number: "sl.number" },
  extra: dateRange("sl.sale_date"),
});

api.get("/sales/:id", wrap(async (req, res) => {
  const [[s]] = await pool.query(`SELECT sl.*, COALESCE(c.name, 'Umum') customer_name, c.phone customer_phone, us.name user_name FROM ${saleFrom} WHERE sl.id=?`, [req.params.id]);
  if (!s) throw fail(404, "Penjualan tidak ditemukan");
  const [items] = await pool.query(
    "SELECT i.*, pr.name product_name, pr.code product_code, u.symbol unit_symbol FROM sale_items i JOIN products pr ON pr.id=i.product_id LEFT JOIN units u ON u.id=pr.unit_id WHERE i.sale_id=?",
    [s.id]
  );
  res.json({ success: true, data: { ...s, items } });
}));

api.post("/sales", wrap(async (req, res) => {
  const b = req.body, items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) throw fail(400, "Minimal 1 barang pada penjualan");

  const lines = items.map((i, n) => {
    const quantity = round(num(i.quantity), 3), unit_price = num(i.unit_price), product_id = int(i.product_id || 0);
    if (!product_id) throw fail(400, `Barang pada baris ${n + 1} belum dipilih`);
    if (quantity <= 0) throw fail(400, `Jumlah pada baris ${n + 1} harus lebih dari 0`);
    if (unit_price < 0) throw fail(400, `Harga pada baris ${n + 1} tidak valid`);
    return { product_id, quantity, unit_price, subtotal: round(quantity * unit_price) };
  });

  const subtotal = round(lines.reduce((a, l) => a + l.subtotal, 0));
  const discount = num(b.discount || 0), extra = num(b.extra_cost || 0), paid = num(b.paid_amount || 0);
  const total = round(subtotal - discount + extra);
  if (discount < 0 || extra < 0 || paid < 0) throw fail(400, "Nilai tidak boleh negatif");
  if (total < 0) throw fail(400, "Total penjualan tidak boleh negatif");

  const payment = total > 0 && paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.sale_date) ? b.sale_date : new Date().toISOString().slice(0, 10);
  const customerId = int(b.customer_id || 0) || null;

  const id = await tx(async (c) => {
    for (const l of lines) {
      const [[p]] = await c.query("SELECT name, stock FROM products WHERE id=? FOR UPDATE", [l.product_id]);
      if (!p) throw fail(404, "Barang tidak ditemukan");
      if (round(p.stock - l.quantity, 3) < 0) {
        throw fail(400, `Stok "${p.name}" tidak mencukupi (tersedia ${p.stock}, diminta ${l.quantity})`);
      }
    }

    const [r] = await c.query(
      "INSERT INTO sales (number,customer_id,sale_date,invoice_no,note,subtotal,discount,extra_cost,total,paid_amount,payment_status,status,created_by) VALUES (UUID(),?,?,?,?,?,?,?,?,?,?,'confirmed',?)",
      [customerId, date, str(b.invoice_no) || null, str(b.note) || null, subtotal, discount, extra, total, paid, payment, req.user.id]
    );

    const number = `PJ-${date.replace(/-/g, "").slice(0, 6)}-${pad(r.insertId)}`;
    await c.query("UPDATE sales SET number=? WHERE id=?", [number, r.insertId]);

    for (const l of lines) {
      await c.query("INSERT INTO sale_items (sale_id,product_id,quantity,unit_price,subtotal) VALUES (?,?,?,?,?)", [r.insertId, l.product_id, l.quantity, l.unit_price, l.subtotal]);
      await moveStock(c, {
        productId: l.product_id,
        type: "sale",
        qty: -l.quantity,
        price: l.unit_price,
        refType: "sale",
        refId: r.insertId,
        note: number,
        userId: req.user.id,
      });
    }
    return r.insertId;
  });

  res.status(201).json({ success: true, data: { id } });
}));

api.post("/sales/:id/cancel", adminGuard, wrap(async (req, res) => {
  const reason = str(req.body.reason);
  if (!reason) throw fail(400, "Alasan pembatalan wajib diisi");
  await tx(async (c) => {
    const [[s]] = await c.query("SELECT * FROM sales WHERE id=? FOR UPDATE", [req.params.id]);
    if (!s) throw fail(404, "Penjualan tidak ditemukan");
    if (s.status === "cancelled") throw fail(400, "Penjualan sudah dibatalkan");
    const [items] = await c.query("SELECT * FROM sale_items WHERE sale_id=?", [s.id]);
    for (const i of items) {
      await moveStock(c, {
        productId: i.product_id,
        type: "cancel",
        qty: i.quantity,
        refType: "sale",
        refId: s.id,
        note: `Pembatalan ${s.number}`,
        userId: req.user.id,
      });
    }
    await c.query("UPDATE sales SET status='cancelled', cancel_reason=? WHERE id=?", [reason, s.id]);
  });
  res.json({ success: true });
}));

/* ---------- Pergerakan stok (barang masuk / keluar / penyesuaian / kartu stok) ---------- */
const KINDS = { in: "'purchase','in','opening'", out: "'sale','out','cancel'", adjust: "'adjust'" };
listRoute("/stock-movements", {
  alias: "m",
  select: "m.*, p.name product_name, p.code product_code, u.symbol unit_symbol, us.name user_name",
  from: "stock_movements m JOIN products p ON p.id=m.product_id LEFT JOIN units u ON u.id=p.unit_id LEFT JOIN users us ON us.id=m.created_by",
  searchCols: ["p.name", "p.code", "m.note"],
  filters: { product_id: "m.product_id", type: "m.type" },
  sorts: { created_at: "m.created_at", quantity: "m.quantity" },
  extra: (req) => [...(KINDS[req.query.kind] ? [[`m.type IN (${KINDS[req.query.kind]})`]] : []), ...dateRange("DATE(m.created_at)")(req)],
});

api.post("/stock-movements", wrap(async (req, res) => {
  const type = req.body.type;
  if (!["in", "out", "adjust"].includes(type)) throw fail(400, "Jenis transaksi tidak valid");
  const qty = num(req.body.quantity), note = str(req.body.note);
  if (qty === 0) throw fail(400, "Jumlah tidak boleh 0");
  if (type !== "adjust" && qty < 0) throw fail(400, "Jumlah harus lebih dari 0");
  if (type !== "in" && !note) throw fail(400, "Keterangan/alasan wajib diisi");
  await tx((c) => moveStock(c, { productId: int(req.body.product_id || 0), type, qty: type === "out" ? -qty : qty, note: note || null, userId: req.user.id }));
  res.status(201).json({ success: true });
}));

/* ---------- Dashboard ---------- */
api.get("/dashboard", wrap(async (req, res) => {
  const [[totals]] = await pool.query("SELECT COUNT(*) total_products, COALESCE(SUM(min_stock>0 AND stock<=min_stock),0) low_stock, COALESCE(SUM(stock*cost_price),0) inventory_value FROM products");
  const [[buy]] = await pool.query("SELECT COALESCE(SUM(CASE WHEN purchase_date=CURDATE() THEN total END),0) today, COALESCE(SUM(CASE WHEN DATE_FORMAT(purchase_date,'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m') THEN total END),0) month FROM purchases WHERE status='confirmed'");
  const [[sell]] = await pool.query("SELECT COALESCE(SUM(CASE WHEN sale_date=CURDATE() THEN total END),0) today, COALESCE(SUM(CASE WHEN DATE_FORMAT(sale_date,'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m') THEN total END),0) month FROM sales WHERE status='confirmed'");
  const [monthly] = await pool.query("SELECT DATE_FORMAT(purchase_date,'%Y-%m') month, SUM(total) total FROM purchases WHERE status='confirmed' AND purchase_date>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 5 MONTH) GROUP BY month ORDER BY month");
  const [recent] = await pool.query("SELECT pu.id,pu.number,pu.purchase_date,pu.total,pu.status,s.name supplier_name FROM purchases pu LEFT JOIN suppliers s ON s.id=pu.supplier_id ORDER BY pu.id DESC LIMIT 5");
  const [recentSales] = await pool.query("SELECT sl.id,sl.number,sl.sale_date,sl.total,sl.status,COALESCE(c.name,'Umum') customer_name FROM sales sl LEFT JOIN customers c ON c.id=sl.customer_id ORDER BY sl.id DESC LIMIT 5");
  const [lowStock] = await pool.query("SELECT p.id,p.name,p.stock,p.min_stock,u.symbol unit_symbol FROM products p LEFT JOIN units u ON u.id=p.unit_id WHERE p.min_stock>0 AND p.stock<=p.min_stock ORDER BY p.stock ASC LIMIT 5");
  const [perUnit] = await pool.query("SELECT u.symbol, SUM(p.stock) total FROM products p JOIN units u ON u.id=p.unit_id GROUP BY u.id,u.symbol ORDER BY total DESC");
  res.json({
    success: true,
    data: {
      ...totals,
      purchases_today: buy.today,
      purchases_month: buy.month,
      sales_today: sell?.today || 0,
      sales_month: sell?.month || 0,
      monthly,
      recent,
      recentSales,
      lowStock,
      perUnit,
    },
  });
}));

api.use((req, res) => res.status(404).json({ success: false, message: "Endpoint tidak ditemukan" }));

/* ---------- Start ---------- */
(async () => {
  const [[{ n }]] = await pool.query("SELECT COUNT(*) n FROM users");
  if (!n) {
    await pool.query("INSERT INTO users (name,username,password,role) VALUES (?,?,?,'admin')", ["Administrator", ADMIN_USERNAME, await bcrypt.hash(ADMIN_PASSWORD, 10)]);
    console.log(`Akun admin dibuat: ${ADMIN_USERNAME}`);
  }
  app.listen(PORT, () => console.log(`API berjalan di http://localhost:${PORT}/api`));
})().catch((e) => { console.error("Gagal start server:", e.message); process.exit(1); });
