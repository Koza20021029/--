const socket = io();
// Removed mermaid

// DOM Elements
const lobbyScreen = document.getElementById('lobby');
const gameScreen = document.getElementById('game');
const joinSection = document.getElementById('join-section');
const waitingSection = document.getElementById('waiting-section');

const rulesModal = document.getElementById('rules-modal');
const openRulesBtn = document.getElementById('open-rules-btn');
const closeRulesBtn = document.getElementById('close-rules-btn');

const joinBtn = document.getElementById('join-btn');
const createBtn = document.getElementById('create-btn');
const startGameBtn = document.getElementById('start-game-btn');
const leaveLobbyBtn = document.getElementById('leave-lobby-btn');
const leaveGameBtn = document.getElementById('leave-game-btn');

const playerNameInput = document.getElementById('player-name');
const roomCodeInput = document.getElementById('room-code');
const displayRoomCode = document.getElementById('display-room-code');
const roleOptions = document.querySelectorAll('.role-option');
const lobbyPlayersList = document.getElementById('lobby-players-list');

const monthEl = document.getElementById('current-month');
const monthNameEl = document.getElementById('month-name');
const monthDescEl = document.getElementById('month-desc');
const nextMonthBtn = document.getElementById('next-month-btn');

const playersListEl = document.getElementById('players-list');
const logsEl = document.getElementById('logs');
const myStatusEl = document.getElementById('my-status');

const askBtn = document.getElementById('ask-btn');
const teachContainer = document.getElementById('teach-container');
const teachTargetSelect = document.getElementById('teach-target');
const teachBtn = document.getElementById('teach-btn');

// Chat UI
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatMessagesEl = document.getElementById('chat-messages');

// Avatar Creator
const avatarScreen = document.getElementById('avatar-screen');
const avatarBackBtn = document.getElementById('avatar-back-btn');
const avatarConfirmBtn = document.getElementById('avatar-confirm-btn');
const avatarRoleName = document.getElementById('avatar-role-name-label');

let selectedRole = 'elder';
let myId = null;
let currentDisplayedMonth = 0;
let pendingRoomAction = null;
let currentAvatarSelections = {};
let lightRaysInstance = null;
let prismaticBurstInstance = null;

const AVATAR_ROLE_LABELS = {
    elder: '資深工匠 — 為你的角色打造專屬外型',
    youth: '青年學徒(部落青年) — 為你的角色打造專屬外型',
    middle: '協商者(中年工匠) — 為你的角色打造專屬外型'
};


const scriptEvents = {
    2: {
        title: "【封山危機】遺忘儲備的代價",
        dialogues: [
            { role: "青年學徒(部落青年)", text: "糟了！我的 Avaka 原料用完了，但現在上山會觸犯禁忌……" },
            { role: "協商者(中年工匠)", text: "這就是為什麼老人家說 Kashyman 月要拼命存貨。現在你只能跟我去商店買尼龍繩，或者枯等一個月，看著進度落後。" }
        ],
        desc: "【飛魚禁令】部落灘頭已舉行招魚祭，整個月門戶關閉。為了尊重魚靈，所有男人禁止進入山林，無法執行「採集」！\n💡 提示：你可以請同區域的隊友使用「贈與」功能支援你材料。"
    },
    5: {
        title: "【梅雨腐蝕】時間與天氣的賽跑",
        dialogues: [
            { role: "系統", text: "天空陰雲密佈，突如其來的降雨讓你在灘頭曝曬的 Avaka 纖維陷入腐爛危機。" },
            { role: "耆老", text: "孩子，做船不能只看地上的麻，要看天上的雲。快收起來！" }
        ],
        desc: "【梅雨季節】為了保護放在灘頭的材料，擁有材料的玩家將在本月被自動扣除 1 AP 作為維護費。若 AP 不足，材料將會受潮損壞歸零！"
    },
    10: {
        title: "【禁忌之月】心理韌性的考驗",
        dialogues: [
            { role: "協商者(中年工匠)", text: "這就是『儀式時間』的邏輯。你得學會等待。如果你現在強行完工，這艘船在部落眼中將失去靈魂。" },
            { role: "青年學徒(部落青年)", text: "但我只剩兩個月就要結算了！如果不現在做，我怕來不及完成……" }
        ],
        desc: "【大凶之月】這是專門製作貝灰的月份，不允許造屋或落成禮。本月絕對無法執行「填縫（完工）」。\n💡 提示：趁這段時間多向長輩「請益」累積 KP 吧！"
    },
    12: {
        title: "【最終衝刺】祖先的祝福",
        dialogues: [
            { role: "系統", text: "這是屬於手工藝的月份。雖然時間緊迫，但你發現自己的手感前所未有的流暢。" },
            { role: "耆老", text: "看吧，只要你順應時序，土地會給你最後的補償。快動手，讓這條船趕在明年飛魚祭前下水！" }
        ],
        desc: "【技術精進】本月執行「捻線」工序將不再消耗任何 AP！請把握最後的機會完成拼板舟。"
    }
};

const GAME_RULES = [
    {name: "Kashyman", desc: "準備月: 移動不消耗 AP。"},
    {name: "Kapowan", desc: "飛魚禁令: 禁止進入山林，無法採集。"},
    {name: "Pikaokaod", desc: "捕撈飛魚盛期: 在灘頭執行工序 AP 消耗減 1。"},
    {name: "Papataw", desc: "男人勤於出海: 請益消耗 AP 加倍 (需 4 AP)。"},
    {name: "Pipilapila", desc: "梅雨季節: 請注意 AP 管理。"},
    {name: "Apiya vehan", desc: "好月節: 執行填縫額外 +2 分。"},
    {name: "Pehhakow", desc: "解禁重啟: 山林開放，採集獲 2 份材料。"},
    {name: "Pitanatana", desc: "土器月: 科學轉譯必成功 (可維修獎勵)。"},
    {name: "Kalimman", desc: "飛魚終食祭: 商店材料價格加倍。"},
    {name: "Kaneman", desc: "禁忌之月: 無法執行完工 (填縫)。"},
    {name: "Kapitowan", desc: "祭神月: 青年與耆老同區域，KP 自動 +2。"},
    {name: "Kaowan", desc: "手工藝月: 捻線不再消耗 AP。"}
];

function showMonthEventModal(month) {
    const ev = scriptEvents[month];
    const rule = GAME_RULES[month - 1];
    if (!rule) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '3000';
    
    let title = ev ? ev.title : `第 ${month} 個月：${rule.name}`;
    let desc = ev ? ev.desc : `【本月規則】\n${rule.desc}`;
    
    let html = `
        <div class="modal-content glass" style="max-width: 600px; padding: 2.5rem; text-align: left; box-shadow: 0 0 30px rgba(0,0,0,0.5);">
            <h2 style="color:var(--secondary); font-size: 1.8rem; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 0.5rem;">${title}</h2>
            <div style="display:flex; flex-direction:column; gap: 1rem; margin-bottom: 2rem;">
    `;
    
    if (ev && ev.dialogues) {
        ev.dialogues.forEach(d => {
            const isSys = d.role === '系統';
            const color = isSys ? 'var(--text-muted)' : (d.role === '青年學徒(部落青年)' ? '#4CAF50' : (d.role === '耆老' ? '#FFC107' : '#03A9F4'));
            html += `
                <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; border-left: 4px solid ${color};">
                    <strong style="color: ${color}; display: block; margin-bottom: 0.3rem;">${d.role}</strong>
                    <span style="line-height: 1.6;">${d.text}</span>
                </div>
            `;
        });
    }
    
    html += `
            </div>
            <div style="background: rgba(244, 67, 54, 0.1); border: 1px solid var(--danger); padding: 1rem; border-radius: 8px; margin-bottom: 2rem;">
                <p style="color: #ffcdd2; font-size: 0.95rem; line-height: 1.6; white-space: pre-line;">${desc}</p>
            </div>
            <button class="btn primary glow-btn" style="width: 100%;" onclick="this.closest('.modal-overlay').remove()">我明白了</button>
        </div>
    `;
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

// Rules Modal
openRulesBtn.addEventListener('click', () => {
    rulesModal.classList.add('active');
});
closeRulesBtn.addEventListener('click', () => rulesModal.classList.remove('active'));

// Role Selection
roleOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        roleOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedRole = opt.dataset.role;
    });
});

// ── BorderGlow: pointer tracking for role cards ───────────────────────────
(function initRoleCardGlow() {
    function getCenterHalf(el) {
        const { width, height } = el.getBoundingClientRect();
        return [width / 2, height / 2];
    }
    function getEdgeProximity(el, x, y) {
        const [cx, cy] = getCenterHalf(el);
        const dx = x - cx, dy = y - cy;
        let kx = Infinity, ky = Infinity;
        if (dx !== 0) kx = cx / Math.abs(dx);
        if (dy !== 0) ky = cy / Math.abs(dy);
        return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1) * 100;
    }
    function getCursorAngle(el, x, y) {
        const [cx, cy] = getCenterHalf(el);
        const dx = x - cx, dy = y - cy;
        if (dx === 0 && dy === 0) return 0;
        let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        return ((deg % 360) + 360) % 360;
    }
    roleOptions.forEach(card => {
        card.addEventListener('pointermove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--edge-proximity', getEdgeProximity(card, x, y).toFixed(2));
            card.style.setProperty('--cursor-angle', getCursorAngle(card, x, y).toFixed(2) + 'deg');
        }, { passive: true });
        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--edge-proximity', '0');
        }, { passive: true });
    });
})();
// ─────────────────────────────────────────────────────────────────────────────

// Join & Create
document.addEventListener('DOMContentLoaded', () => {
    // Initialize LightRays shader background
    const lightRaysCanvas = document.getElementById('light-rays-canvas');
    if (lightRaysCanvas && window.LightRaysShader) {
        lightRaysInstance = new LightRaysShader(lightRaysCanvas, {
            raysOrigin: 'top-center',
            raysColor: '#fde68a', // Gorgeous warm golden sunlight for the lobby
            raysSpeed: 0.8,
            lightSpread: 1.2,
            rayLength: 2.5,
            pulsating: true,
            fadeDistance: 1.0,
            saturation: 1.0,
            followMouse: true,
            mouseInfluence: 0.15,
            distortion: 0.08
        });
    }

    // Background Effects Spawners
    function spawnLeaf() {
        const layer = document.querySelector('.leaves-layer');
        if (!layer || layer.style.opacity === '0' || layer.style.opacity === '') return;
        const leaf = document.createElement('div');
        leaf.className = 'leaf-particle';
        leaf.innerHTML = `<div style="transform: scale(${Math.random() * 2.5 + 0.5})">
            <svg style="filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));" viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)" width="24" height="24"><path d="M17,8C8,10 5.5,13.5 5.5,17C5.5,17 7.5,14 11.5,13.5C11.5,13.5 12,18 12,18C12,18 13.5,12.5 17,8Z"/></svg>
        </div>`;
        const duration = Math.random() * 5 + 5;
        leaf.style.left = `${Math.random() * 100}vw`;
        leaf.style.animationDuration = `${duration}s`;
        layer.appendChild(leaf);
        setTimeout(() => { if(leaf.parentNode) leaf.parentNode.removeChild(leaf); }, duration * 1000);
    }

    function spawnFish() {
        const layer = document.querySelector('.fishes-layer');
        if (!layer || layer.style.opacity === '0' || layer.style.opacity === '') return;
        const fish = document.createElement('div');
        fish.className = 'fish-particle';
        const isReverse = Math.random() > 0.5;
        fish.innerHTML = `<div style="transform: scale(${Math.random() * 2 + 0.8}) ${isReverse ? 'scaleX(-1)' : ''}">
            <svg style="filter: drop-shadow(0 0 8px rgba(255,255,255,0.2));" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)" width="40" height="20"><path d="M2 12C2 12 7 7 12 12C17 17 22 12 22 12C22 12 17 9 12 12C7 15 2 12 2 12ZM4 12L1 10V14L4 12Z"/></svg>
        </div>`;
        const duration = Math.random() * 8 + 7;
        fish.style.top = `${Math.random() * 60 + 20}vh`;
        fish.style.animationDuration = `${duration}s`;
        if (isReverse) {
            fish.style.left = '110vw';
            fish.style.animationName = 'swimAcrossReverse';
        }
        layer.appendChild(fish);
        setTimeout(() => { if(fish.parentNode) fish.parentNode.removeChild(fish); }, duration * 1000);
    }

    function spawnRain() {
        const layer = document.querySelector('.rain-layer');
        if (!layer || layer.style.opacity === '0' || layer.style.opacity === '') return; // Don't spawn on cover
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        const duration = Math.random() * 0.4 + 0.3; 
        drop.style.left = `${Math.random() * 100}vw`;
        drop.style.animationDuration = `${duration}s`;
        layer.appendChild(drop);
        setTimeout(() => { if(drop.parentNode) drop.parentNode.removeChild(drop); }, duration * 1000);
    }

    function spawnStar() {
        const layer = document.querySelector('.stars-layer');
        if (!layer || layer.style.opacity === '0' || layer.style.opacity === '') return; // Don't spawn on cover
        const star = document.createElement('div');
        star.className = 'star-particle';
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 60}vh`; 
        const duration = Math.random() * 3 + 2;
        star.style.animationDuration = `${duration}s`;
        layer.appendChild(star);
        setTimeout(() => { if(star.parentNode) star.parentNode.removeChild(star); }, duration * 1000);
    }

    const isMobile = window.innerWidth <= 768;
    setInterval(spawnLeaf, isMobile ? 3000 : 800);
    setInterval(spawnFish, isMobile ? 6000 : 2000);
    setInterval(spawnRain, isMobile ? 200 : 30);
    setInterval(spawnStar, isMobile ? 1200 : 300);
});

joinBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!name) return showToast('請輸入名字！');
    if (!code || code.length !== 4) return showToast('請輸入4碼房間代碼！');
    
    openAvatarCreator('join', { name, role: selectedRole, room_code: code });
});

createBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) return showToast('請輸入名字！');
    
    openAvatarCreator('create', { name, role: selectedRole });
});

function openAvatarCreator(actionType, data) {
    pendingRoomAction = { type: actionType, data: data };
    
    if (avatarRoleName) avatarRoleName.textContent = AVATAR_ROLE_LABELS[data.role] || '';
    
    lobbyScreen.classList.remove('active');
    avatarScreen.classList.add('active');
    
    // Give DOM time to render canvas, then init Three.js
    setTimeout(() => { initAvatar3D(); }, 80);
}

// Avatar control buttons — swatch & option buttons
const avatarControlsEl = document.getElementById('avatar-controls');
if (avatarControlsEl) {
    avatarControlsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-val]');
        if (!btn) return;
        const row = btn.closest('[data-ctrl]');
        if (!row) return;
        const ctrl = row.dataset.ctrl;
        const val = btn.dataset.val;
        
        // Deselect siblings
        row.querySelectorAll('.swatch, .avatar-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        // Update 3D
        updateAvatarPart(ctrl, val);
    });
}

avatarBackBtn.addEventListener('click', () => {
    destroyAvatar3D();
    avatarScreen.classList.remove('active');
    lobbyScreen.classList.add('active');
    pendingRoomAction = null;
});

avatarConfirmBtn.addEventListener('click', () => {
    if (!pendingRoomAction) return;
    
    const snapshot = captureAvatarSnapshot();
    const faceLabels  = {round:'圓潤臉', square:'寬顎臉', slim:'清秀臉'};
    const hairLabels  = {short:'短直髮', long:'長直髮', bun:'束髻', bald:'光頭'};
    const accLabels   = {none:'', silver_helmet:'銀盔', rattan_armor:'藤甲', chest_ornament:'胸飾'};
    const clothLabels = {loincloth:'丁字褲', vest_dark:'黑白背心', ceremony:'祭典全裝'};
    
    const avatarData = {
        image: snapshot,
        icon: '🧑',
        traits: [
            '髮型:' + hairLabels[avatarState.hair],
            '臉型:' + faceLabels[avatarState.face],
            '服飾:' + clothLabels[avatarState.cloth],
            avatarState.accessory !== 'none' ? '配件:' + accLabels[avatarState.accessory] : null
        ].filter(Boolean)
    };
    
    pendingRoomAction.data.avatar = avatarData;
    
    if (pendingRoomAction.type === 'join') {
        socket.emit('join_game', pendingRoomAction.data);
    } else {
        socket.emit('create_room', pendingRoomAction.data);
    }
    
    destroyAvatar3D();
    avatarScreen.classList.remove('active');
});

leaveLobbyBtn.addEventListener('click', () => {
    socket.emit('leave_game');
    waitingSection.style.display = 'none';
    joinSection.style.display = 'block';
});

leaveGameBtn.addEventListener('click', () => {
    if(confirm('確定要退出遊戲嗎？')) {
        socket.emit('leave_game');
        location.reload();
    }
});

startGameBtn.addEventListener('click', () => {
    socket.emit('start_game');
});

// Socket Events
socket.on('connect', () => {
    myId = socket.id;
});

socket.on('error', (err) => {
    showToast(err.msg);
    if(err.msg === '遊戲已開始' && waitingSection.style.display === 'block') {
        waitingSection.style.display = 'none';
        joinSection.style.display = 'block';
    }
});

socket.on('state_update', (state) => {
    if (!state.started && Object.keys(state.players).length > 0 && state.month > 12) {
        // Game Over
        renderGameOver(state);
        return;
    }

    if (!state.started) {
        // Lobby state
        if (prismaticBurstInstance) {
            prismaticBurstInstance.destroy();
            prismaticBurstInstance = null;
        }
        lobbyScreen.classList.add('active');
        gameScreen.classList.remove('active');
        avatarScreen.classList.remove('active');
        renderLobby(state);
    } else {
        // Game state
        lobbyScreen.classList.remove('active');
        avatarScreen.classList.remove('active');
        gameScreen.classList.add('active');
        
        if (state.month !== currentDisplayedMonth) {
            currentDisplayedMonth = state.month;
            if (state.month <= 12) {
                showMonthEventModal(state.month);
            }
        }
        
        renderGame(state);
    }
});

// Chat logic
function sendChatMessage() {
    const msg = chatInput.value.trim();
    if (msg) {
        socket.emit('chat_message', { msg });
        chatInput.value = '';
    }
}

chatSendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

socket.on('chat_broadcast', (data) => {
    const msgEl = document.createElement('div');
    msgEl.style.background = 'rgba(0,0,0,0.2)';
    msgEl.style.padding = '0.5rem';
    msgEl.style.borderRadius = '6px';
    msgEl.style.fontSize = '0.9rem';
    msgEl.innerHTML = `<strong style="color:var(--secondary)">${data.name}:</strong> <span style="color:var(--text-main)">${data.msg}</span>`;
    chatMessagesEl.appendChild(msgEl);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
});

function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.style.background = 'rgba(239, 68, 68, 0.9)';
    toast.style.color = '#fff';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    toast.style.fontWeight = 'bold';
    toast.style.transition = 'opacity 0.3s ease-out';
    toast.textContent = msg;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Lore Data and Modal Logic
const monthLoreData = [
    null,
    { title: "【迎接魚季與社交】", desc: "● 祭儀：舉行「立春」儀式與「孝敬父母日」。進行殺豬祭儀，將豬肉分享給祖先以祈求出海平安。<br><br>● 勞動：準備捕魚工具、採集材料、修補大船、理髮。" },
    { title: "【禁忌與正式招魚】", desc: "● 祭儀：舉行正式的招飛魚祭 (Manlag)。紅頭部落於初二開始。東清部落會焚燒蘆葦莖製作火把。<br><br>● 文化：進入禁慾期（Paneneb），男船員在共宿屋（Panragan）集體生活以防寒並防止私會婦女。<br><br>● 勞動：上山砍伐曬魚架材料；開始夜間火把捕魚。" },
    { title: "【全力捕撈與放寬】", desc: "● 祭儀：大船船組解散，男人可回原家屋睡覺。<br><br>● 文化：捕獲的飛魚可帶回家中煮熟處理，並塗抹鹽巴晾曬。<br><br>● 勞動：全力捕撈飛魚；婦女開始到山上採集陸蟹。" },
    { title: "【鬼頭刀與慰勞】", desc: "● 祭儀：舉行小船招魚祭，開始晝間繩釣鬼頭刀。舉行慰勞節（螃蟹祭），婦女製作芋頭糕慰勞丈夫辛勞。<br><br>● 勞動：砍伐專門晾曬鬼頭刀的魚架（Papataw）。" },
    { title: "【儲備與祈福】", desc: "● 祭儀：月初舉行祈福祭。<br><br>● 勞動：舉行蒸飛魚祭（mapasoad），將飛魚乾剪翅後蒸熟儲存。製作木臼與木杵。" },
    { title: "【共享與終止】", desc: "● 祭儀：飛魚終了祭，此月結束後不再捕飛魚。舉行收獲節與小米祭。<br><br>● 文化：稱為「好月節」，親友間互相贈送剩餘的飛魚，分享勞動成果。" },
    { title: "【耕作與落成】", desc: "● 祭儀：適合舉辦房屋（主屋、涼亭）或各種拼板舟的落成禮。<br><br>● 勞動：開始開墾新的水芋田與地瓜田。" },
    { title: "【取土燒陶】", desc: "● 勞動：採集陶土並燒製陶器（陶甕）。因氣候乾燥有利於陶器成型。" },
    { title: "【終食與去穢】", desc: "● 祭儀：月中（14或15日）舉行飛魚終食祭，此後嚴禁食用飛魚乾。<br><br>● 文化：剩餘魚乾需餵豬，不可再儲存。此月被視為驅除惡靈的月份。" },
    { title: "【大凶與貝灰】", desc: "● 禁忌：全年最不吉利的月份，禁止建屋、造船落成或為嬰兒取名。<br><br>● 勞動：專門燒製貝灰（與檳榔共食或彩繪船身用）。" },
    { title: "【祭祖與播種】", desc: "● 祭儀：舉行祖靈祭 (Pazos) 與亡魂節，感謝神靈保護與祖先養育。<br><br>● 勞動：播種小米；採伐蘆葦以備未來製作捕魚用的火把。" },
    { title: "【工藝與冶金】", desc: "● 勞動：男人從事冶鐵（製作銀帽、盔甲、漿繩）；女人織布並編織藤籃。<br><br>● 文化：婦女舉行祝福芋頭田的儀式。" }
];

document.addEventListener('click', (e) => {
    if (e.target.id === 'open-lore-btn') {
        const monthEl = document.getElementById('current-month');
        if (!monthEl) return;
        const month = parseInt(monthEl.textContent);
        const lore = monthLoreData[month];
        if (lore) {
            document.getElementById('lore-title').textContent = document.getElementById('month-name').textContent;
            document.getElementById('lore-subtitle').textContent = lore.title;
            document.getElementById('lore-content').innerHTML = lore.desc;
            document.getElementById('lore-modal').style.display = 'flex';
        }
    } else if (e.target.id === 'close-lore-btn') {
        document.getElementById('lore-modal').style.display = 'none';
    }
});

function disableActionButtonsTemporarily() {
    const btns = document.querySelectorAll('.action-btn, #next-month-btn');
    btns.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
    setTimeout(() => {
        btns.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });
    }, 500);
}

function sendAction(data) {
    socket.emit('action', data);
    disableActionButtonsTemporarily();
}

function playActionSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
}

function showFloatingIcon(e, icon) {
    if (!e) return;
    const el = document.createElement('div');
    el.textContent = icon;
    el.style.position = 'fixed';
    el.style.left = `${e.clientX}px`;
    el.style.top = `${e.clientY}px`;
    el.style.transform = 'translate(-50%, -50%)';
    el.style.fontSize = '2.2rem';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '99999';
    el.style.opacity = '1';
    el.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
    el.style.textShadow = '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(100,200,255,0.5)';
    document.body.appendChild(el);
    
    requestAnimationFrame(() => {
        el.style.transform = 'translate(-50%, -120px) scale(1.4)';
        el.style.opacity = '0';
    });
    
    setTimeout(() => el.remove(), 800);
}

// Action bindings
document.querySelectorAll('.move-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        playActionSound();
        showFloatingIcon(e, '🚶');
        const loc = e.target.closest('.location-card').dataset.loc;
        sendAction({ type: 'move', target: loc });
    });
});

document.querySelector('.gather-btn').addEventListener('click', (e) => {
    playActionSound();
    showFloatingIcon(e, '🌿');
    sendAction({ type: 'gather' });
});

document.querySelectorAll('.craft-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        playActionSound();
        showFloatingIcon(e, '🔨');
        const step = e.target.dataset.step;
        sendAction({ type: 'craft', step });
    });
});

document.querySelector('.buy-btn').addEventListener('click', (e) => {
    playActionSound();
    showFloatingIcon(e, '💰');
    sendAction({ type: 'buy' });
});

nextMonthBtn.addEventListener('click', (e) => {
    playActionSound();
    showFloatingIcon(e, '⏳');
    disableActionButtonsTemporarily();
    socket.emit('toggle_ready');
});

askBtn.addEventListener('click', (e) => {
    playActionSound();
    showFloatingIcon(e, '🙏');
    sendAction({ type: 'ask' });
});

teachBtn.addEventListener('click', (e) => {
    playActionSound();
    showFloatingIcon(e, '💡');
    const targetId = teachTargetSelect.value;
    if(targetId) {
        sendAction({ type: 'teach', target_id: targetId });
    }
});

playersListEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('give-btn')) {
        playActionSound();
        showFloatingIcon(e, '🎁');
        const targetId = e.target.dataset.id;
        sendAction({ type: 'give', target_id: targetId });
    }
});

function renderLobby(state) {
    if (lightRaysInstance) {
        lightRaysInstance.updateConfig({
            raysColor: '#fde68a',
            raysSpeed: 0.8,
            lightSpread: 1.2,
            rayLength: 2.5,
            distortion: 0.08
        });
    }

    document.querySelector('.bg-layer').classList.add('lobby-anim'); 
    document.querySelector('.bg-layer').style.filter = 'none'; 
    document.querySelector('.bg-layer').style.backgroundPosition = ''; // Clear inline styles
    document.querySelector('.leaves-layer').style.opacity = '1';
    document.querySelector('.fishes-layer').style.opacity = '1';
    document.querySelector('.rain-layer').style.opacity = '0';
    document.querySelector('.stars-layer').style.opacity = '0';

    lobbyPlayersList.innerHTML = '';
    const playerCount = Object.keys(state.players).length;
    
    if (state.room_code) {
        displayRoomCode.textContent = state.room_code;
    }

    if(playerCount === 0) {
        lobbyPlayersList.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">尚無玩家加入</p>';
    } else {
        for (const [id, p] of Object.entries(state.players)) {
            lobbyPlayersList.innerHTML += `
                <div class="lobby-player-item">
                <div style="display:flex; align-items:center; gap:0.8rem;">
                        ${p.avatar && p.avatar.image 
                            ? `<img src="${p.avatar.image}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid var(--primary); background:#0a0f1e;">` 
                            : `<span style="font-size:1.5rem;">${p.avatar?p.avatar.icon:''}</span>`}
                        <div>
                            <strong style="color:var(--primary); font-size:1.1rem;">${p.name}</strong> 
                            <span style="color:var(--text-muted); font-size:0.9rem;">— ${getRoleName(p.role)}</span>
                        </div>
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.4rem; line-height:1.4;">
                        ${p.avatar && p.avatar.traits ? p.avatar.traits.join(' | ') : ''}
                    </div>
                    ${id === myId ? '<span class="badge primary-badge">你</span>' : ''}
                </div>
            `;
        }
    }

    // Check if I am in the lobby
    if(state.players[myId]) {
        joinSection.style.display = 'none';
        waitingSection.style.display = 'block';
    } else {
        joinSection.style.display = 'block';
        waitingSection.style.display = 'none';
    }
}

const monthThemes = [
    null, // 0
    { pos: '0% 0%', hue: 0, bright: 1.1, leaves: 1, fishes: 0, rain: 0, stars: 0, raysColor: '#bbf7d0', raysSpeed: 0.8, lightSpread: 1.2, rayLength: 2.5, distortion: 0.08 }, // M1: Kashyman - 準備月 (綠, 葉子)
    { pos: '0% 10%', hue: 15, bright: 1.05, leaves: 1, fishes: 0, rain: 0, stars: 0, raysColor: '#34d399', raysSpeed: 0.6, lightSpread: 1.0, rayLength: 2.2, distortion: 0.06 }, // M2: Kapowan - 禁山林 (深綠)
    { pos: '0% 20%', hue: 30, bright: 1.0, leaves: 0, fishes: 1, rain: 0, stars: 0, raysColor: '#22d3ee', raysSpeed: 0.9, lightSpread: 1.4, rayLength: 2.6, distortion: 0.1 }, // M3: Pikaokaod - 飛魚盛期 (藍綠, 飛魚)
    { pos: '0% 40%', hue: 45, bright: 1.0, leaves: 0, fishes: 1, rain: 0, stars: 0, raysColor: '#0ea5e9', raysSpeed: 1.0, lightSpread: 1.5, rayLength: 2.7, distortion: 0.12 }, // M4: Papataw - 鬼頭刀 (淺海, 飛魚)
    { pos: '0% 60%', hue: 60, bright: 0.8, leaves: 0, fishes: 1, rain: 1, stars: 0, raysColor: '#475569', raysSpeed: 0.4, lightSpread: 0.8, rayLength: 1.8, distortion: 0.15 }, // M5: Pipilapila - 梅雨季 (暗海, 大雨)
    { pos: '0% 80%', hue: 75, bright: 0.95, leaves: 0, fishes: 1, rain: 0, stars: 0, raysColor: '#60a5fa', raysSpeed: 0.7, lightSpread: 1.2, rayLength: 2.4, distortion: 0.08 }, // M6: Apiya vehan - 好月節 (湛藍)
    { pos: '0% 100%', hue: 90, bright: 0.9, leaves: 0, fishes: 0, rain: 0.3, stars: 0, raysColor: '#38bdf8', raysSpeed: 0.8, lightSpread: 1.3, rayLength: 2.5, distortion: 0.09 }, // M7: Pehhakow - 飛魚季結束 (深藍, 微雨)
    { pos: '0% 100%', hue: 120, bright: 0.85, leaves: 0, fishes: 0, rain: 0, stars: 0.5, raysColor: '#a855f7', raysSpeed: 0.5, lightSpread: 1.0, rayLength: 2.0, distortion: 0.07 }, // M8: Pitanatana - 土器月 (寂靜深淵, 微星芒)
    { pos: '0% 80%', hue: 200, bright: 0.8, leaves: 0, fishes: 0, rain: 0, stars: 1, raysColor: '#ec4899', raysSpeed: 0.6, lightSpread: 1.1, rayLength: 2.1, distortion: 0.08 }, // M9: Kalimman - 終食祭 (秋夜星空, 紅/紫)
    { pos: '0% 50%', hue: 280, bright: 0.8, leaves: 0, fishes: 0, rain: 0, stars: 0.5, raysColor: '#f97316', raysSpeed: 0.5, lightSpread: 0.9, rayLength: 1.9, distortion: 0.09 }, // M10: Kaneman - 不吉祥月 (暮色)
    { pos: '0% 20%', hue: 320, bright: 0.9, leaves: 1, fishes: 0, rain: 0, stars: 0, raysColor: '#fbbf24', raysSpeed: 0.7, lightSpread: 1.2, rayLength: 2.3, distortion: 0.08 }, // M11: Kapitowan - 祭神 (微芒, 落葉回歸)
    { pos: '0% 0%', hue: 350, bright: 1.0, leaves: 1, fishes: 0, rain: 0, stars: 0, raysColor: '#fef08a', raysSpeed: 0.9, lightSpread: 1.3, rayLength: 2.6, distortion: 0.07 }  // M12: Kaowan - 手工藝月 (初春)
];

function updateBackgroundForMonth(month) {
    const bgLayer = document.querySelector('.bg-layer');
    const leavesLayer = document.querySelector('.leaves-layer');
    const fishesLayer = document.querySelector('.fishes-layer');
    const rainLayer = document.querySelector('.rain-layer');
    const starsLayer = document.querySelector('.stars-layer');
    
    if (!bgLayer) return;
    
    const s = monthThemes[month] || monthThemes[1];
    
    bgLayer.style.backgroundPosition = s.pos;
    bgLayer.style.filter = `hue-rotate(${s.hue}deg) brightness(${s.bright})`;
    
    if (leavesLayer) leavesLayer.style.opacity = s.leaves;
    if (fishesLayer) fishesLayer.style.opacity = s.fishes;
    if (rainLayer) rainLayer.style.opacity = s.rain;
    if (starsLayer) starsLayer.style.opacity = s.stars;

    if (lightRaysInstance && s.raysColor) {
        lightRaysInstance.updateConfig({
            raysColor: s.raysColor,
            raysSpeed: s.raysSpeed !== undefined ? s.raysSpeed : 1.0,
            lightSpread: s.lightSpread !== undefined ? s.lightSpread : 1.0,
            rayLength: s.rayLength !== undefined ? s.rayLength : 2.0,
            distortion: s.distortion !== undefined ? s.distortion : 0.08
        });
    }
}

function renderGame(state) {
    document.querySelector('.bg-layer').classList.remove('lobby-anim'); // Stop lobby animation
    
    if (state.month !== parseInt(monthEl.textContent)) {
        document.getElementById('month-badge').classList.remove('animate-change');
        void document.getElementById('month-badge').offsetWidth; // trigger reflow
        document.getElementById('month-badge').classList.add('animate-change');
    }
    
    monthEl.textContent = state.month;
    updateBackgroundForMonth(state.month);

    monthNameEl.textContent = GAME_RULES[state.month - 1].name;
    monthDescEl.textContent = GAME_RULES[state.month - 1].desc;

    // Players list & Map locations
    playersListEl.innerHTML = '';
    const locMap = { '山林': [], '灘頭工作室': [], '商店': [] };
    
    let youthOptions = '';
    
    const steps = ['尚未開始', '已剝麻', '已刮絲', '已捻線', '✅ 已完工'];
    
    for (const [id, p] of Object.entries(state.players)) {
        const isMe = id === myId;
        const myP = state.players[myId];
        
        let giveBtnHtml = '';
        if (!isMe && myP && myP.location === p.location && myP.materials > 0) {
            giveBtnHtml = `<button class="give-btn" data-id="${id}" style="font-size:0.75rem; padding: 0.3rem 0.8rem; border-radius:6px; background:rgba(212,175,55,0.15); color:var(--secondary); border:1px solid rgba(212,175,55,0.4); cursor:pointer; font-weight:bold; transition:all 0.3s; box-shadow: 0 0 10px rgba(212,175,55,0.1);">🎁 贈材料 (-1 AP)</button>`;
        }
        
        // Sidebar item
        const pEl = document.createElement('div');
        pEl.className = `player-item ${isMe ? 'me' : ''} ${p.progress === 4 ? 'finished' : ''}`;
        pEl.innerHTML = `
            <div class="player-header">
                <div class="player-title-row">
                    <div class="player-name-wrapper">
                        ${isMe ? `
                        <span class="player-name player-avatar-trigger"
                            title="點擊預覽你的角色"
                            data-player-name="${p.name}"
                            data-player-role="${p.role}"
                            style="cursor:pointer; text-decoration:underline dotted rgba(255,255,255,0.3); text-underline-offset:3px;"
                        >${p.avatar ? p.avatar.icon : ''} ${p.name} <span style="font-size:0.65rem;opacity:0.55;">👁</span></span>
                        ` : `<span class="player-name">${p.avatar ? p.avatar.icon : ''} ${p.name}</span>`}
                        ${isMe ? '<span class="tag is-me">你</span>' : ''}
                    </div>
                    <div class="player-status-icon">
                        ${p.ready ? '<span title="已準備" class="ready-icon">✅</span>' : '<span title="思考中" class="thinking-icon" style="opacity:0.6;">⏳</span>'}
                    </div>
                </div>
                <div class="player-role-row" style="margin-bottom:0.5rem;">
                    <span class="role-badge ${p.role}">${getRoleName(p.role)}</span>
                    ${giveBtnHtml}
                </div>
                ${p.avatar && p.avatar.traits && p.avatar.traits.length > 0 ? `
                <div class="player-traits" style="display:flex; flex-wrap:wrap; gap:0.2rem; margin-bottom:0.6rem;">
                    ${p.avatar.traits.map(t => `<span style="background:rgba(255,255,255,0.05); padding:0.1rem 0.4rem; border-radius:4px; font-size:0.7rem; color:var(--text-muted); border:1px solid rgba(255,255,255,0.05);">${t}</span>`).join('')}
                </div>
                ` : ''}
            </div>
            
            <div class="player-stats-grid">
                <div class="stat-box ap-box">
                    <span class="stat-icon">⚡</span>
                    <span class="stat-label">AP:</span>
                    <span class="stat-value">${p.ap}</span>
                </div>
                <div class="stat-box kp-box">
                    <span class="stat-icon">💡</span>
                    <span class="stat-label">KP:</span>
                    <span class="stat-value">${p.kp}</span>
                </div>
                <div class="stat-box mat-box">
                    <span class="stat-icon">🌿</span>
                    <span class="stat-label">材:</span>
                    <span class="stat-value">${p.materials}</span>
                </div>
            </div>
            
            <div class="player-footer">
                <div class="progress-pill">
                    <span class="progress-label">進度</span>
                    <span class="progress-value">${steps[p.progress]}</span>
                </div>
                <div class="score-pill">
                    <span>⭐ ${p.score}</span>
                </div>
            </div>
        `;
        playersListEl.appendChild(pEl);

        // Map badge
        if (locMap[p.location]) {
            locMap[p.location].push({ name: p.name, role: p.role, avatar: p.avatar, isMe: id === myId });
        }

        // Teach targets
        if (p.role === 'youth') {
            youthOptions += `<option value="${id}">${p.name}</option>`;
        }

        // My status
        if (isMe) {
            myStatusEl.innerHTML = `
                <div class="status-item"><span class="status-label">剩餘 AP</span><span class="status-val">${p.ap}</span></div>
                <div class="status-item"><span class="status-label">KP 點數</span><span class="status-val">${p.kp}</span></div>
                <div class="status-item"><span class="status-label">持有材料</span><span class="status-val">${p.materials}</span></div>
                <div class="status-item"><span class="status-label">造船進度</span><span class="status-val">${steps[p.progress]}</span></div>
                <div class="status-item"><span class="status-label">總得分</span><span class="status-val">${p.score}</span></div>
            `;
            
            if (p.role === 'youth') {
                askBtn.style.display = 'block';
            } else {
                askBtn.style.display = 'none';
            }
            
            if (p.role === 'elder') {
                teachContainer.style.display = 'flex';
                teachTargetSelect.innerHTML = youthOptions;
            } else {
                teachContainer.style.display = 'none';
            }
            
            // Ready Button UI
            if (p.ready) {
                nextMonthBtn.textContent = '取消準備 (等候其他玩家...)';
                nextMonthBtn.className = 'btn secondary outline';
            } else {
                nextMonthBtn.textContent = '準備進入下個月';
                nextMonthBtn.className = 'btn primary glow-btn';
            }
        }
    }

    // Update map location badges with premium icon cards
    const ROLE_META = {
        elder:  { label: '耆老', color: '#d97706', icon: '🧓' },
        middle: { label: '協商者', color: '#0ea5e9', icon: '👷' },
        youth:  { label: '青年學徒', color: '#86efac', icon: '🧑' },
    };
    const LOCATION_ICONS = {
        '山林': '🌲',
        '灘頭工作室': '🛖',
        '商店': '🏬'
    };
    for (const [loc, players] of Object.entries(locMap)) {
        const container = document.querySelector(`.location-card[data-loc="${loc}"] .players-here`);
        if (!container) continue;
        if (players.length === 0) {
            container.innerHTML = `<span class="loc-empty">無人在此</span>`;
            continue;
        }
        container.innerHTML = players.map(({ name, role, avatar, isMe }) => {
            const meta = ROLE_META[role] || { label: role, color: '#94a3b8', icon: '👤' };
            const avatarHtml = avatar && avatar.image
                ? `<img src="${avatar.image}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid ${meta.color};">`
                : `<span style="font-size:1.4rem;line-height:1;">${avatar?.icon || meta.icon}</span>`;
            return `
            <div class="loc-player-card ${isMe ? 'loc-card-me' : ''}" style="--role-color:${meta.color}">
                <div class="loc-avatar-ring" style="border-color:${meta.color};box-shadow:0 0 8px ${meta.color}44;">
                    ${avatarHtml}
                </div>
                <div class="loc-info">
                    <span class="loc-name">${name}${isMe ? ' <em style="font-size:0.6rem;color:'+meta.color+';font-style:normal;">(你)</em>' : ''}</span>
                    <span class="loc-role" style="color:${meta.color};">${meta.label}</span>
                </div>
            </div>`;
        }).join('');
    }

    // Logs
    logsEl.innerHTML = state.logs.map(l => `<div class="log-entry">${l}</div>`).reverse().join('');
}

function renderGameOver(state) {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    if (lightRaysInstance) {
        lightRaysInstance.destroy();
        lightRaysInstance = null;
    }

    if (prismaticBurstInstance) {
        prismaticBurstInstance.destroy();
        prismaticBurstInstance = null;
    }

    appEl.innerHTML = `
        <canvas id="prismatic-burst-canvas" class="prismatic-burst-container"></canvas>
        <div class="screen active" style="align-items:center; justify-content:center; overflow-y:auto; padding:2rem 0; min-height:100vh;">
            <div class="glass" style="padding: 2rem; text-align:center; max-width: 800px; width: 90%; position:relative; z-index:10; margin: auto;">
                <h1 style="font-family: 'Noto Serif TC', serif; font-weight: 900; font-size: 2.5rem; color:var(--primary); margin-bottom: 2rem; letter-spacing:0.15em; text-shadow: 0 0 20px rgba(139, 195, 74, 0.4);">結算：文化韌性</h1>
                <div style="text-align:left; margin-bottom: 2rem; display:flex; flex-direction:column; gap:1.5rem;">
                    ${Object.values(state.players).sort((a,b)=>b.score-a.score).map((p, i) => `
                        <div style="background:rgba(0,0,0,0.4); padding:1.5rem; border-radius:12px; border-left: 5px solid ${i===0?'var(--secondary)':'var(--text-muted)'};">
                            <div style="display:flex; align-items:center; gap:0.8rem; margin-bottom:0.5rem;">
                                <h3 style="font-size:1.3rem; color:var(--primary); margin:0;">${i===0?'👑 ':''}${p.avatar ? p.avatar.icon : ''} ${p.name} <span style="font-size:0.9rem; color:var(--text-muted); font-weight:normal;">- ${getRoleName(p.role)}</span></h3>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.8rem;">
                                <p style="color:var(--secondary); font-size:1.6rem; font-weight:800; font-family:'Outfit', sans-serif;">⭐ ${p.score}</p>
                                <p style="font-size:1.1rem; font-weight:bold; color: ${p.finished ? 'var(--primary)' : 'var(--danger)'};">${p.ending ? p.ending.title : (p.finished ? '✅ 傳承成功' : '❌ 文化斷裂')}</p>
                            </div>
                            ${p.ending ? `
                            <div style="color:var(--text-main); font-size:0.95rem; line-height:1.7; background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.8rem; font-family: 'Noto Serif TC', serif;">
                                ${p.ending.text}
                            </div>
                            ` : ''}
                            <p style="color:var(--text-muted); font-size:0.8rem;">得分來源: ${p.score_breakdown.join(', ')}</p>
                        </div>
                    `).join('')}
                </div>
                <button class="btn primary" style="width:100%" onclick="location.reload()">重新回到部落</button>
            </div>
        </div>
    `;

    setTimeout(() => {
        const canvas = document.getElementById('prismatic-burst-canvas');
        if (canvas && window.PrismaticBurstShader) {
            prismaticBurstInstance = new PrismaticBurstShader(canvas, {
                intensity: 2.5,
                speed: 0.35,
                animationType: 'rotate3d',
                colors: ['#064e3b', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d4af37'], // 深林綠 → 翠綠 → 薄荷 → 暖金
                distort: 4.0,
                rayCount: 5,
                noiseAmount: 0.7
            });
        }
    }, 50);
}

function getRoleName(role) {
    if(role === 'elder') return '資深工匠';
    if(role === 'youth') return '青年學徒(部落青年)';
    return '協商者(中年工匠)';
}

// ── Avatar Preview Modal ───────────────────────────────────────────────────
const ROLE_COLORS = { elder: '#d97706', middle: '#0ea5e9', youth: '#86efac' };

// Delegated click: fires when player clicks their own name trigger in the sidebar
document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.player-avatar-trigger');
    if (!trigger) return;
    const name = trigger.dataset.playerName || '';
    const role = trigger.dataset.playerRole || '';
    openAvatarPreview(name, role);
});

function openAvatarPreview(playerName, role) {
    const modal   = document.getElementById('avatar-preview-modal');
    const nameEl  = document.getElementById('avatar-preview-name');
    const roleEl  = document.getElementById('avatar-preview-role');
    const traitsEl = document.getElementById('avatar-preview-traits');
    if (!modal) return;

    // Populate header
    const roleColor = ROLE_COLORS[role] || '#94a3b8';
    nameEl.textContent = playerName;
    roleEl.innerHTML = `<span style="color:${roleColor}; font-weight:600;">${getRoleName(role)}</span>`;

    // Populate traits from the saved avatar state
    traitsEl.innerHTML = (currentAvatarSelections.traits || []).map(t =>
        `<span style="background:rgba(255,255,255,0.06);padding:0.15rem 0.5rem;border-radius:6px;font-size:0.72rem;color:var(--text-muted);border:1px solid rgba(255,255,255,0.08);">${t}</span>`
    ).join('');

    // Show modal
    modal.classList.add('open');
    modal.style.display = 'flex';

    // Re-use the avatar3d engine — point it at the preview canvas
    // Destroy any running instance first, then re-init on the new canvas
    if (typeof destroyAvatar3D === 'function') destroyAvatar3D();

    // Swap the canvas id so initAvatar3D picks up the preview canvas
    const previewCanvas = document.getElementById('avatar-preview-canvas');
    if (previewCanvas) {
        const originalId = 'avatar-canvas';
        // Temporarily rename so initAvatar3D() finds it
        previewCanvas.id = originalId;
        if (typeof initAvatar3D === 'function') initAvatar3D();
        // Rename back after init so the original creator page isn't confused
        requestAnimationFrame(() => { previewCanvas.id = 'avatar-preview-canvas'; });
    }
}

function closeAvatarPreview() {
    const modal = document.getElementById('avatar-preview-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.style.display = 'none';
    if (typeof destroyAvatar3D === 'function') destroyAvatar3D();
}

document.getElementById('avatar-preview-close')?.addEventListener('click', closeAvatarPreview);

// Click outside the inner card to close
document.getElementById('avatar-preview-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('avatar-preview-modal')) closeAvatarPreview();
});
