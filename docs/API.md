
# Trip Budget Manager - API Documentation

Base URL: `http://localhost:3000`

## Authentication

All `/api/*` routes require authentication. The app uses Google OAuth 2.0 with session cookies.

### Endpoints

#### `GET /auth/google`
Initiates Google OAuth flow. Redirects to Google sign-in page.

#### `GET /auth/google/callback`
OAuth callback handler. Redirects to frontend after successful authentication.

#### `GET /auth/me`
Returns the current authenticated user.

**Response (200):**
```json
{
  "user": {
    "id": "clx123...",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://..."
  }
}
```

**Response (401):**
```json
{
  "error": "Not authenticated",
  "user": null
}
```

#### `POST /auth/logout`
Logs out the current user and destroys the session.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## Trips

#### `GET /api/trips`
Get all trips for the authenticated user.

**Response (200):**
```json
[
  {
    "id": "clx123...",
    "name": "Europe Summer 2024",
    "destinations": ["FR", "IT", "ES"],
    "startDate": "2024-06-01T00:00:00.000Z",
    "endDate": "2024-06-15T00:00:00.000Z",
    "totalBudget": 5000,
    "currency": "EUR",
    "isActive": true,
    "spent": 1234.56,
    "expenseCount": 15
  }
]
```

#### `GET /api/trips/:id`
Get a single trip with all expenses.

#### `POST /api/trips`
Create a new trip.

**Request Body:**
```json
{
  "name": "Japan Trip",
  "destinations": ["JP"],
  "startDate": "2024-10-01",
  "endDate": "2024-10-14",
  "totalBudget": 3000,
  "currency": "USD"
}
```

#### `PUT /api/trips/:id`
Update an existing trip.

#### `DELETE /api/trips/:id`
Delete a trip and all its expenses.

#### `POST /api/trips/:id/activate`
Set a trip as the active trip.

---

## Expenses

#### `GET /api/expenses/trip/:tripId`
Get all expenses for a specific trip.

**Response (200):**
```json
[
  {
    "id": "clx456...",
    "tripId": "clx123...",
    "amount": 45.50,
    "currency": "EUR",
    "category": "🍔 Food",
    "date": "2024-06-02T00:00:00.000Z",
    "description": "Lunch at cafe",
    "paymentMethod": "card",
    "location": "Paris",
    "isSplit": false,
    "splitCategories": null
  }
]
```

#### `POST /api/expenses`
Create a new expense.

**Request Body:**
```json
{
  "tripId": "clx123...",
  "amount": 45.50,
  "currency": "EUR",
  "category": "🍔 Food",
  "date": "2024-06-02",
  "description": "Lunch at cafe",
  "paymentMethod": "card",
  "location": "Paris"
}
```

#### `PUT /api/expenses/:id`
Update an existing expense.

#### `DELETE /api/expenses/:id`
Delete an expense.

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message here",
  "message": "Additional details (optional)"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `404` - Not Found
- `500` - Internal Server Error