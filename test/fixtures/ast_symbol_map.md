# Tree-Sitter AST Symbol Map & Multi-Hop Blast Radius Index

*Generated automatically by `tools/ast-outline.js` using Tree-Sitter GLR parsers.*
*Includes disambiguated caller resolution, multi-hop reachability, and architectural complexity hotspot ratings.*

## Domain Concept & Intent Routing Index

*High-level semantic map bridging human developer terminology to underlying subsystems and code symbols.*

| Human Concept Domain | Subsystem Category | Governing Files | Key Enums & Canonical Symbols |
| :--- | :--- | :--- | :--- |
| **Autonomy & AI Decision Making** | AI / Behavior | `test/fixtures/Ship.js` | `SHIP_STATES` |
| **Weapons & Combat Systems** | Simulation / Combat | `test/fixtures/Weapons.js`, `test/fixtures/Ship.js` | `SHIP_STATES`, `updateLasers`, `LaserBolt`, `constructor` |
| **Actors & Game Entities** | Entities / Models | `test/fixtures/Ship.js`, `test/fixtures/Simulation.js` | `SHIP_STATES`, `Ship`, `constructor`, `takeDamage` |
| **Workflows, Missions & Contracts** | Domain / Progression | `test/fixtures/Ship.js` | `SHIP_STATES`, `completeDestruction` |
| **Events, Triggers & Messaging** | Engine / Events | `test/fixtures/SignalBus.js` | `emit`, `SignalBus`, `on` |

> ⚡ **Key Cross-Concept Intersections (Common Bug Hotspots):**
> - `/Users/gregday/projects/codereview/test/fixtures/Ship.js#Ship.completeDestruction` (test/fixtures/Ship.js:L20) ──[calls]──► `/Users/gregday/projects/codereview/test/fixtures/SignalBus.js#SignalBus.emit` (test/fixtures/SignalBus.js:L3)
>   *(Weapons & Combat Systems ──► Events, Triggers & Messaging)*
> - `/Users/gregday/projects/codereview/test/fixtures/Ship.js#Ship.completeDestruction` (test/fixtures/Ship.js:L20) ──[calls]──► `/Users/gregday/projects/codereview/test/fixtures/SignalBus.js#SignalBus.emit` (test/fixtures/SignalBus.js:L3)
>   *(Actors & Game Entities ──► Events, Triggers & Messaging)*
> - `/Users/gregday/projects/codereview/test/fixtures/Ship.js#Ship.completeDestruction` (test/fixtures/Ship.js:L20) ──[calls]──► `/Users/gregday/projects/codereview/test/fixtures/SignalBus.js#SignalBus.emit` (test/fixtures/SignalBus.js:L3)
>   *(Workflows, Missions & Contracts ──► Events, Triggers & Messaging)*
> - `/Users/gregday/projects/codereview/test/fixtures/Weapons.js#updateLasers` (test/fixtures/Weapons.js:L17) ──[calls]──► `/Users/gregday/projects/codereview/test/fixtures/Ship.js#Ship.takeDamage` (test/fixtures/Ship.js:L12)
>   *(Weapons & Combat Systems ──► Actors & Game Entities)*
> - `/Users/gregday/projects/codereview/test/fixtures/Ship.js#Ship.takeDamage` (test/fixtures/Ship.js:L15) ──[calls]──► `/Users/gregday/projects/codereview/test/fixtures/Ship.js#Ship.completeDestruction` (test/fixtures/Ship.js:L19)
>   *(Weapons & Combat Systems ──► Actors & Game Entities)*

## Subsystem Layer: Entities & Physics

### `test/fixtures/Ship.js` (31 lines)

**State Enums & Data Tables:**
- `SHIP_STATES` [L4-L4]: `PATROL, ATTACK`

**Classes:**
- **`Ship`** [L6-L28]
  - 💥 *Class Blast Radius: LOW (1 caller in 1 file)*
  - `constructor(id)` [L7-L10]
  - `takeDamage(amount)` [L12-L17]
    - 💥 *Blast Radius [1 direct, 2 transitive callers]*: `updateLasers` (test/fixtures/Weapons.js:L17)
  - `completeDestruction()` [L19-L21]
    - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `takeDamage` (test/fixtures/Ship.js:L15)
  - `update(dt)` [L23-L27]

### `test/fixtures/Weapons.js` (22 lines)

**Classes:**
- **`LaserBolt`** [L4-L13]
  - `constructor(x, y)` [L5-L8]
  - `update(dt)` [L10-L12]

**Functions:**
- `updateLasers(ships)` [L15-L19]
  - 💥 *Blast Radius [1 direct, 1 transitive callers]*: `updateSimulation` (test/fixtures/Simulation.js:L22)

## Subsystem Layer: Infrastructure

### `test/fixtures/SignalBus.js` (7 lines)

**Classes:**
- **`SignalBus`** [L2-L5] — *Test fixture: SignalBus.js*
  - `static emit(event, payload = {})` [L3-L3]
    - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `completeDestruction` (test/fixtures/Ship.js:L20)
  - `static on(event, handler)` [L4-L4]
    - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `constructor` (test/fixtures/Simulation.js:L9)

## Subsystem Layer: Simulation

### `test/fixtures/Simulation.js` (27 lines)

**Classes:**
- **`Simulation`** [L6-L24]
  - `constructor()` [L7-L12]
    - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `completeDestruction` (test/fixtures/Ship.js:L20)
  - `onShipLost(payload)` [L14-L16]
    - 💥 *Blast Radius [1 direct, 3 transitive callers]*: `constructor` (test/fixtures/Simulation.js:L10)
  - `updateSimulation(dt)` [L18-L23]

