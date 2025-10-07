// =================================================================
// SCRIPT.JS - CÓDIGO FINAL DE CLIENTE (INTENTO DE LEAGUE OF GRAPHS)
// =================================================================

const REGION = "euw"; // LoG usa "euw" en minúsculas en su endpoint.

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
 * Obtiene la información del rango, incluyendo LP, de LoG.
 * FALLARÁ EN LIVE SERVER POR EL BLOQUEO CORS.
 */
async function getSummonerRank(summonerName) {
    if (!summonerName) return null;

    // Endpoint de la API interna de League of Graphs
    const LOG_API_URL = `https://www.leagueofgraphs.com/api/summoner/${REGION}/${summonerName}`;
    
    try {
        const response = await fetch(LOG_API_URL);
        
        // Bloqueo CORS/Fallo de red ocurrirá aquí en Live Server.
        if (!response.ok) {
            console.error(`Error ${response.status} o CORS al buscar rango en LoG para ${summonerName}.`);
            return { tier: "FALLO API", rank: "", lp: 0 };
        }
        
        const data = await response.json();
        
        // LoG suele devolver un objeto de 'soloQueue'.
        const soloDuoEntry = data.soloQueue; 

        if (!soloDuoEntry || !soloDuoEntry.tier) {
             return { tier: "UNRANKED", rank: "", lp: 0 }; 
        }

        // LoG devuelve el rango como "DIAMOND IV"
        const [tier, rank] = soloDuoEntry.tier.toUpperCase().split(' ');
        
        // LP se encuentra en otro campo. Si es sin rank (ej. Master+), solo devolvemos los LP.
        const lp = soloDuoEntry.leaguePoints || 0;

        return { 
            tier: tier,
            rank: rank || "", // Puede que no haya rank (e.g., Challenger)
            lp: lp
        };

    } catch (error) {
        console.error("Error crítico en getSummonerRank (LoG directo):", error);
        return { tier: "FALLO RED", rank: "", lp: 0 }; 
    }
}


// --- LÓGICA DE CLASIFICACIÓN Y ORDENACIÓN (CON LP) ---

const TIER_ORDER = {
    "CHALLENGER": 8, "GRANDMASTER": 7, "MASTER": 6, "DIAMOND": 5, "EMERALD": 4, 
    "PLATINUM": 3, "GOLD": 2, "SILVER": 1, "BRONZE": 0, "IRON": -1, 
    "UNRANKED": -2, "FALLO API": -3, "FALLO RED": -4
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

        // 1. Compara Tier
        if (valorActual > valorMejor) {
            mejor = actual;
        // 2. Compara Rank (División) si Tier es igual
        } else if (valorActual === valorMejor) {
            const divisionMejor = RANK_ORDER[mejor.rango.rank] || 0;
            const divisionActual = RANK_ORDER[actual.rango.rank] || 0;
            if (divisionActual > divisionMejor) {
                mejor = actual;
            // 3. Compara LP si Tier y Rank son iguales
            } else if (divisionActual === divisionMejor) {
                 if (actual.rango.lp > mejor.rango.lp) {
                    mejor = actual;
                 }
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
            
            const rankData = await getSummonerRank(miembro.summonerName); 
            
            // Ejemplo: "DIAMOND IV (25 LP)"
            miembro.rangoDisplay = `${rankData.tier || 'UNRANKED'} ${rankMapDisplay[rankData.rank] || ''} ${rankData.lp > 0 ? `(${rankData.lp} LP)` : ''}`; 
            
            resultadosMiembros.push({
                nombre: miembro.nombre,
                rango: rankData
            });
        }
        
        const mejorMiembro = determinarMejorRango(resultadosMiembros);
        pareja.rankingData.mejorMiembro = mejorMiembro;
        
        // Display del mejor rango para la pareja: "DIAMOND IV (25 LP)"
        const mejorRangoDisplay = `${mejorMiembro.rango.tier} ${rankMapDisplay[mejorMiembro.rango.rank] || ''} ${mejorMiembro.rango.lp > 0 ? `(${mejorMiembro.rango.lp} LP)` : ''}`;
        pareja.rankingData.rangoCalculado = `${mejorRangoDisplay} (${mejorMiembro.nombre})`;
        
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
        
        // Desempate por LP
        return rangoB.lp - rangoA.lp;
    });
}


function mostrarRankingEnTabla(parejasOrdenadas) {
    const tbody = document.getElementById('ranking-body');
    tbody.innerHTML = ''; 

    parejasOrdenadas.forEach((pareja, index) => {
        const miembro1 = pareja.miembros[0];
        const miembro2 = pareja.miembros[1];
        
        const nuevaFila = document.createElement('tr');
        nuevaFila.innerHTML = `
            <td>${index + 1}</td> 
            <td>${pareja.pareja}</td>
            <td><strong>${pareja.rankingData.rangoCalculado}</strong></td>
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