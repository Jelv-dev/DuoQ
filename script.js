// =================================================================
// SCRIPT.JS - VERSIÓN FINAL ESTABLE CON MEJORAS VISUALES Y LP
// =================================================================

// --- MAPAS GLOBALES PARA LÓGICA Y VISUALIZACIÓN ---

const TIER_ORDER = {
    "CHALLENGER": 8, "GRANDMASTER": 7, "MASTER": 6, "DIAMOND": 5, "EMERALD": 4,
    "PLATINUM": 3, "GOLD": 2, "SILVER": 1, "BRONZE": 0, "IRON": -1,
    "UNRANKED": -2, "SIN DATOS": -3
};

const RANK_ORDER = { "I": 4, "II": 3, "III": 2, "IV": 1, "": 0 };
const rankMapDisplay = { "I": "I", "II": "II", "III": "III", "IV": "IV", "": "" };

// NUEVO: Mapeo de Emojis para iconos de liga y podio
const TIER_ICON = {
    "CHALLENGER": '👑', "GRANDMASTER": '⚡', "MASTER": '⭐', "DIAMOND": '💎', "EMERALD": '💚',
    "PLATINUM": '🛡️', "GOLD": '🥇', "SILVER": '🥈', "BRONZE": '🥉', "IRON": '⚙️',
    "UNRANKED": '❓', "SIN DATOS": '❓'
};

const PODIUM_ICON = { 1: '🏆', 2: '🥈', 3: '🥉', 4: '💩' };


// --- ESTRUCTURA DE PAREJAS ---

const parejasRanking = [
    { pareja: "PLATERO Y NYRO", miembros: [{ nombre: "PLATERO" }, { nombre: "NYRO" }], rankingData: {} },
    { pareja: "EMILIANO Y LASO", miembros: [{ nombre: "EMILIANO" }, { nombre: "LASO" }], rankingData: {} },
    { pareja: "PRIE Y MASTERPAOLO", miembros: [{ nombre: "PRIE" }, { nombre: "MASTERPAOLO" }], rankingData: {} },
    { pareja: "ALBAN Y BAKAIK", miembros: [{ nombre: "ALBAN" }, { nombre: "BAKAIK" }], rankingData: {} }
];


// --- LECTURA DE DATOS (DESDE FIREBASE) ---

// Pega aquí la misma configuración de Firebase que en admin.js
const firebaseConfig = {
  // Esta es tu configuración real de Firebase.
  apiKey: "AIzaSyCRXbOEAp1QafN_EGyEdWGZXxbeXy0aZE4",
  authDomain: "duoq-ranking-final.firebaseapp.com",
  databaseURL: "https://duoq-ranking-final-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "duoq-ranking-final",
  storageBucket: "duoq-ranking-final.firebasestorage.app",
  messagingSenderId: "834663193099",
  appId: "1:834663193099:web:32095cc8cedd420143c50e",
  measurementId: "G-H0RERB82FJ"
};

// Inicializar Firebase (de forma segura, para evitar errores de doble inicialización)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

async function fetchRankData() {
    try {
        console.log("Cargando datos desde Firebase...");
        const snapshot = await database.ref('/').once('value');
        const data = snapshot.val();
        const dataArray = data ? Object.values(data) : [];

        const rankMap = {};
        dataArray.forEach(entry => {
            rankMap[entry.nombre] = {
                ...entry, // Copiamos todas las propiedades
                tier: entry.tier.toUpperCase(),
                rank: entry.rank.toUpperCase(),
                lp: entry.lp || 0
            };
        });
        return rankMap;
    } catch (error) {
        console.error("Fallo en la lectura de datos desde Firebase:", error);
        return null;
    }
}


// --- LÓGICA DE PROCESAMIENTO ---

function determinarMejorRango(miembros) {
    // Usamos reduce para encontrar el mejor miembro de una forma más funcional y legible
    return miembros.reduce((mejor, actual) => {
        const valorMejor = TIER_ORDER[mejor.rango.tier] ?? TIER_ORDER["SIN DATOS"];
        const valorActual = TIER_ORDER[actual.rango.tier] ?? TIER_ORDER["SIN DATOS"];

        if (valorActual > valorMejor) return actual;
        if (valorActual < valorMejor) return mejor;

        // Si los tiers son iguales, comparamos la división (rank)
        const divisionMejor = RANK_ORDER[mejor.rango.rank] ?? 0;
        const divisionActual = RANK_ORDER[actual.rango.rank] ?? 0;

        if (divisionActual > divisionMejor) return actual;
        if (divisionActual < divisionMejor) return mejor;

        // Si la división es la misma, comparamos por LP
        return actual.rango.lp > mejor.rango.lp ? actual : mejor;
    });
}

async function actualizarRanking(parejas) {
    const rankDataMap = await fetchRankData();

    if (!rankDataMap) {
        document.getElementById('ranking-body').innerHTML = `
    <tr>
        <td colspan="5" style="color: red; font-weight: bold; text-align: center;">ERROR: No se pudo cargar ranks.json. Revisa la consola para más detalles.</td>
    </tr>
    `;
        return [];
    }

    const parejasActualizadas = [];
    for (const pareja of parejas) {
        const resultadosMiembros = [];
        for (const miembro of pareja.miembros) {

            const rankData = rankDataMap[miembro.nombre] || { tier: "SIN DATOS", rank: "", lp: 0, summonerName: "N/A", leagueOfGraphsUrl: "#" };

            // Genera el display de rango con LP
            const lpDisplay = rankData.lp > 0 && rankData.tier !== "UNRANKED" ? `(${rankData.lp} LP)` : '';
            miembro.rangoDisplay = `${rankData.tier || 'UNRANKED'} ${rankMapDisplay[rankData.rank] || ''} ${lpDisplay}`;

            // Adjunta datos al miembro para su uso posterior
            miembro.leagueOfGraphsUrl = rankData.leagueOfGraphsUrl;
            miembro.summonerName = rankData.summonerName;

            resultadosMiembros.push({
                nombre: miembro.nombre,
                rango: rankData
            });
        }

        const mejorMiembro = determinarMejorRango(resultadosMiembros);
        pareja.rankingData.mejorMiembro = mejorMiembro;

        // Genera el display del MEJOR rango para la pareja
        const mejorLpDisplay = mejorMiembro.rango.lp > 0 && mejorMiembro.rango.tier !== "UNRANKED" ?
            `(${mejorMiembro.rango.lp} LP)` : '';
        const mejorRangoDisplay = `${TIER_ICON[mejorMiembro.rango.tier] || TIER_ICON['SIN DATOS']}
    ${mejorMiembro.rango.tier} ${rankMapDisplay[mejorMiembro.rango.rank] || ''} ${mejorLpDisplay}`;

        pareja.rankingData.rangoCalculado = `${mejorRangoDisplay} (${mejorMiembro.nombre})`;

        parejasActualizadas.push(pareja);
    }
    return parejasActualizadas;
}

function ordenarRanking(parejas) {
    return parejas.sort((parejaA, parejaB) => {
        const rangoA = parejaA.rankingData.mejorMiembro.rango;
        const rangoB = parejaB.rankingData.mejorMiembro.rango;
        const valorTierA = TIER_ORDER[rangoA.tier] ?? TIER_ORDER["SIN DATOS"];
        const valorTierB = TIER_ORDER[rangoB.tier] ?? TIER_ORDER["SIN DATOS"];

        if (valorTierA !== valorTierB) return valorTierB - valorTierA;

        const valorRankA = RANK_ORDER[rangoA.rank] ?? 0;
        const valorRankB = RANK_ORDER[rangoB.rank] ?? 0;
        if (valorRankA !== valorRankB) return valorRankB - valorRankA;

        // Desempate final por LP
        return rangoB.lp - rangoA.lp;
    });
}


// --- VISUALIZACIÓN EN LA TABLA ---

function mostrarRankingEnTabla(parejasOrdenadas) {
    const tbody = document.getElementById('ranking-body');
    if (!tbody || tbody.innerHTML.includes("ERROR")) return;

    tbody.innerHTML = '';

    parejasOrdenadas.forEach((pareja, index) => {
        const puesto = index + 1;

        // NUEVO: Determinar el icono del podio (solo 1, 2, 3)
        const podium = PODIUM_ICON[puesto] || puesto;

        // Determinar quién es miembro 1 y quién es miembro 2 (para que el mejor rango aparezca primero)
        const mejorNombre = pareja.rankingData.mejorMiembro.nombre;
        const miembro1 = pareja.miembros.find(m => m.nombre === mejorNombre) || pareja.miembros[0];
        const miembro2 = pareja.miembros.find(m => m.nombre !== mejorNombre) || pareja.miembros[1];

        const miembro1Link = `<a href="${miembro1.leagueOfGraphsUrl}" target="_blank" class="player-link">${miembro1.nombre}</a>`;
        const miembro2Link = `<a href="${miembro2.leagueOfGraphsUrl}" target="_blank" class="player-link">${miembro2.nombre}</a>`;

        const nuevaFila = document.createElement('tr');
        nuevaFila.innerHTML = `
    <td>${podium}</td>
    <td>${pareja.pareja}</td>
    <td><strong>${pareja.rankingData.rangoCalculado}</strong></td>
    <td>${miembro1Link} (${miembro1.summonerName || 'N/A'}) - ${miembro1.rangoDisplay || 'Cargando...'}</td>
    <td>${miembro2Link} (${miembro2.summonerName || 'N/A'}) - ${miembro2.rangoDisplay || 'Cargando...'}</td>
    `;

        tbody.appendChild(nuevaFila);
    });
}


// FUNCIÓN DE INICIO PRINCIPAL
async function inicializarRanking() {
    const rankingCalculado = await actualizarRanking(parejasRanking);
    if (rankingCalculado.length > 0) {
        const rankingOrdenado = ordenarRanking(rankingCalculado);
        mostrarRankingEnTabla(rankingOrdenado);
    }
}


// Ejecutar la función principal cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', inicializarRanking);
