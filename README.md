# OmniChat - MVP Personalized Multi-Model AI Chatbot

A production-ready, full-stack multi-model AI chatbot application. Built on **Node.js/Express**, **MongoDB/Mongoose**, and **React + Vite**, OmniChat enables authenticated users to create independent chat sessions, switch dynamically between frontier AI models from **Google Gemini** and **Azure Cloud OpenAI**, and personalize the assistant's behavior per conversation (tone, response length, writing style, language, and custom system instructions).

---

## 🚀 Features

- **Multi-Model Intelligence**:
  - **Gemini 3.1 Pro Preview** (`gemini-3-1-pro`): Google's frontier reasoning model with a 1M token context window.
  - **Gemini 3.8 Flash** (`gemini-3-8`): Google's high-speed, high-intelligence multimodal workhorse.
  - **Sol 6.1 (Azure OpenAI)** (`sol-6-1` / `gpt-6.1-sol`): OpenAI's frontier reasoning and coding model hosted on Azure Cloud.
  - **Luna 6 (Azure OpenAI)** (`luna-6` / `gpt-6-luna`): OpenAI's high-throughput, low-latency conversational model hosted on Azure Cloud.
- **Centralized Model Registry**: Configurable default model (`DEFAULT_MODEL=gemini-3-1-pro`), stable internal keys, dynamic model status checking (`GET /api/models`), and runtime validation.
- **Per-Chat Personalization**:
  - **Tone**: `natural`, `casual`, `formal`, `friendly`, `professional`.
  - **Response Length**: `short`, `medium`, `detailed`.
  - **Writing Style**: `conversational`, `simple English`, `technical`, `bullet-point`.
  - **Language**: Custom preferred output language (defaults to English).
  - **Custom System Prompt**: User-specified session instructions treated safely as untrusted context.
- **User Authentication & Ownership**:
  - Secure registration and login with bcrypt password hashing and JWT authentication.
  - Full data isolation: users can only read, update, or delete their own chat sessions and messages.
- **Persistent Chat History**:
  - MongoDB storage for users, chat sessions, and chronological messages.
  - Automatic session titling from user's first prompt.
  - Bounded conversation history feeding to LLM to prevent context overflow.
- **Modern Responsive React Frontend**:
  - Sidebar with session management (create, inline rename, delete with confirmation).
  - Model selector dropdown with real-time configuration indicator and provider tags.
  - Message bubble stream with loading states and error retry banners.
  - Accessible Personalization modal.

---

## 📁 Repository Structure

```text
ChatBot/
├── server/                      # Express Backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js            # MongoDB connection logic
│   │   │   └── modelRegistry.js # Centralized model definitions & config validator
│   │   ├── controllers/
│   │   │   ├── authController.js    # Register, login, getMe
│   │   │   ├── sessionController.js # Session CRUD & ownership checks
│   │   │   ├── messageController.js # Chronological history & AI dispatch
│   │   │   └── modelController.js   # Models catalog endpoint
│   │   ├── middleware/
│   │   │   └── authMiddleware.js    # JWT Bearer verification
│   │   ├── models/
│   │   │   ├── User.js          # Mongoose user schema & password hooks
│   │   │   ├── ChatSession.js   # Chat session & personalization schema
│   │   │   └── Message.js       # Chronological message schema
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── sessionRoutes.js
│   │   │   └── modelRoutes.js
│   │   ├── services/
│   │   │   ├── aiService.js     # Centralized AI router
│   │   │   ├── promptBuilder.js # System prompt & personalization composer
│   │   │   └── providers/
│   │   │       ├── geminiProvider.js     # Google Gemini API adapter
│   │   │       └── azureOpenAiProvider.js # Azure OpenAI adapter
│   │   └── server.js            # Express entry point & route mounting
│   ├── .env                     # Server environment variables (secrets)
│   ├── .env.example             # Documented template for configuration
│   └── package.json
└── client/                      # React + Vite Frontend
    ├── src/
    │   ├── api/
    │   │   └── client.js        # Typed API fetch client with JWT management
    │   ├── context/
    │   │   └── AuthContext.jsx  # Authentication state & hooks
    │   ├── components/
    │   │   ├── AuthView.jsx     # Login & registration views
    │   │   ├── Sidebar.jsx      # Conversation drawer & management
    │   │   ├── ChatArea.jsx     # Message list, model picker & input box
    │   │   ├── ModelSelector.jsx # Model dropdown with status badges
    │   │   └── PersonalizationModal.jsx # Per-session personalization drawer
    │   ├── App.jsx              # Main app orchestration
    │   ├── index.css            # OmniChat design system
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js           # Vite dev proxy configuration
    └── package.json
```

---

## ⚙️ Environment Configuration

In [`server/.env`](file:///c:/Users/hindu/OneDrive/Desktop/ChatBot/server/.env) (refer to [`server/.env.example`](file:///c:/Users/hindu/OneDrive/Desktop/ChatBot/server/.env.example)):

```ini
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL=mongodb://localhost:27017/chatBot
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
DEFAULT_MODEL=gemini-3-1-pro

# Google Gemini API (Gemini 3.1 Pro Preview & Gemini 3.8 Flash)
GOOGLE_GEMINI_API_KEY="AIzaSy..."

# Azure Cloud OpenAI (Sol 6.1 & Luna 6)
AZURE_CLOUD_OPENAI_GPT61SOL_CREDENTIALS='[{"azureOpenAIApiDeploymentName":"gpt-6.1-sol","azureOpenAIApiInstanceName":"veritus-west-us","azureOpenAIApiKey":"...","azureOpenAIApiVersion":"2025-01-01-preview"}]'
AZURE_CLOUD_OPENAI_GPT6LUNA_CREDENTIALS='[{"azureOpenAIApiDeploymentName":"gpt-6-luna","azureOpenAIApiInstanceName":"veritus-west-us","azureOpenAIApiKey":"...","azureOpenAIApiVersion":"2025-01-01-preview"}]'
```

---

## 🚦 How to Run the Application

### 1. Start the Backend Server

```bash
cd server
npm install
npm run dev
```
*Backend runs on `http://localhost:5000`.*

### 2. Start the Frontend Client

```bash
cd client
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | Public |
| `POST` | `/api/auth/login` | Authenticate user & get JWT token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Private |

### AI Models Registry
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/models` | List enabled models, default model & provider info | Public |

### Chat Sessions
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/sessions` | Create a new chat session with personalization | Private |
| `GET` | `/api/sessions` | List all sessions owned by the authenticated user | Private |
| `GET` | `/api/sessions/:sessionId` | Retrieve session details | Private |
| `PATCH` | `/api/sessions/:sessionId` | Update title, selected model, or personalization | Private |
| `DELETE` | `/api/sessions/:sessionId` | Delete session and associated messages | Private |

### Messages
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/sessions/:sessionId/messages` | Retrieve saved messages in chronological order | Private |
| `POST` | `/api/sessions/:sessionId/messages` | Send user message, dispatch to AI model, save response | Private |

---

## ✅ Verified AI Model Integrations

All 4 specified models have been connected and verified with real live API calls:

1. **Gemini 3.1 Pro Preview** (`gemini-3.1-pro-preview` via Google Gemini API) - **VERIFIED LIVE**
2. **Gemini 3.8 Flash** (`gemini-3.8-flash` via Google Gemini API) - **VERIFIED LIVE**
3. **Sol 6.1** (`gpt-6.1-sol` via Azure OpenAI Deployment) - **VERIFIED LIVE**
4. **Luna 6** (`gpt-6-luna` via Azure OpenAI Deployment) - **VERIFIED LIVE**
