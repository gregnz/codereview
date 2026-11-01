// Test fixture: Simulation.js
const { Ship } = require('./Ship');
const { updateLasers } = require('./Weapons');
const { SignalBus } = require('./SignalBus');

class Simulation {
  constructor() {
    this.ships = [new Ship(1), new Ship(2)];
    SignalBus.on('SHIP_DESTROYED', (payload) => {
      this.onShipLost(payload);
    });
  }

  onShipLost(payload) {
    this.ships = this.ships.filter(s => s.id !== payload.shipId);
  }

  updateSimulation(dt) {
    for (const s of this.ships) {
      s.update(dt);
    }
    updateLasers(this.ships);
  }
}

module.exports = { Simulation };
