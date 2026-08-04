# Contract Renewal Checklist & Field Inheritance Guide

## Critical Fields That MUST Be Inherited in Renewals

### Always Inherit (Core Business Logic)
- ✅ `templateUsed` — template for PDF generation (VALIDATED)
- ✅ `tenantId` — same tenant continues
- ✅ `propertyId` — same property continues
- ✅ `paymentDay` — payment schedule consistency (VALIDATED)
- ✅ `waterIncluded` — utility terms
- ✅ `autoRenewal` — renewal policy
- ✅ `depositAmount` — reference for next deposit (no charge on renewal)

### Always Inherit (Legal Terms)
- ✅ `penaltyRules` — late payment penalties
- ✅ `depositReturnPolicy` — conditions for deposit return
- ✅ `terms` — general contract terms
- ✅ `convivanceRules` — house rules
- ✅ `landlordsInfo` — landlord contact info
- ✅ `utilities` — utilities info
- ✅ `inventory` — property inventory

### DON'T Inherit (New Instance Fields)
- ❌ `signedAt` — null until new contract is signed
- ❌ `documentUrl` — null until PDF is generated for new contract
- ❌ `createdAt` — use new timestamp
- ❌ `updatedAt` — use new timestamp
- ❌ `status` — always start as DRAFT

### User Override
- `representativeId` — use provided value, fallback to previous
- `monthlyRent` — explicitly provided in renewal request
- `durationMonths` — explicitly provided in renewal request
- `startDate` — calculated as day after previous contract ends
- `endDate` — calculated from startDate + durationMonths

## Validation Before Renewal

```javascript
const missingFields = [];
if (!previousContract.templateUsed) missingFields.push('templateUsed');
if (!previousContract.paymentDay) missingFields.push('paymentDay');
if (!previousContract.tenantId) missingFields.push('tenantId');
if (!previousContract.propertyId) missingFields.push('propertyId');

if (missingFields.length > 0) {
  throw new Error(`Cannot renew: Missing ${missingFields.join(', ')}`);
}
```

## Potential Future Issues to Watch

### 1. Template Nullability — RESUELTO
- **Problem**: Contracts without template assigned can't be renewed or generate PDFs
- **Fix**: `templateUsed` es NOT NULL (migración `make_template_required`); `createContract`
  resuelve una plantilla por defecto cuando no se indica.

### 1b. Plantilla que no corresponde al tipo de inmueble — RESUELTO
- **Problem**: un local comercial con la plantilla de casa habitación produce un contrato
  cuyo clausulado declara un destino falso ("uso de casa habitación").
- **Fix**: `ContractTemplate.propertyType` (null = agnóstica) + `resolveTemplateForProperty()`
  en contractService, que valida al crear y al renovar.
- **Auditoría**: `node scripts/audit-contract-templates.js [--fix]` reporta y corrige
  contratos sin plantilla o mal emparejados.

### 2. Representative Chain Breaking
- **Problem**: If representative is deleted, renewal can reference non-existent rep
- **Fix**: Cascade deletes or prevent rep deletion if contracts reference them
- **Current**: Falls back to previous contract's rep if not provided

### 3. Payment Day Inconsistency
- **Problem**: If paymentDay is NULL, payment schedule generation fails silently
- **Fix**: Validate paymentDay is in [1-31] before renewal
- **Current**: VALIDATED in renewContract()

### 4. Multi-Year Renewal Chains
- **Problem**: If renewal of renewal can't find templateUsed in grandparent
- **Fix**: Ensure every renewal inherits templateUsed (transitive property)
- **Current**: Should work but monitor

### 5. Stale Related Records
- **Problem**: Contracts with deleted properties/tenants can't be renewed
- **Fix**: Query with paranoid soft-deletes or enforce FK constraints
- **Current**: Assumes data integrity via FK

## Testing Checklist Before Production

- [ ] Try renewing a contract without templateUsed → should error
- [ ] Try renewing a contract with null paymentDay → should error
- [ ] Try renewing a contract without tenantId/propertyId → should error
- [ ] Verify PDF generation works for renewed contract
- [ ] Verify payment schedule is generated for renewal
- [ ] Verify representative is correctly assigned
- [ ] Test renewal of renewal (chain of renewals)

## Code Review Checklist for Future Contract Changes

When modifying contracts or adding new fields:
1. If field is business logic → add to inheritance list
2. If field is audit/metadata → don't inherit
3. If field is calculated → ensure calculation works in renewals
4. Always update validation list above
5. Add migration if field should be NOT NULL going forward
