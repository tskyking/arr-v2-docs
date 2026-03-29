# Discord Channel Index

## Purpose
Map Discord channels/categories to topic memory files so new interactions can be logged to the right place with minimal ambiguity.

## Guild
- Guild/server id: `1067660173814005782`

## Known Mappings
- `#health-family` → `topics/health-family.md`
  - channel id: `1485512852826755153`
- general coordination / tagged channel → `topics/discord-general-coordination.md`
  - channel id: `1484937086762094683`
- `#life-ops` → `topics/discord-life-ops.md`
  - channel id: unknown pending confirmation
- `#travel-fun` → `topics/discord-travel-fun.md`
  - channel id: unknown pending confirmation
- `#saas-build` → `topics/discord-saas-build.md`
  - channel id: unknown pending confirmation
- server-wide operational context → `topics/discord-server-ops.md`
  - applies across channels

## Rules
- When a new Discord channel appears and becomes active, create a corresponding topic file if it represents a durable project/domain/category.
- Record the exact channel id in both this index and the topic file.
- Keep day-by-day events in `memory/YYYY-MM-DD.md` and stable/channel-specific context in the topic file.
- Do not collapse uncertain events into a single confident summary.
