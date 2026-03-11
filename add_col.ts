import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
    try {
        await sql`ALTER TABLE updates ADD COLUMN IF NOT EXISTS is_must_read boolean NOT NULL DEFAULT false;`;
        console.log("Successfully added is_must_read column to updates table.");
    } catch (err) {
        console.error("Error updating schema:", err);
    } finally {
        process.exit(0);
    }
}
main();
