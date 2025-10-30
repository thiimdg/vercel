# 🚀 Deploy Next.js no Vercel

Interface de busca jurídica com comparação 512d vs 1024d.

---

## 📦 **O que tem nesta pasta:**

- `app/` - Páginas e APIs do Next.js
  - `app/page.tsx` - Interface de busca
  - `app/api/search-hybrid/route.ts` - API de busca híbrida
- `lib/` - Bibliotecas (Qdrant, Voyage AI)
- `package.json` - Dependências Node.js
- `tsconfig.json`, `tailwind.config.ts`, etc - Configurações

---

## 🔧 **PASSO A PASSO - Deploy no Vercel**

### **PRÉ-REQUISITO:**
✅ Você já deve ter deployado o BM25 service no Render!
✅ Anote a URL: `https://juridica-bm25-service.onrender.com`

---

### **Opção A: Deploy via GitHub (Recomendado)**

#### **1. Criar repositório no GitHub**
```bash
# No terminal, dentro da pasta vercel-nextjs:
git init
git add .
git commit -m "Initial commit - Busca Jurídica TJSC"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/juridica-tjsc.git
git push -u origin main
```

#### **2. Conectar no Vercel**
- Acesse: https://vercel.com
- Login com GitHub
- **"Add New..."** → **"Project"**
- **"Import Git Repository"** → Escolha `juridica-tjsc`

#### **3. Configurar Project**

| Campo | Valor |
|-------|-------|
| **Framework Preset** | Next.js (auto-detect) |
| **Root Directory** | `.` |
| **Build Command** | `npm run build` (padrão) |
| **Output Directory** | `.next` (padrão) |

#### **4. Configurar Environment Variables**

Clique em **"Environment Variables"** e adicione:

```
QDRANT_URL
https://63488af9-0ab1-442e-9791-7b13594a43b4.us-east-1-1.aws.cloud.qdrant.io

QDRANT_API_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.Ucmy3H2dU_ROQLiBx7aGhqEEkdqBlI1QGYlFXzP9ZTM

QDRANT_COLLECTION
tjsc-voyage-512-chunks

VOYAGE_API_KEY
pa-UlMoo1A8mcTC7gxBgRy0iOZiIZRfKXmtM58MlcwrsDd

EMBEDDING_SERVICE_URL
https://juridica-bm25-service.onrender.com
```

**⚠️ IMPORTANTE:** Troque `EMBEDDING_SERVICE_URL` pela URL real do Render!

#### **5. Deploy**
- Clique em **"Deploy"**
- Aguarde 2-3 minutos
- Vercel vai fazer build e deploy automaticamente

#### **6. Testar**
Quando finalizar, você terá uma URL tipo:
```
https://juridica-tjsc.vercel.app
```

Acesse e teste a busca!

---

### **Opção B: Deploy via CLI (Alternativo)**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer deploy
cd vercel-nextjs
vercel

# Seguir prompts interativos
# Definir as mesmas environment variables
```

---

## 🧪 **Testar a Aplicação**

### **1. Busca Simples**
- Selecione "Voyage AI 512d" ou "1024d"
- Digite query: "dano moral acidente trabalho"
- Clique "Buscar"
- Aguarde resultados (primeira vez pode demorar 30-60s se Render estiver dormindo)

### **2. Modo Comparação**
- Marque checkbox "🔍 Comparar 512d vs 1024d lado a lado"
- Digite query
- Clique "Buscar"
- Ver resultados em duas colunas (azul 512d, roxo 1024d)

---

## 📊 **Monitorar Logs**

No dashboard do Vercel:
- **Deployments** - histórico de deploys
- **Functions** - logs das APIs (search-hybrid)
- **Analytics** - requests, performance

---

## ⚠️ **Avisos Importantes**

### **Cold Start do Render**
- **Primeira busca do dia:** pode demorar 30-60s (Render acordando)
- **Buscas seguintes:** normais (~2-3s)

**Solução:** Antes de mostrar para os superiores, faça 1 busca de teste!

### **Limites do Vercel Free**
- ✅ Requests: ilimitadas
- ✅ Bandwidth: 100 GB/mês (mais que suficiente)
- ✅ Build time: 6000 min/mês

---

## 🔄 **Atualizar Código**

Se fizer alterações:

```bash
# Commit e push
git add .
git commit -m "Update: descrição da mudança"
git push

# Vercel faz redeploy automaticamente!
```

---

## ❓ **Problemas Comuns**

### **Erro: "Module not found"**
- Verificar se `package.json` tem todas dependências
- No Vercel, clicar "Redeploy"

### **Erro: "QDRANT_URL is not defined"**
- Verificar Environment Variables no Vercel
- Verificar se deployou em "Production" (não Preview)

### **Busca retorna erro**
- Verificar se BM25 service está ativo no Render
- Verificar EMBEDDING_SERVICE_URL está correta
- Ver logs no Vercel (aba Functions)

### **Resultados não aparecem**
- Verificar se Qdrant collections existem (512d e 1024d)
- Verificar QDRANT_API_KEY está correta
- Ver logs de erro no console do navegador (F12)

---

## 🎯 **Próximos Passos**

1. ✅ Deploy BM25 no Render
2. ✅ Deploy Next.js no Vercel
3. ✅ Testar busca
4. 📧 Enviar URL para superiores!

**URL final:** `https://juridica-tjsc.vercel.app` (ou similar)

---

## 🔐 **Segurança**

**⚠️ NÃO COMMITAR `.env.local` no GitHub!**

O arquivo `.env.local.example` serve apenas como template. As variáveis reais ficam APENAS no Vercel (interface web).
