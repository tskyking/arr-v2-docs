# Sources Inventory

## Reference materials
- ARR rebuild specification PDF
- Transcript/summary PDF
- Demo video
- Contract/ARR workbook
- Architecture and planning docs created in this workspace

## Recovered code
### Frontend
- React frontend source (`src`, `public`, `package.json`, `package-lock.json`)

### Backend
- Django/DRF backend archive unpacked under source/backend
- Includes authentication, invoice, services, quickbook, company modules
- Includes requirements and settings

## Notes
- Legacy backend bundle included extra baggage such as venv, sqlite db, env/config traces, backups, and pyc files.
- Those artifacts reinforce the decision to treat legacy code as reference rather than final deployable architecture.
