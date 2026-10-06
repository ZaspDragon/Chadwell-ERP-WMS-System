# Receiving Readiness

Owner: Brandon Evanshine  
Scope: Receiving must be production-ready before expanding the rest of the WMS.

## Receiving workflow

1. Authenticate user
2. Scan/open PO, PO EDI, SPO, transfer, transfer QR, or pallet QR
3. Load live receiving document and lines
4. Attach packing list / BOL / receiving report / invoice / damage photo
5. Create or select pallet/LPN
6. Scan item barcode / WMS QR / StickerPrice QR / item number
7. Enter quantity
8. Server validates branch access, document ownership, open pallet status, and cumulative receipt quantity
9. Save pallet line and receiving quantity
10. Print item stickers internally or send an exact print job to StickerPrice
11. Correct accidental receipt scans while pallet is OPEN
12. Report shortage / overage / damage / wrong item / unknown barcode / mismatch / hold
13. Close pallet
14. Auto-create putaway task
15. Finalize receipt only after open pallets are closed
16. Short receipt requires documented exception and supervisor/admin resolution
17. Putaway scans a valid active destination location
18. Inventory balance and immutable movement history update

## Functional controls

| Area | Function | Status |
| --- | --- | --- |
| Login | Auth + RLS | Implemented |
| Document scan | PO / EDI / SPO | Implemented |
| Transfer scan | Transfer number / transfer QR | Implemented |
| Pallet scan | WMS pallet QR / PLT code | Implemented |
| Item scan | Item # / stored barcode | Implemented |
| WMS item QR | WMS\|ITEM payload | Implemented |
| StickerPrice QR | Chadwell search URL q= item extraction | Implemented |
| Pallet create | Server-generated unique LPN | Implemented |
| Quantity control | Cumulative over-receipt protection | Implemented |
| Correction | Undo receiving quantity on open pallet | Implemented |
| Exceptions | Persist + in-app leadership notification | Implemented |
| Attachments | Secure receiving file storage | Implemented |
| Internal label print | 4x2 QR item sticker | Implemented |
| StickerPrice handoff | Prefilled exact print job | Implemented |
| Pallet close | Server validation + putaway task | Implemented |
| Receipt finalize | Complete/short controls | Implemented |
| Putaway | Location validation + inventory posting | Implemented |
| Audit trail | Receiving / correction / pallet / finalization | Implemented |
| Email alert | External webhook dependency | Needs integration/configuration |
| Production printer direct-print | Browser/system printer currently | Needs printer environment decision |

## Blocking rules

- Do not receive against a closed pallet.
- Do not receive a line belonging to another document.
- Do not over-receive unless branch policy explicitly permits it.
- Do not correct quantity after pallet close.
- Do not close an empty pallet.
- Do not finalize while any pallet is OPEN.
- Do not finalize a short receipt without an exception and supervisor/admin resolution.
- Do not receive a branch transfer until source checking is complete.
- Transfer expected inbound quantity uses CHECKED quantity, not original ordered quantity.
- Do not put away to an inactive or wrong-branch location.
- Do not post inventory without movement history.

## Required end-to-end QA before production use

### Standard PO
- Open document
- Create pallet
- Scan correct item
- Receive partial quantity
- Print StickerPrice label
- Scan printed QR back into Receiving
- Receive remaining quantity
- Close pallet
- Finalize
- Put away
- Confirm inventory and movement record

### Error handling
- Wrong item scan
- Unknown barcode
- Over receipt
- Undo one accidental unit
- Damage exception
- Short receipt with supervisor finalization
- Attempt finalization with open pallet
- Attempt correction after pallet close

### Transfer
- Picker scans correct primary location
- Picker scans correct item
- Checker verifies picked quantity
- Transfer becomes ready
- Destination scans transfer QR
- Receiving expected quantity equals checked quantity
- Receive / palletize / put away

### Security
- Receiver cannot work another unauthorized branch
- User without inventory adjustment permission cannot adjust stock
- Leadership can resolve receiving exception
- Attachment URL requires authenticated authorized access

## Known external dependencies

1. Email notification delivery needs RECEIVING_NOTIFICATION_WEBHOOK_URL and a chosen mail/n8n/Edge Function route.
2. Direct Zebra silent printing depends on the warehouse printer environment. Browser printing works now.
3. Real GP/headquarters inbound document synchronization still needs the agreed integration/import source.

## Change rule

Receiving changes should not be considered complete until:
- database rule exists where integrity matters,
- UI exposes the function,
- RLS/role permissions are respected,
- audit/history is written when appropriate,
- Vercel build is green,
- the relevant end-to-end test above passes.
