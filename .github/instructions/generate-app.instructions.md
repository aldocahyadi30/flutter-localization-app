---
description: Load these instructions when working on the Flutter ARB Localization Manager Tauri application, including feature implementation, refactoring, architecture decisions, UI generation, file parsing, and translation management.
---

# Project Overview

This project is a desktop localization management application built with:

- Tauri
- Vue 3
- TypeScript
- PrimeVue
- Tailwind CSS
- Vite

The application is focused specifically on Flutter localization workflows using `.arb` files.

The main purpose of the application is to:
- scan Flutter projects
- detect `.arb` localization files
- compare translations between locales
- edit translations visually
- validate placeholders
- save changes directly to `.arb` files

The application should behave like a professional developer tool similar to:
- SimpleLocalize
- Lokalise
- VS Code style tooling

The app is desktop-first and optimized for local filesystem access using Tauri APIs.

---

# Technical Stack

## Frontend
- Vue 3 Composition API
- TypeScript
- PrimeVue
- Tailwind CSS
- Pinia
- Vue Router

## Desktop Runtime
- Tauri

## Backend Runtime
- Rust via Tauri commands

---

# Coding Standards

## General Rules

- Always use TypeScript.
- Always use Composition API with `<script setup>`.
- Avoid Options API completely.
- Prefer reusable composables for shared logic.
- Use clean and modular architecture.
- Keep components small and focused.
- Avoid overly large files.

---

# Folder Structure

Use this structure consistently:

```txt
src/
├── components/
│   ├── common/
│   ├── layout/
│   ├── translation/
│   └── project/
│
├── views/
│
├── layouts/
│
├── stores/
│
├── composables/
│
├── services/
│
├── types/
│
├── utils/
│
├── router/
│
├── constants/
│
└── assets/