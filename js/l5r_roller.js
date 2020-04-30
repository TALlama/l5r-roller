class Rollable {
  get successes() { return this.maxCountOf('S'); }
  get exploding() { return this.maxCountOf('R'); }
  get opportunities() { return this.maxCountOf('O'); }
  get strife() { return this.maxCountOf('X'); }
  

  get rolledSuccesses() { return this.rolledCountOf('S'); }
  get rolledExploding() { return this.rolledCountOf('R'); }
  get rolledOpportunities() { return this.rolledCountOf('O'); }
  get rolledStrife() { return this.rolledCountOf('X'); }
  
  rolledCountOf(symbol) {
    return this.symbols.reduce((count, sym) => sym === symbol ? count + 1 : count, 0);
  }
  
  maxCountOf(symbol, keeping=this.ringCount || 0) {
    return Math.min(keeping, this.rolledCountOf(symbol));
  }
  
  toString() {
    return this.symbols.join(", ");
  }
}

class Die extends Rollable {
  constructor(face = null) {
    super();
    this._face = face;
    this.kept = false;
  }
  
  get face() {
    this._face || this.roll();
    return this._face;
  }
  
  get symbols() {
    return this.face.split('');
  }
  
  get imageTag() {
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', "0 0 100 100");
    
    let useDie = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    useDie.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${this.dieType}-die`);
    useDie.setAttribute('x', 0);
    useDie.setAttribute('y', 0);
    useDie.setAttribute('width', 100);
    useDie.setAttribute('height', 100);
    svg.append(useDie);
    
    let useFace = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    useFace.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#face-${this.face}`);
    useFace.setAttribute('x', 0);
    useFace.setAttribute('y', 0);
    useFace.setAttribute('width', 100);
    useFace.setAttribute('height', 100);
    svg.append(useFace);
    return svg;
  }
  
  roll() {
    let faces = this.possibleFaces;
    this._face = faces[Math.floor(Math.random() * faces.length)];
  }
  
  toString() {
    return this.face;
  }
}

class RingDie extends Die {
  get possibleFaces() {return ['-', 'OX', 'O', 'SX', 'S', 'RX'];}
  get dieType() { return 'ring'; }
  toString() { return `[${super.toString()}]`; }
}

class SkillDie extends Die {
  get possibleFaces() {return ['-', '-', 'O', 'O', 'O', 'SX', 'SX', 'S', 'S', 'SO', 'RX', 'R'];}
  get dieType() { return 'skill'; }
  toString() { return `{${super.toString()}}`; }
}

class DicePool extends Rollable {
  constructor(ring, skill) {
    super();
    
    this.ringCount = Number(ring);
    this.skillCount = Number(skill);
  
    this.dice = [];
    for (let r = 0; r < this.ringCount; r++) {
      this.dice.push(new RingDie());
    }
    for (let s = 0; s < this.skillCount; s++) {
      this.dice.push(new SkillDie());
    }
  }
  
  get faces() {
    return this.dice.map(d => d.face).sort();
  }
  
  get symbols() {
    return this.dice.flatMap(d => d.symbols).sort();
  }
  
  roll() {
    this.dice.forEach(d => d.roll());
  }
  
  addDie(die) {
    this.dice.push(die);
    this[`${die.dieType}Count`] += 1;
  }
  
  static forDice(dice) {
    let ringCount = dice.reduce((count, d) => d.constructor == RingDie ? count + 1 : count, 0);
    let skillCount = dice.reduce((count, d) => d.constructor == SkillDie ? count + 1 : count, 0);
    return new DicePool(ringCount, skillCount);
  }
}

function roll(ring, skill) {
  let pool = new DicePool(ring, skill);
  alert(pool.symbols.join("|"));
}

class Rollbox {
  constructor(root) {
    this.root = root;
    this.addedDiceCount = 0;
  }
  
  get ringCount() { return Number(this.root.querySelector('.rollbox--ring').value); }
  set ringCount(v) { this.root.querySelector('.rollbox--ring').value = v }
  get skillCount() { return Number(this.root.querySelector('.rollbox--skill').value); }
  set skillCount(v) { this.root.querySelector('.rollbox--skill').value = v }
  get keepCount() { return this.ringCount + this.addedDiceCount; }
  
  get currentDiceTray() { return this.root.querySelector('.rollbox--current-dice-tray'); }
  get kept() { return this.root.querySelectorAll('.rollbox--keeper---kept'); }
  get keptInFirst() { return this.root.querySelectorAll('.dice-tray:first-of-type .rollbox--keeper---kept'); }
  get keptInCurrent() { return this.root.querySelectorAll('.rollbox--current-dice-tray .rollbox--keeper---kept'); }
  
  get keepsLeft() { return this.keepCount - this.keptInFirst.length; }
  get successes() { return this.keptCount(k => k.die.rolledSuccesses + k.die.rolledExploding); }
  get exploding() { return this.keptCount(k => k.die.rolledExploding, true); }
  get opportunities() { return this.keptCount(k => k.die.rolledOpportunities); }
  get strife() { return this.keptCount(k => k.die.rolledStrife); }
  
  get explodingDice() { return Array.prototype.filter.call(this.keptInCurrent, kept => kept.die.rolledExploding > 0).map(kept => new kept.die.constructor); }
  
  roll() {
    this.rerolls = 0;
    this.currentDiceTray.tray = null;
    
    this.dicePool = new DicePool(this.ringCount, this.skillCount);
    this.dicePool.roll();

    this.resetTrays();
    this.showDice(this.dicePool, {roll: true});
    this.updateOutcome();
  }
  
  rollExploding() {
    let pool = DicePool.forDice(this.explodingDice);
    new DiceTray(this.addDiceTray(), pool).addDice(this, {roll: true});
    this.updateOutcome();
  }
  
  addDiceTray() {
    let trays = this.root.querySelectorAll('.dice-tray');
    let last = trays[trays.length - 1];
    
    let tray = document.createElement('article');
    tray.classList.add('dice-tray');
    last.after(tray);
    
    this.setCurrentDiceTray(tray);
    
    return tray;
  }
  
  setCurrentDiceTray(tray) {
    this.root.querySelectorAll('.dice-tray').forEach(t => {
      t.classList.toggle('rollbox--current-dice-tray', t == tray);
    });
  }
  
  keptCount(fn, onlyCurrent=false) {
    let kept = onlyCurrent ? this.keptInCurrent : this.kept;
    return Array.prototype.map.call(kept, fn).reduce((c, i) => c + i, 0);
  }
  
  resetTrays() {
    this.root.querySelectorAll('.dice-tray:not(.rollbox--current-dice-tray)').forEach(t => t.remove());
  }
  
  addDie(die, {addAKeep} = {addAKeep: true}) {
    die.face || die.roll();
    
    if (addAKeep && die.dieType == 'ring') { this.addedDiceCount += 1;}
    
    let tray = this.currentDiceTray.tray || new DiceTray(this.currentDiceTray, new DicePool(0, 0));
    tray.addDie(die);
    this.showDice(tray.dicePool, {roll: die});
    this.updateOutcome();
  }
  
  showDice(dicePool = this.dicePool, options) {
    let trayRoot = this.currentDiceTray;
    
    let tray = trayRoot.tray || new DiceTray(trayRoot, dicePool);
    tray.empty();
    tray.addDice(this, options);
  }
  
  keepChanged(event) {
    let keeper = event.target.closest('.rollbox--keeper');
    keeper.classList.toggle('rollbox--keeper---kept', event.target.checked);
    this.updateOutcome();
  }
  
  updateOutcome() {
    this.root.querySelectorAll('*[data-shows]').forEach(el => {
      el.innerText = this[el.dataset.shows];
    });
    this.root.querySelectorAll('*[data-shown-if]').forEach(el => {
      el.classList.toggle('hidden', !this[el.dataset.shownIf]);
    });
  }
  
  static rooted(el) {
    return el.rollbox = el.rollbox || new Rollbox(el);
  }
  
  static setFromParams(search = window.location.search) {
    let rollbox = Rollbox.rooted(document.querySelector('.rollbox'));
    let params = new URLSearchParams(search);
    
    let ring = Number(params.get('ring') || 0);
    let skill = Number(params.get('skill') || 0);
    let hasCounts = ring + skill > 0;
    
    let rings = (params.get('rings') || '').split(',').filter(s => s);
    let skills = (params.get('skills') || '').split(',').filter(s => s);
    let hasFaces = [...rings, ...skills].length > 0;
    
    if (hasCounts) {
      rollbox.ringCount = ring;
      rollbox.skillCount = skill;
      
      document.querySelector('.rollbox--trigger').click();
    } else if (hasFaces) {
      rollbox.ringCount = rings.length;
      rollbox.skillCount = skills.length;
      
      rings.forEach(d => rollbox.addDie(new RingDie(d), {addAKeep: false}));
      skills.forEach(d => rollbox.addDie(new SkillDie(d)));
    } else {
      document.querySelector('.rollbox--trigger').click();
    }
  }
}

class DiceTray {
  constructor(root, dicePool) {
    this.root = root;
    this.dicePool = dicePool;
    
    this.root.tray = this;
  }
  
  empty() {
    this.root.innerText = '';
  }
  
  addDie(die) {
    this.dicePool.addDie(die);
  }
  
  addDice(rollbox, {roll} = {roll: false}) {
    this.dicePool.dice.forEach(die => {
      let keepUi = document.createElement('article');
      keepUi.classList.add('rollbox--keeper');
      keepUi.classList.toggle('rollbox--keeper---kept', die.kept);
      keepUi.die = die;
      
      let keepCheckUi = document.createElement('input');
      keepCheckUi.classList.add('sr-only');
      keepCheckUi.setAttribute('type', 'checkbox');
      keepCheckUi.checked = die.kept;
      keepCheckUi.addEventListener('change', e => {
        die.kept = e.target.checked;
        rollbox.keepChanged(e);
      });
      
      let dieUi = document.createElement('label');
      dieUi.classList.add('die');
      dieUi.classList.toggle('die---rerolling', roll === true || roll == die);
      dieUi.append(keepCheckUi);
      dieUi.append(die.imageTag);
      dieUi.addEventListener('animationend', (e) => dieUi.classList.remove('die---rerolling'));
      keepUi.append(dieUi);
      
      let actions = document.createElement('article');
      actions.classList.add('rollbox--keeper-actions');
      keepUi.append(actions);
      
      let rerollLink = document.createElement('a');
      rerollLink.setAttribute('href', '#');
      rerollLink.append('reroll');
      rerollLink.addEventListener('click', e => {
        e.preventDefault();
        
        die.roll();
        
        rollbox.rerolls += 1;
        rollbox.updateOutcome();
        
        dieUi.innerText = '';
        dieUi.append(keepCheckUi);
        dieUi.append(die.imageTag);
        
        
        dieUi.classList.add('die---rerolling');
      });
      actions.append(rerollLink);
      
      this.root.append(keepUi);
    });
  }
}

document.addEventListener('click', event => {
  if (event.target.matches('.rollbox--trigger')) {
    event.preventDefault();
    Rollbox.rooted(event.target.closest('.rollbox')).roll(event);
  } else if (event.target.matches('.rollbox--action---roll-exploding')) {
    event.preventDefault();
    Rollbox.rooted(event.target.closest('.rollbox')).rollExploding(event);
  } else if (event.target.matches('.rollbox--action---add-ring-die')) {
    event.preventDefault();
    Rollbox.rooted(event.target.closest('.rollbox')).addDie(new RingDie());
  } else if (event.target.matches('.rollbox--action---add-skill-die')) {
    event.preventDefault();
    Rollbox.rooted(event.target.closest('.rollbox')).addDie(new SkillDie());
  }
})

Rollbox.setFromParams(window.location.search);
