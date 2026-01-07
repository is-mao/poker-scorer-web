// 今晚谁请客 - 网页版 (单页面)
const App = {
  currentRoom: null,
  rooms: [],
  userInfo: { nickname: '玩家' },
  selectedPlayer: null,
  
  init() {
    this.loadData();
    this.render();
  },
  
  loadData() {
    this.rooms = JSON.parse(localStorage.getItem('poker_rooms') || '[]');
    this.userInfo = JSON.parse(localStorage.getItem('poker_user') || '{"nickname":"玩家"}');
    // 自动选择最近的房间
    if (this.rooms.length > 0) {
      this.currentRoom = this.rooms[0];
    }
  },
  
  saveData() {
    localStorage.setItem('poker_rooms', JSON.stringify(this.rooms));
    localStorage.setItem('poker_user', JSON.stringify(this.userInfo));
  },
  
  render() {
    document.getElementById('app').innerHTML = this.renderPage();
    this.bindEvents();
  },
  
  renderPage() {
    return `
      <div class="page active">
        <div class="nav-bar">
          <span>🎴 今晚谁请客</span>
        </div>
        <div class="container">
          ${this.renderRoomSelector()}
          ${this.currentRoom ? this.renderRoomContent() : this.renderEmptyState()}
        </div>
        ${this.renderModals()}
      </div>
    `;
  },
  
  renderRoomSelector() {
    const roomOptions = this.rooms.map(r => 
      `<option value="${r.id}" ${this.currentRoom && this.currentRoom.id === r.id ? 'selected' : ''}>
        房间 ${r.id} (${r.players.length}人)
      </option>`
    ).join('');
    
    return `
      <div class="room-selector">
        <div class="selector-row">
          <select id="room-select" class="room-select">
            <option value="">-- 选择房间 --</option>
            ${roomOptions}
          </select>
          <div class="selector-btns">
            <button class="btn-icon" id="btn-create" title="创建房间">➕</button>
            <button class="btn-icon" id="btn-draw" title="抽签">🎯</button>
          </div>
        </div>
      </div>
    `;
  },
  
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">🎴</div>
        <div class="empty-text">点击 ➕ 创建房间开始记分</div>
      </div>
    `;
  },
  
  renderRoomContent() {
    const room = this.currentRoom;
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    const dealer = room.players.find(p => p.isOwner) || room.players[0];
    const totalPositive = room.players.reduce((sum, p) => sum + (p.score > 0 ? p.score : 0), 0);
    
    return `
      <div class="room-content">
        <div class="room-header">
          <div class="room-title">
            房间 ${room.id} 
            <span class="badge round">第${room.rounds.length + 1}局</span>
          </div>
          <div class="room-actions">
            <button class="btn-sm" id="btn-settle" title="结算房间">📊 结算</button>
            <button class="btn-sm" id="btn-reset" title="重置分数">🔄 重置</button>
            <button class="btn-sm danger" id="btn-delete" title="解散房间">❌ 解散</button>
          </div>
        </div>
        
        <div class="players-panel">
          <div class="panel-header">
            <span>玩家排名</span>
            <span class="total-score">总流水: <strong>${totalPositive}</strong> 分</span>
          </div>
          <div class="players-list">
            ${sorted.map((p, i) => this.renderPlayerRow(p, i)).join('')}
          </div>
          <div class="add-player-btn" id="add-player-inline">+ 添加玩家</div>
        </div>
        
        <div class="action-bar">
          <button class="btn-action outline" id="btn-give">批量给分</button>
          <button class="btn-action primary" id="btn-receive">批量得分</button>
        </div>
        
        <div class="records-panel">
          <div class="panel-header" id="toggle-records">
            <span>收支记录 (${room.rounds.length}局)</span>
            <span class="toggle-icon">▲</span>
          </div>
          <div class="records-list" id="records-list">
            ${this.renderRecords()}
          </div>
        </div>
      </div>
    `;
  },
  
  renderPlayerRow(player, index) {
    const rankClass = index < 3 ? `rank-${index + 1}` : '';
    const isDealer = player.isOwner;
    return `
      <div class="player-row ${isDealer ? 'dealer' : ''}" data-id="${player.id}">
        <div class="player-rank ${rankClass}">${index + 1}</div>
        <div class="player-avatar" data-player-id="${player.id}" title="双击设为庄家">${player.isOwner ? '👑' : '🧑'}</div>
        <div class="player-name">${player.name}${isDealer ? ' <span class="dealer-tag">庄</span>' : ''}</div>
        <div class="player-score ${player.score >= 0 ? 'positive' : 'negative'}">
          ${player.score >= 0 ? '+' : ''}${player.score}
        </div>
      </div>
    `;
  },
  
  renderRecords() {
    if (!this.currentRoom || !this.currentRoom.rounds.length) {
      return '<div class="empty-records">暂无记录</div>';
    }
    const players = this.currentRoom.players;
    const rounds = this.currentRoom.rounds;
    
    // 表头：局数 + 每个玩家名
    const headerCells = players.map(p => `<th>${p.name}</th>`).join('');
    
    // 每局数据
    const rows = rounds.map((r, i) => {
      const cells = players.map(p => {
        const record = r.scores.find(s => s.name === p.name);
        const change = record ? record.change : 0;
        const cls = change > 0 ? 'positive' : (change < 0 ? 'negative' : '');
        return `<td class="${cls}">${change !== 0 ? (change > 0 ? '+' : '') + change : '-'}</td>`;
      }).join('');
      return `<tr><td class="round-num">第${i + 1}局</td>${cells}</tr>`;
    }).join('');
    
    // 合计行
    const totalCells = players.map(p => {
      const cls = p.score > 0 ? 'positive' : (p.score < 0 ? 'negative' : '');
      return `<td class="total-cell ${cls}">${p.score > 0 ? '+' : ''}${p.score}</td>`;
    }).join('');
    
    return `
      <table class="records-table">
        <thead>
          <tr><th>局数</th>${headerCells}</tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr><td class="round-num">合计</td>${totalCells}</tr>
        </tfoot>
      </table>
    `;
  },

  renderModals() {
    const dealerPlayer = this.currentRoom ? (this.currentRoom.players.find(p => p.isOwner) || this.currentRoom.players[0]) : null;
    const others = this.currentRoom ? this.currentRoom.players.filter(p => !p.isOwner) : [];
    const dealerName = dealerPlayer ? `<span class="highlight-dealer">${dealerPlayer.name}</span>` : '庄家';
    const inputsHTML = others.map(p => `
      <div class="score-row">
        <span class="score-name">${p.name}</span>
        <input class="score-input" data-id="${p.id}" type="number" placeholder="0">
      </div>
    `).join('');
    
    return `
      <div class="modal-overlay" id="modal-create">
        <div class="modal-content">
          <div class="modal-title">创建房间</div>
          <div class="modal-desc">输入玩家名称，用逗号分隔（第一个为庄家）</div>
          <textarea class="modal-textarea" id="input-players" placeholder="例如：张三,李四,王五,赵六"></textarea>
          <div class="modal-btns">
            <button class="modal-btn cancel" data-close="modal-create">取消</button>
            <button class="modal-btn confirm" id="confirm-create">创建</button>
          </div>
        </div>
      </div>
      
      <div class="modal-overlay" id="modal-add-player">
        <div class="modal-content">
          <div class="modal-title">添加玩家</div>
          <input class="modal-input" id="input-player-name" placeholder="玩家名称">
          <div class="modal-btns">
            <button class="modal-btn cancel" data-close="modal-add-player">取消</button>
            <button class="modal-btn confirm" id="confirm-add-player">添加</button>
          </div>
        </div>
      </div>
      
      <div class="modal-overlay" id="modal-give">
        <div class="modal-content">
          <div class="modal-title">批量给分</div>
          <div class="modal-desc">给其他玩家的分数会从 ${dealerName} 扣除</div>
          <div class="score-inputs">${inputsHTML}</div>
          <div class="avg-section">
            <div class="avg-label">或均摊总分</div>
            <input class="avg-input" id="input-give-avg" type="number" placeholder="输入总分，自动平均分配">
          </div>
          <div class="modal-btns">
            <button class="modal-btn cancel" data-close="modal-give">取消</button>
            <button class="modal-btn confirm" id="confirm-give">确认</button>
          </div>
        </div>
      </div>
      
      <div class="modal-overlay" id="modal-receive">
        <div class="modal-content">
          <div class="modal-title">批量得分</div>
          <div class="modal-desc">从其他玩家收取的分数会加到 ${dealerName}</div>
          <div class="score-inputs">${inputsHTML.replace(/score-input/g, 'receive-input')}</div>
          <div class="avg-section">
            <div class="avg-label">或均摊总分</div>
            <input class="avg-input" id="input-receive-avg" type="number" placeholder="输入总分，自动平均分配">
          </div>
          <div class="modal-btns">
            <button class="modal-btn cancel" data-close="modal-receive">取消</button>
            <button class="modal-btn confirm" id="confirm-receive">确认</button>
          </div>
        </div>
      </div>
      
      <div class="modal-overlay" id="modal-player">
        <div class="modal-content">
          <div class="modal-title" id="player-modal-title">玩家操作</div>
          <div class="player-actions">
            <button class="player-action-btn" id="player-pay">💰 支付分数</button>
            <button class="player-action-btn" id="player-rename">✏️ 修改名称</button>
            <button class="player-action-btn" id="player-dealer">👑 设为庄家</button>
            <button class="player-action-btn danger" id="player-kick">❌ 踢出玩家</button>
          </div>
          <div class="modal-btns">
            <button class="modal-btn cancel" data-close="modal-player">关闭</button>
          </div>
        </div>
      </div>
      
      <div class="modal-overlay" id="modal-pay">
        <div class="modal-content">
          <div class="modal-title">支付分数</div>
          <div class="modal-desc" id="pay-desc">支付给玩家</div>
          <input class="modal-input" id="input-pay" type="number" placeholder="输入分数">
          <div class="modal-btns">
            <button class="modal-btn cancel" data-close="modal-pay">取消</button>
            <button class="modal-btn confirm" id="confirm-pay">确定</button>
          </div>
        </div>
      </div>
      
      <div class="modal-overlay" id="modal-rename">
        <div class="modal-content">
          <div class="modal-title">修改名称</div>
          <input class="modal-input" id="input-rename" placeholder="新名称">
          <div class="modal-btns">
            <button class="modal-btn cancel" data-close="modal-rename">取消</button>
            <button class="modal-btn confirm" id="confirm-rename">确定</button>
          </div>
        </div>
      </div>
      
      <div class="modal-overlay" id="modal-settle">
        <div class="modal-content settle-modal">
          <div class="settle-header">🏆 结算排名</div>
          <div class="settle-list" id="settle-list"></div>
          <div class="modal-btns">
            <button class="modal-btn cancel" data-close="modal-settle">取消</button>
            <button class="modal-btn confirm" id="confirm-settle">确认结算</button>
          </div>
        </div>
      </div>
      
      <div class="modal-overlay" id="modal-reset">
        <div class="modal-content confirm-modal">
          <div class="confirm-icon">🔄</div>
          <div class="confirm-title">重置分数</div>
          <div class="confirm-desc">确定要将所有玩家的分数重置为 0 吗？<br>此操作不会清空收支记录。</div>
          <div class="modal-btns">
            <button class="modal-btn cancel" data-close="modal-reset">取消</button>
            <button class="modal-btn confirm" id="confirm-reset">确认重置</button>
          </div>
        </div>
      </div>
      
      <div class="modal-overlay" id="modal-delete">
        <div class="modal-content confirm-modal danger">
          <div class="confirm-icon">⚠️</div>
          <div class="confirm-title">解散房间</div>
          <div class="confirm-desc">确定要解散房间 <strong>${this.currentRoom ? this.currentRoom.id : ''}</strong> 吗？<br>所有数据将被永久删除，无法恢复！</div>
          <div class="modal-btns">
            <button class="modal-btn cancel" data-close="modal-delete">取消</button>
            <button class="modal-btn confirm danger" id="confirm-delete">确认解散</button>
          </div>
        </div>
      </div>
      
      ${this.renderDrawModal()}
    `;
  },
  
  renderDrawModal() {
    return `
      <div class="modal-overlay" id="modal-draw">
        <div class="draw-modal">
          <div class="draw-header">
            <span class="draw-close" data-close="modal-draw">×</span>
            <span>玩家抽签</span>
            <span style="width:24px"></span>
          </div>
          <div class="draw-stage" id="draw-stage">
            <textarea class="draw-input" id="draw-input" placeholder="输入玩家名称，用逗号分隔&#10;例如：张三,李四,王五"></textarea>
          </div>
          <button class="draw-btn" id="btn-start-draw">🎯 开始抽签</button>
        </div>
      </div>
    `;
  },

  bindEvents() {
    // 房间选择
    document.getElementById('room-select')?.addEventListener('change', (e) => {
      const id = e.target.value;
      this.currentRoom = this.rooms.find(r => r.id === id) || null;
      this.render();
    });
    
    // 创建房间
    document.getElementById('btn-create')?.addEventListener('click', () => this.showModal('modal-create'));
    document.getElementById('confirm-create')?.addEventListener('click', () => this.createRoom());
    
    // 骰子和抽签
    document.getElementById('btn-draw')?.addEventListener('click', () => this.showDrawModal());
    document.getElementById('btn-start-draw')?.addEventListener('click', () => this.startDraw());
    
    // 添加玩家
    document.getElementById('add-player-inline')?.addEventListener('click', () => this.showModal('modal-add-player'));
    document.getElementById('confirm-add-player')?.addEventListener('click', () => this.addPlayer());
    
    // 设置 - 直接绑定到头部按钮
    document.getElementById('btn-settle')?.addEventListener('click', () => this.settleRoom());
    document.getElementById('confirm-settle')?.addEventListener('click', () => this.confirmSettle());
    document.getElementById('btn-reset')?.addEventListener('click', () => this.resetScores());
    document.getElementById('confirm-reset')?.addEventListener('click', () => this.confirmReset());
    document.getElementById('btn-delete')?.addEventListener('click', () => this.deleteRoom());
    document.getElementById('confirm-delete')?.addEventListener('click', () => this.confirmDelete());
    
    // 给分/得分
    document.getElementById('btn-give')?.addEventListener('click', () => this.showModal('modal-give'));
    document.getElementById('btn-receive')?.addEventListener('click', () => this.showModal('modal-receive'));
    document.getElementById('confirm-give')?.addEventListener('click', () => this.confirmGive());
    document.getElementById('confirm-receive')?.addEventListener('click', () => this.confirmReceive());
    
    // 玩家操作 - 单击行打开操作弹窗
    document.querySelectorAll('.player-row').forEach(el => {
      el.addEventListener('click', (e) => {
        // 如果点击的是头像，不触发行点击
        if (e.target.classList.contains('player-avatar')) return;
        const id = el.dataset.id;
        this.selectedPlayer = this.currentRoom.players.find(p => p.id === id);
        document.getElementById('player-modal-title').textContent = this.selectedPlayer.name;
        this.showModal('modal-player');
      });
    });
    
    // 头像双击设为庄家
    document.querySelectorAll('.player-avatar').forEach(el => {
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const playerId = el.dataset.playerId;
        const player = this.currentRoom.players.find(p => p.id === playerId);
        if (player && !player.isOwner) {
          this.currentRoom.players.forEach(p => p.isOwner = (p.id === playerId));
          this.saveData();
          this.render();
          this.toast(`${player.name} 已设为庄家`);
        }
      });
    });
    document.getElementById('player-pay')?.addEventListener('click', () => this.showPayModal());
    document.getElementById('player-rename')?.addEventListener('click', () => this.showRenameModal());
    document.getElementById('player-dealer')?.addEventListener('click', () => this.setAsDealer());
    document.getElementById('player-kick')?.addEventListener('click', () => this.kickPlayer());
    document.getElementById('confirm-pay')?.addEventListener('click', () => this.confirmPay());
    document.getElementById('confirm-rename')?.addEventListener('click', () => this.confirmRename());
    
    // 收支记录展开
    document.getElementById('toggle-records')?.addEventListener('click', () => {
      const list = document.getElementById('records-list');
      const icon = document.querySelector('.toggle-icon');
      if (list.style.display === 'none') {
        list.style.display = 'block';
        icon.textContent = '▲';
      } else {
        list.style.display = 'none';
        icon.textContent = '▼';
      }
    });
    
    // 关闭弹窗
    document.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', () => this.closeModal(el.dataset.close));
    });
    document.querySelectorAll('.modal-overlay').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el) el.classList.remove('show');
      });
    });
  },
  
  showModal(id) { document.getElementById(id)?.classList.add('show'); },
  closeModal(id) { document.getElementById(id)?.classList.remove('show'); },
  toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  },
  
  createRoom() {
    const input = document.getElementById('input-players').value.trim();
    const names = input.split(/[,，]/).map(n => n.trim()).filter(n => n);
    if (names.length < 2) { this.toast('至少需要2名玩家'); return; }
    if (names.length > 10) { this.toast('最多10名玩家'); return; }
    // 检查重名
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) { this.toast('玩家名称不能重复'); return; }
    
    const id = Math.floor(100000 + Math.random() * 900000).toString();
    const players = names.map((name, i) => ({
      id: Date.now().toString() + i,
      name,
      score: 0,
      isOwner: i === 0
    }));
    const room = { id, players, rounds: [], createTime: new Date().toLocaleString(), settled: false };
    this.rooms.unshift(room);
    this.currentRoom = room;
    this.saveData();
    this.closeModal('modal-create');
    this.render();
    this.toast('房间创建成功');
  },
  
  addPlayer() {
    const name = document.getElementById('input-player-name').value.trim();
    if (!name) { this.toast('请输入名称'); return; }
    if (this.currentRoom.players.some(p => p.name === name)) { this.toast('名称已存在'); return; }
    this.currentRoom.players.push({ id: Date.now().toString(), name, score: 0, isOwner: false });
    this.saveData();
    this.closeModal('modal-add-player');
    this.render();
    this.toast('添加成功');
  },

  confirmGive() {
    const dealer = this.currentRoom.players.find(p => p.isOwner) || this.currentRoom.players[0];
    const avgTotal = parseInt(document.getElementById('input-give-avg').value) || 0;
    const inputs = document.querySelectorAll('.score-input');
    const count = inputs.length;
    
    // 如果填了均摊总分
    if (avgTotal > 0) {
      if (avgTotal % count !== 0) {
        this.toast(`总分 ${avgTotal} 无法被 ${count} 人整除`);
        return;
      }
      const per = avgTotal / count;
      const scores = [];
      this.currentRoom.players.filter(p => !p.isOwner).forEach(p => {
        p.score += per;
        scores.push({ name: p.name, change: per });
      });
      dealer.score -= avgTotal;
      scores.push({ name: dealer.name, change: -avgTotal });
      this.currentRoom.rounds.push({ scores, time: new Date().toLocaleString() });
      this.saveData();
      this.closeModal('modal-give');
      this.render();
      this.toast(`每人 +${per}，记录成功`);
      return;
    }
    
    // 否则用单独输入的分数
    const scores = [];
    let total = 0;
    inputs.forEach(input => {
      const id = input.dataset.id;
      const change = parseInt(input.value) || 0;
      if (change !== 0) {
        const player = this.currentRoom.players.find(p => p.id === id);
        if (player) {
          player.score += change;
          total += change;
          scores.push({ name: player.name, change });
        }
      }
    });
    if (total !== 0) {
      dealer.score -= total;
      scores.push({ name: dealer.name, change: -total });
      this.currentRoom.rounds.push({ scores, time: new Date().toLocaleString() });
      this.saveData();
      this.toast('记录成功');
    } else {
      this.toast('请输入分数');
      return;
    }
    this.closeModal('modal-give');
    this.render();
  },
  
  confirmReceive() {
    const dealer = this.currentRoom.players.find(p => p.isOwner) || this.currentRoom.players[0];
    const avgTotal = parseInt(document.getElementById('input-receive-avg').value) || 0;
    const inputs = document.querySelectorAll('.receive-input');
    const count = inputs.length;
    
    // 如果填了均摊总分
    if (avgTotal > 0) {
      if (avgTotal % count !== 0) {
        this.toast(`总分 ${avgTotal} 无法被 ${count} 人整除`);
        return;
      }
      const per = avgTotal / count;
      const scores = [];
      this.currentRoom.players.filter(p => !p.isOwner).forEach(p => {
        p.score -= per;
        scores.push({ name: p.name, change: -per });
      });
      dealer.score += avgTotal;
      scores.push({ name: dealer.name, change: avgTotal });
      this.currentRoom.rounds.push({ scores, time: new Date().toLocaleString() });
      this.saveData();
      this.closeModal('modal-receive');
      this.render();
      this.toast(`每人 -${per}，记录成功`);
      return;
    }
    
    // 否则用单独输入的分数
    const scores = [];
    let total = 0;
    inputs.forEach(input => {
      const id = input.dataset.id;
      const change = parseInt(input.value) || 0;
      if (change !== 0) {
        const player = this.currentRoom.players.find(p => p.id === id);
        if (player) {
          player.score -= change;
          total += change;
          scores.push({ name: player.name, change: -change });
        }
      }
    });
    if (total !== 0) {
      dealer.score += total;
      scores.push({ name: dealer.name, change: total });
      this.currentRoom.rounds.push({ scores, time: new Date().toLocaleString() });
      this.saveData();
      this.toast('记录成功');
    } else {
      this.toast('请输入分数');
      return;
    }
    this.closeModal('modal-receive');
    this.render();
  },
  
  showPayModal() {
    this.closeModal('modal-player');
    document.getElementById('pay-desc').textContent = `支付给 ${this.selectedPlayer.name}`;
    document.getElementById('input-pay').value = '';
    this.showModal('modal-pay');
  },
  
  confirmPay() {
    const score = parseInt(document.getElementById('input-pay').value) || 0;
    if (score === 0) { this.toast('请输入分数'); return; }
    const dealer = this.currentRoom.players.find(p => p.isOwner) || this.currentRoom.players[0];
    this.selectedPlayer.score += score;
    dealer.score -= score;
    this.currentRoom.rounds.push({
      scores: [
        { name: this.selectedPlayer.name, change: score },
        { name: dealer.name, change: -score }
      ],
      time: new Date().toLocaleString()
    });
    this.saveData();
    this.closeModal('modal-pay');
    this.render();
    this.toast('操作成功');
  },
  
  showRenameModal() {
    this.closeModal('modal-player');
    document.getElementById('input-rename').value = this.selectedPlayer.name;
    this.showModal('modal-rename');
  },
  
  confirmRename() {
    const name = document.getElementById('input-rename').value.trim();
    if (!name) { this.toast('请输入名称'); return; }
    if (this.currentRoom.players.some(p => p.id !== this.selectedPlayer.id && p.name === name)) {
      this.toast('名称已存在'); return;
    }
    this.selectedPlayer.name = name;
    this.saveData();
    this.closeModal('modal-rename');
    this.render();
    this.toast('修改成功');
  },
  
  setAsDealer() {
    this.closeModal('modal-player');
    this.currentRoom.players.forEach(p => p.isOwner = (p.id === this.selectedPlayer.id));
    this.saveData();
    this.render();
    this.toast('已设为庄家');
  },
  
  kickPlayer() {
    this.closeModal('modal-player');
    if (this.selectedPlayer.isOwner) { this.toast('庄家不可踢出'); return; }
    if (confirm(`确定踢出 ${this.selectedPlayer.name}？`)) {
      this.currentRoom.players = this.currentRoom.players.filter(p => p.id !== this.selectedPlayer.id);
      this.saveData();
      this.render();
      this.toast('已踢出');
    }
  },
  
  settleRoom() {
    const sorted = [...this.currentRoom.players].sort((a, b) => b.score - a.score);
    const listHTML = sorted.map((p, i) => {
      let medal = '';
      if (i === 0) medal = '🥇';
      else if (i === 1) medal = '🥈';
      else if (i === 2) medal = '🥉';
      const scoreClass = p.score > 0 ? 'positive' : (p.score < 0 ? 'negative' : '');
      return `
        <div class="settle-item ${i < 3 ? 'top-' + (i + 1) : ''}">
          <span class="settle-rank">${medal || (i + 1)}</span>
          <span class="settle-name">${p.name}</span>
          <span class="settle-score ${scoreClass}">${p.score > 0 ? '+' : ''}${p.score}</span>
        </div>
      `;
    }).join('');
    document.getElementById('settle-list').innerHTML = listHTML;
    this.showModal('modal-settle');
  },
  
  confirmSettle() {
    this.currentRoom.players.forEach(p => p.score = 0);
    this.currentRoom.rounds = []; // 清空收支记录
    this.currentRoom.settled = false; // 保持进行中状态
    this.saveData();
    this.closeModal('modal-settle');
    this.render();
    this.toast('已结算，开始新一轮');
  },
  
  resetScores() {
    this.showModal('modal-reset');
  },
  
  confirmReset() {
    this.currentRoom.players.forEach(p => p.score = 0);
    this.saveData();
    this.closeModal('modal-reset');
    this.render();
    this.toast('已重置');
  },
  
  deleteRoom() {
    this.showModal('modal-delete');
  },
  
  confirmDelete() {
    this.rooms = this.rooms.filter(r => r.id !== this.currentRoom.id);
    this.currentRoom = this.rooms[0] || null;
    this.saveData();
    this.closeModal('modal-delete');
    this.render();
    this.toast('已解散');
  },
  
  showDrawModal() {
    if (this.currentRoom && this.currentRoom.players.length >= 2) {
      document.getElementById('draw-input').value = this.currentRoom.players.map(p => p.name).join(',');
    }
    this.showModal('modal-draw');
  },
  
  wheelColors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
  
  createWheel(names) {
    const count = names.length;
    const anglePerSegment = 360 / count;
    const radius = 140;
    const centerX = 150;
    const centerY = 150;
    
    let segments = '';
    let texts = '';
    
    names.forEach((name, i) => {
      const startAngle = (i * anglePerSegment - 90) * Math.PI / 180;
      const endAngle = ((i + 1) * anglePerSegment - 90) * Math.PI / 180;
      
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);
      
      const largeArc = anglePerSegment > 180 ? 1 : 0;
      const color = this.wheelColors[i % this.wheelColors.length];
      
      segments += `<path d="M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z" fill="${color}" stroke="#fff" stroke-width="2"/>`;
      
      const textAngle = ((i + 0.5) * anglePerSegment - 90) * Math.PI / 180;
      const textRadius = radius * 0.65;
      const textX = centerX + textRadius * Math.cos(textAngle);
      const textY = centerY + textRadius * Math.sin(textAngle);
      const textRotation = (i + 0.5) * anglePerSegment;
      
      const displayName = name.length > 4 ? name.substring(0, 4) + '..' : name;
      
      texts += `<text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${textRotation}, ${textX}, ${textY})" fill="#fff" font-size="14" font-weight="600" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${displayName}</text>`;
    });
    
    const outerRing = `<circle cx="${centerX}" cy="${centerY}" r="${radius + 5}" fill="none" stroke="#d97706" stroke-width="8"/>`;
    
    return `
      <div class="wheel-container">
        <div class="wheel-pointer-container">
          <svg width="30" height="30" viewBox="0 0 30 30">
            <polygon points="15,30 0,0 30,0" fill="#dc2626"/>
            <polygon points="15,26 4,4 26,4" fill="#ef4444"/>
          </svg>
        </div>
        <svg class="wheel-svg" id="wheel" viewBox="0 0 300 300">
          ${outerRing}
          ${segments}
          ${texts}
        </svg>
        <div class="wheel-center-btn">🎯</div>
      </div>
    `;
  },
  
  drawNames: [], // 保存抽签玩家列表
  
  startDraw() {
    // 如果有输入框，读取并保存；否则用之前保存的
    const inputEl = document.getElementById('draw-input');
    if (inputEl) {
      const input = inputEl.value.trim();
      this.drawNames = input.split(/[,，]/).map(n => n.trim()).filter(n => n);
    }
    const names = this.drawNames;
    
    if (names.length < 2) { this.toast('至少需要2人'); return; }
    if (names.length > 8) { this.toast('最多支持8人'); return; }
    
    const stage = document.getElementById('draw-stage');
    const btn = document.getElementById('btn-start-draw');
    
    // 随机选中
    const winnerIndex = Math.floor(Math.random() * names.length);
    const winner = names[winnerIndex];
    
    // 计算角度
    // 转盘初始状态：第0个扇形从顶部开始，顺时针排列
    // 每个扇形占 anglePerSegment 度
    // 第 i 个扇形的中心位置在 (i * anglePerSegment + anglePerSegment/2) 度
    // 要让第 winnerIndex 个扇形的中心对准顶部指针（0度位置）
    // 需要逆时针旋转（负角度）或顺时针旋转 360 - 目标角度
    const count = names.length;
    const anglePerSegment = 360 / count;
    const baseRotation = 360 * 6; // 转6圈
    // 目标扇形中心的初始角度
    const targetCenter = winnerIndex * anglePerSegment + anglePerSegment / 2;
    // 需要顺时针旋转的角度，让目标中心到达顶部（0度）
    const stopAngle = baseRotation + (360 - targetCenter);
    
    // 完全重建转盘和结果区域
    stage.innerHTML = this.createWheel(names) + '<div id="draw-result-area"></div>';
    btn.disabled = true;
    btn.textContent = '🎯 转动中...';
    
    const wheel = document.getElementById('wheel');
    
    // 强制从0度开始
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(0deg)';
    
    // 使用 setTimeout 确保重绘
    setTimeout(() => {
      wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      wheel.style.transform = `rotate(${stopAngle}deg)`;
    }, 20);
    
    const self = this;
    setTimeout(() => {
      const resultArea = document.getElementById('draw-result-area');
      if (resultArea) {
        resultArea.innerHTML = `<div class="draw-result">🎉 恭喜 <strong>${winner}</strong> 被抽中！</div>`;
      }
      btn.disabled = false;
      btn.textContent = '🎯 再来一次';
      btn.onclick = function() { self.startDraw(); };
    }, 4500);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
