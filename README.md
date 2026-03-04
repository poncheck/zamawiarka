# Zamawiarka

Prosta webowa zamawiarka ciast zintegrowana z systemem GoPOS.

## Wymagania

- Docker + Docker Compose (do uruchomienia na serwerze)
- Konto GoPOS z dostępem do API (client_id, client_secret, organization_id)

## Szybki start

### 1. Klonowanie i konfiguracja

```bash
git clone <adres_repo> zamawiarka
cd zamawiarka
cp .env.example .env
```

Otwórz `.env` i uzupełnij dane GoPOS:

```env
GOPOS_CLIENT_ID=...
GOPOS_CLIENT_SECRET=...
GOPOS_ORGANIZATION_ID=...
```

### 2. Uruchomienie

```bash
docker compose up -d
```

Aplikacja będzie dostępna pod adresem `http://<ip-serwera>:3000`.

### 3. Logi

```bash
docker compose logs -f
```

### 4. Zatrzymanie

```bash
docker compose down
```

## Aktualizacja

```bash
git pull
docker compose up -d --build
```

## Struktura projektu

```
zamawiarka/
├── src/
│   ├── server.js              # Serwer Express
│   ├── routes/
│   │   ├── items.js           # GET /api/items, /api/categories
│   │   └── orders.js          # POST /api/orders
│   └── services/
│       └── gopos.js           # Klient GoPOS API (OAuth2 + cache tokenu)
├── public/
│   ├── index.html             # Strona zamawiania
│   ├── css/style.css
│   └── js/app.js
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

## Jak działa integracja z GoPOS

1. Backend pobiera token OAuth2 z `https://app.gopos.io/oauth/token` (grant_type=organization).
2. Token jest cachowany w pamięci i automatycznie odświeżany 60 s przed wygaśnięciem.
3. Produkty: `GET /api/v3/{organization_id}/items`
4. Zamówienie: `POST /api/v3/{organization_id}/orders`

### Typy zamówień (pole `type`)

| Wartość | Opis |
|---------|------|
| `PICK_UP` | Odbiór osobisty |
| `DINE_IN` | Na miejscu |
| `DELIVERY` | Dostawa |
| `ROOM_SERVICE` | Room service |

## API backendu

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/api/items` | GET | Lista produktów (opcjonalnie `?category_id=`) |
| `/api/categories` | GET | Lista kategorii |
| `/api/orders` | POST | Utwórz zamówienie |
| `/api/payment-methods` | GET | Metody płatności |
| `/health` | GET | Health check |

### Przykład zamówienia (POST /api/orders)

```json
{
  "type": "PICK_UP",
  "items": [
    { "item_id": 123, "quantity": 2 },
    { "item_id": 456, "quantity": 1 }
  ],
  "customer_name": "Jan Kowalski",
  "phone": "+48 123 456 789",
  "notes": "Bez orzechów"
}
```

## Uruchomienie lokalne (bez Dockera)

```bash
npm install
cp .env.example .env
# uzupełnij .env
npm start
# lub w trybie developerskim:
npm run dev
```
