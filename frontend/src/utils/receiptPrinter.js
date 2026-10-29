import { jsPDF } from "jspdf";
import { formatDate, formatQty, formatRupiah } from "./format";

const STORE_NAME = "CV CAH BEJO";
const STORE_TAGLINE = "Manajemen Stok, Pembelian & Penjualan";

const cleanRupiah = (val) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);

const padLine = (left, right, width = 32) => {
  const l = String(left || "");
  const r = String(right || "");
  const spaceCount = Math.max(1, width - l.length - r.length);
  return l + " ".repeat(spaceCount) + r;
};

/**
 * Membentuk byte command ESC/POS untuk printer thermal Bluetooth (58mm / 80mm)
 */
export function buildEscPosBytes(sale, cols = 32) {
  const enc = new TextEncoder();
  const chunks = [];

  const add = (arr) => chunks.push(new Uint8Array(arr));
  const addText = (str) => chunks.push(enc.encode(str));

  // Inisialisasi printer: ESC @
  add([0x1b, 0x40]);

  // Header toko (Center, Bold, Double Size)
  add([0x1b, 0x61, 0x01]); // Align Center
  add([0x1b, 0x45, 0x01]); // Bold ON
  add([0x1d, 0x21, 0x11]); // Double width & height
  addText(`${STORE_NAME}\n`);
  add([0x1d, 0x21, 0x00]); // Normal size
  add([0x1b, 0x45, 0x00]); // Bold OFF
  addText(`${STORE_TAGLINE}\n`);
  addText("-".repeat(cols) + "\n");

  // Info Transaksi (Align Left)
  add([0x1b, 0x61, 0x00]); // Align Left
  addText(`No. Nota : ${sale.number || "-"}\n`);
  addText(`Tanggal  : ${formatDate(sale.sale_date)}\n`);
  addText(`Customer : ${sale.customer_name || "Umum"}\n`);
  if (sale.user_name) addText(`Kasir    : ${sale.user_name}\n`);
  addText("-".repeat(cols) + "\n");

  // Rincian Barang
  const items = sale.items || [];
  for (const item of items) {
    add([0x1b, 0x45, 0x01]); // Bold Nama Barang
    addText(`${item.product_name || "Barang"}\n`);
    add([0x1b, 0x45, 0x00]); // Bold OFF
    const qtyPrice = `  ${formatQty(item.quantity)} ${item.unit_symbol || ""} x ${cleanRupiah(item.unit_price)}`;
    const sub = cleanRupiah(item.subtotal);
    addText(padLine(qtyPrice, sub, cols) + "\n");
  }
  addText("-".repeat(cols) + "\n");

  // Rincian Pembayaran
  addText(padLine("Subtotal", cleanRupiah(sale.subtotal), cols) + "\n");
  if (Number(sale.discount) > 0) {
    addText(padLine("Diskon", `-${cleanRupiah(sale.discount)}`, cols) + "\n");
  }
  if (Number(sale.extra_cost) > 0) {
    addText(padLine("Biaya Tambahan", `+${cleanRupiah(sale.extra_cost)}`, cols) + "\n");
  }

  add([0x1b, 0x45, 0x01]); // Bold Total
  addText(padLine("TOTAL", cleanRupiah(sale.total), cols) + "\n");
  add([0x1b, 0x45, 0x00]);

  addText(padLine("Dibayar", cleanRupiah(sale.paid_amount), cols) + "\n");
  const change = Number(sale.paid_amount) - Number(sale.total);
  if (change > 0) {
    addText(padLine("Kembali", cleanRupiah(change), cols) + "\n");
  }

  addText("-".repeat(cols) + "\n");

  // Footer (Center)
  add([0x1b, 0x61, 0x01]);
  addText(sale.status === "cancelled" ? "*** TRANSAKSI DIBATALKAN ***\n" : "*** LUNAS ***\n");
  addText("Terima kasih atas kunjungan Anda!\n");
  addText("Barang yang sudah dibeli\ntidak dapat ditukar/dikembalikan\n");
  addText("\n\n\n");

  // Cut Paper command: GS V 66 0
  add([0x1d, 0x56, 0x42, 0x00]);

  // Gabungkan seluruh chunk
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

/**
 * Mencetak langsung ke Printer Thermal via Web Bluetooth
 */
export async function printBluetoothThermal(sale, { cols = 32 } = {}) {
  if (!navigator.bluetooth) {
    throw new Error(
      "Browser tidak mendukung Web Bluetooth. Silakan gunakan Google Chrome di Android atau PC dengan Bluetooth aktif."
    );
  }

  // Request Bluetooth Device dengan filter service printer thermal umum
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      "000018f0-0000-1000-8000-00805f9b34fb",
      "0000ffe0-0000-1000-8000-00805f9b34fb",
      "0000fff0-0000-1000-8000-00805f9b34fb",
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    ],
  });

  if (!device.gatt) throw new Error("GATT server tidak ditemukan pada perangkat.");

  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();

  let targetChar = null;
  for (const s of services) {
    try {
      const chars = await s.getCharacteristics();
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          targetChar = c;
          break;
        }
      }
    } catch {}
    if (targetChar) break;
  }

  if (!targetChar) {
    if (device.gatt.connected) device.gatt.disconnect();
    throw new Error("Karakteristik printer Bluetooth tidak dapat diakses untuk penulisan data.");
  }

  const payload = buildEscPosBytes(sale, cols);

  // Kirim data dalam potongan (chunk) maksimal 512 bytes untuk menghindari limit MTU Bluetooth
  const chunkSize = 512;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    if (targetChar.properties.writeWithoutResponse) {
      await targetChar.writeValueWithoutResponse(chunk);
    } else {
      await targetChar.writeValue(chunk);
    }
  }

  await new Promise((r) => setTimeout(r, 800));
  if (device.gatt.connected) {
    device.gatt.disconnect();
  }
}

/**
 * Menghasilkan PDF Struk Thermal (58mm) tanpa memanggil window.print()
 */
export function downloadReceiptPdf(sale) {
  const items = sale.items || [];
  // Perkirakan tinggi struk secara dinamis (58mm width, tinggi menyesuaikan item)
  const baseHeight = 110;
  const itemHeight = items.length * 9;
  const totalHeight = Math.max(130, baseHeight + itemHeight);

  const doc = new jsPDF({
    unit: "mm",
    format: [58, totalHeight],
  });

  const width = 58;
  let y = 8;

  // Header
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text(STORE_NAME, width / 2, y, { align: "center" });

  y += 4.5;
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.text(STORE_TAGLINE, width / 2, y, { align: "center" });

  y += 3;
  doc.text("-".repeat(34), width / 2, y, { align: "center" });

  // Metadata
  y += 4;
  doc.setFontSize(7.5);
  doc.text(`Nota : ${sale.number || "-"}`, 4, y);
  y += 3.5;
  doc.text(`Tgl  : ${formatDate(sale.sale_date)}`, 4, y);
  y += 3.5;
  doc.text(`Cust : ${sale.customer_name || "Umum"}`, 4, y);
  if (sale.user_name) {
    y += 3.5;
    doc.text(`Kasir: ${sale.user_name}`, 4, y);
  }

  y += 2.5;
  doc.text("-".repeat(34), width / 2, y, { align: "center" });

  // Items
  for (const item of items) {
    y += 4;
    doc.setFont("courier", "bold");
    doc.text(item.product_name || "Barang", 4, y);
    y += 3.5;
    doc.setFont("courier", "normal");
    const qtyPrice = `${formatQty(item.quantity)} ${item.unit_symbol || ""} x ${cleanRupiah(item.unit_price)}`;
    const sub = cleanRupiah(item.subtotal);
    doc.text(qtyPrice, 4, y);
    doc.text(sub, width - 4, y, { align: "right" });
  }

  y += 2.5;
  doc.text("-".repeat(34), width / 2, y, { align: "center" });

  // Totals
  y += 4;
  doc.text("Subtotal", 4, y);
  doc.text(cleanRupiah(sale.subtotal), width - 4, y, { align: "right" });

  if (Number(sale.discount) > 0) {
    y += 3.5;
    doc.text("Diskon", 4, y);
    doc.text(`-${cleanRupiah(sale.discount)}`, width - 4, y, { align: "right" });
  }
  if (Number(sale.extra_cost) > 0) {
    y += 3.5;
    doc.text("Biaya Tambahan", 4, y);
    doc.text(`+${cleanRupiah(sale.extra_cost)}`, width - 4, y, { align: "right" });
  }

  y += 4.5;
  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL", 4, y);
  doc.text(cleanRupiah(sale.total), width - 4, y, { align: "right" });

  y += 4;
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.text("Dibayar", 4, y);
  doc.text(cleanRupiah(sale.paid_amount), width - 4, y, { align: "right" });

  const change = Number(sale.paid_amount) - Number(sale.total);
  if (change > 0) {
    y += 3.5;
    doc.text("Kembali", 4, y);
    doc.text(cleanRupiah(change), width - 4, y, { align: "right" });
  }

  y += 2.5;
  doc.text("-".repeat(34), width / 2, y, { align: "center" });

  // Footer
  y += 4.5;
  doc.setFont("courier", "bold");
  doc.text(sale.status === "cancelled" ? "*** BATAL ***" : "*** LUNAS ***", width / 2, y, { align: "center" });
  y += 3.5;
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.text("Terima kasih atas kunjungan Anda!", width / 2, y, { align: "center" });
  y += 3;
  doc.text("Barang yang sudah dibeli", width / 2, y, { align: "center" });
  y += 3;
  doc.text("tidak dapat ditukar/dikembalikan", width / 2, y, { align: "center" });

  doc.save(`Struk-${sale.number || "Penjualan"}.pdf`);
}

/**
 * Format teks struk untuk dikirim via WhatsApp
 */
export function formatWhatsAppReceipt(sale) {
  const items = (sale.items || [])
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.product_name}*\n   ${formatQty(item.quantity)} ${item.unit_symbol || ""} x ${formatRupiah(item.unit_price)} = ${formatRupiah(item.subtotal)}`
    )
    .join("\n");

  return `*${STORE_NAME}*
${STORE_TAGLINE}
----------------------------------
No. Nota : ${sale.number || "-"}
Tanggal  : ${formatDate(sale.sale_date)}
Customer : ${sale.customer_name || "Umum"}
----------------------------------
*RINCIAN BARANG:*
${items}
----------------------------------
Subtotal : ${formatRupiah(sale.subtotal)}
${Number(sale.discount) > 0 ? `Diskon   : -${formatRupiah(sale.discount)}\n` : ""}${Number(sale.extra_cost) > 0 ? `Biaya Lain: +${formatRupiah(sale.extra_cost)}\n` : ""}*TOTAL    : ${formatRupiah(sale.total)}*
Dibayar  : ${formatRupiah(sale.paid_amount)}
Status   : *${sale.status === "cancelled" ? "DIBATALKAN" : "LUNAS"}*
----------------------------------
Terima kasih atas kunjungan Anda!`;
}

/**
 * Cetak via isolated iframe bersih (bebas header URL browser, margin 0, hanya struk yang dicetak)
 */
export function printViaIsolatedIframe(sale) {
  const existingFrame = document.getElementById("receipt-print-frame");
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "receipt-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const itemsHtml = (sale.items || [])
    .map(
      (i) => `
      <div style="margin-bottom: 4px;">
        <div style="font-weight: bold;">${i.product_name}</div>
        <div style="display: flex; justify-content: space-between;">
          <span>${formatQty(i.quantity)} ${i.unit_symbol || ""} x ${cleanRupiah(i.unit_price)}</span>
          <span>${cleanRupiah(i.subtotal)}</span>
        </div>
      </div>
    `
    )
    .join("");

  const change = Number(sale.paid_amount) - Number(sale.total);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Struk ${sale.number}</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 58mm;
            margin: 0;
            padding: 8px 6px;
            font-size: 11px;
            color: #000;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 13px;">${STORE_NAME}</div>
        <div class="center" style="font-size: 9px;">${STORE_TAGLINE}</div>
        <div class="line"></div>
        <div>No: ${sale.number || "-"}</div>
        <div>Tgl: ${formatDate(sale.sale_date)}</div>
        <div>Cust: ${sale.customer_name || "Umum"}</div>
        ${sale.user_name ? `<div>Kasir: ${sale.user_name}</div>` : ""}
        <div class="line"></div>
        ${itemsHtml}
        <div class="line"></div>
        <div class="row"><span>Subtotal</span><span>${cleanRupiah(sale.subtotal)}</span></div>
        ${Number(sale.discount) > 0 ? `<div class="row"><span>Diskon</span><span>-${cleanRupiah(sale.discount)}</span></div>` : ""}
        ${Number(sale.extra_cost) > 0 ? `<div class="row"><span>Biaya</span><span>+${cleanRupiah(sale.extra_cost)}</span></div>` : ""}
        <div class="row bold" style="font-size: 12px; margin-top: 2px;"><span>TOTAL</span><span>${cleanRupiah(sale.total)}</span></div>
        <div class="row"><span>Dibayar</span><span>${cleanRupiah(sale.paid_amount)}</span></div>
        ${change > 0 ? `<div class="row"><span>Kembali</span><span>${cleanRupiah(change)}</span></div>` : ""}
        <div class="line"></div>
        <div class="center bold">${sale.status === "cancelled" ? "*** DIBATALKAN ***" : "*** LUNAS ***"}</div>
        <div class="center" style="font-size: 9px; margin-top: 4px;">Terima kasih atas kunjungan Anda!</div>
        <div class="center" style="font-size: 8px;">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</div>
      </body>
    </html>
  `;

  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 250);
  };
}

