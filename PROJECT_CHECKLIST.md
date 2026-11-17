# OneDepot project checklist

Updated November 17, 2026. Checked items are implemented or completed. The notes distinguish work available locally from work shared on GitHub and work needed before store use.

## Completed

- [x] Set up the local Express API, MySQL database, Prisma schema and migrations, and owner sign-in.
- [x] Build product and supplier management with stock adjustments, movement history, and CSV import with a preview.
- [x] Connect the storefront to inventory so it displays product photos, prices, and availability from the database.
- [x] Prepare and import a first batch of Facebook catalog items locally using draft prices and a placeholder supplier.
- [x] Build supplier purchase orders and receiving, including partial deliveries and records for missing or damaged stock.
- [x] Build online checkout with delivery details, GCash receipt upload, owner verification, confirmation, and customer order status. The owner books Maxim directly. The local app uses demo payment settings.
- [x] Build and test walk-in sales locally. The owner can find products by name or SKU, record a sale, deduct shared stock, and review sales history.
- [x] Share walk-in sales, its database migration, and this checklist on GitHub.
- [x] Push the inventory, restocking, and online checkout work to GitHub `main` in commit `c8113a2`.

## In progress

- [ ] **Group members:** Collect product names, categories, and photo filenames in Google Sheets and save the matching images in the shared Drive folder. The group has received the instructions.
- [ ] **Denzel:** Review the collected rows, fill in selling prices, assign unique SKUs, and confirm opening quantities with the store.
- [ ] **Denzel and store owner:** Confirm active suppliers and which products they carry so we can replace placeholder supplier details.

## Next up

- [ ] Get redacted examples of a walk-in sale, supplier delivery, and completed online order. Use them to check what the store records and whether the walk-in summary needs more fields or a printable copy.
- [ ] Copy the approved photos into the app, prepare the final CSV with matching photo paths, and preview before importing. Update any products already in OneDepot by SKU to avoid duplicate entries.
- [ ] Check the imported catalog for missing images, incorrect prices, and stock discrepancies. Record a sample walk-in sale and complete a sample online order to confirm both update the same stock.

## Before store use

- [ ] Confirm the store’s GCash recipient and delivery fee rules before switching checkout out of demo mode.
- [ ] Confirm whether repairs, waitlists, and reports are required for this release. They currently exist in the browser-only prototype. Connect any required workflows to the database and test them before release.
- [ ] Decide where the store will run OneDepot, then set up the database, owner access, and backups for that environment.
- [ ] Have the owner try product updates, receiving, walk-in sales, and online order verification. Record feedback, resolve blockers, and agree on which open transactions to carry over at launch.

## Project references

- [GitHub milestone for inventory and online checkout](https://github.com/denzel-jadman/ISANDE2OneDepot/commit/c8113a2f09ddb28b6065137472bb02dbf3c58e87)
- [Local setup and workflow guide](backend/README.md)
- [Prisma database schema](backend/prisma/schema.prisma)
- [First-batch CSV example](outputs/onedepot-facebook-catalog/first-batch-inventory.csv)
