import { clearTenantData, initStorage } from './store.js';

const tenantId = process.argv[2] ?? process.env.TENANT_ID ?? 'default';

if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
  console.error('Tenant ID must be alphanumeric with hyphens/underscores only.');
  process.exit(1);
}

await initStorage();
await clearTenantData(tenantId);
console.log(`Cleared ARR import/review data for tenant "${tenantId}".`);
