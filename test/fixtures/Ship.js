// Test fixture: Ship.js
const { SignalBus } = require('./SignalBus');

const SHIP_STATES = { PATROL: 'PATROL', ATTACK: 'ATTACK' };

class Ship {
  constructor(id) {
    this.id = id;
    this.shields = 100;
  }

  takeDamage(amount) {
    this.shields -= amount;
    if (this.shields <= 0) {
      this.completeDestruction();
    }
  }

  completeDestruction() {
    SignalBus.emit('SHIP_DESTROYED', { shipId: this.id });
  }

  update(dt) {
    if (this.shields < 100) {
      this.shields += dt * 5;
    }
  }
}

module.exports = { Ship, SHIP_STATES };
