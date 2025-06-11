# Quality Blinds Backend API Documentation

## Base URL

```
http://localhost:3001
```

## API Endpoints

### 1. Chat Endpoints

#### POST /api/chat

Envía un mensaje al chatbot y recibe una respuesta inteligente.

**Request Body:**

```json
{
  "message": "string (required) - El mensaje del usuario",
  "conversation": "array (optional) - Historial de conversación en formato OpenAI"
}
```

**Response:**

```json
{
  "reply": "string - Respuesta del chatbot"
}
```

**Error Response:**

```json
{
  "error": "string - Descripción del error"
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I need information about roller blinds"}'
```

#### POST /api/chat/summary

Genera un resumen profesional de una conversación de chatbot.

**Request Body:**

```json
{
  "messages": [
    {
      "type": "user | bot",
      "content": "string - Contenido del mensaje",
      "timestamp": "Date - Timestamp del mensaje"
    }
  ]
}
```

**Response:**

```json
{
  "summary": "string - Resumen profesional de la conversación"
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/chat/summary \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"type":"user","content":"I need roller blinds","timestamp":"2023-06-11T10:00:00Z"}]}'
```

### 2. Contact Endpoints

#### POST /api/contact

Procesa formularios de contacto con soporte para subida de imágenes.

**Request Body (FormData):**

```
name: string (required) - Nombre del cliente
email: string (required) - Email del cliente
phone: string (required) - Teléfono del cliente
message: string (required) - Mensaje del cliente
service: string (required) - Tipo de servicio solicitado
product: string (required) - Producto de interés
address: string (optional) - Dirección del cliente
postcode: string (optional) - Código postal
chatSummary: string (optional) - Resumen de conversación del chatbot
images: File[] (optional) - Hasta 10 imágenes
```

**Response:**

```json
{
  "success": true,
  "message": "Contact form submitted successfully"
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "0412345678",
    "message": "I need a quote for blinds",
    "service": "measure-quote",
    "product": "roller-blinds"
  }'
```

### 3. Reviews Endpoints

#### GET /api/reviews/google

Obtiene reviews de Google My Business (datos mock).

**Response:**

```json
{
  "success": true,
  "data": {
    "rating": 4.9,
    "totalReviews": 147,
    "reviews": [
      {
        "author_name": "string",
        "rating": 5,
        "relative_time_description": "string",
        "text": "string",
        "time": 1234567890,
        "language": "en",
        "profile_photo_url": "string"
      }
    ]
  }
}
```

**Example:**

```bash
curl http://localhost:3001/api/reviews/google
```

#### GET /api/reviews/user

Obtiene reviews de usuarios para un producto específico.

**Query Parameters:**

- `productId` (required): ID del producto

**Response:**

```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "string",
        "name": "string",
        "rating": 5,
        "title": "string",
        "comment": "string",
        "timestamp": 1234567890,
        "helpful": 0,
        "isVerified": true
      }
    ],
    "totalReviews": 0,
    "averageRating": 0
  }
}
```

**Example:**

```bash
curl "http://localhost:3001/api/reviews/user?productId=roller-blinds"
```

#### POST /api/reviews/user

Envía una nueva review de usuario.

**Request Body:**

```json
{
  "productId": "string (required)",
  "name": "string (required)",
  "email": "string (required)",
  "rating": "number (1-5, required)",
  "title": "string (required)",
  "comment": "string (required)",
  "isVerified": "boolean (required)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Review submitted successfully and will be reviewed before publishing"
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/reviews/user \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "roller-blinds",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "rating": 5,
    "title": "Excellent quality",
    "comment": "Very happy with the roller blinds",
    "isVerified": true
  }'
```

### 4. Samples Endpoints

#### POST /api/samples

Procesa solicitudes de muestras de productos.

**Request Body:**

```json
{
  "name": "string (required) - Nombre del cliente",
  "email": "string (required) - Email del cliente",
  "phone": "string (required) - Teléfono del cliente",
  "address": "string (required) - Dirección de entrega",
  "postcode": "string (required) - Código postal",
  "productTypes": "string (required) - JSON array de tipos de productos",
  "message": "string (optional) - Mensaje adicional",
  "chatSummary": "string (optional) - Resumen de conversación del chatbot"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Sample request submitted successfully"
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/samples \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "phone": "0412345678",
    "address": "123 Main St",
    "postcode": "2000",
    "productTypes": "[\"Roller Blinds\", \"Roman Blinds\"]",
    "message": "Please send samples for my new home"
  }'
```

## Error Handling

Todos los endpoints manejan errores de manera consistente:

```json
{
  "error": "string - Descripción del error",
  "success": false
}
```

## CORS Configuration

El backend está configurado para aceptar requests desde:

- `http://localhost:3000` (frontend)
- Métodos permitidos: GET, POST, PUT, DELETE
- Headers permitidos: Content-Type, Authorization

## Environment Variables

```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Features

- ✅ Integración con OpenAI para chatbot inteligente
- ✅ Procesamiento de formularios con subida de archivos
- ✅ Sistema de reviews con aprobación
- ✅ Solicitud de muestras de productos
- ✅ Resúmenes automáticos de conversaciones
- ✅ Validación de datos TypeScript
- ✅ Manejo de errores robusto
- ✅ CORS configurado para frontend
- ✅ Logging completo de requests
