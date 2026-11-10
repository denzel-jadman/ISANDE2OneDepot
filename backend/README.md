# OneDepot inventory development

The inventory workspace uses the existing Product Management screen with Express, Prisma, and MySQL. It has a separate local login and uses sample data. The normal prototype command, `npm run dev`, still runs the browser-only demo.

## Start the workspace

Use Node.js 24 LTS and a local MySQL server. On this Mac, the dedicated OneDepot MySQL instance uses port 3307 and stores data in the ignored `backend/.mysql/instance` directory.

From the repository root, restart the dedicated instance if it is stopped.

```sh
mysqld --no-defaults --datadir="$PWD/backend/.mysql/instance" \
  --bind-address=127.0.0.1 --port=3307 --mysqlx=OFF \
  --socket="$PWD/backend/.mysql/mysql.sock" \
  --innodb-redo-log-capacity=16777216 \
  --log-error="$PWD/backend/.mysql/server.log" --daemonize
```

On another machine, create a local database named `onedepot_dev` and grant a dedicated MySQL user privileges on that database. Copy `.env.example` to `.env` inside `backend`, set its MySQL connection URL, and choose the local inventory login and a random session secret of at least 32 characters. For a local MySQL instance using `caching_sha2_password` over TCP without TLS, set `MYSQL_RSA_PUBLIC_KEY_FILE` to the server's `public_key.pem` so login works after MySQL restarts. The local settings on this Mac are already configured in the ignored `backend/.env` file.

In one terminal, from the repository root:

```sh
cd backend
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm start
```

In another terminal, from the repository root:

```sh
cd 'ISANDE1 Prototype'
npm ci
npm run dev:inventory -- --port 5174 --strictPort
```

Open http://127.0.0.1:5174, choose **Sign in** on the OneDepot homepage, and use `INVENTORY_OWNER_EMAIL` and `INVENTORY_OWNER_PASSWORD` from `backend/.env`. The owner home links to **Products** and **Restocking** through the same session. The API listens on local port 3001 and Vite proxies the inventory requests to it.

## Try the inventory workflow

- Add a supplier, then select it when adding or editing a product.
- Enter an opening quantity when adding a product. Edit its quantity to record a stock adjustment. MySQL saves the quantity and movement in the same transaction.
- Open a separate browser profile, sign in again, and check that it shows the same quantity.
- Archive a product to remove it from the list and retain its SKU and stock history. The signed-in API exposes movement history at `GET /api/inventory/products/:id/movements`.

This workspace covers inventory, suppliers, purchase orders, and customer orders. The shop shows active products, photos, prices, and availability from the same database. The browser-only demo includes its own checkout, repairs, waitlists, and reports. Keep real customer and store data out of the local sample workflow.

## Customer checkout

On the inventory site, open the cart and choose **Proceed to checkout**. Enter a delivery address and check the Maxim fee and total. The payment screen keeps a private order link and accepts a JPG or PNG receipt up to 2 MB. With no checkout payment settings, it shows a demo fee of ₱120 and prompts for a sample image. For real checkout, configure the approved GCash name, number, and flat delivery fee together in `.env`.

Submitted receipts appear in **Order requests**. Compare the receipt with the shop's GCash history, then mark it verified or request a replacement. The customer can see these updates on their private order page. Confirming checks stock and deducts it once. The owner books the Maxim rider and marks the order delivered after handoff. Earlier contact-only requests retain their original workflow.

## Receive a supplier delivery

Open **Restocking**, create a purchase order with an existing supplier and catalog products, and mark it as sent after sending it to the supplier. For each delivery, enter the good and damaged units that arrived. Good units update stock, damaged units appear in **Notes**, and outstanding units stay open for the next delivery. Each receipt is listed in **Delivery history** and links to its stock movements.

## Import suppliers and opening inventory

In Product Management, open **Import suppliers and opening inventory** and download the CSV templates. Keep the header row and add up to 250 data rows per file. You can preview either file by itself or both files together.

- Supplier rows create new suppliers. The opening inventory CSV can refer to a supplier by name from the database or the same batch.
- Enter the verified opening quantity for each SKU, including zero when applicable. Prices are in pesos without currency symbols or thousands separators. A blank low-stock threshold defaults to 5.
- Review the rows before confirming. Existing SKUs, including archived ones, and existing supplier names are rejected. Remove those rows from the CSV and preview again. Every batch is saved in one transaction, with an opening movement for each positive quantity.
