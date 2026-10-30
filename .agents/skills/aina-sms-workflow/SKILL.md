---
name: aina-sms-workflow
description: Use when planning, implementing, debugging, reviewing, cleaning, or handing off work in the AINA SMS repository.
---

# AINA SMS Workflow

## Overview

Patokan kerja agent untuk repository AINA SMS. Sumber keputusan tetap PRD dan ADR; skill ini hanya mengatur cara kerja.

## Preflight wajib

1. Baca `AGENTS.md`, `rules/README.md`, `docs/agents/README.md`, PRD, ADR relevan, `knowledge.md`, dan `memory.md`.
2. Periksa branch aktif, default branch remote, divergence, worktree, status Git, source terlacak, manifest package, dan test.
3. Jangan menganggap branch aktif adalah baseline terbaru. Jika tertinggal atau dirty, lindungi perubahan pengguna dan gunakan branch/worktree non-default yang tepat.
4. Jangan memperlakukan cache, dependency directory, generated file, atau artefak untracked sebagai source kanonik.

## Routing skill

Gunakan skill berikut bila tersedia:

| Kondisi | Skill |
|---|---|
| Pertanyaan arsitektur atau relasi codebase | `graphify`; pastikan graph sesuai tree saat ini sebelum dipercaya |
| Fitur, UI, atau perubahan perilaku baru | `superpowers:brainstorming` sebelum implementasi |
| Implementasi multi-langkah dari spec | `superpowers:writing-plans` |
| Fitur atau bugfix | `superpowers:test-driven-development` |
| Bug, test gagal, atau perilaku aneh | `superpowers:systematic-debugging` |
| Semua perubahan | `ponytail` untuk perubahan terkecil yang lengkap |
| Sebelum klaim selesai, commit, atau PR | `superpowers:verification-before-completion` |
| Membuat atau mengubah skill | `skill-creator` dan `superpowers:writing-skills` |
| Jawaban sangat ringkas | `caveman`, hanya bila pengguna mengaktifkannya |

Jika skill host tidak tersedia, pertahankan prinsip yang sama tanpa mengarang hasil tool.

## Batas keselamatan

- Jangan membaca atau mengubah `.env` tanpa perintah eksplisit.
- Jangan memasang, menghapus, atau memperbarui package tanpa persetujuan pengguna.
- Jangan menjalankan database write atau migration non-test tanpa perintah eksplisit.
- Tulis test gagal lebih dahulu untuk perubahan perilaku non-trivial.
- Jalankan test relevan dan pemeriksaan penuh yang tersedia sebelum commit.
- Gunakan Conventional Commits. Jangan commit atau push langsung ke default branch tanpa izin eksplisit.

## Handoff

Perbarui `docs/agents/memory.md` hanya dengan keadaan terverifikasi dan tautan ke sumber kanonik. Catat branch/commit, perubahan, verifikasi, blocker, residu lokal, serta langkah berikut. Jangan menaruh requirement baru, secret, atau isi `.env` di memory.

## Kesalahan umum

- Mengikuti `memory.md` ketika bertentangan dengan PRD, ADR, Git, atau source aktual.
- Memakai graph lama setelah source berubah atau hilang.
- Menghapus untracked tree tanpa inventaris dan target eksplisit.
- Menyatakan fase selesai ketika gerbang roadmap belum lulus.
- Mengklaim test lulus tanpa output verifikasi baru.
