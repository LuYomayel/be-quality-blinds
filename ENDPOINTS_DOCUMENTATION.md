# Quality Blinds API Endpoints Documentation

## Endpoints Implementados con Validaciones Anti-Spam

### 1. Contact Form - `/api/contact`

**Método:** POST  
**Descripción:** Procesa formularios de contacto con soporte para hasta 10 imágenes adjuntas.

#### Request Body (FormData):

```javascript
{
  "name": "string (2-50 chars)", // Requerido
  "email": "string (email válido)", // Requerido
  "phone": "string (teléfono australiano)", // Requerido
  "message": "string (10-1000 chars)", // Requerido
  "service": "enum", // measure-quote | installation | repair | consultation
  "product": "enum", // roller-blinds | roman-blinds | venetian-blinds | curtains | shutters | awnings | other
  "address": "string (opcional)",
  "postcode": "string (4 dígitos, opcional)",
  "chatSummary": "string (opcional)",
  "recaptchaToken": "string (opcional)",
  "images": "File[] (máximo 10 archivos)"
}
```

#### Response:

```javascript
{
  "success": true,
  "message": "Your message has been sent successfully! We will get back to you within 24 hours."
}
```

### 2. Quote Request - `/api/quotes`

**Método:** POST  
**Descripción:** Procesa solicitudes de cotización con información detallada del proyecto.

#### Request Body (JSON):

```javascript
{
  // Información de contacto (requerida)
  "name": "string (2-50 chars)",
  "email": "string (email válido)",
  "phone": "string (teléfono australiano)",

  // Dirección de instalación (requerida)
  "address": "string (3-100 chars)",
  "city": "string (2-50 chars)",
  "postcode": "string (4 dígitos)",
  "state": "enum", // NSW | VIC | QLD | WA | SA | TAS | ACT | NT

  // Detalles del proyecto (requeridos)
  "product": "string (3-100 chars)",
  "roomType": "enum", // Living Room | Bedroom | Kitchen | Bathroom | Office | etc.
  "windowCount": "enum", // 1 | 2 | 3 | 4 | 5+
  "budget": "enum", // under-500 | 500-1000 | 1000-2000 | 2000-5000 | over-5000
  "urgency": "enum", // asap | this-month | next-month | next-3-months | just-browsing

  // Información opcional
  "width": "string (número en mm)",
  "height": "string (número en mm)",
  "installationType": "enum", // inside-mount | outside-mount | ceiling-mount | not-sure
  "preferredDate": "string (fecha ISO)",
  "preferredTime": "enum", // morning | afternoon | evening | flexible
  "comments": "string (0-1000 chars)",
  "productCategory": "string (opcional)",
  "referralSource": "string (opcional)",
  "isNewCustomer": "boolean (opcional)",
  "wantsNewsletter": "boolean (opcional)",
  "recaptchaToken": "string (opcional)"
}
```

#### Response:

```javascript
{
  "success": true,
  "message": "Quote request submitted successfully. We will contact you within 24 hours.",
  "data": {
    "leadScore": 95,
    "estimatedValue": "$1,500",
    "priority": "🟡 MEDIUM"
  }
}
```

### 3. Samples Request - `/api/samples`

**Método:** POST  
**Descripción:** Procesa solicitudes de muestras de productos.

#### Request Body (JSON):

```javascript
{
  // Información de contacto (requerida)
  "name": "string (2-50 chars)",
  "email": "string (email válido)",
  "phone": "string (teléfono australiano)",

  // Dirección de envío (requerida)
  "address": "string (3-100 chars)",
  "postcode": "string (4 dígitos)",

  // Productos solicitados (requerido al menos 1)
  "productTypes": [
    "string" // De la lista válida de productos
  ],

  // Información opcional
  "message": "string (0-500 chars)",
  "chatSummary": "string (opcional)",
  "recaptchaToken": "string (opcional)"
}
```

#### Tipos de productos válidos:

- Roller Blinds - Blockout
- Roller Blinds - Sunscreen
- Roller Blinds - Translucent
- Roman Blinds
- Venetian Blinds - Aluminium
- Venetian Blinds - Timber
- Curtains - Blockout
- Curtains - Sheer
- Shutters - ABS
- Shutters - Basswood
- Shutters - Phoenixwood
- Awning Fabrics

#### Response:

```javascript
{
  "success": true,
  "message": "Samples request submitted successfully! We will send your samples within 2-3 business days."
}
```

## Protecciones Anti-Spam Implementadas

### 1. Rate Limiting

- **IP-based:** Máximo 3 submissions por hora, 10 por día
- **Email-based:** Máximo 2 submissions por hora por email
- **Automatic cleanup:** Registros se limpian automáticamente después de 24 horas

### 2. Content Analysis

- **Longitud de mensaje:** Detecta mensajes muy cortos (<10 chars) o muy largos (>2000 chars)
- **Patrones de spam:** Detecta palabras clave sospechosas, URLs, dominios
- **Puntuación excesiva:** Detecta uso excesivo de signos de exclamación/interrogación
- **Texto en mayúsculas:** Detecta bloques de texto en mayúsculas

### 3. Email Validation

- **Patrones sospechosos:** Emails con números consecutivos, dominios temporales
- **Dominios conocidos de spam:** Lista negra de dominios comunes de spam
- **Longitud:** Detecta emails excesivamente largos

### 4. Phone Validation

- **Números falsos:** Detecta patrones obviamente falsos (todos ceros, secuenciales)
- **Dígitos repetidos:** Detecta números con demasiados dígitos repetidos
- **Secuencias:** Detecta números secuenciales como 123456789

### 5. Honeypot Fields

- **Campos trampa:** Campos ocultos que solo los bots llenan
- **Detección instantánea:** 100 puntos de spam si se llenan campos honeypot

### 6. Behavioral Analysis

- **Similaridad de campos:** Detecta cuando todos los campos son muy similares
- **Patrones de nombre:** Detecta nombres que parecen gibberish
- **Timing patterns:** Detecta submissions en horarios sospechosos

### 7. reCAPTCHA Support

- **Google reCAPTCHA v3:** Soporte opcional para verificación adicional
- **Score threshold:** Score mínimo de 0.5 para aprobar
- **Graceful fallback:** Si no está configurado, permite la submission

## Sistema de Scoring

- **Threshold de spam:** 70 puntos o más = spam
- **Puntuaciones por infracción:**
  - Rate limiting: 30-50 puntos
  - Honeypot: 100 puntos (instantáneo)
  - Contenido sospechoso: 15-25 puntos
  - Email sospechoso: 10-40 puntos
  - Teléfono falso: 25-40 puntos
  - Patrones sospechosos: 5-20 puntos

## Manejo de Errores

### Errores de Spam (HTTP 429):

```javascript
{
  "error": "Your request has been flagged as suspicious. Please try again later or contact us directly.",
  "code": "SPAM_DETECTED"
}
```

### Errores de reCAPTCHA (HTTP 400):

```javascript
{
  "error": "reCAPTCHA verification failed. Please try again.",
  "code": "RECAPTCHA_FAILED"
}
```

### Errores de Validación (HTTP 400):

```javascript
{
  "message": [
    "name must be longer than or equal to 2 characters",
    "email must be an email"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

### Errores del Servidor (HTTP 500):

```javascript
{
  "error": "Failed to process contact form",
  "code": "INTERNAL_ERROR"
}
```

## Configuración de Variables de Entorno

```bash
# Email Configuration (requerido para envío de emails)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password

# reCAPTCHA (opcional)
RECAPTCHA_SECRET_KEY=your_secret_key

# OpenAI (para chat)
OPENAI_API_KEY=your_openai_key
```

## Logging y Monitoreo

- **Submissions exitosas:** Se loggean con IP y email
- **Spam detectado:** Se loggean con score y razones
- **Errores de email:** Se loggean pero no fallan la request
- **Estadísticas:** Endpoint interno para obtener estadísticas de spam

## Testing con curl

### Contact Form:

```bash
curl -X POST http://localhost:3001/api/contact \
  -F "name=John Doe" \
  -F "email=john@example.com" \
  -F "phone=0412345678" \
  -F "message=I need blinds for my living room" \
  -F "service=measure-quote" \
  -F "product=roller-blinds"
```

### Quote Request:

```bash
curl -X POST http://localhost:3001/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "0423456789",
    "address": "123 Main St",
    "city": "Sydney",
    "postcode": "2000",
    "state": "NSW",
    "product": "Roman Blinds",
    "roomType": "Living Room",
    "windowCount": "2",
    "budget": "1000-2000",
    "urgency": "this-month"
  }'
```

### Samples Request:

```bash
curl -X POST http://localhost:3001/api/samples \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Wilson",
    "email": "bob@example.com",
    "phone": "0434567890",
    "address": "456 Oak St",
    "postcode": "3000",
    "productTypes": ["Roller Blinds - Blockout", "Roman Blinds"]
  }'
```

## Notas de Seguridad

1. **Rate limiting por IP:** Previene ataques masivos desde una sola IP
2. **Validación estricta:** Todos los campos son validados con class-validator
3. **Sanitización:** Los datos se limpian automáticamente (trim, lowercase)
4. **Logging completo:** Todas las actividades sospechosas se registran
5. **Graceful degradation:** Si el email falla, la request no falla
6. **Environment-based:** Configuraciones sensibles vía variables de entorno
