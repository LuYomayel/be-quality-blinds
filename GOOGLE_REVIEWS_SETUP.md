# 🌟 Configuración Completa de Google Reviews API

## ⚠️ **IMPORTANTE: ¿Por qué solo 5 reviews de 5⭐?**

### **Limitaciones de Google Places API:**

- ✅ **Fácil configuración** (solo API Key)
- ❌ **Máximo 5 reviews** por lugar
- ❌ **Google filtra automáticamente** (favorece las 5⭐)
- ❌ **No puedes controlar qué reviews mostrar**

### **Solución: Google My Business API**

- ✅ **Hasta 50+ reviews** reales
- ✅ **Todos los ratings** (1⭐ a 5⭐)
- ✅ **Reviews más recientes**
- ❌ Configuración más compleja

---

## 🚀 **MÉTODO 1: Google My Business API (RECOMENDADO)**

### **Paso 1: Crear Proyecto en Google Cloud Console**

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea nuevo proyecto: "Quality Blinds Reviews"
3. Habilita estas APIs:
   ```
   • Google My Business API
   • Business Profile Performance API
   • Places API (fallback)
   ```

### **Paso 2: Crear Service Account**

1. Ve a **IAM & Admin** → **Service Accounts**
2. Clic **CREATE SERVICE ACCOUNT**
3. Nombre: `quality-blinds-reviews`
4. Descripción: `Service account for Google Reviews API`
5. **CREATE AND CONTINUE**

### **Paso 3: Descargar Credenciales**

1. Clic en tu service account
2. **KEYS** → **ADD KEY** → **Create new key**
3. Tipo: **JSON**
4. Descargar archivo → **renombrar a** `google-credentials.json`
5. **Mover a carpeta raíz de tu proyecto**

### **Paso 4: Variables de Entorno**

Agrega a tu `.env`:

```bash
# Google Places API (fallback)
GOOGLE_PLACES_API_KEY="YOUR_GOOGLE_PLACES_API_KEY_HERE"
GOOGLE_PLACE_ID="YOUR_PLACE_ID_HERE"

# Google My Business API (más reviews)
GOOGLE_CREDENTIALS_PATH="./google-credentials.json"
```

### **Paso 5: Verificar tu Negocio**

1. Ve a [Google Business Profile](https://business.google.com/)
2. Busca tu negocio: **Quality Blinds Care Co**
3. **Reclama el negocio** si no es tuyo
4. **Verifica el negocio** (puede tomar 1-2 días)

---

## 🔧 **MÉTODO 2: Solo Google Places API (Limitado)**

### **Si solo quieres configuración rápida:**

Variables de entorno mínimas:

```bash
GOOGLE_PLACES_API_KEY="YOUR_GOOGLE_PLACES_API_KEY_HERE"
GOOGLE_PLACE_ID=""
```

**Limitaciones:**

- Solo 5 reviews máximo
- Google controla qué reviews mostrar
- Usualmente solo 5⭐ (algoritmo de Google)

---

## 🧪 **Probar las APIs**

### **Test básico:**

```bash
curl http://localhost:3001/api/reviews/google/test
```

### **Obtener reviews:**

```bash
curl http://localhost:3001/api/reviews/google
```

### **¿Qué API se está usando?**

- 🔥 **"Trying Google My Business API"** = Intentando API completa
- ✅ **"Got reviews from My Business API"** = API completa funcionando
- ⚠️ **"Falling back to Google Places API"** = Usando API limitada

---

## 📊 **Comparación de Resultados**

| API             | Reviews | Ratings        | Control     |
| --------------- | ------- | -------------- | ----------- |
| **My Business** | 50+     | 1⭐-5⭐        | Total ✅    |
| **Places**      | 5 máx   | Mayormente 5⭐ | Limitado ❌ |

---

## 🐛 **Troubleshooting**

### **"Only getting 5-star reviews"**

- ✅ **Configurar My Business API** (este tutorial)
- Google Places API filtra automáticamente

### **"Only 5 reviews total"**

- ✅ **Usar My Business API** para obtener 50+
- Places API limita a 5 reviews máximo

### **"Google credentials not found"**

- ✅ Archivo `google-credentials.json` en carpeta raíz
- ✅ Variable `GOOGLE_CREDENTIALS_PATH="./google-credentials.json"`

### **"Business not verified"**

- ✅ Reclamar negocio en Google Business Profile
- ✅ Proceso de verificación (1-2 días)

---

## 🎯 **Tu Negocio: Quality Blinds Care Co**

```json
{
  "name": "Quality Blinds Care Co",
  "address": "131 Botany St, Randwick NSW 2031, Australia",
  "place_id": "ChIJkW1-3CCyEmsRorld0CsHYIY",
  "rating": 4.5,
  "total_reviews": 69,
  "api_key": "YOUR_GOOGLE_PLACES_API_KEY_HERE"
}
```

---

## ✅ **Sistema Híbrido Final**

El código intenta **My Business API primero**, si falla usa **Places API**:

1. **🔥 My Business API** → 50+ reviews, todos los ratings
2. **⚠️ Fallback a Places API** → 5 reviews limitadas
3. **🌟 Total transparencia** → Sin filtros artificiales
4. **📅 Orden cronológico** → Más recientes primero

**¡Ahora tendrás todas las reviews reales con todos los ratings!** 🎉
