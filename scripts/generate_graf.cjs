const fs = require('fs');

const SUPABASE_URL = 'https://qoeriziycarbbyvnyzdd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvZXJpeml5Y2FyYmJ5dm55emRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMzYxNDAsImV4cCI6MjA5NDcxMjE0MH0.pCu_SUZnNvvxFNtpIV2argtYKasTA71OPYWFdZ-rgXw';

// Haversine formula (km)
function haversine(a, b) {
  const R = 6371;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const la1 = a.latitude * Math.PI / 180;
  const la2 = b.latitude * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function getDrivingDistance(a, b) {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.longitude},${a.latitude};${b.longitude},${b.latitude}?overview=false`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'WisataKamparPA/1.0' } });
    const data = await res.json();
    if (data.routes && data.routes[0] && data.routes[0].distance) {
      const km = data.routes[0].distance / 1000;
      return Math.round(km * 10) / 10;
    }
  } catch (err) {
    // fallback
  }
  // Fallback: Haversine distance with 1.3 road winding multiplier
  const straight = haversine(a, b);
  return Math.round(straight * 1.3 * 10) / 10;
}

async function main() {
  console.log('Fetching wisata list...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/wisata?select=id_wisata,nama_wisata,latitude,longitude&order=id_wisata`, {
    headers: { apikey: SUPABASE_KEY }
  });
  const wisata = await res.json();
  console.log(`Loaded ${wisata.length} wisata destinations.`);

  // Create a map for quick lookup
  const wisataMap = {};
  wisata.forEach(w => wisataMap[w.id_wisata] = w);

  // Let's define the logical road corridors / edges between places.
  // In Kampar, road network connects adjacent sites along:
  // Corridor 1 (Hilir Kampar / XIII Koto Kampar - Candi Muara Takus & PLTA):
  // 1 (Candi Muara Takus), 14 (Sungai Kopu), 19 (Putri Kayangan), 4 (Sungai Osang), 6 (Ayu Tojun Gulamo),
  // 10 (Danau Rusa), 5 (Air Terjun Gulamo), 7 (Pulo Simo), 12 (Tepian Mahligai), 16 (Lubang Kolam), 59 (Ulu Kasok).
  
  // Corridor 2 (Pusat Kampar / Kuok & Bangkinang):
  // 27 (Lubuk Sati), 15 (Rumah Lontiok), 18 (Sungai Hijau), 17 (Stanum Resort), 47 (Islamic Center), 32 (Bukit Naang).
  
  // Corridor 3 (Kampar Timur / Jalan Raya Lintas Riau-Sumbar):
  // 46 (Masjid Jami' Air Tiris), 30 (Rumah Adat Bendang), 29 (Istana Kampa), 44 (Danau Bokuok).
  
  // Corridor 4 (Siak Hulu / Pekanbaru border):
  // 42 (Kasang Kulim Zoo), 41 (Labersa), 39 (Boombara).
  
  // Corridor 5 (Kampar Kiri / Selatan):
  // 13 (Air Terjun Batu Dinding), 45 (Batu Tilam).

  // Define edge pairs (undirected, will be stored as bidirectional):
  const plannedPairs = [
    // --- Cluster XIII Koto Kampar ---
    [14, 19], // Sungai Kopu <-> Air Terjun Putri Kayangan (Kapuran)
    [1, 14],  // Candi Muara Takus <-> Sungai Kopu
    [1, 4],   // Candi Muara Takus <-> Air Terjun Sungai Osang
    [4, 6],   // Sungai Osang <-> Ayu Tojun Gulamo
    [4, 5],   // Sungai Osang <-> Air Terjun Gulamo
    [4, 7],   // Sungai Osang <-> Air Terjun Pulo Simo
    [5, 10],  // Air Terjun Gulamo <-> Danau Rusa
    [5, 7],   // Air Terjun Gulamo <-> Air Terjun Pulo Simo
    [6, 7],   // Ayu Tojun Gulamo <-> Air Terjun Pulo Simo
    [10, 12], // Danau Rusa <-> Tepian Mahligai
    [12, 16], // Tepian Mahligai <-> Lubang Kolam
    [16, 59], // Lubang Kolam <-> Ulu Kasok
    [12, 59], // Tepian Mahligai <-> Ulu Kasok
    [7, 59],  // Pulo Simo <-> Ulu Kasok

    // --- Bridge: XIII Koto Kampar <-> Kuok ---
    [59, 27], // Ulu Kasok <-> Lubuk Sati (Jalan Lintas Riau - Sumbar)
    [59, 15], // Ulu Kasok <-> Rumah Lontiok Kuok
    [16, 27], // Lubang Kolam <-> Lubuk Sati

    // --- Cluster Kuok & Bangkinang ---
    [27, 15], // Lubuk Sati <-> Rumah Lontiok
    [15, 18], // Rumah Lontiok <-> Sungai Hijau (Salo)
    [18, 17], // Sungai Hijau <-> Stanum Resort
    [17, 47], // Stanum Resort <-> Islamic Center (Bangkinang Kota)
    [18, 47], // Sungai Hijau <-> Islamic Center
    [17, 32], // Stanum Resort <-> Bukit Naang
    [47, 32], // Islamic Center <-> Bukit Naang

    // --- Bridge: Bangkinang <-> Air Tiris ---
    [47, 46], // Islamic Center <-> Masjid Jami' Air Tiris
    [32, 46], // Bukit Naang <-> Masjid Jami' Air Tiris

    // --- Cluster Air Tiris, Kampa, Tambang ---
    [46, 30], // Masjid Jami' <-> Rumah Adat Kenegerian Bendang
    [46, 29], // Masjid Jami' <-> Istana Kampa
    [30, 29], // Rumah Adat Bendang <-> Istana Kampa
    [29, 44], // Istana Kampa <-> Danau Bokuok (Tambang)

    // --- Bridge: Tambang <-> Siak Hulu ---
    [44, 42], // Danau Bokuok <-> Kasang Kulim Zoo (Jalan Kubang Raya)

    // --- Cluster Siak Hulu ---
    [42, 41], // Kasang Kulim Zoo <-> Waterpark Labersa
    [41, 39], // Waterpark Labersa <-> Boombara Waterpark
    [42, 39], // Kasang Kulim Zoo <-> Boombara Waterpark

    // --- Cluster Kampar Kiri / Selatan & Bridges ---
    // Connect Tambang / Kampa southwards towards Lipat Kain / Kampar Kiri
    [44, 13], // Danau Bokuok <-> Air Terjun Batu Dinding (via Jalan Lintas Teluk Kuantan)
    [29, 13], // Istana Kampa <-> Air Terjun Batu Dinding
    [42, 13], // Kasang Kulim Zoo <-> Air Terjun Batu Dinding
    [13, 45], // Air Terjun Batu Dinding <-> Batu Tilam (Kampar Kiri Hulu)
    [6, 45],  // Ayu Tojun Gulamo <-> Batu Tilam (Perbatasan Barat Daya)
  ];

  console.log(`Planned ${plannedPairs.length} unique edges (${plannedPairs.length * 2} directed edges).`);

  // Verify graph connectivity using BFS
  const adj = {};
  wisata.forEach(w => adj[w.id_wisata] = []);
  plannedPairs.forEach(([u, v]) => {
    if (adj[u] && adj[v]) {
      adj[u].push(v);
      adj[v].push(u);
    } else {
      console.error(`Invalid pair: ${u} - ${v}`);
    }
  });

  // BFS from first node
  const startId = wisata[0].id_wisata;
  const visited = new Set([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const neighbor of adj[cur]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  console.log(`BFS visited ${visited.size} of ${wisata.length} nodes.`);
  if (visited.size !== wisata.length) {
    const unvisited = wisata.filter(w => !visited.has(w.id_wisata));
    console.error('Unvisited nodes:', unvisited.map(w => `${w.nama_wisata} (#${w.id_wisata})`));
    return;
  }
  console.log('Graph is 100% CONNECTED! Every destination can reach any other destination via Dijkstra.');

  // Now calculate distances using OSRM with delay to avoid rate limit
  const finalEdges = [];
  for (let i = 0; i < plannedPairs.length; i++) {
    const [u, v] = plannedPairs[i];
    const nodeA = wisataMap[u];
    const nodeB = wisataMap[v];
    const dist = await getDrivingDistance(nodeA, nodeB);
    console.log(`[${i+1}/${plannedPairs.length}] ${nodeA.nama_wisata} <-> ${nodeB.nama_wisata}: ${dist} km`);
    
    // Bidirectional edges
    finalEdges.push({ titik_awal: u, titik_tujuan: v, jarak: dist });
    finalEdges.push({ titik_awal: v, titik_tujuan: u, jarak: dist });

    // sleep 200ms
    await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync('scripts/generated_graf.json', JSON.stringify(finalEdges, null, 2));
  console.log(`Successfully generated ${finalEdges.length} directed edges in scripts/generated_graf.json.`);
}

main().catch(console.error);

