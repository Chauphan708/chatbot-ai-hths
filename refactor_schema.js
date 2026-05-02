import fs from 'fs';
import path from 'path';

const schemaPath = path.resolve('server/src/db/schema.ts');
let content = fs.readFileSync(schemaPath, 'utf-8');

// 1. Remove uuid from imports if present
content = content.replace(/uuid,\s*/g, '');

// 2. Replace id: uuid("id").defaultRandom().primaryKey() with text("id").primaryKey().$defaultFn(() => crypto.randomUUID())
content = content.replace(/uuid\("id"\)\.defaultRandom\(\)\.primaryKey\(\)/g, 'text("id").primaryKey().$defaultFn(() => crypto.randomUUID())');

// 3. Replace all other uuid("xxx") with text("xxx")
content = content.replace(/uuid\("([^"]+)"\)/g, 'text("$1")');

// 4. Import crypto if not present
if (!content.includes('import crypto')) {
  content = 'import crypto from "node:crypto";\n' + content;
}

fs.writeFileSync(schemaPath, content, 'utf-8');
console.log('Schema updated successfully.');
