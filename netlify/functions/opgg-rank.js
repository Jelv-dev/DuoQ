// netlify/functions/opgg-rank.js
const fetch = require('node-fetch'); // Netlify ya tiene node-fetch disponible

// Este código SOLO se ejecuta en el servidor de Netlify.
exports.handler = async (event) => {
    const { name, region } = event.queryStringParameters;

    if (!name || !region) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Faltan parámetros.' }) };
    }

    // URL de la API de OP.GG
    const OP_GG_API_URL = `https://op.gg/api/v1.0/internal/bypass/summoners/${region}/by-name/${name}`;

    try {
        const response = await fetch(OP_GG_API_URL, {
            // No enviamos un User-Agent, lo que ayuda a evitar bloqueos
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            return { statusCode: response.status, body: JSON.stringify({ error: `Fallo al buscar en OP.GG, código: ${response.status}` }) };
        }

        const data = await response.json();
        
        // Procesar y limpiar los datos de rango (Solo/Duo)
        const soloDuoEntry = data.data.league_stats.find(entry => entry.queue_info.queue_translate === "Ranked Solo");

        let result = { tier: "UNRANKED", rank: "" };

        if (soloDuoEntry) {
            result = {
                tier: soloDuoEntry.tier.toUpperCase(),
                rank: soloDuoEntry.division.toUpperCase()
            };
        }
        
        // Devolver los datos limpios al front-end
        return { statusCode: 200, body: JSON.stringify(result) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Error interno del servidor proxy.' }) };
    }
};