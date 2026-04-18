# 🎬 Free Video Editor: No Signup, No Save

A lightning-fast, privacy-first video editor that runs **100% in your browser**. No accounts, no subscriptions, and your data **never** leaves your computer.

### [🚀 Deploy Instantly on Vercel](#deployment)

---

## ✨ Key Features

- **🛡️ 100% Privacy:** All video processing (cropping, resizing, speed, overlays) happens in your browser's RAM via WebAssembly.
- **🤖 Local AI Auto-Captions:** Generate subtitles automatically using OpenAI's Whisper (Tiny) model running locally via Transformers.js.
- **🎨 Canva-Style Canvas:** Drag, drop, and resize multiple video and image layers on a spatial canvas.
- **✂️ Multi-Track Timeline:** Split, cut, and move clips with a zoomable timeline for precision editing.
- **⚡ Pro Speeds:** Speed up or slow down videos (0.5x to 4x) without quality loss.
- **📦 Zero Data Retention:** Once you close the tab, all data is cleared. No signup, no tracking.

---

## 🛠️ Tech Stack

- **React + Vite:** For a high-performance UI.
- **FFmpeg.wasm:** The industry-standard video engine, compiled to WebAssembly.
- **Transformers.js:** Local browser-based AI for audio transcription.
- **Tailwind CSS:** For a clean, modern, dark-themed editor interface.

---

## 🚀 Getting Started

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ammarjmahmood/freevideoeditor.git
    cd freevideoeditor
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open in your browser:**
    Navigate to `http://localhost:5173`.

---

## 🌍 Deployment

This project is optimized for **Vercel** and **Netlify**.

**Important:** Because this app uses `SharedArrayBuffer` for high-speed video processing, you must serve these headers:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

The included `vercel.json` handles this automatically for Vercel deployments.

### Deploy to Vercel (Recommended)
1. Push this code to GitHub.
2. Connect your repo to Vercel.
3. Done! It will automatically use the `vercel.json` configuration.

---

## 📜 License

MIT License. Free to use, modify, and host.
