// =================================================================
// ADMIN.JS - LÓGICA DE LOGIN Y EDICIÓN DE DATOS EN LOCALSTORAGE
// =================================================================
// --- CONSTANTES ---
const TIER_OPTIONS = ["CHALLENGER", "GRANDMASTER", "MASTER", "DIAMOND", "EMERALD", "PLATINUM", "GOLD", "SILVER", "BRONZE", "IRON", "UNRANKED"];
const RANK_OPTIONS = ["I", "II", "III", "IV", ""];

// Mapas para la lógica de ordenación por Elo (copiados de script.js para independencia)
const TIER_ORDER = { "CHALLENGER": 8, "GRANDMASTER": 7, "MASTER": 6, "DIAMOND": 5, "EMERALD": 4, "PLATINUM": 3, "GOLD": 2, "SILVER": 1, "BRONZE": 0, "IRON": -1, "UNRANKED": -2, "SIN DATOS": -3 };
const RANK_ORDER = { "I": 4, "II": 3, "III": 2, "IV": 1, "": 0 };

// Credenciales (simuladas en front-end)
const ADMIN_USER = "duoq_master";
const ADMIN_PASS = "DuoQ!R4nkMaster24";
const DATA_STORAGE_KEY = 'duoq_ranking_data';

// --- ESTADO GLOBAL ---
let currentAdminData = []; // Almacena los datos de los jugadores cargados
let sortState = { // Almacena el estado actual de la ordenación
    column: 'nombre',
    direction: 'asc'
};

// --- FUNCIONES DE ALMACENAMIENTO DE DATOS ---

function getLocalData() {
    const dataString = localStorage.getItem(DATA_STORAGE_KEY);
    if (dataString) {
        return JSON.parse(dataString);
    }
    // Si no hay datos, cargar los datos por defecto del JSON (simulación)
    return fetch('ranks.json')
        .then(response => response.json())
        .catch(error => {
            console.error("Error al cargar ranks.json:", error);
            return [];
        });
}

function setLocalData(data) {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
}


// --- LÓGICA DE LOGIN ---

document.getElementById('login-button').addEventListener('click', () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('login-error');
    
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
        loginError.classList.add('hidden');
        loadAdminPanel();
    } else {
        loginError.classList.remove('hidden');
    }
});


// --- LÓGICA DE ADMINISTRACIÓN DE DATOS ---

function createSelectOption(value) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value || 'N/A';
    return option;
}

function sortAdminData() {
    const { column, direction } = sortState;
    const modifier = direction === 'asc' ? 1 : -1;

    currentAdminData.sort((a, b) => {
        if (column === 'nombre') {
            return a.nombre.localeCompare(b.nombre) * modifier;
        }

        if (column === 'elo') {
            const tierValueA = TIER_ORDER[a.tier.toUpperCase()] ?? -3;
            const tierValueB = TIER_ORDER[b.tier.toUpperCase()] ?? -3;
            if (tierValueA !== tierValueB) {
                return (tierValueB - tierValueA) * modifier;
            }

            const rankValueA = RANK_ORDER[a.rank.toUpperCase()] ?? 0;
            const rankValueB = RANK_ORDER[b.rank.toUpperCase()] ?? 0;
            if (rankValueA !== rankValueB) {
                return (rankValueB - rankValueA) * modifier;
            }

            return (b.lp - a.lp) * modifier;
        }

        return 0;
    });
}

function updateSortHeaders() {
    document.querySelectorAll('.admin-table th.sortable').forEach(th => {
        const sortKey = th.getAttribute('data-sort-by');
        th.style.fontWeight = 'normal';
        th.style.backgroundColor = '#6a1b9a'; // Color por defecto
        th.setAttribute('data-sort-direction', '');

        if (sortKey === sortState.column) {
            th.style.fontWeight = 'bold';
            th.style.backgroundColor = '#581483'; // Color más oscuro para el activo
            const arrow = sortState.direction === 'asc' ? ' ▲' : ' ▼';
            th.setAttribute('data-sort-direction', sortState.direction);
            // Usamos un span para el icono para no interferir con el `::after` si se usara para otra cosa
            th.innerHTML = `${th.textContent.replace(/ [▲▼]/, '')}<span class="sort-arrow">${arrow}</span>`;
        } else {
            th.innerHTML = th.textContent.replace(/ <span class="sort-arrow">[▲▼]<\/span>/, '');
        }
    });
}

function addSortEventListeners() {
    document.querySelectorAll('.admin-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort-by');
            
            if (sortState.column === column) {
                // Si es la misma columna, invertir la dirección
                sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                // Si es una nueva columna, ordenar por defecto
                sortState.column = column;
                sortState.direction = (column === 'nombre') ? 'asc' : 'desc'; // Nombres ASC, Elo DESC por defecto
            }
            
            renderAdminTable(); // Volver a renderizar la tabla con el nuevo orden
        });
    });
}

function renderAdminTable() {
    const memberFormsContainer = document.getElementById('member-forms-container');
    memberFormsContainer.innerHTML = ''; // Limpiar la tabla antes de redibujar

    // Ordenar los datos antes de renderizar
    sortAdminData();
    // Actualizar los indicadores en los encabezados
    updateSortHeaders();

    currentAdminData.forEach((member) => {
        const row = document.createElement('tr');

        // Celda de Nombre
        const nameCell = document.createElement('td');
        nameCell.setAttribute('data-label', 'Jugador');
        const profileLink = member.leagueOfGraphsUrl ? `<a href="${member.leagueOfGraphsUrl}" target="_blank">${member.nombre}</a>` : member.nombre;
        nameCell.innerHTML = `<span class="player-name">${profileLink}</span><span class="summoner-name">${member.summonerName}</span>`;
        row.appendChild(nameCell);

        // --- Selector de LIGA (Tier) ---
        const tierCell = document.createElement('td');
        tierCell.setAttribute('data-label', 'Liga');
        const tierSelect = document.createElement('select');
        tierSelect.id = `tier-${member.nombre}`;
        TIER_OPTIONS.forEach((tier) => {
            const option = createSelectOption(tier);
            if (tier.toUpperCase() === member.tier.toUpperCase()) {
                option.selected = true;
            }
            tierSelect.appendChild(option);
        });
        tierCell.appendChild(tierSelect);
        row.appendChild(tierCell);

        // --- Selector de DIVISIÓN (Rank) ---
        const rankCell = document.createElement('td');
        rankCell.setAttribute('data-label', 'División');
        const rankSelect = document.createElement('select');
        rankSelect.id = `rank-${member.nombre}`;
        RANK_OPTIONS.forEach((rank) => {
            const option = createSelectOption(rank);
            if (rank.toUpperCase() === member.rank.toUpperCase()) {
                option.selected = true;
            }
            rankSelect.appendChild(option);
        });
        rankCell.appendChild(rankSelect);
        row.appendChild(rankCell);

        // --- Input de LP ---
        const lpCell = document.createElement('td');
        lpCell.setAttribute('data-label', 'LP');
        const lpInput = document.createElement('input');
        lpInput.type = 'number';
        lpInput.min = 0;
        lpInput.max = 100;
        lpInput.id = `lp-${member.nombre}`;
        lpInput.value = member.lp || 0;
        lpCell.appendChild(lpInput);
        row.appendChild(lpCell);

        memberFormsContainer.appendChild(row);
    });
}

async function loadAdminPanel() {
    const memberFormsContainer = document.getElementById('member-forms-container');
    memberFormsContainer.innerHTML = '<tr><td colspan="4">Cargando datos...</td></tr>';
    
    // Obtenemos los datos y los guardamos en el estado global
    currentAdminData = await getLocalData();
    
    // Renderizar la tabla por primera vez
    renderAdminTable();

    // Añadir los listeners para la ordenación
    addSortEventListeners();
}


// --- LÓGICA DE GUARDADO ---

document.getElementById('save-button').addEventListener('click', async () => {
    const newData = currentAdminData.map(member => {
        const tierSelect = document.getElementById(`tier-${member.nombre}`);
        const rankSelect = document.getElementById(`rank-${member.nombre}`);
        const lpInput = document.getElementById(`lp-${member.nombre}`);
        
        if (tierSelect && rankSelect && lpInput) {
            // Se actualiza el objeto con los nuevos valores del formulario
            return {
                ...member,
                tier: tierSelect.value,
                rank: rankSelect.value,
                lp: parseInt(lpInput.value, 10) || 0,
            };
        }
        return member; // Devolver el miembro sin cambios si no se encuentran los inputs
    });
    
    // Guardar los datos actualizados en el LocalStorage
    setLocalData(newData);

    const saveMessage = document.getElementById('save-message');
    saveMessage.textContent = '¡Datos Guardados! Recargando ranking principal...';
    saveMessage.classList.remove('hidden');
    saveMessage.classList.add('success');
    
    // Opcional: Recargar la página principal (index.html) después de un pequeño retraso
    setTimeout(() => {
        window.location.href = 'index.html'; 
    }, 1500); 
});

// Inicializar la carga si ya estaba logueado (aunque el login simple no lo recuerda)
// Dejamos que el botón de login maneje la carga.