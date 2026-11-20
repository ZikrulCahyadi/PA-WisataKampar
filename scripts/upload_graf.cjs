const fs = require('fs');

const SUPABASE_URL = 'https://qoeriziycarbbyvnyzdd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvZXJpeml5Y2FyYmJ5dm55emRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMzYxNDAsImV4cCI6MjA5NDcxMjE0MH0.pCu_SUZnNvvxFNtpIV2argtYKasTA71OPYWFdZ-rgXw';

async function upload() {
  const edges = JSON.parse(fs.readFileSync('scripts/generated_graf.json', 'utf8'));
  console.log(`Uploading ${edges.length} graph edges to Supabase...`);

  // 1. Delete all existing records in `graf`
  console.log('Clearing existing graf table...');
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/graf?id_graf=gt.0`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });
  console.log('Delete status:', delRes.status);

  // 2. Insert in batches of 40
  const batchSize = 40;
  for (let i = 0; i < edges.length; i += batchSize) {
    const batch = edges.slice(i, i + batchSize);
    console.log(`Inserting batch ${i / batchSize + 1}... (${batch.length} items)`);
    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/graf`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(batch)
    });

    if (!insRes.ok) {
      const errText = await insRes.text();
      console.error(`Error inserting batch:`, errText);
      return;
    }
  }

  // 3. Verify final count
  const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/graf?select=id_graf`, {
    headers: { apikey: SUPABASE_KEY }
  });
  const data = await verifyRes.json();
  console.log(`Verification complete! Total edges in database: ${data.length}`);
}

upload().catch(console.error);

