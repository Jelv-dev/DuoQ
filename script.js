// =================================================================
// SCRIPT.JS - CÓDIGO FINAL DE CLIENTE (LLAMANDO AL PROXY DE NETLIFY)
// =================================================================

// La URL donde Netlify aloja nuestra función
const NETLIFY_FUNCTION_URL = '/.netlify/functions/opgg-rank'; 
const REGION = "euw"; 

const parejasRanking = [
    {
        pareja: "PLATERO Y NYRO",
        miembros: [
            { nombre: "PLATERO", summonerName: "NasusSanchez" },
            { nombre: "NYRO", summonerName: "fREEaBALOS" }
        ],
        rankingData: { mejorMiembro: null, rangoCalculado: "SIN DATOS" }
    },
    {
        pareja: "EMILIANO Y LASO",
        miembros: [
            { nombre: "EMILIANO", summonerName: "AntonioAlcántara" },
            { nombre: "LASO", summonerName: "DON PABLO" }
        ],
        rankingData: { mejorMiembro: null, rangoCalculado: "SIN DATOS" }
    },
    {
        pareja: "PRIE Y MASTERPAOLO",
        miembros: [
            { nombre: "PRIE", summonerName: "Jacob Nieto" },
            { nombre: "MASTERPAOLO", summonerName: "LuisAlcaldeCalvo" }
        ],
        rankingData: { mejorMiembro: null, rangoCalculado: "SIN DATOS" }
    },
    {
        pareja: "ALBAN Y BAKAIK",
        miembros: [
            { nombre: "ALBAN", summonerName: "thatwasepic" },
            { nombre: "BAKAIK", summonerName: "gpe" }
        ],
        rankingData: { mejorMiembro: null, rangoCalculado: "SIN DATOS" }
    }
];


/**
 * Obtiene la información del rango de Solo/Duo Queue llamando a la Netlify Function.
 */
async function getSummonerRank(summonerName) {
    if (!summonerName) return { tier: "ERROR", rank: "" };

    const PROXY_URL = `${NETLIFY_FUNCTION_URL}?name=${encodeURIComponent(summonerName)}&region=${REGION}`;

    try {
        const response = await fetch(PROXY_URL);
        
        if (!response.ok) {
            console.error(`Error ${response.status} al llamar a Netlify Function.`);
            return { tier: "ERROR API", rank: "" };
        }
        
        const rankData = await response.json();
        
        if (rankData.error) {
            console.error("Error devuelto por la función:", rankData.error);
            return { tier: "ERROR PROXY", rank: "" };
        }

        return { 
            tier: rankData.tier || "UNRANKED",
            rank: rankData.rank || ""
        };

    } catch (error) {
        console.error("Error de red o CORS:", error);
        return { tier: "FALLO RED", rank: "" }; 
    }
}


// --- LÓGICA DE CLASIFICACIÓN, ORDENACIÓN Y VISUALIZACIÓN (IDÉNTICA A LA VERSIÓN FUNCIONAL) ---

const TIER_ORDER = {
    "CHALLENGER": 8, "GRANDMASTER": 7, "MASTER": 6, "DIAMOND": 5, "EMERALD": 4, 
    "PLATINUM": 3, "GOLD": 2, "SILVER": 1, "BRONZE": 0, "IRON": -1, 
    "UNRANKED": -2, "ERROR API": -3, "ERROR PROXY": -4, "FALLO RED": -5
};

const RANK_ORDER = {
    "I": 4, "II": 3, "III": 2, "IV": 1, "": 0 
};

const rankMapDisplay = { "I": "I", "II": "II", "III": "III", "IV": "IV", "": "" };


function determinarMejorRango(miembros) {
    let mejor = miembros[0];
    for (let i = 1; i < miembros.length; i++) {
        const actual = miembros[i];
        const valorMejor = TIER_ORDER[mejor.rango.tier] || TIER_ORDER["FALLO RED"];
        const valorActual = TIER_ORDER[actual.rango.tier] || TIER_ORDER["FALLO RED"];
        if (valorActual > valorMejor) {
            mejor = actual;
        } else if (valorActual === valorMejor) {
            const divisionMejor = RANK_ORDER[mejor.rango.rank] || 0;
            const divisionActual = RANK_ORDER[actual.rango.rank] || 0;
            if (divisionActual > divisionMejor) {
                mejor = actual;
            }
        }
    }
    return mejor;
}

async function actualizarRanking(parejas) {
    const parejasActualizadas = [];
    for (const pareja of parejas) {
        const resultadosMiembros = [];
        for (const miembro of pareja.miembros) {
            
            // LLAMADA AL PROXY DE NETLIFY
            const rankData = await getSummonerRank(miembro.summonerName); 
            
            miembro.rangoDisplay = `${rankData.tier || 'UNRANKED'} ${rankMapDisplay[rankData.rank] || ''}`; 
            
            resultadosMiembros.push({
                nombre: miembro.nombre,
                rango: rankData
            });
        }
        
        const mejorMiembro = determinarMejorRango(resultadosMiembros);
        pareja.rankingData.mejorMiembro = mejorMiembro;
        pareja.rankingData.rangoCalculado = `${mejorMiembro.rango.tier} ${mejorMiembro.rango.rank} (${mejorMiembro.nombre})`;
        
        parejasActualizadas.push(pareja);
    }
    return parejasActualizadas;
}


function ordenarRanking(parejas) {
    return parejas.sort((parejaA, parejaB) => {
        const rangoA = parejaA.rankingData.mejorMiembro.rango;
        const rangoB = parejaB.rankingData.mejorMiembro.rango;
        const valorTierA = TIER_ORDER[rangoA.tier] || TIER_ORDER["FALLO RED"];
        const valorTierB = TIER_ORDER[rangoB.tier] || TIER_ORDER["FALLO RED"];

        if (valorTierA !== valorTierB) {
            return valorTierB - valorTierA; 
        }

        const valorRankA = RANK_ORDER[rangoA.rank] || 0;
        const valorRankB = RANK_ORDER[rangoB.rank] || 0;

        if (valorRankA !== valorRankB) {
            return valorRankB - valorRankA;
        }

        return 0;
    });
}


function mostrarRankingEnTabla(parejasOrdenadas) {
    const tbody = document.getElementById('ranking-body');
    tbody.innerHTML = ''; 

    parejasOrdenadas.forEach((pareja, index) => {
        const miembro1 = pareja.miembros[0];
        const miembro2 = pareja.miembros[1];
        const mejorRango = pareja.rankingData.mejorMiembro.rango;
        
        const rangoPareja = `${mejorRango.tier || 'SIN DATOS'} ${rankMapDisplay[mejorRango.rank] || ''}`;
        
        const nuevaFila = document.createElement('tr');
        nuevaFila.innerHTML = `
            <td>${index + 1}</td> 
            <td>${pareja.pareja}</td>
            <td><strong>${rangoPareja}</strong> (${pareja.rankingData.mejorMiembro.nombre})</td>
            <td>${miembro1.nombre} - ${miembro1.rangoDisplay || 'Cargando...'}</td>
            <td>${miembro2.nombre} - ${miembro2.rangoDisplay || 'Cargando...'}</td>
        `;

        tbody.appendChild(nuevaFila);
    });
}


// FUNCIÓN DE INICIO PRINCIPAL
async function inicializarRanking() {
    const rankingCalculado = await actualizarRanking(parejasRanking);
    const rankingOrdenado = ordenarRanking(rankingCalculado);
    mostrarRankingEnTabla(rankingOrdenado); 
}


// Ejecutar la función principal cuando el script carga
inicializarRanking();