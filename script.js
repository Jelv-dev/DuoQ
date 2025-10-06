// Tarea 1.2: Estructura de datos de las parejas con Nombres de Invocador reales.

// NOTA IMPORTANTE: Para usar la Riot API, necesitamos la clave y la región.
// Usaremos EUW para todos.
const REGION = "euw1"; 
const API_KEY = "RGAPI-19f2e74a-09e9-489c-9787-c44219ae7d50"; // <<<<<< REEMPLAZA ESTO CON TU CLAVE REAL DE RIOT

const parejasRanking = [
    {
        pareja: "PLATERO Y NYRO",
        miembros: [
            { nombre: "PLATERO", summonerName: "NasusSanchez", tagLine: "Dogy" },
            { nombre: "NYRO", summonerName: "fREEaBALOS", tagLine: "PSOE" }
        ],
        rankingData: { mejorMiembro: null, rangoCalculado: "SIN DATOS" }
    },
    {
        pareja: "EMILIANO Y LASO",
        miembros: [
            { nombre: "EMILIANO", summonerName: "AntonioAlcántara", tagLine: "5377" },
            { nombre: "LASO", summonerName: "DON PABLO", tagLine: "winer" }
        ],
        rankingData: { mejorMiembro: null, rangoCalculado: "SIN DATOS" }
    },
    {
        pareja: "PRIE Y MASTERPAOLO",
        miembros: [
            { nombre: "PRIE", summonerName: "Jacob Nieto", tagLine: "PAL" },
            { nombre: "MASTERPAOLO", summonerName: "LuisAlcaldeCalvo", tagLine: "1325" }
        ],
        rankingData: { mejorMiembro: null, rangoCalculado: "SIN DATOS" }
    },
    {
        pareja: "ALBAN Y BAKAIK",
        miembros: [
            { nombre: "ALBAN", summonerName: "thatwasepic", tagLine: "XOKAS" },
            { nombre: "BAKAIK", summonerName: "gpe", tagLine: "38210" }
        ],
        rankingData: { mejorMiembro: null, rangoCalculado: "SIN DATOS" }
    }
];
// *********************************************************************************
// COMIENZA LA FASE 2: LÓGICA DE ACCESO Y CÁLCULO (T2.1, T2.2, T2.3)
// *********************************************************************************

// T2.1: Funciones de Petición a la API (API de Cuentas y API de Ligas)

/**
 * Obtiene el ID único de la cuenta (PUUID) usando el nombre y el tagline.
 * @param {string} summonerName - El nombre de invocador.
 * @param {string} tagLine - El tagline.
 * @returns {Promise<string>} - El PUUID del invocador.
 */
async function getPuuid(summonerName, tagLine) {
    // Usamos 'europe' para la API de cuentas.
    const ACCOUNT_API_URL = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tagLine}?api_key=${API_KEY}`;
    
    try {
        const response = await fetch(ACCOUNT_API_URL);
        if (!response.ok) {
            console.error(`Error ${response.status} al buscar PUUID para ${summonerName}. Revisa mayúsculas/minúsculas y clave.`);
            return null;
        }
        const data = await response.json();
        return data.puuid;
    } catch (error) {
        console.error("Error en getPuuid:", error);
        return null; 
    }
}

/**
 * Obtiene la información del rango de Solo/Duo Queue usando el PUUID.
 * @param {string} puuid - El ID único del invocador.
 * @returns {Promise<object>} - Objeto con los datos del rango.
 */
async function getSummonerRank(puuid) {
    if (!puuid) return null;

    // Usamos la región EUW1 para la API de ligas.
    const LEAGUE_API_URL = `https://${REGION}.api.riotgames.com/lol/league/v4/entries/by-summoner/${puuid}?api_key=${API_KEY}`;

    try {
        const response = await fetch(LEAGUE_API_URL);
        if (!response.ok) {
            console.error(`Error ${response.status} al buscar rango para PUUID: ${puuid}`);
            return { tier: "ERROR", rank: "" };
        }
        const leagueEntries = await response.json();
        
        // Filtramos solo la cola de Solo/Duo (RANKED_SOLO_5x5)
        const soloDuoEntry = leagueEntries.find(entry => entry.queueType === "RANKED_SOLO_5x5");
        
        return soloDuoEntry || { tier: "UNRANKED", rank: "" }; // Devuelve UNRANKED si no tiene rankeado
    } catch (error) {
        console.error("Error en getSummonerRank:", error);
        return { tier: "ERROR", rank: "" }; 
    }
}


// T2.2: Lógica de Clasificación (Constantes de Orden y Función de Comparación)

// Constantes para asignar un valor numérico a las Ligas (Tiers)
const TIER_ORDER = {
    "CHALLENGER": 8, "GRANDMASTER": 7, "MASTER": 6, "DIAMOND": 5, "EMERALD": 4, 
    "PLATINUM": 3, "GOLD": 2, "SILVER": 1, "BRONZE": 0, "IRON": -1, 
    "UNRANKED": -2, "ERROR": -3
};

// Constantes para asignar un valor numérico a las Divisiones (Ranks: I, II, III, IV)
const RANK_ORDER = {
    "I": 4, "II": 3, "III": 2, "IV": 1, "": 0 
};

// Mapa para formatear el rango visualmente (usado en T3.2)
const rankMap = { "I": "I", "II": "II", "III": "III", "IV": "IV", "": "" };


/**
 * Compara dos miembros y devuelve el objeto del miembro con el mejor rango.
 */
function determinarMejorRango(miembros) {
    let mejor = miembros[0];

    for (let i = 1; i < miembros.length; i++) {
        const actual = miembros[i];

        const valorMejor = TIER_ORDER[mejor.rango.tier] || TIER_ORDER.ERROR;
        const valorActual = TIER_ORDER[actual.rango.tier] || TIER_ORDER.ERROR;

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

/**
 * Procesa todas las parejas, obtiene sus rangos de LoL y determina el mejor rango de cada dúo.
 */
async function actualizarRanking(parejas) {
    const parejasActualizadas = [];

    for (const pareja of parejas) {
        const resultadosMiembros = [];
        for (const miembro of pareja.miembros) {
            
            const puuid = await getPuuid(miembro.summonerName, miembro.tagLine);
            
            if (puuid) {
                const rankData = await getSummonerRank(puuid);
                
                // Guardamos el rango formateado en el objeto del miembro original para la T3.2
                miembro.rangoDisplay = `${rankData.tier || 'UNRANKED'} ${rankMap[rankData.rank] || ''}`; 
                
                resultadosMiembros.push({
                    nombre: miembro.nombre,
                    rango: rankData
                });
            } else {
                 resultadosMiembros.push({
                    nombre: miembro.nombre,
                    rango: { tier: "ERROR", rank: "" }
                });
                miembro.rangoDisplay = "ERROR";
            }
        }
        
        const mejorMiembro = determinarMejorRango(resultadosMiembros);
        
        pareja.rankingData.mejorMiembro = mejorMiembro;
        pareja.rankingData.rangoCalculado = `${mejorMiembro.rango.tier} ${mejorMiembro.rango.rank} (${mejorMiembro.nombre})`;
        
        parejasActualizadas.push(pareja);
    }
    
    return parejasActualizadas;
}


// T2.3: Función de Ordenación Final

/**
 * Ordena el array de parejas de mayor a menor rango (mejor a peor).
 */
function ordenarRanking(parejas) {
    return parejas.sort((parejaA, parejaB) => {
        const rangoA = parejaA.rankingData.mejorMiembro.rango;
        const rangoB = parejaB.rankingData.mejorMiembro.rango;

        // 1. Comparar la Liga (TIER)
        const valorTierA = TIER_ORDER[rangoA.tier];
        const valorTierB = TIER_ORDER[rangoB.tier];

        if (valorTierA !== valorTierB) {
            return valorTierB - valorTierA; 
        }

        // 2. Si la Liga es la misma, comparar la División (RANK)
        const valorRankA = RANK_ORDER[rangoA.rank] || 0;
        const valorRankB = RANK_ORDER[rangoB.rank] || 0;

        if (valorRankA !== valorRankB) {
            return valorRankB - valorRankA;
        }

        return 0; // Rangos iguales
    });
}


// T3.2: Función de Visualización del Ranking en la Tabla HTML

/**
 * Toma el array de parejas ordenado y lo inyecta en el cuerpo de la tabla HTML.
 */
function mostrarRankingEnTabla(parejasOrdenadas) {
    const tbody = document.getElementById('ranking-body');
    tbody.innerHTML = ''; // Limpiamos el contenido

    parejasOrdenadas.forEach((pareja, index) => {
        const miembro1 = pareja.miembros[0];
        const miembro2 = pareja.miembros[1];
        const mejorRango = pareja.rankingData.mejorMiembro.rango;
        
        const rangoPareja = `${mejorRango.tier || 'SIN DATOS'} ${rankMap[mejorRango.rank] || ''}`;
        
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

/**
 * Ejecuta el proceso completo: obtiene datos, calcula el ranking, ordena
 * y llama a la función de visualización.
 */
async function inicializarRanking() {
    // Si la clave es "xxxx", es un placeholder o está mal.
    if (API_KEY === "xxxx" || API_KEY.length < 5) { 
        document.getElementById('ranking-body').innerHTML = `
            <tr><td colspan="5" style="color: red; font-weight: bold;">ERROR: ¡Falta la clave API de Riot o es incorrecta! Sustitúyela en script.js.</td></tr>
        `;
        return; 
    }

    // 1. Obtener y calcular el mejor de la pareja
    const rankingCalculado = await actualizarRanking(parejasRanking);

    // 2. Ordenar el ranking final
    const rankingOrdenado = ordenarRanking(rankingCalculado);

    // 3. Mostrar el ranking en la web
    mostrarRankingEnTabla(rankingOrdenado); 
}


// Ejecutar la función principal cuando el script carga
inicializarRanking();

// *********************************************************************************
// COMIENZA LA FASE 2: LÓGICA DE ACCESO Y CÁLCULO (T2.1)
// *********************************************************************************

// Ahora vamos a la Tarea 2.1...