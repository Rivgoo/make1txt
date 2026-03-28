# 📦 make1txt

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)

**Live Application:** [make1txt.vercel.app](https://make1txt.vercel.app/)

## 🎯 What is it?
make1txt is a secure, client-side web application. It bundles your entire project codebase into a single formatted text file. 

## 💡 The Problem it Solves
Providing context to Large Language Models (LLMs) like ChatGPT or Claude requires pasting multiple files manually. This process is tedious, error-prone, and clutters the chat interface. make1txt automates this workflow. It generates a clean, readable text bundle containing your file structure and code, ready to be pasted into any AI prompt.

## ✨ Key Features
* 🔒 **100% Local Processing:** Files never leave your machine. The app uses the browser's native File System Access API.
* ⚡ **High Performance:** Uses Web Workers to process large codebases in the background without freezing the user interface.
* 🎯 **Smart Filtering:** Automatically parses and respects your `.gitignore` files. 
* 🛠️ **Advanced Rules:** Add custom global or local rules to ignore specific extensions, folders, or regex patterns.
* 🌳 **Structure Generation:** Generates and appends a visual ASCII file tree to the output file.
* 💾 **Profile Management:** Saves directory bindings and complex filter settings via IndexedDB for quick loading.

---

## 💻 Local Setup

Follow these steps to run make1txt locally on your machine.

### Prerequisites
* Node.js (v18.0.0 or higher)
* npm (v9.0.0 or higher)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Rivgoo/make1txt.git
   ```
2. Navigate to the project directory:
   ```bash
   cd make1txt
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the App
Start the local development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### Building for Production
Create an optimized production build:
```bash
npm run build
```

---

## 🤝 Contributing

We welcome community contributions. To contribute to make1txt, follow these steps:

1. **Fork the Repository:** Click the "Fork" button at the top right of this page.
2. **Clone your Fork:** Download the repository to your local machine.
3. **Create a Branch:** Create a new branch for your feature or bugfix.
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make Changes:** Write clean, readable, and strictly typed TypeScript code. Follow the existing ESLint configuration.
5. **Commit:** Write clear, concise commit messages.
   ```bash
   git commit -m "feat: add amazing new feature"
   ```
6. **Push:** Push the changes to your fork.
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request:** Go to the original repository and open a Pull Request. Describe your changes in detail.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0**. 

You are free to use, modify, and distribute this software. If you distribute modified versions of this software, you must make the source code available under the same license. See the `LICENSE` file for full details.