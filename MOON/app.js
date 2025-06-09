(() => {

  function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function sanitizeNickname(name) {
    return name.trim().substring(0, 25);
  }

  function saveRoomToStorage(room) {
    localStorage.setItem('moon-game-room-' + room.code, JSON.stringify(room));
  }

  function loadRoomFromStorage(code) {
    const raw = localStorage.getItem('moon-game-room-' + code);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function savePlayerVotes(roomCode, nickname, votes) {
    localStorage.setItem('moon-game-votes-' + roomCode + '-' + nickname, JSON.stringify(votes));
  }

  function loadPlayerVotes(roomCode, nickname) {
    const raw = localStorage.getItem('moon-game-votes-' + roomCode + '-' + nickname);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getAllPlayerVotes(room) {
    const results = {};
    room.players.forEach(p => {
      results[p] = {};
    });
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('moon-game-votes-' + room.code + '-')) {
        try {
          const votesData = JSON.parse(localStorage.getItem(key));
          const voter = key.substring(('moon-game-votes-' + room.code + '-').length);
          results[voter] = votesData;
        } catch {}
      }
    }
    return results;
  }

  function countVotesForPlayers(room, allVotes) {
    const voteCounts = {};
    room.players.forEach(p => {
      voteCounts[p] = 0;
    });
    for (const voter in allVotes) {
      const voterVotes = allVotes[voter];
      for (const votedPlayer in voterVotes) {
        if (votedPlayer !== voter && voteCounts.hasOwnProperty(votedPlayer)) {
          let v = parseInt(voterVotes[votedPlayer]);
          if (!isNaN(v) && v > 0) voteCounts[votedPlayer] += v;
        }
      }
    }
    return voteCounts;
  }

  function calculateScoreTier(votes, playerCount) {
    if (playerCount <= 0) return 'X';
    if (votes === 0) return 'X';
    if (votes >= 0.6 * playerCount) return 'A';
    if (votes >= 0.4 * playerCount) return 'B';
    if (votes >= 0.2 * playerCount) return 'C';
    return 'D';
  }

  function validateVotesInput(votes, self, maxVotes = 5) {
    let sum = 0;
    for (const p in votes) {
      if (p === self) {
        if (votes[p] !== 0) return false;
      }
      const val = parseInt(votes[p]);
      if (isNaN(val) || val < 0) return false;
      sum += val;
    }
    if (sum > maxVotes) return false;
    return true;
  }

  let state = {
    nickname: '',
    room: null,
    votes: {},
  };

  const screens = {
    login: document.getElementById('login-screen'),
    createRoom: document.getElementById('create-room-screen'),
    joinRoom: document.getElementById('join-room-screen'),
    room: document.getElementById('room-screen'),
    results: document.getElementById('results-screen'),
  };

  const nicknameInput = document.getElementById('nickname-input');
  const btnCreateRoom = document.getElementById('btn-create-room');
  const btnJoinRoom = document.getElementById('btn-join-room');

  const createRoomForm = document.getElementById('create-room-form');
  const maxPlayersInput = document.getElementById('max-players-input');
  const btnCreateRoomSubmit = document.getElementById('btn-create-room-submit');
  const btnCreateRoomBack = document.getElementById('btn-create-room-back');

  const joinRoomForm = document.getElementById('join-room-form');
  const roomCodeInput = document.getElementById('room-code-input');
  const btnJoinRoomSubmit = document.getElementById('btn-join-room-submit');
  const btnJoinRoomBack = document.getElementById('btn-join-room-back');
  const joinErrorMessage = document.getElementById('join-error-message');

  const roomCodeDisplay = document.getElementById('room-code-display');
  const roomMaxPlayers = document.getElementById('room-max-players');
  const roomPlayerCount = document.getElementById('room-player-count');
  const votesRemainingElem = document.getElementById('votes-remaining');
  const playersVoteList = document.getElementById('players-vote-list');
  const votingForm = document.getElementById('voting-form');
  const submitVotesBtn = document.getElementById('submit-votes-btn');
  const btnShowResults = document.getElementById('btn-show-results');

  const resultsList = document.getElementById('results-list');
  const btnPlayAgain = document.getElementById('btn-play-again');

  function showScreen(name) {
    Object.entries(screens).forEach(([k, v]) => {
      if (k === name) v.classList.add('active');
      else v.classList.remove('active');
    });
  }

  function validateNickname() {
    const val = nicknameInput.value.trim();
    return val.length > 0 && val.length <= 25;
  }

  function validateMaxPlayers() {
    const val = parseInt(maxPlayersInput.value);
    return !isNaN(val) && val >= 1 && val <= 2000;
  }

  function validateRoomCodeInput() {
    const val = roomCodeInput.value.trim().toUpperCase();
    return /^[A-Z0-9]{4}$/.test(val);
  }

  function updateLoginButtonsState() {
    const validNick = validateNickname();
    btnCreateRoom.disabled = !validNick;
    btnJoinRoom.disabled = !validNick;
  }

  function updateCreateRoomSubmit() {
    btnCreateRoomSubmit.disabled = !validateMaxPlayers();
  }

  function updateJoinRoomSubmit() {
    btnJoinRoomSubmit.disabled = !validateRoomCodeInput();
  }

  nicknameInput.addEventListener('input', updateLoginButtonsState);
  maxPlayersInput.addEventListener('input', updateCreateRoomSubmit);
  roomCodeInput.addEventListener('input', () => {
    roomCodeInput.value = roomCodeInput.value.toUpperCase();
    updateJoinRoomSubmit();
    joinErrorMessage.style.display = 'none';
    joinErrorMessage.textContent = '';
  });

  btnCreateRoom.addEventListener('click', () => {
    maxPlayersInput.value = '';
    btnCreateRoomSubmit.disabled = true;
    showScreen('createRoom');
  });

  btnJoinRoom.addEventListener('click', () => {
    roomCodeInput.value = '';
    btnJoinRoomSubmit.disabled = true;
    joinErrorMessage.style.display = 'none';
    joinErrorMessage.textContent = '';
    showScreen('joinRoom');
  });

  btnCreateRoomBack.addEventListener('click', () => showScreen('login'));
  btnJoinRoomBack.addEventListener('click', () => showScreen('login'));

  createRoomForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateNickname() || !validateMaxPlayers()) return;

    const nickname = sanitizeNickname(nicknameInput.value);
    const maxPlayers = Math.min(Math.max(parseInt(maxPlayersInput.value), 1), 2000);

    let code;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      if (attempts > 50) break;
    } while (loadRoomFromStorage(code) !== null);

    const room = {
      code,
      maxPlayers,
      players: [nickname],
      createdAt: Date.now(),
    };
    saveRoomToStorage(room);

    state.nickname = nickname;
    state.room = room;
    state.votes = {};
    savePlayerVotes(room.code, nickname, {});

    roomCodeDisplay.textContent = 'Room Code: ' + room.code;
    roomMaxPlayers.textContent = room.maxPlayers.toString();
    roomPlayerCount.textContent = room.players.length.toString();
    playersVoteList.innerHTML = 'Loading players...';
    playersVoteList.classList.add('loading');

    showScreen('room');

    setTimeout(() => {
      renderRoom();
      playersVoteList.classList.remove('loading');
    }, 10);
  });

  joinRoomForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateNickname() || !validateRoomCodeInput()) return;

    const nickname = sanitizeNickname(nicknameInput.value);
    const code = roomCodeInput.value.toUpperCase();
    const room = loadRoomFromStorage(code);

    if (!room) {
      joinErrorMessage.style.display = 'block';
      joinErrorMessage.textContent = 'Room not found. Please check the code.';
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      joinErrorMessage.style.display = 'block';
      // FIX: Use backticks for template literals
      joinErrorMessage.textContent = `Room is full (max ${room.maxPlayers} players).`;
      return;
    }
    if (room.players.includes(nickname)) {
      joinErrorMessage.style.display = 'block';
      joinErrorMessage.textContent = 'Nickname already taken in this room.';
      return;
    }

    room.players.push(nickname);
    saveRoomToStorage(room);

    state.nickname = nickname;
    state.room = room;
    state.votes = loadPlayerVotes(code, nickname) || {};
    savePlayerVotes(code, nickname, state.votes);
    renderRoom();
    showScreen('room');
  });

  function renderRoom() {
    const {
      room,
      nickname,
      votes
    } = state;
    if (!room) return;

    roomCodeDisplay.textContent = 'Room Code: ' + room.code;
    roomMaxPlayers.textContent = room.maxPlayers.toString();
    roomPlayerCount.textContent = room.players.length.toString();

    const updatedRoom = loadRoomFromStorage(room.code);
    if (updatedRoom) {
      state.room.players = updatedRoom.players;
    }

    playersVoteList.innerHTML = '';
    const players = state.room.players;
    const maxVotes = 5;
    players.forEach(p => {
      if (!(p in state.votes)) {
        state.votes[p] = 0;
      }
    });

    let usedVotes = 0;
    for (const p in state.votes) {
      if (p !== nickname) {
        const v = parseInt(state.votes[p]);
        if (!isNaN(v) && v > 0) usedVotes += v;
      }
    }
    const votesRemaining = maxVotes - usedVotes;
    votesRemainingElem.textContent = votesRemaining;

    let validVotes = validateVotesInput(state.votes, nickname, maxVotes);

    players.forEach(p => {
      const isSelf = (p === nickname);
      const val = isSelf ? 0 : (state.votes[p] || 0);
      const inputId = 'vote-input-' + p;

      const div = document.createElement('div');
      div.className = 'player-item';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'player-name';
      nameSpan.textContent = p + (isSelf ? ' (You)' : '');
      // FIX: Use backticks for template literals
      nameSpan.setAttribute('title', isSelf ? 'You cannot vote for yourself' : `Vote for ${p}`);

      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'vote-input';
      input.min = '0';
      input.max = (isSelf ? '0' : String(maxVotes));
      input.value = val;
      input.id = inputId;
      // FIX: Use backticks for template literals
      input.setAttribute('aria-label', isSelf ? 'Votes for yourself disabled' : `Votes for player ${p}`);
      input.disabled = isSelf;

      input.addEventListener('input', (ev) => {
        let v = ev.target.value;
        v = v.replace(/[^\d]/g, '');
        if (v === '') v = '0';
        let num = parseInt(v);
        if (isNaN(num)) num = 0;
        if (num < 0) num = 0;
        if (num > maxVotes) num = maxVotes;
        ev.target.value = num;

        state.votes[p] = num;

        let sumVotes = 0;
        for (const player in state.votes) {
          if (player !== nickname) sumVotes += parseInt(state.votes[player]) || 0;
        }

        if (sumVotes > maxVotes) {
          const diff = sumVotes - maxVotes;
          let corrected = num - diff;
          if (corrected < 0) corrected = 0;
          state.votes[p] = corrected;
          ev.target.value = corrected;
          sumVotes = maxVotes;
        }

        votesRemainingElem.textContent = maxVotes - sumVotes;

        const valid = validateVotesInput(state.votes, nickname, maxVotes);
        submitVotesBtn.disabled = !valid;
      });

      div.appendChild(nameSpan);
      div.appendChild(input);

      playersVoteList.appendChild(div);
    }); // This is the closing brace for the players.forEach loop

    submitVotesBtn.disabled = !validVotes;
  } // This is the closing brace for the renderRoom() function

  votingForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!state.room) return;

    const valid = validateVotesInput(state.votes, state.nickname, 5);
    if (!valid) {
      alert('Invalid votes. Total votes must be at most 5, and you cannot vote for yourself.');
      return;
    }

    savePlayerVotes(state.room.code, state.nickname, state.votes);
    alert('Votes saved successfully!');
    submitVotesBtn.disabled = true;
  });

  btnShowResults.addEventListener('click', () => {
    if (!state.room) return;

    const allVotes = getAllPlayerVotes(state.room);
    const voteCounts = countVotesForPlayers(state.room, allVotes);

    const playerCount = (state.room && state.room.players.length) || 1;

    const sortedPlayers = Object.entries(voteCounts)
      .sort((a, b) => b[1] - a[1]);

    resultsList.innerHTML = '';
    const maxCount = sortedPlayers.length > 0 ? sortedPlayers[0][1] || 1 : 1;

    sortedPlayers.forEach(([player, count]) => {
      const tier = calculateScoreTier(count, playerCount);

      const div = document.createElement('div');
      div.className = 'results-item';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = player;

      const detailsDiv = document.createElement('div');
      detailsDiv.style.display = 'flex';
      detailsDiv.style.alignItems = 'center';

      const countSpan = document.createElement('span');
      countSpan.textContent = count.toString();

      const tierSpan = document.createElement('span');
      tierSpan.className = 'score-tier';
      tierSpan.textContent = tier;
      // FIX: Use backticks for template literals
      tierSpan.title = `Score Tier: ${tier}`;

      const barContainer = document.createElement('div');
      barContainer.className = 'vote-bar-container';
      barContainer.setAttribute('aria-hidden', 'true');

      const barFill = document.createElement('div');
      barFill.className = 'vote-bar-fill';

      const widthPercent = maxCount === 0 ? 0 : (count / maxCount) * 100;
      barFill.style.width = widthPercent + '%';

      barContainer.appendChild(barFill);
      detailsDiv.appendChild(countSpan);
      detailsDiv.appendChild(barContainer);
      detailsDiv.appendChild(tierSpan);

      div.appendChild(nameSpan);
      div.appendChild(detailsDiv);

      resultsList.appendChild(div);
    });

    showScreen('results');
  });

  btnPlayAgain.addEventListener('click', () => {
    state.nickname = '';
    state.room = null;
    state.votes = {};
    nicknameInput.value = '';
    maxPlayersInput.value = '';
    roomCodeInput.value = '';
    submitVotesBtn.disabled = true;
    btnCreateRoom.disabled = true;
    btnJoinRoom.disabled = true;
    showScreen('login');
  });

  updateLoginButtonsState();

  playersVoteList.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      const focusable = playersVoteList.querySelectorAll('input.vote-input');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

})();