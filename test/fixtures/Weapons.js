// Test fixture: Weapons.js
const { Ship } = require('./Ship');

class LaserBolt {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  update(dt) {
    this.x += dt * 100;
  }
}

function updateLasers(ships) {
  for (const s of ships) {
    s.takeDamage(25);
  }
}

module.exports = { LaserBolt, updateLasers };
